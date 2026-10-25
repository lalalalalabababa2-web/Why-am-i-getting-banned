#!/usr/bin/env python3
"""Runs AutoDribble.lua in a fake Blue Lock: Rivals match and checks what it does.

The fake game copies what the recordings showed: a HUD with Dribble / Slide / Dive / Kick / Pass
buttons (Dribble and Pass only while you have the ball, Slide only without it, Dive only as
keeper), a cooldown overlay on each button, a HUD that disappears during cutscenes, dribble as a
counter with a protection window, slides and dives that move you by CFrame (no physics speed).

Usage: python3 test_autodribble.py [-k name]   (exit status 1 on any failure)
"""
import math
import os
import sys
import traceback

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from luau import Interp, LuaTable, tostr  # noqa: E402
from roblox import (ENUM, Animator, BasePart, Folder, Frame, Humanoid, ImageButton, InputObject,  # noqa: E402
                    Model, NumberValue, Player, PlayerGui, ScreenGui, Team, TextButton, TextLabel, UDim2, Vector3,
                    World)

SCRIPT = os.path.join(HERE, "..", "AutoDribble.lua")
DT = 1 / 60
INF = math.inf


class Bot:
    def __init__(self, game, name, pos, team):
        self.game, self.name = game, name
        W = game.W
        self.player = Player(W, name, Team=team)
        self.player.set_parent(W.players)
        self.char = Model(W, name)
        self.root = BasePart(W, "HumanoidRootPart", Position=pos)
        self.root.set_parent(self.char)
        self.hum = Humanoid(W, "Humanoid")
        self.hum.set_parent(self.char)
        self.anim = Animator(W, "Animator")
        self.anim.set_parent(self.hum)
        self.char.set_parent(W.workspace)
        self.player.props["Character"] = self.char
        self.vel = Vector3()
        self.lunge = None  # (velocity, until): moved by CFrame, no physics speed
        self.brain = None
        self.stunned_until = -INF
        self.slid = False
        self.protect_until = -INF

    def dribble(self):
        self.protect_until = self.game.now + 0.8
        self.anim.play("Dribble", "Action", 0.5)
        self.game.log("bot_dribble", self.name)

    @property
    def pos(self):
        return self.root.props["Position"]

    def slide_at(self, target, speed=60, length=0.4):
        d = (target - self.pos).flat().unit()
        self.lunge = (d * speed, self.game.now + length)
        self.anim.play("SlideTackle_Anim", "Action", length)
        self.slid = True
        self.game.log("slide", self.name)


class Game:
    def __init__(self, gk=False, hud=True, hide_functions=False, ping=0.05, cooldowns=None, debug=True, blatant=False,
                 cfg=None):
        self.debug, self.blatant, self.cfg = debug, blatant, cfg or {}
        self.I = Interp()
        self.W = W = World(self.I)
        W.ping = ping
        self.hide_functions = hide_functions
        self.events = []
        self.cd = {"dribble": 4.0, "tackle": 3.0, "dive": 2.0}
        if cooldowns:
            self.cd.update(cooldowns)
        self.last = {k: -INF for k in self.cd}
        self.protect = 0.8
        self.protect_until = -INF
        self.gk = gk
        self.cutscene = False
        self.ignore = set()  # moves the game silently ignores (a press path that doesn't work)
        self.bots = []
        self.my_vel = Vector3()
        self.my_lunge = None
        self.ball_vel = Vector3()
        self.gravity = 0.0
        self.friction = 0.0  # studs/s lost per second while the ball rolls (a touch dies out)
        self.ball_acc = Vector3()  # a curve's bend (studs/s^2), sideways
        self.ball_by_hand = False  # an ability shot the game moves itself: no physics velocity
        self.shiftlock = False  # turns you to face the camera (-z) every frame, like shift lock
        self.press_look = {}

        self.team_a, self.team_b = Team(W, "Blue"), Team(W, "Red")
        self.lp = Player(W, "Me", Team=self.team_a)
        self.lp.set_parent(W.players)
        W.players.props["LocalPlayer"] = self.lp
        self.pg = PlayerGui(W, "PlayerGui")
        self.pg.set_parent(self.lp)
        self.char = Model(W, "Me")
        self.root = BasePart(W, "HumanoidRootPart", Position=Vector3(0, 3, 0))
        self.root.set_parent(self.char)
        self.hum = Humanoid(W, "Humanoid")
        self.hum.set_parent(self.char)
        self.anim = Animator(W, "Animator")
        self.anim.set_parent(self.hum)
        self.char.set_parent(W.workspace)
        self.lp.props["Character"] = self.char

        pitch = BasePart(W, "Pitch", Position=Vector3(0, -0.5, 0), Size=Vector3(200, 1, 400))
        pitch.set_parent(W.workspace)
        W.ground = pitch
        self.ball = BasePart(W, "Football", Position=Vector3(0, 1, 2), Size=Vector3(2, 2, 2))
        self.ball.set_parent(W.workspace)
        self.holder = self.lp

        self.buttons = {}
        self.hud = None
        if hud:
            self.build_hud()

    # ---- HUD
    def build_hud(self):
        W = self.W
        hud = ScreenGui(W, "HUD")
        hud.set_parent(self.pg)
        self.hud = hud
        pad = Frame(W, "Controls", Size=UDim2(0, 400, 0, 400), Position=UDim2(1, -420, 1, -420),
                    BackgroundTransparency=1)
        pad.set_parent(hud)

        def button(name, label, x, y, kind=None):
            b = ImageButton(W, name, Size=UDim2(0, 70, 0, 70), Position=UDim2(0, x, 0, y))
            b.set_parent(pad)
            t = TextLabel(W, "Title", Text=label, Size=UDim2(1, 0, 0, 20), Position=UDim2(0, 0, 1, -20),
                          BackgroundTransparency=1)
            t.set_parent(b)
            cd = Frame(W, "Cooldown", Visible=False, Size=UDim2(1, 0, 1, 0), BackgroundTransparency=0.4)
            cd.set_parent(b)
            if kind:
                b.signal("Activated").connect(lambda *a, kind=kind: self.press(kind, "button"))
                self.buttons[kind] = b
            return b

        button("DribbleBtn", "Dribble", 230, 150, "dribble")
        button("SlideBtn", "Slide", 230, 150, "tackle")
        button("DiveBtn", "Dive", 150, 150, "dive")
        self.kick = button("KickBtn", "Kick", 150, 240)
        self.pass_ = button("PassBtn", "Pass", 150, 150)
        touch = ScreenGui(W, "TouchGui")
        touch.set_parent(self.pg)
        jump = ImageButton(W, "JumpButton", Size=UDim2(0, 90, 0, 90), Position=UDim2(1, -110, 1, -110))
        jump.set_parent(touch)
        self.update_hud()

    def update_hud(self):
        if not self.hud:
            return
        mine = self.holder is self.lp
        self.hud.props["Enabled"] = not self.cutscene
        self.buttons["dribble"].props["Visible"] = mine
        self.pass_.props["Visible"] = mine and not self.gk
        self.buttons["tackle"].props["Visible"] = not mine
        self.buttons["dive"].props["Visible"] = self.gk and not mine
        for kind, b in self.buttons.items():
            b.m_FindFirstChild("Cooldown").props["Visible"] = self.now - self.last[kind] < self.cd[kind]

    # ---- the game's side of a press
    @property
    def now(self):
        return self.I.sched.now

    def log(self, *what):
        self.events.append((round(self.now, 3),) + what)

    def press(self, kind, via):
        b = self.buttons.get(kind)
        if self.cutscene or (b is not None and not b.on_screen()):
            self.log(kind, "hidden", via)
            return
        if kind in self.ignore:
            self.log(kind, "ignored", via)
            return
        if self.now - self.last[kind] < self.cd[kind]:
            self.log(kind, "cooldown", via)
            return
        self.last[kind] = self.now
        self.log(kind, "ok", via)
        self.update_hud()
        look = self.root.look.flat().unit()
        self.press_look[kind] = look
        self.press_pos = getattr(self, "press_pos", {})
        self.press_pos[kind] = self.root.props["Position"]
        if kind == "dribble":
            self.protect_until = self.now + self.protect
            self.anim.play("Dribble_Anim", "Action", 0.5)
        elif kind == "tackle":
            self.anim.play("Slide_Anim", "Action", 0.4)
            self.my_lunge = (look * 55, self.now + 0.35)
        elif kind == "dive":
            self.anim.play("Dive_Anim", "Action", 0.6)
            self.my_lunge = (look * 40, self.now + 0.3)

    def presses(self, kind=None, result=None):
        return [e for e in self.events if len(e) >= 3 and (kind is None or e[1] == kind) and
                (result is None or e[2] == result)]

    # ---- the script
    def load(self):
        src = open(SCRIPT, encoding="utf-8").read()
        # the tests read the readout, and most check the plain (non-teleporting) behaviour
        src = src.replace("Debug        = false", "Debug        = " + ("true" if self.debug else "false"), 1)
        src = src.replace("Blatant      = false", "Blatant      = " + ("true" if self.blatant else "false"), 1)
        import re
        for key, value in self.cfg.items():
            src, n = re.subn(r"(\n    %s\s*=\s*)(\{[^}]*\}|[^,]+)," % key, lambda m: m.group(1) + value + ",", src, count=1)
            assert n == 1, key
        f = self.I.load(src, "AutoDribble")
        if self.hide_functions:
            import roblox
            orig = roblox.ConnInfo.lua_index

            def hidden(this, key):
                if key in ("Function", "Fire"):
                    return None
                return orig(this, key)
            roblox.ConnInfo.lua_index = hidden
            self._restore = (roblox, orig)
        self.I.sched.spawn(f, [])
        self.check_errors()
        return self

    def close(self):
        if getattr(self, "_restore", None):
            mod, orig = self._restore
            mod.ConnInfo.lua_index = orig

    def check_errors(self):
        errs = self.I.sched.errors
        if errs:
            raise AssertionError("script error: " + "\n".join(str(e) for e in errs))

    def gui(self):
        return self.W.hui.m_FindFirstChild("AutoDribble")

    def bar(self):
        return [c for c in self.gui().children if isinstance(c, Frame)][0]

    def pill(self, kind):
        pills = [c for c in self.bar().children if isinstance(c, TextButton)]
        return pills[["dribble", "tackle", "dive"].index(kind)]

    def readout(self):
        return [c for c in self.bar().children if isinstance(c, TextLabel)][0].props["Text"]

    def pill_text(self, kind):
        return self.pill(kind).props["Text"]

    def tap(self, kind, hold=0.0):
        W = self.W
        inp = InputObject(W, "InputObject", UserInputType=ENUM.item("UserInputType", "Touch"),
                          UserInputState=ENUM.item("UserInputState", "Begin"), Position=Vector3(40, 300, 0))
        self.pill(kind).signal("InputBegan").fire(inp)
        if hold:
            self.run(hold)
        W.uis.signal("InputEnded").fire(inp, False)
        self.step()

    def clear_bots(self):
        # gone from the match too, not just from the simulation
        for b in self.bots:
            b.char.m_Destroy()
            b.player.m_Destroy()
        self.bots.clear()

    def bot(self, name, pos, enemy=True):
        b = Bot(self, name, pos, self.team_b if enemy else self.team_a)
        self.bots.append(b)
        return b

    # ---- simulation
    def step(self):
        I, W = self.I, self.W
        sched = I.sched
        sched.now += DT
        now = sched.now
        sched.run_due()
        if self.shiftlock:
            self.root.look = Vector3(0, 0, -1)
        for _, fn in sorted(W.run.render.values(), key=lambda pf: tostr(pf[0])):
            sched.spawn(fn, [DT])
        W.run.signal("Stepped").fire(now, DT)
        # physics
        # your own run: Move() this frame walks you at WalkSpeed (when the test isn't steering)
        run = Vector3()
        if self.my_vel.mag() == 0 and self.hum.moves and self.hum.moves[-1][0] == now:
            run = self.hum.moves[-1][1].flat().unit() * self.hum.props["WalkSpeed"]
        p = self.root.props["Position"] + (self.my_vel + run) * DT
        if self.my_lunge and now < self.my_lunge[1]:
            p = p + self.my_lunge[0] * DT
        self.root.props["Position"] = p
        self.root.props["AssemblyLinearVelocity"] = self.my_vel + run
        self.hum.props["MoveDirection"] = self.my_vel.flat().unit() if self.my_vel.flat().mag() > 0 else Vector3()
        for b in self.bots:
            if b.brain and now >= b.stunned_until:
                b.brain(b, now)
            q = b.pos + b.vel * DT
            if b.lunge and now < b.lunge[1]:
                q = q + b.lunge[0] * DT
            b.root.props["Position"] = q
            b.root.props["AssemblyLinearVelocity"] = b.vel
            b.anim.tick()
            # a slide that reaches you while you have the ball
            if b.lunge and now < b.lunge[1] and self.holder is self.lp and (b.pos - self.root.props["Position"]).flat().mag() < 3:
                b.lunge = None
                if now < self.protect_until:
                    self.log("ankle", b.name)
                    b.stunned_until = now + 2
                    b.vel = Vector3()
                else:
                    self.log("lost", b.name)
                    self.holder = b.player
        self.anim.tick()
        # my slide reaching the carrier: their dribble window ankle-breaks me, otherwise I win it
        if self.my_lunge and now < self.my_lunge[1] and self.holder not in (None, self.lp):
            c = next((b for b in self.bots if b.player is self.holder), None)
            if c and (c.pos - self.root.props["Position"]).flat().mag() < 3:
                self.my_lunge = None
                if now < c.protect_until:
                    self.log("ankled_me", c.name)
                else:
                    self.log("won", c.name)
                    self.holder = self.lp
        # ball
        if self.holder is not None:
            hr = self.holder.props["Character"].m_FindFirstChild("HumanoidRootPart")
            self.ball.props["Position"] = hr.props["Position"] + Vector3(0, -2, 1.5)
            self.ball.props["AssemblyLinearVelocity"] = hr.props["AssemblyLinearVelocity"]
        else:
            self.ball_vel = self.ball_vel + Vector3(0, -self.gravity * DT, 0) + self.ball_acc * DT
            if self.friction and self.ball_vel.flat().mag() > 0:
                sp = self.ball_vel.flat().mag()
                self.ball_vel = self.ball_vel * (max(0.0, sp - self.friction * DT) / sp)
            self.ball.props["Position"] = self.ball.props["Position"] + self.ball_vel * DT
            self.ball.props["AssemblyLinearVelocity"] = Vector3() if self.ball_by_hand else self.ball_vel
        self.update_hud()
        W.run.signal("Heartbeat").fire(DT)
        self.check_errors()

    def run(self, secs, until=None):
        end = self.now + secs
        while self.now < end - 1e-9:
            self.step()
            if until and until():
                return True
        return False

    def shoot(self, frm, to, speed):
        self.holder = None
        self.ball.props["Position"] = frm
        self.ball_vel = (to - frm).unit() * speed


# ---------------------------------------------------------------- scenarios

TESTS = []


def test(fn):
    TESTS.append(fn)
    return fn


def check(cond, what):
    if not cond:
        raise AssertionError(what)


def runner_at(g, name, start, speed, slide_at=8):
    """A bot that runs straight at you and slides once it's this close."""
    b = g.bot(name, start)

    def brain(bot, now):
        to = (g.root.props["Position"] - bot.pos).flat()
        if not bot.slid and to.mag() < slide_at:
            bot.vel = Vector3()
            bot.slide_at(g.root.props["Position"])
        elif not bot.slid:
            bot.vel = to.unit() * speed
    b.brain = brain
    return b


@test
def script_compiles_within_luaus_limits():
    # v14 had 209 locals alive in its main chunk: Luau refuses past 200, so nothing appeared
    import io
    import contextlib
    sys.path.insert(0, os.path.join(HERE, ".."))
    import check
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        ok = check.check(SCRIPT)
    check_ok = ok and "ERROR" not in out.getvalue()
    if not check_ok:
        raise AssertionError(out.getvalue())


@test
def loads_and_shows_three_pills():
    g = Game().load()
    g.run(0.5)
    check([g.pill_text(k) for k in ("dribble", "tackle", "dive")] == ["DRIBBLE OFF", "TACKLE OFF", "AUTO GK OFF"],
          f"pills read {[g.pill_text(k) for k in ('dribble', 'tackle', 'dive')]}")
    line1 = g.readout().split("\n")[0]
    check("conn Y sig Y tap Y" in line1, f"readout line 1 is {line1!r}")
    check(g.readout().count("\n") == 4, "the readout has five lines")
    size = g.bar().get_AbsoluteSize()
    check(size.x <= 220 and size.y <= 80, f"the UI is small ({size})")


@test
def pill_tap_toggles_and_gk_pauses_the_others():
    g = Game().load()
    g.tap("dribble")
    g.tap("tackle")
    check(g.pill_text("dribble") == "DRIBBLE ON" and g.pill_text("tackle") == "TACKLE ON", "pills turn on")
    g.tap("dive")
    check(g.pill_text("dribble") == "DRIBBLE PAUSED" and g.pill_text("tackle") == "TACKLE PAUSED",
          f"keeper pauses the others ({g.pill_text('dribble')}, {g.pill_text('tackle')})")
    g.tap("dive")
    check(g.pill_text("dribble") == "DRIBBLE ON", "and they come back")


@test
def dribble_breaks_a_sliding_tackle():
    g = Game().load()
    g.tap("dribble")
    runner_at(g, "Isagi", Vector3(0, 3, -30), 28)
    g.run(2.5)
    ok = g.presses("dribble", "ok")
    check(len(ok) == 1, f"one dribble went off ({g.events})")
    check(any(e[1] == "ankle" for e in g.events), f"the slide got ankle-broken ({g.events})")
    check(g.holder is g.lp, "you still have the ball")
    check("via BTN" in g.readout().split("\n")[2], f"pressed by running the button's code: {g.readout()!r}")
    check(not g.hum.jumps, f"no flick inside its own protection window (jumps {g.hum.jumps})")


@test
def dribble_while_running_from_a_chaser():
    g = Game().load()
    g.tap("dribble")
    g.my_vel = Vector3(28, 0, 0)
    b = g.bot("Chaser", Vector3(-22, 3, 0))

    def brain(bot, now):
        to = (g.root.props["Position"] - bot.pos).flat()
        if not bot.slid and to.mag() < 11:
            bot.vel = Vector3()
            bot.slide_at(g.root.props["Position"] + Vector3(28 * 0.25, 0, 0), speed=48)
            bot.anim.playing.clear()
            bot.anim.play("Slide", "Movement", 0.4)  # not an Action animation
        elif not bot.slid:
            bot.vel = to.unit() * 34
    b.brain = brain
    g.run(2.5)
    check(g.presses("dribble", "ok"), f"dribbled while running ({g.events})")
    check(any(e[1] == "ankle" for e in g.events) and g.holder is g.lp, f"kept the ball ({g.events})")


@test
def dribble_ignores_a_fake_tackle_next_to_you():
    g = Game().load()
    g.tap("dribble")
    b = g.bot("Faker", Vector3(0, 3, -14))
    state = {"faked": False}

    def brain(bot, now):
        d = (g.root.props["Position"] - bot.pos).flat()
        if d.mag() > 5 and not state["faked"]:
            bot.vel = d.unit() * 16  # walks up...
        elif not state["faked"]:
            state["faked"] = True
            bot.vel = Vector3()
            bot.anim.play("SlideTackle_Anim", "Action", 0.4)  # ...and fakes the tackle standing still
    b.brain = brain
    g.run(2.0)
    check(not g.presses("dribble"), f"didn't waste the dribble on the fake ({g.events})")
    # then the real one
    b.brain = None
    b.slide_at(g.root.props["Position"], speed=60)
    g.run(1.0)
    check(g.presses("dribble", "ok") and any(e[1] == "ankle" for e in g.events),
          f"the real tackle still got ankle-broken ({g.events})")


@test
def dribble_catches_a_point_blank_slide_with_no_animation():
    g = Game().load()
    g.tap("dribble")
    b = g.bot("Ghost", Vector3(0, 3, -4.5))
    g.run(0.5)
    b.lunge = ((g.root.props["Position"] - b.pos).flat().unit() * 70, g.now + 0.3)  # movement only
    g.run(0.5)
    check(any(e[1] == "ankle" for e in g.events), f"read from its first frame of movement ({g.events})")


@test
def dribble_then_runs_clear_of_the_tackler():
    g = Game().load()
    g.tap("dribble")
    runner_at(g, "Isagi", Vector3(0, 3, -30), 28)
    g.run(1.5)
    t = g.presses("dribble", "ok")[0][0]
    moves = [m for m in g.hum.moves if t <= m[0] <= t + 0.3]
    check(moves and all(m[1].z > 0.5 for m in moves), f"ran away from them, not into them ({moves[:3]})")


@test
def no_press_without_a_threat():
    g = Game().load()
    g.tap("dribble")
    b = g.bot("Bystander", Vector3(30, 3, 0))
    b.brain = lambda bot, now: setattr(bot, "vel", Vector3(0, 0, 10))  # jogging past, not at you
    g.run(3)
    check(not g.presses("dribble"), f"nothing pressed ({g.events})")


@test
def cooldown_then_flick_over_a_second_tackle():
    g = Game().load()
    g.tap("dribble")
    runner_at(g, "First", Vector3(0, 3, -30), 28)
    g.run(1.6)
    check(len(g.presses("dribble", "ok")) == 1, f"first dribble ({g.events})")
    t0 = g.presses("dribble", "ok")[0][0]
    jumps_before = len(g.hum.jumps)
    runner_at(g, "Second", Vector3(-20, 3, 0), 30, slide_at=9)
    g.run(1.5)
    during = [e for e in g.presses("dribble") if t0 < e[0] < t0 + 2.9]
    check(not during, f"no dribble pressed while it cools down ({during})")
    check(len(g.hum.jumps) > jumps_before, f"flicked over the second slide (jumps {g.hum.jumps})")
    check("FLICK" in g.readout() or any(e for e in g.events), "readout mentions the flick")


@test
def cooldown_is_learned_from_the_button():
    g = Game(cooldowns={"dribble": 4.5}).load()
    g.tap("dribble")
    runner_at(g, "A", Vector3(0, 3, -30), 28)
    g.run(6)
    lines = g.readout().split("\n")
    # after the overlay came back, the learned cooldown is 4.5s; a fresh threat after that should
    # find dribble ready, and a press made during the old 3s guess shows up as a miss at most twice
    early = [e for e in g.presses("dribble", "cooldown")]
    check(len(early) <= 2, f"at most two early tries before learning ({early})")
    runner_at(g, "B", Vector3(0, 3, -30), 28)
    g.run(2.5)
    t1 = g.presses("dribble", "ok")[-1][0]
    runner_at(g, "C", Vector3(25, 3, 0), 28)
    g.run(4.4)
    early2 = [e for e in g.presses("dribble", "cooldown") if e[0] > t1]
    check(not early2, f"no early presses once learned ({early2}); readout {lines}")


@test
def cutscene_presses_nothing_and_keeps_the_method():
    g = Game().load()
    g.tap("dribble")
    g.run(0.3)
    g.cutscene = True
    runner_at(g, "Kaiser", Vector3(0, 3, -25), 28)
    g.run(1.5)
    check(not g.presses("dribble"), f"nothing reached the game during the cutscene ({g.events})")
    check(not g.W.keyboard_used, "no virtual key or click (they flip the game to its PC layout)")
    check("button off screen" in g.readout(), f"readout says why: {g.readout()!r}")
    g.cutscene = False
    g.clear_bots()
    g.holder = g.lp
    g.root.props["Position"] = Vector3(0, 3, 0)
    runner_at(g, "Kaiser2", Vector3(0, 3, -30), 28)
    g.run(2.5)
    ok = g.presses("dribble", "ok")
    check(ok and ok[0][3] == "button", f"after the cutscene it dribbles via the button ({g.events})")
    check("via BTN" in g.readout(), f"still BTN: {g.readout()!r}")


@test
def hidden_functions_fall_back_to_the_virtual_finger():
    g = Game(hide_functions=True)
    try:
        g.load()
        g.run(0.5)
        check("conn n" in g.readout(), f"readout shows getconnections can't run anything: {g.readout()!r}")
        g.tap("dribble")
        runner_at(g, "Nagi", Vector3(0, 3, -30), 28)
        g.run(2.5)
        check(g.presses("dribble", "ok"), f"dribbled ({g.events})")
        check("via TAP" in g.readout(), f"by the virtual finger: {g.readout()!r}")
        check(not g.W.keyboard_used, "without the PC-layout methods")
    finally:
        g.close()


@test
def misses_skip_a_method_that_doesnt_work():
    g = Game(cooldowns={"dribble": 0.2})
    g.load()
    g.tap("dribble")
    g.ignore.add("dribble")  # the game ignores every press: nothing works
    taps = []
    for i in range(4):
        g.holder = g.lp
        runner_at(g, f"R{i}", Vector3(0, 3, -30), 28)
        g.run(1.6)
        g.clear_bots()
        g.root.props["Position"] = Vector3(0, 3, 0)
        taps.append(len([v for v in g.W.vim.log if v[1] == "touch" and v[2] == 0 and v[3] > 0]))
    tries = g.presses("dribble", "ignored")
    check(len(tries) >= 3, f"kept trying ({tries})")
    check(taps[0] == 0, f"the first tries run the button's code, no virtual finger yet ({taps})")
    check(taps[-1] > 0, f"after two misses it moves on to the virtual finger ({taps}, {g.readout()!r})")


@test
def no_button_ever_uses_the_key():
    g = Game(hud=False)

    def on_key(inp, processed):
        key = inp.get("KeyCode") if isinstance(inp, LuaTable) else inp.lua_index("KeyCode")
        if key is ENUM.item("KeyCode", "Q"):
            g.press("dribble", "key")
    g.W.uis.signal("InputBegan").connect(on_key)
    g.load()
    g.tap("dribble")
    runner_at(g, "Bachira", Vector3(0, 3, -30), 28)
    g.run(2.5)
    ok = g.presses("dribble", "ok")
    check(ok and ok[0][3] == "key", f"with no button anywhere it pressed Q through the game's input code ({g.events})")
    check("via KEY" in g.readout(), f"readout: {g.readout()!r}")


@test
def tackle_slides_at_a_carrier_in_reach():
    g = Game().load()
    carrier = g.bot("Barou", Vector3(0, 3, -8))
    g.holder = carrier.player
    carrier.brain = lambda bot, now: setattr(bot, "vel", Vector3(10, 0, 0))
    g.tap("tackle")
    g.run(1.0)
    ok = g.presses("tackle", "ok")
    check(ok, f"slid ({g.events})")
    look = g.root.look
    check(look.x > 0.05 and look.z < -0.8, f"turned toward where they were going (look {look})")
    check(g.hum.props["AutoRotate"] is True or g.now - ok[0][0] < 0.45, "auto-rotate comes back")
    g.run(1.0)
    check(g.hum.props["AutoRotate"] is True, "auto-rotate is back on")
    line4 = g.readout().split("\n")[3]
    check("slide 1" in line4 and "slide 14" not in line4, f"slide reach was measured: {line4!r}")


@test
def tackle_waits_out_their_dribble_then_goes_in():
    g = Game(ping=0.1).load()
    carrier = g.bot("Rin", Vector3(0, 3, -13.5))
    g.holder = carrier.player
    g.tap("tackle")
    g.run(1.5)
    check(not g.presses("tackle"), f"their dribble is ready and they're not close enough to snap: wait ({g.events})")
    carrier.anim.play("Dribble_Anim", "Action", 0.5)
    t = g.now
    g.run(0.75)
    check(not g.presses("tackle"), f"never into the open dribble window ({g.events})")
    g.run(0.5)
    ok = g.presses("tackle", "ok")
    check(ok and t + 0.8 <= ok[0][0] <= t + 1.3, f"slid once their dribble was cooling ({g.events}, dribbled at {t})")


@test
def tackle_stays_out_of_any_dribble_animation():
    g = Game().load()
    carrier = g.bot("Otoya", Vector3(0, 3, -6))
    g.holder = None
    g.tap("tackle")
    g.run(0.2)
    g.holder = carrier.player  # receives it and dribbles straight away
    carrier.anim.play("Feint", "Movement", 0.5)
    t = g.now
    g.run(0.8)
    check(not [e for e in g.presses("tackle") if e[0] < t + 0.85], f"no slide into a fresh move ({g.events})")


@test
def tackle_leaves_a_dashing_carrier():
    g = Game().load()
    carrier = g.bot("Karasu", Vector3(0, 3, -7))
    g.holder = carrier.player
    carrier.brain = lambda bot, now: setattr(bot, "vel", Vector3(45, 0, 0))
    g.tap("tackle")
    g.run(0.25)
    check(not g.presses("tackle"), f"no slide at someone mid-dash ({g.events})")


@test
def tackle_glides_in_when_just_out_of_reach():
    g = Game().load()
    carrier = g.bot("Aryu", Vector3(0, 3, -19))
    g.holder = carrier.player
    g.run(0.4)
    carrier.dribble()  # their dribble goes off at nothing...
    g.run(1.2)  # ...and is cooling now
    g.tap("tackle")
    path = [g.root.props["Position"]]
    for _ in range(40):
        g.step()
        if g.presses("tackle"):
            break
        path.append(g.root.props["Position"])
    check(g.presses("tackle", "ok"), f"slid ({g.events})")
    steps = [(b - a).mag() for a, b in zip(path, path[1:])]
    check(path[-1].z < path[0].z - 2, f"glided toward them first ({path[0]} -> {path[-1]})")
    check(max(steps) <= 30 * DT * 1.2, f"at a sprint, no teleport (max step {max(steps):.2f})")


@test
def tackle_fakes_out_a_ready_dribble_then_slides():
    g = Game().load()
    carrier = g.bot("Barou", Vector3(0, 3, -16))
    g.holder = carrier.player

    def brain(bot, now):
        # an auto-dribbler: dribbles the moment you come at it fast
        d = (g.root.props["Position"] - bot.pos).flat()
        closing = (g.root.props["Position"] - getattr(bot, "_last", g.root.props["Position"])).flat().mag() / DT
        bot._last = g.root.props["Position"]
        if closing > 20 and d.mag() < 14 and now > bot.protect_until + 3:
            bot.dribble()
    carrier.brain = brain
    g.run(0.5)
    g.tap("tackle")
    g.run(3.0)
    check(any(e[1] == "bot_dribble" for e in g.events), f"the fake drew their dribble out ({g.events})")
    check(not any(e[1] == "ankled_me" for e in g.events), f"never slid into it ({g.events})")
    check(any(e[1] == "won" for e in g.events), f"and won the ball while it cooled ({g.events})")


@test
def tackle_steals_during_a_shot_windup():
    g = Game(ping=0.1, cfg={"Bait": "false"}).load()
    carrier = g.bot("Kaiser", Vector3(0, 3, -13.5))
    g.holder = carrier.player
    g.tap("tackle")
    g.run(1.0)
    check(not g.presses("tackle"), f"their dribble is ready: no slide yet ({g.events})")
    carrier.anim.play("ShootCharge", "Action", 1.0)
    t = g.now
    g.run(0.5)
    ok = g.presses("tackle", "ok")
    check(ok and ok[0][0] - t < 0.3, f"slid into the shot wind-up straight away ({g.events}, wind-up at {t:.2f})")


@test
def tackle_ignores_teammates():
    g = Game().load()
    mate = g.bot("Chigiri", Vector3(0, 3, -6), enemy=False)
    g.holder = mate.player
    g.tap("tackle")
    g.run(1.5)
    check(not g.presses("tackle"), f"no slide at a teammate ({g.events})")


def keeper_game(at=Vector3(0, 3, 190), goal=False, blatant=False):
    g = Game(gk=True, blatant=blatant)
    if goal:
        # the goal model: a net 44 studs wide just behind the line
        net = BasePart(g.W, "Net", Position=Vector3(0, 5, 197), Size=Vector3(44, 10, 4))
        model = Model(g.W, "Goal")
        net.set_parent(model)
        model.set_parent(g.W.workspace)
    g.load()
    g.holder = None
    g.root.props["Position"] = at
    g.ball.props["Position"] = Vector3(0, 1, 0)
    g.run(0.2)
    g.tap("dive")
    g.run(0.5)
    return g


@test
def keeper_dives_at_a_shot():
    g = keeper_game()
    g.shoot(Vector3(10, 2, 140), Vector3(6, 2, 192), 150)
    g.run(0.5)
    ok = g.presses("dive", "ok")
    check(ok, f"dove ({g.events})")
    arrive = 50 / 150
    check(ok[0][0] - (g.now - 0.5) < arrive, "before the ball arrived")
    check(g.root.look.x > 0.3, f"toward the ball's side (look {g.root.look})")


@test
def keeper_dives_the_right_way_with_shiftlock():
    g = keeper_game()
    g.shiftlock = True
    g.run(0.2)
    g.shoot(Vector3(10, 2, 140), Vector3(8, 2, 192), 150)
    g.run(0.5)
    check(g.presses("dive", "ok"), f"dove ({g.events})")
    look = g.press_look["dive"]
    check(look.x > 0.3, f"dove toward the ball, not where shift lock pointed (look {look})")


@test
def slide_aims_with_shiftlock():
    g = Game().load()
    g.shiftlock = True
    carrier = g.bot("Reo", Vector3(6, 3, -4))
    g.holder = carrier.player
    g.tap("tackle")
    g.run(1.0)
    check(g.presses("tackle", "ok"), f"slid ({g.events})")
    look = g.press_look["tackle"]
    check(look.x > 0.5, f"slid at them, not where shift lock pointed (look {look})")


@test
def keeper_glides_onto_a_corner_shot_without_teleporting():
    g = keeper_game(goal=True)
    g.shoot(Vector3(-40, 2, 90), Vector3(19, 2, 193), 150)
    path = []
    for _ in range(60):
        path.append(g.root.props["Position"])
        g.step()
        if g.presses("dive"):
            break
    steps = [(b - a).flat().mag() for a, b in zip(path, path[1:])]
    check(path[-1].x > path[0].x + 4, f"moved toward the far corner ({path[0]} -> {path[-1]})")
    check(max(steps) <= 30 * DT * 1.2 + 16 * DT, f"at a sprint, no teleport (max step {max(steps):.2f})")


def curler(g, by_hand=False):
    # aimed 50 studs out at the goal line, far wide of the post, bending in to about 15. A straight
    # line through it only comes inside the post a third of a second before it arrives.
    g.shoot(Vector3(-10, 2, 110), Vector3(80, 2, 230), 1)
    g.ball_vel = Vector3(90, 0, 120)
    g.ball_acc = Vector3(-157, 0, 0)
    g.ball_by_hand = by_hand


@test
def keeper_reads_a_curler_that_bends_inside_the_post():
    g = keeper_game(goal=True)
    x0 = g.root.props["Position"].x
    curler(g)
    g.run(0.3)
    check(g.root.props["Position"].x > x0 + 1.5, f"read the bend early and started across ({g.root.props['Position']})")
    g.run(0.5)
    ok = g.presses("dive", "ok")
    check(ok, f"dove at the curler ({g.events})")
    check(g.press_look["dive"].x > 0.3, f"toward the side it bends to (look {g.press_look['dive']})")


@test
def keeper_reads_a_scripted_ability_curve():
    g = keeper_game(goal=True)
    curler(g, by_hand=True)
    g.run(0.8)
    check(g.presses("dive", "ok"), f"dove at an ability shot the game moves itself ({g.events})")


@test
def keeper_runs_instead_of_sliding():
    g = keeper_game(goal=True)
    walk = g.hum.props["WalkSpeed"]
    g.shoot(Vector3(-40, 2, 90), Vector3(19, 2, 193), 150)
    path, speeds = [], []
    for _ in range(30):
        path.append(g.root.props["Position"])
        g.step()
        speeds.append(g.hum.props["WalkSpeed"])
        if g.presses("dive"):
            break
    steps = [(b - a).flat().mag() for a, b in zip(path, path[1:])]
    check(path[-1].x > path[0].x + 3, f"ran toward the corner ({path[0]} -> {path[-1]})")
    check(max(steps) <= 26 * DT * 1.05, f"at a run (max step {max(steps):.2f})")
    check(max(speeds) == 26, f"sprint speed while running there ({max(speeds)})")
    g.run(1.5)
    check(g.hum.props["WalkSpeed"] == walk, f"and its walk speed back after ({g.hum.props['WalkSpeed']})")


@test
def keeper_walks_to_a_slow_ball_instead_of_diving():
    g = keeper_game()
    g.shoot(Vector3(8, 1, 165), Vector3(4, 1, 193), 30)
    n = len(g.hum.moves)
    g.run(0.6)
    check(not g.presses("dive"), f"no dive wasted on a slow ball ({g.events})")
    moves = g.hum.moves[n:]
    check(moves and sum(m[1].x for m in moves) > 0, f"stepped toward it ({moves[:3]})")


@test
def keeper_saves_the_dive_for_the_one_timer():
    # the goal from the recording at 0:40: a pass into the box, then a first-time shot while the
    # keeper was still down from diving at the pass
    g = keeper_game()
    g.shoot(Vector3(-12, 1, 160), Vector3(-6, 1, 176), 50)  # over v5's 45 shot threshold
    g.run(0.45)
    check(not g.presses("dive"), f"no dive at the pass ({g.events})")
    g.shoot(g.ball.props["Position"], Vector3(5, 2, 193), 150)
    g.run(0.4)
    check(g.presses("dive", "ok"), f"dove at the shot ({g.events})")


@test
def keeper_jumps_for_a_high_ball():
    g = keeper_game()
    g.shoot(Vector3(0, 9, 150), Vector3(0, 9, 200), 100)
    g.run(0.5)
    check(g.hum.jumps, "jumped")
    check(not g.presses("dive"), f"didn't dive under it ({g.events})")


@test
def keeper_jumps_and_dives_at_a_high_corner_shot():
    g = keeper_game(goal=True)
    g.shoot(Vector3(30, 11, 110), Vector3(14, 11, 193), 120)
    g.run(0.8)
    check(g.hum.jumps, "jumped")
    dives = g.presses("dive", "ok")
    check(dives and 0.05 <= dives[0][0] - g.hum.jumps[0] <= 0.2, f"then dove from the jump ({g.hum.jumps}, {g.events})")
    check(g.press_look["dive"].x > 0.3, f"toward the top corner (look {g.press_look['dive']})")


@test
def keeper_times_the_jump_to_the_ball():
    g = keeper_game(goal=True)
    t0 = g.now
    g.shoot(Vector3(0, 9, 110), Vector3(0, 9, 200), 100)  # crosses his line 0.8s later, 6 up
    g.run(1.0)
    check(g.hum.jumps, "jumped")
    before = t0 + 0.8 - g.hum.jumps[0]
    check(0.2 <= before <= 0.4, f"the top of the jump meets the ball ({before:.2f}s before it arrives)")


@test
def keeper_jumps_for_a_lob_coming_down():
    g = keeper_game(goal=True)
    g.gravity = 196.2
    # up and over: peaks around 30 studs high, comes down through 7-8 up at his line
    g.shoot(Vector3(0, 2, 120), Vector3(0, 2, 121), 1)
    g.ball_vel = Vector3(0, 78, 106)  # apex ~33 up, then through 11 (8 above him) at z=190 after 0.66s
    g.run(1.0)
    check(g.hum.jumps, f"jumped for the lob ({g.events})")
    check(not g.presses("dive"), f"and didn't dive under it ({g.events})")


@test
def keeper_ignores_a_pass_across_the_pitch():
    g = keeper_game()
    g.shoot(Vector3(-40, 1, 120), Vector3(40, 1, 120), 90)
    g.run(1.0)
    check(not g.presses("dive"), f"no dive at a cross-field pass ({g.events})")


@test
def keeper_smothers_a_dribbler():
    g = keeper_game()
    carrier = g.bot("Shidou", Vector3(0, 3, 170))
    g.holder = carrier.player
    carrier.brain = lambda bot, now: setattr(bot, "vel", (g.root.props["Position"] - bot.pos).flat().unit() * 14)
    g.run(2.0)
    check(g.presses("dive", "ok"), f"smothered ({g.events})")


@test
def keeper_dives_at_an_angled_shot_from_the_wing():
    g = keeper_game(goal=True)
    check("goal 44 wide" in g.readout(), f"found the goal: {g.readout()!r}")
    g.shoot(Vector3(-50, 2, 170), Vector3(15, 2, 193), 115)  # mostly sideways: v7 ignored it
    g.run(0.6)
    check(g.presses("dive", "ok"), f"dove at the angled shot ({g.events})")


@test
def keeper_counts_the_whole_goal_not_just_near_his_spot():
    g = keeper_game(at=Vector3(-16, 3, 190), goal=True)
    g.shoot(Vector3(30, 2, 120), Vector3(18, 2, 193), 115)  # far post: 34 studs from where he stands
    g.run(0.1)
    n = len(g.hum.moves)
    g.run(0.4)
    moves = g.hum.moves[n:]
    check(moves and sum(m[1].x for m in moves) > 0, f"moved across toward the far post ({moves[:3]}, {g.events})")


@test
def keeper_dives_into_a_ball_straight_at_him():
    g = keeper_game()
    g.root.look = Vector3(1, 0, 0)  # facing sideways
    g.shoot(Vector3(0, 2, 150), Vector3(0, 2, 195), 120)
    g.run(0.5)
    check(g.presses("dive", "ok"), f"dove ({g.events})")
    look = g.press_look["dive"]
    check(look.z < -0.9, f"into the ball, not sideways (look {look})")


@test
def keeper_stands_in_the_middle_of_the_goal():
    g = keeper_game(at=Vector3(-14, 3, 190), goal=True)
    g.ball.props["Position"] = Vector3(0, 1, 60)
    n = len(g.hum.moves)
    g.run(0.5)
    moves = g.hum.moves[n:]
    check(moves and all(m[1].x > 0.5 for m in moves[-5:]), f"walks back to the middle ({moves[-3:]})")


@test
def infinite_stamina_from_an_attribute():
    g = Game()
    g.char.attrs["Stamina"] = 40
    g.char.attrs["MaxStamina"] = 100
    g.load()
    g.run(0.2)
    check(g.char.attrs["Stamina"] == 100, f"held at the max ({g.char.attrs})")
    g.char.attrs["Stamina"] = 20  # the game drains it
    g.step()
    check(g.char.attrs["Stamina"] == 100, "and back to full the next frame")
    check("stamina attr Stamina" in g.readout(), f"readout: {g.readout()!r}")


@test
def infinite_stamina_from_a_value():
    g = Game()
    stats = Folder(g.W, "Stats")
    stats.set_parent(g.lp)
    v = NumberValue(g.W, "Stamina", Value=80)
    v.set_parent(stats)
    g.load()
    g.run(0.2)
    v.props["Value"] = 30
    g.step()
    check(v.props["Value"] == 80, f"held at the highest it's been ({v.props['Value']})")


@test
def infinite_stamina_from_a_script_table():
    g = Game()
    t = LuaTable()
    t.set("Stamina", 25)
    t.set("MaxStamina", 100)
    g.I.G.set("getgc", lambda include=None: LuaTable([t, LuaTable(), "x"]))
    g.load()
    g.run(0.2)
    check(t.get("Stamina") == 100, f"the game's table held at max ({t.get('Stamina')})")


def carrier_in_front(g, z=165, speed=0.0):
    c = g.bot("Striker", Vector3(0, 3, z))
    g.holder = c.player
    c.brain = lambda bot, now: setattr(bot, "vel", Vector3(0, 0, speed))
    g.run(0.5)
    return c


@test
def keeper_ignores_a_push_toward_goal():
    g = keeper_game()
    c = carrier_in_front(g, 168)
    # a hard push toward goal that dies out about 9 studs in front of you
    g.holder = None
    g.friction = 450
    g.ball.props["Position"] = c.pos + Vector3(0, -2, 1.5)
    g.ball_vel = Vector3(0, 0, 100)
    g.run(0.6)
    check(not g.presses("dive"), f"didn't fall for the touch ({g.events}, {g.readout()!r})")


@test
def keeper_still_saves_a_real_shot_from_a_carrier():
    g = keeper_game()
    c = carrier_in_front(g, 150)
    g.shoot(c.pos + Vector3(0, -1, 2), Vector3(4, 2, 193), 75)  # under SureShot: has to leave them first
    g.run(0.7)
    check(g.presses("dive", "ok"), f"dove at the real shot ({g.events})")


@test
def keeper_doesnt_smother_a_standing_shooter():
    g = keeper_game()
    c = carrier_in_front(g, 184)  # winding up 6 studs out, not moving
    c.anim.play("ShootCharge", "Action", 1.0)
    g.run(1.0)
    check(not g.presses("dive"), f"no dive at someone faking a shot in front of you ({g.events})")


@test
def readout_hidden_by_default():
    g = Game(debug=False).load()
    g.run(0.3)
    label = [c for c in g.bar().children if isinstance(c, TextLabel)][0]
    check(label.props["Visible"] is False, "no black box")
    check(g.bar().get_AbsoluteSize().y <= 30, f"just the pills ({g.bar().get_AbsoluteSize()})")


@test
def blatant_keeper_snaps_onto_a_corner_shot():
    g = keeper_game(goal=True, blatant=True)
    g.shoot(Vector3(-30, 2, 120), Vector3(19, 2, 193), 150)
    g.run(0.2)
    x = g.root.props["Position"].x
    check(x > 12, f"teleported onto the shot's path (x {x:.1f})")
    g.run(0.4)
    check(g.presses("dive", "ok"), f"and dove into it ({g.events})")


@test
def blatant_keeper_still_ignores_a_push():
    g = keeper_game(goal=True, blatant=True)
    c = carrier_in_front(g, 168)
    g.holder = None
    g.friction = 450
    g.ball.props["Position"] = c.pos + Vector3(0, -2, 1.5)
    g.ball_vel = Vector3(4, 0, 100)
    x0 = g.root.props["Position"].x
    g.run(0.6)
    check(not g.presses("dive"), f"no dive at the push ({g.events})")
    check(abs(g.root.props["Position"].x - x0) < 3, "and no teleport for it")


@test
def blatant_tackle_teleports_and_slides():
    g = Game(blatant=True).load()
    carrier = g.bot("Kunigami", Vector3(16, 3, -18))
    g.holder = carrier.player
    carrier.brain = lambda bot, now: setattr(bot, "vel", Vector3(0, 0, -8))
    g.tap("tackle")
    g.run(0.5)
    ok = g.presses("tackle", "ok")
    check(ok, f"slid at a carrier 24 studs away ({g.events})")
    gap = (g.press_pos["tackle"] - carrier.pos).flat().mag()
    check(gap < 6, f"from right next to them ({gap:.1f} studs at the press)")


@test
def blatant_tackle_still_waits_out_a_dribble():
    g = Game(blatant=True).load()
    carrier = g.bot("Hiori", Vector3(0, 3, -20))
    g.holder = None
    g.tap("tackle")
    g.run(0.2)
    g.holder = carrier.player
    carrier.anim.play("Dribble", "Action", 0.5)
    t = g.now
    p0 = g.root.props["Position"]
    g.run(0.8)
    early = [e for e in g.presses("tackle") if e[0] < t + 0.85]
    check(not early, f"no teleport-slide into the dribble ({g.events})")
    check((g.root.props["Position"] - p0).mag() < 1, "no teleport either")


@test
def stamina_named_energy():
    g = Game()
    g.lp.attrs["Energy"] = 10
    g.lp.attrs["EnergyRegen"] = 5
    g.load()
    g.run(0.1)
    g.lp.attrs["Energy"] = 3
    g.lp.attrs["EnergyRegen"] = 2  # a slow debuff: not stamina, must be left alone
    g.step()
    check(g.lp.attrs["Energy"] == 10 and g.lp.attrs["EnergyRegen"] == 2, f"Energy held, regen untouched ({g.lp.attrs})")


@test
def stamina_in_a_player_data_folder():
    g = Game()
    data = Folder(g.W, "PlayerData")
    data.set_parent(g.W.rs)
    mine = Folder(g.W, "Me")
    mine.set_parent(data)
    v = NumberValue(g.W, "Stamina", Value=50)
    v.set_parent(mine)
    m = NumberValue(g.W, "MaxStamina", Value=120)
    m.set_parent(mine)
    g.load()
    g.run(0.2)
    check(v.props["Value"] == 120, f"ReplicatedStorage.PlayerData.Me.Stamina held at its max ({v.props['Value']})")


@test
def stamina_in_a_script_table_by_any_name():
    g = Game()
    t = LuaTable()
    t.set("sprintStamina", 12)
    t.set("maxSprintStamina", 60)
    junk = [LuaTable() for _ in range(4000)]  # takes a few frames to walk
    g.I.G.set("getgc", lambda include=None: LuaTable(junk + [t]))
    g.load()
    g.run(0.3)
    check(t.get("sprintStamina") == 60, f"found and held ({t.get('sprintStamina')}, {g.readout()!r})")


def touches_of(g, ball=True):
    return [t for t in g.W.touches if (t[2] is g.ball) == ball]


def press_on(g, btn, x=None):
    inp = InputObject(g.W, "InputObject", UserInputType=ENUM.item("UserInputType", "Touch"),
                      UserInputState=ENUM.item("UserInputState", "Begin"),
                      Position=Vector3(x if x is not None else 0, 0, 0))
    btn.signal("InputBegan").fire(inp)
    return inp


@test
def reach_sliders_open_move_and_save():
    g = Game(debug=False).load()
    panel = [c for c in g.bar().children if isinstance(c, Frame)][0]
    check(panel.props["Visible"] is False, "sliders start closed")
    r_btn = [c for c in g.bar().children if isinstance(c, TextButton)][3]
    check(r_btn.props["Text"] == "R", "the R button")
    press_on(g, r_btn)
    g.step()
    check(panel.props["Visible"] is True, "R opens them")
    rows = [c for c in panel.children if isinstance(c, Frame)]  # the three tracks
    labels = [c.props["Text"] for c in panel.children if isinstance(c, TextLabel)]
    check(labels == ["GK 6", "DRB 4", "TKL 5"], f"labels {labels}")
    track = rows[0]
    x0, w = track.get_AbsolutePosition().x, track.get_AbsoluteSize().x
    inp = press_on(g, track, x0 + w * 0.2)
    inp.props["Position"] = Vector3(x0 + w * 0.6, 0, 0)
    g.W.uis.signal("InputChanged").fire(inp, False)
    g.W.uis.signal("InputEnded").fire(inp, False)
    g.step()
    labels = [c.props["Text"] for c in panel.children if isinstance(c, TextLabel)]
    check(labels[0] == "GK 15", f"dragged to 60% of 25 ({labels})")
    import json
    saved = json.loads(g.W.files.get("AutoDribble_buttons.json", "{}"))
    check(saved.get("reach", {}).get("dive") == 15, f"saved ({saved})")
    g2 = Game(debug=False)
    g2.W.files["AutoDribble_buttons.json"] = json.dumps(saved)
    g2.load()
    panel2 = [c for c in g2.bar().children if isinstance(c, Frame)][0]
    labels2 = [c.props["Text"] for c in panel2.children if isinstance(c, TextLabel)]
    check(labels2[0] == "GK 15", f"and back next time ({labels2})")


@test
def reach_sphere_shows_your_reach():
    g = keeper_game()
    cam = g.W.workspace.props["CurrentCamera"]
    sphere = cam.m_FindFirstChild("AutoDribbleReach")
    check(sphere is not None, "a sphere in your camera (only you see it)")
    check(sphere.props["Size"].x == 12 and sphere.props["Transparency"] < 1, f"GK reach 6 -> 12 across ({sphere.props['Size']})")
    g.tap("dive")
    g.step()
    check(sphere.props["Transparency"] == 1, "hidden when nothing is on")


@test
def gk_reach_touches_a_ball_in_reach_only():
    g = keeper_game()
    g.shoot(g.root.props["Position"] + Vector3(12, 0, 0), g.root.props["Position"], 1)
    g.ball_vel = Vector3()
    g.run(0.3)
    check(not touches_of(g), "nothing at 12 studs")
    g.ball.props["Position"] = g.root.props["Position"] + Vector3(4.5, 0, 0)
    g.ball_vel = Vector3()
    g.run(0.15)
    ts = touches_of(g)
    check(ts and any(t[1].name == "HumanoidRootPart" for t in ts), f"touched at 5 studs ({len(ts)})")
    check({t[3] for t in ts} == {0, 1}, "a touch and its end, like a real one")


@test
def dribble_reach_picks_up_a_loose_ball():
    g = Game().load()
    g.tap("dribble")
    g.holder = None
    g.ball.props["Position"] = Vector3(0, 1, -3.5)
    g.run(0.2)
    check(touches_of(g), "touched the loose ball 3.5 studs away")


@test
def tackle_reach_grows_enemy_hitboxes_and_puts_them_back():
    g = Game().load()
    foe = g.bot("Rin", Vector3(30, 3, 0))
    mate = g.bot("Chigiri", Vector3(-30, 3, 0), enemy=False)
    g.tap("tackle")
    g.step()
    check(foe.root.props["Size"].x == 5, f"enemy hitbox grown to 5 ({foe.root.props['Size']})")
    check(foe.root.props["Transparency"] < 1 and foe.root.props["CanCollide"] is False, "and drawn see-through red")
    check(mate.root.props["Size"].x == 2, "teammates left alone")
    g.tap("tackle")
    g.step()
    check(foe.root.props["Size"].x == 2 and foe.root.props["Transparency"] == 0, f"put back ({foe.root.props['Size']})")


@test
def tackle_reaches_further_with_a_bigger_hitbox():
    g = Game(cfg={"Hitbox": "{ dive = 6, dribble = 4, tackle = 12 }"}).load()
    carrier = g.bot("Barou", Vector3(0, 3, -18))
    g.holder = carrier.player
    g.run(0.4)
    carrier.dribble()
    g.run(1.2)  # their dribble is cooling
    g.tap("tackle")
    g.run(0.1)
    ok = g.presses("tackle", "ok")
    check(ok, f"slid at 18 studs: 14 of reach plus half a 12-stud hitbox ({g.events})")


def stamina_service(g):
    """BLR's way: the client fires StaminaService.RE.DecreaseStamina, the server keeps the number."""
    from roblox import RemoteEvent
    path = g.W.rs
    for name in ("Packages", "Knit", "Services", "StaminaService", "RE"):
        f = Folder(g.W, name)
        f.set_parent(path)
        path = f
    remote = RemoteEvent(g.W, "DecreaseStamina")
    remote.set_parent(path)
    server = {"stamina": 100.0}

    def on_decrease(amount):
        server["stamina"] = server["stamina"] - amount
    remote.server.append(on_decrease)
    # the game's own client script, draining while you sprint
    client = g.I.load("""
        local remote = game:GetService("ReplicatedStorage").Packages.Knit.Services.StaminaService.RE.DecreaseStamina
        while true do
            task.wait(0.1)
            remote:FireServer(5)
        end
    """, "GameClient")
    return remote, server, client


@test
def stamina_drain_blocked_at_the_remote():
    from roblox import install_hooks
    g = Game()
    install_hooks(g.W)
    remote, server, client = stamina_service(g)
    g.I.sched.spawn(client, [])
    g.run(0.35)
    check(server["stamina"] < 100, "the game drains it on its own")
    g.load()
    g.run(3.5)
    level = server["stamina"]
    g.run(1.0)
    check(server["stamina"] == level, f"drain stopped once the script found the remote ({level} -> {server['stamina']})")
    check("stamina blocked DecreaseStamina" in g.readout(), f"readout: {g.readout()!r}")
    g.I.call(g.I.G.get("getgenv")().get("AutoDribbleStop"), [])
    g.run(0.5)
    check(server["stamina"] < level, "and drains again after the script stops")


@test
def stamina_nan_without_hooks():
    import math
    g = Game()
    remote, server, client = stamina_service(g)
    g.I.sched.spawn(client, [])
    g.load()
    g.run(3.5)
    check(math.isnan(server["stamina"]), f"0/0 sent: the server's stamina is NaN and never runs out ({server})")
    check("stamina NaN DecreaseStamina" in g.readout(), f"readout: {g.readout()!r}")


@test
def stop_and_rerun():
    g = Game().load()
    g.run(0.3)
    g.I.call(g.I.G.get("getgenv")().get("AutoDribbleStop"), [])
    g.run(0.1)
    check(g.gui() is None, "the old pills are gone")
    g.load()
    g.run(0.3)
    check(g.gui() is not None, "a fresh copy runs")


def main():
    only = sys.argv[sys.argv.index("-k") + 1] if "-k" in sys.argv else None
    failed = 0
    for t in TESTS:
        if only and only not in t.__name__:
            continue
        try:
            t()
            print(f"ok    {t.__name__}")
        except AssertionError as e:
            failed += 1
            print(f"FAIL  {t.__name__}: {e}")
        except Exception:
            failed += 1
            print(f"ERROR {t.__name__}:\n{traceback.format_exc()}")
    print(f"\n{len(TESTS) - failed if not only else '?'} passed, {failed} failed")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()

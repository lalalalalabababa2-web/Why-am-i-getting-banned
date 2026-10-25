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

import roblox  # noqa: E402
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
        self.game_movers = []  # the movers the game itself put on the ball for a kick
        self.server_owns_ball = False
        self.ball_stuck = False

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
        return pills[["dribble", "tackle", "dive", "control", "spins"].index(kind)]

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
        written = getattr(self, "_ball_v", None)
        if self.holder is not None:
            hr = self.holder.props["Character"].m_FindFirstChild("HumanoidRootPart")
            self.ball.props["Position"] = hr.props["Position"] + Vector3(0, -2, 1.5)
            self.ball.props["AssemblyLinearVelocity"] = hr.props["AssemblyLinearVelocity"]
        else:
            v = self.ball.props["AssemblyLinearVelocity"]
            if written is not None and v is not written:
                self.ball_vel = v  # the script set it (it owns the ball's physics, like the kicker)
                self.log("ball_set")
            if getattr(self, "ball_hit", None) is not None:
                self.ball_vel, self.ball_hit = self.ball_hit, None  # it hits something this frame
            self.ball_vel = self.ball_vel + Vector3(0, -self.gravity * DT, 0) + self.ball_acc * DT
            if self.friction and self.ball_vel.flat().mag() > 0:
                sp = self.ball_vel.flat().mag()
                self.ball_vel = self.ball_vel * (max(0.0, sp - self.friction * DT) / sp)
            # BodyVelocities with force on fly the ball (two at once fight to a draw). While the server
            # owns the ball, only the game's own count: what the script adds never reaches it.
            movers = [c for c in self.ball.children if c.CLASS == "BodyVelocity" and c.props["MaxForce"].mag() > 0
                      and not (self.server_owns_ball and c not in self.game_movers)]
            if movers:
                v = Vector3()
                for m in movers:
                    v = v + m.props["Velocity"]
                self.ball_vel = v / len(movers)
                if any(m not in self.game_movers for m in movers):
                    self.log("ball_flown")
            if self.ball_stuck:
                self.ball_vel = Vector3()  # in the net
            self.ball.props["Position"] = self.ball.props["Position"] + self.ball_vel * DT
            self.ball.props["AssemblyLinearVelocity"] = Vector3() if self.ball_by_hand else self.ball_vel
        self._ball_v = self.ball.props["AssemblyLinearVelocity"]
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

    def game_kick(self, frm, to, speed, new_ball=False):
        """A kick the way the game does it: its own BodyVelocity and BodyGyro fly the ball. With
        new_ball, the ball at your feet is swapped for a fresh Football as it goes."""
        from roblox import BodyGyro, BodyVelocity
        if new_ball:
            old = self.ball
            self.ball = BasePart(self.W, "Football", Position=frm, Size=Vector3(2, 2, 2))
            self.ball.set_parent(self.W.workspace)
            old.m_Destroy()
        self.shoot(frm, to, speed)
        if new_ball:
            self.ball.props["AssemblyLinearVelocity"] = self.ball_vel  # already on its way when it appears
        bv = BodyVelocity(self.W, "BodyVelocity", Velocity=self.ball_vel, MaxForce=Vector3(1e5, 1e5, 1e5))
        bg = BodyGyro(self.W, "BodyGyro")
        for m in (bv, bg):
            m.set_parent(self.ball)
            self.game_movers.append(m)
        return bv, bg


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
def loads_and_shows_five_pills():
    g = Game().load()
    g.run(0.5)
    kinds = ("dribble", "tackle", "dive", "control", "spins")
    check([g.pill_text(k) for k in kinds] == ["DRIBBLE OFF", "TACKLE OFF", "AUTO GK OFF", "CONTROL OFF", "SPINS OFF"],
          f"pills read {[g.pill_text(k) for k in kinds]}")
    line1 = g.readout().split("\n")[0]
    check("conn Y sig Y tap ?" in line1, f"readout line 1 is {line1!r}")
    check(not [v for v in g.W.vim.log if v[1] == "touch"], "no test touch on the screen at startup")
    check(g.readout().count("\n") == 4, "the readout has five lines")
    size = g.bar().get_AbsoluteSize()
    check(size.x <= 200 and size.y <= 105, f"the UI is small: two rows and the readout ({size})")


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
def keeper_covers_the_near_post_for_a_ball_out_wide():
    g = keeper_game(goal=True)
    c = g.bot("Bachira", Vector3(35, 3, 170))
    g.holder = c.player
    g.run(2.0)
    pos = g.root.props["Position"]
    # on the line splitting the angle between the posts: about (15, 186); straight at the ball from
    # the middle of the goal was (5, 187), leaving the near post open
    check(pos.x > 11 and pos.z < 189, f"stood toward the near post ({pos})")
    check(not g.presses("dive"), f"no dive at someone standing out wide ({g.events})")


def shot_from_windup(windup):
    g = keeper_game()
    c = carrier_in_front(g, 165)
    if windup:
        c.anim.play("ShootCharge", "Action", 0.6)
    g.run(0.3)
    t0 = g.now
    g.shoot(c.pos + Vector3(0, -1, 2), Vector3(3, 2, 193), 75)  # under SureShot, 17 studs from him
    g.run(0.3)
    ok = g.presses("dive", "ok")
    return ok[0][0] - t0 if ok else None


@test
def keeper_reads_a_shot_out_of_a_windup_sooner():
    late, soon = shot_from_windup(False), shot_from_windup(True)
    check(late is not None and soon is not None, f"dove at both ({late}, {soon})")
    check(soon <= 0.04 and late >= 0.07, f"straight away out of the wind-up ({soon:.3f}s), not after the fake checks ({late:.3f}s)")


@test
def keeper_ignores_a_push_after_a_cancelled_windup():
    g = keeper_game()
    c = carrier_in_front(g, 168)
    c.anim.play("ShootCharge", "Action", 0.3)  # a fake shot: the wind-up stops, no kick
    g.run(0.6)
    g.holder = None
    g.friction = 450
    g.ball.props["Position"] = c.pos + Vector3(0, -2, 1.5)
    g.ball_vel = Vector3(0, 0, 100)
    g.run(0.6)
    check(not g.presses("dive"), f"didn't fall for the push after the fake ({g.events})")


@test
def keeper_comes_out_for_a_loose_ball():
    g = keeper_game(goal=True)
    g.bot("Isagi", Vector3(0, 3, 120))  # nowhere near
    g.ball.props["Position"] = Vector3(4, 1, 178)
    g.ball_vel = Vector3()
    got = g.run(1.2, until=lambda: (g.ball.props["Position"] - g.root.props["Position"]).flat().mag() < 2.5)
    check(got, f"ran out and got to it ({g.root.props['Position']})")
    check(not g.presses("dive"), f"no dive needed ({g.events})")


@test
def keeper_stays_home_when_an_attacker_gets_there_first():
    g = keeper_game(goal=True)
    a = g.bot("Nagi", Vector3(0, 3, 164))
    a.brain = lambda bot, now: setattr(bot, "vel", Vector3(0, 0, 20))
    g.ball.props["Position"] = Vector3(0, 1, 172)
    g.ball_vel = Vector3()
    furthest = INF
    for _ in range(36):
        g.step()
        furthest = min(furthest, g.root.props["Position"].z)
    # (stepping out to the angle puts him at 184; racing for the ball would have him past 181)
    check(furthest > 183, f"didn't race an attacker who's closer (out to z={furthest:.1f})")


@test
def keeper_dives_at_a_loose_ball_before_the_attacker_shoots():
    g = keeper_game(goal=True)
    # he stands at 184 (stepped out to the angle); the ball 7 in front of him, the attacker 8 behind it
    a = g.bot("Barou", Vector3(0, 3, 169))
    a.brain = lambda bot, now: setattr(bot, "vel", Vector3(0, 0, 22))
    g.ball.props["Position"] = Vector3(0, 1, 177)
    g.ball_vel = Vector3()
    g.run(0.15)
    ok = g.presses("dive", "ok")
    check(ok, f"dove at the ball by their feet ({g.events})")
    check(g.press_look["dive"].z < -0.8, f"out at the ball (look {g.press_look['dive']})")


@test
def keeper_cuts_out_a_low_cross():
    g = keeper_game(goal=True)
    g.bot("Kunigami", Vector3(6, 3, 172))  # waiting at the far post
    g.shoot(Vector3(-40, 1, 180), Vector3(40, 1, 180), 60)
    got = g.run(1.0, until=lambda: (g.ball.props["Position"] - g.root.props["Position"]).flat().mag() < 3)
    check(got, f"met the cross before it reached the striker ({g.root.props['Position']}, ball {g.ball.props['Position']})")


@test
def keeper_doesnt_chase_the_ball_in_his_hands():
    g = keeper_game(goal=True)
    start = g.root.props["Position"]
    for _ in range(60):
        # caught: the game carries it 2.5 studs in front of him, moving with him
        g.ball_vel = g.root.props["AssemblyLinearVelocity"]
        g.ball.props["Position"] = g.root.props["Position"] + Vector3(0, -1, -2.5)
        g.step()
    moved = (g.root.props["Position"] - start).flat().mag()
    check(moved < 3, f"stayed put with the ball in his hands (moved {moved:.1f})")


@test
def keeper_doesnt_smother_into_a_dribble():
    g = keeper_game()
    c = g.bot("Shidou", Vector3(0, 3, 170))
    g.holder = c.player
    c.brain = lambda bot, now: setattr(bot, "vel", (g.root.props["Position"] - bot.pos).flat().unit() * 14)
    g.run(2.0, until=lambda: (c.pos - g.root.props["Position"]).flat().mag() < 9.5)
    c.dribble()
    t0 = g.now
    g.run(1.5)
    dives = g.presses("dive", "ok")
    check(dives, f"still smothered once the dribble's window closed ({g.events})")
    check(dives[0][0] >= t0 + 0.8, f"but not into the dribble ({dives[0][0] - t0:.2f}s after it)")


@test
def readout_hidden_by_default():
    g = Game(debug=False).load()
    g.run(0.3)
    label = [c for c in g.bar().children if isinstance(c, TextLabel)][0]
    check(label.props["Visible"] is False, "no black box")
    check(g.bar().get_AbsoluteSize().y <= 50, f"just the two rows of pills ({g.bar().get_AbsoluteSize()})")


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


@test
def no_hitbox_extender_left():
    g = Game(debug=False).load()
    foe = g.bot("Rin", Vector3(0, 3, -6))
    g.tap("dribble")
    g.tap("tackle")
    g.holder = None
    g.ball.props["Position"] = Vector3(0, 1, -3.5)
    g.run(0.5)
    texts = [c.props["Text"] for c in g.bar().children if isinstance(c, TextButton)]
    check(len(texts) == 5 and "R" not in texts, f"five pills, no R button ({texts})")
    check(not [c for c in g.bar().children if isinstance(c, Frame)], "no slider panel")
    check(foe.root.props["Size"].x == 2 and foe.root.props["CanQuery"] is True, "enemy hitboxes left alone")
    check(not touches_of(g), "no fake touches on the ball")
    check(not [d for d in g.W.hui.descendants() if d.CLASS in ("SelectionBox", "CylinderHandleAdornment")],
          "nothing drawn in the world")


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
    g = Game(cfg={"StaminaHook": "true"})
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
    nans = [f for f in g.W.fired if f[1] is remote and f[2] and f[2][0] != f[2][0]]
    g.run(15)
    nans2 = [f for f in g.W.fired if f[1] is remote and f[2] and f[2][0] != f[2][0]]
    check(len(nans) == 1 and len(nans2) == 1, f"once per life, not every few seconds ({len(nans)}, {len(nans2)})")
    check("stamina NaN DecreaseStamina" in g.readout(), f"readout: {g.readout()!r}")


@test
def idle_does_no_heavy_searching():
    # every few seconds a full ReplicatedStorage scan and every 20s a full memory walk hitched the
    # game (and the camera) all the time, even with everything off
    g = Game()
    counts = {"rs": 0, "gc": 0}
    orig = g.W.rs.m_GetDescendants

    def counted():
        counts["rs"] += 1
        return orig()
    g.W.rs.m_GetDescendants = counted

    def getgc(include=None):
        counts["gc"] += 1
        return LuaTable([LuaTable() for _ in range(50)])
    g.I.G.set("getgc", getgc)
    g.load()
    g.run(30)
    check(counts["rs"] <= 1 and counts["gc"] <= 1, f"searched once, not over and over ({counts})")


@test
def stamina_remote_that_loads_late_is_still_blocked():
    from roblox import install_hooks
    g = Game(cfg={"StaminaHook": "true"})
    install_hooks(g.W)
    g.load()
    g.run(4)
    remote, server, client = stamina_service(g)  # BLR's services load after the script
    g.I.sched.spawn(client, [])
    g.run(0.5)
    level = server["stamina"]
    g.run(1.0)
    check(server["stamina"] == level, f"blocked as soon as it arrived ({level} -> {server['stamina']})")


@test
def stamina_never_hooks_the_game_by_default():
    # the __namecall hook broke the game's scripts on some executors (the camera stopped following)
    import math
    from roblox import install_hooks
    g = Game()
    install_hooks(g.W)
    remote, server, client = stamina_service(g)
    g.I.sched.spawn(client, [])
    g.load()
    g.run(3.5)
    check(g.I.namecall_hook is None, "no __namecall hook installed")
    check(math.isnan(server["stamina"]), f"stamina via 0/0 instead ({server})")


def control_game(look=Vector3(1, -0.342, 0), on=True):
    """You on the ball at the centre spot with CONTROL on, the camera looking `look` way."""
    g = Game().load()
    cam = g.W.workspace.props["CurrentCamera"]
    cam.props["CFrame"] = roblox.CFrame(Vector3(0, 8, 12), look.unit())
    if on:
        g.tap("control")
    g.run(0.3)
    return g, cam


def shoot_ahead(g, speed=150, **kw):
    return g.game_kick(g.root.props["Position"] + Vector3(0, -2, -1.5), g.root.props["Position"] + Vector3(0, -2, -100),
                  speed, **kw)


def flown(g):
    return [e for e in g.events if e[1:] == ("ball_flown",)]


def our_movers(g):
    return [c for c in g.ball.children if c.CLASS == "BodyVelocity" and c not in g.game_movers]


@test
def control_steers_your_shot_where_you_look():
    g, cam = control_game()
    check(g.pill_text("control") == "CONTROL ON", f"pill reads {g.pill_text('control')!r}")
    shoot_ahead(g)
    g.run(0.1)
    check(cam.props["CameraSubject"] is g.ball, "the camera follows the ball")
    check(g.pill_text("control") == "STEERING", f"pill reads {g.pill_text('control')!r}")
    g.run(0.6)
    v = g.ball_vel
    check(v.x > 120 and abs(v.y) < 15, f"turned to where the camera looks, flying level ({v})")
    check(abs(v.mag() - 150) < 2, f"at the shot's own speed ({v.mag():.1f})")
    g.run(3.5)
    check(cam.props["CameraSubject"] is g.ball, "still yours 4s in")
    g.run(4.5)
    check(cam.props["CameraSubject"] is g.hum, f"the camera back on you after ({cam.props['CameraSubject']})")
    check(g.pill_text("control") == "CONTROL ON", f"pill back to {g.pill_text('control')!r}")
    check(not our_movers(g), "our mover is gone")


@test
def control_takes_over_from_the_games_kick():
    g, cam = control_game()
    bv, bg = shoot_ahead(g)
    g.run(0.1)
    check(bv.props["MaxForce"].mag() == 0 and bg.props["MaxTorque"].mag() == 0,
          "the game's BodyVelocity and BodyGyro are off while you steer")
    check(len(our_movers(g)) == 1, "one mover of our own flies it")
    g.run(0.5)
    check(g.ball_vel.x > 120, f"so it really turns ({g.ball_vel})")
    g.tap("control")
    g.step()
    check(bv.props["MaxForce"].mag() > 0 and bg.props["MaxTorque"].mag() > 0, "and they get their settings back after")


@test
def control_steers_when_the_game_swaps_the_ball():
    g, cam = control_game()
    shoot_ahead(g, new_ball=True)  # the ball at your feet is replaced by a fresh Football as it goes
    g.run(0.6)
    check(cam.props["CameraSubject"] is g.ball, "the camera follows the new ball")
    check(g.ball_vel.x > 120, f"and it turns ({g.ball_vel})")


@test
def control_keeps_flying_when_the_game_clears_the_ball():
    g, cam = control_game()
    shoot_ahead(g)
    g.run(0.2)
    for c in list(g.ball.children):
        c.m_Destroy()  # the game tidies its kick off the ball, ours with it
    g.run(0.4)
    check(len(our_movers(g)) == 1 and g.ball_vel.x > 120, f"a fresh mover keeps flying it ({g.ball_vel})")


@test
def control_rides_out_a_bump():
    g, cam = control_game()
    shoot_ahead(g)
    g.run(0.3)
    g.ball_stuck = True  # clips someone for a moment
    g.run(0.3)
    g.ball_stuck = False
    g.run(0.5)
    check(cam.props["CameraSubject"] is g.ball and len(our_movers(g)) == 1, "still steering after the bump")
    check(g.ball_vel.x > 120, f"and still flying where you look ({g.ball_vel})")


@test
def control_keeps_the_games_mover_off():
    g, cam = control_game()
    bv, bg = shoot_ahead(g)
    for _ in range(40):
        bv.props["MaxForce"] = Vector3(1e5, 1e5, 1e5)  # the game switches its kick back on every frame
        g.step()
    check(g.ball_vel.x > 120, f"it keeps turning anyway ({g.ball_vel})")
    check(cam.props["CameraSubject"] is g.ball, "without letting go")


@test
def control_turns_all_the_way_round():
    g, cam = control_game(look=Vector3(0, -0.342, 0.940))  # looking back the way you shot
    shoot_ahead(g)
    g.run(1.2)
    check(g.ball_vel.z > 120, f"came round to fly back ({g.ball_vel})")
    check(cam.props["CameraSubject"] is g.ball, "and is still yours after passing you")


@test
def control_flies_past_you_without_letting_go():
    g, cam = control_game()
    shoot_ahead(g)
    g.run(0.4)
    g.root.props["Position"] = g.ball.props["Position"] + Vector3(2, 2, 0)  # right beside it as it goes by
    g.run(0.3)
    check(cam.props["CameraSubject"] is g.ball and len(our_movers(g)) == 1, "a ball going past you is still yours")


@test
def control_takes_a_loose_ball_you_didnt_kick():
    g, cam = control_game(look=Vector3(0, -0.342, -0.940))
    g.bot("Reo", Vector3(-35, 3, -10))
    not_yours(g)
    g.shoot(Vector3(-31, 1, -10), Vector3(31, 1, -10), 80)  # their pass, across in front of you
    g.run(0.8)
    check(cam.props["CameraSubject"] is g.ball, "took the pass once you were the nearest to it")
    check(g.ball_vel.z < -100, f"and flew it where you look ({g.ball_vel})")


@test
def control_leaves_a_ball_nearer_someone_else():
    g, cam = control_game(look=Vector3(0, -0.342, -0.940))
    g.bot("Barou", Vector3(20, 3, -38))
    not_yours(g)
    g.shoot(Vector3(2, 1, -35), Vector3(40, 1, -35), 60)  # 35 out, running past them
    g.run(0.6)
    check(cam.props["CameraSubject"] is not g.ball and not flown(g), "theirs to run, left alone")


@test
def control_lets_a_pass_to_you_arrive():
    g, cam = control_game(look=Vector3(0, -0.342, -0.940))
    not_yours(g)
    g.shoot(Vector3(30, 1, -2), Vector3(0, 1, -2), 60)
    g.run(0.45)
    check(cam.props["CameraSubject"] is not g.ball and not flown(g), "a ball coming to your feet isn't taken")


@test
def control_doesnt_grab_a_ball_it_just_let_go():
    g, cam = control_game()
    g.server_owns_ball = True
    shoot_ahead(g, speed=45)  # slow, and the server keeps it: it gets let go while still near you
    g.run(2.0, until=lambda: cam.props["CameraSubject"] is g.hum)
    check(cam.props["CameraSubject"] is g.hum, "let go")
    g.run(0.5)
    check(cam.props["CameraSubject"] is g.hum, "and not taken straight back")


def not_yours(g):
    """The ball off somewhere else long enough that it no longer counts as just kicked by you."""
    g.holder = None
    g.ball.props["Position"] = Vector3(0, 1, 120)
    g.ball_vel = Vector3()
    g.run(0.7)


def goal_ahead(g, keeper_team_enemy=True):
    net = BasePart(g.W, "Net", Position=Vector3(0, 5, -150), Size=Vector3(44, 10, 4))
    model = Model(g.W, "Goal")
    net.set_parent(model)
    model.set_parent(g.W.workspace)
    return g.bot("Keeper", Vector3(-12, 3, -147), enemy=keeper_team_enemy)


def x_at_goal_line(g):
    for _ in range(120):
        g.step()
        if g.ball.props["Position"].z <= -146:
            return g.ball.props["Position"].x
    return None


@test
def control_bends_for_the_corner_away_from_their_keeper():
    g, cam = control_game(look=Vector3(0, -0.342, -0.940))
    goal_ahead(g)
    shoot_ahead(g)
    x = x_at_goal_line(g)
    check(x is not None and 8 < x < 22, f"in at the far post, away from the keeper at x=-12 (x={x})")


@test
def control_never_aims_at_your_own_goal():
    g, cam = control_game(look=Vector3(0, -0.342, -0.940))
    goal_ahead(g, keeper_team_enemy=False)
    shoot_ahead(g)
    x = x_at_goal_line(g)
    check(x is not None and abs(x) < 3, f"straight where you look at your own goal (x={x})")


@test
def control_steers_a_slow_shot_at_a_usable_speed():
    g, cam = control_game()
    shoot_ahead(g, speed=60)
    g.run(0.5)
    check(abs(g.ball_vel.mag() - 120) < 2, f"flown at ControlSpeed ({g.ball_vel.mag():.1f})")


@test
def control_turns_smoothly_not_at_once():
    g, cam = control_game()
    shoot_ahead(g)
    g.run(0.1)
    v = g.ball_vel
    check(v.z < -50, f"still mostly on its way a moment after the kick ({v})")


@test
def control_lets_go_when_something_knocks_the_ball():
    g, cam = control_game()
    shoot_ahead(g)
    g.run(0.3)
    g.ball_stuck = True  # in the net
    g.run(0.8)
    check(cam.props["CameraSubject"] is g.hum, "the camera back on you")
    check(not our_movers(g), "and the ball left alone")


@test
def control_only_steers_your_own_shot():
    g, cam = control_game()
    c = g.bot("Rin", Vector3(0, 3, -10))
    g.holder = c.player  # takes it off you and shoots first time
    g.run(0.1)
    g.shoot(c.pos + Vector3(0, -2, -2), c.pos + Vector3(0, -2, -100), 100)
    g.run(0.5)
    check(cam.props["CameraSubject"] is not g.ball, "the camera stays on you")
    check(not flown(g) and not our_movers(g), "their shot left alone")


@test
def control_off_leaves_shots_alone():
    g, cam = control_game(on=False)
    shoot_ahead(g)
    g.run(0.5)
    check(cam.props["CameraSubject"] is not g.ball, "the camera stays on you")
    check(abs(g.ball_vel.x) < 0.01, f"the ball flies straight ({g.ball_vel})")


@test
def control_hands_the_camera_back_when_turned_off():
    g, cam = control_game()
    shoot_ahead(g)
    g.run(0.2)
    check(cam.props["CameraSubject"] is g.ball, "following the ball")
    g.tap("control")
    g.step()
    check(cam.props["CameraSubject"] is g.hum, "back on you the moment the pill goes off")


@test
def control_lets_go_when_the_server_keeps_the_ball():
    g, cam = control_game()
    g.server_owns_ball = True  # our mover does nothing: the ball keeps going where the game sends it
    bv, bg = shoot_ahead(g)
    g.run(1.2)
    check(cam.props["CameraSubject"] is g.hum, "the camera back on you")
    check(not our_movers(g) and bv.props["MaxForce"].mag() > 0, "and the game's kick left as it was")


def customization_service(g):
    """BLR's CustomizationService.RE.Customize, and a server whose saves fail once your data holds
    a string that isn't valid UTF-8 (the data store can't store it)."""
    from roblox import RemoteEvent
    path = g.W.rs
    for name in ("Packages", "Knit", "Services", "CustomizationService", "RE"):
        f = path.m_FindFirstChild(name)
        if f is None:
            f = Folder(g.W, name)
            f.set_parent(path)
        path = f
    remote = RemoteEvent(g.W, "Customize")
    remote.set_parent(path)
    server = {"slot": "1", "fired": []}

    def saves():
        try:
            server["slot"].encode("latin-1").decode("utf-8")
            return True
        except UnicodeDecodeError:
            return False
    server["saves"] = saves

    def on_customize(category, item, slot):
        server["fired"].append((category, item, slot))
        server["slot"] = slot
    remote.server.append(on_customize)
    return server


@test
def spins_tap_stops_saves_and_tap_again_lets_them_back():
    g = Game().load()
    server = customization_service(g)
    g.tap("spins")
    check(g.pill_text("spins") == "SPINS ON", f"pill reads {g.pill_text('spins')!r}")
    check(server["fired"] == [("Emotes", "Default", "2\xff")], f"sent the unsaveable setting ({server['fired']})")
    check(not server["saves"](), "so nothing from now on saves: spin away")
    g.tap("spins")
    check(g.pill_text("spins") == "SPINS OFF", f"pill reads {g.pill_text('spins')!r}")
    check(server["saves"](), f"and saves work again, with the style you got ({server['fired']})")
    check(not g.W.teleports, "no rejoin from a tap")


@test
def spins_hold_rolls_back():
    g = Game().load()
    server = customization_service(g)
    g.tap("spins", hold=1.0)
    check(not server["saves"](), "saves off first")
    check(g.pill_text("spins") == "REJOINING", f"pill reads {g.pill_text('spins')!r}")
    g.run(1.2)
    check(g.W.teleports and g.W.teleports[0][1] == 1 and g.W.teleports[0][2] is g.lp,
          f"then back into the game: this session's spins never saved ({g.W.teleports})")


@test
def spins_say_so_when_the_game_has_no_remote():
    g = Game().load()
    g.tap("spins")
    check(g.pill_text("spins") == "NO REMOTE", f"pill reads {g.pill_text('spins')!r}")
    g.run(1.2)
    check(g.pill_text("spins") == "SPINS OFF", "and stays off")
    g.tap("spins", hold=1.0)
    g.run(1.2)
    check(not g.W.teleports, "no rejoin without saves off: that would just lose nothing and gain nothing")


@test
def spins_stay_on_across_a_rerun():
    g = Game().load()
    server = customization_service(g)
    g.tap("spins")
    g.load()  # running the script again replaces the old copy
    g.run(0.3)
    check(g.pill_text("spins") == "SPINS ON", f"the new copy knows saves are off ({g.pill_text('spins')!r})")
    check(len(server["fired"]) == 1 and not server["saves"](), "and left them that way")


def spin_screen(g, left, lucky=0):
    """The game's spin screen, as the recording shows it."""
    sg = ScreenGui(g.W, "StylesSpin")
    sg.set_parent(g.pg)
    for text in (f"SPINS LEFT: {left}", f"LUCKY SPINS: {lucky}", "SPIN $2,500"):
        TextLabel(g.W, "Label", Text=text).set_parent(sg)


@test
def spins_tell_you_when_you_have_none():
    g = Game().load()
    customization_service(g)
    spin_screen(g, 0)
    g.tap("spins")
    check(g.pill_text("spins") == "0 SPINS", f"pill reads {g.pill_text('spins')!r}")
    check(any("0 spins" in n for n in g.W.notes), f"and says why nothing will spin ({g.W.notes})")
    g.run(1.2)
    check(g.pill_text("spins") == "SPINS ON", "still on: buy a spin with yen and it rolls back too")


@test
def spins_say_nothing_when_you_have_some():
    g = Game().load()
    customization_service(g)
    spin_screen(g, 3)
    g.tap("spins")
    check(g.pill_text("spins") == "SPINS ON" and not any("0 spins" in n for n in g.W.notes),
          f"just on ({g.pill_text('spins')!r}, {g.W.notes})")


def queued(g):
    q = []
    g.I.G.set("queue_on_teleport", lambda code: q.append(tostr(code)))
    return q


@test
def spins_rollback_brings_the_script_back():
    g = Game().load()
    customization_service(g)
    q = queued(g)
    g.tap("spins", hold=1.0)
    g.run(1.2)
    check(len(q) == 1 and "AutoDribbleRolledBack = 5" in q[0] and "ccr-c17f9351-tb2c46/blue-lock-rivals/AutoDribble.lua" in q[0],
          f"the next server runs it again, told it's a rollback ({q})")


def arrive_from_rollback(g, tries=5):
    """What the code queued by a rollback sets before running the script in the next server."""
    env = g.I.call(g.I.G.get("getgenv"), [])
    env = env[0] if isinstance(env, list) else env
    env.set("AutoDribbleRolledBack", tries)


@test
def spins_carry_on_after_a_rollback():
    g = Game()
    arrive_from_rollback(g)
    server = customization_service(g)
    g.load()
    g.run(0.5)
    check(g.pill_text("spins") == "SPINS ON" and not server["saves"](), "saves off again on arrival: keep spinning")
    q = queued(g)
    g.W.guisvc.signal("ErrorMessageChanged").fire("Data Error")
    g.run(0.1)
    check(len(g.W.teleports) == 1, f"a Data Error kick gets another rejoin ({g.W.teleports})")
    check(q and "AutoDribbleRolledBack = 4" in q[0], f"one try fewer each time ({q})")
    g.W.guisvc.signal("ErrorMessageChanged").fire("Data Error")
    g.run(0.1)
    check(len(g.W.teleports) == 1, "once per server")


@test
def spins_dont_rejoin_on_an_ordinary_error():
    g = Game().load()
    customization_service(g)
    g.W.guisvc.signal("ErrorMessageChanged").fire("Disconnected")
    g.run(0.1)
    check(not g.W.teleports, "only after a rollback")


@test
def stop_and_rerun():
    g = Game().load()
    g.run(0.3)
    g.tap("control")
    shoot_ahead(g)
    g.run(0.2)
    cam = g.W.workspace.props["CurrentCamera"]
    check(cam.props["CameraSubject"] is g.ball, "steering when it's stopped")
    g.I.call(g.I.G.get("getgenv")().get("AutoDribbleStop"), [])
    check(cam.props["CameraSubject"] is g.hum, "stopping hands the camera back")
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

# Auto Dribble + Auto Tackle + Auto GK + Ball Control + Infinite Spins — Blue Lock: Rivals

| | |
|---|---|
| Game | Blue Lock: Rivals (Roblox), mobile |
| Language | Luau, run through an executor (Delta / Codex / Arceus X on Android) |
| File | `AutoDribble.lua`, one script, no dependencies |

## Run it

Paste `AutoDribble.lua` into the executor, or load it straight from this branch:

```lua
local f, err = loadstring(game:HttpGet("https://raw.githubusercontent.com/lalalalalabababa2-web/why-am-i-getting-banned/ccr-c17f9351-tb2c46/blue-lock-rivals/AutoDribble.lua"))
if not f then warn("AutoDribble didn't compile: " .. tostring(err)) return end
f()
```

If it doesn't compile, the executor's console says why instead of nothing happening. A corner
notification says "AutoDribble v24 Loaded" when it starts.

Running it again replaces the old copy. Five pills appear on the left in two rows: **DRIBBLE**,
**TACKLE**, **AUTO GK**, then **CONTROL**, **SPINS**. Tap to toggle, drag to move. Hold about a second and let go, then tap
the game's button to force which button that pill presses. Turn AUTO GK on standing in your goal;
it pauses dribble and tackle.

## What each one does

- **Dribble** is a counter. Pressing it opens a protection window, and a tackle that lands
  inside that window gets ankle-broken. The script dribbles when an enemy is about to reach you
  or starts a tackle, ping included. If a second tackle comes while dribble is still cooling down,
  it flicks the ball over it instead (a jump with the ball, Space on PC).
- **Tackle** turns you toward where the carrier will be and slides once the slide reaches them.
  It never slides into an open dribble window, goes straight in while their dribble is cooling
  down, and otherwise waits until they're too close to react. It measures how far your slides
  really go and aims the next one with that.
- **Auto GK** dives at shots heading between your posts and jumps for high balls close to you. It
  walks across to slow balls instead of spending the dive on a pass, smothers anyone dribbling
  right at you, and keeps you on the angle while your thumb is off the stick. It also comes out
  for loose balls and low crosses it would reach first, and dives at a loose ball an attacker is
  about to reach.
- **Control** steers the ball where you look: your own shots, and a loose ball flying near you
  that you're the nearest player to. The camera follows the ball and it turns toward wherever the
  camera looks, at its own speed or 120 studs/s, whichever is more. Aim roughly at their goal and
  it bends for the corner away from their keeper. Look up to lift it and down to dip
  it. It lets go when the ball hits something, someone takes it, or 4 seconds pass, and the camera
  comes back to you.

- **Spins** is infinite spins as a rollback, the way the public scripts do it. It re-uses the spins
  you have; it can't make spins out of nothing, so you need at least one spin (or the yen for one).
  Codes in the game's CODES menu and match rewards are where spins come from. It works by sending it sends
  `CustomizationService.RE.Customize("Emotes", "Default", "2\255")`: a setting the game's data
  store can't save (`\255` isn't valid text), so nothing from that session saves.
  1. Tap SPINS on (blue) **before** spinning.
  2. Spin in the game's own wheel (styles, flow, golden wheel).
  3. Got what you wanted? Tap SPINS off. The setting goes back to `"2"` and the game's next save
     keeps the style.
  4. Didn't? Hold SPINS: you rejoin a fresh server and the spins are back. The script runs itself
     again there (if your executor has `queue_on_teleport`) with SPINS already on, so go straight
     back to 2. A "Data Error" kick on the way in is the old server still holding your save; it
     rejoins again by itself (up to 5 times).

  **Auto:** name the styles you want before loading the script and SPINS does the spinning:

  ```lua
  getgenv().SpinFor = { "Kaiser", "NEL Isagi", "Sae" }   -- exact names, any case
  loadstring(game:HttpGet("https://raw.githubusercontent.com/lalalalalabababa2-web/why-am-i-getting-banned/ccr-c17f9351-tb2c46/blue-lock-rivals/AutoDribble.lua"))()
  ```

  Tap SPINS on in the lobby. It spins (lucky spins first) until one of them lands, then puts saves
  back on. When the spins run out, it rolls back and the next server carries on by itself. It
  stops instead of looping if the spins aren't getting through, and it never rejoins with 0 spins.

- **Codes:** the codes in `CFG.Codes` (October 2026 lists) are redeemed by themselves, once per
  server, through the game's own redeem remote, or by typing them into its code box if there's no
  remote. Old codes just fail. Codes need **level 10, the game's Roblox group joined, and the game
  liked**.

  Unchecked: whether `"2"` really puts the setting right in your version. The first time, after
  tapping it off, leave and come back to check the style stayed. Don't play matches with it on,
  since nothing you earn saves.

## The readout box

- **Line 1**: what the executor allows (`conn` getconnections, `sig` firesignal, `tap` virtual
  touch, `key` virtual key; `Y` works, `n` blocked, `?` not tried yet), and your ping.
- **Line 2**: the ball (distance, `YOU` / `FOE` / `TEAM` / `free`) and the nearest enemy (distance,
  seconds until in reach).
- **Line 3**: the last press: the move, `btn:yes` / `btn:label` / `btn:NO`, the method, `OK` or
  `miss`. Also `button off screen` (cutscene), `still cooling (button)`, `FLICK`, `JUMP`.
- **Line 4**: cooldown left per move (`ok` = ready) and how far your slide reaches.
- **Line 5**: how wide your goal is (`?` = not found in the map) and where stamina was found.

## v24

- **Auto-reroll:** `getgenv().SpinFor = { ... }` (or `CFG.SpinFor`) and SPINS spins for those
  styles by itself through `StyleService.RE.Spin`. It reads your style from
  `PlayerStats.Style` and the counts from the spin screen. It goes round rollbacks until one lands,
  and the targets ride along to the next server. Six spins that change nothing stop it, and 0 spins
  never start a rejoin.
- **Codes redeemed by themselves**, once per server. The remote is found by name (a Knit service
  remote like `RedeemCode`), with the game's code box and Redeem button as the fallback.

## v23

- **SPINS with 0 spins says so.** In the clip it was working (blue, remote found), but the game
  said "Not enough money and no spins!": a rollback gives back spins you had, it can't make them.
  Tapping SPINS on with 0 spins on the spin screen now shows `0 SPINS` and a notification saying
  what to do.
- **The reroll loop runs itself:** after a hold, the next server runs the script again with SPINS
  already on, and a "Data Error" kick gets up to 5 more rejoins on its own. It only does this after
  a rollback, never on an ordinary error.

## v22

- **SPINS pill: infinite spins** (see above). Tap = saves off/on, hold = rejoin and roll back.
  Saves stay off across a re-run of the script (it remembers). With no `Customize` remote in the
  game, it says `NO REMOTE` and does nothing.
- The pills are two rows now (DRIBBLE TACKLE AUTO GK / CONTROL SPINS), 192 pixels wide again.

## v21

- **Control holds on.** If the game switches its kick mover back on, it's switched off again every
  frame (it was only switched off once). A bump costs up to 0.6s before it lets go (it was 0.25s).
  A ball flying past you is still yours: it only counts as back with you once the game gives it to
  you. You get 8 seconds instead of 4.
- **Control a ball you didn't kick:** a loose ball flying within 45 studs that you're the nearest
  player to. Roblox runs a loose ball's physics on the nearest player's device, so that's one you
  can move; `isnetworkowner` decides when the executor has it. A ball on its way to your feet is
  left to arrive, and one it just let go isn't taken straight back.
- **Turns all the way round:** look straight back and the ball U-turns in about 0.6s. Before, it
  couldn't turn more than about 90° (halfway between opposite directions is no direction).
- **Aim assist:** aimed within 25° of a goal that has an enemy keeper in it, the ball goes low
  for the corner away from them. Never at a goal your own team's keeper is in.

## v20

- **Control works the way the game moves the ball.** BLR flies a kicked Football with its own
  BodyVelocity and BodyGyro, so v19's velocity set straight on the ball was undone the next frame.
  v19 then took that for a knock and let go: the one-frame STEERING flash in the clip. Now the
  game's movers on the ball are switched off for the flight (and get their settings back after),
  and a BodyVelocity of our own flies it. If the game clears it off the ball, a new one goes on.
- **It starts on your kick even if the game swaps the ball.** "Yours" is now any ball at your
  feet a moment before, not that exact ball. In the clip, the real kick never started at all.
- A slow shot is flown at 120 studs/s or more, so there's something to steer.
- It no longer gives up on `isnetworkowner`, which can say no for a moment after a kick. If the
  server really keeps the ball, the ball doesn't follow, and it lets go after a quarter of a
  second.
- With `Debug = true`, line 3 says why it let go.

## v19

- **The hitbox extender is gone:** the R button and sliders, the grown enemy hitboxes, the reach
  ring, and the fake touches. Tackle aims at its own slide's reach again.
- **CONTROL pill:** steer your shot after you kick it (see above). It only steers a ball that was
  at your feet a moment before, not someone else's shot. If the executor has `isnetworkowner` and
  the server kept the ball, it leaves the ball alone and gives the camera back.
- **Keeper angle:** it stands on the line splitting the angle between your posts as the ball sees
  them. For a ball out wide that's at the near post, where it used to be near the middle.
- **Shot out of a wind-up:** a ball that leaves a shooter whose wind-up is still playing gets the
  dive at once. The fake checks used to cost about 0.08s, which loses a close shot. A wind-up they
  cancel, then a push, still goes through every fake check.
- **Coming out:** a loose ball or a low cross in the box gets claimed when you'd clearly be there
  first; it doesn't race an attacker who's closer. If it's a race and a dive covers it, it dives at
  the ball before they can shoot.
- **Smother:** it never dives into a dribble the carrier just started. It waits out the window,
  then smothers.

## v18

- **Camera:** grown enemy hitboxes no longer show up in raycasts (`CanQuery` off, still
  touchable), so the camera's collision check can't snap the camera to your head when one is in
  the way. No test touch on the screen at startup. The stamina 0/0 goes once per life, not every
  10s.

## v17

- **Camera: the stamina hook is off by default.** v15 was the first version that ran, and the
  camera glitch started with it. It was also the first to run the `__namecall` hook that blocks
  the stamina remote, and on some mobile executors that hook breaks the game's own scripts. Stamina now
  uses the 0/0 trick by default, which touches nothing else (`StaminaHook = true` brings the hook
  back).
- **Reach is drawn as a thin ring at your feet** (an adornment). At DRB 25 the filled disc
  tinted 50 studs of pitch green. **Enemy hitboxes get a thin red outline** (a SelectionBox)
  instead of their part being recoloured.
- **Hitbox extender:** the touch comes from every part of your body (hands for a catch, feet for a
  trap), every 0.08s. A fast ball counts if it'll be in reach a moment from now, so a 180
  studs/s pass skimming past isn't missed between frames.

## v16

- **Camera hitching fixed.** The stamina search ran all the time, even with every pill off. It
  scanned the whole of ReplicatedStorage every 3 seconds and walked all of the game's script
  memory every 20, and each pass froze the game for a moment on a phone. ReplicatedStorage is now
  searched once, and remotes that load later are checked as they arrive. The memory walk only
  runs if there's no stamina remote or value, only once, in slices of 400 per frame.
- **The reach marker is a flat disc on the ground**, not a sphere around you: with the camera
  inside the sphere, the whole screen went hazy.
- **With every pill off it does almost nothing per frame:** it only keeps track of the ball and
  what enemies just did, so the pills know it the moment they go on.

## v15

- **Fixes v14 not starting at all.** v14 had 209 local variables alive at once in its main chunk,
  and Luau refuses to compile past 200, so the executor gave up before anything appeared. The
  pressing, keeper, stamina, reach, main-loop and pill sections now keep their own locals in
  blocks (at most 154 alive now). `check.py` counts locals and upvalues per function against
  Luau's limits, and the test suite runs that check, so a script that won't compile can't pass.
- A notification when it starts, and a loader that prints the compile error if there is one.

## v14

- **Reach sliders (the R button):** GK, DRB and TKL, 0–25 studs, saved between runs.
  - **GK:** while you keep, any ball within reach gets the game's own touch from your hands, feet
    and middle (`firetouchinterest`), as if you'd got to it.
  - **DRB:** a loose ball within reach gets touched, so it's yours.
  - **TKL:** enemies' hitboxes grow to that size (on your side only) so slides land, the ball at a
    carrier's feet within reach gets touched, and auto-tackle slides from half the hitbox further.
  - **What you see:** a see-through sphere shows your GK or DRB reach, see-through red boxes the
    enemies' hitboxes. They're in your camera, so only you see them. Hitboxes go back to normal
    when tackle goes off.
- **Infinite stamina that reaches the server:** BLR keeps stamina on its server, and your client
  tells it how much to take through `StaminaService.RE.DecreaseStamina`. Those calls are now
  dropped before they leave (`hookmetamethod`), so the server never takes any. Without
  `hookmetamethod`, the remote gets `0/0` every 10s instead (the trick public scripts use: the
  server's stamina turns into NaN, which never runs out). Any remote named like a stamina decrease
  is treated the same. The value-holding from v10 stays as a fallback.
- `check.py` flags a key set twice in one table (a second `Reach` in CFG silently replaced the
  first while this was being written).

## v13

- **Keeper jumps for high shots.** It reads how high the ball crosses your line (curve and dip
  included) and when, then times the jump so its top meets the ball. A high ball wider than
  you can reach standing gets a jump, then a dive from near the top of it into the top corner
  (`JumpDiveDelay`). Lobs coming down over you get a jump too, not a dive underneath. The point
  where a ball crosses your line is now interpolated between frames, so a dropping lob's height
  is no longer a stud low.

## v12

- **Less noticeable:** the keeper and the tackle get there on your own run, with its animation, at
  about a sprint for the moment (`BurstSpeed` 26). The walk speed goes back after. No sliding
  feet, no teleports (`Glide = true` or `Blatant = true` for those).
- **Keeper vs ability shots:** it predicts the whole path, curve and dip included, not a
  straight line. A curler aimed far outside the post that bends in (Kaiser's, Rin's) gets read
  within a few frames, and the keeper starts across right away instead of in the last third of
  a second. Curves are read faster (up to 500 studs/s² of bend), and so are ability shots the
  game moves by script.
- **Tackle steals during a shot or pass wind-up:** they can't dribble out of it, so it goes
  straight in. Animations named like a dribble or feint, and unnamed ones, still count as
  dribbles. A wind-up no longer counts as their dribble going on cooldown.
- **Dribble:** after it fires, you run clear of the tackler for a moment (only with your thumb off
  the stick, `EscapeAfter`).

## v11

- **Less noticeable:** no teleports by default (`Blatant = true` brings them back). The keeper
  and the tackle glide in at a sprint (`GlideSpeed` 30 studs/s), so it looks like a fast player,
  not a jump across the pitch.
- **Dribble doesn't fall for fake tackles:** it only answers a real tackle, meaning a lunge
  faster than a run, or a tackle or move starting while they close in fast. A move played
  standing next to you, or a run that stops short, doesn't get it, so the real tackle after
  the fake still meets it. Someone just running at you doesn't either (`DribbleOnRun = true`
  brings that back). It reads frame-to-frame speed within 10 studs, so a slide from point blank
  is seen on its first frame. The button's tap is sent in a single frame (it used to release
  0.03s later), which helps every dribble, slide and dive.
- **Tackle fakes them out:** at a carrier whose dribble is ready it fakes a tackle (a quick step
  in, every 1.5s). Once they dribble at it, it waits out their protection and slides while their
  dribble cools down. It also glides in when they're just past the slide's reach.

## v10

- **Blatant mode, on by default** (`Blatant = false` in CFG turns it off). The keeper teleports
  onto a shot's path where it crosses your line, inside the posts and up to 30 studs, and dives
  into it. Tackle teleports you 3 studs short of a carrier up to 30 studs away and slides. Both
  still skip fake shots and never go into an open dribble window.
- **Infinite stamina, always on (no button), with a much wider search:** names with stamina, energy
  or endurance (not their max, regen, cost or drain), your attributes and values, your data
  folder in ReplicatedStorage (`PlayerData.<you>` and the like), and the game's scripts' own
  tables, walked a slice per frame with `getgc` so it doesn't hitch.
- **No black box:** the readout is hidden (`Debug = true` brings it back).
- **Dribble** reacts a bit earlier (0.3s ahead, tackles starting within 18 studs).

## v9

- **No falling for fake shots.** The keeper reacts to the ball, never the wind-up, so a feint kick
  on its own does nothing. What could still bait it is now filtered out:
  - A push toward goal that dies out: a ball under shot pace (110 studs/s) gets 0.08s after the
    kick for its slowing to show, and a ball that would stop before your line isn't a shot.
  - A ball still at the feet of whoever just had it hasn't been shot.
  - A carrier standing in front of you winding up isn't smothered. Only one coming at you is, or
    one right on top of you.

## v8

- **Keeper:** finds your goal in the map (a part named like a goal or net) and guards all of it,
  not just near where you stood when you turned it on. Angled shots from the wing count (v7
  ignored shots coming in at more than 60 degrees, and that's two of the five goals in the second
  recording). On a shot wider than a dive reaches, it moves onto the ball's path first and dives
  last. A ball coming straight at you gets a dive into it, not off to one side. It stands in the
  middle of the goal between plays.
- **Smaller UI:** the three pills sit in one row with the readout under them (192x78 instead of
  230x148). `UiScale` in CFG makes it bigger or smaller.
- **Infinite stamina:** holds stamina at its max wherever the game keeps it on your side: an
  attribute or a number value named like stamina on you or your character, or (with `getgc`) a
  script's table with a Stamina field. Readout line 5 shows what it found (`none` means the game
  keeps stamina on the server, where a script can't reach it).

## v7

- **Shift lock:** dives and slides go where they should. Shift lock turns you to the camera every frame, so the turn is held every frame while the move goes off, and the press goes in the same frame as the turn.
- **Dribble while running:** reacts earlier to chasers and to slides (40 studs/s and up, any animation), and dribbles when someone is right on you and moving.
- **Tackle:** never slides while the carrier is starting any move (whatever animation priority it plays at) or dashing, and only snaps at a carrier whose dribble is ready from closer in.

## v6, from the recording

| Seen in the recording | Fix |
|---|---|
| The HUD vanished during a goal cutscene (2:05), so it pressed with the virtual Q key, got stuck on it, and the game kept flipping to its PC key hints | It never presses while the game's button exists but isn't on screen. Methods are tried top-down every time, and one is skipped only after misses in a row, so it goes back to the button as soon as it works |
| Presses during the game's own cooldown counted as misses and pushed it off a working method | It knows each move's cooldown: it starts from a guess, then learns it by watching the button go back to how it looked before the press. It doesn't press while cooling |
| A second defender took the ball 1s after an ankle break (2:47) | It flicks over a tackle that comes while dribble is cooling down |
| The keeper dove at a pass, then the one-timer went in (0:40) | Dives only at balls over 60 studs/s (that shot was about 150). For a slower ball it walks onto the ball's path if it can get there in time, so the dive is still there for the shot |
| — | Auto tackle, the keeper's jump for high balls, and moving onto the ball's path |

## Checking it without Roblox

Neither needs a Luau install, just Python 3:

```sh
python3 check.py AutoDribble.lua            # syntax, unknown globals, call arity
python3 test/test_autodribble.py            # runs the script in a fake match
```

`test/luau.py` is a small Luau interpreter and `test/roblox.py` a fake Roblox (instances,
signals, getconnections, VirtualInputManager). The fake match has the game's HUD as the
recording shows it: Dribble and Pass only with the ball, Slide without it, Dive as keeper, a
cooldown overlay on each button, and a HUD that disappears during cutscenes. Slides and dives
move you by CFrame, the way the game seems to. The 109 scenarios include the 0:40 goal and the
cutscene. Breaking any one feature on purpose makes at least one of them fail.

It still hasn't run in the real game, and these numbers in `CFG` are guesses:
`LungeSpeed`, `SlideSpeed`, the protection window, and the first cooldown guesses (those last ones
get replaced once it learns them). The keeper's `FoeSpeed` and the shot wind-up names
(`shoot`, `charge`, `kick`, …) are guesses too. Control needs your client to own the ball's physics
after a kick. Other scripts for this game steer it the same way, so it should, but it's unchecked here.

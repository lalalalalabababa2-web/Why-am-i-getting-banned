# Auto Dribble + Auto Tackle + Auto GK — Blue Lock: Rivals

| | |
|---|---|
| Game | Blue Lock: Rivals (Roblox), mobile |
| Language | Luau, run through an executor (Delta / Codex / Arceus X on Android) |
| File | `AutoDribble.lua`, one script, no dependencies |

## Run it

Paste `AutoDribble.lua` into the executor, or load it straight from this branch:

```lua
loadstring(game:HttpGet("https://raw.githubusercontent.com/lalalalalabababa2-web/why-am-i-getting-banned/ccr-c17f9351-tb2c46/blue-lock-rivals/AutoDribble.lua"))()
```

Running it again replaces the old copy. Three pills appear on the left: **DRIBBLE**, **TACKLE**,
**AUTO GK**. Tap to toggle, drag to move. Hold about a second and let go, then tap the game's
button to force which button that pill presses. Turn AUTO GK on standing in your goal; it pauses
the other two.

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
  right at you, and keeps you between the ball and the goal while your thumb is off the stick.

## The readout box

- **Line 1**: what the executor allows (`conn` getconnections, `sig` firesignal, `tap` virtual
  touch, `key` virtual key; `Y` works, `n` blocked, `?` not tried yet), and your ping.
- **Line 2**: the ball (distance, `YOU` / `FOE` / `TEAM` / `free`) and the nearest enemy (distance,
  seconds until in reach).
- **Line 3**: the last press: the move, `btn:yes` / `btn:label` / `btn:NO`, the method, `OK` or
  `miss`. Also `button off screen` (cutscene), `still cooling (button)`, `FLICK`, `JUMP`.
- **Line 4**: cooldown left per move (`ok` = ready) and how far your slide reaches.
- **Line 5**: how wide your goal is (`?` = not found in the map) and where stamina was found.

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
move you by CFrame, the way the game seems to. The 56 scenarios include the 0:40 goal and the
cutscene. Breaking any one feature on purpose makes at least one of them fail.

It still hasn't run in the real game, and these numbers in `CFG` are guesses:
`LungeSpeed`, `SlideSpeed`, the protection window, and the first cooldown guesses (those last ones
get replaced once it learns them).

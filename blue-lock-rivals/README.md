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
move you by CFrame, the way the game seems to. The 20 scenarios include the 0:40 goal and the
cutscene. Breaking any one feature on purpose makes at least one of them fail.

It still hasn't run in the real game, and these numbers in `CFG` are guesses:
`LungeSpeed`, `SlideSpeed`, the protection window, and the first cooldown guesses (those last ones
get replaced once it learns them).

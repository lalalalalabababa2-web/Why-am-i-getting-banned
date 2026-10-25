# Auto Dribble + Auto GK — Blue Lock: Rivals

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

Running it again replaces the old copy. Two pills appear on the left: tap to toggle, drag to move,
hold about a second and let go, then tap the game's button to force which button it presses.

## The readout box

- **Line 1**: what the executor allows. `conn` getconnections, `sig` firesignal, `tap` virtual
  touch, `key` virtual key. `Y` works, `n` blocked, `?` not tried yet.
- **Line 2**: the ball (distance, `YOU` / `FOE` / `TEAM` / `free`) and the nearest enemy (distance,
  seconds until in reach). A teammate showing up as the nearest foe means the teams are mixed up.
- **Line 3**: the last press. `btn:yes` found the button, `btn:label` found only its text (the
  finger and click still aim at it), `btn:NO` found nothing. Then the method, then `OK` or `miss`.

## v5.1 (on top of v5)

- **KEY works without getconnections.** The game's ContextActionService binding runs through
  `CallFunction`, which needs no getconnections, so v5 shouldn't have skipped it. An action named
  after the move is preferred over everything bound to Q.
- **The startup check can't switch off a working method.** It runs whatever getconnections hands
  back instead of comparing it with the original (some executors hand back a wrapped copy), and
  falls back to a connection's own `Fire` when its function is hidden. The virtual finger and the
  virtual key are tried on every press, whatever the startup check said.
- **A "Dribble" label with no button object is still a target.** The virtual finger and click only
  need the spot. A real button still wins, so a hint label somewhere else doesn't. A label next to
  several buttons only takes the one it sits on, so it can't grab Shoot from a shared row.
- **The press check reads movement from position too.** A dribble that moves you by CFrame has no
  physics speed, so v5 would have counted a working method as a miss and dropped it.

Not run in the real game yet, and not compiled: the Luau toolchain couldn't be installed in the
session that made v5.1. v5 compiled and passed its 99 mock tests.

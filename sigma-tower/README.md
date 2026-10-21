# Brainrot Battleground: Sigma Tower

**Engine:** Roblox Studio (macOS or Windows) · **Language:** Luau · **Project tool:** Rojo 7.7.1

You climb a meme skyscraper floor by floor: survive the TikTok Subway, kill the Big Back in the Kitchen, escape the Ohio Backrooms, then fight for the Streamer Chair in the Penthouse. The entire map, every NPC and all of the UI are built from code when the server starts. Nothing is placed by hand in Studio, so a fresh clone runs as is.

## Run it

### Fastest: build a place file

```sh
# one-time: install Rokit (tool manager), then the pinned tools
curl -sSf https://raw.githubusercontent.com/rojo-rbx/rokit/main/scripts/install.sh | bash
cd sigma-tower
rokit install

rojo build -o SigmaTower.rbxlx
```

Open `SigmaTower.rbxlx` in Roblox Studio and press **Play**. In Studio you start with 20,000 Rizz and own every game pass, so you can test everything right away (see `Config.Debug`).

### While you're editing: live sync

```sh
rojo plugin install      # once; installs the Rojo plugin into Studio
rojo serve
```

In Studio, open any place (an empty Baseplate works; the script deletes the baseplate), click **Rojo → Connect**, then press Play. File saves sync into Studio instantly.

### Saving progress in Studio

DataStores only work in Studio after **Game Settings → Security → Enable Studio Access to API Services**, which needs the place published first. If that's off, the game still runs but resets every session.

## Controls

| Input | Action |
|---|---|
| Click / tap | Fire the equipped weapon (hold for the Vacuum and the Shield) |
| `E` | Weapon special |
| `F` | Fanum Tax: steal 5% of coins from everyone within 16 studs (60s cooldown, 15s with the pass) |
| `Q` | Dash with brief i-frames |
| `Shift` | Sprint |
| `M` (hold) | Mew when the prompt appears |
| `R` | Elevators and shakes |
| `1`–`5` | Switch weapons |

Mobile gets touch buttons for all of these.

## What's in it

**Floors**
- **1 · TikTok Subway** (PvP): you spawn at the turnstiles on the south platform. Trains cross every 8–14 seconds after a 3-second red warning and kill anything in the trench. Toilet Grunts and NPC Streamers roam. Reaching the north elevator unlocks Floor 4.
- **4 · The Kitchen** (PvE): props at 300% scale. The Big Back slams telegraphed red circles under players. Below 30% HP it enrages and pulls everyone in, and anyone caught near it gets eaten. Its health scales with the number of players on the floor. Dealing 1% of its health unlocks Floor 7.
- **7 · Ohio Backrooms** (PvE): a fresh maze every server, thick yellow fog, flickering lights. Grab 5 Purple Shakes while Shleep Cat hunts you through the maze with BFS pathfinding. All 5 unlock Floor 10.
- **10 · The Penthouse** (PvP): sitting in the Streamer Chair pays 50 Rizz/sec and announces you to the whole server.

**Weapons** (bought with Rizz in the shop)

| Weapon | Primary | Special (E) |
|---|---|---|
| NPC Slap (free) | 15 melee, knockback | none |
| Purple Shake Blaster | 35 splash, lobbed | Purple Puddle: 50% slow for 5s |
| Fanum Tax Vacuum | 6 dmg beam that drains 2% of the target's coins per tick | Tax Evasion: a decoy runs off while you go invisible for 3s |
| GigaChad Stare | 80 single-target hitscan | Jawline Blind: whites out their screen |
| Mewing Shield | Hold to block everything in front; blocked hits fire 50% back | Mog Stare: 2s stun, and they take double damage |

The Shield plays a phonk loop that gets louder as your kill streak grows.

**Systems**
- **Mewing QTE:** a prompt appears every 25–50s. Each success raises your streak, which gives more speed, a bigger aura and more Rizz. Missing one resets the streak.
- **Kill streaks:** at 10, 25 and 50 kills the screen goes deep-fried (saturation, bloom, FOV punch, screen shake) and the server gets a shoutout.
- **Server events:** every 30 minutes, alternating between **Grimace Hour** (5x coins, purple fog) and **Big Back Invasion** (low gravity and a raid boss on Floor 1 with a timer). The schedule is computed from the clock, so every server switches at the same moment.
- **Daily streak:** 7 days. Day 3 is the gold Vacuum skin; Day 7 is a permanent GigaChad aura plus 5x Rizz for an hour. Missing a day resets it.
- **Friend multiplier:** +25% income for each friend in the server (capped at +100%), an Invite button, and a **Most Sigma Squad** board that ranks friend groups by combined Rizz.
- **Rebirth:** resets coins and Rizz for a permanent +0.5x multiplier and a bigger body.
- **Game passes:** GigaChad (2x Rizz and aura), Infinite Fanum Tax, Soundboard, VIP (gold tag and trail).

## Before you publish

1. **Game passes:** create them on the Creator Dashboard and paste the IDs into `Config.GamePasses`. Passes left at `0` show "not set up yet" in the shop.
2. **Sounds:** public audio on Roblox is mostly locked down. Upload your own sounds and paste their IDs into `Config.Sounds`. Empty IDs are skipped, so the game runs silent until you add them.
3. **Names:** real streamers, Skibidi Toilet, Smurfs and McDonald's all belong to someone, and Roblox games have been DMCA'd over exactly this. The defaults are parody names, and every name lives in `Config.Names`.

## Tuning

Every number is in `src/shared/Config.luau`: damage, cooldowns, prices, train timing, boss phases, maze size, event length, rewards. Change values there, not in the services.

## Layout

```
src/
  shared/    Config, Net (all remotes), Util             -> ReplicatedStorage.Shared
  server/    one module per system; Floors/ has one per floor -> ServerScriptService.Server
  client/    HUD, panels, input, effects, mewing, per-floor atmosphere -> StarterPlayerScripts.Client
```

The server is authoritative. The client only sends "I used weapon X toward point P". The server checks ownership, the equipped tool, cooldowns, range and line of sight, then resolves the hit itself. The boss pull and knockback run on the client (so they feel smooth), while the kill checks for being eaten stay on the server.

## Known gaps

- Floors 2, 3, 5, 6, 8 and 9 don't exist yet; the elevator skips them.
- Saves have no session locking. Hopping between servers within a few seconds can lose the last few seconds of progress. If that becomes a problem, swap `Data.luau` for ProfileStore.
- The share-to-TikTok reward from the design doc isn't implemented. Luau can't touch the clipboard or open links, and there's no way to verify that a share happened, so a reward would just be free coins for pressing a button. The deep-fried moment tells players to clip it instead.

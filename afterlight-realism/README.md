# Afterlight: Blood & Steel — v12.1 Realism

A realism layer for the Afterlight v11.0.0 APK (`app.fieldline.afterlight.bloodsteel`).
It is appended to the game's web bundle the same way the v7–v11 overhauls were,
so every part of the original game still runs underneath it. A new **REALISM**
tab in the main menu switches each aspect on or off.

- APK: `apk/Afterlight_Blood_Steel_v12.1.0_Realism.apk` (versionCode 12100)
- Source: `src/realism_v12.js`
- Assets: `assets/realism/` (photoscanned surfaces, HDRI skies, credits)
- Before / after: `screenshots/before_after_1.jpg`, `screenshots/before_after_2.jpg`
- v12.1: `screenshots/v121_*.jpg` (corpses, body, shadow, flash, death cam)

## Installing

- **From v12.0:** install v12.1 over it. It uses the same key, so your
  settings and victories are kept.
- **From v11:** the v11 APK was signed with a local key that isn't available,
  so v12 uses a new key. **Uninstall v11 first**, then install v12.1.
  Uninstalling clears the game's saved settings and campaign victories.

## New in 12.1

Three new switches on the REALISM tab, all on in Authentic and Hardcore.

### Ragdolls and corpses
- **Bodies stay where they fall.**
  - Zombie corpses last 90 s instead of 7 s.
  - Up to 8 / 18 / 28 corpses are kept (Performance / Balanced / Ultra),
    instead of 12 that vanish.
  - Soldiers' bodies stay for the rest of the fight.
- **Momentum.** A body keeps the speed it was moving at, so a running zombie
  pitches forward.
- **Falling.** A limp body tips over (mostly forward, since your centre of
  mass is ahead of your ankles). It no longer folds onto its knees.
- **Ground friction** (μ ≈ 0.65) stops a body within a body length instead
  of letting it skate.
- **Bullet impulses scale with the round.** A pistol shot drops a body; a
  shotgun blast throws it. Shots into a corpse nudge it instead of shoving it.
- **Stagger.** Heavy hits and blasts rock living zombies back.
- **Blasts move corpses** up to 8 m away.

### Grenades
- **Real fuses.** Frag 4.4 s (M67: 4–5.5 s), flash 1.6 s (M84), all with
  a little variation per grenade.
- **Cooking.**
  - Hold **G** (or FRAG on touch) and release to throw.
  - The spoon flies after 0.25 s and the fuse starts running.
  - Hold it too long and it goes off in your hand.
  - If you die holding it, it drops at your feet.
  - Your own running speed carries into the throw.
- **Fragmentation.**
  - A frag throws about 2,600 fragments.
  - Each body is hit by its share, worked out from the size of target it
    presents at that distance. Five line-of-sight checks from feet to head
    decide how much of it is exposed, so cover and going prone save you.
  - Fragments lose energy with range: lethal within about 5 m, wounding to
    about 15 m, and harmless past 26 m.
  - Fragments chip nearby walls.
- **Overpressure.** The blast itself is lethal within about 2 m, injures to
  5 m, and knocks you off your feet within 7 m.
- **Flashbangs.** After the white-out, the frame you saw at the bang stays
  burned on your vision for several seconds while it fades, and your hearing
  rings.

### Your body
- **You have legs.**
  - Look down to see your legs and boots move with your stride.
  - Your full body, rifle included, casts its shadow on the ground.
- **Head motion.**
  - Step-locked head bob.
  - The landing is absorbed through your knees.
  - You lean into strafes.
  - Idle breathing gets heavier as you tire.
  - Blasts and blows kick the view.
  - All of it is off with Reduced Motion.
- **Weapon inertia.** The gun lags behind fast turns according to its weight.
- **Going prone.**
  - **Z**, or double-tap crouch. **JUMP** gets you up.
  - Crawling is slow (about 0.8 m/s).
  - Recoil and sway are lowest when prone.
- **Limb wounds.** Hits land on a body region, shown on a small silhouette
  on the HUD.
  - Leg wounds slow you down. A badly hurt leg can't sprint, and worse can't
    jump.
  - Arm wounds slow reloads and add sway and recoil.
  - Head hits concuss.
  - Wounds heal slowly; a medkit treats most of the damage.
- **No sprinting while reloading**, and no aiming down sights mid-reload.
- **Breath vapour** on the cold maps (cemetery, rail yard, harbor).
- **Death.** Your body ragdolls away from whatever killed you, and the camera
  goes down with it. The view fades out before the results screen.

## What changed in 12.0

### Graphics
- **Photoscanned surfaces.** Every world material (tile, plaster, concrete,
  brick, adobe, wood, planks, bark, steel, containers, velvet, carpet, hessian,
  asphalt, dirt, grass, sand, rock) uses a CC0 Poly Haven scan. Each scan has
  albedo, normal and roughness maps at true real-world scale.
- **Projection.** Surfaces use per-pixel planar projection in object space, so
  texel density stays the same everywhere.
- **Tints preserved.** Each map's tints are kept: the scan supplies the detail,
  the designer's colour supplies the hue and brightness.
- **Concrete.** Walls show cast formwork with tie holes; floors show worn,
  poured concrete.
- **Weapons and characters.** Gun finishes are a phosphate-steel and a stippled
  polymer generated for this build. Clothing gets knit and linen weave, gloves
  and belts get leather grain, and skin gets pores. All of it is layered over
  the characters' original stain and blood maps.
- **HDRI skies.** Every outdoor map has a real HDRI sky, rotated so its sun or
  moon matches the map's key light. The same sky provides image-based lighting
  and reflections.
- **Reflection probes.** Indoor maps capture probes from the level itself.
  They recapture when the power comes on, and the nearest probe follows you.
- **Camera.**
  - Khronos PBR Neutral tone curve with a photographic grade (no teal/orange).
  - Eye adaptation: pupils close fast in bright light and open slowly in the
    dark.
  - Partial automatic white balance.
  - 180° shutter rotational motion blur that doesn't blur your own weapon.
  - Peripheral softening while aiming down iron sights.
- **Lighting.**
  - Denser, softer sun shadows.
  - The viewmodel is lit by the real sun direction and darkens when you stand
    in shade.
  - Nights are darker than in v11 and lamps carry the scene.

### Weapons and ballistics
- **Real cartridges.** 5.56×45 NATO, 9×19, 9×39 subsonic, .357 Magnum, 12 ga
  00 buck, 7.62×51 NATO and .308 Win, each with its real muzzle velocity and
  drag.
- **Trajectory.** Bullets drop under gravity from a sight zero (25/50/100 m).
- **Wounding.** Damage follows retained energy over distance.
- **Penetration.** Bullets punch through thin cover according to material and
  calibre. Rifle rounds pass through bodies, and grazing hits ricochet off hard
  surfaces.
- **Recoil.** Recoil comes from calibre and weapon mass. It's reduced by
  crouching and shouldering, made worse by fatigue, and drifts up and right.
  Each weapon recovers at its own rate.
- **Sway and breathing.** Hold your breath with **SHIFT** while aiming, for up
  to about 5 s, after which you gasp. On touch, a scoped rifle held still
  steadies itself.
- **Handling.**
  - The weapon takes a moment to come up after a sprint.
  - Tactical reloads keep the chambered round, giving 30+1.
  - Real ADS and reload times.

### Body
- **Movement.** Realistic walk, sprint and crouch speeds with inertia; heavier
  weapons slow you down.
- **Stamina.** Sprinting tires you, and exhaustion stops you sprinting until
  you recover.
- **Jumping and climbing.** Real jump height, about 0.55 m. **Vault or mantle**
  waist-high obstacles by pressing **JUMP** facing them (never through zombie
  entry windows).
- **Falls.** About 2.2 m is harmless and about 6 m is lethal.
- **Injuries.**
  - Wounds bleed until they clot.
  - Passive healing is slow and pauses while you bleed.
  - Low health makes you limp.
  - In Hardcore, bleeding can kill.

### Anatomy and enemies
- **Zombies only die when the brain is destroyed**: one headshot kills.
  - Body hits only wreck tissue.
  - Leg hits make them limp.
  - Armoured zombies can deflect weak rounds off the helmet.
  - Every zombie shambles at its own pace.
- **Soldiers.**
  - Headshots are lethal and rifle hits hurt.
  - Near misses suppress them, widening their aim and slowing their reactions.
  - Hardcore adds the rare fatal head hit.

### Acoustics
- **Propagation.** Sound travels at 343 m/s, so distant gunfire and blasts
  arrive late, and the air muffles high frequencies with distance. Gunfire
  carries well past the old 55 m cutoff.
- **Rooms.**
  - Each map has its own reverberation: theater hall, hospital corridors,
    bunker, city canyon, open desert, forest, docks.
  - Outdoor maps add slapback echoes off facades.
- **Ears.** Blasts and sustained unprotected gunfire indoors muffle your
  hearing and ring your ears, with brief blurred vision.
- **Near misses.** Supersonic cracks, and you flinch.
- **Breathing and heartbeat** follow your stamina and health.

### HUD
- **Immersive** (default):
  - No hit numbers and no reticle while aiming.
  - Ammo is shown by feel (FULL / HEAVY / HALF / LIGHT plus spare mags).
    Inspect with **F**, or hold RLD on touch, for an exact count.
  - Stamina and breath bars.
- **Minimal**: no reticle, no hit markers; ammo appears only when it changes or
  is checked.

## Presets

| Preset | Summary |
|---|---|
| Authentic (default) | Everything above, immersive HUD |
| Hardcore | Authentic + 1.45× lethality, slower healing, wounds can kill, minimal HUD |
| Off | Exactly the v11 game |

The Overhaul tab's quality preset still applies. **Performance** switches to
512 px scans, one reflection probe, no motion blur and 1024 shadows.

## Rebuilding

```bash
# needs python3, java 17+, unzip and apksig.jar (com.android.tools.build:apksig) in tools/
tools/build.sh Afterlight_v11.0.0.apk keystore.p12 <storepass> <alias>
```

`tools/pack_apk.py` copies every untouched APK entry byte for byte. It replaces
only the web bundle, the manifest version and `LICENSES.txt`, adds the realism
assets, drops the old signature and 4-byte-aligns stored entries. `Sign.java`
signs with v2 + v3 schemes and verifies the result.

The asset pipeline scripts (`dl.py`, `pack.py`, `hdrproc.py`, `gunfinish.py`)
show how the scans and skies were fetched and packed. They were run from a
scratch directory, so their paths are absolute.

## Credits

Surface scans and HDRI skies: [Poly Haven](https://polyhaven.com), CC0. The full
list is in `assets/realism/CREDITS.md` and is included in the APK's `LICENSES.txt`.

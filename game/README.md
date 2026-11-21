# Neon Tide

Open-world crime sandbox for Android phones. You play Kai, new in Port Solace, a coastal city
with a downtown, docks, beachfront hotels, suburbs, a stadium, a park and a pier. Steal cars,
run jobs for Rosa and Dex, race, jump ramps, and stay ahead of the cops.

**APK:** [`dist/NeonTide.apk`](dist/NeonTide.apk) (Android 8.0+, landscape, about 0.3 MB).
Open it on the phone and allow installs from that source when Android asks. New builds install
over old ones and keep your save.

## What's in it

- About 1.4 x 1 km of city on a road grid, plus a beach and a pier with a Ferris wheel
- 10 car types with arcade handling, damage, fire and explosions, handbrake drifts, ramps
- Traffic that follows lanes and traffic lights, pedestrians on the sidewalks who run, cower
  or fight back
- Wanted levels 1 to 5: patrol cars, cops on foot who arrest or shoot, a helicopter from 3
  stars, losing them by breaking line of sight, resprays
- Pistol, SMG, shotgun, rifle, fists; auto-aim for touch screens; shooting from cars
- 6 story missions, 2 street races, 6 stunt jumps, 20 hidden shells
- Gun shop, car dealer, respray shops, hotel room that saves and heals
- Day and night cycle, street lights, headlights, minimap with GPS, full map with waypoints
- Engine, tyre, gun and siren sounds and three radio stations, all generated in code

## Controls

Left side of the screen: floating stick to walk or steer. Right side: drag to move the camera.
Buttons: shoot, jump, sprint, get in/out of car; in a car: gas, brake/reverse, handbrake, horn,
radio. The weapon name in the top right switches weapons. Pause has settings for graphics
(low, medium, high), camera sensitivity and volume.

## How it's built

The game is JavaScript with three.js (WebGL 2), bundled into one file, and runs inside a small
fullscreen WebView activity (`android/app/src/main/java/app/neontide/game/MainActivity.java`).
All geometry, textures and audio are generated at startup, so the only files shipped are the
script, two fonts and the page.

```
web/src/world/   city layout, geometry, sky, water, props
web/src/ai/      traffic, pedestrians, police, shared driving code
web/src/         vehicles, people, player, weapons, missions, HUD, audio, main loop
android/         Android project (Gradle 9.7.1, AGP 9.4.0)
```

Build everything with `./build.sh` (needs Node 18+, JDK 17+ and the Android SDK with platform
36). It writes `dist/NeonTide.apk`. For quick testing in a desktop browser, run
`node build.mjs --dev` in `web/` and serve `web/dist/`; keyboard works there too (WASD, space,
shift, F, Ctrl, Q, M, Esc).

Fonts: Anton and Barlow Condensed, both under the SIL Open Font License.

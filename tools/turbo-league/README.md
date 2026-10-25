# Turbo League — ball trajectory

Draws where the ball is going: a yellow line along its predicted path for the next 3 seconds
(bounces off walls, floor and ceiling included) and a green ring where it next lands.

| | |
|---|---|
| Target | Turbo League, Android build (Unity, IL2CPP, arm64) |
| Tooling | Frida 17, frida-il2cpp-bridge 0.14.0, TypeScript, built with frida-compile 19.0.6 |
| Entry | `src/index.ts` → `_agent.js` |

## How it works

1. **Finds the ball** with Unity's own API: every `SphereCollider` that has a moving
   (non-kinematic) `Rigidbody`, preferring one whose GameObject name contains "ball", else the
   biggest. No game-specific class names, so it survives updates.
2. **Simulates ahead** in JS each frame from the ball's position, velocity, drag and
   `Physics.gravity`. Each step is a `Physics.SphereCastNonAlloc` against the arena; a hit
   reflects the velocity (`restitution` along the normal, `friction` along the surface). Cars
   and other moving bodies are ignored so the line shows the ball's path if nobody touches it.
3. **Draws** with two `LineRenderer`s it creates itself; positions are written straight into a
   pinned `Vector3[]`, so there are no allocations per frame.

It hooks `EventSystem.Update` (any game with on-screen controls has one) to run on Unity's
main thread, once per frame. It only reads the ball; nothing in the match is changed.

## Build

```sh
cd tools/turbo-league
npm install
npm run build        # or: npm run watch
```

## Run on the phone

Your phone needs `frida-server` (rooted) or the game patched with Frida Gadget (not rooted).

**Rooted:**
```sh
adb push frida-server-17.x-android-arm64 /data/local/tmp/frida-server
adb shell "su -c 'chmod 755 /data/local/tmp/frida-server && /data/local/tmp/frida-server &'"
adb shell pm list packages | grep -i turbo        # get the package name
frida -U -f <package> -l _agent.js
```

**Not rooted (Gadget):** pull the APKs (`adb shell pm path <package>`, then `adb pull` each),
inject `libfrida-gadget.so` into the base APK's `lib/arm64-v8a` with `objection patchapk -s base.apk`,
re-sign every split with the same key (`apksigner`), uninstall the store version, then
`adb install-multiple` the lot. Start the game and it pauses at launch; then:
```sh
frida -U Gadget -l _agent.js
```

The console prints `[traj] ball: "<name>" r=... layer=...` once it has locked on.

## Tuning

At the top of `src/index.ts`, in `CONFIG`:

- **Line arcs too high or too low** → the game adds its own force to the ball. Change
  `gravityScale` (try 1.5–2.0) until the line matches a lob.
- **Bounces land short or long** → `restitution` (height after a bounce) and `friction`
  (speed along the wall after it).
- `horizon`, `step`, `maxBounces` for how far ahead it looks; `lineWidth` and colors for looks.

Rebuild after a change; with `npm run watch` and `frida ... -l _agent.js` open, Frida reloads it.

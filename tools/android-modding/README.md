# Android game modding toolkit

Decode an APK, read it as Java, patch values and items, rebuild, sign, install.

```sh
tools/android-modding/setup.sh      # installs everything below, safe to re-run
```

| Tool | What it's for |
|------|---------------|
| `apkmod` | wrapper in this folder: decode / build+sign / force-return / find / engine detect |
| apktool 2.7 | APK → smali + resources and back |
| jadx 1.5.6 | APK → readable Java (to find what to patch) |
| zipalign, apksigner, keytool | align and re-sign the rebuilt APK |
| adb | install and log on a device (`adb logcat`) |
| frida, frida-tools, objection | live hooking on a rooted device or with frida-gadget |
| UnityPy | read and edit Unity asset bundles (item tables, ScriptableObjects, textures) |
| androguard, lief, capstone, keystone, radare2 | dex analysis, ELF (`.so`) patching, disassemble/assemble ARM |
| binwalk, xxd | find embedded files, hex view |

## The loop

```sh
apkmod engine game.apk                       # which engine -> which approach
apkmod decode game.apk game                  # game/smali*, game/_jadx/sources
apkmod find game 'getCoins|isPremium|gems'   # locate the logic
apkmod ret game com.studio.game.Player getCoins 999999
apkmod ret game com.studio.game.Store isUnlocked true
apkmod build game                            # -> game-modded.apk, signed
adb uninstall com.studio.game && adb install game-modded.apk
```

`apkmod ret` rewrites every overload of the method to return a constant
(boolean, int, short, byte, char, long, float, double, or void to stub it out).

## By engine

- **Java/Kotlin** — the loop above is the whole job. For anything beyond a
  constant return, edit the smali by hand; jadx shows what the smali means.
- **Unity Mono** (`Assembly-CSharp.dll` in `assets/bin/Data/Managed/`) — edit the
  DLL with dnSpy/ILSpy on a desktop, put it back into the decoded folder, `apkmod build`.
- **Unity IL2CPP** (`libil2cpp.so` + `global-metadata.dat`) — logic is native ARM.
  Dump class/method offsets with Il2CppDumper (desktop, .NET), then either patch
  bytes in `lib/arm64-v8a/libil2cpp.so` (keystone gives you the ARM bytes for
  `mov w0,#1; ret`) or hook at runtime with
  [frida-il2cpp-bridge](https://www.npmjs.com/package/frida-il2cpp-bridge).
- **Adding new items** — usually data, not code: item tables live in Unity
  assets (UnityPy), JSON/CSV under `assets/`, or SQLite files. Copy an existing
  entry, give it a new id, rebuild. If the server owns your inventory, a local
  item won't stick.
- **Fixing a broken game** (crash on new Android, dead login, region lock) —
  `adb logcat` for the stack trace, jadx to find the throwing method, then
  `apkmod ret` it to a safe value or bump `targetSdkVersion` in `apktool.yml`/
  `AndroidManifest.xml`.

## Things that will bite

- **Signature checks.** The rebuilt APK has your key, not the studio's. Games that
  check (`getPackageInfo(...).signatures`, Play Integrity) refuse to run or log in;
  `apkmod find game 'signatures|PackageInfo|integrity'`, then `ret` the check.
- **Split APKs / XAPK / APKS.** Install all the splits together:
  `adb install-multiple base.apk split_*.apk`. Re-sign every split with the same key.
- **Online games.** Anything the server validates (currency, purchases, ranked)
  gets reverted and usually gets the account banned. Mod offline modes or single player.
- **Not installed here:** Il2CppDumper, dnSpy and Ghidra need GitHub releases or a
  desktop; grab them on your own machine.

# Free Fire graphics performance mod

**Target:** Free Fire `com.dts.freefireth` 1.132.1 (Unity 2018.4.12f1, IL2CPP, arm64). The `--max` flag targets Free Fire MAX.
**Language:** bash (works with the bash 3.2 that ships on macOS, and on Linux).
**Needs:** a computer with `adb`, and USB or wireless debugging turned on on the phone. No root.

## What it does

The script uses Android's Game Mode interventions. The OS renders the game at a lower internal resolution and caps its frame rate, then stretches the image back to full screen. With fewer pixels to shade, the GPU has less work, so the frame rate holds steadier and the phone runs cooler. Touch input is remapped automatically.

The game declares `android:isGame="true"` and ships no `game_mode_config.xml`, so it doesn't opt out of these interventions.

The game's files are never touched. The APK carries Tencent ACE anticheat (`libanogs.so`, `libanort.so`), which checks the APK signature and file integrity. Even a "graphics only" repack fails that check. This approach changes OS settings, not the game, so there is nothing for the anticheat to find.

## Setup (macOS)

```sh
brew install android-platform-tools
chmod +x ff-perf.sh
adb devices          # accept the prompt on the phone
```

Wireless debugging (Android 11+): `adb pair <ip:port>`, then `adb connect <ip:port>`.

## Use

```sh
./ff-perf.sh balanced          # 0.80 render scale, 60 fps cap. Start here.
./ff-perf.sh low               # 0.65 / 60
./ff-perf.sh potato            # 0.50 / 60
./ff-perf.sh smooth            # 0.90 / 90 for high-refresh screens
./ff-perf.sh custom --scale 0.7 --fps 45
./ff-perf.sh balanced --anim --trim   # also turn off system animations and kill background apps
./ff-perf.sh status
./ff-perf.sh reset
```

The script force-stops the game and relaunches it, because these settings only take effect when the game starts.

| Android | What you get |
|---|---|
| 13 and newer | Render scale and fps cap for this game only |
| 12 | Render scale for this game only (no fps cap) |
| 11 and older | Only `--global`, which shrinks the whole display for every app until `reset` |

The settings survive a reboot on most phones. Some OEM skins (MIUI/HyperOS, older One UI) clear them, so run the script again if the game goes back to full resolution.

## Tips for the most FPS

- In game, set Graphics to **Smooth** and turn **High FPS** on. The OS cap only lowers the frame rate, it can't raise it above what the game allows.
- Choose an fps cap the phone can hold steadily. A locked 60 feels better than a frame rate that jumps between 50 and 90.

# Free Fire graphics performance mod

**Target:** Free Fire `com.dts.freefireth` 1.132.1 (Unity 2018.4.12f1, IL2CPP, arm64). The `--max` flag targets Free Fire MAX.
**Runs on:** the phone itself, in Termux. A computer is not needed.
**Needs:** Android 11 or newer and Wi-Fi (for wireless debugging). No root.

## What it does

The script uses Android's Game Mode interventions. The OS renders the game at a lower internal resolution and caps its frame rate, then stretches the image back to full screen. With fewer pixels to shade, the GPU has less work, so the frame rate holds steadier and the phone runs cooler. Touch input is remapped automatically.

The game declares `android:isGame="true"` and ships no `game_mode_config.xml`, so it doesn't opt out of these interventions.

The game's files are never touched. The APK carries Tencent ACE anticheat (`libanogs.so`, `libanort.so`), which checks the APK signature and file integrity. Even a "graphics only" repack fails that check. This approach changes OS settings, not the game, so there is nothing for the anticheat to find.

Normal apps aren't allowed to change these settings. Termux gets permission by connecting to the phone's own wireless debugging, which gives it the same rights a computer running adb would have.

## One-time setup

1. **Install Termux from F-Droid or from its GitHub releases.** Don't use the Play Store version: it's outdated and `pkg` is broken there.
2. **Install the tools and download the script.** In Termux:
   ```sh
   pkg update && pkg install android-tools curl
   curl -LO https://raw.githubusercontent.com/lalalalalabababa2-web/Why-am-i-getting-banned/ccr-34e86624-3w3svu/freefire-perf/ff-perf.sh
   chmod +x ff-perf.sh
   ```
3. **Turn on Developer options.** Go to Settings > About phone and tap **Build number** 7 times. On Xiaomi phones, tap **MIUI/OS version** instead.
4. **Turn on Wireless debugging.** Go to Settings > Developer options and switch on **Wireless debugging**. The phone must be on Wi-Fi. The network doesn't need internet, so another phone's hotspot works.
5. **Pair Termux with the phone.** Open Settings and Termux side by side in **split screen**. The pairing popup closes if you switch apps, which is why you need split screen. In Settings, tap Wireless debugging > **Pair device with pairing code**. Then in Termux, using the port from the popup:
   ```sh
   adb pair localhost:<pairing port>     # type the 6-digit code when asked
   ```
6. **Connect.** Go back to the main Wireless debugging screen. It shows a second port under **IP address & port**. In Termux:
   ```sh
   adb connect localhost:<that port>
   adb devices                           # should list localhost:<port>  device
   ```

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

The script force-stops the game and opens it again, because these settings only take effect when the game starts.

**Later sessions:** you only pair once. After a reboot or Wi-Fi change, the connect port changes, so turn Wireless debugging back on and run `adb connect localhost:<new port>` before using the script. The game settings themselves usually survive a reboot, so you only need to do this if the game goes back to full resolution. Some skins (MIUI/HyperOS, older One UI) reset them.

### Already using Shizuku?

Skip the adb steps. Export `rish` from the Shizuku app, put `ff-perf.sh` in Download, and run:

```sh
rish -c 'sh /sdcard/Download/ff-perf.sh balanced'
```

The script sees it's already running with shell rights and makes the changes directly, without adb.

## What each Android version gets

| Android | What you get |
|---|---|
| 13 and newer | Render scale and fps cap for this game only |
| 12 | Render scale for this game only (no fps cap) |
| 11 | Only `--global`, which shrinks the whole display for every app until `reset` |
| 10 and older | No wireless debugging, so this needs root or one-time setup from a computer |

## Tips for the most FPS

- In game, set Graphics to **Smooth** and turn **High FPS** on. The OS cap only lowers the frame rate, it can't raise it above what the game allows.
- Choose an fps cap the phone can hold steadily. A locked 60 feels better than a frame rate that jumps between 50 and 90.

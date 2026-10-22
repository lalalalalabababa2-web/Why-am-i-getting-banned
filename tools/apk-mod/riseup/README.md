# Rise Up mods

For `com.riseup.game` 300000.15.0 (the `.apks.zip` split set: base + 4 splits).

```
tools/apk-mod/setup.sh                       # once: tools + signing key
pip3 install capstone keystone-engine
tools/apk-mod/riseup/build.sh Rise_Up_com.riseup.game_v300000.15.0.apks.zip
```

Writes `tools/apk-mod/riseup/RiseUp-mod.apks`. Install it on the phone with SAI
(Split APKs Installer). Uninstall the Play Store copy first: Android won't install
a build signed with a different key over it, and the save is lost with it.

| Group | What it does |
|---|---|
| `god` | Collisions never pop the balloon |
| `skins` | Every skin unlocked by attempts, score, balloons, coins or ads is granted (Premium ones stay locked) |
| `coins` | Buying costs nothing, coins earned ×64 |
| `slow` | Balloon rises at 1.0× instead of 1.5× (a third slower) |
| `score` | Score per height ×10 |

Pick a subset with `--only god,skins`. `patch.py` checks every original instruction
before it writes, so another game version stops with an error instead of breaking.

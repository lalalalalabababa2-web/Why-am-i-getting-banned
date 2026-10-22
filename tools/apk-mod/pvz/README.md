# Plants vs. Zombies FREE mod menu

For `com.ea.game.pvzfree_row` 3.18.0 (the `.apks.zip` split set: base + arm64 split).

```
tools/apk-mod/setup.sh                                   # once: tools + signing key
sudo apt install dalvik-exchange libandroid-23-java      # dx and android.jar
pip3 install capstone keystone-engine
tools/apk-mod/pvz/build.sh Plants_vs._Zombies_FREE_com.ea.game.pvzfree_row_v3.18.0.apks.zip
```

Writes `tools/apk-mod/pvz/PvZ-mod.apks`; install it with SAI after uninstalling the
Play Store copy.

In the game a small "🌻 Mods" panel floats over the screen. Drag it by its title,
tap the title to show or hide the switches. Every mod starts off, can be switched
mid-level, and is remembered for the next launch.

| Switch | Patched |
|---|---|
| Unlimited sun | `Board::TakeSunMoney`, `Board::CanTakeSunMoney` always succeed |
| No cooldown | `Plant::GetRefreshTime` returns 1 |
| Plant anywhere | `Board::CanPlantAt` always says yes |
| Zombies can't win | `Board::ZombiesWon` does nothing |
| One-hit kills | `Zombie::TakeDamage` treats every hit as 32767 |
| Sun x4 | `Board::AddSunMoney` adds 4× |
| Coins x10 | `Coin::GetCoinValue` silver 10, gold 50, diamond 1000 |

If the switches fail on your phone, `build-static.sh` builds the same mods written
into `libpvz.so` itself, always on.

How: `mods.py` checks each patch site in `libpvz.so` and generates the table in
`Patches.java`; the shared menu (`tools/apk-mod/menu`) writes those bytes (or the originals)
into the loaded library through `/proc/self/mem`. The library file is not changed,
and `PvZActivity.onCreate` gets one added line that starts the menu.

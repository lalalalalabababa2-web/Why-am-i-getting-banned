# Missiles! mod menu

For `pl.macaque.Missiles` 1.41 (the `.apks.zip` split set: base + arm64 split).

```
tools/apk-mod/setup.sh                                   # once: tools + signing key
sudo apt install dalvik-exchange libandroid-23-java      # dx and android.jar
pip3 install capstone keystone-engine
tools/apk-mod/missiles/build.sh Missiles_pl.macaque.Missiles_v1.41.apks.zip
```

Writes `tools/apk-mod/missiles/Missiles-mod.apks`; install it with SAI after
uninstalling the Play Store copy.

The game's leaderboards are real Google Play Games boards, so this build never
uploads a score (`PlayerProfile.SubmitScores` and `UpdateLeaderboardScore` are
written out of `libil2cpp.so`). The rest are switches in the ✈️ menu, all off
to start:

| Switch | Patched |
|---|---|
| God mode | `Player.OnTriggerEnter2D`: a hit always takes the shield path |
| Always shielded | `Player.Reset` turns the shield on each round; hits don't remove it (from the next round) |
| Unlimited coins | `PlayerProfile.get_Points` returns 999999 |
| Coins x16 | `PlayerProfile.AddCoins` |
| Free planes | `PlayerProfile.BuyPlane` no longer subtracts the price |
| Score x8 | `GameState.get_Score`: stars and time x8 |
| Stars x10 | `GameState.StarCollected` |
| Slow missiles | `MissileEngine` / `MissileTargetingEngine.SetAngle`: speed factor 0.5 |
| Fast plane | `Player.UpdateInput`: speed doubled |
| More power-ups | `PowerUpManager`: next power-up 1 s after the last one goes |

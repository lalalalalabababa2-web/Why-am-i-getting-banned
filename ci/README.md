# Build notes

`gradle.sh` runs Gradle and, when it fails, repeats the lines that explain the failure as
workflow annotations (the same script as the Umbra browser's).

## The signing key

`offline-ai.jks` signs every build. It is in the repository on purpose: Android only installs a
new build over the old one when both carry the same signature, and an update that keeps the
installed app is what keeps your downloaded models (several gigabytes) and your chats. A key
made fresh by each CI run would force an uninstall every time.

Because the key is public, the signature only says "built from this repository's setup", not
"built by you". Anyone could sign an APK with it, so install builds only from this repository's
own releases. To use a private key instead, add it as repository secrets and point the build at
it with `OFFLINE_AI_KEYSTORE`, `OFFLINE_AI_KEYSTORE_PASSWORD`, `OFFLINE_AI_KEY_ALIAS` and
`OFFLINE_AI_KEY_PASSWORD` (`app/build.gradle.kts` reads them). Switching keys means uninstalling
once.

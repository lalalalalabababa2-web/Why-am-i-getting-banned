// Same toolchain as the Offline AI app at the repository root: Gradle 9.7.1 + AGP 9.4.0.
// The app is a thin Java shell around a WebGL game, so no Kotlin plugin is needed.
plugins {
    id("com.android.application") version "9.4.0" apply false
}

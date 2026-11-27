// The same toolchain as Offline AI in this repository: Gradle 9.7.1 (the repository's wrapper),
// Android Gradle Plugin 9.4.0, Kotlin 2.4.20 compiled by AGP itself.
// Build from the repository root:  ./gradlew -p humkiller/android :app:assembleRelease
plugins {
    id("com.android.application") version "9.4.0" apply false
    id("org.jetbrains.kotlin.android") version "2.4.20" apply false
}

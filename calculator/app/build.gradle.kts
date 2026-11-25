plugins {
    id("com.android.application")
}

// Each CI build gets a higher version code, so a new APK installs over the old one.
val buildNumber: Int = System.getenv("GITHUB_RUN_NUMBER")?.toIntOrNull() ?: 1

android {
    namespace = "app.calcplus"
    compileSdk = 36

    defaultConfig {
        applicationId = "app.calcplus"
        minSdk = 30
        targetSdk = 36
        versionCode = buildNumber
        versionName = "1.0.$buildNumber"
    }

    // The same fixed key as Offline AI (ci/README.md explains why it lives in the repository),
    // so every build installs as an update to the last.
    signingConfigs {
        create("release") {
            storeFile = rootProject.file("../ci/offline-ai.jks")
            storePassword = "offline-ai"
            keyAlias = "offline-ai"
            keyPassword = "offline-ai"
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("release")
        }
        debug {
            signingConfig = signingConfigs.getByName("release")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

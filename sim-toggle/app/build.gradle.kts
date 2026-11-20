plugins {
    id("com.android.application")
}

// Each CI build gets a higher version code, so a new APK installs over the old one.
val buildNumber: Int = System.getenv("GITHUB_RUN_NUMBER")?.toIntOrNull() ?: 1

android {
    namespace = "app.simtoggle"

    // hiddenapibypass 6.2 needs 37; the same platform Offline AI compiles against.
    compileSdk {
        version = release(37) { minorApiLevel = 2 }
    }

    defaultConfig {
        applicationId = "app.simtoggle"
        // setUiccApplicationsEnabled and SubscriptionInfo.areUiccApplicationsEnabled are Android 11+.
        minSdk = 30
        targetSdk = 36
        versionCode = buildNumber
        versionName = "1.0.$buildNumber"
    }

    // One fixed key in the repository, so every build installs over the last (see README).
    signingConfigs {
        create("release") {
            storeFile = file(System.getenv("SIM_TOGGLE_KEYSTORE") ?: "../ci/sim-toggle.jks")
            storePassword = System.getenv("SIM_TOGGLE_KEYSTORE_PASSWORD") ?: "sim-toggle"
            keyAlias = System.getenv("SIM_TOGGLE_KEY_ALIAS") ?: "sim-toggle"
            keyPassword = System.getenv("SIM_TOGGLE_KEY_PASSWORD") ?: "sim-toggle"
        }
    }

    buildTypes {
        release {
            // Reflection on hidden telephony classes; nothing to gain from shrinking a tiny app.
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

    lint {
        abortOnError = false
        checkReleaseBuilds = false
    }
}

dependencies {
    // Shizuku runs our binder calls as the shell user (or root), which holds MODIFY_PHONE_STATE.
    implementation("dev.rikka.shizuku:api:13.1.5")
    implementation("dev.rikka.shizuku:provider:13.1.5")
    // Lets us reflect on com.android.internal.telephony.ISub / ITelephony on Android 9+.
    implementation("org.lsposed.hiddenapibypass:hiddenapibypass:6.2")
}

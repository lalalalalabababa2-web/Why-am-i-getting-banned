plugins {
    id("com.android.application")
}

android {
    namespace = "app.neontide.game"
    compileSdk = 36

    defaultConfig {
        applicationId = "app.neontide.game"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"
    }

    // A fixed key kept in the repo, so every rebuild installs over the previous one
    // and keeps your save game.
    signingConfigs {
        create("release") {
            storeFile = rootProject.file("neontide.jks")
            storePassword = "neontide"
            keyAlias = "neontide"
            keyPassword = "neontide"
        }
    }

    buildTypes {
        release {
            // R8 strips the Kotlin stdlib AGP adds by default; the shell itself is one class.
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
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

    // Lint needs extra downloads and has nothing useful to say about a WebView shell.
    lint {
        checkReleaseBuilds = false
        abortOnError = false
    }

    androidResources {
        // keep the game's assets uncompressed-friendly; .js/.html compress fine
        noCompress += listOf("ogg", "mp3")
    }
}

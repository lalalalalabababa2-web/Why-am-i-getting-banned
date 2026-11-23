plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// A tiny app that integrates umt-sdk, so the toolkit's integration features can be tried end to end.
android {
    namespace = "com.umt.sample"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.umt.sample"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
    }

    signingConfigs {
        create("sideload") {
            storeFile = rootProject.file(System.getenv("UMT_KEYSTORE") ?: "keystore/umt-sideload.jks")
            storePassword = System.getenv("UMT_KEYSTORE_PASSWORD") ?: "umt-sideload"
            keyAlias = System.getenv("UMT_KEY_ALIAS") ?: "umt"
            keyPassword = System.getenv("UMT_KEY_PASSWORD") ?: "umt-sideload"
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("sideload")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation(project(":umt-sdk"))
}

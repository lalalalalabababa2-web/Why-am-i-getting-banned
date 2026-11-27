plugins {
    id("com.android.application")
}

// Each CI build gets a higher version code, so a new APK installs over the old one.
val buildNumber: Int = System.getenv("GITHUB_RUN_NUMBER")?.toIntOrNull() ?: 1

android {
    namespace = "app.humkiller"

    compileSdk {
        version = release(37) { minorApiLevel = 2 }
    }
    ndkVersion = "29.0.13113456"

    defaultConfig {
        applicationId = "app.humkiller"
        minSdk = 30
        targetSdk = 36
        versionCode = buildNumber
        versionName = "1.0.$buildNumber"

        ndk {
            abiFilters += listOf("arm64-v8a")
        }
        externalNativeBuild {
            cmake {
                arguments += listOf("-DCMAKE_BUILD_TYPE=Release", "-DANDROID_STL=c++_static")
            }
        }
    }

    externalNativeBuild {
        cmake {
            path = file("src/main/cpp/CMakeLists.txt")
            version = "3.31.6"
        }
    }

    // The repository's fixed signing key (see ci/README.md), so every build installs as an update.
    signingConfigs {
        create("release") {
            storeFile = rootProject.file(System.getenv("OFFLINE_AI_KEYSTORE") ?: "../../ci/offline-ai.jks")
            storePassword = System.getenv("OFFLINE_AI_KEYSTORE_PASSWORD") ?: "offline-ai"
            keyAlias = System.getenv("OFFLINE_AI_KEY_ALIAS") ?: "offline-ai"
            keyPassword = System.getenv("OFFLINE_AI_KEY_PASSWORD") ?: "offline-ai"
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

    lint {
        abortOnError = false
        checkReleaseBuilds = false
    }
}

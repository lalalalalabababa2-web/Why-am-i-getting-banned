plugins {
    id("com.android.application")
}

val llamaCppVersion: String = providers.gradleProperty("llamaCppVersion").get()

// Each CI build gets a higher version code, so a new APK installs over the old one and keeps
// your downloaded models and chats.
val buildNumber: Int = System.getenv("GITHUB_RUN_NUMBER")?.toIntOrNull() ?: 1

// -PtestAbi=x86_64 builds for the emulator that runs the on-device tests. The APK people install
// is always arm64-v8a.
val testAbi: String? = providers.gradleProperty("testAbi").orNull

android {
    namespace = "app.offlineai.chat"

    compileSdk {
        version = release(37) { minorApiLevel = 2 }
    }
    ndkVersion = "29.0.13113456"

    defaultConfig {
        applicationId = "app.offlineai.chat"
        minSdk = 30
        targetSdk = 36
        versionCode = buildNumber
        versionName = "0.1.$buildNumber"
        buildConfigField("String", "LLAMA_CPP_VERSION", "\"$llamaCppVersion\"")

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        ndk {
            // Phones only. Every phone that can run these models is 64-bit ARM.
            abiFilters += listOf(testAbi ?: "arm64-v8a")
        }
        externalNativeBuild {
            cmake {
                arguments += listOf(
                    "-DCMAKE_BUILD_TYPE=Release",
                    "-DANDROID_STL=c++_shared",
                    "-DBUILD_SHARED_LIBS=ON",
                )
                if (System.getenv("USE_CCACHE") == "1") {
                    arguments += listOf("-DCMAKE_C_COMPILER_LAUNCHER=ccache", "-DCMAKE_CXX_COMPILER_LAUNCHER=ccache")
                }
            }
        }
    }

    externalNativeBuild {
        cmake {
            path = file("src/main/cpp/CMakeLists.txt")
            version = "3.31.6"
        }
    }

    buildFeatures {
        buildConfig = true
    }

    // One fixed key, so every build installs as an update to the last. It is in the repository
    // (ci/README.md says why that is acceptable here and how to use a private key instead).
    signingConfigs {
        create("release") {
            storeFile = rootProject.file(System.getenv("OFFLINE_AI_KEYSTORE") ?: "ci/offline-ai.jks")
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

    packaging {
        jniLibs {
            // Unpacked at install, so ggml can find its CPU variants in the library folder.
            useLegacyPackaging = true
        }
    }

    lint {
        abortOnError = false
        checkReleaseBuilds = false
    }
}

dependencies {
    implementation("androidx.appcompat:appcompat:1.8.0")
    implementation("androidx.core:core-ktx:1.19.0")
    implementation("androidx.recyclerview:recyclerview:1.4.0")

    // On-device tests (app/src/androidTest): the real app and engine on an emulator.
    androidTestImplementation("androidx.test:core:1.7.0")
    androidTestImplementation("androidx.test:runner:1.7.0")
    androidTestImplementation("androidx.test.ext:junit:1.3.0")
    androidTestImplementation("junit:junit:4.13.2")
}

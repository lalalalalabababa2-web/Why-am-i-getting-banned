package com.umt.toolkit.apps

import kotlinx.serialization.Serializable

@Serializable
enum class Framework(val label: String, val engine: Boolean) {
    UNITY_IL2CPP("Unity (IL2CPP)", true),
    UNITY_MONO("Unity (Mono)", true),
    UNREAL("Unreal Engine", true),
    GODOT("Godot", true),
    COCOS("Cocos2d-x / Cocos Creator", true),
    DEFOLD("Defold", true),
    GAMEMAKER("GameMaker", true),
    LIBGDX("libGDX", true),
    FLUTTER("Flutter", true),
    REACT_NATIVE("React Native", true),
    XAMARIN("Xamarin / .NET MAUI", true),
    CORDOVA("Cordova / Capacitor", true),
    COMPOSE("Jetpack Compose", false),
    KOTLIN("Kotlin", false),
    JAVA("Java/Kotlin bytecode (DEX)", false),
    NATIVE("Native C/C++ (NDK)", false),
}

@Serializable
data class NativeLib(val abi: String, val name: String, val size: Long)

@Serializable
data class FrameworkReport(
    val frameworks: List<Framework>,
    val evidence: Map<Framework, String>,
    val abis: List<String>,
    val nativeLibs: List<NativeLib>,
    val dexCount: Int,
    val dexBytes: Long,
    val assetCount: Int,
    val entryCount: Int,
    val uncompressedBytes: Long,
) {
    val primary: Framework? get() = frameworks.firstOrNull { it.engine } ?: frameworks.firstOrNull()
}

data class ZipEntryInfo(val name: String, val size: Long)

/** Identifies runtimes from the file names inside an APK (and its splits). Read-only. */
object FrameworkDetector {
    private val ABI_DIR = Regex("^lib/([^/]+)/([^/]+\\.so)$")
    private val DEX = Regex("^classes\\d*\\.dex$")

    fun detect(entries: Sequence<ZipEntryInfo>): FrameworkReport {
        val found = LinkedHashMap<Framework, String>()
        fun mark(f: Framework, why: String) { if (f !in found) found[f] = why }

        val libs = ArrayList<NativeLib>()
        val abis = LinkedHashSet<String>()
        var dexCount = 0
        var dexBytes = 0L
        var assets = 0
        var count = 0
        var total = 0L
        var unityData: String? = null
        var unityManaged: String? = null

        for (e in entries) {
            count++
            if (e.size > 0) total += e.size
            val name = e.name
            val m = ABI_DIR.matchEntire(name)
            if (m != null) {
                val abi = m.groupValues[1]
                val lib = m.groupValues[2]
                abis += abi
                libs += NativeLib(abi, lib, e.size)
                when {
                    lib == "libil2cpp.so" -> mark(Framework.UNITY_IL2CPP, name)
                    lib.startsWith("libmonobdwgc") || lib == "libmono.so" -> if (unityManaged == null) unityManaged = name
                    lib == "libUE4.so" || lib == "libUnreal.so" -> mark(Framework.UNREAL, name)
                    lib.startsWith("libgodot_android") -> mark(Framework.GODOT, name)
                    lib.startsWith("libcocos") -> mark(Framework.COCOS, name)
                    lib == "libdmengine.so" -> mark(Framework.DEFOLD, name)
                    lib == "libyoyo.so" -> mark(Framework.GAMEMAKER, name)
                    lib == "libgdx.so" -> mark(Framework.LIBGDX, name)
                    lib == "libflutter.so" -> mark(Framework.FLUTTER, name)
                    lib == "libreactnativejni.so" || lib == "libhermes.so" -> mark(Framework.REACT_NATIVE, name)
                    lib == "libmonodroid.so" || lib.startsWith("libmonosgen") || lib.startsWith("libassemblies") -> mark(Framework.XAMARIN, name)
                    lib == "libunity.so" -> if (unityData == null) unityData = name
                }
                continue
            }
            when {
                DEX.matches(name) -> { dexCount++; if (e.size > 0) dexBytes += e.size }
                name.startsWith("assets/") -> {
                    assets++
                    when {
                        name.startsWith("assets/bin/Data/Managed/") && name.endsWith(".dll") -> if (unityManaged == null) unityManaged = name
                        name.startsWith("assets/bin/Data/") -> if (unityData == null) unityData = name
                        name.startsWith("assets/flutter_assets/") -> mark(Framework.FLUTTER, name)
                        name == "assets/index.android.bundle" -> mark(Framework.REACT_NATIVE, name)
                        name == "assets/www/cordova.js" || name == "assets/public/cordova.js" || name == "assets/capacitor.config.json" -> mark(Framework.CORDOVA, name)
                        name.endsWith(".pck") && name.indexOf('/', 7) < 0 -> mark(Framework.GODOT, name)
                    }
                }
                name.startsWith("assemblies/") -> mark(Framework.XAMARIN, name)
                name.startsWith("META-INF/androidx.compose.") && name.endsWith(".version") -> mark(Framework.COMPOSE, name)
                name.startsWith("kotlin/") && name.endsWith(".kotlin_builtins") -> mark(Framework.KOTLIN, name)
                name.startsWith("META-INF/") && name.endsWith(".kotlin_module") -> mark(Framework.KOTLIN, name)
            }
        }

        if (Framework.UNITY_IL2CPP !in found) {
            when {
                unityManaged != null -> mark(Framework.UNITY_MONO, unityManaged!!)
                unityData != null -> mark(Framework.UNITY_MONO, "$unityData (no libil2cpp.so)")
            }
        }
        if (dexCount > 0) mark(Framework.JAVA, "$dexCount classes*.dex")
        if (libs.isNotEmpty() && found.keys.none { it.engine }) {
            mark(Framework.NATIVE, "${libs.map { it.name }.distinct().size} native libraries")
        }

        val ordered = found.keys.sortedBy { it.ordinal }
        return FrameworkReport(
            frameworks = ordered,
            evidence = found,
            abis = abis.sortedBy { ABI_ORDER.indexOf(it).let { i -> if (i < 0) 99 else i } },
            nativeLibs = libs.sortedWith(compareBy({ it.abi }, { it.name })),
            dexCount = dexCount,
            dexBytes = dexBytes,
            assetCount = assets,
            entryCount = count,
            uncompressedBytes = total,
        )
    }

    private val ABI_ORDER = listOf("arm64-v8a", "armeabi-v7a", "x86_64", "x86", "armeabi", "mips", "mips64")

    /** "split_config.arm64_v8a.apk" -> "arm64-v8a" */
    fun abiFromSplitName(file: String): String? {
        val n = file.substringAfterLast('/').removeSuffix(".apk")
        val token = n.substringAfterLast("config.", "").ifEmpty { return null }
        return when (token) {
            "arm64_v8a" -> "arm64-v8a"
            "armeabi_v7a" -> "armeabi-v7a"
            "x86_64" -> "x86_64"
            "x86" -> "x86"
            else -> null
        }
    }
}

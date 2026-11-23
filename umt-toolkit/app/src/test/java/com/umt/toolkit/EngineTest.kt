package com.umt.toolkit

import com.umt.sdk.Ack
import com.umt.sdk.Entity
import com.umt.sdk.Pose
import com.umt.sdk.Schema
import com.umt.sdk.ValueSpec
import com.umt.sdk.ValueType
import com.umt.toolkit.apps.Framework
import com.umt.toolkit.apps.FrameworkDetector
import com.umt.toolkit.apps.ZipEntryInfo
import com.umt.toolkit.compat.Availability
import com.umt.toolkit.compat.CompatibilityEngine
import com.umt.toolkit.compat.DeviceCaps
import com.umt.toolkit.compat.ModuleId
import com.umt.toolkit.compat.TargetInfo
import com.umt.toolkit.esp.EspMath
import com.umt.toolkit.esp.SandboxFeed
import com.umt.toolkit.integration.ConfigPatch
import com.umt.toolkit.integration.PatchPlanner
import com.umt.toolkit.model.EspSettings
import com.umt.toolkit.perf.PerfMath
import com.umt.toolkit.ui.components.JsonHighlighter
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.abs

class FrameworkDetectorTest {
    private fun detect(vararg names: String) = FrameworkDetector.detect(names.map { ZipEntryInfo(it, 1000) }.asSequence())

    @Test fun unityIl2cpp() {
        val r = detect("classes.dex", "lib/arm64-v8a/libil2cpp.so", "lib/arm64-v8a/libunity.so", "lib/armeabi-v7a/libunity.so", "assets/bin/Data/data.unity3d")
        assertEquals(Framework.UNITY_IL2CPP, r.primary)
        assertFalse(Framework.UNITY_MONO in r.frameworks)
        assertEquals(listOf("arm64-v8a", "armeabi-v7a"), r.abis)
        assertEquals(1, r.dexCount)
    }

    @Test fun unityMono() {
        val r = detect("lib/arm64-v8a/libunity.so", "lib/arm64-v8a/libmonobdwgc-2.0.so", "assets/bin/Data/Managed/Assembly-CSharp.dll")
        assertEquals(Framework.UNITY_MONO, r.primary)
    }

    @Test fun unrealFlutterReactNativeGodot() {
        assertEquals(Framework.UNREAL, detect("lib/arm64-v8a/libUnreal.so").primary)
        assertEquals(Framework.FLUTTER, detect("lib/arm64-v8a/libflutter.so", "assets/flutter_assets/AssetManifest.json").primary)
        assertEquals(Framework.REACT_NATIVE, detect("assets/index.android.bundle", "lib/arm64-v8a/libhermes.so").primary)
        assertEquals(Framework.GODOT, detect("assets/game.pck").primary)
        assertFalse(Framework.GODOT in detect("assets/sub/dir/x.pck").frameworks)
    }

    @Test fun plainKotlinComposeApp() {
        val r = detect("classes.dex", "classes2.dex", "kotlin/kotlin.kotlin_builtins", "META-INF/androidx.compose.runtime_runtime.version")
        assertTrue(Framework.KOTLIN in r.frameworks)
        assertTrue(Framework.COMPOSE in r.frameworks)
        assertEquals(2, r.dexCount)
        assertTrue(r.abis.isEmpty())
    }

    @Test fun nativeOnlyWhenNoEngine() {
        val r = detect("classes.dex", "lib/arm64-v8a/libfoo.so")
        assertTrue(Framework.NATIVE in r.frameworks)
        assertFalse(Framework.NATIVE in detect("lib/arm64-v8a/libflutter.so").frameworks)
    }

    @Test fun splitNames() {
        assertEquals("arm64-v8a", FrameworkDetector.abiFromSplitName("/data/app/x/split_config.arm64_v8a.apk"))
        assertEquals("armeabi-v7a", FrameworkDetector.abiFromSplitName("split_config.armeabi_v7a.apk"))
        assertNull(FrameworkDetector.abiFromSplitName("split_config.xxhdpi.apk"))
        assertNull(FrameworkDetector.abiFromSplitName("base.apk"))
    }
}

class CompatibilityEngineTest {
    private val device = DeviceCaps(34, canDrawOverlays = true, canPostNotifications = true, maxPassthroughOpacity = 0.8f)
    private fun report(caps: DeviceCaps, t: TargetInfo?) = CompatibilityEngine.evaluate(caps, t).associateBy { it.module }

    @Test fun integratedAppGetsIntegrationModules() {
        val r = report(device, TargetInfo("com.example.game", "Game", integrated = true, frameworks = listOf(Framework.UNITY_IL2CPP), isSystem = false, debuggable = true))
        assertEquals(Availability.AVAILABLE, r.getValue(ModuleId.ESP_STREAM).availability)
        assertEquals(Availability.AVAILABLE, r.getValue(ModuleId.CONFIG_BRIDGE).availability)
        assertEquals(Availability.UNSUPPORTED, r.getValue(ModuleId.PRIVATE_MEMORY).availability)
    }

    @Test fun thirdPartyAppNeedsIntegrationWithHint() {
        val r = report(device, TargetInfo("com.other", "Other", integrated = false, frameworks = listOf(Framework.UNITY_MONO), isSystem = false, debuggable = false))
        val esp = r.getValue(ModuleId.ESP_STREAM)
        assertEquals(Availability.NEEDS_INTEGRATION, esp.availability)
        assertTrue(esp.reasons.any { it.contains("Unity") })
        assertEquals(Availability.AVAILABLE, r.getValue(ModuleId.TELEMETRY_HUD).availability)
    }

    @Test fun missingPermissionsAreReported() {
        val r = report(device.copy(canDrawOverlays = false, canPostNotifications = false), null)
        assertEquals(Availability.NEEDS_PERMISSION, r.getValue(ModuleId.RETICLE_GUIDE).availability)
        assertEquals(Availability.NEEDS_PERMISSION, r.getValue(ModuleId.KILL_SWITCH).availability)
        assertEquals(Availability.INFO_ONLY, r.getValue(ModuleId.ESP_STREAM).availability)
    }

    @Test fun releaseBuildOfIntegratedAppIsFlagged() {
        val r = report(device, TargetInfo("com.example.game", "Game", true, emptyList(), false, debuggable = false))
        assertTrue(r.getValue(ModuleId.CONFIG_BRIDGE).reasons.any { it.contains("Release build") })
    }
}

class PerfMathTest {
    @Test fun percentiles() {
        val v = floatArrayOf(5f, 1f, 4f, 2f, 3f)
        assertEquals(1f, PerfMath.percentile(v, p = 0f))
        assertEquals(3f, PerfMath.percentile(v, p = 50f))
        assertEquals(5f, PerfMath.percentile(v, p = 100f))
        assertEquals(0f, PerfMath.percentile(FloatArray(0), p = 50f))
    }

    @Test fun frameStatsCountsJankAndStutter() {
        val period = 1000f / 60f
        val frames = FloatArray(60) { period }.also { it[10] = 30f; it[20] = 50f }
        val s = PerfMath.frameStats(frames, frames.size, period)
        assertEquals(1, s.jank)
        assertEquals(1, s.stutter)
        assertEquals(50f, s.max)
        assertTrue(abs(s.fps - 60 * 1000f / (58 * period + 80f)) < 0.01f)
    }

    @Test fun cpuPercent() {
        assertEquals(25f, PerfMath.cpuPercent(250, 1000, 1))
        assertEquals(12.5f, PerfMath.cpuPercent(1000, 1000, 8))
        assertEquals(0f, PerfMath.cpuPercent(10, 0, 4))
        assertEquals(100f, PerfMath.cpuPercent(5000, 1000, 1))
    }

    @Test fun procStat() {
        val a = PerfMath.parseProcStat("cpu  100 0 100 800 0 0 0 0 0 0")!!
        val b = PerfMath.parseProcStat("cpu  150 0 150 900 0 0 0 0 0 0")!!
        assertEquals(1000L to 800L, a)
        assertEquals(50f, PerfMath.globalCpu(a, b))
        assertNull(PerfMath.parseProcStat("cpu0 1 2 3 4"))
    }
}

class EspMathTest {
    private fun e(id: Int, kind: String, d: Float?) = Entity(id, kind, 0f, 0f, 1f, 1f, distance = d)

    @Test fun selectFiltersSortsAndCaps() {
        val s = EspSettings(hiddenKinds = setOf("item"), maxDistance = 50f, maxEntities = 2)
        val out = EspMath.select(listOf(e(1, "npc", 40f), e(2, "item", 5f), e(3, "npc", 10f), e(4, "npc", 60f), e(5, "npc", 20f)), s)
        assertEquals(listOf(3, 5), out.map { it.id })
    }

    @Test fun edgeArrowLandsOnTheBorder() {
        val a = EspMath.edgeArrow(50f, 50f, 500f, 50f, 0f, 0f, 100f, 100f, 10f)!!
        assertEquals(90f, a.x, 0.01f)
        assertEquals(50f, a.y, 0.01f)
        assertEquals(0f, a.angleRad, 0.001f)
        val up = EspMath.edgeArrow(50f, 50f, 50f, -100f, 0f, 0f, 100f, 100f, 10f)!!
        assertEquals(10f, up.y, 0.01f)
        assertNull(EspMath.edgeArrow(50f, 50f, 50f, 50f, 0f, 0f, 100f, 100f, 10f))
    }

    @Test fun radarRotatesWithYaw() {
        // Facing +z: an entity 10 m ahead is straight up.
        val ahead = EspMath.radar(Pose(0f, 0f, 0f), 0f, 10f, 20f, 100f, 100f, 50f)
        assertEquals(100f, ahead.x, 0.01f); assertEquals(75f, ahead.y, 0.01f)
        // Facing +x (yaw 90): an entity at +x is ahead, one at +z is to the left.
        val ahead90 = EspMath.radar(Pose(0f, 0f, 90f), 10f, 0f, 20f, 100f, 100f, 50f)
        assertEquals(100f, ahead90.x, 0.01f); assertEquals(75f, ahead90.y, 0.01f)
        val left90 = EspMath.radar(Pose(0f, 0f, 90f), 0f, 10f, 20f, 100f, 100f, 50f)
        assertEquals(75f, left90.x, 0.01f); assertEquals(100f, left90.y, 0.01f)
        // Beyond range is clamped to the rim.
        val far = EspMath.radar(Pose(0f, 0f, 0f), 0f, 100f, 20f, 100f, 100f, 50f)
        assertTrue(far.clamped); assertEquals(50f, far.y, 0.01f)
    }

    @Test fun sandboxProducesPlausibleFrames() {
        val feed = SandboxFeed().apply { reset(24) }
        repeat(30) { feed.step(1 / 30f) }
        val f = feed.frame(1280, 720)
        assertEquals(24, f.entities.size)
        assertNotNull(f.player)
        f.entities.filter { it.visible }.forEach {
            assertTrue(it.w > 0 && it.h > 0)
            assertTrue(it.distance!! >= 0)
        }
        assertTrue(f.entities.any { it.visible })
    }
}

class PatchPlannerTest {
    private val schema = Schema(1, "1.0.0", "com.umt.sample", "1.0.0", true, true, 30, listOf(
        ValueSpec("speed", "Speed", ValueType.FLOAT, JsonPrimitive(1.0), min = 0.1, max = 3.0),
        ValueSpec("count", "Count", ValueType.INT, JsonPrimitive(16), min = 1.0, max = 64.0),
    ))
    private fun patch(values: Map<String, JsonPrimitive>, version: String? = "1.0.0") =
        ConfigPatch("p", "P", "com.umt.sample", version, values, 0)

    @Test fun validPatchHasNoErrors() {
        assertTrue(PatchPlanner.validate(patch(mapOf("speed" to JsonPrimitive(2.0))), schema, true).none { it.error })
    }

    @Test fun detectsIncompatibleUpdatesAndBadValues() {
        val issues = PatchPlanner.validate(patch(mapOf("gone" to JsonPrimitive(1), "count" to JsonPrimitive(100)), "0.9"), schema, true)
        assertTrue(issues.any { it.error && it.key == "gone" })
        assertTrue(issues.any { it.error && it.key == "count" })
        assertTrue(issues.any { !it.error && it.message.contains("0.9") })
    }

    @Test fun blockedWhenRemoteChangesOffOrDisconnected() {
        assertTrue(PatchPlanner.validate(patch(mapOf("speed" to JsonPrimitive(2.0))), schema.copy(allowRemoteChanges = false), true).any { it.error })
        assertTrue(PatchPlanner.validate(patch(mapOf("speed" to JsonPrimitive(2.0))), schema, false).any { it.error })
    }

    @Test fun verifyComparesTheAck() {
        val req = mapOf("speed" to JsonPrimitive(2.0), "count" to JsonPrimitive(8))
        assertEquals("verified", PatchPlanner.verify(req, Ack("r", true, mapOf("speed" to JsonPrimitive(2.0), "count" to JsonPrimitive(8L)))))
        assertEquals("partial", PatchPlanner.verify(req, Ack("r", false, mapOf("speed" to JsonPrimitive(2.0)), mapOf("count" to "no"))))
        assertEquals("failed", PatchPlanner.verify(req, Ack("r", false)))
        assertEquals("timeout", PatchPlanner.verify(req, null))
    }

    @Test fun diffShowsBeforeAndAfter() {
        val d = PatchPlanner.diff(patch(mapOf("speed" to JsonPrimitive(2.0), "count" to JsonPrimitive(16))), schema,
            mapOf("speed" to JsonPrimitive(1.0), "count" to JsonPrimitive(16)))
        assertEquals(listOf(true, false), d.map { it.changes })
        assertEquals("Speed", d[0].label)
    }
}

class JsonFormatTest {
    @Test fun formatKeepsValues() {
        val compact = """{"a":[1,2,{"b":"x, y: z"}],"c":{},"d":true,"e":"q\"uote"}"""
        val pretty = JsonHighlighter.format(compact)
        assertTrue(pretty.contains("\n"))
        assertEquals(Json.parseToJsonElement(compact), Json.parseToJsonElement(pretty) as JsonElement)
    }
}

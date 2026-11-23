package com.umt.toolkit

import com.umt.toolkit.core.AtomicJsonStore
import com.umt.toolkit.core.ProtectedExport
import com.umt.toolkit.core.ProtectedExportException
import com.umt.toolkit.core.UmtJson
import com.umt.toolkit.model.ToolkitState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File
import java.security.SecureRandom

class ProtectedExportTest {
    private val iterations = 10_000 // fast for tests; the app uses 210 000

    @Test fun roundTrip() {
        val enc = ProtectedExport.encrypt("""{"hello":"world"}""", "correct horse".toCharArray(), "profiles", iterations)
        assertTrue(ProtectedExport.isProtected(enc))
        assertFalse(enc.contains("hello"))
        val (type, plain) = ProtectedExport.decrypt(enc, "correct horse".toCharArray())
        assertEquals("profiles", type)
        assertEquals("""{"hello":"world"}""", plain)
    }

    @Test fun wrongPasswordFails() {
        val enc = ProtectedExport.encrypt("secret", "password1".toCharArray(), "profiles", iterations)
        try {
            ProtectedExport.decrypt(enc, "password2".toCharArray())
            fail("decrypted with the wrong password")
        } catch (e: ProtectedExportException) {
            assertTrue(e.message!!.contains("Wrong password"))
        }
    }

    @Test fun tamperedHeaderFails() {
        val enc = ProtectedExport.encrypt("secret", "password1".toCharArray(), "profiles", iterations)
        val tampered = enc.replace("\"profiles\"", "\"patches\"")
        try {
            ProtectedExport.decrypt(tampered, "password1".toCharArray())
            fail("header change was not detected")
        } catch (e: ProtectedExportException) {
            // expected: the content type is bound as associated data
        }
    }

    @Test fun saltAndIvAreRandom() {
        val r = SecureRandom()
        val a = ProtectedExport.encrypt("same", "password1".toCharArray(), "x", iterations, r)
        val b = ProtectedExport.encrypt("same", "password1".toCharArray(), "x", iterations, r)
        assertNotEquals(a, b)
    }

    @Test fun rejectsAbsurdIterationCounts() {
        val enc = ProtectedExport.encrypt("x", "password1".toCharArray(), "x", iterations)
        val env = UmtJson.decodeFromString<ProtectedExport.Envelope>(enc)
        val bad = UmtJson.encodeToString(ProtectedExport.Envelope.serializer(), env.copy(iterations = 1))
        try {
            ProtectedExport.decrypt(bad, "password1".toCharArray())
            fail()
        } catch (e: ProtectedExportException) {
            assertTrue(e.message!!.contains("iteration"))
        }
    }
}

class AtomicJsonStoreTest {
    @get:Rule val tmp = TemporaryFolder()

    @Test fun writeThenRead() {
        val store = AtomicJsonStore(File(tmp.root, "a/state.json"))
        val s = ToolkitState().let { it.copy(overlays = it.overlays.copy(hudEnabled = true, dimmerLevel = 0.5f)) }
        store.write(s)
        assertEquals(s, store.read { ToolkitState() })
        assertFalse(File(tmp.root, "a/state.json.tmp").exists())
    }

    @Test fun corruptFileFallsBackAndIsKept() {
        val f = File(tmp.root, "state.json")
        f.writeText("{ not json")
        val store = AtomicJsonStore(f)
        assertEquals(ToolkitState(), store.read { ToolkitState() })
        assertTrue(File(tmp.root, "state.json.corrupt").exists())
        assertFalse(f.exists())
    }

    @Test fun leftoverTempFileIsIgnored() {
        val f = File(tmp.root, "state.json")
        AtomicJsonStore(f).write(ToolkitState())
        File(tmp.root, "state.json.tmp").writeText("half written")
        assertEquals(ToolkitState(), AtomicJsonStore(f).read<ToolkitState> { error("should read the real file") })
        assertFalse(File(tmp.root, "state.json.tmp").exists())
    }

    @Test fun unknownFieldsAreIgnored() {
        val f = File(tmp.root, "state.json")
        f.writeText("""{"overlays":{"hudEnabled":true,"fromTheFuture":1},"newSection":{}}""")
        assertTrue(AtomicJsonStore(f).read { ToolkitState() }.overlays.hudEnabled)
    }
}

class ToolkitStateTest {
    @Test fun sanitizeClampsEverything() {
        val wild = ToolkitState().let {
            it.copy(
                overlays = it.overlays.copy(dimmerLevel = 5f, reticleStyle = "nope", reticleColor = "plaid", hudMetrics = listOf("batt", "bogus", "batt")),
                esp = it.esp.copy(maxEntities = 10_000, opacity = -1f, source = "elsewhere", kindColors = mapOf("npc" to "plaid", "item" to "green")),
                governor = it.governor.copy(sampleIntervalMs = 1, logLevel = "LOUD"),
            )
        }.sanitized()
        assertEquals(0.8f, wild.overlays.dimmerLevel)
        assertEquals("cross", wild.overlays.reticleStyle)
        assertEquals("white", wild.overlays.reticleColor)
        assertEquals(listOf("batt"), wild.overlays.hudMetrics)
        assertEquals(256, wild.esp.maxEntities)
        assertEquals(0.1f, wild.esp.opacity)
        assertEquals("sandbox", wild.esp.source)
        assertEquals(mapOf("item" to "green"), wild.esp.kindColors)
        assertEquals(250, wild.governor.sampleIntervalMs)
        assertEquals("INFO", wild.governor.logLevel)
    }

    @Test fun passthroughFlags() {
        val s = ToolkitState()
        assertFalse(s.anyOverlay)
        assertTrue(s.copy(overlays = s.overlays.copy(reticleEnabled = true)).anyPassthroughLayer)
        val hudOnly = s.copy(overlays = s.overlays.copy(hudEnabled = true))
        assertFalse(hudOnly.anyPassthroughLayer)
        assertTrue(hudOnly.anyOverlay)
    }
}

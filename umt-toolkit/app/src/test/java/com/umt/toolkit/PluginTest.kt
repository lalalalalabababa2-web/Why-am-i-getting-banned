package com.umt.toolkit

import com.umt.toolkit.plugins.CircuitBreaker
import com.umt.toolkit.plugins.PluginState
import com.umt.toolkit.plugins.PluginTemplates
import com.umt.toolkit.plugins.PluginValidator
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class PluginValidatorTest {
    private fun problems(json: String) = PluginValidator.validate(json).problems.filter { it.error }.map { "${it.path}: ${it.message}" }

    @Test fun everyTemplateIsValid() {
        for (t in PluginTemplates.all) {
            val r = PluginValidator.validate(t.json)
            assertTrue("${t.name}: ${r.problems}", r.ok)
        }
    }

    @Test fun badJsonIsReported() {
        val r = PluginValidator.validate("{ \"id\": ")
        assertNull(r.manifest)
        assertFalse(r.ok)
    }

    @Test fun permissionAllowlist() {
        val p = problems(minimal(permissions = """["SYSTEM_ALERT_WINDOW","CAMERA"]"""))
        assertTrue(p.toString(), p.any { it.startsWith("permissions[1]") && it.contains("CAMERA") })
    }

    @Test fun overlayBindingsNeedTheOverlayPermission() {
        val p = problems(minimal(permissions = "[]"))
        assertTrue(p.toString(), p.any { it.contains("SYSTEM_ALERT_WINDOW") })
    }

    @Test fun unknownBindingAndWrongType() {
        assertTrue(problems(minimal(control = """{"type":"toggle","id":"a","label":"A","bind":"overlay.nope"}""")).any { it.contains("Unknown binding") })
        assertTrue(problems(minimal(control = """{"type":"toggle","id":"a","label":"A","bind":"overlay.dimmer.level"}""")).any { it.contains("not usable") })
    }

    @Test fun bridgeBindingsNeedATarget() {
        assertTrue(problems(minimal(control = """{"type":"toggle","id":"a","label":"A","bind":"bridge:debug"}""")).any { it.contains("target") })
        assertTrue(problems(minimal(control = """{"type":"toggle","id":"a","label":"A","bind":"bridge:debug"}""", target = "com.example.game")).isEmpty())
    }

    @Test fun capsAndDuplicates() {
        val many = (1..49).joinToString(",") { """{"type":"label","id":"l$it","label":"L$it"}""" }
        assertTrue(problems(minimal(control = many)).any { it.contains("At most 48 controls") })
        val dup = """{"type":"label","id":"x","label":"A"},{"type":"label","id":"x","label":"B"}"""
        assertTrue(problems(minimal(control = dup)).any { it.contains("Duplicate control id") })
        assertTrue(problems(minimal(refresh = 10)).any { it.startsWith("refreshMs") })
    }

    @Test fun buttonsAndPresets() {
        assertTrue(problems(minimal(control = """{"type":"button","id":"b","label":"B","action":"system.reboot"}""")).any { it.contains("Action must be") })
        assertTrue(problems(minimal(control = """{"type":"button","id":"b","label":"B","action":"notify","arg":"hi"}""")).any { it.contains("POST_NOTIFICATIONS") })
        assertTrue(problems(minimal(control = """{"type":"button","id":"b","label":"B","action":"preset.apply","arg":"Missing"}""")).any { it.contains("preset") })
    }

    @Test fun formatStringsAreChecked() {
        assertTrue(problems(minimal(control = """{"type":"value","id":"v","label":"V","source":"telemetry.batteryPct","format":"%q"}""")).any { it.contains("format") })
        assertTrue(problems(minimal(control = """{"type":"value","id":"v","label":"V","source":"telemetry.batteryPct","format":"%.0f %%"}""")).isEmpty())
    }

    private fun minimal(
        permissions: String = """["SYSTEM_ALERT_WINDOW"]""",
        control: String = """{"type":"toggle","id":"hud","label":"HUD","bind":"overlay.hud.enabled"}""",
        target: String? = null,
        refresh: Int = 1000,
    ) = """{"schema":1,"id":"com.test.p","name":"T","permissions":$permissions,"refreshMs":$refresh,
        ${if (target != null) "\"target\":\"$target\"," else ""}
        "tabs":[{"title":"Main","controls":[$control]}]}"""
}

class CircuitBreakerTest {
    @Test fun tripsOnTheThirdFault() {
        var s = PluginState(enabled = true, panelVisible = true)
        s = CircuitBreaker.fault(s, "one")
        s = CircuitBreaker.fault(s, "two")
        assertTrue(s.enabled)
        assertFalse(s.tripped)
        s = CircuitBreaker.fault(s, "three")
        assertTrue(s.tripped)
        assertFalse(s.enabled)
        assertFalse(s.panelVisible)
        assertEquals("three", s.lastFault)
        assertFalse(CircuitBreaker.canEnable(s))
        val r = CircuitBreaker.reset(s)
        assertEquals(0, r.faults)
        assertTrue(CircuitBreaker.canEnable(r))
    }
}

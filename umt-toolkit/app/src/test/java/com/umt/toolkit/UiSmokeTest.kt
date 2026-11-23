package com.umt.toolkit

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onFirst
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTextInput
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.umt.toolkit.ui.MainActivity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Opens every screen of the real app (Robolectric, API 34) and drives the main workflows:
 * nothing may crash, and each screen must show its own content.
 */
@RunWith(AndroidJUnit4::class)
@Config(sdk = [34])
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class UiSmokeTest {
    @get:Rule val rule = createAndroidComposeRule<MainActivity>()

    private fun go(route: String) {
        rule.onNodeWithContentDescription("Menu").performClick()
        rule.waitForIdle()
        rule.onNodeWithTag("nav_$route").performClick()
        rule.waitForIdle()
    }

    private fun seen(text: String) {
        rule.waitUntil(5000) { rule.onAllNodesWithText(text, substring = true, ignoreCase = true).fetchSemanticsNodes().isNotEmpty() }
    }

    @Test fun everyScreenOpens() {
        seen("Display over other apps")
        val screens = listOf(
            "apps" to "Search name or package",
            "overlays" to "Telemetry HUD",
            "integration" to "Local Sandbox Test Feed",
            "plugins" to "Menu plugins",
            "performance" to "Toolkit frame pacing",
            "profiles" to "Save current",
            "console" to "Showing",
            "settings" to "Known limitations",
            "home" to "Live readings",
        )
        for ((route, marker) in screens) {
            go(route)
            seen(marker)
        }
    }

    @Test fun pluginFromTemplateSavesAndEnables() {
        go("plugins")
        rule.onNodeWithText("New").performClick()
        rule.onNodeWithText("Overlay quick panel").performClick()
        rule.waitForIdle()
        seen("Valid")
        rule.onNodeWithText("Save").performClick()
        rule.waitForIdle()
        seen("Quick Panel")
        val tk = Toolkit.get(rule.activity)
        val p = tk.plugins.get("com.example.quickpanel")!!
        assertTrue(p.validation.ok)
        rule.onAllNodesWithText("Enabled").onFirst().performScrollTo().performClick()
        rule.waitForIdle()
        assertTrue(tk.plugins.get("com.example.quickpanel")!!.state.enabled)
        // A preset writes through the real bindings.
        tk.plugins.applyPreset(tk.plugins.get("com.example.quickpanel")!!, "Night")
        assertTrue(tk.repo.current.overlays.dimmerEnabled)
        assertEquals(0.5f, tk.repo.current.overlays.dimmerLevel, 0.001f)
        tk.killAll()
    }

    @Test fun profileSaveAndApply() {
        val tk = Toolkit.get(rule.activity)
        tk.repo.updateOverlays { it.copy(reticleStyle = "circle") }
        go("profiles")
        rule.onNodeWithText("Save current").performClick()
        rule.onNode(hasSetTextAction()).performTextInput("Test profile")
        rule.onNodeWithText("Save").performClick()
        rule.waitForIdle()
        seen("Test profile")
        tk.repo.updateOverlays { it.copy(reticleStyle = "dot") }
        val p = tk.profiles.findByName("Test profile")!!
        tk.applyProfile(p)
        assertEquals("circle", tk.repo.current.overlays.reticleStyle)
    }

    @Test fun overlayTogglesPersistWithoutPermission() {
        go("overlays")
        rule.onNodeWithText("Show reticle").performScrollTo().performClick()
        rule.waitForIdle()
        val tk = Toolkit.get(rule.activity)
        assertTrue(tk.repo.current.overlays.reticleEnabled)
        tk.killAll()
        assertTrue(!tk.repo.current.overlays.reticleEnabled)
    }

    @Test fun sandboxPreviewProducesFrames() {
        go("integration")
        val tk = Toolkit.get(rule.activity)
        rule.waitUntil(5000) { tk.frames.frame.value != null }
        rule.onNodeWithText("Preview".uppercase()).assertIsDisplayed()
        assertTrue(tk.frames.frame.value!!.entities.isNotEmpty())
    }
}

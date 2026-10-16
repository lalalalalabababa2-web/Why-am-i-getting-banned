package app.offlineai.chat

import android.os.ParcelFileDescriptor
import android.util.Log
import androidx.test.platform.app.InstrumentationRegistry

/** The emulator itself: kept awake and unlocked, and asked what is on screen when a touch goes astray. */
object TestDevice {
    private fun shell(cmd: String): String = try {
        val pfd = InstrumentationRegistry.getInstrumentation().uiAutomation.executeShellCommand(cmd)
        ParcelFileDescriptor.AutoCloseInputStream(pfd).bufferedReader().use { it.readText() }
    } catch (e: Exception) {
        "($cmd failed: $e)"
    }

    /** Screen on, lock screen and system dialogs out of the way. */
    fun wake() {
        shell("input keyevent KEYCODE_WAKEUP")
        shell("wm dismiss-keyguard")
        shell("am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS")
    }

    /** Which windows are in front, in a line short enough for a test failure message. */
    fun windows(): String {
        val keys = listOf("mCurrentFocus", "mFocusedApp", "mInputMethodWindow", "isKeyguardShowing", "mShowingDream")
        val dump = shell("dumpsys window")
        val lines = dump.lines().map { it.trim() }.filter { l -> keys.any { l.startsWith(it) } }.distinct()
        val ime = shell("dumpsys input_method").lines().map { it.trim() }.firstOrNull { it.startsWith("mInputShown") || it.startsWith("isInputViewShown") }
        val all = (lines + listOfNotNull(ime)).joinToString(" | ").take(1500)
        Log.i("OfflineAI-Test", "windows: $all")
        return all
    }
}

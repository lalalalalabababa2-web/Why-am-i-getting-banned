package app.offlineai.chat.data

import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import java.security.MessageDigest

/**
 * Hidden as a game: the launcher shows "Ping Pong" with a game's icon instead of the app, and
 * opens a real ping pong game. The secret code, typed as the player name in the game's settings,
 * opens the app. Only a hash of the code is kept.
 */
object Disguise {
    private const val APP = "app.offlineai.chat.Launcher"
    private const val GAME = "app.offlineai.chat.GameLauncher"

    private fun hash(code: String): String {
        val d = MessageDigest.getInstance("SHA-256").digest(("nyx:" + code.trim().lowercase()).toByteArray())
        return d.joinToString("") { "%02x".format(it) }
    }

    fun matches(s: Settings, typed: String): Boolean =
        s.disguised && s.disguiseCode.isNotEmpty() && typed.isNotBlank() && hash(typed) == s.disguiseCode

    /** Hides the app behind the game, with [code] as the way back in. */
    fun enable(context: Context, s: Settings, code: String) {
        s.disguiseCode = hash(code)
        s.disguised = true
        apply(context, true)
    }

    fun disable(context: Context, s: Settings) {
        s.disguised = false
        s.disguiseCode = ""
        apply(context, false)
    }

    /** Puts the launcher entry that matches the setting in place (also after an update). */
    fun apply(context: Context, hidden: Boolean) {
        val pm = context.packageManager
        fun set(name: String, on: Boolean) {
            val state = if (on) PackageManager.COMPONENT_ENABLED_STATE_ENABLED else PackageManager.COMPONENT_ENABLED_STATE_DISABLED
            val c = ComponentName(context.packageName, name)
            if (pm.getComponentEnabledSetting(c) != state) pm.setComponentEnabledSetting(c, state, PackageManager.DONT_KILL_APP)
        }
        // the new entry first, so the app never has no entry at all
        if (hidden) {
            set(GAME, true)
            set(APP, false)
        } else {
            set(APP, true)
            set(GAME, false)
        }
    }

    /** The name shown in the recent apps and notifications while hidden. */
    const val GAME_NAME = "Ping Pong"
}

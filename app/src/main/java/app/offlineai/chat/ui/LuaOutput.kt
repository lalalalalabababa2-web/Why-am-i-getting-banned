package app.offlineai.chat.ui

import android.text.SpannableStringBuilder
import android.text.Spanned
import android.text.style.ForegroundColorSpan
import app.offlineai.chat.lua.CheckResult
import app.offlineai.chat.lua.LuaEnv
import app.offlineai.chat.lua.RunResult
import java.util.Locale

/** How a Lua run's output and a check's problems read, in the chat and in the editor. */
object Output {
    /** Lines shown before "Show all". */
    const val SHOWN_LINES = 40

    fun runSummary(r: RunResult, env: LuaEnv, scripts: Int): String {
        val parts = mutableListOf<String>()
        parts += if (env == LuaEnv.ROBLOX) "Roblox test place" else "Ran"
        if (scripts > 1) parts += "$scripts scripts together"
        if (r.gameTime >= 0) parts += String.format(Locale.US, "%.1f s of game time", r.gameTime)
        when (r.stopped) {
            "time" -> parts += "stopped: took too long"
            "memory" -> parts += "stopped: out of memory"
            "output" -> parts += "stopped: too much output"
            "user" -> parts += "stopped"
        }
        parts += when {
            r.errors == 1 -> "1 error"
            r.errors > 1 -> "${r.errors} errors"
            else -> "no errors"
        }
        if (r.ms >= 1) parts += String.format(Locale.US, "%.0f ms", r.ms)
        return parts.joinToString(" · ")
    }

    fun lineCount(r: RunResult) = r.lines.size + (if (r.error.isNotEmpty()) 1 else 0)

    private fun colourOf(kind: String) = when (kind) {
        "warn" -> Palette.caution
        "err" -> Palette.danger
        "info" -> Palette.text3
        else -> Palette.text
    }

    fun runText(r: RunResult, env: LuaEnv, limit: Int = Int.MAX_VALUE): CharSequence {
        val sb = SpannableStringBuilder()
        fun add(text: String, colour: Int) {
            val st = sb.length
            sb.append(text)
            sb.setSpan(ForegroundColorSpan(colour), st, sb.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        }
        for ((i, l) in r.lines.withIndex()) {
            if (i >= limit) break
            if (sb.isNotEmpty()) sb.append('\n')
            if (env == LuaEnv.ROBLOX && l.seconds != null) add(String.format(Locale.US, "%5.1f  ", l.seconds), Palette.text3)
            add(l.text, colourOf(l.kind))
        }
        if (r.error.isNotEmpty() && r.lines.size < limit) {
            if (sb.isNotEmpty()) sb.append('\n')
            add(r.error, Palette.danger)
        }
        if (sb.isEmpty() && r.ok) add("(nothing printed)", Palette.text3)
        return sb
    }

    /** The output as plain text, for the model or the clipboard (the end of it, if it is long). */
    fun runPlain(r: RunResult, env: LuaEnv, maxLines: Int = 60): String {
        val lines = r.lines.map { l ->
            val t = if (env == LuaEnv.ROBLOX && l.seconds != null) String.format(Locale.US, "[%.1fs] ", l.seconds) else ""
            val tag = when (l.kind) {
                "warn" -> "warning: "
                "err" -> "error: "
                else -> ""
            }
            t + tag + l.text
        }.toMutableList()
        if (r.error.isNotEmpty()) lines += "error: " + r.error
        val shown = if (lines.size > maxLines) listOf("(${lines.size - maxLines} earlier lines left out)") + lines.takeLast(maxLines) else lines
        return shown.joinToString("\n")
    }

    fun checkSummary(c: CheckResult): String {
        val warnings = c.problems.count { it.severity != "error" }
        return when {
            c.problems.isEmpty() -> "Check: no problems found"
            else -> "Check: " + listOfNotNull(
                if (c.errors > 0) (if (c.errors == 1) "1 error" else "${c.errors} errors") else null,
                if (warnings > 0) (if (warnings == 1) "1 warning" else "$warnings warnings") else null,
            ).joinToString(", ")
        }
    }

    fun checkText(c: CheckResult): CharSequence {
        val sb = SpannableStringBuilder()
        for (p in c.problems) {
            if (sb.isNotEmpty()) sb.append('\n')
            val st = sb.length
            sb.append("line ${p.line}  ")
            sb.setSpan(ForegroundColorSpan(Palette.text3), st, sb.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
            val ms = sb.length
            sb.append(p.message)
            sb.setSpan(ForegroundColorSpan(if (p.severity == "error") Palette.danger else Palette.caution), ms, sb.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        }
        if (c.gameGlobals.isNotEmpty()) {
            if (sb.isNotEmpty()) sb.append('\n')
            val st = sb.length
            sb.append("Comes from the game (not checked here): " + c.gameGlobals.joinToString(", "))
            sb.setSpan(ForegroundColorSpan(Palette.text3), st, sb.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        }
        return sb
    }

    fun checkPlain(c: CheckResult): String =
        c.problems.joinToString("\n") { "line ${it.line}: ${if (it.severity == "error") "error" else "warning"}: ${it.message}" }

    /**
     * What to ask the model when code failed: the output, and the code itself unless it is in
     * the model's own last reply.
     */
    fun fixRequest(lang: String, code: String, includeCode: Boolean, run: RunResult?, check: CheckResult?, env: LuaEnv): String {
        val where = when (env) {
            LuaEnv.ROBLOX -> "in the Roblox test place on my phone (no physics or graphics)"
            LuaEnv.MOD -> "as plain Lua on my phone (the game's own functions are not there)"
            LuaEnv.LUA -> "on my phone"
        }
        return buildString {
            if (check != null) {
                append("Checking this code found these problems:\n```\n").append(checkPlain(check)).append("\n```\n")
            } else if (run != null) {
                append("I ran this code ").append(where).append(" and got:\n```\n").append(runPlain(run, env)).append("\n```\n")
            }
            if (includeCode) append("\n```").append(lang).append('\n').append(code.trimEnd()).append("\n```\n")
            append("\nFix it and give me the whole corrected code.")
        }
    }
}

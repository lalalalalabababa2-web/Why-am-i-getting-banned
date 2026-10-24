package app.offlineai.chat.ui

import android.content.Context
import android.content.Intent
import android.graphics.Typeface
import android.net.Uri
import android.os.Bundle
import android.text.Editable
import android.text.InputType
import android.text.Spannable
import android.text.Spanned
import android.text.TextWatcher
import android.text.style.BackgroundColorSpan
import android.text.style.ForegroundColorSpan
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.inputmethod.EditorInfo
import android.widget.EditText
import android.widget.HorizontalScrollView
import android.widget.LinearLayout
import android.widget.PopupMenu
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import app.offlineai.chat.App
import app.offlineai.chat.R
import app.offlineai.chat.data.ChatMode
import app.offlineai.chat.lua.CheckResult
import app.offlineai.chat.lua.LuaEnv
import app.offlineai.chat.lua.LuaScript
import app.offlineai.chat.lua.LuaTools
import app.offlineai.chat.lua.RunResult
import app.offlineai.chat.lua.SavedScript
import app.offlineai.chat.lua.ScriptStore

/**
 * A small Lua editor: scripts kept on the phone, line numbers, colours, a row of the keys code
 * needs that phone keyboards hide, and Run / Check with the output underneath. Roblox scripts
 * run in the test place, like the Run button on code in the chat.
 */
class LuaEditorActivity : AppCompatActivity() {
    private lateinit var app: App
    private lateinit var store: ScriptStore
    private lateinit var script: SavedScript
    private lateinit var title: TextView
    private lateinit var envChip: TextView
    private lateinit var runButton: TextView
    private lateinit var editor: EditText
    private lateinit var gutter: TextView
    private lateinit var editorScroll: ScrollView
    private lateinit var outputBox: LinearLayout
    private lateinit var outputStatus: TextView
    private lateinit var outputText: TextView
    private lateinit var outputFix: TextView
    private lateinit var outputLine: TextView

    private var lastRun: RunResult? = null
    private var lastCheck: CheckResult? = null
    private var running = false
    private var indenting = false
    private var lineCount = 0

    /** Lines to mark: the error line of the last run, the problems of the last check. */
    private var marks: Map<Int, Int> = emptyMap()

    private val recolour = Runnable { colour() }

    private val saveFile = registerForActivityResult(ActivityResultContracts.CreateDocument("text/plain")) { uri: Uri? ->
        if (uri != null) {
            val ok = runCatching {
                contentResolver.openOutputStream(uri)?.use { it.write(editor.text.toString().toByteArray()) }
            }.isSuccess
            toast(if (ok) "Saved" else "Could not save the file")
        }
    }
    private val openFile = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri: Uri? ->
        if (uri != null) importFrom(uri)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        app = App.of(this)
        store = ScriptStore(this)
        Palette.apply(this, app.settings)
        script = pendingNew?.also { store.save(it) }
            ?: (savedInstanceState?.getString("id") ?: app.settings.lastScriptId)?.let { store.load(it) }
            ?: store.list().firstOrNull()
            ?: SavedScript(name = "Script", env = LuaEnv.LUA, source = SAMPLE).also { store.save(it) }
        pendingNew = null
        app.settings.lastScriptId = script.id

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Palette.bg)
        }

        // top bar: back · name (tap to rename) · where it runs · Run · more
        val bar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(4), dp(4), dp(4), dp(4))
        }
        bar.addView(iconButton(R.drawable.ic_back, "Back") { finish() })
        val names = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(4), dp(2), dp(8), dp(2))
            background = ripple(null, dp(10).toFloat())
            setOnClickListener { rename() }
        }
        title = text("", 16f, bold = true).apply { maxLines = 1; ellipsize = android.text.TextUtils.TruncateAt.END }
        envChip = text("", 12f, Palette.accent).apply { maxLines = 1 }
        names.addView(title)
        names.addView(envChip)
        bar.addView(names, lp(0, WRAP, 1f))
        envChip.setOnClickListener { pickEnv() }
        runButton = pill("Run", primary = true) { runOrStop() }
        bar.addView(runButton, lp(WRAP, WRAP).apply { marginEnd = dp(4) })
        bar.addView(iconButton(R.drawable.ic_more, "More") {}.also { more -> more.setOnClickListener { showMenu(it) } })
        root.addView(bar, lp(MATCH, WRAP))
        root.addView(divider())

        // the code, with line numbers beside it
        editorScroll = ScrollView(this).apply { isFillViewport = true }
        val codeRow = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        gutter = TextView(this).apply {
            typeface = Typeface.MONOSPACE
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13.5f * Palette.fontScale)
            setTextColor(Palette.text3)
            gravity = Gravity.END
            includeFontPadding = false
            setPadding(dp(8), dp(10), dp(6), dp(10))
            setBackgroundColor(Palette.surface1)
        }
        editor = EditText(this).apply {
            typeface = Typeface.MONOSPACE
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13.5f * Palette.fontScale)
            setTextColor(Palette.text)
            includeFontPadding = false
            background = null
            gravity = Gravity.TOP or Gravity.START
            setPadding(dp(8), dp(10), dp(16), dp(10))
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_MULTI_LINE or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
            imeOptions = EditorInfo.IME_FLAG_NO_EXTRACT_UI or EditorInfo.IME_FLAG_NO_FULLSCREEN
            setHorizontallyScrolling(true)
            setText(script.source)
        }
        codeRow.addView(gutter, lp(WRAP, MATCH))
        codeRow.addView(editor, lp(0, WRAP, 1f))
        editorScroll.addView(codeRow, android.widget.FrameLayout.LayoutParams(MATCH, WRAP))
        root.addView(editorScroll, lp(MATCH, 0, 1f))

        root.addView(keyBar(), lp(MATCH, WRAP))

        // output: what the last run printed or the check found
        outputBox = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Palette.surface1)
            visibility = View.GONE
        }
        outputBox.addView(divider())
        val outRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(12), 0, dp(4), 0)
        }
        outputStatus = text("", 12f, Palette.text2)
        outRow.addView(outputStatus, lp(0, WRAP, 1f))
        outputLine = text("", 12f, Palette.accent, bold = true)
        outputFix = text("Ask the AI", 12f, Palette.accent, bold = true)
        val outClose = text("Close", 12f, Palette.text3, bold = true)
        for (b in listOf(outputLine, outputFix, outClose)) {
            b.setPadding(dp(8), dp(10), dp(8), dp(10))
            b.background = ripple(null, dp(8).toFloat())
            outRow.addView(b)
        }
        outClose.setOnClickListener {
            outputBox.visibility = View.GONE
            marks = emptyMap()
            colour()
        }
        outputFix.setOnClickListener { askTheAi() }
        outputBox.addView(outRow, lp(MATCH, WRAP))
        val outScroll = ScrollView(this)
        outputText = text("", 12.5f, Palette.text, mono = true).apply {
            setTextIsSelectable(true)
            setPadding(dp(12), 0, dp(12), dp(10))
        }
        outScroll.addView(outputText)
        outputBox.addView(outScroll, lp(MATCH, (resources.displayMetrics.heightPixels * 0.3).toInt()))
        root.addView(outputBox, lp(MATCH, WRAP))

        setContentView(root)
        edgeToEdge(root)

        editor.addTextChangedListener(object : TextWatcher {
            private var newline = -1
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                newline = if (!indenting && count == 1 && before == 0 && s != null && s[start] == '\n') start else -1
            }

            override fun afterTextChanged(s: Editable) {
                if (newline >= 0) {
                    val at = newline
                    newline = -1
                    indent(s, at)
                }
                updateGutter()
                editor.removeCallbacks(recolour)
                editor.postDelayed(recolour, 250)
            }
        })
        refreshHeader()
        updateGutter()
        colour()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putString("id", script.id)
    }

    override fun onPause() {
        super.onPause()
        saveNow()
    }

    private fun toast(s: String) = Toast.makeText(this, s, Toast.LENGTH_SHORT).show()

    private fun saveNow() {
        val text = editor.text.toString()
        if (text != script.source) {
            script.source = text
            store.save(script)
        }
    }

    private fun refreshHeader() {
        title.text = script.name
        envChip.text = "${script.env.label} ▾"
        runButton.text = if (running) "Stop" else "Run"
    }

    // ------------------------------------------------------------------ editing

    /** A new line keeps the indentation of the one before, one step more after then / do / function / {. */
    private fun indent(s: Editable, newlineAt: Int) {
        val lineStart = s.lastIndexOf('\n', newlineAt - 1).let { if (it < 0) 0 else it + 1 }
        val prev = s.substring(lineStart, newlineAt)
        val lead = prev.takeWhile { it == ' ' || it == '\t' }
        val trimmed = prev.trim()
        val opens = trimmed.endsWith(" then") || trimmed == "then" || trimmed.endsWith(" do") || trimmed == "do" ||
            trimmed == "else" || trimmed.endsWith("{") || trimmed.endsWith("(") || trimmed == "repeat" ||
            Regex("""(^|[\s=(,])function\b.*\)\s*$""").containsMatchIn(trimmed)
        val unit = if (lead.contains('\t')) "\t" else "    "
        val add = lead + if (opens) unit else ""
        if (add.isEmpty()) return
        indenting = true
        s.insert(newlineAt + 1, add)
        indenting = false
    }

    private fun insert(text: String) {
        val st = editor.selectionStart.coerceAtLeast(0)
        val en = editor.selectionEnd.coerceAtLeast(0)
        editor.text.replace(minOf(st, en), maxOf(st, en), text)
    }

    /** The keys code needs that phone keyboards keep two taps away. */
    private fun keyBar(): View {
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(dp(4), dp(4), dp(4), dp(4))
        }
        val keys = listOf("⇥", "←", "→", "(", ")", "{", "}", "[", "]", "\"", "'", "=", ".", ":", ",", "#", "-", "+", "*",
            "/", "<", ">", "~", "_", "local", "function", "end", "then", "do", "if", "for", "return", "print")
        for (k in keys) {
            val b = text(k, 14f, Palette.text, mono = true).apply {
                gravity = Gravity.CENTER
                minWidth = dp(38)
                setPadding(dp(10), dp(8), dp(10), dp(8))
                background = ripple(rounded(Palette.surface2, dp(8).toFloat(), dp(1), Palette.border), dp(8).toFloat())
                setOnClickListener {
                    when (k) {
                        "⇥" -> insert("    ")
                        "←" -> editor.setSelection((editor.selectionStart - 1).coerceAtLeast(0))
                        "→" -> editor.setSelection((editor.selectionEnd + 1).coerceAtMost(editor.length()))
                        "local", "function", "end", "then", "do", "if", "for", "return" -> insert("$k ")
                        "print" -> insert("print()").also { editor.setSelection((editor.selectionStart - 1).coerceAtLeast(0)) }
                        else -> insert(k)
                    }
                }
            }
            row.addView(b, lp(WRAP, WRAP).apply { marginEnd = dp(4) })
        }
        return HorizontalScrollView(this).apply {
            isHorizontalScrollBarEnabled = false
            setBackgroundColor(Palette.bg)
            addView(row)
        }
    }

    private fun updateGutter() {
        val text = editor.text
        var n = 1
        for (i in 0 until text.length) if (text[i] == '\n') n++
        if (n == lineCount) return
        lineCount = n
        val sb = StringBuilder()
        for (i in 1..n) {
            if (i > 1) sb.append('\n')
            sb.append(i)
        }
        gutter.text = sb
        // the gutter and the code are drawn with the same line height
        gutter.setLineSpacing(0f, editor.lineSpacingMultiplier)
    }

    /** Syntax colours, and the lines the last run or check pointed at. */
    private fun colour() {
        val text: Spannable = editor.text
        for (span in text.getSpans(0, text.length, ForegroundColorSpan::class.java)) text.removeSpan(span)
        for (span in text.getSpans(0, text.length, BackgroundColorSpan::class.java)) text.removeSpan(span)
        val plain = text.toString()
        if (app.settings.syntaxHighlight && text.length < 200_000) {
            val h = CodeHighlighter(if (script.env == LuaEnv.ROBLOX) "luau" else "lua")
            var p = 0
            while (p <= plain.length) {
                var e = plain.indexOf('\n', p)
                if (e < 0) e = plain.length
                try {
                    h.line(text, p, e)
                } catch (ex: Exception) {
                    // colours are decoration
                }
                p = e + 1
            }
        }
        if (marks.isNotEmpty()) {
            var line = 1
            var p = 0
            while (p <= plain.length) {
                var e = plain.indexOf('\n', p)
                if (e < 0) e = plain.length
                marks[line]?.let { colour ->
                    if (e > p) text.setSpan(BackgroundColorSpan(colour), p, e, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                }
                line++
                p = e + 1
            }
        }
    }

    private fun goToLine(line: Int) {
        val s = editor.text.toString()
        var p = 0
        var n = 1
        while (n < line) {
            val e = s.indexOf('\n', p)
            if (e < 0) break
            p = e + 1
            n++
        }
        editor.requestFocus()
        editor.setSelection(p.coerceIn(0, editor.length()))
        editor.post {
            val layout = editor.layout ?: return@post
            val y = layout.getLineTop(layout.getLineForOffset(p))
            editorScroll.smoothScrollTo(0, (y - dp(40)).coerceAtLeast(0))
        }
    }

    // ------------------------------------------------------------------ running

    private fun runOrStop() {
        if (running) {
            LuaTools.stop()
            return
        }
        if (LuaTools.busy) {
            toast("Another run is still going.")
            return
        }
        saveNow()
        running = true
        refreshHeader()
        showOutput(if (script.env == LuaEnv.ROBLOX) "Running in the Roblox test place…" else "Running…", Palette.text2, "")
        val name = script.name.replace(Regex("[^A-Za-z0-9_]"), "").ifEmpty { "script" }
        LuaTools.run(this, listOf(LuaScript(name, editor.text.toString())), script.env, app.settings.luaRunOptions()) { r ->
            running = false
            lastRun = r
            lastCheck = null
            if (isDestroyed) return@run
            refreshHeader()
            showOutput(Output.runSummary(r, script.env, 1), if (r.failed) Palette.danger else Palette.text2, Output.runText(r, script.env))
            marks = if (r.errorLine > 0) mapOf(r.errorLine to markColour(Palette.danger)) else emptyMap()
            lineLink(r.errorLine)
            outputFix.visibility = View.VISIBLE
            colour()
        }
    }

    private fun check() {
        if (LuaTools.busy) return
        saveNow()
        showOutput("Checking…", Palette.text2, "")
        LuaTools.check(editor.text.toString(), script.env) { c ->
            lastCheck = c
            lastRun = null
            if (isDestroyed) return@check
            val colour = if (c.errors > 0) Palette.danger else if (c.problems.isEmpty()) Palette.positive else Palette.caution
            showOutput(Output.checkSummary(c), colour, Output.checkText(c))
            marks = c.problems.associate { it.line to markColour(if (it.severity == "error") Palette.danger else Palette.caution) }
            lineLink(c.problems.firstOrNull()?.line ?: 0)
            outputFix.visibility = if (c.problems.isNotEmpty()) View.VISIBLE else View.GONE
            colour()
        }
    }

    private fun markColour(c: Int) = (c and 0x00FFFFFF) or 0x33000000

    private fun lineLink(line: Int) {
        outputLine.visibility = if (line > 0) View.VISIBLE else View.GONE
        outputLine.text = "Line $line"
        outputLine.setOnClickListener { goToLine(line) }
    }

    private fun showOutput(status: String, colour: Int, body: CharSequence) {
        outputBox.visibility = View.VISIBLE
        outputStatus.text = status
        outputStatus.setTextColor(colour)
        outputText.text = body
        outputFix.visibility = View.GONE
        outputLine.visibility = View.GONE
    }

    /** Back to the chat with the script (and what went wrong) in the message box. */
    private fun askTheAi() {
        saveNow()
        val lang = if (script.env == LuaEnv.ROBLOX) "luau" else "lua"
        val code = editor.text.toString()
        val text = if (lastRun != null || lastCheck != null) {
            Output.fixRequest(lang, code, includeCode = true, run = lastRun, check = lastCheck, env = script.env)
        } else {
            "Here is my script:\n```$lang\n${code.trimEnd()}\n```\n\n"
        }
        val chat = app.chat
        if (chat.conversation.messages.isEmpty() && !chat.generating) {
            chat.setMode(when (script.env) {
                LuaEnv.ROBLOX -> ChatMode.ROBLOX
                LuaEnv.MOD -> ChatMode.MODS
                LuaEnv.LUA -> ChatMode.LUA
            })
        }
        chat.pendingCompose = text
        startActivity(Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP))
        finish()
    }

    // ------------------------------------------------------------------ scripts

    private fun showMenu(anchor: View) {
        val pm = PopupMenu(this, anchor)
        pm.menu.add(0, 1, 0, "Check for problems")
        pm.menu.add(0, 2, 1, "Ask the AI about it")
        pm.menu.add(0, 3, 2, "My scripts…")
        pm.menu.add(0, 4, 3, "New script")
        pm.menu.add(0, 5, 4, "Save as a file…")
        pm.menu.add(0, 6, 5, "Open a file…")
        pm.menu.add(0, 7, 6, "Copy all")
        pm.menu.add(0, 8, 7, "Rename")
        pm.menu.add(0, 9, 8, "Delete")
        pm.setOnMenuItemClickListener {
            when (it.itemId) {
                1 -> check()
                2 -> askTheAi()
                3 -> pickScript()
                4 -> newScript()
                5 -> {
                    saveNow()
                    saveFile.launch(script.fileName())
                }
                6 -> openFile.launch(arrayOf("text/*", "application/octet-stream", "*/*"))
                7 -> copyText("script", editor.text.toString())
                8 -> rename()
                9 -> confirmDelete()
            }
            true
        }
        pm.show()
    }

    private fun switchTo(s: SavedScript, saveFirst: Boolean = true) {
        if (saveFirst) saveNow()
        script = s
        app.settings.lastScriptId = s.id
        lastRun = null
        lastCheck = null
        marks = emptyMap()
        outputBox.visibility = View.GONE
        lineCount = 0
        editor.setText(s.source)
        refreshHeader()
        colour()
    }

    private fun pickScript() {
        saveNow()
        val all = store.list()
        val labels = all.map { "${it.name}  ·  ${it.env.label}" }.toTypedArray()
        AlertDialog.Builder(this)
            .setTitle("My scripts")
            .setItems(labels) { _, which -> switchTo(all[which]) }
            .setPositiveButton("New script") { _, _ -> newScript() }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun newScript() {
        val envs = LuaEnv.values()
        AlertDialog.Builder(this)
            .setTitle("New script")
            .setItems(envs.map { it.label }.toTypedArray()) { _, which ->
                val env = envs[which]
                val s = SavedScript(name = store.freshName(if (env == LuaEnv.ROBLOX) "Script" else "script"), env = env,
                    source = if (env == LuaEnv.ROBLOX) ROBLOX_SAMPLE else "")
                store.save(s)
                switchTo(s)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun rename() {
        val field = EditText(this).apply {
            setText(script.name)
            setTextColor(Palette.text)
            setSelection(text.length)
        }
        val box = LinearLayout(this).apply {
            setPadding(dp(20), dp(8), dp(20), 0)
            addView(field, lp(MATCH, WRAP))
        }
        AlertDialog.Builder(this)
            .setTitle("Rename")
            .setView(box)
            .setPositiveButton("Save") { _, _ ->
                val n = field.text.toString().trim()
                if (n.isNotEmpty()) {
                    script.name = n
                    store.save(script)
                    refreshHeader()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun pickEnv() {
        val envs = LuaEnv.values()
        AlertDialog.Builder(this)
            .setTitle("Run as")
            .setSingleChoiceItems(envs.map { it.label }.toTypedArray(), envs.indexOf(script.env)) { d, which ->
                d.dismiss()
                script.env = envs[which]
                store.save(script)
                refreshHeader()
                colour()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun confirmDelete() {
        AlertDialog.Builder(this)
            .setTitle("Delete ${script.name}?")
            .setPositiveButton("Delete") { _, _ ->
                store.delete(script.id)
                val next = store.list().firstOrNull() ?: SavedScript(name = "script", env = LuaEnv.LUA, source = "").also { store.save(it) }
                switchTo(next, saveFirst = false)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun importFrom(uri: Uri) {
        val text = runCatching { contentResolver.openInputStream(uri)?.bufferedReader()?.use { it.readText() } }.getOrNull()
        if (text == null) {
            toast("Could not read that file")
            return
        }
        val fileName = runCatching {
            contentResolver.query(uri, arrayOf(android.provider.OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c ->
                if (c.moveToFirst()) c.getString(0) else null
            }
        }.getOrNull() ?: "script.lua"
        val env = if (fileName.endsWith(".luau") || LuaTools.looksRoblox(text)) LuaEnv.ROBLOX else LuaEnv.LUA
        val s = SavedScript(name = store.freshName(fileName.substringBeforeLast('.')), env = env, source = text)
        store.save(s)
        switchTo(s)
    }

    companion object {
        private var pendingNew: SavedScript? = null

        /** Opens the editor on the script used last (or a new one). */
        fun open(context: Context) {
            context.startActivity(Intent(context, LuaEditorActivity::class.java))
        }

        /** Opens a code block from the chat as a new script. */
        fun openCode(context: Context, lang: String, code: String, env: LuaEnv) {
            val store = ScriptStore(context)
            val base = SavedScript.nameFrom(code) ?: if (env == LuaEnv.ROBLOX) "Script" else "script"
            pendingNew = SavedScript(name = store.freshName(base), env = env, source = code)
            context.startActivity(Intent(context, LuaEditorActivity::class.java))
        }

        private const val SAMPLE = """-- Lua runs right here on the phone. Tap Run.
local function fib(n)
    if n < 2 then return n end
    return fib(n - 1) + fib(n - 2)
end

for i = 1, 10 do
    io.write(fib(i), " ")
end
print()
"""

        private const val ROBLOX_SAMPLE = """-- Script in ServerScriptService
local Players = game:GetService("Players")

Players.PlayerAdded:Connect(function(player)
    local leaderstats = Instance.new("Folder")
    leaderstats.Name = "leaderstats"
    leaderstats.Parent = player

    local coins = Instance.new("IntValue")
    coins.Name = "Coins"
    coins.Parent = leaderstats

    while player.Parent do
        task.wait(5)
        coins.Value += 10
    end
end)
"""
    }
}

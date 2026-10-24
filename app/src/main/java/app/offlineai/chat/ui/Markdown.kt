package app.offlineai.chat.ui

import android.content.Context
import android.graphics.Typeface
import android.text.Editable
import android.text.SpannableStringBuilder
import android.text.Spanned
import android.text.style.BackgroundColorSpan
import android.text.style.ForegroundColorSpan
import android.text.style.LeadingMarginSpan
import android.text.style.RelativeSizeSpan
import android.text.style.StrikethroughSpan
import android.text.style.StyleSpan
import android.text.style.TypefaceSpan
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.widget.HorizontalScrollView
import android.widget.LinearLayout
import android.widget.TextView
import app.offlineai.chat.lua.CheckResult
import app.offlineai.chat.lua.LuaEnv
import app.offlineai.chat.lua.LuaTools
import app.offlineai.chat.lua.RunResult

/** How replies are drawn; from the chat display settings. */
data class RenderOptions(
    val markdown: Boolean,
    val wrapCode: Boolean,
    val highlight: Boolean,
    val fontScale: Float,
)

/**
 * Just enough Markdown for chat replies: paragraphs, headings, lists, quotes, bold, italic,
 * inline code, links, tables, and fenced code blocks with a copy button.
 *
 * Built for text that grows while it is read. Each paragraph and each code block is its own
 * view; when the reply grows, only the last one changes, and a growing code block has the new
 * text appended (and coloured line by line) instead of being replaced. The earlier views are not
 * touched, so nothing above the end of the reply moves.
 */
object Markdown {
    sealed class Block(val start: Int, val src: String) {
        class Text(start: Int, src: String) : Block(start, src)
        class Code(start: Int, src: String, val lang: String, val code: String, val closed: Boolean) : Block(start, src)
        class Table(start: Int, src: String, val text: String) : Block(start, src)
    }

    /** Keyed by message and block; whether a long code block is folded. */
    interface Host {
        fun isCollapsed(blockIndex: Int): Boolean
        fun toggleCollapsed(blockIndex: Int, anchor: View)
        fun copy(label: String, text: String)
        /** Run, check and edit buttons for Lua blocks; null where there are none (tests, previews). */
        fun codeTools(): CodeTools? = null
    }

    /** What a Lua block has been through: a run going on, the last run's output, the last check. */
    class BlockRun {
        var running = false
        var checking = false
        var result: RunResult? = null
        var check: CheckResult? = null
        var env = LuaEnv.LUA
        /** The scripts that ran together (Roblox: every Roblox script in the reply). */
        var scripts = 1
        var showAll = false
        /** Changes with every change, so a view redraws only when there is something new. */
        var version = 0
    }

    interface CodeTools {
        fun state(blockIndex: Int): BlockRun?
        fun run(blockIndex: Int, lang: String, code: String, anchor: View)
        fun check(blockIndex: Int, lang: String, code: String, anchor: View)
        fun stop()
        fun edit(lang: String, code: String)
        /** Puts the output in the message box, asking the model to fix the code. */
        fun fix(blockIndex: Int, lang: String, code: String)
        fun close(blockIndex: Int, anchor: View)
        fun toggleAll(blockIndex: Int, anchor: View)
    }

    private class State(val src: String, val blocks: List<Block>, val options: RenderOptions)

    // ------------------------------------------------------------------ parsing

    fun parse(src: String, markdown: Boolean = true): List<Block> = parseFrom(src, 0, markdown)

    private fun parseFrom(src: String, from: Int, markdown: Boolean): List<Block> {
        val out = mutableListOf<Block>()
        var pos = from
        val n = src.length
        fun lineEnd(p: Int): Int = src.indexOf('\n', p).let { if (it < 0) n else it }
        fun next(p: Int): Int = lineEnd(p).let { if (it < n) it + 1 else n }

        while (pos < n) {
            val le = lineEnd(pos)
            val line = src.substring(pos, le)
            val t = line.trimStart()
            if (line.isBlank()) {
                pos = next(pos)
                continue
            }
            if (markdown && (t.startsWith("```") || t.startsWith("~~~"))) {
                val fence = t.substring(0, 3)
                val lang = t.removePrefix(fence).trim().substringBefore(' ')
                val start = pos
                var p = next(pos)
                val codeStart = p
                var closed = false
                var codeEnd = n
                while (p < n) {
                    val e = lineEnd(p)
                    if (src.substring(p, e).trimStart().startsWith(fence)) {
                        codeEnd = p
                        closed = true
                        p = next(p)
                        break
                    }
                    p = next(p)
                }
                if (!closed) p = n
                var code = src.substring(codeStart, minOf(codeEnd, n))
                if (code.endsWith("\n")) code = code.dropLast(1)
                out += Block.Code(start, src.substring(start, p), lang, code, closed)
                pos = p
                continue
            }
            if (markdown && t.startsWith("|") && t.count { it == '|' } >= 2) {
                val start = pos
                var p = pos
                val rows = mutableListOf<String>()
                while (p < n) {
                    val e = lineEnd(p)
                    val l = src.substring(p, e).trim()
                    if (!l.startsWith("|")) break
                    rows += l
                    p = next(p)
                }
                out += Block.Table(start, src.substring(start, p), formatTable(rows))
                pos = p
                continue
            }
            // a paragraph: up to the next blank line, fence or table
            val start = pos
            var p = pos
            while (p < n) {
                val e = lineEnd(p)
                val l = src.substring(p, e)
                val lt = l.trimStart()
                if (p > start && (l.isBlank() || (markdown && (lt.startsWith("```") || lt.startsWith("~~~") ||
                        (lt.startsWith("|") && lt.count { it == '|' } >= 2))))) break
                p = next(p)
            }
            out += Block.Text(start, src.substring(start, p))
            pos = p
        }
        return out
    }

    /** Pads table cells so the columns line up in a monospaced font. */
    private fun formatTable(rows: List<String>): String {
        val cells = rows.map { r -> r.trim('|').split('|').map { it.trim() } }
        val isRule = { row: List<String> -> row.all { c -> c.isNotEmpty() && c.all { it == '-' || it == ':' } } }
        val cols = cells.maxOf { it.size }
        val widths = IntArray(cols)
        cells.filterNot(isRule).forEach { row -> row.forEachIndexed { k, c -> widths[k] = maxOf(widths[k], c.length) } }
        return cells.joinToString("\n") { row ->
            if (isRule(row)) widths.joinToString("─┼─") { "─".repeat(it) }
            else (0 until cols).joinToString(" │ ") { k -> (row.getOrNull(k) ?: "").padEnd(widths[k]) }
        }
    }

    // ------------------------------------------------------------------ rendering

    fun render(container: LinearLayout, src: String, options: RenderOptions, host: Host, textColor: Int = Palette.text) {
        val old = container.tag as? State
        val blocks: List<Block> = if (old != null && old.options == options && old.blocks.isNotEmpty() &&
            src.length >= old.src.length && src.startsWith(old.src)
        ) {
            // The reply only grew: everything before the last block is unchanged.
            val last = old.blocks.last()
            old.blocks.dropLast(1) + parseFrom(src, last.start, options.markdown)
        } else {
            parseFrom(src, 0, options.markdown)
        }
        if (old != null && old.options != options) container.removeAllViews()
        container.tag = State(src, blocks, options)

        val ctx = container.context
        var k = 0
        while (k < blocks.size) {
            val b = blocks[k]
            val existing = if (k < container.childCount) container.getChildAt(k) else null
            val fits = when (b) {
                is Block.Text -> existing is TextView
                is Block.Code, is Block.Table -> existing is CodeBlockView
            }
            if (existing != null && !fits) {
                // the shape changed from here on (rare while streaming): rebuild the rest
                while (container.childCount > k) container.removeViewAt(container.childCount - 1)
            }
            val view = if (existing != null && fits) existing else {
                val v = when (b) {
                    is Block.Text -> paragraphView(ctx, textColor)
                    else -> CodeBlockView(ctx, options)
                }
                container.addView(v, lp(MATCH, WRAP).apply { if (k > 0) topMargin = ctx.dp(if (b is Block.Text) 8 else 10) })
                v
            }
            when (b) {
                is Block.Text -> {
                    val tv = view as TextView
                    if (tv.getTag(TAG_SRC) != b.src) {
                        tv.setTag(TAG_SRC, b.src)
                        tv.text = if (options.markdown) safeParagraph(ctx, b.src) else b.src.trimEnd()
                    }
                }
                is Block.Code -> (view as CodeBlockView).bind(k, b.lang.ifEmpty { "code" }, b.code, b.closed, host)
                is Block.Table -> (view as CodeBlockView).bind(k, "table", b.text, true, host)
            }
            k++
        }
        while (container.childCount > blocks.size) container.removeViewAt(container.childCount - 1)
    }

    private val TAG_SRC = app.offlineai.chat.R.id.tag_src

    private fun paragraphView(ctx: Context, color: Int): TextView = ctx.text(color = color).apply {
        // Not selectable on purpose: a selectable text view scrolls the chat to its cursor
        // whenever its text changes. "Select text" on a message opens it where it can be selected.
        setTextIsSelectable(false)
        isFocusable = false
    }

    private fun safeParagraph(ctx: Context, src: String): CharSequence = try {
        paragraph(ctx, src)
    } catch (e: Exception) {
        src.trimEnd()
    }

    private val HEADING = Regex("^(#{1,6})\\s+(.*)$")
    private val BULLET = Regex("^[-*+]\\s+(.*)$")
    private val NUMBERED = Regex("^(\\d+[.)])\\s+(.*)$")
    private val RULE = Regex("^([-*_])\\1{2,}$")

    private fun paragraph(ctx: Context, src: String): CharSequence {
        val sb = SpannableStringBuilder()
        val lines = src.trimEnd().split('\n')
        for ((idx, raw) in lines.withIndex()) {
            if (idx > 0) sb.append('\n')
            val trimmed = raw.trimStart()
            val indent = raw.length - trimmed.length
            val lineStart = sb.length
            val heading = HEADING.find(trimmed)
            val bullet = if (heading == null) BULLET.find(trimmed) else null
            val numbered = if (heading == null && bullet == null) NUMBERED.find(trimmed) else null
            when {
                heading != null -> {
                    inline(sb, heading.groupValues[2])
                    val level = heading.groupValues[1].length
                    sb.setSpan(StyleSpan(Typeface.BOLD), lineStart, sb.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                    sb.setSpan(RelativeSizeSpan(if (level <= 1) 1.25f else if (level == 2) 1.15f else 1.05f),
                        lineStart, sb.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                }
                RULE.matches(trimmed) -> {
                    sb.append("──────────")
                    sb.setSpan(ForegroundColorSpan(Palette.borderStrong), lineStart, sb.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                }
                bullet != null -> {
                    sb.append("•  ")
                    inline(sb, bullet.groupValues[1])
                    hang(ctx, sb, lineStart, indent, "•  ")
                }
                numbered != null -> {
                    val label = numbered.groupValues[1] + " "
                    sb.append(label)
                    inline(sb, numbered.groupValues[2])
                    hang(ctx, sb, lineStart, indent, label)
                }
                trimmed.startsWith(">") -> {
                    sb.append("▎ ")
                    sb.setSpan(ForegroundColorSpan(Palette.borderStrong), lineStart, lineStart + 1, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                    val qs = sb.length
                    inline(sb, trimmed.removePrefix(">").trimStart())
                    sb.setSpan(ForegroundColorSpan(Palette.text2), qs, sb.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                }
                else -> inline(sb, trimmed)
            }
        }
        return sb
    }

    /** Wrapped lines of a list item line up under its text, not under the bullet. */
    private fun hang(ctx: Context, sb: SpannableStringBuilder, start: Int, indent: Int, label: String) {
        val paint = android.text.TextPaint().apply {
            textSize = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, 15f * Palette.fontScale, ctx.resources.displayMetrics)
        }
        val lead = ctx.dp(minOf(indent, 8) * 4)
        val labelWidth = paint.measureText(label).toInt()
        sb.setSpan(LeadingMarginSpan.Standard(lead, lead + labelWidth), start, sb.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
    }

    private fun inline(sb: SpannableStringBuilder, s: String) {
        var i = 0
        while (i < s.length) {
            val c = s[i]
            if (c == '`') {
                val end = s.indexOf('`', i + 1)
                if (end > i) {
                    val st = sb.length
                    sb.append(s, i + 1, end)
                    sb.setSpan(TypefaceSpan("monospace"), st, sb.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                    sb.setSpan(BackgroundColorSpan(Palette.surface3), st, sb.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                    sb.setSpan(ForegroundColorSpan(Palette.inlineCode), st, sb.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                    i = end + 1
                    continue
                }
            }
            if ((c == '*' || c == '_') && s.startsWith("$c$c", i)) {
                val end = s.indexOf("$c$c", i + 2)
                if (end > i + 2) {
                    val st = sb.length
                    inline(sb, s.substring(i + 2, end))
                    sb.setSpan(StyleSpan(Typeface.BOLD), st, sb.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                    i = end + 2
                    continue
                }
            }
            if (c == '~' && s.startsWith("~~", i)) {
                val end = s.indexOf("~~", i + 2)
                if (end > i + 2) {
                    val st = sb.length
                    inline(sb, s.substring(i + 2, end))
                    sb.setSpan(StrikethroughSpan(), st, sb.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                    i = end + 2
                    continue
                }
            }
            // *italic*, only when it looks like emphasis (not "2 * 3" or a bullet)
            if (c == '*' && i + 1 < s.length && !s[i + 1].isWhitespace()) {
                val end = s.indexOf('*', i + 1)
                if (end > i + 1 && !s[end - 1].isWhitespace()) {
                    val st = sb.length
                    inline(sb, s.substring(i + 1, end))
                    sb.setSpan(StyleSpan(Typeface.ITALIC), st, sb.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                    i = end + 1
                    continue
                }
            }
            // [text](link): keep the text, show where it points
            if (c == '[') {
                val close = s.indexOf("](", i + 1)
                val paren = if (close > 0) s.indexOf(')', close + 2) else -1
                if (close > i && paren > close) {
                    val st = sb.length
                    sb.append(s, i + 1, close)
                    sb.setSpan(ForegroundColorSpan(Palette.accent), st, sb.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                    val url = s.substring(close + 2, paren)
                    if (url.isNotBlank() && url != s.substring(i + 1, close)) {
                        val us = sb.length
                        sb.append(" (").append(url).append(")")
                        sb.setSpan(ForegroundColorSpan(Palette.text3), us, sb.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                    }
                    i = paren + 1
                    continue
                }
            }
            sb.append(c)
            i++
        }
    }

    // ------------------------------------------------------------------ code blocks

    /**
     * A code block: header (language, line count, fold, copy) and the code. The code is held in
     * pieces of [PIECE_LINES] lines, each an Editable: text the model adds is appended to the
     * last piece, so only that piece is measured, laid out and coloured again. One view holding
     * all the code would be measured whole on every update, which gets slower with every line
     * of a long program.
     */
    class CodeBlockView(ctx: Context, private val options: RenderOptions) : LinearLayout(ctx) {
        private val lang = ctx.text("", 12f, Palette.text3, mono = true).apply {
            maxLines = 1
            ellipsize = android.text.TextUtils.TruncateAt.END
        }
        private val fold = ctx.text("", 12f, Palette.accent, bold = true)
        private val copy = ctx.text("Copy", 12f, Palette.accent, bold = true)
        private val run = ctx.text("Run", 12f, Palette.accent, bold = true)
        private val check = ctx.text("Check", 12f, Palette.accent, bold = true)
        private val edit = ctx.text("Edit", 12f, Palette.accent, bold = true)
        private val output = OutputPanel(ctx)
        private var outputVersion = -1
        private val pieces = LinearLayout(ctx).apply { orientation = VERTICAL }
        private val more = ctx.text("", 12f, Palette.accent, bold = true)
        private var code = ""
        private var newlines = 0
        private var lines = 0
        private var language = ""

        /** Newlines in the last piece; the next one after [PIECE_LINES] lines starts a new piece. */
        private var lastNewlines = 0
        private var highlighter: CodeHighlighter? = null
        private var colourPiece = 0
        private var colourAt = 0
        private var collapsedNow = false

        init {
            orientation = VERTICAL
            background = rounded(Palette.codeBg, ctx.dp(10).toFloat(), ctx.dp(1), Palette.border)
            val header = LinearLayout(ctx).apply {
                orientation = HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(ctx.dp(12), ctx.dp(2), ctx.dp(4), 0)
            }
            header.addView(lang, lp(0, WRAP, 1f))
            for (b in listOf(run, check, edit, fold, copy)) {
                b.setPadding(ctx.dp(8), ctx.dp(10), ctx.dp(8), ctx.dp(10))
                b.background = ripple(null, ctx.dp(8).toFloat())
                header.addView(b)
            }
            for (b in listOf(run, check, edit)) b.visibility = GONE
            addView(header)
            pieces.setPadding(ctx.dp(12), ctx.dp(2), ctx.dp(12), ctx.dp(12))
            if (options.wrapCode) {
                addView(pieces, lp(MATCH, WRAP))
            } else {
                val scroll = CodeScroll(ctx)
                scroll.isHorizontalScrollBarEnabled = false
                scroll.addView(pieces, android.view.ViewGroup.LayoutParams(WRAP, WRAP))
                addView(scroll, lp(MATCH, WRAP))
            }
            more.setPadding(ctx.dp(12), 0, ctx.dp(12), ctx.dp(10))
            more.visibility = GONE
            addView(more)
            output.visibility = GONE
            addView(output, lp(MATCH, WRAP))
        }

        private fun piece(i: Int) = pieces.getChildAt(i) as TextView

        private fun newPiece(): Editable {
            val t = context.text("", 13f, Palette.text, mono = true)
            t.setTextIsSelectable(false)
            t.isFocusable = false
            // no font padding: lines meet across pieces exactly as they do inside one
            t.includeFontPadding = false
            t.setText("", TextView.BufferType.EDITABLE)
            if (!options.wrapCode) t.setHorizontallyScrolling(true)
            if (collapsedNow && pieces.childCount > 0) t.visibility = GONE
            pieces.addView(t, LayoutParams(if (options.wrapCode) MATCH else WRAP, WRAP))
            lastNewlines = 0
            return t.editableText
        }

        /** Adds code[from, to) at the end, starting new pieces as they fill up. */
        private fun append(text: String, from: Int, to: Int) {
            var ed = if (pieces.childCount == 0) newPiece() else piece(pieces.childCount - 1).editableText ?: return
            var p = from
            while (p < to) {
                var e = p
                var n = lastNewlines
                var boundary = -1
                while (e < to) {
                    if (text[e] == '\n') {
                        newlines++
                        if (n == PIECE_LINES - 1) {
                            boundary = e
                            break
                        }
                        n++
                    }
                    e++
                }
                if (boundary < 0) {
                    ed.append(text, p, to)
                    lastNewlines = n
                    return
                }
                // the newline between two pieces is the gap between the views, not text in either
                ed.append(text, p, boundary)
                ed = newPiece()
                p = boundary + 1
            }
        }

        private fun rebuild(text: String) {
            pieces.removeAllViews()
            // new pieces start unfolded; bind() folds them again if it should
            collapsedNow = false
            newlines = 0
            lastNewlines = 0
            highlighter = null
            colourPiece = 0
            colourAt = 0
            append(text, 0, text.length)
        }

        /** The code as shown, pieces joined back together (for tests). */
        internal fun shownCode(): String =
            (0 until pieces.childCount).joinToString("\n") { piece(it).text.toString() }

        fun bind(index: Int, language: String, newCode: String, closed: Boolean, host: Host) {
            if (newCode != code || language != this.language) {
                if (language != this.language) {
                    this.language = language
                    rebuild(newCode)
                } else if (newCode.startsWith(code) && code.isNotEmpty()) {
                    append(newCode, code.length, newCode.length)
                } else {
                    rebuild(newCode)
                }
                code = newCode
                lines = if (newCode.isEmpty()) 0 else newlines + 1
                val label = if (lines > 0) "$language · $lines lines" else language
                setIfChanged(lang, label)
            }
            if (options.highlight) colour(language, closed)

            val foldable = closed && lines > FOLD_LINES
            val collapsed = foldable && host.isCollapsed(index)
            fold.visibility = if (foldable) VISIBLE else GONE
            setIfChanged(fold, if (collapsed) "Expand" else "Fold")
            fold.setOnClickListener { host.toggleCollapsed(index, this) }
            if (collapsed != collapsedNow) {
                collapsedNow = collapsed
                for (i in 0 until pieces.childCount) {
                    val t = piece(i)
                    if (i == 0) t.maxLines = if (collapsed) FOLD_LINES else Int.MAX_VALUE
                    else t.visibility = if (collapsed) GONE else VISIBLE
                }
            }
            more.visibility = if (collapsed) VISIBLE else GONE
            if (collapsed) setIfChanged(more, "Show all $lines lines")
            more.setOnClickListener { host.toggleCollapsed(index, this) }
            copy.setOnClickListener { host.copy(language, code) }
            bindTools(index, language, closed, host)
        }

        /** Lua blocks: Run, Check and Edit, and what the last run or check said. */
        private fun bindTools(index: Int, language: String, closed: Boolean, host: Host) {
            val tools = host.codeTools()
            val lua = tools != null && closed && LuaTools.isLua(language)
            val state = if (lua) tools.state(index) else null
            run.visibility = if (lua) VISIBLE else GONE
            check.visibility = if (lua) VISIBLE else GONE
            edit.visibility = if (lua) VISIBLE else GONE
            if (!lua) {
                output.visibility = GONE
                outputVersion = -1
                return
            }
            setIfChanged(run, if (state?.running == true) "Stop" else "Run")
            run.setOnClickListener {
                if (state?.running == true) tools.stop() else tools.run(index, language, code, this)
            }
            check.setOnClickListener { if (state?.checking != true) tools.check(index, language, code, this) }
            edit.setOnClickListener { tools.edit(language, code) }
            if (state == null || (state.result == null && state.check == null && !state.running && !state.checking)) {
                output.visibility = GONE
                outputVersion = -1
                return
            }
            output.visibility = VISIBLE
            if (state.version != outputVersion) {
                outputVersion = state.version
                output.show(state, onFix = { tools.fix(index, language, code) }, onClose = { tools.close(index, this) },
                    onAll = { tools.toggleAll(index, this) })
            }
        }

        /** Setting a TextView's text always lays it out again, even when nothing changed. */
        private fun setIfChanged(t: TextView, s: String) {
            if (t.text.toString() != s) t.text = s
        }

        /** Colours each complete line once; the last line waits until it is finished. */
        private fun colour(language: String, closed: Boolean) {
            val h = highlighter ?: CodeHighlighter(language).also {
                highlighter = it
                colourPiece = 0
                colourAt = 0
            }
            while (colourPiece < pieces.childCount) {
                val ed = piece(colourPiece).editableText ?: return
                val isLast = colourPiece == pieces.childCount - 1
                // a piece with another after it is complete: its last line has ended
                val limit = if (!isLast || closed) ed.length else ed.lastIndexOf('\n') + 1
                var p = colourAt
                while (p < limit) {
                    var e = ed.indexOf('\n', p)
                    if (e < 0 || e > limit) e = limit
                    try {
                        h.line(ed, p, e)
                    } catch (ex: Exception) {
                        // colouring is decoration; never let it break the reply
                    }
                    p = e + 1
                }
                if (isLast) {
                    colourAt = maxOf(colourAt, minOf(limit, ed.length))
                    return
                }
                colourPiece++
                colourAt = 0
            }
        }

        companion object {
            const val FOLD_LINES = 24

            /** Lines per piece; at least [FOLD_LINES], so a folded block shows part of the first piece only. */
            const val PIECE_LINES = 64
        }
    }

    /** Under a Lua block: what a run printed (coloured by kind) or what a check found, and what to do next. */
    class OutputPanel(ctx: Context) : LinearLayout(ctx) {
        private val status = ctx.text("", 12f, Palette.text2)
        private val fix = ctx.text("Ask AI to fix", 12f, Palette.accent, bold = true)
        private val close = ctx.text("Close", 12f, Palette.text3, bold = true)
        private val body = ctx.text("", 12.5f, Palette.text, mono = true)
        private val all = ctx.text("", 12f, Palette.accent, bold = true)

        init {
            orientation = VERTICAL
            addView(View(ctx).apply { setBackgroundColor(Palette.border) }, lp(MATCH, 1))
            val row = LinearLayout(ctx).apply {
                orientation = HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(ctx.dp(12), ctx.dp(2), ctx.dp(4), 0)
            }
            row.addView(status, lp(0, WRAP, 1f))
            for (b in listOf(fix, close)) {
                b.setPadding(ctx.dp(8), ctx.dp(10), ctx.dp(8), ctx.dp(10))
                b.background = ripple(null, ctx.dp(8).toFloat())
                row.addView(b)
            }
            addView(row, lp(MATCH, WRAP))
            body.setTextIsSelectable(false)
            body.isFocusable = false
            body.setPadding(ctx.dp(12), 0, ctx.dp(12), ctx.dp(10))
            addView(body, lp(MATCH, WRAP))
            all.setPadding(ctx.dp(12), 0, ctx.dp(12), ctx.dp(10))
            addView(all)
        }

        fun show(state: BlockRun, onFix: () -> Unit, onClose: () -> Unit, onAll: () -> Unit) {
            fix.setOnClickListener { onFix() }
            close.setOnClickListener { onClose() }
            all.setOnClickListener { onAll() }
            val r = state.result
            val c = state.check
            when {
                state.running -> {
                    status.text = if (state.env == LuaEnv.ROBLOX) "Running in the Roblox test place…" else "Running…"
                    status.setTextColor(Palette.text2)
                    fix.visibility = GONE
                    body.text = ""
                    body.visibility = GONE
                    all.visibility = GONE
                    return
                }
                state.checking -> {
                    status.text = "Checking…"
                    status.setTextColor(Palette.text2)
                    fix.visibility = GONE
                    body.visibility = GONE
                    all.visibility = GONE
                    return
                }
                c != null -> {
                    status.text = Output.checkSummary(c)
                    status.setTextColor(if (c.errors > 0) Palette.danger else if (c.problems.isEmpty()) Palette.positive else Palette.caution)
                    fix.visibility = if (c.problems.isNotEmpty()) VISIBLE else GONE
                    val text = Output.checkText(c)
                    body.text = text
                    body.visibility = if (text.isEmpty()) GONE else VISIBLE
                    all.visibility = GONE
                }
                r != null -> {
                    status.text = Output.runSummary(r, state.env, state.scripts)
                    status.setTextColor(if (r.failed) Palette.danger else Palette.text2)
                    fix.visibility = if (r.failed) VISIBLE else GONE
                    val limit = if (state.showAll) Int.MAX_VALUE else Output.SHOWN_LINES
                    val text = Output.runText(r, state.env, limit)
                    body.text = text
                    body.visibility = if (text.isEmpty()) GONE else VISIBLE
                    val hidden = Output.lineCount(r) - Output.SHOWN_LINES
                    all.visibility = if (hidden > 0) VISIBLE else GONE
                    all.text = if (state.showAll) "Show less" else "Show all ${Output.lineCount(r)} lines"
                }
            }
        }
    }

    /** A horizontal scroller that never scrolls on its own to show a child's cursor or focus. */
    class CodeScroll(ctx: Context) : HorizontalScrollView(ctx) {
        override fun requestChildRectangleOnScreen(child: View, rectangle: android.graphics.Rect, immediate: Boolean) = false
    }
}

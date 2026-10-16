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
     * A code block: header (language, line count, fold, copy) and the code. The code's text is an
     * Editable, so text added while the model writes is appended, and only the new lines are
     * laid out and coloured.
     */
    class CodeBlockView(ctx: Context, private val options: RenderOptions) : LinearLayout(ctx) {
        private val lang = ctx.text("", 12f, Palette.text3, mono = true)
        private val fold = ctx.text("", 12f, Palette.accent, bold = true)
        private val copy = ctx.text("Copy", 12f, Palette.accent, bold = true)
        private val body = ctx.text("", 13f, Palette.text, mono = true)
        private val more = ctx.text("", 12f, Palette.accent, bold = true)
        private var code = ""
        private var highlighter: CodeHighlighter? = null
        private var coloredTo = 0
        private var lines = 0

        init {
            orientation = VERTICAL
            background = rounded(Palette.codeBg, ctx.dp(10).toFloat(), ctx.dp(1), Palette.border)
            val header = LinearLayout(ctx).apply {
                orientation = HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(ctx.dp(12), ctx.dp(2), ctx.dp(4), 0)
            }
            header.addView(lang, lp(0, WRAP, 1f))
            for (b in listOf(fold, copy)) {
                b.setPadding(ctx.dp(10), ctx.dp(10), ctx.dp(10), ctx.dp(10))
                b.background = ripple(null, ctx.dp(8).toFloat())
                header.addView(b)
            }
            addView(header)
            body.setTextIsSelectable(false)
            body.isFocusable = false
            body.setText("", TextView.BufferType.EDITABLE)
            body.setPadding(ctx.dp(12), ctx.dp(2), ctx.dp(12), ctx.dp(12))
            if (options.wrapCode) {
                addView(body, lp(MATCH, WRAP))
            } else {
                body.setHorizontallyScrolling(true)
                val scroll = CodeScroll(ctx)
                scroll.isHorizontalScrollBarEnabled = false
                scroll.addView(body)
                addView(scroll, lp(MATCH, WRAP))
            }
            more.setPadding(ctx.dp(12), 0, ctx.dp(12), ctx.dp(10))
            more.visibility = GONE
            addView(more)
        }

        fun bind(index: Int, language: String, newCode: String, closed: Boolean, host: Host) {
            lang.text = if (lines > 0) "$language · $lines lines" else language
            val editable = body.editableText ?: return
            if (newCode != code) {
                if (newCode.startsWith(code) && code.isNotEmpty()) {
                    editable.append(newCode, code.length, newCode.length)
                } else {
                    editable.clear()
                    editable.append(newCode)
                    highlighter = null
                    coloredTo = 0
                }
                code = newCode
                lines = if (newCode.isEmpty()) 0 else newCode.count { it == '\n' } + 1
                lang.text = "$language · $lines lines"
            }
            if (options.highlight) colour(editable, language, closed)

            val foldable = closed && lines > FOLD_LINES
            val collapsed = foldable && host.isCollapsed(index)
            fold.visibility = if (foldable) VISIBLE else GONE
            fold.text = if (collapsed) "Expand" else "Fold"
            fold.setOnClickListener { host.toggleCollapsed(index, this) }
            body.maxLines = if (collapsed) FOLD_LINES else Int.MAX_VALUE
            more.visibility = if (collapsed) VISIBLE else GONE
            more.text = "Show all $lines lines"
            more.setOnClickListener { host.toggleCollapsed(index, this) }
            copy.setOnClickListener { host.copy(language, code) }
        }

        /** Colours each complete line once; the last line waits until it is finished. */
        private fun colour(editable: Editable, language: String, closed: Boolean) {
            val h = highlighter ?: CodeHighlighter(language).also { highlighter = it; coloredTo = 0 }
            val limit = if (closed) editable.length else editable.lastIndexOf('\n') + 1
            var p = coloredTo
            while (p < limit) {
                var e = editable.indexOf('\n', p)
                if (e < 0 || e > limit) e = limit
                try {
                    h.line(editable, p, e)
                } catch (ex: Exception) {
                    // colouring is decoration; never let it break the reply
                }
                p = e + 1
            }
            coloredTo = maxOf(coloredTo, minOf(limit, editable.length))
        }

        companion object {
            const val FOLD_LINES = 24
        }
    }

    /** A horizontal scroller that never scrolls on its own to show a child's cursor or focus. */
    class CodeScroll(ctx: Context) : HorizontalScrollView(ctx) {
        override fun requestChildRectangleOnScreen(child: View, rectangle: android.graphics.Rect, immediate: Boolean) = false
    }
}

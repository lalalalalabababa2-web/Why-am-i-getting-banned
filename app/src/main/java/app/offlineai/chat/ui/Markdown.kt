package app.offlineai.chat.ui

import android.content.Context
import android.graphics.Typeface
import android.text.SpannableStringBuilder
import android.text.Spanned
import android.text.style.BackgroundColorSpan
import android.text.style.ForegroundColorSpan
import android.text.style.LeadingMarginSpan
import android.text.style.RelativeSizeSpan
import android.text.style.StrikethroughSpan
import android.text.style.StyleSpan
import android.text.style.TypefaceSpan
import android.view.Gravity
import android.view.View
import android.widget.HorizontalScrollView
import android.widget.LinearLayout
import android.widget.TextView

/**
 * Just enough Markdown for chat replies: paragraphs, headings, lists, quotes, bold, italic,
 * inline code, and fenced code blocks with a copy button. Tables are shown as monospaced
 * blocks so their columns line up.
 */
object Markdown {
    private sealed class Block {
        class Text(val lines: List<String>) : Block()
        class Code(val lang: String, val code: String) : Block()
        class Table(val text: String) : Block()
    }

    private fun parse(src: String): List<Block> {
        val out = mutableListOf<Block>()
        val lines = src.replace("\r\n", "\n").split('\n')
        val text = mutableListOf<String>()
        fun flushText() {
            if (text.isNotEmpty()) {
                out.add(Block.Text(text.toList()))
                text.clear()
            }
        }
        var i = 0
        while (i < lines.size) {
            val line = lines[i]
            val trimmed = line.trimStart()
            if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
                flushText()
                val fence = trimmed.substring(0, 3)
                val lang = trimmed.removePrefix(fence).trim()
                val code = StringBuilder()
                i++
                while (i < lines.size && !lines[i].trimStart().startsWith(fence)) {
                    if (code.isNotEmpty()) code.append('\n')
                    code.append(lines[i])
                    i++
                }
                out.add(Block.Code(lang, code.toString()))
                i++  // the closing fence (absent while a reply is still being written)
                continue
            }
            if (trimmed.startsWith("|") && trimmed.count { it == '|' } >= 2) {
                flushText()
                val rows = mutableListOf<String>()
                while (i < lines.size && lines[i].trimStart().startsWith("|")) {
                    rows.add(lines[i].trim())
                    i++
                }
                out.add(Block.Table(formatTable(rows)))
                continue
            }
            text.add(line)
            i++
        }
        flushText()
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

    fun render(container: LinearLayout, src: String, color: Int = Palette.text) {
        val ctx = container.context
        val blocks = parse(src)
        // Reuse views when the shape of the reply has not changed (the usual case while
        // streaming), so a long reply does not flicker as it grows.
        val reuse = container.childCount == blocks.size && blocks.indices.all { k ->
            val v = container.getChildAt(k)
            when (blocks[k]) {
                is Block.Text -> v is TextView
                is Block.Code, is Block.Table -> v.tag == "code"
            }
        }
        if (!reuse) container.removeAllViews()
        blocks.forEachIndexed { k, b ->
            when (b) {
                is Block.Text -> {
                    val tv = if (reuse) container.getChildAt(k) as TextView else ctx.text(color = color).apply {
                        setTextIsSelectable(true)
                        container.addView(this, lp(MATCH, WRAP).apply { if (k > 0) topMargin = dp(6) })
                    }
                    tv.text = paragraphs(ctx, b.lines)
                }
                is Block.Code -> {
                    val v = if (reuse) container.getChildAt(k) else codeView(ctx).also {
                        container.addView(it, lp(MATCH, WRAP).apply { topMargin = ctx.dp(8); bottomMargin = ctx.dp(2) })
                    }
                    bindCode(v, b.lang.ifEmpty { "code" }, b.code)
                }
                is Block.Table -> {
                    val v = if (reuse) container.getChildAt(k) else codeView(ctx).also {
                        container.addView(it, lp(MATCH, WRAP).apply { topMargin = ctx.dp(8); bottomMargin = ctx.dp(2) })
                    }
                    bindCode(v, "table", b.text)
                }
            }
        }
    }

    private fun codeView(ctx: Context): View = LinearLayout(ctx).apply {
        tag = "code"
        orientation = LinearLayout.VERTICAL
        background = rounded(Palette.codeBg, ctx.dp(10).toFloat(), ctx.dp(1), Palette.border)
        val header = LinearLayout(ctx).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(ctx.dp(12), ctx.dp(4), ctx.dp(4), 0)
        }
        header.addView(ctx.text("", 12f, Palette.text3, mono = true).apply { id = View.generateViewId(); tag = "lang" }, lp(0, WRAP, 1f))
        header.addView(ctx.text("Copy", 12f, Palette.accent, bold = true).apply {
            tag = "copy"
            setPadding(ctx.dp(10), ctx.dp(8), ctx.dp(10), ctx.dp(8))
            background = ripple(null, ctx.dp(8).toFloat())
        })
        addView(header)
        val scroll = HorizontalScrollView(ctx).apply { isHorizontalScrollBarEnabled = false }
        scroll.addView(ctx.text("", 13f, Palette.text, mono = true).apply {
            tag = "body"
            setTextIsSelectable(true)
            setHorizontallyScrolling(true)
            setPadding(ctx.dp(12), ctx.dp(2), ctx.dp(12), ctx.dp(12))
        })
        addView(scroll)
    }

    private fun bindCode(v: View, lang: String, code: String) {
        (v.findViewWithTag<TextView>("lang")).text = lang
        val body = v.findViewWithTag<TextView>("body")
        if (body.text.toString() != code) body.text = code
        v.findViewWithTag<TextView>("copy").setOnClickListener { v.context.copyText(lang, code) }
    }

    private fun paragraphs(ctx: Context, lines: List<String>): CharSequence {
        val sb = SpannableStringBuilder()
        // drop blank lines at the edges, keep single blank lines between paragraphs
        var start = 0
        var end = lines.size
        while (start < end && lines[start].isBlank()) start++
        while (end > start && lines[end - 1].isBlank()) end--
        var lastBlank = false
        for (idx in start until end) {
            val raw = lines[idx]
            if (raw.isBlank()) {
                if (!lastBlank) sb.append('\n')
                lastBlank = true
                continue
            }
            lastBlank = false
            if (sb.isNotEmpty()) sb.append('\n')
            val trimmed = raw.trimStart()
            val indent = raw.length - trimmed.length
            val lineStart = sb.length
            val heading = Regex("^(#{1,6})\\s+(.*)$").find(trimmed)
            val bullet = Regex("^[-*+]\\s+(.*)$").find(trimmed)
            val numbered = Regex("^(\\d+[.)])\\s+(.*)$").find(trimmed)
            when {
                heading != null -> {
                    inline(sb, heading.groupValues[2])
                    val level = heading.groupValues[1].length
                    sb.setSpan(StyleSpan(Typeface.BOLD), lineStart, sb.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                    sb.setSpan(RelativeSizeSpan(if (level <= 1) 1.25f else if (level == 2) 1.15f else 1.05f),
                        lineStart, sb.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                }
                trimmed.matches(Regex("^([-*_])\\1{2,}$")) -> {
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
            textSize = android.util.TypedValue.applyDimension(android.util.TypedValue.COMPLEX_UNIT_SP, 15f, ctx.resources.displayMetrics)
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
                    sb.setSpan(ForegroundColorSpan(0xFFD9DCE0.toInt()), st, sb.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
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
}

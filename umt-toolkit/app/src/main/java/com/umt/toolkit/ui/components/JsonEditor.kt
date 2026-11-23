package com.umt.toolkit.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.input.OffsetMapping
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.input.TransformedText
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.umt.toolkit.ui.theme.Mono
import com.umt.toolkit.ui.theme.Umt

/** JSON syntax colouring: keys, strings, numbers, literals, punctuation, plus a search highlight. */
object JsonHighlighter {
    private val KEY = Color(0xFF9CC3E6)
    private val STRING = Color(0xFFB5CEA8)
    private val NUMBER = Color(0xFFD7BA7D)
    private val LITERAL = Color(0xFFC586C0)
    private val PUNCT = Color(0xFF808890)
    private val MATCH_BG = Color(0x557DA3C4)

    fun highlight(text: String, query: String = ""): AnnotatedString = buildAnnotatedString {
        append(text)
        var i = 0
        val n = text.length
        while (i < n) {
            val c = text[i]
            when {
                c == '"' -> {
                    var j = i + 1
                    while (j < n && text[j] != '"') { if (text[j] == '\\') j++; j++ }
                    val end = (j + 1).coerceAtMost(n)
                    // A string followed by ':' is a key.
                    var k = end
                    while (k < n && (text[k] == ' ' || text[k] == '\t')) k++
                    val isKey = k < n && text[k] == ':'
                    addStyle(SpanStyle(color = if (isKey) KEY else STRING), i, end)
                    i = end
                }
                c == '-' || c.isDigit() -> {
                    var j = i + 1
                    while (j < n && (text[j].isDigit() || text[j] in ".eE+-")) j++
                    addStyle(SpanStyle(color = NUMBER), i, j)
                    i = j
                }
                text.startsWith("true", i) || text.startsWith("null", i) -> { addStyle(SpanStyle(color = LITERAL), i, i + 4); i += 4 }
                text.startsWith("false", i) -> { addStyle(SpanStyle(color = LITERAL), i, i + 5); i += 5 }
                c in "{}[],:" -> { addStyle(SpanStyle(color = PUNCT), i, i + 1); i++ }
                else -> i++
            }
        }
        if (query.isNotEmpty()) {
            var at = text.indexOf(query, ignoreCase = true)
            while (at >= 0) {
                addStyle(SpanStyle(background = MATCH_BG), at, at + query.length)
                at = text.indexOf(query, at + query.length, ignoreCase = true)
            }
        }
    }

    /** Turns compact JSON into indented JSON without changing any value. */
    fun format(text: String): String {
        val sb = StringBuilder()
        var indent = 0
        var inString = false
        var i = 0
        while (i < text.length) {
            val c = text[i]
            if (inString) {
                sb.append(c)
                if (c == '\\' && i + 1 < text.length) { sb.append(text[i + 1]); i++ }
                else if (c == '"') inString = false
            } else when (c) {
                '"' -> { inString = true; sb.append(c) }
                '{', '[' -> {
                    // keep empty objects/arrays on one line
                    var j = i + 1
                    while (j < text.length && text[j].isWhitespace()) j++
                    if (j < text.length && (text[j] == '}' || text[j] == ']')) { sb.append(c).append(text[j]); i = j }
                    else { indent++; sb.append(c).append('\n').append("  ".repeat(indent)) }
                }
                '}', ']' -> { indent = (indent - 1).coerceAtLeast(0); sb.append('\n').append("  ".repeat(indent)).append(c) }
                ',' -> sb.append(",\n").append("  ".repeat(indent))
                ':' -> sb.append(": ")
                ' ', '\n', '\r', '\t' -> Unit
                else -> sb.append(c)
            }
            i++
        }
        return sb.toString()
    }
}

/** Code editor: line numbers, no wrapping, horizontal scroll, JSON colouring, search highlight. */
@Composable
fun JsonCodeEditor(value: TextFieldValue, onChange: (TextFieldValue) -> Unit, query: String, errorLines: Set<Int>, modifier: Modifier = Modifier) {
    val lines = value.text.count { it == '\n' } + 1
    val transformation = VisualTransformation { t ->
        TransformedText(JsonHighlighter.highlight(t.text, query), OffsetMapping.Identity)
    }
    Row(modifier.background(Umt.Bg).padding(vertical = 6.dp)) {
        Column(Modifier.padding(start = 6.dp, end = 6.dp)) {
            for (i in 1..lines) {
                Text(
                    "$i",
                    style = Mono.copy(color = if (i in errorLines) Umt.Bad else Umt.TextFaint, textAlign = TextAlign.End),
                    modifier = Modifier.widthIn(min = 22.dp),
                )
            }
        }
        BasicTextField(
            value = value,
            onValueChange = onChange,
            textStyle = Mono.copy(color = Umt.Text),
            cursorBrush = SolidColor(Umt.Accent),
            visualTransformation = transformation,
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(end = 12.dp),
        )
    }
}

fun TextFieldValue.selectNext(query: String, backwards: Boolean = false): TextFieldValue {
    if (query.isEmpty()) return this
    val idx = if (backwards) {
        val from = selection.start - 1
        (if (from >= 0) text.lastIndexOf(query, from, ignoreCase = true) else -1).takeIf { it >= 0 }
            ?: text.lastIndexOf(query, ignoreCase = true)
    } else {
        text.indexOf(query, selection.end, ignoreCase = true).takeIf { it >= 0 } ?: text.indexOf(query, ignoreCase = true)
    }
    return if (idx < 0) this else copy(selection = TextRange(idx, idx + query.length))
}

package app.offlineai.chat.ui

import android.text.Spannable
import android.text.Spanned
import android.text.style.ForegroundColorSpan

/**
 * A small, fast syntax colourer: keywords, strings, comments and numbers, for the languages
 * models write most. It works a line at a time and carries what it was inside of (a block
 * comment, a multi-line string) from one line to the next, so a streaming code block can be
 * coloured as each line completes, without going over the earlier lines again.
 */
class CodeHighlighter(lang: String) {
    private enum class Kind { C_LIKE, HASH, MARKUP, CSS, SQL, PLAIN }

    private val kind: Kind = when (lang.lowercase().trim()) {
        "kotlin", "kt", "java", "javascript", "js", "jsx", "typescript", "ts", "tsx", "c", "cpp", "c++", "h", "hpp",
        "cs", "csharp", "go", "golang", "rust", "rs", "swift", "dart", "scala", "groovy", "gradle", "php", "json",
        "glsl", "hlsl", "lua", "zig", "objc", "objective-c", "gdscript" -> if (lang.lowercase() == "lua") Kind.SQL else Kind.C_LIKE
        "python", "py", "ruby", "rb", "sh", "bash", "zsh", "shell", "powershell", "ps1", "yaml", "yml", "toml",
        "ini", "r", "perl", "pl", "makefile", "make", "cmake", "dockerfile", "nim", "elixir", "ex" -> Kind.HASH
        "html", "xml", "svg", "vue", "svelte" -> Kind.MARKUP
        "css", "scss", "less" -> Kind.CSS
        "sql", "haskell", "hs" -> Kind.SQL
        "", "text", "txt", "plain", "code", "table", "md", "markdown" -> Kind.PLAIN
        else -> Kind.C_LIKE
    }

    /** What an unfinished construct from the previous line still needs to close, if anything. */
    private var openUntil: String? = null

    fun reset() {
        openUntil = null
    }

    /** Colours text[start, end) — one line, without its line break. */
    fun line(text: Spannable, start: Int, end: Int) {
        if (kind == Kind.PLAIN || start >= end) return
        var i = start
        val s = text
        // finish a block comment or multi-line string from earlier lines
        openUntil?.let { close ->
            val at = indexOf(s, close, i, end)
            val stop = if (at < 0) end else at + close.length
            color(text, i, stop, if (close == "\"\"\"" || close == "'''" || close == "`") Palette.synString else Palette.synComment)
            if (at < 0) return
            openUntil = null
            i = stop
        }
        while (i < end) {
            val c = s[i]
            // comments
            val lineComment = when (kind) {
                Kind.C_LIKE, Kind.CSS -> startsWith(s, "//", i, end)
                Kind.HASH -> c == '#'
                Kind.SQL -> startsWith(s, "--", i, end)
                else -> false
            }
            if (lineComment && kind != Kind.CSS) {
                color(text, i, end, Palette.synComment)
                return
            }
            val blockOpen = when (kind) {
                Kind.C_LIKE, Kind.CSS -> if (startsWith(s, "/*", i, end)) "*/" else null
                Kind.MARKUP -> if (startsWith(s, "<!--", i, end)) "-->" else null
                else -> null
            }
            if (blockOpen != null) {
                val at = indexOf(s, blockOpen, i + 2, end)
                if (at < 0) {
                    color(text, i, end, Palette.synComment)
                    openUntil = blockOpen
                    return
                }
                color(text, i, at + blockOpen.length, Palette.synComment)
                i = at + blockOpen.length
                continue
            }
            // strings
            if (c == '"' || c == '\'' || (c == '`' && kind == Kind.C_LIKE)) {
                if (kind == Kind.HASH && (startsWith(s, "\"\"\"", i, end) || startsWith(s, "'''", i, end))) {
                    val q = s.substring(i, i + 3)
                    val at = indexOf(s, q, i + 3, end)
                    if (at < 0) {
                        color(text, i, end, Palette.synString)
                        openUntil = q
                        return
                    }
                    color(text, i, at + 3, Palette.synString)
                    i = at + 3
                    continue
                }
                if (kind == Kind.MARKUP && c == '\'' ) { i++; continue }
                var j = i + 1
                while (j < end && s[j] != c) {
                    if (s[j] == '\\') j++
                    j++
                }
                if (c == '`' && j >= end) {
                    color(text, i, end, Palette.synString)
                    openUntil = "`"
                    return
                }
                val stop = minOf(end, j + 1)
                color(text, i, stop, Palette.synString)
                i = stop
                continue
            }
            // markup tags: colour the tag name
            if (kind == Kind.MARKUP && c == '<') {
                var j = i + 1
                if (j < end && (s[j] == '/' || s[j] == '!')) j++
                val nameStart = j
                while (j < end && (s[j].isLetterOrDigit() || s[j] == '-' || s[j] == ':')) j++
                if (j > nameStart) color(text, nameStart, j, Palette.synKeyword)
                i = j
                continue
            }
            // numbers
            if (c.isDigit() && (i == start || !isWordChar(s[i - 1]))) {
                var j = i + 1
                while (j < end && (s[j].isLetterOrDigit() || s[j] == '.' || s[j] == '_')) j++
                color(text, i, j, Palette.synNumber)
                i = j
                continue
            }
            // words
            if (c.isLetter() || c == '_' || c == '@' || c == '$') {
                var j = i + 1
                while (j < end && isWordChar(s[j])) j++
                val word = s.substring(i, j)
                if (kind != Kind.MARKUP && (word in KEYWORDS || (c == '@' && j > i + 1))) {
                    color(text, i, j, Palette.synKeyword)
                }
                i = j
                continue
            }
            i++
        }
    }

    private fun isWordChar(c: Char) = c.isLetterOrDigit() || c == '_'

    private fun startsWith(s: CharSequence, p: String, at: Int, end: Int): Boolean {
        if (at + p.length > end) return false
        for (k in p.indices) if (s[at + k] != p[k]) return false
        return true
    }

    private fun indexOf(s: CharSequence, p: String, from: Int, end: Int): Int {
        var k = from
        while (k + p.length <= end) {
            if (startsWith(s, p, k, end)) return k
            k++
        }
        return -1
    }

    private fun color(text: Spannable, start: Int, end: Int, color: Int) {
        if (end > start) text.setSpan(ForegroundColorSpan(color), start, end, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
    }

    companion object {
        private val KEYWORDS = hashSetOf(
            "if", "else", "for", "while", "do", "return", "break", "continue", "switch", "case", "default", "when",
            "try", "catch", "finally", "throw", "throws", "raise", "except", "with", "as", "is", "in", "not", "and", "or",
            "class", "struct", "enum", "interface", "trait", "impl", "object", "record", "type", "typealias", "namespace",
            "fun", "func", "fn", "function", "def", "lambda", "val", "var", "let", "const", "mut", "static", "final",
            "public", "private", "protected", "internal", "override", "abstract", "open", "sealed", "data", "inline",
            "import", "from", "package", "export", "use", "using", "include", "module", "require", "extends", "implements",
            "new", "delete", "this", "self", "super", "null", "nil", "None", "true", "false", "True", "False", "void",
            "int", "float", "double", "char", "bool", "boolean", "string", "String", "long", "short", "byte", "unsigned",
            "auto", "async", "await", "yield", "go", "defer", "chan", "select", "match", "where", "pub", "crate",
            "elif", "pass", "global", "nonlocal", "assert", "del", "print", "then", "end", "local", "typeof",
            "instanceof", "readonly", "virtual", "template", "typename", "constexpr", "nullptr", "goto", "extern",
            "signal", "func", "onready", "export", "extends", "@export",
        )
    }
}

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
    // by how a comment starts: // and /* (C_LIKE), # (HASH), <!-- (MARKUP), /* only (CSS), -- (SQL), ; (LISP)
    private enum class Kind { C_LIKE, HASH, MARKUP, CSS, SQL, LISP, PLAIN }

    private val kind: Kind = when (lang.lowercase().trim()) {
        "python", "py", "ruby", "rb", "sh", "bash", "zsh", "fish", "shell", "console", "powershell", "ps1", "yaml", "yml",
        "toml", "ini", "conf", "properties", "env", "dotenv", "r", "perl", "pl", "makefile", "make", "cmake", "dockerfile",
        "nim", "elixir", "ex", "exs", "gdscript", "gd", "julia", "jl", "graphql", "gql", "nix", "tcl", "awk", "crystal",
        "coffee", "coffeescript", "hcl", "terraform", "tf" -> Kind.HASH
        "html", "xml", "svg", "vue", "svelte", "xaml", "plist" -> Kind.MARKUP
        "css", "scss", "sass", "less" -> Kind.CSS
        "sql", "mysql", "postgresql", "postgres", "psql", "sqlite", "plsql", "lua", "luau", "haskell", "hs", "elm", "ada",
        "vhdl" -> Kind.SQL
        "lisp", "clojure", "clj", "scheme", "racket", "elisp", "asm", "nasm", "assembly", "x86asm", "armasm" -> Kind.LISP
        "", "text", "txt", "plain", "plaintext", "code", "table", "md", "markdown", "diff", "patch", "csv", "log" -> Kind.PLAIN
        else -> Kind.C_LIKE  // C, C++, Java, Kotlin, JavaScript, Rust, Go, Swift, C#, JSON and the like
    }

    /** C and C++ (and their shader languages): # starts a preprocessor line, not a comment. */
    private val preprocessor = lang.lowercase().trim() in setOf(
        "c", "h", "cpp", "c++", "cc", "cxx", "hpp", "hxx", "objc", "objective-c", "glsl", "hlsl", "cs", "csharp", "metal",
    )

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
        // #include, #define, #pragma: the directive is a keyword, the rest is coloured as usual
        if (preprocessor && i == start) {
            var j = i
            while (j < end && (s[j] == ' ' || s[j] == '\t')) j++
            if (j < end && s[j] == '#') {
                var w = j + 1
                while (w < end && s[w].isLetter()) w++
                color(text, j, w, Palette.synKeyword)
                i = w
            }
        }
        while (i < end) {
            val c = s[i]
            // comments
            val lineComment = when (kind) {
                Kind.C_LIKE, Kind.CSS -> startsWith(s, "//", i, end)
                Kind.HASH -> c == '#'
                Kind.SQL -> startsWith(s, "--", i, end)
                Kind.LISP -> c == ';'
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
                // an apostrophe in markup text, a quoted symbol in Lisp: not strings
                if ((kind == Kind.MARKUP || kind == Kind.LISP) && c == '\'') { i++; continue }
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

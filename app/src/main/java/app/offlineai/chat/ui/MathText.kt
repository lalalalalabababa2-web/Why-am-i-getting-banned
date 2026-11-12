package app.offlineai.chat.ui

/**
 * The LaTeX models write for maths, made readable as plain text: `$\frac{3}{4}$` becomes 3/4,
 * `x^2` x², `\times` ×, `\boxed{51}` 51. Only what is inside maths delimiters (`$…$`, `$$…$$`,
 * `\(…\)`, `\[…\]`) changes, plus a bare `\boxed{…}`; code spans in backticks are left alone,
 * and `$` that reads as money ("$5 and $10") is not taken for maths.
 */
object MathText {
    fun pretty(text: String): String {
        if ('$' !in text && '\\' !in text) return text
        val out = StringBuilder(text.length)
        var i = 0
        while (i < text.length) {
            val c = text[i]
            // code spans stay exactly as written
            if (c == '`') {
                val end = text.indexOf('`', i + 1)
                if (end > i) {
                    out.append(text, i, end + 1)
                    i = end + 1
                    continue
                }
            }
            val span = mathAt(text, i)
            if (span != null) {
                out.append(convert(text.substring(span.first, span.second)))
                i = span.third
                continue
            }
            if (text.startsWith("\\boxed{", i)) {
                val close = matching(text, i + 6)
                if (close > 0) {
                    out.append(convert(text.substring(i + 7, close)))
                    i = close + 1
                    continue
                }
            }
            out.append(c)
            i++
        }
        return out.toString()
    }

    /** A maths span starting at [i]: (start of its content, end of its content, index after it). */
    private fun mathAt(s: String, i: Int): Triple<Int, Int, Int>? {
        fun closed(open: String, close: String): Triple<Int, Int, Int>? {
            if (!s.startsWith(open, i)) return null
            val end = s.indexOf(close, i + open.length)
            return if (end > i + open.length) Triple(i + open.length, end, end + close.length) else null
        }
        closed("$$", "$$")?.let { return it }
        closed("\\[", "\\]")?.let { return it }
        closed("\\(", "\\)")?.let { return it }
        if (s[i] != '$' || (i > 0 && s[i - 1] == '\\')) return null
        // $…$ only as maths: no space just inside either sign, no digit right after the closing one,
        // and something mathematical inside, so "$5 and $10" stays money
        if (i + 1 >= s.length || s[i + 1].isWhitespace()) return null
        var j = i + 1
        while (j < s.length) {
            if (s[j] == '\n') return null
            if (s[j] == '$' && s[j - 1] != '\\') break
            j++
        }
        if (j >= s.length || s[j - 1].isWhitespace()) return null
        if (j + 1 < s.length && s[j + 1].isDigit()) return null
        val inner = s.substring(i + 1, j)
        if (inner.none { it == '\\' || it == '^' || it == '_' || it == '=' || it == '{' }) return null
        return Triple(i + 1, j, j + 1)
    }

    /** The index of the brace that closes the one at [open], or -1. */
    private fun matching(s: String, open: Int): Int {
        if (open >= s.length || s[open] != '{') return -1
        var depth = 0
        for (k in open until s.length) {
            when (s[k]) {
                '{' -> depth++
                '}' -> if (--depth == 0) return k
            }
        }
        return -1
    }

    /** The argument in braces at [at] (or the single character there): its text and the index after it. */
    private fun argument(s: String, at: Int): Pair<String, Int> {
        var k = at
        while (k < s.length && s[k] == ' ') k++
        if (k >= s.length) return "" to k
        if (s[k] == '{') {
            val close = matching(s, k)
            if (close > 0) return s.substring(k + 1, close) to close + 1
        }
        if (s[k] == '\\') {
            var e = k + 1
            while (e < s.length && s[e].isLetter()) e++
            return s.substring(k, maxOf(e, k + 2).coerceAtMost(s.length)) to maxOf(e, k + 2).coerceAtMost(s.length)
        }
        return s.substring(k, k + 1) to k + 1
    }

    /** Wraps a part of a fraction in brackets when it is more than one term. */
    private fun term(x: String): String = if (x.length <= 1 || x.all { it.isLetterOrDigit() || it == '.' }) x else "($x)"

    internal fun convert(src: String): String {
        val s = StringBuilder()
        var i = 0
        while (i < src.length) {
            val c = src[i]
            when {
                c == '\\' && i + 1 < src.length && src[i + 1].isLetter() -> {
                    var e = i + 1
                    while (e < src.length && src[e].isLetter()) e++
                    val name = src.substring(i + 1, e)
                    when (name) {
                        "frac", "dfrac", "tfrac" -> {
                            val (a, afterA) = argument(src, e)
                            val (b, afterB) = argument(src, afterA)
                            s.append(term(convert(a))).append('/').append(term(convert(b)))
                            i = afterB
                        }
                        "sqrt" -> {
                            val (a, after) = argument(src, e)
                            val x = convert(a)
                            s.append('√').append(if (x.length <= 1 || x.all { it.isLetterOrDigit() }) x else "($x)")
                            i = after
                        }
                        "boxed", "text", "textbf", "textit", "mathrm", "mathbf", "mathit", "operatorname", "mbox", "mathsf" -> {
                            val (a, after) = argument(src, e)
                            s.append(convert(a))
                            i = after
                        }
                        "mathbb" -> {
                            val (a, after) = argument(src, e)
                            s.append(BLACKBOARD[a] ?: a)
                            i = after
                        }
                        "left", "right", "big", "Big", "bigg", "Bigg", "displaystyle", "limits" -> i = e
                        else -> {
                            val known = SYMBOLS[name]
                            var k = e
                            while (k < src.length && src[k] == ' ') k++
                            if (known == null && k < src.length && src[k] == '{') {
                                // an accent or style it has no plain form for (\hat{x}, \vec{v}): its argument
                                val (a, after) = argument(src, e)
                                s.append(convert(a))
                                i = after
                            } else {
                                s.append(known ?: name)
                                i = e
                            }
                        }
                    }
                }
                c == '\\' && i + 1 < src.length -> {
                    // \, \; \! \{ \} \\ and friends
                    when (val n = src[i + 1]) {
                        ',', ';', ':', ' ' -> s.append(' ')
                        '!' -> {}
                        '\\' -> s.append(' ')
                        else -> s.append(n)
                    }
                    i += 2
                }
                c == '^' || c == '_' -> {
                    val (a, after) = argument(src, i + 1)
                    val x = convert(a)
                    val table = if (c == '^') SUPER else SUB
                    val mapped = x.map { table[it] }
                    s.append(if (x.isNotEmpty() && mapped.all { it != null }) mapped.joinToString("") else if (c == '^') "^($x)" else "_($x)")
                    i = after
                }
                c == '{' || c == '}' -> i++
                else -> {
                    s.append(c)
                    i++
                }
            }
        }
        return s.toString().replace(Regex(" {2,}"), " ").trim()
    }

    private val SUPER = mapOf(
        '0' to '⁰', '1' to '¹', '2' to '²', '3' to '³', '4' to '⁴', '5' to '⁵', '6' to '⁶', '7' to '⁷', '8' to '⁸', '9' to '⁹',
        '+' to '⁺', '-' to '⁻', '=' to '⁼', '(' to '⁽', ')' to '⁾', 'n' to 'ⁿ', 'i' to 'ⁱ', 'x' to 'ˣ', 'y' to 'ʸ',
        'a' to 'ᵃ', 'b' to 'ᵇ', 'c' to 'ᶜ', 'd' to 'ᵈ', 'e' to 'ᵉ', 'k' to 'ᵏ', 'm' to 'ᵐ', 't' to 'ᵗ', '°' to '°',
        '∘' to '°', '*' to '*', '′' to '′',
    )
    private val SUB = mapOf(
        '0' to '₀', '1' to '₁', '2' to '₂', '3' to '₃', '4' to '₄', '5' to '₅', '6' to '₆', '7' to '₇', '8' to '₈', '9' to '₉',
        '+' to '₊', '-' to '₋', '=' to '₌', '(' to '₍', ')' to '₎', 'a' to 'ₐ', 'e' to 'ₑ', 'i' to 'ᵢ', 'j' to 'ⱼ', 'k' to 'ₖ',
        'n' to 'ₙ', 'm' to 'ₘ', 'o' to 'ₒ', 'r' to 'ᵣ', 't' to 'ₜ', 'x' to 'ₓ', 'p' to 'ₚ', 's' to 'ₛ',
    )
    private val BLACKBOARD = mapOf("R" to "ℝ", "N" to "ℕ", "Z" to "ℤ", "Q" to "ℚ", "C" to "ℂ")
    private val SYMBOLS = mapOf(
        "times" to "×", "cdot" to "·", "div" to "÷", "pm" to "±", "mp" to "∓", "le" to "≤", "leq" to "≤", "ge" to "≥",
        "geq" to "≥", "neq" to "≠", "ne" to "≠", "approx" to "≈", "equiv" to "≡", "sim" to "∼", "propto" to "∝",
        "infty" to "∞", "to" to "→", "rightarrow" to "→", "Rightarrow" to "⇒", "leftarrow" to "←", "Leftarrow" to "⇐",
        "leftrightarrow" to "↔", "iff" to "⇔", "implies" to "⇒", "mapsto" to "↦", "in" to "∈", "notin" to "∉",
        "subset" to "⊂", "subseteq" to "⊆", "supset" to "⊃", "cup" to "∪", "cap" to "∩", "emptyset" to "∅",
        "varnothing" to "∅", "forall" to "∀", "exists" to "∃", "neg" to "¬", "land" to "∧", "lor" to "∨",
        "sum" to "Σ", "prod" to "Π", "int" to "∫", "oint" to "∮", "partial" to "∂", "nabla" to "∇", "degree" to "°",
        "circ" to "°", "ldots" to "…", "cdots" to "⋯", "dots" to "…", "quad" to " ", "qquad" to " ", "angle" to "∠",
        "perp" to "⊥", "parallel" to "∥", "triangle" to "△", "therefore" to "∴", "because" to "∵", "lfloor" to "⌊",
        "rfloor" to "⌋", "lceil" to "⌈", "rceil" to "⌉", "langle" to "⟨", "rangle" to "⟩", "mid" to "|", "vert" to "|",
        "alpha" to "α", "beta" to "β", "gamma" to "γ", "delta" to "δ", "epsilon" to "ε", "varepsilon" to "ε",
        "zeta" to "ζ", "eta" to "η", "theta" to "θ", "vartheta" to "ϑ", "iota" to "ι", "kappa" to "κ", "lambda" to "λ",
        "mu" to "μ", "nu" to "ν", "xi" to "ξ", "pi" to "π", "rho" to "ρ", "sigma" to "σ", "tau" to "τ", "upsilon" to "υ",
        "phi" to "φ", "varphi" to "φ", "chi" to "χ", "psi" to "ψ", "omega" to "ω", "Gamma" to "Γ", "Delta" to "Δ",
        "Theta" to "Θ", "Lambda" to "Λ", "Xi" to "Ξ", "Pi" to "Π", "Sigma" to "Σ", "Phi" to "Φ", "Psi" to "Ψ",
        "Omega" to "Ω", "log" to "log", "ln" to "ln", "sin" to "sin", "cos" to "cos", "tan" to "tan", "lim" to "lim",
        "max" to "max", "min" to "min", "exp" to "exp",
    )
}

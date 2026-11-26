package app.offlineai.chat.data

import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLDecoder
import java.net.URLEncoder
import java.nio.charset.Charset
import java.text.DateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.Callable
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

/** A page the web search found: shown under your message, and numbered [1], [2]... for the model. */
data class WebSource(val title: String, val url: String) {
    val domain: String get() = runCatching { URL(url).host.removePrefix("www.") }.getOrDefault(url)
}

/**
 * What a web search gave the model: the [query], the pages it came from, and [context], the text
 * that goes in front of your message (the pages' passages that match it, numbered like [sources]).
 */
class WebResult(val query: String, val sources: List<WebSource>, val context: String, val error: String? = null)

/**
 * Web search for a message, only when you turn it on (the globe in the message box). The query
 * goes to DuckDuckGo (or Brave Search with your key, or your own SearXNG server; Wikipedia when
 * that gives nothing); the top pages are downloaded and
 * read here on the phone, and their passages that match the question are kept, up to a budget
 * that fits the model's context. Nothing else leaves the phone: no account, no history, no
 * cookies kept. Blocking: call it off the main thread.
 */
object WebSearch {
    private const val UA = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36"
    // what Wikipedia asks API clients to say they are (no person's details)
    private const val APP_UA = "NyxOfflineAI/1.0 (Android app; on-device assistant)"
    private const val PAGES = 6          // pages read
    private const val RESULTS = 10       // results looked at (their snippets count too)
    private const val MAX_PAGE = 1_500_000

    /**
     * Searches for [query], reads the top pages and keeps, across all of them and the results'
     * snippets, the passages that best answer it, up to about [budget] characters (a few hundred
     * tokens: the model reads all of it before it writes). [status] hears what it is doing;
     * [cancelled] stops it early (the result is then empty).
     */
    fun run(query: String, budget: Int, engine: Engine, cancelled: AtomicBoolean, status: (String) -> Unit): WebResult {
        val q = query.replace(Regex("\\s+"), " ").trim().take(300)
        if (q.isEmpty()) return WebResult(q, emptyList(), "", "Nothing to search for.")
        status("Searching the web…")
        var why: String? = null
        val sq = searchable(q)
        var hits = runCatching { engine.search(sq) }.getOrElse { why = it.message; emptyList() }
        // DuckDuckGo sometimes asks a busy network to prove it is a person: its lite page, then
        // Wikipedia, before giving up
        if (hits.isEmpty() && engine is Engine.DuckDuckGo && !cancelled.get()) hits = runCatching { duckDuckGoLite(sq) }.getOrDefault(emptyList())
        if (hits.isEmpty() && !cancelled.get()) hits = runCatching { wikipedia(sq) }.getOrDefault(emptyList())
        if (cancelled.get()) return WebResult(q, emptyList(), "")
        if (hits.isEmpty()) {
            return WebResult(q, emptyList(), "", "The web search found nothing" + (why?.let { " ($it)" } ?: "") + ". Is the phone online?")
        }
        hits = hits.take(RESULTS)

        val reading = hits.take(PAGES)
        status("Reading ${reading.size} page${if (reading.size == 1) "" else "s"}…")
        val pool = Executors.newFixedThreadPool(reading.size)
        val texts: List<String> = try {
            val futures = reading.map { h -> pool.submit(Callable { runCatching { pageText(fetch(h.url)) }.getOrDefault("") }) }
            val deadline = System.currentTimeMillis() + 10_000
            futures.map { f ->
                val left = deadline - System.currentTimeMillis()
                if (cancelled.get() || left <= 0) "" else runCatching { f.get(left, TimeUnit.MILLISECONDS) }.getOrDefault("")
            }
        } finally {
            pool.shutdownNow()
        }
        if (cancelled.get()) return WebResult(q, emptyList(), "")

        // every snippet and every short passage of every page, ranked together
        val cands = ArrayList<Passage>()
        hits.forEachIndexed { i, h -> if (h.snippet.length >= 30) cands += Passage(i, h.snippet, snippet = true) }
        texts.forEachIndexed { i, t -> chunks(t).forEach { cands += Passage(i, it) } }
        val picked = rank(cands, terms(q), budget, q)
        if (picked.isEmpty()) return WebResult(q, emptyList(), "", "The pages found did not say anything about it.")

        // the sources the passages come from, numbered in the search's order
        val used = picked.map { it.hit }.distinct().sorted()
        val date = DateFormat.getDateInstance(DateFormat.MEDIUM, Locale.US).format(Date())
        val sb = StringBuilder("Web results ($date):")
        used.forEachIndexed { n, i ->
            sb.append("\n[").append(n + 1).append("] ").append(hits[i].source.domain).append(": ")
            sb.append(picked.filter { it.hit == i }.sortedBy { it.order }.joinToString(" … ") { it.text })
        }
        return WebResult(q, used.map { hits[it].source }, sb.toString())
    }

    /** The text that goes before your message for the model, around the search's [context]. */
    fun prompt(context: String, message: String): String =
        context.trim() + "\n\nAnswer with these results, citing them like [1]. Do not list the sources at the end " +
            "(they are shown). If they do not cover it, say so in a few words.\n\n" + message

    /** A question as a search: the asking words ("can you tell me", "search for") left out. */
    fun searchable(q: String): String {
        val t = q.replace(Regex("(?i)^(please\\s+)?(can|could|would) you\\s+(please\\s+)?|^(please\\s+)?(tell me|search( the web)?( for)?|look up|find( out)?|google)\\s+"), "")
        return t.trim().trimEnd('?', '.', '!').ifBlank { q }
    }

    /** A passage that could go to the model: from result [hit] (its page or its snippet). */
    class Passage(val hit: Int, val text: String, val snippet: Boolean = false) {
        var order = 0
        var score = 0.0
    }

    /**
     * A page's text cut into short passages: sentences joined up to about 240 characters, within
     * a paragraph; lines that are menus, cookie notices and the like left out.
     */
    fun chunks(text: String): List<String> {
        val out = ArrayList<String>()
        for (para in text.lines()) {
            val p = para.trim()
            if (p.length < 40 || boilerplate(p)) continue
            val sentences = p.split(Regex("(?<=[.!?])\\s+(?=[\"“(\\p{Lu}\\p{N}])"))
            val cur = StringBuilder()
            for (s in sentences) {
                if (cur.isNotEmpty() && cur.length + s.length > 240) {
                    out += cur.toString()
                    cur.setLength(0)
                }
                if (cur.isNotEmpty()) cur.append(' ')
                cur.append(if (s.length > 320) s.take(320).substringBeforeLast(' ') + "…" else s)
            }
            if (cur.length >= 40) out += cur.toString()
        }
        return out
    }

    /**
     * The passages that best answer a question with [terms], up to [budget] characters: BM25
     * scores (a word rare among the passages counts more, a long passage less), more for holding
     * more of the question's words, a little more for the search's own snippets; no two that say
     * nearly the same, at most three from one page. In page order within a source.
     */
    fun rank(cands: List<Passage>, terms: Set<String>, budget: Int, query: String = ""): List<Passage> {
        if (cands.isEmpty()) return emptyList()
        cands.forEachIndexed { i, c -> c.order = i }
        val words = cands.map { words(it.text) }
        if (terms.isEmpty()) return cands.filter { it.snippet }.take(3)
        val df = terms.associateWith { t -> words.count { w -> w.any { matches(it, t) } } }
        val n = cands.size.toDouble()
        val avg = words.sumOf { it.size }.toDouble() / cands.size
        val wantsNumbers = Regex("(?i)\\b(when|date|year|how (much|many|long|old|big|far)|price|cost|release|score|time)\\b")
            .containsMatchIn(query)
        for ((i, c) in cands.withIndex()) {
            val w = words[i]
            var sc = 0.0
            var held = 0
            for (t in terms) {
                val tf = w.count { matches(it, t) }
                if (tf == 0) continue
                held++
                val idf = Math.log(1.0 + (n - df.getValue(t) + 0.5) / (df.getValue(t) + 0.5))
                sc += idf * tf * 2.2 / (tf + 1.2 * (0.25 + 0.75 * w.size / avg))
            }
            sc *= 1.0 + held.toDouble() / terms.size
            if (c.snippet) sc *= 1.15
            if (wantsNumbers && c.text.any { it.isDigit() }) sc *= 1.2
            c.score = sc
        }
        // a passage that only shares a common word with the question (the place, the name) is left
        // out: it must score at least a third of the best one
        val floor = (cands.maxOf { it.score }) * 0.35
        val chosen = ArrayList<Passage>()
        val perHit = HashMap<Int, Int>()
        var used = 0
        for (c in cands.filter { it.score > 0 && it.score >= floor }.sortedByDescending { it.score }) {
            if (used + c.text.length > budget) continue
            if ((perHit[c.hit] ?: 0) >= 3) continue
            val cw = words(c.text).toSet()
            if (chosen.any { similar(cw, words(it.text).toSet()) }) continue
            chosen += c
            perHit[c.hit] = (perHit[c.hit] ?: 0) + 1
            used += c.text.length + 8
        }
        return chosen
    }

    private fun words(s: String) = s.lowercase(Locale.ROOT).split(Regex("[^\\p{L}\\p{N}]+")).filter { it.isNotEmpty() }

    /** A word of a passage counts for a question's word when it is that word or starts with it ("release", "released"). */
    private fun matches(word: String, term: String) = word == term || (term.length >= 4 && word.startsWith(term))

    private fun similar(a: Set<String>, b: Set<String>): Boolean {
        if (a.isEmpty() || b.isEmpty()) return false
        val inter = a.count { it in b }
        return inter.toDouble() / (a.size + b.size - inter) > 0.5
    }

    // ------------------------------------------------------------------ search engines

    class Hit(val title: String, val url: String, val snippet: String) {
        val source get() = WebSource(title, url)
    }

    /** Where the search goes (Settings, Web search). */
    sealed class Engine {
        abstract fun search(q: String): List<Hit>

        /** DuckDuckGo's plain HTML results page: no account, no key. */
        object DuckDuckGo : Engine() {
            override fun search(q: String) = duckDuckGo(q)
        }

        /** Brave Search's API with your own key (free for 2,000 searches a month). */
        class Brave(private val key: String) : Engine() {
            override fun search(q: String): List<Hit> {
                val json = fetch("https://api.search.brave.com/res/v1/web/search?count=$RESULTS&q=" + URLEncoder.encode(q, "UTF-8"),
                    mapOf("X-Subscription-Token" to key, "Accept" to "application/json"))
                return parseBrave(json)
            }
        }

        /** Your own SearXNG server (its JSON results switched on). */
        class SearXNG(private val base: String) : Engine() {
            override fun search(q: String): List<Hit> =
                parseSearXNG(fetch(base.trimEnd('/') + "/search?format=json&q=" + URLEncoder.encode(q, "UTF-8")))
        }
    }

    fun parseBrave(json: String): List<Hit> {
        val arr = org.json.JSONObject(json).optJSONObject("web")?.optJSONArray("results") ?: return emptyList()
        return (0 until arr.length()).map { arr.getJSONObject(it) }
            .map { Hit(clean(it.optString("title")), it.optString("url"), clean(it.optString("description"))) }
            .filter { it.url.startsWith("http") }
    }

    fun parseSearXNG(json: String): List<Hit> {
        val arr = org.json.JSONObject(json).optJSONArray("results") ?: return emptyList()
        return (0 until arr.length()).map { arr.getJSONObject(it) }
            .map { Hit(clean(it.optString("title")), it.optString("url"), clean(it.optString("content"))) }
            .filter { it.url.startsWith("http") }
    }

    /** DuckDuckGo's plain HTML results page (no script, no account). Ads are left out. */
    fun duckDuckGo(q: String): List<Hit> {
        val html = fetch("https://html.duckduckgo.com/html/?q=" + URLEncoder.encode(q, "UTF-8"))
        if (challenged(html)) throw java.io.IOException("DuckDuckGo asked for a check that a person is searching")
        return parseDuckDuckGo(html)
    }

    /** DuckDuckGo's even plainer page, which a busy network is sometimes let through to. */
    fun duckDuckGoLite(q: String): List<Hit> {
        val html = fetch("https://lite.duckduckgo.com/lite/?q=" + URLEncoder.encode(q, "UTF-8"))
        if (challenged(html)) throw java.io.IOException("DuckDuckGo asked for a check that a person is searching")
        return parseDuckDuckGo(html)
    }

    private fun challenged(html: String) = html.contains("bots use DuckDuckGo too") || html.contains("anomaly-modal")

    /**
     * Results from DuckDuckGo's HTML page (links of class result__a, snippets result__snippet) or
     * its lite page (result-link, result-snippet), whichever order the attributes come in.
     */
    fun parseDuckDuckGo(html: String): List<Hit> {
        val tag = Regex("""<a\b([^>]*)>(.*?)</a>""", setOf(RegexOption.DOT_MATCHES_ALL, RegexOption.IGNORE_CASE))
        val isLink = Regex("""class\s*=\s*["'][^"']*\b(result__a|result-link)\b""")
        val href = Regex("""href\s*=\s*["']([^"']+)["']""")
        val snip = Regex("""class\s*=\s*["'][^"']*\b(?:result__snippet|result-snippet)\b[^"']*["'][^>]*>(.*?)</(?:a|div|td|span)>""",
            setOf(RegexOption.DOT_MATCHES_ALL, RegexOption.IGNORE_CASE))
        val links = tag.findAll(html).filter { isLink.containsMatchIn(it.groupValues[1]) }.toList()
        val out = ArrayList<Hit>()
        for ((i, m) in links.withIndex()) {
            val raw = href.find(m.groupValues[1])?.groupValues?.get(1) ?: continue
            val url = ddgTarget(decodeEntities(raw)) ?: continue
            if (url.contains("duckduckgo.com/y.js") || url.contains("duckduckgo.com/?q=") || out.any { it.url == url }) continue  // an ad, or seen
            val end = if (i + 1 < links.size) links[i + 1].range.first else html.length
            val s = snip.find(html.substring(m.range.last + 1, end))?.groupValues?.get(1) ?: ""
            val title = clean(m.groupValues[2])
            if (title.isEmpty()) continue
            out += Hit(title, url, clean(s))
        }
        return out
    }

    /** The page a DuckDuckGo result link leads to (its links go through /l/?uddg=...). */
    private fun ddgTarget(href: String): String? {
        val h = if (href.startsWith("//")) "https:$href" else href
        val uddg = Regex("""[?&]uddg=([^&]+)""").find(h)?.groupValues?.get(1)
        val url = if (uddg != null) URLDecoder.decode(uddg, "UTF-8") else h
        return url.takeIf { it.startsWith("http://") || it.startsWith("https://") }
    }

    /** Wikipedia's own search, when DuckDuckGo gives nothing (blocked, or no results). */
    fun wikipedia(q: String): List<Hit> {
        val json = fetch("https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&utf8=1&srlimit=4&srsearch=" +
            URLEncoder.encode(q, "UTF-8"), mapOf("User-Agent" to APP_UA))
        val arr = org.json.JSONObject(json).optJSONObject("query")?.optJSONArray("search") ?: return emptyList()
        return (0 until arr.length()).map { i ->
            val o = arr.getJSONObject(i)
            val title = o.optString("title")
            Hit(title, "https://en.wikipedia.org/wiki/" + URLEncoder.encode(title.replace(' ', '_'), "UTF-8").replace("%2F", "/"),
                clean(o.optString("snippet")))
        }
    }

    // ------------------------------------------------------------------ pages

    /** A page as text (HTML or plain text only), up to [MAX_PAGE] bytes, with redirects followed. */
    fun fetch(url: String, headers: Map<String, String> = emptyMap()): String {
        var u = URL(url)
        repeat(5) {
            val c = (u.openConnection() as HttpURLConnection).apply {
                connectTimeout = 6000
                readTimeout = 6000
                instanceFollowRedirects = false
                useCaches = false
                setRequestProperty("User-Agent", UA)
                setRequestProperty("Accept", "text/html,application/xhtml+xml,application/json,text/plain;q=0.9,*/*;q=0.5")
                setRequestProperty("Accept-Language", "en;q=0.9")
                for ((k, v) in headers) setRequestProperty(k, v)
            }
            try {
                val code = c.responseCode
                if (code in 300..399) {
                    val loc = c.getHeaderField("Location") ?: throw java.io.IOException("redirect without a location")
                    u = URL(u, loc)
                    return@repeat
                }
                if (code !in 200..299) throw java.io.IOException("HTTP $code")
                val type = c.contentType?.lowercase(Locale.US) ?: ""
                if (type.isNotEmpty() && !type.contains("html") && !type.contains("text") && !type.contains("json")) {
                    throw java.io.IOException("not a page: $type")
                }
                val bytes = c.inputStream.use { input ->
                    val out = ByteArrayOutputStream()
                    val buf = ByteArray(16 * 1024)
                    while (out.size() < MAX_PAGE) {
                        val n = input.read(buf)
                        if (n < 0) break
                        out.write(buf, 0, n)
                    }
                    out.toByteArray()
                }
                return String(bytes, charsetOf(type, bytes))
            } finally {
                c.disconnect()
            }
        }
        throw java.io.IOException("too many redirects")
    }

    private fun charsetOf(type: String, bytes: ByteArray): Charset {
        val name = Regex("charset=([\\w-]+)").find(type)?.groupValues?.get(1)
            ?: Regex("""<meta[^>]+charset=["']?([\w-]+)""", RegexOption.IGNORE_CASE)
                .find(String(bytes, 0, minOf(bytes.size, 4096), Charsets.ISO_8859_1))?.groupValues?.get(1)
        return runCatching { Charset.forName(name ?: "UTF-8") }.getOrDefault(Charsets.UTF_8)
    }

    /** The readable text of a page, one paragraph a line: scripts, menus, headers and footers left out. */
    fun pageText(html: String): String {
        var h = html
        h = Regex("(?is)<(script|style|noscript|svg|head|nav|footer|header|aside|form|iframe|template|button|select)\\b.*?</\\1\\s*>").replace(h, " ")
        h = Regex("(?s)<!--.*?-->").replace(h, " ")
        h = Regex("(?i)<(?:br|/?p|/?div|/?li|/?h[1-6]|/?tr|/?section|/?article|/?blockquote|/?pre|/?ul|/?ol|/?table|/?dd|/?dt)\\b[^>]*>").replace(h, "\n")
        h = Regex("(?s)<[^>]*>").replace(h, " ")
        h = decodeEntities(h)
        return h.lineSequence()
            .map { it.replace(Regex("[ \\t\\u00A0\\r]+"), " ").trim() }
            .filter { it.isNotEmpty() }
            .joinToString("\n")
    }

    private fun boilerplate(p: String): Boolean {
        val low = p.lowercase(Locale.ROOT)
        return listOf("cookie", "javascript", "subscribe", "sign up", "log in", "all rights reserved", "privacy policy")
            .any { low.contains(it) } && p.length < 300
    }

    private val STOP = setOf(
        "the", "and", "for", "are", "but", "not", "you", "all", "any", "can", "had", "her", "was", "one", "our", "out",
        "has", "his", "how", "its", "may", "new", "now", "see", "who", "did", "does", "get", "got", "let", "say", "she",
        "too", "use", "what", "when", "where", "which", "why", "with", "this", "that", "from", "have", "will", "your",
        "about", "would", "could", "should", "there", "their", "them", "they", "then", "than", "into", "some", "more",
        "tell", "know", "please", "give", "find", "search", "explain", "best", "much", "many", "also", "just", "like",
    )

    /** The words of a question worth looking for in a page. */
    fun terms(q: String): Set<String> =
        q.lowercase(Locale.ROOT).split(Regex("[^\\p{L}\\p{N}]+")).filter { it.length >= 3 && it !in STOP }.toSet()

    private fun clean(html: String): String =
        decodeEntities(html.replace(Regex("(?s)<[^>]*>"), "")).replace(Regex("\\s+"), " ").trim()

    private val NAMED = mapOf(
        "amp" to "&", "lt" to "<", "gt" to ">", "quot" to "\"", "apos" to "'", "nbsp" to " ", "ndash" to "–",
        "mdash" to "—", "hellip" to "…", "lsquo" to "‘", "rsquo" to "’", "ldquo" to "“", "rdquo" to "”",
        "copy" to "©", "reg" to "®", "deg" to "°", "middot" to "·", "bull" to "•", "eacute" to "é", "times" to "×",
    )

    /** &amp;, &#39;, &#x27; and the common named entities. */
    fun decodeEntities(s: String): String = Regex("&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);").replace(s) { m ->
        val e = m.groupValues[1]
        when {
            e.startsWith("#x") || e.startsWith("#X") -> e.substring(2).toIntOrNull(16)?.let { String(java.lang.Character.toChars(it)) } ?: m.value
            e.startsWith("#") -> e.substring(1).toIntOrNull()?.takeIf { it in 1..0x10FFFF }?.let { String(java.lang.Character.toChars(it)) } ?: m.value
            else -> NAMED[e] ?: m.value
        }
    }
}

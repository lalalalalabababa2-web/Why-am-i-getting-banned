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
    private const val PAGES = 3          // pages read in full
    private const val RESULTS = 6        // results listed (their snippets)
    private const val MAX_PAGE = 1_500_000

    /**
     * Searches for [query] and reads the top pages, keeping about [budget] characters for the model.
     * [status] hears what it is doing ("Searching the web…", "Reading 3 pages…"); [cancelled]
     * stops it early (the result is then empty).
     */
    fun run(query: String, budget: Int, engine: Engine, cancelled: AtomicBoolean, status: (String) -> Unit): WebResult {
        val q = query.replace(Regex("\\s+"), " ").trim().take(300)
        if (q.isEmpty()) return WebResult(q, emptyList(), "", "Nothing to search for.")
        status("Searching the web…")
        var why: String? = null
        var hits = runCatching { engine.search(q) }.getOrElse { why = it.message; emptyList() }
        // DuckDuckGo sometimes asks a busy network to prove it is a person: its lite page, then
        // Wikipedia, before giving up
        if (hits.isEmpty() && engine is Engine.DuckDuckGo && !cancelled.get()) hits = runCatching { duckDuckGoLite(q) }.getOrDefault(emptyList())
        if (hits.isEmpty() && !cancelled.get()) hits = runCatching { wikipedia(q) }.getOrDefault(emptyList())
        if (cancelled.get()) return WebResult(q, emptyList(), "")
        if (hits.isEmpty()) {
            return WebResult(q, emptyList(), "", "The web search found nothing" + (why?.let { " ($it)" } ?: "") + ". Is the phone online?")
        }
        hits = hits.take(RESULTS)

        val reading = hits.take(PAGES)
        status("Reading ${reading.size} page${if (reading.size == 1) "" else "s"}…")
        val terms = terms(q)
        val perPage = (budget * 0.8 / reading.size).toInt().coerceAtLeast(400)
        val pool = Executors.newFixedThreadPool(reading.size)
        val texts: List<String> = try {
            val futures = reading.map { h -> pool.submit(Callable { runCatching { passages(pageText(fetch(h.url)), terms, perPage) }.getOrDefault("") }) }
            val deadline = System.currentTimeMillis() + 12_000
            futures.map { f ->
                val left = deadline - System.currentTimeMillis()
                if (cancelled.get() || left <= 0) "" else runCatching { f.get(left, TimeUnit.MILLISECONDS) }.getOrDefault("")
            }
        } finally {
            pool.shutdownNow()
        }
        if (cancelled.get()) return WebResult(q, emptyList(), "")

        val date = DateFormat.getDateInstance(DateFormat.LONG, Locale.US).format(Date())
        val sb = StringBuilder("Web search results for \"$q\" (searched $date):\n")
        hits.forEachIndexed { i, h ->
            sb.append("\n[").append(i + 1).append("] ").append(h.title).append(" (").append(h.source.domain).append(")\n")
            val body = texts.getOrNull(i)?.takeIf { it.isNotBlank() } ?: h.snippet
            if (body.isNotBlank()) sb.append(body.trim()).append('\n')
        }
        return WebResult(q, hits.map { it.source }, sb.toString().take(budget + 2000))
    }

    /** The text that goes before your message for the model, around the search's [context]. */
    fun prompt(context: String, message: String): String =
        context.trim() + "\n\nAnswer the message below. Use the web results above where they help and cite them " +
            "by number, like [1]. If they do not answer it, say so and answer from what you know.\n\n" + message

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

    /**
     * The passages of [text] that match the question, in page order, up to [budget] characters:
     * paragraphs of 40 characters or more, scored by how many of the question's words they hold.
     */
    fun passages(text: String, terms: Set<String>, budget: Int): String {
        val paras = text.lines().map { it.trim() }.filter { it.length >= 40 && !boilerplate(it) }
        if (paras.isEmpty()) return ""
        val hits = paras.map { p -> p.lowercase(Locale.ROOT).let { low -> terms.count { low.contains(it) } } }
        // paragraphs holding the question's words, the opening ones first among equals (they say
        // what the page is about); a page with none of them gives its opening paragraphs
        val anyHit = hits.any { it > 0 }
        val scored = paras.mapIndexed { i, p -> Triple(i, p, if (anyHit) hits[i] * 10 + (if (i < 3) 3 else 0) - i / 50 else -i) }
            .filter { !anyHit || hits[it.first] > 0 }
        val chosen = HashMap<Int, String>()
        var used = 0
        for ((i, p, _) in scored.sortedByDescending { it.third }) {
            val room = budget - used
            if (room < 40) break
            val take = if (p.length > room) p.take(room).substringBeforeLast(' ') + "…" else p
            if (take.length < 40) continue
            chosen[i] = take
            used += take.length + 1
        }
        return chosen.keys.sorted().joinToString("\n") { chosen.getValue(it) }
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
            e.startsWith("#x") || e.startsWith("#X") -> e.substring(2).toIntOrNull(16)?.let { String(Character.toChars(it)) } ?: m.value
            e.startsWith("#") -> e.substring(1).toIntOrNull()?.takeIf { it in 1..0x10FFFF }?.let { String(Character.toChars(it)) } ?: m.value
            else -> NAMED[e] ?: m.value
        }
    }
}

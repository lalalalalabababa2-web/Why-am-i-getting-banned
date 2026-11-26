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
    private const val MAX_PAGE = 800_000  // most pages have their text well before this

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
        val sq = corrected(keywords(q))
        // the free engines together (DuckDuckGo and Bing at once, merged); else the one set
        var hits = runCatching { if (engine is Engine.DuckDuckGo) both(sq) else engine.search(sq) }.getOrElse { why = it.message; emptyList() }
        // DuckDuckGo sometimes asks a busy network to prove it is a person: its lite page, then
        // Wikipedia, before giving up
        if (hits.isEmpty() && !cancelled.get()) hits = runCatching { duckDuckGoLite(sq) }.getOrDefault(emptyList())
        if (hits.isEmpty() && !cancelled.get()) hits = runCatching { wikipedia(sq) }.getOrDefault(emptyList())
        if (cancelled.get()) return WebResult(q, emptyList(), "")
        if (hits.isEmpty()) {
            return WebResult(q, emptyList(), "", "The web search found nothing" + (why?.let { " ($it)" } ?: "") + ". Is the phone online?")
        }
        hits = hits.take(RESULTS)

        // pages from different sites (one each), leaving out ones with no text to read (videos, social)
        val seen = HashSet<String>()
        val reading = hits.withIndex().filter { (_, h) -> readable(h.url) && seen.add(h.source.domain) }.take(PAGES)
        status("Reading ${reading.size} page${if (reading.size == 1) "" else "s"}…")
        val pool = Executors.newFixedThreadPool(maxOf(1, reading.size))
        val texts: List<String> = try {
            val futures = reading.map { (_, h) -> pool.submit(Callable { runCatching { pageText(fetch(h.url, quick = true)) }.getOrDefault("") }) }
            val byHit = HashMap<Int, String>()
            val deadline = System.currentTimeMillis() + 7_000
            futures.forEachIndexed { k, f ->
                val left = deadline - System.currentTimeMillis()
                byHit[reading[k].index] = if (cancelled.get() || left <= 0) "" else runCatching { f.get(left, TimeUnit.MILLISECONDS) }.getOrDefault("")
            }
            hits.indices.map { byHit[it] ?: "" }
        } finally {
            pool.shutdownNow()
        }
        if (cancelled.get()) return WebResult(q, emptyList(), "")

        // every snippet and every short passage of every page, ranked together
        val cands = ArrayList<Passage>()
        hits.forEachIndexed { i, h -> if (h.snippet.length >= 30) cands += Passage(i, h.snippet, snippet = true) }
        texts.forEachIndexed { i, t -> chunks(t).forEach { cands += Passage(i, it) } }
        val picked = rank(cands, terms(q + " " + sq), budget, q, core = terms(sq))
        if (picked.isEmpty()) {
            // nothing in the pages held enough of the question's words (a misspelt name the engines
            // corrected, a shopping question): the engines' own top results, which they matched
            // (a result whose title has none of the search's words is an engine's guess: a store's
            // front page, a dictionary entry)
            val core = terms(sq)
            val top = hits.withIndex().filter { (_, h) ->
                h.snippet.length >= 30 && (core.isEmpty() || words(h.title).any { w -> core.any { matches(w, it) } })
            }.take(3)
            if (top.isEmpty()) return WebResult(q, emptyList(), "", "The pages found did not say anything about it.")
            val date = DateFormat.getDateInstance(DateFormat.MEDIUM, Locale.US).format(Date())
            val sb = StringBuilder("Web results (searched today, $date):")
            top.forEachIndexed { n, (_, h) ->
                sb.append("\n[").append(n + 1).append("] ").append(h.source.domain).append(": ").append(h.title).append(". ").append(h.snippet)
            }
            return WebResult(q, top.map { it.value.source }, sb.toString().take(budget + 200))
        }

        // the sources the passages come from, numbered in the search's order
        val used = picked.map { it.hit }.distinct().sorted()
        val date = DateFormat.getDateInstance(DateFormat.MEDIUM, Locale.US).format(Date())
        val sb = StringBuilder("Web results (searched today, $date):")
        used.forEachIndexed { n, i ->
            sb.append("\n[").append(n + 1).append("] ").append(hits[i].source.domain).append(": ")
            sb.append(picked.filter { it.hit == i }.sortedBy { it.order }.joinToString(" … ") { it.text })
        }
        return WebResult(q, used.map { hits[it].source }, sb.toString())
    }

    /** The text that goes before your message for the model, around the search's [context]. */
    fun prompt(context: String, message: String): String =
        message + "\n\n" + context.trim() + "\n\nAnswer the message above from these web results. They are from " +
            "today and newer than your training: where they differ from what you remember, they are right. Cite them " +
            "like [1], do not list them at the end, give only links that appear in them, and if they do not cover " +
            "it, say so in a few words."

    /**
     * Whether a message needs a web search when search is on Auto: it asks about something that
     * changes or that the model may have wrong (newest, price, release, news, a year, a name and
     * a question), or doubts an answer that came from a search ("you sure?", "it's out already").
     * Writing, coding and small talk do not.
     */
    /**
     * A reply that says it does not know, cannot look it up, or knows only up to its training: on
     * Auto it is searched and written again.
     */
    fun unsure(reply: String): Boolean = UNSURE.containsMatchIn(reply.take(1500))

    private val UNSURE = Regex(
        "(?i)\\b(as of my (last|latest|most recent) (update|knowledge|training)|my (knowledge|training)( data)? " +
            "(cutoff|cut-off|only goes|is limited|ends)|i (do not|don't|cannot|can't) (have|access) (real-time|current|live|up-to-date)|" +
            "i (do not|don't|cannot|can't) (browse|search) (the )?(internet|web)|i'?m not (sure|certain|aware)|i am not (sure|certain|aware)|" +
            "i (do not|don't) (know|have (any )?information)|(cannot|can't) (verify|confirm)|not (been )?(officially )?(announced|confirmed|released) yet|" +
            "(check|visit) (the )?(official|latest)|may have changed since)",
    )

    fun needsSearch(text: String, afterSearch: Boolean): Boolean {
        val t = text.trim().lowercase(Locale.ROOT)
        if (t.length < 3) return false
        val words = t.split(Regex("\\s+")).size
        if (Regex("^(hi|hello|hey|thanks|thank you|ok|okay|lol|nice|cool|good|write|draft|translate|rewrite|summari[sz]e|fix|code|create|make|generate|tell me a (joke|story)|how are you|who are you)\\b").containsMatchIn(t)) return false
        // a follow-up to a searched answer: "you sure", "gta 6", "it's already out"
        if (afterSearch && (words <= 5 || Regex("\\b(sure|true|really|wrong|already|actually|still|now)\\b").containsMatchIn(t))) return true
        val timely = Regex("\\b(latest|newest|newer|recent|current|currently|today|tonight|yesterday|tomorrow|this (week|month|year)|news|price|prices|cost|costs|release|released|releases|come out|came out|coming out|score|won|winner|weather|forecast|stock|update|version|ceo|president|election|schedule|hours|near me|buy|where can|best|top|vs|review|reviews|20[2-3]\\d)\\b").containsMatchIn(t)
        val question = t.endsWith("?") || Regex("^(what|whats|what's|who|whos|who's|when|where|which|how|is|are|was|were|does|did|do|can|will)\\b").containsMatchIn(t)
        val names = Regex("(^|\\s)[A-Z][A-Za-z0-9]{1,}").findAll(text.trim()).count() >= (if (Regex("^[A-Z]").containsMatchIn(text.trim())) 2 else 1)
        val numbers = Regex("\\d").containsMatchIn(t)
        return timely || (question && (names || numbers))
    }

    private val FUNCTION_WORDS = setOf(
        "a", "an", "the", "and", "or", "but", "is", "are", "was", "were", "be", "been", "do", "does", "did", "doing",
        "when", "what", "which", "who", "whom", "whose", "why", "how", "where", "much", "many", "it", "its", "it's",
        "of", "to", "in", "on", "at", "for", "from", "with", "about", "me", "my", "i", "you", "your", "we", "us", "our",
        "they", "them", "their", "he", "she", "his", "her", "can", "could", "would", "should", "will", "shall", "may",
        "might", "please", "tell", "explain", "give", "show", "find", "search", "know", "there", "this", "that",
        "these", "those", "if", "so", "as", "than", "then", "just", "also", "any", "some", "hey", "hi", "nyx",
        // "buy" brings stores' front pages and dictionaries; the thing itself finds where to buy it
        "buy", "purchase", "get",
    )

    /**
     * A question as search engines take it best: its words that carry meaning, in order ("When did
     * GTA 6 come out and how much does it cost?" is "GTA 6 come out cost"). Whole questions confuse
     * them: Bing read "When did" as DID, the disorder.
     */
    fun keywords(q: String): String {
        val words = rewrite(searchable(q)).split(Regex("\\s+")).map { it.trim(',', '.', '?', '!', ';', ':', '"', '“', '”', '(', ')') }
            .filter { it.isNotEmpty() && it.lowercase(Locale.ROOT) !in FUNCTION_WORDS }
        return if (words.size >= 2) words.joinToString(" ") else searchable(q)
    }

    private val PHRASES = listOf(
        Regex("(?i)\\b(come|came|comes|coming) out\\b") to "release date",
        Regex("(?i)\\bhow much (does|do|is|are|did|will)( it| they| this| that)?( cost)?\\b") to "price",
        Regex("(?i)\\bhow much\\b") to "price",
        Regex("(?i)\\bhow old (is|are|was)\\b") to "age",
        Regex("(?i)\\bwho won\\b") to "winner",
        Regex("(?i)\\bhow (do i|to|can i|do you)\\b") to "how to",
    )

    /**
     * [q] with its typos fixed from DuckDuckGo's suggestions ("sparyground bags": "sprayground
     * bags"): a word changes only when the suggestion's word is a typo away from it. Unchanged when
     * the suggestions do not answer within 1.5 s or suggest something else.
     */
    fun corrected(q: String): String {
        val json = runCatching { fetch("https://duckduckgo.com/ac/?type=list&q=" + URLEncoder.encode(q, "UTF-8"), timeoutMs = 1500) }
            .getOrNull() ?: return q
        val list = runCatching { org.json.JSONArray(json).getJSONArray(1) }.getOrNull() ?: return q
        return fix(q, (0 until list.length()).map { list.optString(it) })
    }

    /**
     * [q] with each word that is not among the [suggestions]' words replaced by the one of them a
     * typo away from it, if any; every other word as it was.
     */
    fun fix(q: String, suggestions: List<String>): String {
        val vocab = suggestions.flatMap { it.lowercase(Locale.ROOT).split(' ') }.filter { it.length >= 3 }.toSet()
        if (vocab.isEmpty()) return q
        return q.split(' ').filter { it.isNotEmpty() }.joinToString(" ") { w ->
            val low = w.lowercase(Locale.ROOT)
            if (low.length < 4 || low in vocab || low.any { it.isDigit() }) w
            else vocab.filter { kotlin.math.abs(it.length - low.length) <= 2 && typos(low, it, if (low.length >= 8) 2 else 1) }
                .minByOrNull { kotlin.math.abs(it.length - low.length) } ?: w
        }
    }

    /** Everyday phrasings in the words pages use ("come out": "release date", "how much": "price"). */
    fun rewrite(q: String): String = PHRASES.fold(q) { acc, (re, to) -> re.replace(acc, to) }

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
    fun rank(cands: List<Passage>, terms: Set<String>, budget: Int, query: String = "", core: Set<String> = emptySet()): List<Passage> {
        // a passage must hold at least half of the search's own words (2 of "budget phone 2026"): one
        // that shares only "phone" is an advert or a dictionary page, and nothing beats that
        val need = if (core.size <= 1) core.size else (core.size + 1) / 2
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
            if (core.count { t -> w.any { matches(it, t) } } < need) sc = 0.0
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

    /**
     * A word of a passage counts for a question's word when it is that word, starts with it
     * ("release", "released"), or is it with a typo: one letter wrong, missing, extra or two
     * swapped ("sparyground", "sprayground"), two in a word of eight letters or more.
     */
    private fun matches(word: String, term: String): Boolean {
        if (word == term || (term.length >= 4 && word.startsWith(term))) return true
        if (term.length < 5 || term.any { it.isDigit() } || kotlin.math.abs(word.length - term.length) > 2) return false
        return typos(word, term, if (term.length >= 8) 2 else 1)
    }

    /** Whether [a] and [b] are at most [max] edits apart (Damerau: a swap of two neighbours is one). */
    private fun typos(a: String, b: String, max: Int): Boolean {
        val n = a.length
        val m = b.length
        var prev2 = IntArray(m + 1)
        var prev = IntArray(m + 1) { it }
        var cur = IntArray(m + 1)
        for (i in 1..n) {
            cur[0] = i
            var best = cur[0]
            for (j in 1..m) {
                val cost = if (a[i - 1] == b[j - 1]) 0 else 1
                var v = minOf(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
                if (i > 1 && j > 1 && a[i - 1] == b[j - 2] && a[i - 2] == b[j - 1]) v = minOf(v, prev2[j - 2] + 1)
                cur[j] = v
                best = minOf(best, v)
            }
            if (best > max) return false
            val t = prev2
            prev2 = prev
            prev = cur
            cur = t
        }
        return prev[m] <= max
    }

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

    /**
     * DuckDuckGo and Bing at once, their results merged (first of each, then the second of each...)
     * with the same page counted once: more sites than either alone, and one still answers when
     * the other asks the network to prove a person is searching.
     */
    fun both(q: String): List<Hit> {
        val pool = Executors.newFixedThreadPool(2)
        try {
            val jobs = listOf(
                pool.submit(Callable { runCatching { duckDuckGo(q) }.getOrDefault(emptyList()) }),
                pool.submit(Callable { runCatching { bing(q) }.getOrDefault(emptyList()) }),
            )
            // once one has results, the other gets 1.5 s more (a network that holds one back
            // made every search wait for its timeout); 7 s in all at most
            val start = System.currentTimeMillis()
            var firstAt = 0L
            while (true) {
                val now = System.currentTimeMillis()
                val got = jobs.filter { it.isDone }.map { runCatching { it.get() }.getOrDefault(emptyList()) }
                if (got.size == jobs.size) break
                if (firstAt == 0L && got.any { it.isNotEmpty() }) firstAt = now
                if (now - start > 7000 || (firstAt > 0 && now - firstAt > 1500)) break
                Thread.sleep(40)
            }
            return merge(jobs.map { if (it.isDone) runCatching { it.get() }.getOrDefault(emptyList()) else emptyList() })
        } finally {
            pool.shutdownNow()
        }
    }

    /** Several result lists taken in turns, each page once (by its address without scheme, www and #). */
    fun merge(lists: List<List<Hit>>): List<Hit> {
        val out = ArrayList<Hit>()
        val seen = HashSet<String>()
        val longest = lists.maxOfOrNull { it.size } ?: 0
        for (i in 0 until longest) {
            for (l in lists) {
                val h = l.getOrNull(i) ?: continue
                val key = h.url.substringBefore('#').removePrefix("https://").removePrefix("http://").removePrefix("www.").trimEnd('/')
                if (seen.add(key)) out += h
            }
        }
        return out
    }

    /** Pages with text worth reading (not videos, social posts or files). */
    fun readable(url: String): Boolean {
        val u = url.lowercase(Locale.ROOT)
        return listOf("youtube.com", "youtu.be", "tiktok.com", "instagram.com", "facebook.com", "twitter.com", "//x.com",
            "pinterest.", "linkedin.com", ".pdf", ".mp4", ".jpg", ".png").none { u.contains(it) }
    }

    /** Bing's results page: title, address and snippet of each result (ads are not among them). */
    fun bing(q: String): List<Hit> =
        parseBing(fetch("https://www.bing.com/search?setlang=en&cc=us&q=" + URLEncoder.encode(q, "UTF-8"), quick = true))

    fun parseBing(html: String): List<Hit> {
        val out = ArrayList<Hit>()
        for (block in html.split(Regex("""<li class="b_algo\b""")).drop(1)) {
            val b = block.substringBefore("</li>")
            val h2 = Regex("""(?s)<h2[^>]*>(.*?)</h2>""").find(b) ?: continue
            // the link around the title (or in it)
            val before = b.substring(0, h2.range.first)
            val link = Regex("""(?s)<a\b[^>]*href="([^"]+)"[^>]*>""").findAll(before).lastOrNull()?.groupValues?.get(1)
                ?: Regex("""href="([^"]+)"""").find(h2.value)?.groupValues?.get(1) ?: continue
            val url = bingTarget(decodeEntities(link)) ?: continue
            val p = Regex("""(?s)<p\b[^>]*>(.*?)</p>""").find(b.substring(h2.range.last))?.groupValues?.get(1) ?: ""
            // the snippet without its date ("Nov 6, 2025 · ")
            val snippet = clean(p).replace(Regex("""^(\w{3} \d{1,2}, \d{4}|\d+ (days?|hours?) ago)\s*·\s*"""), "")
            val title = clean(h2.groupValues[1])
            if (title.isNotEmpty() && out.none { it.url == url }) out += Hit(title, url, snippet)
        }
        return out
    }

    /** Bing sometimes links through /ck/a?...&u=a1<base64 of the address>. */
    private fun bingTarget(href: String): String? {
        val u = Regex("""[?&]u=a1([^&]+)""").find(href)?.groupValues?.get(1)
        val url = if (href.contains("bing.com/ck/") && u != null) {
            runCatching { String(java.util.Base64.getUrlDecoder().decode(u.padEnd((u.length + 3) / 4 * 4, '='))) }.getOrNull() ?: return null
        } else {
            href
        }
        return url.takeIf { (it.startsWith("https://") || it.startsWith("http://")) && !it.contains("bing.com/") }
    }

    /** DuckDuckGo's plain HTML results page (no script, no account). Ads are left out. */
    fun duckDuckGo(q: String): List<Hit> {
        val html = fetch("https://html.duckduckgo.com/html/?q=" + URLEncoder.encode(q, "UTF-8"), quick = true)
        if (challenged(html)) throw java.io.IOException("DuckDuckGo asked for a check that a person is searching")
        return parseDuckDuckGo(html)
    }

    /** DuckDuckGo's even plainer page, which a busy network is sometimes let through to. */
    fun duckDuckGoLite(q: String): List<Hit> {
        val html = fetch("https://lite.duckduckgo.com/lite/?q=" + URLEncoder.encode(q, "UTF-8"), quick = true)
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
    fun fetch(url: String, headers: Map<String, String> = emptyMap(), quick: Boolean = false, timeoutMs: Int = 0): String {
        var u = URL(url)
        repeat(5) {
            val c = (u.openConnection() as HttpURLConnection).apply {
                // quick: a page among several, or a second engine (the search waits for the others anyway)
                connectTimeout = if (timeoutMs > 0) timeoutMs else if (quick) 3500 else 6000
                readTimeout = if (timeoutMs > 0) timeoutMs else if (quick) 4000 else 6000
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
                if (type.isNotEmpty() && !type.contains("html") && !type.contains("text") && !type.contains("json") && !type.contains("javascript")) {
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
        // a reference list's entries (Wikipedia's "↑ Name (date). "Title". Archived from the original...")
        if (p.startsWith("↑") || p.startsWith("^") || p.contains("Archived from the original") || p.contains("Retrieved ")) return true
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
        q.lowercase(Locale.ROOT).split(Regex("[^\\p{L}\\p{N}]+"))
            .filter { (it.length >= 3 && it !in STOP) || (it.isNotEmpty() && it.all { c -> c.isDigit() }) }.toSet()

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

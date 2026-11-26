// Checks app/src/main/java/app/offlineai/chat/data/WebSearch.kt on a computer (it uses only Java
// and org.json): DuckDuckGo's HTML and lite result pages (ads left out, links unwrapped), its
// "are you a person" page, Brave and SearXNG answers, a page's text and the passages that match a
// question, entities; then one real page fetched and read, when the network allows it.
//
//   tools/host-test/web_search.sh
import app.offlineai.chat.data.WebSearch

var failures = 0

fun check(ok: Boolean, what: String) {
    if (!ok) failures++
    println((if (ok) "  ok   " else "  FAIL ") + what)
}

fun main() {
    System.setOut(java.io.PrintStream(java.io.FileOutputStream(java.io.FileDescriptor.out), true, "UTF-8"))
    println("== web search")
    val html = """
        <div class="result results_links results_links_deep result--ad">
          <h2 class="result__title"><a rel="nofollow" class="result__a" href="https://duckduckgo.com/y.js?ad_domain=shop.example&amp;u3=x">Buy cheap flights</a></h2>
          <a class="result__snippet" href="https://duckduckgo.com/y.js?x">An advert.</a>
        </div>
        <div class="result results_links results_links_deep web-result ">
          <h2 class="result__title"><a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fen.wikipedia.org%2Fwiki%2FLisbon&amp;rut=abc">Lisbon - <b>Wikipedia</b></a></h2>
          <div class="result__extras"><a class="result__url" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fen.wikipedia.org%2Fwiki%2FLisbon">en.wikipedia.org/wiki/Lisbon</a></div>
          <a class="result__snippet" href="//duckduckgo.com/l/?uddg=x"><b>Lisbon</b> is the capital &amp; largest city of Portugal.</a>
        </div>
        <div class="result results_links web-result">
          <h2 class="result__title"><a href="https://weather.example/lisbon?m=11" class="result__a" rel="nofollow">Lisbon weather in November</a></h2>
          <a class="result__snippet" href="https://weather.example/lisbon">Highs of 18&#176;C and 9 rainy days.</a>
        </div>
    """.trimIndent()
    val hits = WebSearch.parseDuckDuckGo(html)
    check(hits.size == 2, "DuckDuckGo: two results, the ad left out (got ${hits.size})")
    check(hits.getOrNull(0)?.url == "https://en.wikipedia.org/wiki/Lisbon", "DuckDuckGo: the /l/?uddg= link unwrapped (${hits.getOrNull(0)?.url})")
    check(hits.getOrNull(0)?.title == "Lisbon - Wikipedia", "DuckDuckGo: the title without its tags (${hits.getOrNull(0)?.title})")
    check(hits.getOrNull(0)?.snippet == "Lisbon is the capital & largest city of Portugal.", "DuckDuckGo: the snippet, entities decoded (${hits.getOrNull(0)?.snippet})")
    check(hits.getOrNull(1)?.url == "https://weather.example/lisbon?m=11" && hits.getOrNull(1)?.snippet == "Highs of 18°C and 9 rainy days.",
        "DuckDuckGo: href after class, a numeric entity (${hits.getOrNull(1)?.url} / ${hits.getOrNull(1)?.snippet})")

    val lite = """
        <table>
        <tr><td>1.&nbsp;</td><td><a rel="nofollow" href="https://www.visitlisboa.com/en" class='result-link'>Visit <b>Lisboa</b></a></td></tr>
        <tr><td></td><td class='result-snippet'>The official <b>tourism</b> site.</td></tr>
        <tr><td>2.&nbsp;</td><td><a rel="nofollow" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.org%2Fa%3Fb%3D1" class='result-link'>Example</a></td></tr>
        <tr><td></td><td class='result-snippet'>Second.</td></tr>
        </table>
    """.trimIndent()
    val lh = WebSearch.parseDuckDuckGo(lite)
    check(lh.size == 2 && lh[0].url == "https://www.visitlisboa.com/en" && lh[0].snippet == "The official tourism site." &&
        lh[1].url == "https://example.org/a?b=1", "DuckDuckGo lite: links and snippets (${lh.map { it.url + " | " + it.snippet }})")

    val brave = """{"web":{"results":[{"title":"Lisbon <strong>travel</strong>","url":"https://a.example/x","description":"Tips &amp; tricks"},{"title":"Bad","url":"ftp://x"}]}}"""
    val bh = WebSearch.parseBrave(brave)
    check(bh.size == 1 && bh[0].title == "Lisbon travel" && bh[0].snippet == "Tips & tricks", "Brave: results (${bh.map { it.title + " | " + it.snippet }})")
    val sx = """{"results":[{"title":"One","url":"https://one.example","content":"First result."},{"title":"Two","url":"https://two.example","content":""}]}"""
    val xh = WebSearch.parseSearXNG(sx)
    check(xh.size == 2 && xh[1].url == "https://two.example", "SearXNG: results (${xh.size})")

    val page = """
        <html><head><title>T</title><style>p{color:red}</style><script>var x = "<p>not this</p>";</script></head>
        <body><nav><a href="/">Home</a> <a href="/news">News about Lisbon weather and everything else in the menu</a></nav>
        <header><h1>Site header with a long line that mentions Lisbon weather twice: Lisbon weather</h1></header>
        <article>
          <h1>Lisbon in November</h1>
          <p>November in Lisbon is mild: daytime highs are usually around 18&nbsp;&deg;C and nights about 11&nbsp;&deg;C.</p>
          <p>It is one of the wetter months, with rain on roughly nine days, often in short showers between sunny spells.</p>
          <p>Our shop sells umbrellas and many other things that have nothing to do with this question at all.</p>
          <ul><li>Pack a light rain jacket for the November showers in Lisbon.</li></ul>
        </article>
        <footer><p>Copyright and all rights reserved by the site, which uses cookies to remember you.</p></footer>
        </body></html>
    """.trimIndent()
    val text = WebSearch.pageText(page)
    check(!text.contains("not this") && !text.contains("color:red") && !text.contains("Home") && !text.contains("Site header") &&
        !text.contains("rights reserved"), "page text: scripts, styles, menus, header and footer left out")
    check(text.contains("highs are usually around 18 °C"), "page text: paragraphs kept, entities decoded")
    val terms = WebSearch.terms("What is the weather like in Lisbon in November? Will it rain?")
    check(terms.containsAll(listOf("weather", "lisbon", "november", "rain")) && "what" !in terms && "the" !in terms, "terms: $terms")
    val pieces = WebSearch.chunks(text)
    check(pieces.all { it.length <= 330 } && pieces.any { it.contains("mild") }, "chunks: short passages (${pieces.size})")
    // two pages and two snippets, ranked together
    val other = "Lisbon has many museums and old trams that climb its hills, and it is known for its tiles and pastries."
    val cands = ArrayList<WebSearch.Passage>()
    cands += WebSearch.Passage(0, "Lisbon in November: around 18 °C by day with some rain.", snippet = true)
    cands += WebSearch.Passage(1, "Buy Lisbon souvenirs online with free shipping on every order.", snippet = true)
    pieces.forEach { cands += WebSearch.Passage(0, it) }
    WebSearch.chunks(other).forEach { cands += WebSearch.Passage(1, it) }
    val q = "What is the weather like in Lisbon in November? Will it rain?"
    val picked = WebSearch.rank(cands, terms, 420, q)
    val ptext = picked.joinToString(" | ") { it.text }
    check(picked.isNotEmpty() && picked.sumOf { it.text.length } <= 420, "rank: within the budget (${picked.sumOf { it.text.length }})")
    check(ptext.contains("rain on roughly nine days") || ptext.contains("18 °C by day"), "rank: the passages that answer it ($ptext)")
    check(!ptext.contains("umbrellas") && !ptext.contains("souvenirs") && !ptext.contains("pastries"), "rank: unrelated passages left out ($ptext)")
    check(picked.groupBy { it.hit }.values.all { it.size <= 3 }, "rank: at most three from one page")
    check(WebSearch.searchable("Can you tell me when GTA 6 comes out?") == "tell me when GTA 6 comes out" ||
        WebSearch.searchable("Can you tell me when GTA 6 comes out?") == "when GTA 6 comes out",
        "searchable: \"${WebSearch.searchable("Can you tell me when GTA 6 comes out?")}\"")
    check(WebSearch.searchable("search the web for lisbon hotels") == "lisbon hotels", "searchable: \"${WebSearch.searchable("search the web for lisbon hotels")}\"")
    check(WebSearch.decodeEntities("&lt;b&gt; &#x27;q&#39; &amp;amp; &unknown;") == "<b> 'q' &amp; &unknown;", "entities")
    val prompt = WebSearch.prompt("Web search results for \"x\":\n[1] A (a.example)\ntext", "What is x?")
    check(prompt.startsWith("Web search results") && prompt.endsWith("What is x?") && prompt.contains("[1]"), "prompt: results, then the message")

    println("== a real page, read")
    val live = runCatching { WebSearch.pageText(WebSearch.fetch("https://example.com/")) }
    if (live.isSuccess) {
        val t = live.getOrThrow()
        check(t.contains("documentation examples") && !t.contains("color-scheme") && !t.contains("s.js"),
            "example.com read, its style and script left out: ${t.take(80).replace('\n', ' ')}…")
    } else {
        println("  (no network here: ${live.exceptionOrNull()?.message})")
    }
    println("\n${if (failures == 0) "ALL PASSED" else "FAILED"} ($failures failures)")
    if (failures > 0) kotlin.system.exitProcess(1)
}

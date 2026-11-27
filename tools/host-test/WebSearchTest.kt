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

    val bingHtml = """
        <ol id="b_results"><li class="b_algo" data-id iid=SERP.1><div class="b_tpcn"><a class="tilk" href="https://en.wikipedia.org/wiki/Grand_Theft_Auto_VI">x</a></div>
        <div class="b_algoheader"><a href="https://en.wikipedia.org/wiki/Grand_Theft_Auto_VI" h="ID=SERP,1"><h2>Grand Theft Auto VI - <strong>Wikipedia</strong></h2></a></div>
        <div class="b_caption"><p class="b_lineclamp3">Nov 6, 2025&nbsp;&#0183;&#32;It was released on 19 November 2026.</p></div></li>
        <li class="b_algo"><h2><a href="https://www.bing.com/ck/a?!&amp;&amp;p=abc&amp;u=a1aHR0cHM6Ly93d3cuaWduLmNvbS9hcnRpY2xlcy9ndGEtNg&amp;ntb=1">GTA 6 release date | IGN</a></h2>
        <div class="b_caption"><p>4 days ago&nbsp;&#0183;&#32;Everything we know.</p></div></li></ol>
    """.trimIndent()
    val spHtml = """
        <a class="result-title result-link css-1" href="/clev?event=ad&amp;sc=x" target="_self"><h2 class="c">Buy GTA</h2></a><p class="c">An ad.</p>
        <a class="result-title result-link css-1j9evrk" href="https://en.m.wikipedia.org/wiki/Grand_Theft_Auto_VI" target="_self" rel="noreferrer" tabindex="0" data-testid="bg-title-link"><h2 class="css-1q6uzbx">Grand Theft Auto VI - Wikipedia</h2></a><p class="css-frl4rl">Upon <b>release</b>, it sold 32.5 million copies.</p>
    """.trimIndent()
    val sp = WebSearch.parseStartpage(spHtml)
    check(sp.size == 1 && sp[0].url == "https://en.m.wikipedia.org/wiki/Grand_Theft_Auto_VI" && sp[0].snippet == "Upon release, it sold 32.5 million copies.",
        "Startpage: a result read, its ad left out (${sp.map { it.url }})")
    val bh0 = WebSearch.parseBing(bingHtml)
    check(bh0.size == 2 && bh0[0].url == "https://en.wikipedia.org/wiki/Grand_Theft_Auto_VI" && bh0[0].title == "Grand Theft Auto VI - Wikipedia" &&
        bh0[0].snippet == "It was released on 19 November 2026.", "Bing: a result, its date left out (${bh0.map { it.url + " | " + it.title + " | " + it.snippet }})")
    check(bh0.getOrNull(1)?.url == "https://www.ign.com/articles/gta-6", "Bing: a /ck/a link unwrapped (${bh0.getOrNull(1)?.url})")
    val merged = WebSearch.merge(listOf(hits, bh0, listOf(WebSearch.Hit("dup", "http://en.wikipedia.org/wiki/Lisbon/", ""))))
    check(merged.size == 4 && merged[0].url.contains("Lisbon") && merged[1].url.contains("Grand_Theft"), "merge: in turns, each page once (${merged.map { it.url }})")
    check(!WebSearch.readable("https://www.youtube.com/watch?v=1") && WebSearch.readable("https://www.ign.com/a"), "readable: videos left out")

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
    check(WebSearch.keywords("Were can i buy sparyground bags") == "sparyground bags", "keywords: \"${WebSearch.keywords("Were can i buy sparyground bags")}\"")
    check(WebSearch.keywords("the amazing world of gumball") == "amazing world of gumball", "keywords: a title keeps its \"of\"")
    check(WebSearch.keywords("When did GTA 6 come out and how much does it cost?") == "GTA 6 release date and price",
        "keywords: \"${WebSearch.keywords("When did GTA 6 come out and how much does it cost?")}\"")
    check(WebSearch.terms("GTA 6 price").contains("6"), "terms: numbers kept")
    // a misspelt name still finds its passages (the engines correct it, the pages spell it right)
    val typo = listOf(WebSearch.Passage(0, "Shop Sprayground backpacks and bags at the official Sprayground store, with free shipping."),
        WebSearch.Passage(1, "A completely unrelated paragraph about the weather in a faraway town by the sea."))
    val tp = WebSearch.rank(typo, WebSearch.terms("where can i buy sparyground bags"), 600, "where can i buy sparyground bags",
        core = WebSearch.terms(WebSearch.keywords("where can i buy sparyground bags")))
    check(tp.size == 1 && tp[0].hit == 0, "rank: a misspelt word matched (${tp.map { it.text.take(30) }})")
    check(WebSearch.fix("sparyground bags", listOf("buy sprayground backpack", "sprayground bags")) == "sprayground bags", "fix: a typo corrected")
    check(WebSearch.fix("GTA 6 release date", listOf("gta 6 release date price")) == "GTA 6 release date", "fix: nothing to correct")
    check(WebSearch.fix("python list sort", listOf("python sorted dict")) == "python list sort", "fix: a different search left alone")
    check(WebSearch.searchable("search the web for lisbon hotels") == "lisbon hotels", "searchable: \"${WebSearch.searchable("search the web for lisbon hotels")}\"")
    check(WebSearch.decodeEntities("&lt;b&gt; &#x27;q&#39; &amp;amp; &unknown;") == "<b> 'q' &amp; &unknown;", "entities")
    val prompt = WebSearch.prompt("Web search results for \"x\":\n[1] A (a.example)\ntext", "What is x?")
    check(prompt.startsWith("Web search results") && prompt.endsWith("What is x?") && prompt.contains("[1]"), "prompt: the results, then the message")
    val task = WebSearch.prompt("Web results:\n[1] a.example: snake tutorial", "Make a html game snake game where it eats apples to grow")
    check(task.contains("Do what the message below asks") && !task.contains("[1]-style") && !task.contains("answer itself first"),
        "prompt: a request to make something gets it made")
    check(WebSearch.isTask("can you make me a snake game") && WebSearch.isTask("Write a poem") && !WebSearch.isTask("What is a snake game?") &&
        !WebSearch.isTask("how do i make bread"), "isTask")
    check(WebSearch.unsure("As of my last update in 2024, GTA 6 was set for late 2025."), "unsure: knowledge cut-off")
    check(WebSearch.unsure("I don't have real-time information about prices."), "unsure: no live data")
    check(!WebSearch.unsure("Paris is the capital of France."), "unsure: a plain answer")
    check(WebSearch.needsSearch("When does GTA 6 come out?", false), "auto: a release date")
    check(!WebSearch.needsSearch("write me a poem about rain", false), "auto: writing is not searched")
    check(!WebSearch.needsSearch("hey how are you", false), "auto: chat is not searched")

    println("== a real search and page, read")
    val live2 = runCatching { WebSearch.bing("grand theft auto 6 release date") }
    if (live2.isSuccess && live2.getOrThrow().isNotEmpty()) {
        val r = live2.getOrThrow()
        check(r.size >= 3 && r.all { it.url.startsWith("http") && it.title.isNotBlank() }, "Bing, live: ${r.size} results (${r.take(3).joinToString { it.source.domain }})")
    } else {
        println("  (Bing not reachable here: ${live2.exceptionOrNull()?.message ?: "no results"})")
    }
    // the whole search as the app runs it: engines, pages, passages
    val t0 = System.currentTimeMillis()
    val full = WebSearch.run("When did GTA 6 come out and how much does it cost?", 1500, WebSearch.Engine.DuckDuckGo,
        java.util.concurrent.atomic.AtomicBoolean(false)) { }
    val secs = (System.currentTimeMillis() - t0) / 1000.0
    if (full.sources.isNotEmpty()) {
        check(full.context.length <= 1500 + 400 && full.sources.size >= 2,
            "search, live: ${full.sources.size} sites (${full.sources.joinToString { it.domain }}), ${full.context.length} characters, %.1f s".format(secs))
        println(full.context.lines().joinToString("\n") { "      " + it.take(160) })
    } else {
        println("  (the whole search found nothing here: ${full.error})")
    }
    // many websites: other ways of putting it bring more sites, all read and ranked in time
    val t1 = System.currentTimeMillis()
    val steps = ArrayList<String>()
    val many = WebSearch.run("the amazing world of gumball", 1500, WebSearch.Engine.DuckDuckGo,
        java.util.concurrent.atomic.AtomicBoolean(false), 40) { steps += it }
    val secs2 = (System.currentTimeMillis() - t1) / 1000.0
    if (many.sources.isNotEmpty()) {
        check(many.read >= 12 && secs2 < WebSearch.seconds(40) + 14,
            "40 websites, live: read ${many.read}, used ${many.sources.size} (${many.sources.joinToString { it.domain }}), %.1f s".format(secs2))
        println("      " + steps.distinct().takeLast(3).joinToString(" | "))
    } else {
        println("  (the many-site search found nothing here: ${many.error})")
    }
    // ranking tens of thousands of passages stays quick
    val big = (0 until 20_000).map { WebSearch.Passage(it % 100, "Passage $it about cartoons, the gumball machine, the amazing world and Elmore's characters, season ${it % 7}.") }
    val t2 = System.currentTimeMillis()
    val pickedBig = WebSearch.rank(big, WebSearch.terms("amazing world of gumball"), 1500, "amazing world of gumball",
        core = WebSearch.terms("amazing world gumball"))
    val ms = System.currentTimeMillis() - t2
    check(pickedBig.isNotEmpty() && ms < 4000, "rank: 20,000 passages in $ms ms")
    val p2 = WebSearch.prompt("Web results:\n[1] a.example: text", "The amazing world gum ball")
    check(p2.contains("in your own words") && p2.contains("Do not copy or list") && !p2.contains("direct answer"), "prompt: asks for an explanation, not a list")
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

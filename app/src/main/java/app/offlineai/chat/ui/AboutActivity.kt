package app.offlineai.chat.ui

import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ScrollView
import androidx.appcompat.app.AppCompatActivity
import app.offlineai.chat.App
import app.offlineai.chat.BuildConfig
import app.offlineai.chat.data.Catalog
import app.offlineai.chat.data.Device
import app.offlineai.chat.data.ModelStore

/**
 * What the app is and promises, what this phone has, and who made what it is built from: the
 * engine, the models, the people who quantized them, and every library in the app, each with its
 * license (the MIT and BSD notices have to travel with the app; the texts are in assets/licenses).
 */
class AboutActivity : AppCompatActivity() {
    private lateinit var app: App
    private lateinit var content: LinearLayout

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        app = App.of(this)
        Palette.apply(this, app.settings)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Palette.bg)
        }
        root.addView(topBar("About"), lp(MATCH, WRAP))
        val scroll = ScrollView(this)
        content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, 0, 0, dp(32))
        }
        scroll.addView(content, FrameLayout.LayoutParams(MATCH, WRAP))
        root.addView(scroll, lp(MATCH, 0, 1f))
        setContentView(root)
        edgeToEdge(root)
        build()
    }

    private fun build() {
        // ---- who we are
        val hero = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(dp(24), dp(16), dp(24), dp(8))
        }
        hero.addView(text("✦", 40f, Palette.accent).apply { gravity = Gravity.CENTER })
        hero.addView(text("Offline AI", 26f, bold = true).apply {
            gravity = Gravity.CENTER
            setPadding(0, dp(4), 0, dp(2))
        })
        hero.addView(text("Version ${BuildConfig.VERSION_NAME} · llama.cpp ${BuildConfig.LLAMA_CPP_VERSION}", 13f, Palette.text3).apply {
            gravity = Gravity.CENTER
        })
        hero.addView(text("AI that lives on your phone. No internet, no account, nothing sent anywhere.", 15f, Palette.text2).apply {
            gravity = Gravity.CENTER
            setPadding(0, dp(12), 0, 0)
        })
        content.addView(hero, lp(MATCH, WRAP))

        // ---- the promise
        content.addView(sectionTitle("Private by design"))
        val promise = card()
        point(promise, "Runs on this phone",
            "Every model runs on the phone's own processor. What you type, attach or get back never leaves it.")
        point(promise, "No account, no tracking", "No sign-in, no analytics, no ads, nothing collected.")
        point(promise, "Online only to download",
            "The app goes online only to download a model you pick. With Offline only on (Settings), never.")
        point(promise, "Your chats are yours",
            "Kept in the app's private storage. Export, import or delete them any time from the Chats screen.", last = true)
        content.addView(promise)

        // ---- this phone
        content.addView(sectionTitle("This phone"))
        val phone = card()
        phone.addView(text(
            "${Device.cores()} cores (${Device.fastCores()} fast) · ${ModelStore.formatBytes(app.totalRam)} of memory · " +
                "Android ${Build.VERSION.RELEASE}",
            14f, Palette.text2,
        ))
        val engine = text("", 12f, Palette.text3, mono = true).apply { setPadding(0, dp(8), 0, 0) }
        phone.addView(engine)
        content.addView(phone)
        app.engine.systemInfo { engine.text = it.trim().replace(" | ", "\n") }

        // ---- credits
        content.addView(sectionTitle("Made with"))
        credit("llama.cpp and ggml",
            "The engine every model here runs on, by Georgi Gerganov and the ggml authors, with its tools for " +
                "pictures and sound (mtmd), chat templates and drafting.",
            "MIT License", "llama.cpp.txt")
        val makers = card()
        makers.addView(text("The models", 15f, bold = true))
        makers.addView(text(
            "Made and released openly by Google (Gemma), Alibaba (Qwen), Meta (Llama), Liquid AI (LFM), Mistral AI " +
                "(Ministral), IBM (Granite), Microsoft (Phi), PrismML (Bonsai) and iFlytek (Spark). Each comes under its " +
                "maker's license; its page on Hugging Face says which. Downloaded from Hugging Face only when you pick one.\n\n" +
                "Gemma is provided under and subject to the Gemma Terms of Use (ai.google.dev/gemma/terms). Llama 3.2 is " +
                "licensed under the Llama 3.2 Community License, Copyright © Meta Platforms, Inc. All Rights Reserved.",
            14f, Palette.text2,
        ).apply { setPadding(0, dp(6), 0, 0) })
        content.addView(makers)
        val sharers = card()
        sharers.addView(text("Quantized and shared by", 15f, bold = true))
        // everyone whose files the Models screen downloads, from the catalog itself
        val owners = Catalog.models
            .flatMap { m -> listOfNotNull(m.repo, m.pictures?.repo, m.drafter?.repo) }
            .map { it.substringBefore('/') }
            .distinct()
            .sortedBy { it.lowercase() }
        sharers.addView(text(
            owners.joinToString(" · ") +
                "\n\nThey turned the models into GGUF files a phone can run, and the community ones tuned or uncensored them.",
            14f, Palette.text2,
        ).apply { setPadding(0, dp(6), 0, 0) })
        content.addView(sharers)

        // ---- licenses
        content.addView(sectionTitle("Open-source licenses"))
        content.addView(text("Tap one to read it.", 13f, Palette.text3).apply { setPadding(dp(20), 0, dp(20), dp(6)) })
        license("llama.cpp and ggml", "MIT License, © 2023-2026 the ggml authors", "llama.cpp.txt")
        license("JSON for Modern C++", "MIT License, © 2013-2025 Niels Lohmann", "nlohmann-json.txt")
        license("stb_image (pictures)", "MIT License or public domain, Sean Barrett", "stb_image.txt")
        license("miniaudio (sound)", "Public domain or MIT No Attribution, David Reid", "miniaudio.txt")
        license("xxHash", "BSD 2-Clause License, © 2012-2021 Yann Collet", "xxhash.txt")
        license("rotate-bits", "MIT License, © 2021 William Casarin", "rotate-bits.txt")
        license("cpp-httplib", "MIT License, © 2017 yhirose", "cpp-httplib.txt")
        license("SHA-1, SHA-256, subprocess.h", "Public domain", "public-domain.txt")
        license("AndroidX and Kotlin", "Apache License 2.0, © The Android Open Source Project, JetBrains", "apache-2.0.txt")

        // ---- source
        content.addView(sectionTitle("Source"))
        val source = card()
        source.addView(text(
            "Offline AI is open source: everything above, and how it is built and tested, is in its repository. " +
                "Written with Claude Code.",
            14f, Palette.text2,
        ))
        source.addView(text(SOURCE, 13f, Palette.accent, mono = true).apply {
            setPadding(0, dp(8), 0, dp(8))
            setTextIsSelectable(true)
        })
        source.addView(pill("Copy link") { copyText("link", "https://$SOURCE") }, lp(WRAP, WRAP))
        content.addView(source)
    }

    /** A line in a card: a short title and what it means. */
    private fun point(into: LinearLayout, title: String, body: String, last: Boolean = false) {
        into.addView(text(title, 15f, bold = true))
        into.addView(text(body, 14f, Palette.text2).apply { setPadding(0, dp(2), 0, if (last) 0 else dp(12)) })
    }

    private fun credit(title: String, body: String, licenseName: String, asset: String) {
        val c = card()
        c.addView(text(title, 15f, bold = true))
        c.addView(text(body, 14f, Palette.text2).apply { setPadding(0, dp(6), 0, dp(10)) })
        c.addView(pill(licenseName) { showLicense(title, asset) }, lp(WRAP, WRAP))
        content.addView(c)
    }

    /** A license row that unfolds its full text in place. */
    private fun license(title: String, summary: String, asset: String) {
        val row = card()
        val head = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = ripple(null, dp(8).toFloat())
        }
        head.addView(text(title, 15f, bold = true))
        head.addView(text(summary, 13f, Palette.text2))
        row.addView(head, lp(MATCH, WRAP))
        val body = text("", 11f, Palette.text2, mono = true).apply {
            visibility = View.GONE
            setPadding(0, dp(10), 0, 0)
            setTextIsSelectable(true)
        }
        row.addView(body, lp(MATCH, WRAP))
        head.setOnClickListener {
            if (body.visibility == View.VISIBLE) {
                body.visibility = View.GONE
            } else {
                if (body.text.isEmpty()) body.text = readLicense(asset)
                body.visibility = View.VISIBLE
            }
        }
        content.addView(row)
    }

    private fun showLicense(title: String, asset: String) {
        val box = ScrollView(this)
        box.addView(text(readLicense(asset), 11f, Palette.text2, mono = true).apply {
            setPadding(dp(20), dp(8), dp(20), dp(8))
            setTextIsSelectable(true)
        })
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle(title)
            .setView(box)
            .setPositiveButton("Close", null)
            .show()
    }

    private fun readLicense(asset: String): String = try {
        assets.open("licenses/$asset").use { it.readBytes().toString(Charsets.UTF_8) }
    } catch (e: Exception) {
        "The license text could not be read (${e.message})."
    }

    companion object {
        private const val SOURCE = "github.com/lalalalalabababa2-web/why-am-i-getting-banned"
    }
}

package app.offlineai.chat.ui

import android.app.DownloadManager
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import app.offlineai.chat.App
import app.offlineai.chat.data.Catalog
import app.offlineai.chat.data.CatalogModel
import app.offlineai.chat.data.DownloadState
import app.offlineai.chat.data.ExtraFile
import app.offlineai.chat.data.LocalModel
import app.offlineai.chat.data.ModelStore
import app.offlineai.chat.engine.EngineController
import java.io.File

class ModelsActivity : AppCompatActivity(), EngineController.StateListener {
    private lateinit var app: App
    private lateinit var content: LinearLayout
    private lateinit var info: TextView
    private val main = Handler(Looper.getMainLooper())
    private val rows = mutableListOf<Row>()
    private var importing: Pair<String, Int>? = null  // file name, percent
    private var importRow: TextView? = null
    private var knownLocal = emptySet<String>()

    private val ticker = object : Runnable {
        override fun run() {
            refresh()
            main.postDelayed(this, 1000)
        }
    }

    private val pickFile = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri: Uri? ->
        if (uri != null) startImport(uri)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        app = App.of(this)
        Palette.apply(this, app.settings)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Palette.bg)
        }
        root.addView(topBar("Models"), lp(MATCH, WRAP))
        val scroll = ScrollView(this)
        content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, 0, 0, dp(24))
        }
        scroll.addView(content, android.widget.FrameLayout.LayoutParams(MATCH, WRAP))
        root.addView(scroll, lp(MATCH, 0, 1f))
        setContentView(root)
        edgeToEdge(root)
        info = text("", 13f, Palette.text2).apply { setPadding(dp(20), dp(4), dp(20), dp(4)) }
        build()
        app.engine.addListener(this)
    }

    override fun onDestroy() {
        app.engine.removeListener(this)
        main.removeCallbacksAndMessages(null)
        super.onDestroy()
    }

    override fun onResume() {
        super.onResume()
        main.post(ticker)
    }

    override fun onPause() {
        main.removeCallbacks(ticker)
        super.onPause()
    }

    override fun onEngineState() = refresh()

    /** Lays the screen out again; used when the set of files changes. */
    private fun build() {
        content.removeAllViews()
        rows.clear()
        importRow = null
        content.addView(info)

        // the catalog, grouped by what you would pick it for
        val byId = Catalog.models.associateBy { it.id }
        fun group(title: String, note: String?, ids: List<String>) {
            val ms = ids.mapNotNull { byId[it] }
            if (ms.isEmpty()) return
            content.addView(sectionTitle(title))
            if (note != null) content.addView(text(note, 13f, Palette.text2).apply { setPadding(dp(20), 0, dp(20), dp(6)) })
            ms.forEach { m -> addRow(Row(m.file, m, m.name, m.maker, m.blurb)) }
        }
        group("Best for this phone", null, listOf("gemma4-e4b", "qwen35-4b", "bonsai2-9b", "gemma4-e2b"))
        group("Small and fast", "Under 2 GB. Quick replies, light on memory and battery; they know less.",
            listOf("qwen35-2b", "lfm25-vl-1.6b", "lfm25-1.2b", "llama32-1b", "qwen35-0.8b", "gemma3-270m"))
        group("More 3-4B models", null, listOf("llama32-3b", "ministral3-3b", "granite41-3b", "phi4-mini"))
        group("Community", "Qwen3.5 4B tuned by people outside Alibaba.",
            listOf("qwopus35-4b-v3", "qwopus35-4b-coder", "qwen38-4b", "teichai-qwen35-4b", "adi-qwen35-4b-glm"))
        group("Uncensored (abliterated)",
            "Community copies of the models above with their refusals removed. They answer what the originals decline; " +
                "what they say is up to you to judge.",
            listOf("abl-gemma4-e4b", "abl-qwen35-4b", "abl-gemma4-e2b", "abl-qwen35-2b", "abl-llama32-3b", "abl-lfm25-1.2b",
                "abl-qwen35-9b"))
        group("Bigger models",
            "8B to 27B, squeezed to 1-3 bits. Smarter on hard questions, but they need almost all of an 8 GB phone's " +
                "free memory and write more slowly. Close other apps before loading one.",
            listOf("lfm25-8b-a1b", "qwen35-9b-iq3", "qwen35-9b-q3km", "gemma4-12b", "bonsai-27b"))
        // anything in the catalog not placed above still shows
        val placed = setOf("gemma4-e4b", "qwen35-4b", "bonsai2-9b", "gemma4-e2b", "qwen35-2b", "lfm25-vl-1.6b", "lfm25-1.2b",
            "llama32-1b", "qwen35-0.8b", "gemma3-270m", "llama32-3b", "ministral3-3b", "granite41-3b", "phi4-mini",
            "qwopus35-4b-v3", "qwopus35-4b-coder", "qwen38-4b", "teichai-qwen35-4b", "adi-qwen35-4b-glm", "lfm25-8b-a1b",
            "qwen35-9b-iq3", "qwen35-9b-q3km", "gemma4-12b", "bonsai-27b", "abl-gemma4-e4b", "abl-qwen35-4b", "abl-gemma4-e2b",
            "abl-qwen35-2b", "abl-llama32-3b", "abl-lfm25-1.2b", "abl-qwen35-9b")
        group("Other", null, Catalog.models.map { it.id }.filter { it !in placed })

        val local = app.models.local()
        knownLocal = local.map { it.file.name }.toSet()
        val others = local.filter { it.catalog == null }
        if (others.isNotEmpty() || importing != null) {
            content.addView(sectionTitle("Your files"))
            others.forEach { f -> addRow(Row(f.file.name, null, f.displayName, "Added by you", null)) }
        }
        importing?.let { (name, pct) ->
            importRow = text("Copying $name… $pct%", 14f, Palette.text2).apply { setPadding(dp(20), dp(8), dp(20), dp(8)) }
            content.addView(importRow)
        }

        content.addView(sectionTitle("Add another"))
        val add = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), 0, dp(20), 0)
        }
        add.addView(pill("Import a .gguf file from this phone") { pickFile.launch(arrayOf("*/*")) }, lp(MATCH, WRAP))
        add.addView(pill("Download from a link") { askLink() }, lp(MATCH, WRAP).apply { topMargin = dp(10) })
        add.addView(text(
            "Any GGUF model works if it fits in memory. Q4_K_M files of 4B models or smaller run well on an 8 GB phone. " +
                "Links to Hugging Face file pages are turned into download links automatically.",
            12f, Palette.text3,
        ).apply { setPadding(0, dp(12), 0, 0) }, lp(MATCH, WRAP))
        content.addView(add, lp(MATCH, WRAP))
        refresh()
    }

    private fun addRow(r: Row) {
        rows.add(r)
        content.addView(r.view)
    }

    private fun refresh() {
        val downloads = try {
            app.models.poll().associateBy { it.fileName }
        } catch (e: Exception) {
            emptyMap()
        }
        val localNow = app.models.local().map { it.file.name }.toSet()
        if (localNow != knownLocal) {
            build()
            return
        }
        val free = app.models.freeBytes()
        info.text = "Models are kept in this app's own folder and never leave the phone. " +
            (if (free >= 0) "${ModelStore.formatBytes(free)} of storage free. " else "") +
            "Memory: ${ModelStore.formatBytes(app.availableRam())} free of ${ModelStore.formatBytes(app.totalRam)}." +
            (if (app.settings.offlineOnly) "\nOffline only is on (Settings), so downloads are off." else "")
        rows.forEach { it.update(downloads) }
        importing?.let { (name, pct) -> importRow?.text = "Copying $name… $pct%" }
    }

    private inner class Row(
        val fileName: String,
        val catalog: CatalogModel?,
        title: String,
        tag: String,
        blurb: String?,
    ) {
        val view = card()
        private val status = text("", 13f, Palette.text2)
        private val extra = text("", 12f, Palette.text3)
        private val bar = ProgressBar(this@ModelsActivity, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = 1000
            progressTintList = android.content.res.ColorStateList.valueOf(Palette.accent)
            progressBackgroundTintList = android.content.res.ColorStateList.valueOf(Palette.surface3)
        }
        private val actions = LinearLayout(this@ModelsActivity).apply { orientation = LinearLayout.HORIZONTAL }
        private var actionsKey = ""

        init {
            val head = LinearLayout(this@ModelsActivity).apply { orientation = LinearLayout.HORIZONTAL }
            head.addView(text(title, 16f, bold = true), lp(0, WRAP, 1f))
            val size = catalog?.sizeBytes ?: File(app.models.dir, fileName).length()
            head.addView(text(ModelStore.formatBytes(size), 13f, Palette.text3))
            view.addView(head)
            view.addView(text(tag, 12f, if (catalog?.official == true) Palette.accent else Palette.text3).apply {
                setPadding(0, dp(2), 0, 0)
            })
            if (blurb != null) view.addView(text(blurb, 14f, Palette.text2).apply { setPadding(0, dp(8), 0, 0) })
            val can = mutableListOf<String>()
            if (catalog?.pictures != null) can += if (catalog?.hears == true) "pictures and sound" else "pictures"
            if (catalog?.mtp == true || catalog?.drafter != null) can += "drafting test (Settings)"
            if (can.isNotEmpty()) {
                view.addView(text("Can do: " + can.joinToString(" · "), 12f, Palette.text3).apply { setPadding(0, dp(6), 0, 0) })
            }
            view.addView(bar, lp(MATCH, dp(4)).apply { topMargin = dp(10) })
            view.addView(status, lp(MATCH, WRAP).apply { topMargin = dp(6) })
            view.addView(extra, lp(MATCH, WRAP).apply { topMargin = dp(4) })
            view.addView(actions, lp(MATCH, WRAP).apply { topMargin = dp(10) })
        }

        /** Picture support and the drafter: what is there, what is downloading. */
        private fun extras(local: LocalModel?, downloads: Map<String, DownloadState>): Pair<String, String> {
            val c = catalog ?: return "" to ""
            val lines = mutableListOf<String>()
            val keyParts = mutableListOf<String>()
            fun one(kind: String, file: ExtraFile?, have: Boolean, what: String) {
                if (file == null) return
                val d = downloads[app.models.companionKey(fileName, kind)]
                val failed = app.models.failures[app.models.companionKey(fileName, kind)]
                val state = when {
                    have -> "have"
                    d != null -> "dl"
                    else -> "none"
                }
                keyParts += "$kind:$state"
                when {
                    have -> lines += "$what: on this phone (${ModelStore.formatBytes(file.sizeBytes)})"
                    d != null -> {
                        val total = if (d.total > 0) d.total else file.sizeBytes
                        lines += "$what: downloading ${ModelStore.formatBytes(d.done)} of ${ModelStore.formatBytes(total)}"
                    }
                    failed != null -> lines += "$what: $failed"
                    local != null -> lines += "$what: not downloaded (${ModelStore.formatBytes(file.sizeBytes)})"
                }
            }
            one("mmproj", c.pictures, local?.hasPictures == true, if (c.hears) "Picture and sound support" else "Picture support")
            one("drafter", c.drafter, local?.hasDrafter == true, "Drafter")
            if (local?.isOlderCopy == true) lines += "This copy was downloaded before the faster MTP version. Delete it and download it again to write faster."
            return lines.joinToString("\n") to keyParts.joinToString(",")
        }

        fun update(downloads: Map<String, DownloadState>) {
            val d = downloads[fileName]
            val e = app.engine
            val local = app.models.find(fileName)
            val loadedNow = e.loaded
            val isLoaded = loadedNow?.key == fileName
            val isLoading = e.isLoading && e.loadingKey == fileName
            val failure = app.models.failures[fileName]
            bar.visibility = View.GONE
            bar.isIndeterminate = false
            status.setTextColor(Palette.text2)
            val key: String
            when {
                isLoaded && loadedNow != null -> {
                    key = "loaded"
                    val i = loadedNow.info
                    status.setTextColor(Palette.positive)
                    status.text = "In use · ${i.desc.ifBlank { i.arch }} · ${i.nCtx} context · " +
                        (if (loadedNow.config.lowMemory) "low-memory mode" else "fast mode")
                }
                isLoading -> {
                    key = "loading"
                    bar.visibility = View.VISIBLE
                    if (e.phase == EngineController.Phase.WARMING) {
                        bar.isIndeterminate = true
                        status.text = "Getting ready…"
                    } else {
                        bar.progress = (e.loadProgress * 1000).toInt()
                        status.text = "Loading… ${(e.loadProgress * 100).toInt()}%"
                    }
                }
                local != null -> {
                    key = "local"
                    val need = app.estimatedRam(local)
                    val low = app.lowMemoryFor(local)
                    if (need > app.totalRam * 0.8 && !low) {
                        status.setTextColor(Palette.caution)
                        status.text = "On this phone · needs about ${ModelStore.formatBytes(need)} of memory, more than this phone has free"
                    } else {
                        status.text = "On this phone · needs about ${ModelStore.formatBytes(need)} of memory" +
                            (if (low) " · loads in low-memory mode" else "")
                    }
                }
                d != null -> {
                    key = "downloading"
                    bar.visibility = View.VISIBLE
                    val total: Long = if (d.total > 0) d.total else catalog?.sizeBytes ?: 0L
                    bar.isIndeterminate = total <= 0
                    if (total > 0) bar.progress = (d.done * 1000 / total).toInt()
                    status.text = when (d.status) {
                        DownloadManager.STATUS_PAUSED -> when (d.reason) {
                            DownloadManager.PAUSED_WAITING_FOR_NETWORK -> "Waiting for a connection…"
                            DownloadManager.PAUSED_QUEUED_FOR_WIFI -> "Waiting for Wi-Fi…"
                            DownloadManager.PAUSED_WAITING_TO_RETRY -> "Connection dropped, retrying…"
                            else -> "Paused"
                        }
                        DownloadManager.STATUS_PENDING -> "Starting…"
                        else -> "Downloading ${ModelStore.formatBytes(d.done)} of ${if (total > 0) ModelStore.formatBytes(total) else "?"}"
                    }
                }
                else -> {
                    key = "remote"
                    if (failure != null) {
                        status.setTextColor(Palette.danger)
                        status.text = failure
                    } else {
                        status.text = "Not downloaded"
                    }
                }
            }
            val (extraText, extraKey) = extras(local, downloads)
            extra.text = extraText
            extra.visibility = if (extraText.isEmpty()) View.GONE else View.VISIBLE
            val fullKey = "$key|$extraKey"
            if (fullKey != actionsKey) {
                actionsKey = fullKey
                actions.removeAllViews()
                val row1 = LinearLayout(this@ModelsActivity).apply { orientation = LinearLayout.HORIZONTAL }
                val row2 = LinearLayout(this@ModelsActivity).apply { orientation = LinearLayout.HORIZONTAL }
                actions.orientation = LinearLayout.VERTICAL
                actions.addView(row1)
                actions.addView(row2, lp(WRAP, WRAP).apply { topMargin = dp(8) })
                fun add(v: View, second: Boolean = false) =
                    (if (second) row2 else row1).addView(v, lp(WRAP, WRAP).apply { marginEnd = dp(8) })
                when (key) {
                    "loaded" -> add(pill("Unload") { app.engine.unload() })
                    "loading" -> add(pill("Cancel") { app.engine.cancelLoading() })
                    "local" -> {
                        add(pill("Use", primary = true) { app.models.find(fileName)?.let { use(it) } })
                        add(pill("Delete", danger = true) { app.models.find(fileName)?.let { confirmDelete(it) } })
                    }
                    "downloading" -> add(pill("Cancel") { app.models.cancel(fileName); refresh() })
                    "remote" -> if (catalog != null) add(pill("Download", primary = true) { download(catalog) })
                }
                // picture support and the drafter, once the model itself is here
                val c = catalog
                if (c != null && (key == "local" || key == "loaded")) {
                    val lm = app.models.find(fileName)
                    val pics = c.pictures
                    if (pics != null && lm != null) {
                        val k = app.models.companionKey(fileName, "mmproj")
                        when {
                            downloads.containsKey(k) -> add(pill("Stop picture download") { app.models.cancel(k); refresh() }, true)
                            lm.hasPictures -> add(pill("Remove picture support") { removeExtra(lm, "mmproj") }, true)
                            else -> add(pill("Add picture support (${ModelStore.formatBytes(pics.sizeBytes)})") {
                                downloadExtra(c, "mmproj", pics, "${c.name} picture support")
                            }, true)
                        }
                    }
                    val dr = c.drafter
                    if (dr != null && lm != null && !lm.hasDrafter && !downloads.containsKey(app.models.companionKey(fileName, "drafter"))) {
                        add(pill("Add drafter (${ModelStore.formatBytes(dr.sizeBytes)})") {
                            downloadExtra(c, "drafter", dr, "${c.name} drafter")
                        }, true)
                    }
                }
                row2.visibility = if (row2.childCount > 0) View.VISIBLE else View.GONE
            }
        }
    }

    private fun downloadExtra(m: CatalogModel, kind: String, f: ExtraFile, title: String) {
        if (offlineBlocked()) return
        val free = app.models.freeBytes()
        if (free in 0 until f.sizeBytes + 100_000_000L) {
            Toast.makeText(this, "Not enough free space (${ModelStore.formatBytes(f.sizeBytes)} needed).", Toast.LENGTH_LONG).show()
            return
        }
        val error = app.models.downloadCompanion(m.file, kind, f, title)
        Toast.makeText(this, error ?: "Downloading. The model reloads with it when you go back to the chat.", Toast.LENGTH_LONG).show()
        refresh()
    }

    private fun removeExtra(model: LocalModel, kind: String) {
        val loadedNow = app.engine.loaded?.key == model.file.name
        app.models.deleteCompanion(model, kind)
        if (loadedNow) app.reloadIfNeeded()
        refresh()
    }

    private fun use(model: LocalModel) {
        if (app.chat.generating) {
            Toast.makeText(this, "Wait for the reply to finish, or stop it, first.", Toast.LENGTH_LONG).show()
            return
        }
        val need = app.estimatedRam(model)
        val free = app.availableRam()
        val go = {
            app.loadModel(model)
            finish()
        }
        if (need > free && !app.lowMemoryFor(model)) {
            AlertDialog.Builder(this)
                .setTitle("This may not fit right now")
                .setMessage("${model.displayName} needs about ${ModelStore.formatBytes(need)} of memory and " +
                    "${ModelStore.formatBytes(free)} is free. If it does not fit, it still loads, but it has to read itself " +
                    "from storage again for every step, and a single message can take minutes. Close other apps first, " +
                    "lower the context size, or pick a smaller model (Ternary Bonsai 2 9B is 2.6 GB).")
                .setPositiveButton("Load anyway") { _, _ -> go() }
                .setNegativeButton("Cancel", null)
                .show()
        } else {
            go()
        }
    }

    private fun confirmDelete(model: LocalModel) {
        AlertDialog.Builder(this)
            .setTitle("Delete ${model.displayName}?")
            .setMessage("This frees ${ModelStore.formatBytes(model.sizeBytes)}. You can download it again later.")
            .setPositiveButton("Delete") { _, _ ->
                if (app.engine.loaded?.key == model.file.name) app.engine.unload()
                // let the engine let go of the file first
                main.postDelayed({
                    app.models.delete(model)
                    build()
                }, 300)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun offlineBlocked(): Boolean {
        if (!app.settings.offlineOnly) return false
        AlertDialog.Builder(this)
            .setTitle("Offline only is on")
            .setMessage("Downloads are turned off. Turn off Offline only in Settings to download models.")
            .setPositiveButton("OK", null)
            .show()
        return true
    }

    private fun download(m: CatalogModel) {
        if (offlineBlocked()) return
        val free = app.models.freeBytes()
        if (free in 0 until m.sizeBytes + 200_000_000L) {
            AlertDialog.Builder(this)
                .setTitle("Not enough space")
                .setMessage("${m.name} needs ${ModelStore.formatBytes(m.sizeBytes)} and ${ModelStore.formatBytes(free)} is free.")
                .setPositiveButton("OK", null)
                .show()
            return
        }
        // the drafter is not downloaded with it: on phone-class CPUs it rarely pays off (see Settings,
        // drafting test), so it is a separate button on the model's row
        val error = app.models.download(m.url, m.file, m.name)
        Toast.makeText(this, error ?: "Downloading ${m.name}. It carries on if you leave the app.", Toast.LENGTH_LONG).show()
        refresh()
    }

    private fun askLink() {
        if (offlineBlocked()) return
        val field = EditText(this).apply {
            hint = "https://huggingface.co/…/model-Q4_K_M.gguf"
            setTextColor(Palette.text)
            setHintTextColor(Palette.text3)
            isSingleLine = true
        }
        val box = LinearLayout(this).apply {
            setPadding(dp(20), dp(8), dp(20), 0)
            addView(field, lp(MATCH, WRAP))
        }
        AlertDialog.Builder(this)
            .setTitle("Download from a link")
            .setMessage("Paste a link to a .gguf file.")
            .setView(box)
            .setPositiveButton("Download") { _, _ ->
                val parsed = ModelStore.parseLink(field.text.toString())
                if (parsed == null) {
                    AlertDialog.Builder(this)
                        .setTitle("That link won't work")
                        .setMessage("It has to start with https:// and end in the name of a .gguf file.")
                        .setPositiveButton("OK", null)
                        .show()
                } else {
                    val (url, name) = parsed
                    if (app.models.find(name) != null) {
                        Toast.makeText(this, "$name is already on this phone.", Toast.LENGTH_LONG).show()
                    } else {
                        val error = app.models.download(url, name, name)
                        Toast.makeText(this, error ?: "Downloading $name.", Toast.LENGTH_LONG).show()
                        build()
                    }
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun startImport(uri: Uri) {
        if (importing != null) return
        importing = "the file" to 0
        build()
        app.models.import(uri, { done, total ->
            val pct = if (total > 0) (done * 100 / total).toInt() else 0
            importing = (importing?.first ?: "the file") to pct
            importRow?.text = "Copying… $pct%"
        }) { error ->
            importing = null
            if (!isFinishing && !isDestroyed) {
                build()
                if (error != null) {
                    AlertDialog.Builder(this)
                        .setTitle("Could not import")
                        .setMessage(error)
                        .setPositiveButton("OK", null)
                        .show()
                } else {
                    Toast.makeText(this, "Added. Tap Use to load it.", Toast.LENGTH_LONG).show()
                }
            }
        }
    }
}

package app.offlineai.chat.ui

import android.content.ContentValues
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Outline
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.ViewOutlineProvider
import android.view.inputmethod.EditorInfo
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import app.offlineai.chat.App
import app.offlineai.chat.R
import app.offlineai.chat.data.Disguise
import app.offlineai.chat.data.ModelStore
import app.offlineai.chat.data.Picture
import app.offlineai.chat.data.PictureCatalog
import app.offlineai.chat.data.PictureModel
import app.offlineai.chat.data.PictureStyles
import app.offlineai.chat.engine.PictureEngine
import app.offlineai.chat.engine.PictureJobs
import java.io.File
import kotlin.random.Random

/**
 * Making pictures on the phone: a prompt, a style and a shape go in; the picture comes together
 * step by step in the big card at the top (each step's rough picture is shown as it is made), then
 * joins the grid of everything made so far. Tapping a picture opens it, to share, save to the
 * phone's photos, make again or delete.
 */
class PicturesActivity : AppCompatActivity(), PictureJobs.Listener {
    private lateinit var app: App
    private lateinit var grid: RecyclerView
    private lateinit var adapter: Grid
    private lateinit var prompt: EditText
    private lateinit var make: ImageView
    private lateinit var modelChip: TextView
    private lateinit var styleChip: TextView
    private lateinit var shapeChip: TextView

    // the studio card at the top of the grid
    private lateinit var studio: LinearLayout
    private lateinit var canvas: ImageView
    private lateinit var canvasFrame: FrameLayout
    private lateinit var status: TextView
    private lateinit var bar: ProgressBar
    private lateinit var setup: LinearLayout

    private val main = Handler(Looper.getMainLooper())
    private var pictures: List<Picture> = emptyList()
    private val jobs get() = app.pictureJobs
    private val making get() = jobs.current != null
    /** The finished picture last shown in the studio card. */
    private var shownResult: Picture? = null
    private lateinit var stopPill: TextView
    private lateinit var stepsChip: TextView
    private var lastSeed = 0L
    private val poll = object : Runnable {
        override fun run() {
            refreshSetup()
            main.postDelayed(this, 1000)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        app = App.of(this)
        Palette.apply(this, app.settings)

        val root = FrameLayout(this).apply { setBackgroundColor(Palette.bg) }
        val column = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        val bar0 = topBar("Pictures")
        modelChip = chip("") { pickModel() }.apply {
            // never more than about half the bar, however long the model's name and big the font
            maxLines = 1
            ellipsize = android.text.TextUtils.TruncateAt.END
            maxWidth = resources.displayMetrics.widthPixels * 55 / 100
        }
        bar0.addView(modelChip, lp(WRAP, WRAP))
        column.addView(bar0, lp(MATCH, WRAP))

        buildStudio()
        adapter = Grid()
        grid = RecyclerView(this).apply {
            clipToPadding = false
            setPadding(dp(10), 0, dp(10), dp(180))
            overScrollMode = View.OVER_SCROLL_IF_CONTENT_SCROLLS
            // the studio card is one view, kept: never cross-faded into a second copy of itself
            (itemAnimator as? androidx.recyclerview.widget.SimpleItemAnimator)?.supportsChangeAnimations = false
        }
        val glm = GridLayoutManager(this, 2)
        glm.spanSizeLookup = object : GridLayoutManager.SpanSizeLookup() {
            override fun getSpanSize(position: Int) = if (position == 0) 2 else 1
        }
        grid.layoutManager = glm
        grid.adapter = adapter
        column.addView(grid, lp(MATCH, 0, 1f))
        root.addView(column, FrameLayout.LayoutParams(MATCH, MATCH))
        root.addView(buildComposer(), FrameLayout.LayoutParams(MATCH, WRAP, Gravity.BOTTOM))
        setContentView(root)
        edgeToEdge(root)

        intent.getStringExtra(EXTRA_PROMPT)?.takeIf { it.isNotBlank() }?.let { prompt.setText(it) }
        reload()
        refreshChips()
        refreshSetup()
    }

    override fun onResume() {
        super.onResume()
        main.post(poll)
    }

    override fun onPause() {
        super.onPause()
        main.removeCallbacks(poll)
    }

    override fun onStart() {
        super.onStart()
        jobs.addListener(this)
        // in sight: a finished picture shows here instead of in a notification
        jobs.screenVisible = true
        onPicturesChanged()
    }

    override fun onStop() {
        super.onStop()
        jobs.removeListener(this)
        // out of sight: pictures carry on in the background (with a notification); with none
        // being made, the picture model's memory goes back to the chat model
        jobs.screenVisible = false
    }

    // ------------------------------------------------------------------ the studio card

    private fun buildStudio() {
        studio = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(4), dp(4), dp(4), dp(12))
        }
        canvasFrame = FrameLayout(this).apply {
            background = rounded(Palette.surface1, dp(28).toFloat(), dp(1), Palette.border)
            clipToOutline = true
            outlineProvider = object : ViewOutlineProvider() {
                override fun getOutline(view: View, outline: Outline) =
                    outline.setRoundRect(0, 0, view.width, view.height, dp(28).toFloat())
            }
        }
        canvas = ImageView(this).apply {
            scaleType = ImageView.ScaleType.CENTER_CROP
            visibility = View.GONE
        }
        canvasFrame.addView(canvas, FrameLayout.LayoutParams(MATCH, MATCH))
        val glow = Orb(this)
        glow.tag = "orb"
        canvasFrame.addView(glow, FrameLayout.LayoutParams(dp(96), dp(96), Gravity.CENTER))
        studio.addView(canvasFrame, LinearLayout.LayoutParams(MATCH, 0).apply { height = squareSide() })

        status = text("", 14f, Palette.text2).apply {
            gravity = Gravity.CENTER
            setPadding(dp(16), dp(12), dp(16), dp(4))
        }
        studio.addView(status, lp(MATCH, WRAP))
        bar = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = 1000
            progressTintList = android.content.res.ColorStateList.valueOf(Palette.accent)
            progressBackgroundTintList = android.content.res.ColorStateList.valueOf(Palette.surface3)
            visibility = View.GONE
        }
        studio.addView(bar, lp(MATCH, dp(4)).apply { setMargins(dp(40), dp(6), dp(40), dp(4)) })
        stopPill = pill("Stop") { jobs.cancelAll() }.apply { visibility = View.GONE }
        studio.addView(stopPill, lp(WRAP, WRAP).apply { gravity = Gravity.CENTER_HORIZONTAL; topMargin = dp(8) })

        // shown while no picture model is on the phone yet
        setup = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        studio.addView(setup, lp(MATCH, WRAP))
    }

    private fun squareSide(): Int = resources.displayMetrics.widthPixels - dp(28)

    private fun showIdle() {
        val m = currentModel()
        canvas.visibility = if (canvas.drawable != null) View.VISIBLE else View.GONE
        canvasFrame.findViewWithTag<View>("orb")?.visibility = if (canvas.drawable == null) View.VISIBLE else View.GONE
        bar.visibility = View.GONE
        status.text = when {
            m == null -> "Pick a picture model to start. Everything is made here on the phone."
            !ready(m) -> "${m.name} is not downloaded yet."
            pictures.isEmpty() && canvas.drawable == null -> "Describe a picture below. ${m.name} makes it here, offline."
            else -> status.text.takeIf { it.isNotEmpty() && !making } ?: ""
        }
    }

    // ------------------------------------------------------------------ the composer

    private fun buildComposer(): View {
        val wrap = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            // the page fades into the composer, solid behind the chips and the box, so the grid
            // scrolling under them never shows through their edges
            background = android.graphics.drawable.GradientDrawable(
                android.graphics.drawable.GradientDrawable.Orientation.BOTTOM_TOP,
                intArrayOf(Palette.bg, Palette.bg, androidx.core.graphics.ColorUtils.setAlphaComponent(Palette.bg, 0)),
            ).apply { setColors(intArrayOf(Palette.bg, Palette.bg, androidx.core.graphics.ColorUtils.setAlphaComponent(Palette.bg, 0)), floatArrayOf(0f, 0.72f, 1f)) }
            setPadding(dp(10), dp(28), dp(10), dp(10))
        }
        val chips = FlowLayout(this).apply { setPadding(dp(4), 0, dp(4), dp(8)) }
        styleChip = chip("") { pickStyle() }
        shapeChip = chip("") { pickShape() }
        stepsChip = chip("") { pickSteps() }
        chips.addView(styleChip)
        chips.addView(shapeChip)
        chips.addView(stepsChip)
        wrap.addView(chips, lp(MATCH, WRAP))

        val box = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(18), dp(4), dp(4), dp(4))
            background = rounded(Palette.surface1, dp(26).toFloat(), dp(1), Palette.border)
            elevation = dp(3).toFloat()
        }
        prompt = EditText(this).apply {
            hint = "Describe a picture"
            setHintTextColor(Palette.text3)
            setTextColor(Palette.text)
            textSize = 16f * Palette.fontScale
            background = null
            maxLines = 4
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_SENTENCES or InputType.TYPE_TEXT_FLAG_MULTI_LINE
            imeOptions = EditorInfo.IME_ACTION_GO
            setPadding(0, dp(12), dp(8), dp(12))
        }
        box.addView(prompt, lp(0, WRAP, 1f))
        make = ImageView(this).apply {
            scaleType = ImageView.ScaleType.CENTER
            background = rounded(Palette.accent, dp(22).toFloat())
            contentDescription = "Make the picture"
            setOnClickListener { start(null) }
        }.pressable(0.86f)
        box.addView(make, lp(dp(44), dp(44)))
        wrap.addView(box, lp(MATCH, WRAP))
        setMakeIcon()
        return wrap
    }

    private fun setMakeIcon() {
        make.setImageDrawable(ContextCompat.getDrawable(this, R.drawable.ic_spark)?.mutate()?.apply { setTint(Palette.onAccent) })
        // while one is being made, another waits its turn
        make.contentDescription = if (making) "Make this one next" else "Make the picture"
    }

    private fun chip(label: String, onClick: () -> Unit): TextView = text(label, 13f, Palette.text, bold = true).apply {
        gravity = Gravity.CENTER
        background = ripple(rounded(Palette.surface2, dp(16).toFloat(), dp(1), Palette.border), dp(16).toFloat())
        setPadding(dp(14), dp(7), dp(14), dp(7))
        setOnClickListener { onClick() }
        pressable()
    }

    private fun refreshChips() {
        modelChip.text = (currentModel()?.name ?: "Choose a model") + "  ▾"
        styleChip.text = "Style: " + PictureStyles.byName(app.settings.pictureStyle).name
        val m = currentModel()
        shapeChip.text = SHAPES[app.settings.pictureShape.coerceIn(0, 2)].first
        stepsChip.text = if (m == null) "Steps" else "Steps: ${stepsFor(m)}"
    }

    // ------------------------------------------------------------------ models

    private fun currentModel(): PictureModel? =
        PictureCatalog.byId(app.settings.pictureModel) ?: PictureCatalog.models.firstOrNull { ready(it) }

    private fun modelFile(m: PictureModel) = jobs.modelFile(m)

    private fun ready(m: PictureModel): Boolean = jobs.ready(m)

    private fun download(m: PictureModel) {
        if (app.settings.offlineOnly) {
            toast("Offline only is on (Settings), so downloads are off.")
            return
        }
        val free = app.models.freeBytes()
        if (free in 0 until m.sizeBytes + 200_000_000L) {
            toast("Not enough free space: ${m.name} needs ${ModelStore.formatBytes(m.sizeBytes)}.")
            return
        }
        if (!modelFile(m).isFile && !app.models.isDownloading(m.key)) {
            app.models.download(m.url, m.key, m.name)?.let { toast(it); return }
        }
        val d = m.decoder
        if (d != null && !File(app.models.dir, d.key).isFile && !app.models.isDownloading(d.key)) {
            app.models.download(d.url, d.key, "Picture decoder")
        }
        app.settings.pictureModel = m.id
        refreshChips()
        refreshSetup()
    }

    private fun pickModel() {
        val sheet = Sheet(this, "Picture model", "Each runs here on the phone, offline.")
        val current = currentModel()
        for (m in PictureCatalog.models) {
            val state = when {
                ready(m) -> "${m.steps} step${if (m.steps > 1) "s" else ""} · on this phone"
                app.models.isDownloading(m.key) -> "Downloading…"
                else -> "${ModelStore.formatBytes(m.sizeBytes)} download"
            }
            sheet.item(m.name, R.drawable.ic_image, "$state\n${m.blurb}", checked = m.id == current?.id) {
                app.settings.pictureModel = m.id
                if (!ready(m)) download(m)
                refreshChips()
                refreshSetup()
            }
        }
        if (PictureCatalog.models.any { ready(it) }) {
            sheet.divider().item("Remove a picture model", R.drawable.ic_close, "Frees its space") { removeModel() }
        }
        sheet.show()
    }

    private fun removeModel() {
        val sheet = Sheet(this, "Remove a picture model")
        for (m in PictureCatalog.models.filter { modelFile(it).isFile }) {
            sheet.item(m.name, R.drawable.ic_close, ModelStore.formatBytes(modelFile(m).length()), danger = true) {
                if (jobs.current?.model?.id == m.id) jobs.cancelAll()
                PictureEngine.unload()
                modelFile(m).delete()
                // a decoder no model on the phone uses any more goes too
                for (d in PictureCatalog.Decoder.entries) {
                    if (PictureCatalog.models.none { it.decoder == d && modelFile(it).isFile }) File(app.models.dir, d.key).delete()
                }
                refreshChips()
                refreshSetup()
            }
        }
        sheet.show()
    }

    /** The cards to download a model, while there is none; download progress while it comes. */
    private fun refreshSetup() {
        val downloads = runCatching { app.models.poll() }.getOrDefault(emptyList())
        setup.removeAllViews()
        val m = currentModel()
        val active = downloads.filter { it.fileName.startsWith("pictures/") }
        for (d in active) {
            val name = PictureCatalog.models.firstOrNull { it.key == d.fileName }?.name ?: "Picture decoder"
            val pct = if (d.total > 0) (d.done * 100 / d.total).toInt() else 0
            setup.addView(text("Downloading $name… $pct% (${ModelStore.formatBytes(d.done)} of ${ModelStore.formatBytes(d.total)})",
                13f, Palette.text2).apply {
                gravity = Gravity.CENTER
                setPadding(dp(16), dp(2), dp(16), dp(2))
            })
        }
        app.models.failures.entries.filter { it.key.startsWith("pictures/") }.forEach { (k, why) ->
            setup.addView(text("${k.substringAfter('/')}: $why", 13f, Palette.danger).apply { gravity = Gravity.CENTER })
        }
        if ((m == null || !ready(m)) && active.isEmpty()) {
            setup.addView(sectionTitle("Picture models"))
            for (pm in PictureCatalog.models) setup.addView(modelCard(pm))
        }
        if (!making) showIdle()
        refreshChips()
    }

    private fun modelCard(m: PictureModel): View = card().apply {
        val head = LinearLayout(this@PicturesActivity).apply { orientation = LinearLayout.HORIZONTAL }
        head.addView(text(m.name, 17f, bold = true), lp(0, WRAP, 1f))
        head.addView(text(ModelStore.formatBytes(m.sizeBytes), 13f, Palette.text3))
        addView(head)
        addView(text(m.maker, 13f, Palette.accent).apply { setPadding(0, dp(2), 0, dp(6)) })
        addView(text(m.blurb, 14f, Palette.text2))
        addView(text("License: ${m.license}", 12f, Palette.text3).apply { setPadding(0, dp(6), 0, dp(10)) })
        addView(pill(if (ready(m)) "Use" else "Download", primary = true) {
            app.settings.pictureModel = m.id
            if (!ready(m)) download(m) else { refreshChips(); refreshSetup() }
        }, lp(WRAP, WRAP))
    }

    // ------------------------------------------------------------------ styles and shapes

    private fun pickStyle() {
        val sheet = Sheet(this, "Style")
        val now = PictureStyles.byName(app.settings.pictureStyle)
        for (st in PictureStyles.all) {
            sheet.item(st.name, detail = st.suffix.removePrefix(", ").ifEmpty { "Just your words" }, checked = st == now) {
                app.settings.pictureStyle = st.name
                refreshChips()
            }
        }
        sheet.show()
    }

    private fun pickShape() {
        val sheet = Sheet(this, "Shape")
        val m = currentModel()
        SHAPES.forEachIndexed { i, (name, _) ->
            val size = if (m != null) sizeFor(m, i) else SHAPES[i].second
            sheet.item(name, detail = "${size.first} × ${size.second}", checked = i == app.settings.pictureShape) {
                app.settings.pictureShape = i
                refreshChips()
            }
        }
        sheet.show()
    }

    /** Steps for [m]: what was picked for it, or the steps it was made for. */
    private fun stepsFor(m: PictureModel): Int = app.settings.pictureSteps(m.id, m.steps).coerceIn(1, PictureCatalog.MAX_STEPS)

    /** The picture's size for [shape], around the model's own size, sides in steps of 64. */
    private fun sizeFor(m: PictureModel, shape: Int): Pair<Int, Int> {
        val n = m.native
        val long = (n * 5 / 4 + 32) / 64 * 64
        val short = (n * n / long + 32) / 64 * 64
        return when (shape.coerceIn(0, 2)) {
            1 -> short to long
            2 -> long to short
            else -> n to n
        }
    }

    private fun pickSteps() {
        val m = currentModel() ?: run { pickModel(); return }
        var n = stepsFor(m)
        val label = text("", 28f, bold = true).apply { gravity = Gravity.CENTER }
        val hint = text("", 13f, Palette.text2).apply { gravity = Gravity.CENTER }
        fun show() {
            label.text = "$n step${if (n == 1) "" else "s"}"
            hint.text = when {
                n == m.steps -> "What ${m.name} was made for."
                n < m.steps -> "Faster, rougher. ${m.name} was made for ${m.steps}."
                else -> "Slower, often more detail (about ${n * 100 / m.steps - 100}% longer). ${m.name} was made for ${m.steps}."
            }
        }
        val bar = android.widget.SeekBar(this).apply {
            max = PictureCatalog.MAX_STEPS - 1
            progress = n - 1
            progressTintList = android.content.res.ColorStateList.valueOf(Palette.accent)
            thumbTintList = android.content.res.ColorStateList.valueOf(Palette.accent)
            setOnSeekBarChangeListener(object : android.widget.SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(sb: android.widget.SeekBar, v: Int, fromUser: Boolean) {
                    n = v + 1
                    show()
                }
                override fun onStartTrackingTouch(sb: android.widget.SeekBar) {}
                override fun onStopTrackingTouch(sb: android.widget.SeekBar) {}
            })
        }
        show()
        val box = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        box.addView(label, lp(MATCH, WRAP))
        box.addView(bar, lp(MATCH, WRAP).apply { setMargins(0, dp(12), 0, dp(8)) })
        box.addView(hint, lp(MATCH, WRAP))
        Sheet(this, "Steps", "How many times ${m.name} goes over the picture: 1 to ${PictureCatalog.MAX_STEPS}.")
            .view(box)
            .button("Done") {
                app.settings.setPictureSteps(m.id, n)
                refreshChips()
            }
            .button("Back to ${m.steps}", primary = false) {
                app.settings.setPictureSteps(m.id, m.steps)
                refreshChips()
            }
            .show()
    }

    // ------------------------------------------------------------------ making a picture

    private fun start(seed: Long?) {
        val words = prompt.text.toString().trim()
        app.nativeError?.let {
            toast(it)
            return
        }
        if (words.isEmpty()) {
            toast("Describe the picture first.")
            return
        }
        val m = currentModel()
        if (m == null || !ready(m)) {
            toast(if (m == null) "Pick a picture model first." else "${m.name} is still downloading.")
            pickModel()
            return
        }
        val style = PictureStyles.byName(app.settings.pictureStyle)
        val (w, h) = sizeFor(m, app.settings.pictureShape)
        val s = seed ?: Random.nextLong(1, Int.MAX_VALUE.toLong())
        lastSeed = s
        val queued = making
        if (jobs.add(words, style.name, m, w, h, stepsFor(m), s) == null) {
            toast("Not making that: nothing sexual with children.")
            return
        }
        hideKeyboard()
        grid.smoothScrollToPosition(0)
        if (queued) toast("Next up: it starts when the picture being made is done.")
        onPicturesChanged()
    }

    /** Shows what the queue is doing: the picture coming together, or the last one finished. */
    override fun onPicturesChanged() {
        if (isDestroyed) return
        val j = jobs.current
        setMakeIcon()
        if (j != null) {
            val h = squareSide() * j.height / j.width
            val lpc = canvasFrame.layoutParams as LinearLayout.LayoutParams
            if (lpc.height != h) {
                lpc.height = h
                canvasFrame.layoutParams = lpc
            }
            canvasFrame.setOnClickListener(null)
            val pv = jobs.preview
            if (pv != null) {
                val first = canvas.visibility != View.VISIBLE || shownResult != null
                canvas.setImageBitmap(pv)
                canvas.visibility = View.VISIBLE
                canvasFrame.findViewWithTag<View>("orb")?.visibility = View.GONE
                if (first) Motion.enter(canvas, 0, 1.03f)
            } else {
                canvas.setImageDrawable(null)
                canvas.visibility = View.GONE
                canvasFrame.findViewWithTag<View>("orb")?.visibility = View.VISIBLE
            }
            shownResult = null
            val st = jobs.stage
            val waiting = if (jobs.waiting > 0) " · ${jobs.waiting} more waiting" else ""
            bar.visibility = View.VISIBLE
            if (st.contains("sampl") && jobs.total > 0) {
                bar.isIndeterminate = false
                bar.max = 1000
                bar.setProgress((jobs.done * 1000 / jobs.total).toInt(), true)
                status.text = "Painting · step ${jobs.done.coerceAtMost(jobs.total)} of ${jobs.total}$waiting"
            } else {
                bar.isIndeterminate = true
                status.text = when {
                    st.contains("decod") -> "Finishing the picture…"
                    st.contains("cond") -> "Reading your words…"
                    st.isEmpty() && !PictureEngine.loadedKey.startsWith(modelFile(j.model).path) -> "Loading ${j.model.name}…"
                    else -> "Getting ready…"
                } + waiting
            }
            stopPill.visibility = View.VISIBLE
            stopPill.text = if (jobs.waiting > 0) "Stop all" else "Stop"
            return
        }
        stopPill.visibility = View.GONE
        bar.visibility = View.GONE
        val last = jobs.lastPicture
        val failed = jobs.lastError != null || jobs.lastStopped
        if (!failed && last != null && last.file.isFile) {
            if (last !== shownResult) {
                shownResult = last
                canvas.setImageBitmap(BitmapFactory.decodeFile(last.file.path))
                canvas.visibility = View.VISIBLE
                canvasFrame.findViewWithTag<View>("orb")?.visibility = View.GONE
                Motion.pop(canvasFrame, 0.97f)
                status.text = "${last.model} · ${"%.1f".format(jobs.lastMillis / 1000.0)} s · ${last.steps} steps · seed ${last.seed}"
                canvasFrame.setOnClickListener { if (last.file.isFile) open(last) }
                reload()
            }
        } else if (shownResult == null) {
            // stopped, failed, or nothing made yet: no half-made picture or old step count left behind
            canvas.setImageDrawable(null)
            canvasFrame.setOnClickListener(null)
            status.text = ""
            showIdle()
            jobs.lastError?.let { status.text = it }
            if (jobs.lastError == null && jobs.lastStopped) status.text = "Stopped."
        }
    }

    private fun reload() {
        pictures = app.pictures.all()
        adapter.notifyDataSetChanged()
    }

    // ------------------------------------------------------------------ one picture

    private fun open(p: Picture) {
        val view = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        val image = ImageView(this).apply {
            adjustViewBounds = true
            scaleType = ImageView.ScaleType.FIT_CENTER
            setImageBitmap(BitmapFactory.decodeFile(p.file.path))
            background = rounded(Palette.surface2, dp(20).toFloat())
            clipToOutline = true
        }
        view.addView(image, lp(MATCH, WRAP))
        if (p.prompt.isNotEmpty()) view.addView(text(p.prompt, 15f).apply { setPadding(0, dp(12), 0, dp(4)) })
        val facts = listOfNotNull(
            p.model.ifEmpty { null },
            p.style.takeIf { it.isNotEmpty() && it != "None" },
            "${p.width} × ${p.height}",
            if (p.millis > 0) "%.1f s".format(p.millis / 1000.0) else null,
            "seed ${p.seed}",
        ).joinToString(" · ")
        view.addView(text(facts, 12f, Palette.text3))
        val sheet = Sheet(this)
        sheet.view(view)
        sheet.item("Share", R.drawable.ic_arrow_down, "To another app") { share(p) }
        sheet.item("Save to photos", R.drawable.ic_image, "Pictures/${photosFolder()} on this phone") { saveToPhotos(p) }
        sheet.item("Make it again, differently", R.drawable.ic_refresh, "Same words, a new seed") {
            prompt.setText(p.prompt)
            start(null)
        }
        sheet.item("Make it again, the same way", R.drawable.ic_refresh, "Same words and seed (seed ${p.seed})") {
            prompt.setText(p.prompt)
            start(p.seed)
        }
        sheet.item("Delete", R.drawable.ic_close, danger = true) {
            app.pictures.delete(p)
            if (status.text.contains("seed ${p.seed}")) {
                // the picture in the studio card is the one deleted
                canvas.setImageDrawable(null)
                canvasFrame.setOnClickListener(null)
                status.text = ""
                showIdle()
            }
            reload()
        }
        sheet.show()
    }

    private fun share(p: Picture) {
        val uri = runCatching { FileProvider.getUriForFile(this, "$packageName.files", p.file) }.getOrNull()
        if (uri == null) {
            toast("The picture could not be shared.")
            return
        }
        val send = Intent(Intent.ACTION_SEND).setType("image/png").putExtra(Intent.EXTRA_STREAM, uri)
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        runCatching { startActivity(Intent.createChooser(send, "Share the picture")) }
    }

    private fun photosFolder(): String = if (app.settings.disguised) Disguise.GAME_NAME else getString(R.string.app_name)

    private fun saveToPhotos(p: Picture) {
        val values = ContentValues().apply {
            put(MediaStore.Images.Media.DISPLAY_NAME, p.file.name)
            put(MediaStore.Images.Media.MIME_TYPE, "image/png")
            // hidden as a game, the folder does not give the app away either
            val folder = photosFolder()
            put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/$folder")
        }
        val ok = runCatching {
            val uri = contentResolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values) ?: error("no uri")
            contentResolver.openOutputStream(uri)?.use { out -> p.file.inputStream().use { it.copyTo(out) } }
        }.isSuccess
        toast(if (ok) "Saved to your photos." else "It could not be saved.")
    }

    private fun hideKeyboard() {
        val imm = getSystemService(INPUT_METHOD_SERVICE) as android.view.inputmethod.InputMethodManager
        imm.hideSoftInputFromWindow(prompt.windowToken, 0)
        prompt.clearFocus()
    }

    private fun toast(s: String) = Toast.makeText(this, s, Toast.LENGTH_SHORT).show()

    // ------------------------------------------------------------------ the grid

    private inner class Grid : RecyclerView.Adapter<RecyclerView.ViewHolder>() {
        private val thumbs = HashMap<String, Bitmap?>()

        override fun getItemCount() = 1 + pictures.size
        override fun getItemViewType(position: Int) = if (position == 0) 0 else 1

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
            if (viewType == 0) {
                (studio.parent as? ViewGroup)?.removeView(studio)
                studio.layoutParams = RecyclerView.LayoutParams(MATCH, WRAP)
                return object : RecyclerView.ViewHolder(studio) {}
            }
            val iv = ImageView(parent.context).apply {
                scaleType = ImageView.ScaleType.CENTER_CROP
                background = rounded(Palette.surface1, dp(20).toFloat())
                clipToOutline = true
                outlineProvider = object : ViewOutlineProvider() {
                    override fun getOutline(view: View, outline: Outline) =
                        outline.setRoundRect(0, 0, view.width, view.height, dp(20).toFloat())
                }
            }.pressable(0.97f)
            val side = (resources.displayMetrics.widthPixels - dp(20)) / 2 - dp(8)
            iv.layoutParams = RecyclerView.LayoutParams(MATCH, side).apply { setMargins(dp(4), dp(4), dp(4), dp(4)) }
            return object : RecyclerView.ViewHolder(iv) {}
        }

        override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
            if (position == 0) return
            val p = pictures[position - 1]
            val iv = holder.itemView as ImageView
            iv.contentDescription = p.prompt.ifEmpty { "Picture" }
            iv.setOnClickListener { open(p) }
            val side = (resources.displayMetrics.widthPixels / 2).coerceAtMost(512)
            iv.setImageBitmap(thumbs.getOrPut(p.id) { app.pictures.thumb(p, side) })
        }
    }

    companion object {
        const val EXTRA_PROMPT = "prompt"

        /** Shapes near the models' own 512 × 512 (sides in steps of 64, about as many pixels). */
        val SHAPES = listOf(
            "Square" to (512 to 512),
            "Portrait" to (448 to 640),
            "Landscape" to (640 to 448),
        )
    }
}

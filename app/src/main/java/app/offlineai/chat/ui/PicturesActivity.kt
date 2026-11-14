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
import java.io.File
import kotlin.random.Random

/**
 * Making pictures on the phone: a prompt, a style and a shape go in; the picture comes together
 * step by step in the big card at the top (each step's rough picture is shown as it is made), then
 * joins the grid of everything made so far. Tapping a picture opens it, to share, save to the
 * phone's photos, make again or delete.
 */
class PicturesActivity : AppCompatActivity() {
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
    private var making = false
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
        modelChip = chip("") { pickModel() }
        bar0.addView(modelChip, lp(WRAP, WRAP))
        column.addView(bar0, lp(MATCH, WRAP))

        buildStudio()
        adapter = Grid()
        grid = RecyclerView(this).apply {
            clipToPadding = false
            setPadding(dp(10), 0, dp(10), dp(150))
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

    override fun onDestroy() {
        super.onDestroy()
        if (making) PictureEngine.cancel()
        // the picture model's memory goes back to the phone (and the chat model)
        if (isFinishing) PictureEngine.unload()
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
            setPadding(dp(10), dp(8), dp(10), dp(10))
            // a soft fade from the page into the composer
            background = android.graphics.drawable.GradientDrawable(
                android.graphics.drawable.GradientDrawable.Orientation.BOTTOM_TOP,
                intArrayOf(Palette.bg, Palette.bg, androidx.core.graphics.ColorUtils.setAlphaComponent(Palette.bg, 0)),
            )
        }
        val chips = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(dp(4), 0, dp(4), dp(8))
        }
        styleChip = chip("") { pickStyle() }
        shapeChip = chip("") { pickShape() }
        chips.addView(styleChip, lp(WRAP, WRAP).apply { marginEnd = dp(8) })
        chips.addView(shapeChip, lp(WRAP, WRAP))
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
            setOnClickListener { if (making) PictureEngine.cancel() else start(null) }
        }.pressable(0.86f)
        box.addView(make, lp(dp(44), dp(44)))
        wrap.addView(box, lp(MATCH, WRAP))
        setMakeIcon()
        return wrap
    }

    private fun setMakeIcon() {
        val icon = if (making) R.drawable.ic_stop else R.drawable.ic_spark
        make.setImageDrawable(ContextCompat.getDrawable(this, icon)?.mutate()?.apply { setTint(Palette.onAccent) })
        make.contentDescription = if (making) "Stop" else "Make the picture"
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
        shapeChip.text = SHAPES[app.settings.pictureShape.coerceIn(0, 2)].first
    }

    // ------------------------------------------------------------------ models

    private fun currentModel(): PictureModel? =
        PictureCatalog.byId(app.settings.pictureModel) ?: PictureCatalog.models.firstOrNull { ready(it) }

    private fun modelFile(m: PictureModel) = File(app.models.dir, m.key)
    private fun decoderFile() = File(app.models.dir, PictureCatalog.DECODER_KEY)

    private fun ready(m: PictureModel): Boolean =
        modelFile(m).isFile && (!m.tinyDecoder || decoderFile().isFile)

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
        if (m.tinyDecoder && !decoderFile().isFile && !app.models.isDownloading(PictureCatalog.DECODER_KEY)) {
            app.models.download(PictureCatalog.decoder.url, PictureCatalog.DECODER_KEY, "Picture decoder")
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
                PictureEngine.unload()
                modelFile(m).delete()
                if (PictureCatalog.models.none { it.tinyDecoder && modelFile(it).isFile }) decoderFile().delete()
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
        SHAPES.forEachIndexed { i, (name, size) ->
            sheet.item(name, detail = "${size.first} × ${size.second}", checked = i == app.settings.pictureShape) {
                app.settings.pictureShape = i
                refreshChips()
            }
        }
        sheet.show()
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
        val (w, h) = SHAPES[app.settings.pictureShape.coerceIn(0, 2)].second
        val s = seed ?: Random.nextLong(1, Int.MAX_VALUE.toLong())
        lastSeed = s
        making = true
        setMakeIcon()
        hideKeyboard()
        grid.smoothScrollToPosition(0)
        canvasFrame.layoutParams = (canvasFrame.layoutParams as LinearLayout.LayoutParams).apply { height = squareSide() * h / w }
        canvas.setImageDrawable(null)
        canvas.visibility = View.GONE
        canvasFrame.findViewWithTag<View>("orb")?.visibility = View.VISIBLE
        status.text = if (PictureEngine.loadedKey.startsWith(modelFile(m).path)) "Starting…" else "Loading ${m.name}…"
        bar.visibility = View.VISIBLE
        bar.isIndeterminate = true

        val request = PictureEngine.Request(
            prompt = words + style.suffix,
            negative = style.negative,
            width = w, height = h,
            steps = m.steps, cfg = 1.0f, seed = s, sampler = m.sampler,
        )
        PictureEngine.make(
            modelFile(m).path, if (m.tinyDecoder) decoderFile().path else null, app.threadsNow(), request,
            object : PictureEngine.Events {
                override fun onProgress(stage: String, done: Long, total: Long) {
                    if (isDestroyed) return
                    val sampling = stage.contains("sampl", ignoreCase = true) || stage.contains("denois", ignoreCase = true)
                    if (sampling && total > 0) {
                        bar.isIndeterminate = false
                        bar.setProgress((done * 1000 / total).toInt(), true)
                        status.text = "Painting · step ${done.coerceAtMost(total)} of $total"
                    } else if (stage.contains("decod", ignoreCase = true)) {
                        status.text = "Finishing the picture…"
                    } else if (stage.contains("cond", ignoreCase = true) || stage.contains("text", ignoreCase = true)) {
                        status.text = "Reading your words…"
                    }
                }

                override fun onPreview(preview: Bitmap) {
                    if (isDestroyed) return
                    val first = canvas.drawable == null
                    canvas.setImageBitmap(preview)
                    canvas.visibility = View.VISIBLE
                    canvasFrame.findViewWithTag<View>("orb")?.visibility = View.GONE
                    if (first) Motion.enter(canvas, 0, 1.03f)
                }

                override fun onDone(picture: Bitmap?, error: String?, millis: Long) {
                    making = false
                    if (isDestroyed) return
                    setMakeIcon()
                    bar.visibility = View.GONE
                    if (picture == null) {
                        canvas.setImageDrawable(null)
                        status.text = error ?: "Stopped."
                        showIdle()
                        if (error != null) status.text = error
                        return
                    }
                    canvas.setImageBitmap(picture)
                    canvas.visibility = View.VISIBLE
                    Motion.pop(canvasFrame, 0.97f)
                    val saved = app.pictures.save(picture, words, style.name, m.name, s, millis)
                    status.text = "${m.name} · ${"%.1f".format(millis / 1000.0)} s · seed $s"
                    reload()
                    canvasFrame.setOnClickListener { if (saved.file.isFile) open(saved) }
                }
            },
        )
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

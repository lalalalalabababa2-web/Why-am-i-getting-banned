package app.offlineai.chat.ui

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Outline
import android.os.Handler
import android.os.Looper
import android.util.LruCache
import android.view.Gravity
import android.view.View
import android.view.ViewOutlineProvider
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import androidx.appcompat.app.AlertDialog
import androidx.core.content.ContextCompat
import app.offlineai.chat.R
import app.offlineai.chat.data.Attachment
import java.util.Locale
import java.util.concurrent.Executors

/** Small previews of attached pictures and video frames, decoded off the main thread and kept for a while. */
object Thumbs {
    private val cache = object : LruCache<String, Bitmap>(16 * 1024 * 1024) {
        override fun sizeOf(key: String, value: Bitmap) = value.byteCount
    }
    private val io = Executors.newSingleThreadExecutor { r -> Thread(r, "thumbs").apply { priority = Thread.MIN_PRIORITY } }
    private val main = Handler(Looper.getMainLooper())

    fun decode(path: String, maxSide: Int): Bitmap? = try {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(path, bounds)
        var sample = 1
        while (bounds.outWidth / (sample * 2) >= maxSide && bounds.outHeight / (sample * 2) >= maxSide) sample *= 2
        BitmapFactory.decodeFile(path, BitmapFactory.Options().apply { inSampleSize = sample })
    } catch (e: Throwable) {
        null
    }

    fun load(path: String, sizePx: Int, into: ImageView) {
        val key = "$path@$sizePx"
        into.tag = key
        val hit = cache.get(key)
        if (hit != null) {
            into.setImageBitmap(hit)
            return
        }
        into.setImageDrawable(null)
        io.execute {
            val b = decode(path, sizePx) ?: return@execute
            cache.put(key, b)
            main.post { if (into.tag == key) into.setImageBitmap(b) }
        }
    }

    fun duration(ms: Long): String {
        val s = (ms + 500) / 1000
        return String.format(Locale.US, "%d:%02d", s / 60, s % 60)
    }

    /** A square preview of [a] with a small label (video length, sound length), and a tap action. */
    fun tile(ctx: Context, a: Attachment, sizeDp: Int, onClick: (() -> Unit)?, onRemove: (() -> Unit)? = null): View {
        val size = ctx.dp(sizeDp)
        val frame = FrameLayout(ctx)
        val radius = ctx.dp(10).toFloat()
        val preview = a.preview
        if (preview != null) {
            val img = ImageView(ctx).apply {
                scaleType = ImageView.ScaleType.CENTER_CROP
                setBackgroundColor(Palette.surface2)
                clipToOutline = true
                outlineProvider = object : ViewOutlineProvider() {
                    override fun getOutline(view: View, outline: Outline) = outline.setRoundRect(0, 0, view.width, view.height, radius)
                }
                contentDescription = if (a.kind == "video") "Video" else "Picture"
            }
            load(preview, size, img)
            frame.addView(img, FrameLayout.LayoutParams(size, size))
        } else {
            val box = LinearLayout(ctx).apply {
                orientation = LinearLayout.VERTICAL
                gravity = Gravity.CENTER
                background = rounded(Palette.surface2, radius, ctx.dp(1), Palette.border)
                contentDescription = "Sound recording"
            }
            box.addView(ImageView(ctx).apply {
                setImageDrawable(ContextCompat.getDrawable(ctx, if (a.name.isBlank()) R.drawable.ic_mic else R.drawable.ic_audio)
                    ?.mutate()?.apply { setTint(Palette.accent) })
            })
            frame.addView(box, FrameLayout.LayoutParams(size, size))
        }
        if (a.kind != "image") {
            val badge = ctx.text(
                (if (a.kind == "video") "▶ " else "") + duration(a.durationMs), 11f, 0xFFFFFFFF.toInt(), bold = true,
            ).apply {
                background = rounded(0x99000000.toInt(), ctx.dp(6).toFloat())
                setPadding(ctx.dp(5), ctx.dp(1), ctx.dp(5), ctx.dp(1))
            }
            frame.addView(badge, FrameLayout.LayoutParams(FrameLayout.LayoutParams.WRAP_CONTENT, FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.BOTTOM or Gravity.START).apply { setMargins(ctx.dp(4), 0, 0, ctx.dp(4)) })
        }
        if (onRemove != null) {
            val x = ImageView(ctx).apply {
                setImageDrawable(ContextCompat.getDrawable(ctx, R.drawable.ic_close)?.mutate()?.apply { setTint(0xFFFFFFFF.toInt()) })
                background = rounded(0xAA000000.toInt(), ctx.dp(11).toFloat())
                setPadding(ctx.dp(3), ctx.dp(3), ctx.dp(3), ctx.dp(3))
                contentDescription = "Remove"
                setOnClickListener { onRemove() }
            }
            frame.addView(x, FrameLayout.LayoutParams(ctx.dp(22), ctx.dp(22), Gravity.TOP or Gravity.END).apply {
                setMargins(0, ctx.dp(3), ctx.dp(3), 0)
            })
        }
        if (onClick != null) frame.setOnClickListener { onClick() }
        return frame
    }

    /** Shows a picture (or a video's frames, one after another) full size. */
    fun show(ctx: Context, a: Attachment) {
        if (a.kind == "audio") {
            AlertDialog.Builder(ctx)
                .setTitle(if (a.name.isBlank()) "Recording" else a.name)
                .setMessage("A sound of ${duration(a.durationMs)}, sent to the model as it is.")
                .setPositiveButton("OK", null)
                .show()
            return
        }
        var index = 0
        val img = ImageView(ctx).apply {
            adjustViewBounds = true
            scaleType = ImageView.ScaleType.FIT_CENTER
        }
        val caption = ctx.text("", 13f, Palette.text2).apply { gravity = Gravity.CENTER; setPadding(0, ctx.dp(8), 0, 0) }
        fun showFrame() {
            val p = a.files.getOrNull(index) ?: return
            io.execute {
                val b = decode(p, 1600)
                main.post { img.setImageBitmap(b) }
            }
            caption.text = if (a.kind == "video") "Frame ${index + 1} of ${a.files.size} ${a.labels.getOrNull(index) ?: ""}" else a.name
        }
        val box = LinearLayout(ctx).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(ctx.dp(12), ctx.dp(12), ctx.dp(12), ctx.dp(4))
            addView(img, LinearLayout.LayoutParams(MATCH, WRAP))
            addView(caption, LinearLayout.LayoutParams(MATCH, WRAP))
        }
        showFrame()
        val b = AlertDialog.Builder(ctx).setView(box).setPositiveButton("Close", null)
        if (a.files.size > 1) b.setNeutralButton("Next frame", null)
        val d = b.show()
        if (a.files.size > 1) {
            d.getButton(AlertDialog.BUTTON_NEUTRAL)?.setOnClickListener {
                index = (index + 1) % a.files.size
                showFrame()
            }
        }
    }
}

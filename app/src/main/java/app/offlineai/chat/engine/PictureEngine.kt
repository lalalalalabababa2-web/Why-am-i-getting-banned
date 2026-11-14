package app.offlineai.chat.engine

import android.graphics.Bitmap
import android.os.Handler
import android.os.Looper
import org.json.JSONObject
import java.util.concurrent.Executors

/**
 * The calls into the picture maker (app/src/main/cpp/pictures.cpp: stable-diffusion.cpp on the
 * chat engine's ggml). Load, make and unload run on this object's own thread, one at a time;
 * [cancel] works from anywhere.
 */
object PictureEngine {
    @JvmStatic private external fun nativeLoad(path: ByteArray, taesd: ByteArray?, threads: Int): ByteArray?
    @JvmStatic private external fun nativeUnload()
    @JvmStatic private external fun nativeCancel()
    @JvmStatic private external fun nativeLastError(): ByteArray
    @JvmStatic private external fun nativeGenerate(request: ByteArray, listener: PictureListener?): IntArray?

    private val worker = Executors.newSingleThreadExecutor { r -> Thread(r, "pictures").apply { priority = Thread.MAX_PRIORITY } }
    private val main = Handler(Looper.getMainLooper())

    /** The model loaded now ("" for none), as path|decoder|threads. */
    @Volatile var loadedKey: String = ""
        private set

    @Volatile var busy = false
        private set

    data class Request(
        val prompt: String,
        val negative: String,
        val width: Int,
        val height: Int,
        val steps: Int,
        val cfg: Float,
        val seed: Long,
        val sampler: String,
    )

    interface Events {
        /** [stage] as the library names it ("sampling", "decode", …); [total] 0 when unknown. */
        fun onProgress(stage: String, done: Long, total: Long)
        /** The picture so far, small and soft, after each step. */
        fun onPreview(preview: Bitmap)
        /** The picture, or null with why (null reason when it was cancelled). */
        fun onDone(picture: Bitmap?, error: String?, millis: Long)
    }

    fun make(model: String, decoder: String?, threads: Int, request: Request, events: Events) {
        busy = true
        worker.execute {
            val t0 = System.currentTimeMillis()
            val key = "$model|${decoder.orEmpty()}|$threads"
            var error: String? = null
            if (loadedKey != key) {
                loadedKey = ""
                error = nativeLoad(model.toByteArray(), decoder?.toByteArray(), threads)?.let { String(it) }
                if (error == null) loadedKey = key
            }
            var picture: Bitmap? = null
            if (error == null) {
                val json = JSONObject()
                    .put("prompt", request.prompt)
                    .put("negative", request.negative)
                    .put("width", request.width)
                    .put("height", request.height)
                    .put("steps", request.steps)
                    .put("cfg", request.cfg.toDouble())
                    .put("seed", request.seed)
                    .put("sampler", request.sampler)
                val listener = object : PictureListener {
                    override fun onProgress(stage: String, done: Long, total: Long) {
                        main.post { events.onProgress(stage, done, total) }
                    }

                    override fun onPreview(width: Int, height: Int, pixels: IntArray) {
                        val bmp = Bitmap.createBitmap(pixels, width, height, Bitmap.Config.ARGB_8888)
                        main.post { events.onPreview(bmp) }
                    }
                }
                val out = nativeGenerate(json.toString().toByteArray(), listener)
                if (out != null && out.size > 2) {
                    val w = out[0]
                    val h = out[1]
                    picture = Bitmap.createBitmap(out, 2, w, w, h, Bitmap.Config.ARGB_8888)
                } else {
                    // empty when it was cancelled
                    error = String(nativeLastError()).ifBlank { null }
                }
            }
            val ms = System.currentTimeMillis() - t0
            busy = false
            main.post { events.onDone(picture, error, ms) }
        }
    }

    fun cancel() = nativeCancel()

    /** Frees the picture model's memory (after the queued work). */
    fun unload() {
        worker.execute {
            nativeUnload()
            loadedKey = ""
        }
    }
}

/** Called from the native side, on the picture thread. */
interface PictureListener {
    fun onProgress(stage: String, done: Long, total: Long)
    fun onPreview(width: Int, height: Int, pixels: IntArray)
}

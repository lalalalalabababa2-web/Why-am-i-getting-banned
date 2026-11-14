package app.offlineai.chat.engine

import android.graphics.Bitmap
import app.offlineai.chat.App
import app.offlineai.chat.PictureService
import app.offlineai.chat.data.Picture
import app.offlineai.chat.data.PictureCatalog
import app.offlineai.chat.data.PictureLine
import app.offlineai.chat.data.PictureModel
import app.offlineai.chat.data.PictureStyles
import java.io.File

/**
 * The pictures being made, for the whole app: a queue that carries on when the Pictures screen is
 * closed or another app is in front (a foreground service with a notification keeps Android from
 * stopping it; see [PictureService]). The screen only watches. Main thread only.
 */
class PictureJobs(private val app: App) {
    data class Job(
        val id: Long,
        val prompt: String,
        val style: String,
        val model: PictureModel,
        val width: Int,
        val height: Int,
        val steps: Int,
        val seed: Long,
    )

    fun interface Listener {
        fun onPicturesChanged()
    }

    private val queue = ArrayDeque<Job>()
    private val listeners = mutableSetOf<Listener>()

    var current: Job? = null
        private set
    /** Where the current picture is: the library's stage name, and its steps. */
    var stage = ""
        private set
    var done = 0L
        private set
    var total = 0L
        private set
    /** The current picture so far (soft and small), after each step. */
    var preview: Bitmap? = null
        private set
    /** The last picture finished, and the last error (null after a success or a stop). */
    var lastPicture: Picture? = null
        private set
    var lastError: String? = null
        private set
    var lastMillis = 0L
        private set
    /** How many are waiting after the current one. */
    val waiting: Int get() = queue.size
    /** Set by the Pictures screen while it is in sight (so finished pictures need no notification). */
    var screenVisible = false
        set(v) {
            field = v
            if (!v && current == null) PictureEngine.unload()
        }

    fun addListener(l: Listener) {
        listeners.add(l)
    }

    fun removeListener(l: Listener) {
        listeners.remove(l)
    }

    private fun changed() {
        listeners.toList().forEach { it.onPicturesChanged() }
        PictureService.update(app)
    }

    fun modelFile(m: PictureModel) = File(app.models.dir, m.key)
    fun decoderFile(m: PictureModel): File? = m.decoder?.let { File(app.models.dir, it.key) }

    fun ready(m: PictureModel): Boolean = modelFile(m).isFile && (decoderFile(m)?.isFile ?: true)

    /** Queues a picture; refused (null) when the prompt crosses [PictureLine]. */
    fun add(prompt: String, style: String, model: PictureModel, width: Int, height: Int, steps: Int, seed: Long): Job? {
        if (PictureLine.refuses(prompt)) return null
        val j = Job(System.nanoTime(), prompt, style, model, width, height, steps.coerceIn(1, PictureCatalog.MAX_STEPS), seed)
        queue.addLast(j)
        if (current == null) next() else changed()
        return j
    }

    /** Stops the picture being made, and drops the ones waiting. */
    fun cancelAll() {
        queue.clear()
        if (current != null) PictureEngine.cancel()
        changed()
    }

    private fun next() {
        val j = queue.removeFirstOrNull()
        current = j
        stage = ""
        done = 0
        total = 0
        preview = null
        if (j == null) {
            PictureService.stop(app)
            if (!screenVisible) PictureEngine.unload()
            changed()
            return
        }
        PictureService.start(app)
        changed()
        val st = PictureStyles.byName(j.style)
        val request = PictureEngine.Request(
            prompt = j.prompt + st.suffix,
            negative = listOfNotNull(
                j.model.negative, st.negative,
                PictureLine.KEEP_OUT.takeIf { PictureLine.isSexual(j.prompt) },
            ).filter { it.isNotEmpty() }.joinToString(", "),
            width = j.width, height = j.height,
            steps = j.steps, cfg = j.model.cfg, seed = j.seed, sampler = j.model.sampler, scheduler = j.model.scheduler,
        )
        PictureEngine.make(modelFile(j.model).path, decoderFile(j.model)?.path, app.threadsNow(), request, object : PictureEngine.Events {
            override fun onProgress(stage: String, done: Long, total: Long) {
                if (current !== j) return
                this@PictureJobs.stage = stage
                this@PictureJobs.done = done
                this@PictureJobs.total = total
                changed()
            }

            override fun onPreview(preview: Bitmap) {
                if (current !== j) return
                this@PictureJobs.preview = preview
                changed()
            }

            override fun onDone(picture: Bitmap?, error: String?, millis: Long) {
                lastMillis = millis
                lastError = error
                if (picture != null) {
                    val saved = app.pictures.save(picture, j.prompt, j.style, j.model.name, j.seed, millis, j.steps)
                    lastPicture = saved
                    if (!screenVisible) PictureService.ready(app, saved)
                } else if (error != null && !screenVisible) {
                    PictureService.failed(app, error)
                }
                next()
            }
        })
    }
}

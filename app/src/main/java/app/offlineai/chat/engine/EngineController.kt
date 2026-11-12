package app.offlineai.chat.engine

import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import org.json.JSONObject
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference

/** What the native engine reports about the loaded model. */
data class ModelInfo(
    val name: String,
    val arch: String,
    val desc: String,
    val sizeBytes: Long,
    val nParams: Long,
    val nCtxTrain: Int,
    val nCtx: Int,
    val nThreads: Int,
    val supportsThinking: Boolean,
    val hasTemplate: Boolean,
    val memory: String,
    /** How replies are drafted ahead: "", "mtp", "drafter", "ngram" or two joined by "+". */
    val speculative: String,
    val specNMax: Int,
    val hasMtp: Boolean = false,
    val vision: Boolean,
    val audio: Boolean,
    val computeBytes: Long,
) {
    companion object {
        fun parse(json: String): ModelInfo {
            val j = JSONObject(json)
            return ModelInfo(
                name = j.optString("name"),
                arch = j.optString("arch"),
                desc = j.optString("desc"),
                sizeBytes = j.optLong("size_bytes"),
                nParams = j.optLong("n_params"),
                nCtxTrain = j.optInt("n_ctx_train"),
                nCtx = j.optInt("n_ctx"),
                nThreads = j.optInt("n_threads"),
                supportsThinking = j.optBoolean("supports_thinking"),
                hasTemplate = j.optBoolean("has_template"),
                memory = j.optString("memory"),
                speculative = j.optString("speculative"),
                specNMax = j.optInt("spec_n_max"),
                hasMtp = j.optBoolean("has_mtp"),
                vision = j.optBoolean("vision"),
                audio = j.optBoolean("audio"),
                computeBytes = j.optLong("compute_bytes"),
            )
        }
    }
}

/** How a model is loaded. Changing any of these needs a reload; threads can change live. */
data class LoadConfig(
    val nCtx: Int,
    val nThreads: Int,
    val nUbatch: Int,
    val lowMemory: Boolean,
    val kvQ8: Boolean,
    /** Tokens drafted ahead per step (0: off). */
    val specNMax: Int = 0,
    val specNgram: Boolean = false,
    /** A drafter file next to the model (Gemma 4 "mtp-*.gguf"), or empty. */
    val drafterPath: String = "",
    /** The picture/sound projector, or empty. */
    val mmprojPath: String = "",
    val imageMaxTokens: Int = 0,
    /** Full sliding-window cache (drafting and cheap rollbacks) or a compact one (less memory). */
    val swaFull: Boolean = true,
) {
    fun sameShape(o: LoadConfig) = copy(nThreads = 0) == o.copy(nThreads = 0)

    fun toJson(): JSONObject = JSONObject()
        .put("n_ctx", nCtx)
        .put("n_threads", nThreads)
        .put("n_batch", 512)
        .put("n_ubatch", nUbatch)
        .put("low_memory", lowMemory)
        .put("kv_q8", kvQ8)
        .put("spec_n_max", specNMax)
        .put("spec_ngram", specNgram)
        .put("drafter", drafterPath)
        .put("mmproj", mmprojPath)
        .put("image_max_tokens", imageMaxTokens)
        .put("swa_full", swaFull)
}

data class LoadedModel(
    val key: String,
    val displayName: String,
    val path: String,
    val config: LoadConfig,
    val info: ModelInfo,
    val loadMs: Long,
) {
    val nCtx: Int get() = config.nCtx
}

/** The outcome of one reply. */
data class ChatOutcome(
    val ok: Boolean,
    val content: String,
    val reasoning: String,
    val error: String,
    val nPrompt: Int,
    val nReused: Int,
    val nEvaluated: Int,
    val nGenerated: Int,
    val tPromptMs: Double,
    val tGenMs: Double,
    val tFirstMs: Double,
    val nDropped: Int,
    val stopReason: String,
    val nDrafted: Int = 0,
    val nAccepted: Int = 0,
    val nSteps: Int = 0,
    val nMedia: Int = 0,
    val tMediaMs: Double = 0.0,
    /** Pages read back from storage during the turn: many means the model did not fit in free memory. */
    val nMajflt: Long = 0,
    /** Separate answers a team reply was written from (0: not a team reply). */
    val team: Int = 0,
) {
    companion object {
        fun parse(json: String): ChatOutcome {
            val j = JSONObject(json)
            val s = j.optJSONObject("stats") ?: JSONObject()
            return ChatOutcome(
                ok = j.optBoolean("ok"),
                content = j.optString("content"),
                reasoning = j.optString("reasoning"),
                error = j.optString("error"),
                nPrompt = s.optInt("n_prompt"),
                nReused = s.optInt("n_reused"),
                nEvaluated = s.optInt("n_evaluated"),
                nGenerated = s.optInt("n_generated"),
                tPromptMs = s.optDouble("t_prompt_ms", 0.0),
                tGenMs = s.optDouble("t_gen_ms", 0.0),
                tFirstMs = s.optDouble("t_first_ms", 0.0),
                nDropped = s.optInt("n_dropped"),
                stopReason = s.optString("stop_reason"),
                nDrafted = s.optInt("n_drafted"),
                nAccepted = s.optInt("n_accepted"),
                nSteps = s.optInt("n_steps"),
                nMedia = s.optInt("n_media"),
                tMediaMs = s.optDouble("t_media_ms", 0.0),
                nMajflt = s.optLong("n_majflt"),
                team = s.optInt("team"),
            )
        }

        fun failure(message: String) = ChatOutcome(false, "", "", message, 0, 0, 0, 0, 0.0, 0.0, 0.0, 0, "error")

        /** Stopped before the engine started on it. */
        fun stoppedEarly() = ChatOutcome(true, "", "", "", 0, 0, 0, 0, 0.0, 0.0, 0.0, 0, "stopped")
    }
}

data class BenchRow(val threads: Int, val readTps: Double, val writeTps: Double)

/** Callbacks for one reply, always delivered on the main thread. */
interface ReplyListener {
    fun onPromptProgress(done: Int, total: Int)
    fun onUpdate(reasoning: String, content: String, generated: Int)
    fun onDone(outcome: ChatOutcome)
    /** Reading attachment [index] of [total] (the slow part on a phone); -1 while the picture part loads. */
    fun onMedia(index: Int, total: Int) {}
}

/**
 * Owns the native engine. Every native call runs on one dedicated thread with a large stack
 * (chat templates are rendered by a recursive interpreter), in the order it was asked for.
 * State changes are announced on the main thread.
 */
class EngineController {
    enum class Phase { IDLE, LOADING, WARMING, READY, BUSY }

    fun interface StateListener {
        fun onEngineState()
    }

    /** Told what the engine is about to do, so a crash during it can be explained afterwards. */
    var activityLog: ((String?) -> Unit)? = null

    private val main = Handler(Looper.getMainLooper())
    private val queue = LinkedBlockingQueue<() -> Unit>()
    private val listeners = mutableListOf<StateListener>()
    private val cancelLoad = AtomicBoolean(false)
    /** The conversation to read ahead next, until the engine thread picks it up. */
    private val aheadRequest = AtomicReference<ByteArray?>(null)
    /**
     * Stop was pressed for the reply that is waiting or being written. The engine forgets a stop
     * that comes before it starts on a reply (a reply can wait about a second behind a read-ahead
     * step), so this one is kept until the reply ends and given to the engine again.
     */
    private val replyStopped = AtomicBoolean(false)
    /** A reply is queued and the engine has not started on it. */
    private val replyWaiting = AtomicBoolean(false)

    @Volatile var phase: Phase = Phase.IDLE
        private set
    @Volatile var loaded: LoadedModel? = null
        private set
    @Volatile var loadingName: String? = null
        private set
    @Volatile var loadingKey: String? = null
        private set
    @Volatile var loadProgress: Float = 0f
        private set
    @Volatile var lastError: String? = null
        private set

    private val worker = Thread(null, {
        while (true) {
            val job = queue.take()
            try {
                job()
            } catch (t: Throwable) {
                lastError = t.message ?: t.toString()
                phase = if (loaded != null) Phase.READY else Phase.IDLE
                loadingName = null
                loadingKey = null
                announce()
            }
        }
    }, "engine", 64L * 1024 * 1024).apply {
        isDaemon = true
        start()
    }

    fun addListener(l: StateListener) {
        listeners.add(l)
    }

    fun removeListener(l: StateListener) {
        listeners.remove(l)
    }

    private fun announce() {
        main.post { listeners.toList().forEach { it.onEngineState() } }
    }

    val isBusy: Boolean get() = phase == Phase.BUSY || phase == Phase.LOADING || phase == Phase.WARMING
    val isLoading: Boolean get() = phase == Phase.LOADING || phase == Phase.WARMING

    /**
     * Reads the conversation ahead of the next message while the engine has nothing else to do, so
     * the next reply starts sooner (see NativeEngine.nativeReadAhead). [request] is the request the
     * next reply would get, with a stand-in for the message. Nothing shows it: the engine still
     * counts as ready, and anything else asked of it ends the read-ahead first.
     */
    fun readAhead(request: JSONObject) {
        if (loaded == null || phase != Phase.READY) return
        runCatching { NativeEngine.nativeAllowReadAhead(true) }
        val bytes = request.toString().toByteArray(Charsets.UTF_8)
        // one waiting at a time: a newer conversation replaces one that has not started
        if (aheadRequest.getAndSet(bytes) != null) return
        queue.put {
            val b = aheadRequest.getAndSet(null) ?: return@put
            if (loaded != null) NativeEngine.nativeReadAhead(b)
        }
    }

    /** What is asked next goes first: ends a read-ahead after the step it is on, drops one that waits. */
    private fun endReadAhead() {
        aheadRequest.set(null)
        runCatching { NativeEngine.nativeAllowReadAhead(false) }
    }

    /** Loads a model, replacing the current one. [onDone] gets null on success or the reason it failed. */
    fun load(key: String, displayName: String, path: String, config: LoadConfig, onDone: ((String?) -> Unit)? = null) {
        endReadAhead()
        if (phase == Phase.BUSY) NativeEngine.nativeStop()
        cancelLoad.set(false)
        loadingName = displayName
        loadingKey = key
        loadProgress = 0f
        lastError = null
        phase = Phase.LOADING
        announce()
        queue.put {
            phase = Phase.LOADING
            loaded = null
            NativeEngine.nativeUnload()
            activityLog?.invoke("loading:$key")
            val started = SystemClock.uptimeMillis()
            var lastPost = 0L
            val err = NativeEngine.nativeLoad(
                path.toByteArray(Charsets.UTF_8), config.toJson().toString().toByteArray(Charsets.UTF_8),
                object : LoadListener {
                    override fun onProgress(progress: Float): Boolean {
                        loadProgress = progress
                        val now = SystemClock.uptimeMillis()
                        if (now - lastPost > 100) {
                            lastPost = now
                            announce()
                        }
                        return !cancelLoad.get()
                    }

                    override fun onWarmup() {
                        phase = Phase.WARMING
                        announce()
                    }
                },
            )
            val message = err?.toString(Charsets.UTF_8)
            if (message == null) {
                val info = ModelInfo.parse(NativeEngine.nativeInfo().toString(Charsets.UTF_8))
                loaded = LoadedModel(key, displayName, path, config, info, SystemClock.uptimeMillis() - started)
                phase = Phase.READY
                activityLog?.invoke("ready:$key")
            } else {
                lastError = if (cancelLoad.get()) null else message
                phase = Phase.IDLE
                activityLog?.invoke(null)
            }
            loadingName = null
            loadingKey = null
            announce()
            if (onDone != null) main.post { onDone(message) }
        }
    }

    fun cancelLoading() {
        cancelLoad.set(true)
    }

    /** The second model of a team, loaded next to the model; null when there is none. */
    data class Partner(val key: String, val displayName: String)

    @Volatile
    var partner: Partner? = null
        private set

    /** Loads [path] as the team partner, in place of any other. [onDone] gets null on success or the reason it failed. */
    fun loadPartner(key: String, displayName: String, path: String, config: LoadConfig, onDone: ((String?) -> Unit)? = null) {
        queue.put {
            NativeEngine.nativeUnloadPartner()
            partner = null
            val err = NativeEngine.nativeLoadPartner(
                path.toByteArray(Charsets.UTF_8), config.toJson().toString().toByteArray(Charsets.UTF_8),
            )?.toString(Charsets.UTF_8)
            if (err == null) partner = Partner(key, displayName)
            announce()
            if (onDone != null) main.post { onDone(err) }
        }
    }

    fun unloadPartner() {
        queue.put {
            if (partner != null) {
                NativeEngine.nativeUnloadPartner()
                partner = null
                announce()
            }
        }
    }

    fun unload() {
        endReadAhead()
        if (phase == Phase.BUSY) NativeEngine.nativeStop()
        queue.put {
            NativeEngine.nativeUnload()
            loaded = null
            phase = Phase.IDLE
            activityLog?.invoke(null)
            announce()
        }
    }

    /** Forgets the conversation held in the model's memory. */
    fun resetCache() {
        endReadAhead()
        queue.put { if (loaded != null) NativeEngine.nativeResetCache() }
    }

    /** Frees the picture part of the model (it loads again with the next picture). */
    fun releaseMedia() {
        endReadAhead()
        queue.put { if (loaded != null) NativeEngine.nativeReleaseMedia() }
    }

    /** Gentle mode while another app is in front (see [NativeEngine.nativeSetBackground]). */
    fun setBackground(on: Boolean, threads: Int) {
        runCatching { NativeEngine.nativeSetBackground(on, threads) }
    }

    /** Threads for the next step; takes effect between tokens, even in the middle of a reply. */
    fun setThreads(n: Int) {
        if (n > 0) NativeEngine.nativeSetThreads(n)
    }

    fun systemInfo(callback: (String) -> Unit) {
        queue.put {
            val s = NativeEngine.nativeSystemInfo()
            main.post { callback(s) }
        }
    }

    /** Measures reading and writing speed at each thread count. Clears the model's memory. */
    fun bench(threads: IntArray, nPrompt: Int, nGen: Int, onRow: (BenchRow) -> Unit, onDone: (List<BenchRow>, String?) -> Unit) {
        if (loaded == null) {
            main.post { onDone(emptyList(), "No model is loaded.") }
            return
        }
        endReadAhead()
        phase = Phase.BUSY
        announce()
        queue.put {
            val rows = mutableListOf<BenchRow>()
            var error: String? = null
            // one count at a time, so each result shows as soon as it is measured
            for (t in threads) {
                val j = JSONObject(NativeEngine.nativeBench(intArrayOf(t), nPrompt, nGen).toString(Charsets.UTF_8))
                val arr = j.optJSONArray("results")
                val e = j.optString("error")
                if (e.isNotBlank()) error = e
                if (arr == null || arr.length() == 0) break
                val o = arr.getJSONObject(0)
                val row = BenchRow(o.getInt("threads"), o.getDouble("pp"), o.getDouble("tg"))
                rows += row
                main.post { onRow(row) }
            }
            loaded?.let { NativeEngine.nativeSetThreads(it.config.nThreads) }
            phase = if (loaded != null) Phase.READY else Phase.IDLE
            announce()
            main.post { onDone(rows, error) }
        }
    }

    /** Starts a reply. [request] is the JSON the native side reads (see jni_bridge.cpp). */
    fun reply(request: JSONObject, listener: ReplyListener) {
        if (loaded == null) {
            main.post { listener.onDone(ChatOutcome.failure("No model is loaded.")) }
            return
        }
        // a read-ahead in progress finishes the step it is on (about a second, and what it read is
        // what this reply needs first), then the reply takes over
        endReadAhead()
        replyStopped.set(false)
        replyWaiting.set(true)
        phase = Phase.BUSY
        announce()
        val bytes = request.toString().toByteArray(Charsets.UTF_8)
        queue.put {
            replyWaiting.set(false)
            val model = loaded
            if (model == null) {
                phase = Phase.IDLE
                announce()
                main.post { listener.onDone(ChatOutcome.failure("No model is loaded.")) }
                return@put
            }
            if (replyStopped.get()) {
                // stopped while it waited: nothing to write
                phase = Phase.READY
                announce()
                main.post { listener.onDone(ChatOutcome.stoppedEarly()) }
                return@put
            }
            phase = Phase.BUSY
            activityLog?.invoke("writing:${model.key}")
            // whatever happens below, the reply ends: a chat left waiting for it could never send again
            var outcome: ChatOutcome? = null
            try {
                val result = NativeEngine.nativeChat(bytes, object : ChatListener {
                    /** A stop pressed in the moment between the check above and the engine starting. */
                    private fun keepStopped() {
                        if (replyStopped.get()) NativeEngine.nativeStop()
                    }

                    override fun onPromptProgress(done: Int, total: Int) {
                        keepStopped()
                        main.post { listener.onPromptProgress(done, total) }
                    }

                    override fun onUpdate(reasoning: ByteArray, content: ByteArray, generated: Int) {
                        keepStopped()
                        val r = reasoning.toString(Charsets.UTF_8)
                        val c = content.toString(Charsets.UTF_8)
                        main.post { listener.onUpdate(r, c, generated) }
                    }

                    override fun onMedia(index: Int, total: Int) {
                        keepStopped()
                        main.post { listener.onMedia(index, total) }
                    }
                })
                outcome = try {
                    ChatOutcome.parse(result.toString(Charsets.UTF_8))
                } catch (e: Exception) {
                    ChatOutcome.failure("The engine returned something unreadable.")
                }
            } finally {
                activityLog?.invoke("ready:${model.key}")
                phase = if (loaded != null) Phase.READY else Phase.IDLE
                announce()
                val done = outcome ?: ChatOutcome.failure("Something went wrong in the app while writing this reply.")
                main.post { listener.onDone(done) }
            }
        }
    }

    /**
     * Stops the reply (or speed test) in progress. A reply still waiting is dropped when its turn
     * comes, and what the engine is doing meanwhile (reading ahead) finishes its step instead of
     * being cut off: a step cut short loses a hybrid model's whole memory of the conversation.
     */
    fun stop() {
        replyStopped.set(true)
        if (!replyWaiting.get()) NativeEngine.nativeStop()
    }
}

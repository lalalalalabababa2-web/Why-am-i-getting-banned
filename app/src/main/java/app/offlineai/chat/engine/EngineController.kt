package app.offlineai.chat.engine

import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import org.json.JSONObject
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.atomic.AtomicBoolean

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
    /** A helper model guesses the next few tokens while the model streams from storage. */
    val helper: Boolean = false,
    /** Low memory with the pager: it decides which layers stay in memory. */
    val pager: Boolean = false,
    /** Part of the model is read from storage on every step (it is bigger than the memory there is). */
    val streaming: Boolean = false,
    /** A mixture of experts bigger than the memory: the experts each token picks are read from storage. */
    val expertsStorage: Boolean = false,
    /** Tokens the MTP head guesses among (the most used ones), 0 for all of them. */
    val draftVocab: Int = 0,
    /** Experts each token uses, for a mixture of experts (0 otherwise). */
    val nExpertUsed: Int = 0,
    val residentBytes: Long = 0,
    val streamedBytes: Long = 0,
    /** How fast this phone's storage read the model while loading, MB/s. */
    val readMbps: Double = 0.0,
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
                helper = j.optBoolean("helper"),
                pager = j.optBoolean("pager"),
                streaming = j.optBoolean("streaming"),
                expertsStorage = j.optBoolean("experts_storage"),
                draftVocab = j.optInt("draft_vocab"),
                nExpertUsed = j.optInt("n_expert_used"),
                residentBytes = j.optLong("resident_bytes"),
                streamedBytes = j.optLong("streamed_bytes"),
                readMbps = j.optDouble("read_mbps", 0.0),
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
    /** Tokens drafted ahead per step (0: off): the most, or exactly that many when [specAuto] is off. */
    val specNMax: Int = 0,
    /** How many to draft each step is tuned as replies go, from what drafting costs on this phone. */
    val specAuto: Boolean = true,
    val specNgram: Boolean = false,
    /** A drafter file next to the model (Gemma 4 "mtp-*.gguf"), or empty. */
    val drafterPath: String = "",
    /** The picture/sound projector, or empty. */
    val mmprojPath: String = "",
    val imageMaxTokens: Int = 0,
    /** Full sliding-window cache (drafting and cheap rollbacks) or a compact one (less memory). */
    val swaFull: Boolean = true,
    /** Low memory: keep the layers that fit and stream the rest (see app/src/main/cpp/pager.h). */
    val pager: Boolean = true,
    /** A small model of the same family that guesses ahead while the model streams, or empty. */
    val helperPath: String = "",
    /** A mixture of experts uses 3/4 of its experts per word: faster, slightly less exact. */
    val fewerExperts: Boolean = false,
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
        .put("spec_auto", specAuto)
        .put("spec_ngram", specNgram)
        .put("drafter", drafterPath)
        .put("mmproj", mmprojPath)
        .put("image_max_tokens", imageMaxTokens)
        .put("swa_full", swaFull)
        .put("pager", pager)
        .put("helper", helperPath)
        .put("fewer_experts", fewerExperts)
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
    /** The pager streamed part of the model from storage on every step. */
    val streaming: Boolean = false,
    val residentGb: Double = 0.0,
    val streamedGb: Double = 0.0,
    val readGb: Double = 0.0,
    val readMbps: Double = 0.0,
    /** One step through all the model's layers, the last one measured. */
    val tPassMs: Double = 0.0,
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
                streaming = s.optBoolean("streaming"),
                residentGb = s.optDouble("resident_gb", 0.0),
                streamedGb = s.optDouble("streamed_gb", 0.0),
                readGb = s.optDouble("read_gb", 0.0),
                readMbps = s.optDouble("read_mbps", 0.0),
                tPassMs = s.optDouble("t_pass_ms", 0.0),
            )
        }

        fun failure(message: String) = ChatOutcome(false, "", "", message, 0, 0, 0, 0, 0.0, 0.0, 0.0, 0, "error")
    }
}

data class BenchRow(val threads: Int, val readTps: Double, val writeTps: Double)

/** The pager right now (see app/src/main/cpp/pager.h). */
data class PagerStats(
    val active: Boolean = false,
    val passBytes: Long = 0,
    val residentBytes: Long = 0,
    val streamedBytes: Long = 0,
    val readMbps: Double = 0.0,
    /** Part of the layers meant to stay in memory that are still there. */
    val residentPresent: Double = 1.0,
    /** One step through all layers, the last one measured; 0 until there is one. */
    val passMs: Double = 0.0,
) {
    companion object {
        fun parse(json: String): PagerStats {
            val j = JSONObject(json)
            return PagerStats(
                active = j.optBoolean("active"),
                passBytes = j.optLong("pass_bytes"),
                residentBytes = j.optLong("resident_bytes"),
                streamedBytes = j.optLong("streamed_bytes"),
                readMbps = j.optDouble("read_mbps", 0.0),
                residentPresent = j.optDouble("resident_present", 1.0),
                passMs = j.optDouble("pass_ms", 0.0),
            )
        }
    }
}

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

    /** Loads a model, replacing the current one. [onDone] gets null on success or the reason it failed. */
    fun load(key: String, displayName: String, path: String, config: LoadConfig, onDone: ((String?) -> Unit)? = null) {
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

    fun unload() {
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
        queue.put { if (loaded != null) NativeEngine.nativeResetCache() }
    }

    /** Frees the picture part of the model (it loads again with the next picture). */
    fun releaseMedia() {
        queue.put { if (loaded != null) NativeEngine.nativeReleaseMedia() }
    }

    /** Threads for the next step; takes effect between tokens, even in the middle of a reply. */
    /** Gentle mode while another app is in front (see [NativeEngine.nativeSetBackground]). */
    fun setBackground(on: Boolean, threads: Int) {
        runCatching { NativeEngine.nativeSetBackground(on, threads) }
    }

    fun setThreads(n: Int) {
        if (n > 0) NativeEngine.nativeSetThreads(n)
    }

    /** Android asked for memory back. Takes effect at once, even in the middle of a reply. */
    fun trimMemory() {
        if (loaded?.info?.pager == true) runCatching { NativeEngine.nativeTrimMemory() }
    }

    /** Other apps may have closed or opened: a paged model looks again at how much it may keep. */
    fun memoryChanged() {
        if (loaded?.info?.pager == true) runCatching { NativeEngine.nativeMemoryChanged() }
    }

    /** The pager's view now, or null without one. Cheap; safe while a reply is written. */
    fun pagerStats(): PagerStats? {
        if (loaded?.info?.pager != true) return null
        return runCatching { PagerStats.parse(NativeEngine.nativePagerStats().toString(Charsets.UTF_8)) }.getOrNull()
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
        phase = Phase.BUSY
        announce()
        val bytes = request.toString().toByteArray(Charsets.UTF_8)
        queue.put {
            val model = loaded
            if (model == null) {
                phase = Phase.IDLE
                announce()
                main.post { listener.onDone(ChatOutcome.failure("No model is loaded.")) }
                return@put
            }
            phase = Phase.BUSY
            activityLog?.invoke("writing:${model.key}")
            val result = NativeEngine.nativeChat(bytes, object : ChatListener {
                override fun onPromptProgress(done: Int, total: Int) {
                    main.post { listener.onPromptProgress(done, total) }
                }

                override fun onUpdate(reasoning: ByteArray, content: ByteArray, generated: Int) {
                    val r = reasoning.toString(Charsets.UTF_8)
                    val c = content.toString(Charsets.UTF_8)
                    main.post { listener.onUpdate(r, c, generated) }
                }

                override fun onMedia(index: Int, total: Int) {
                    main.post { listener.onMedia(index, total) }
                }
            })
            activityLog?.invoke("ready:${model.key}")
            val outcome = try {
                ChatOutcome.parse(result.toString(Charsets.UTF_8))
            } catch (e: Exception) {
                ChatOutcome.failure("The engine returned something unreadable.")
            }
            phase = if (loaded != null) Phase.READY else Phase.IDLE
            announce()
            main.post { listener.onDone(outcome) }
        }
    }

    fun stop() {
        NativeEngine.nativeStop()
    }
}

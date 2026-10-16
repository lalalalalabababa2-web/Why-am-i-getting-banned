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
) {
    fun sameShape(o: LoadConfig) = nCtx == o.nCtx && nUbatch == o.nUbatch && lowMemory == o.lowMemory && kvQ8 == o.kvQ8
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
            )
        }

        fun failure(message: String) = ChatOutcome(false, "", "", message, 0, 0, 0, 0, 0.0, 0.0, 0.0, 0, "error")
    }
}

data class BenchRow(val threads: Int, val readTps: Double, val writeTps: Double)

/** Callbacks for one reply, always delivered on the main thread. */
interface ReplyListener {
    fun onPromptProgress(done: Int, total: Int)
    fun onUpdate(reasoning: String, content: String, generated: Int)
    fun onDone(outcome: ChatOutcome)
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
                path.toByteArray(Charsets.UTF_8), config.nCtx, config.nThreads, 512, config.nUbatch,
                config.lowMemory, config.kvQ8,
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

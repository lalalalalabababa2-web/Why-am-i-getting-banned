package app.offlineai.chat.data

import android.content.Context
import java.io.File

/** Everything the user can change, kept in one SharedPreferences file. */
class Settings(context: Context) {
    private val prefs = context.getSharedPreferences("settings", Context.MODE_PRIVATE)

    var contextSize: Int
        get() = prefs.getInt("context_size", 4096)
        set(v) = prefs.edit().putInt("context_size", v).apply()

    /** 0 means "choose for this phone". */
    var threads: Int
        get() = prefs.getInt("threads", 0)
        set(v) = prefs.edit().putInt("threads", v).apply()

    var thinking: Boolean
        get() = prefs.getBoolean("thinking", true)
        set(v) = prefs.edit().putBoolean("thinking", v).apply()

    var expandThinking: Boolean
        get() = prefs.getBoolean("expand_thinking", false)
        set(v) = prefs.edit().putBoolean("expand_thinking", v).apply()

    var maxTokens: Int
        get() = prefs.getInt("max_tokens", 4096)
        set(v) = prefs.edit().putInt("max_tokens", v).apply()

    var systemPrompt: String
        get() = prefs.getString("system_prompt", "") ?: ""
        set(v) = prefs.edit().putString("system_prompt", v).apply()

    var useRecommendedSampling: Boolean
        get() = prefs.getBoolean("recommended_sampling", true)
        set(v) = prefs.edit().putBoolean("recommended_sampling", v).apply()

    var temperature: Float
        get() = prefs.getFloat("temperature", 0.7f)
        set(v) = prefs.edit().putFloat("temperature", v).apply()

    var topP: Float
        get() = prefs.getFloat("top_p", 0.95f)
        set(v) = prefs.edit().putFloat("top_p", v).apply()

    var topK: Int
        get() = prefs.getInt("top_k", 40)
        set(v) = prefs.edit().putInt("top_k", v).apply()

    var minP: Float
        get() = prefs.getFloat("min_p", 0.05f)
        set(v) = prefs.edit().putFloat("min_p", v).apply()

    var repeatPenalty: Float
        get() = prefs.getFloat("repeat_penalty", 1.0f)
        set(v) = prefs.edit().putFloat("repeat_penalty", v).apply()

    var keepScreenOn: Boolean
        get() = prefs.getBoolean("keep_screen_on", true)
        set(v) = prefs.edit().putBoolean("keep_screen_on", v).apply()

    /** The file of the model to load on start. */
    var lastModelFile: String?
        get() = prefs.getString("last_model_file", null)
        set(v) = prefs.edit().putString("last_model_file", v).apply()

    var lastChatId: String?
        get() = prefs.getString("last_chat_id", null)
        set(v) = prefs.edit().putString("last_chat_id", v).apply()

    fun effectiveThreads(): Int = if (threads > 0) threads else Device.defaultThreads()

    companion object {
        val CONTEXT_SIZES = intArrayOf(2048, 4096, 8192, 16384, 32768)
        val MAX_TOKENS = intArrayOf(512, 1024, 2048, 4096, 8192)
    }
}

/** What this phone's CPU and memory look like. */
object Device {
    /**
     * Threads for inference: the cores whose top clock is close to the fastest one. On a
     * Galaxy S24 FE (one Cortex-X4, five Cortex-A720, four Cortex-A520) that is six. The slow
     * efficiency cores would make every step wait for them.
     */
    fun defaultThreads(): Int {
        val freqs = (0 until 16).mapNotNull { cpu ->
            try {
                File("/sys/devices/system/cpu/cpu$cpu/cpufreq/cpuinfo_max_freq").readText().trim().toLong()
            } catch (e: Exception) {
                null
            }
        }
        if (freqs.isEmpty()) {
            return (Runtime.getRuntime().availableProcessors() / 2).coerceIn(2, 8)
        }
        val top = freqs.max()
        return freqs.count { it >= top * 0.7 }.coerceIn(2, 8)
    }

    fun cores(): Int = Runtime.getRuntime().availableProcessors()
}

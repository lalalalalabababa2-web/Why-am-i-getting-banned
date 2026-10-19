package app.offlineai.chat.data

import android.content.Context
import android.os.Build
import android.os.PowerManager
import java.io.File

enum class PerfMode(val label: String, val help: String) {
    ECO("Eco", "Half the fast cores. Cooler and lighter on the battery, slower."),
    BALANCED("Balanced", "The fastest thread count for this phone, and fewer threads when it gets warm."),
    PERFORMANCE("Performance", "The fastest thread count; only slows down when the phone gets hot."),
    MAXIMUM("Maximum", "The fastest thread count, kept until Android reports critical heat."),
}

enum class BackgroundSpeed(val label: String, val help: String) {
    GENTLE("Gentle", "While another app is in front, the reply carries on with fewer threads at a low priority, so the " +
        "phone stays smooth. Back to full speed when you return."),
    FULL("Full speed", "The same speed as with the app open. The app you are using may stutter while it writes."),
}

enum class MemoryMode(val label: String, val help: String) {
    AUTO("Automatic", "Fast mode, or low-memory mode for models too big to copy into this phone's memory."),
    FAST("Fast", "Copies the weights into memory in a layout the CPU computes with fastest."),
    LOW("Low memory", "Leaves the weights in the file. A model bigger than the free memory keeps what fits and " +
        "streams the rest from storage, so even 9B models run on an 8 GB phone."),
}

enum class ThinkingMode(val label: String, val help: String) {
    AUTO("Automatic", "On, except for a model too big for memory: there every word is a read from storage, and " +
        "thinking first can take minutes before the answer starts."),
    ON("On", "Models that can think work through the problem before answering. Slower, often better."),
    OFF("Off", "Answers straight away."),
}

enum class ThemeMode(val label: String) { DARK("Dark"), LIGHT("Light"), SYSTEM("Same as the phone") }

/** How closely pictures are looked at: pixels kept, and tokens a picture may take for models that scale with size. */
enum class PictureDetail(val label: String, val maxSide: Int, val maxTokens: Int, val help: String) {
    LOW("Quick", 512, 160, "Smaller pictures: read in a few seconds, fewer details."),
    NORMAL("Normal", 768, 400, "A good balance for photos and screenshots."),
    HIGH("Detailed", 1024, 1024, "Small text and fine details; several times slower to read."),
}

enum class Accent(val label: String, val dark: Int, val light: Int) {
    SLATE("Slate", 0xFF8FA9C7.toInt(), 0xFF3C5F86.toInt()),
    TEAL("Teal", 0xFF6CC4B8.toInt(), 0xFF1D766E.toInt()),
    GREEN("Green", 0xFF86C792.toInt(), 0xFF2C7748.toInt()),
    AMBER("Amber", 0xFFE0B25C.toInt(), 0xFF85600D.toInt()),
    ROSE("Rose", 0xFFE59AA2.toInt(), 0xFFA54649.toInt()),
    VIOLET("Violet", 0xFFB3A5EA.toInt(), 0xFF62509F.toInt()),
}

/** Everything the user can change, kept in one SharedPreferences file. */
class Settings(context: Context) {
    private val prefs = context.getSharedPreferences("settings", Context.MODE_PRIVATE)

    private fun int(key: String, def: Int) = prefs.getInt(key, def)
    private fun bool(key: String, def: Boolean) = prefs.getBoolean(key, def)
    private fun float(key: String, def: Float) = prefs.getFloat(key, def)
    private fun str(key: String, def: String) = prefs.getString(key, def) ?: def
    private fun put(key: String, v: Any?) {
        prefs.edit().apply {
            when (v) {
                is Int -> putInt(key, v)
                is Boolean -> putBoolean(key, v)
                is Float -> putFloat(key, v)
                is String -> putString(key, v)
                null -> remove(key)
            }
        }.apply()
    }

    // ---- model and memory
    var contextSize: Int
        get() = int("context_size", 4096)
        set(v) = put("context_size", v)
    var memoryMode: MemoryMode
        get() = runCatching { MemoryMode.valueOf(str("memory_mode", "AUTO")) }.getOrDefault(MemoryMode.AUTO)
        set(v) = put("memory_mode", v.name)
    var kvQ8: Boolean
        get() = bool("kv_q8", false)
        set(v) = put("kv_q8", v)
    var promptBatch: Int
        get() = int("prompt_batch", 256)
        set(v) = put("prompt_batch", v)
    /**
     * Low memory: keep as many layers as fit in memory for good and stream the rest from storage
     * in big reads just ahead of the model (app/src/main/cpp/pager.h). Off leaves it to Android,
     * which rereads nearly the whole model for every token once it does not fit.
     */
    var streaming: Boolean
        get() = bool("streaming", true)
        set(v) = put("streaming", v)
    /** While a Qwen3.5 model streams from storage, Qwen3.5 0.8B (if downloaded) guesses ahead for it. */
    var helperDrafts: Boolean
        get() = bool("helper_drafts", true)
        set(v) = put("helper_drafts", v)

    // ---- performance
    var perfMode: PerfMode
        get() = runCatching { PerfMode.valueOf(str("perf_mode", "BALANCED")) }.getOrDefault(PerfMode.BALANCED)
        set(v) = put("perf_mode", v.name)
    /** 0 means "decided by the performance mode". */
    var threads: Int
        get() = int("threads", 0)
        set(v) = put("threads", v)
    /** The thread count the speed test found fastest for writing; 0 until it has run. */
    var measuredThreads: Int
        get() = int("measured_threads", 0)
        set(v) = put("measured_threads", v)
    var measuredSummary: String
        get() = str("measured_summary", "")
        set(v) = put("measured_summary", v)
    var backgroundWriting: Boolean
        get() = bool("background_writing", true)
        set(v) = put("background_writing", v)
    var backgroundSpeed: BackgroundSpeed
        get() = runCatching { BackgroundSpeed.valueOf(str("background_speed", "GENTLE")) }.getOrDefault(BackgroundSpeed.GENTLE)
        set(v) = put("background_speed", v.name)
    /** Threads for writing while another app is in front (gentle mode). */
    fun backgroundThreads(): Int = (Device.fastCores() / 2).coerceIn(2, 4)
    /** Tell when a reply finished while the app was in the background. */
    var replyNotifications: Boolean
        get() = bool("reply_notifications", true)
        set(v) = put("reply_notifications", v)
    var streamIntervalMs: Int
        get() = int("stream_interval", 50)
        set(v) = put("stream_interval", v)

    /**
     * Draft a few tokens ahead with the model's MTP head or helper file and check them in one step
     * (speculative decoding). Per model, only after the drafting test found it faster on this phone
     * (or with a draft length set by hand): on the ARM and x86 CPUs it was tried on in CI it was
     * slower or no faster, because a CPU pays for nearly every extra token it checks.
     */
    var speculative: Boolean
        get() = bool("speculative", true)
        set(v) = put("speculative", v)
    /** Tokens drafted per step; 0 means the drafting test's pick for the model (off until tested). */
    var draftTokens: Int
        get() = int("draft_tokens", 0)
        set(v) = put("draft_tokens", v)
    /** Draft by copying text already in the chat: free until a reply repeats something, then much faster. */
    var copyDrafts: Boolean
        get() = bool("copy_drafts", true)
        set(v) = put("copy_drafts", v)

    var draftSummary: String
        get() = str("draft_summary", "")
        set(v) = put("draft_summary", v)

    /** The draft length the speed test found fastest for a model file: 0 = drafting off, -1 = not measured. */
    fun measuredDrafts(modelFile: String): Int = int("drafts:$modelFile", -1)
    fun setMeasuredDrafts(modelFile: String, n: Int) = put("drafts:$modelFile", n)

    /**
     * Drafts per step to load [modelFile] with (0: off). [streamsWithMtp]: a model with its own MTP
     * head in low-memory mode, where checking several guesses costs the same read of the model as
     * writing one token, so drafting is on (3 at a time) until the drafting test says otherwise.
     */
    fun draftsFor(modelFile: String, streamsWithMtp: Boolean = false): Int {
        if (!speculative) return 0
        if (draftTokens > 0) return draftTokens
        val m = measuredDrafts(modelFile)
        return if (m >= 0) m else if (streamsWithMtp) 3 else 0
    }

    /** Lengths in tokens of the last finished replies of a model, oldest first (the time-left estimate). */
    fun replyLengths(modelFile: String, thinking: Boolean): List<Int> =
        str("lengths:$modelFile:${if (thinking) 1 else 0}", "").split(',').mapNotNull { it.toIntOrNull() }

    fun addReplyLength(modelFile: String, thinking: Boolean, n: Int) {
        val kept = (replyLengths(modelFile, thinking) + n).takeLast(40)
        put("lengths:$modelFile:${if (thinking) 1 else 0}", kept.joinToString(","))
    }

    // ---- pictures, video and sound
    var pictureDetail: PictureDetail
        get() = runCatching { PictureDetail.valueOf(str("picture_detail", "NORMAL")) }.getOrDefault(PictureDetail.NORMAL)
        set(v) = put("picture_detail", v.name)
    var videoFrames: Int
        get() = int("video_frames", 6)
        set(v) = put("video_frames", v)

    // ---- replies
    /** Whether models that can think do so (see [thinkingFor]). Thinking switched off before is kept off. */
    var thinkingMode: ThinkingMode
        get() = runCatching { ThinkingMode.valueOf(str("thinking_mode", "")) }.getOrNull()
            ?: if (prefs.contains("thinking") && !bool("thinking", true)) ThinkingMode.OFF else ThinkingMode.AUTO
        set(v) = put("thinking_mode", v.name)

    /** Thinking for a reply from a model that does or does not stream part of itself from storage. */
    fun thinkingFor(streaming: Boolean): Boolean = when (thinkingMode) {
        ThinkingMode.ON -> true
        ThinkingMode.OFF -> false
        ThinkingMode.AUTO -> !streaming
    }
    var expandThinking: Boolean
        get() = bool("expand_thinking", false)
        set(v) = put("expand_thinking", v)
    var maxTokens: Int
        get() = int("max_tokens", 4096)
        set(v) = put("max_tokens", v)
    var systemPrompt: String
        get() = str("system_prompt", "")
        set(v) = put("system_prompt", v)

    // ---- sampling
    var useRecommendedSampling: Boolean
        get() = bool("recommended_sampling", true)
        set(v) = put("recommended_sampling", v)
    var temperature: Float
        get() = float("temperature", 0.7f)
        set(v) = put("temperature", v)
    var topP: Float
        get() = float("top_p", 0.95f)
        set(v) = put("top_p", v)
    var topK: Int
        get() = int("top_k", 40)
        set(v) = put("top_k", v)
    var minP: Float
        get() = float("min_p", 0.05f)
        set(v) = put("min_p", v)
    var repeatPenalty: Float
        get() = float("repeat_penalty", 1.0f)
        set(v) = put("repeat_penalty", v)

    // ---- chat display
    var autoFollow: Boolean
        get() = bool("auto_follow", true)
        set(v) = put("auto_follow", v)
    var jumpButton: Boolean
        get() = bool("jump_button", true)
        set(v) = put("jump_button", v)
    var codeWrap: Boolean
        get() = bool("code_wrap", false)
        set(v) = put("code_wrap", v)
    var syntaxHighlight: Boolean
        get() = bool("syntax_highlight", true)
        set(v) = put("syntax_highlight", v)
    var markdown: Boolean
        get() = bool("markdown", true)
        set(v) = put("markdown", v)
    var fontScale: Float
        get() = float("font_scale", 1.0f)
        set(v) = put("font_scale", v)

    // ---- appearance
    var theme: ThemeMode
        get() = runCatching { ThemeMode.valueOf(str("theme", "DARK")) }.getOrDefault(ThemeMode.DARK)
        set(v) = put("theme", v.name)
    var accent: Accent
        get() = runCatching { Accent.valueOf(str("accent", "SLATE")) }.getOrDefault(Accent.SLATE)
        set(v) = put("accent", v.name)

    // ---- privacy
    var offlineOnly: Boolean
        get() = bool("offline_only", false)
        set(v) = put("offline_only", v)

    // ---- other
    var keepScreenOn: Boolean
        get() = bool("keep_screen_on", true)
        set(v) = put("keep_screen_on", v)
    var askedNotifications: Boolean
        get() = bool("asked_notifications", false)
        set(v) = put("asked_notifications", v)

    /** The file of the model to load on start. */
    var lastModelFile: String?
        get() = prefs.getString("last_model_file", null)
        set(v) = put("last_model_file", v)

    var lastChatId: String?
        get() = prefs.getString("last_chat_id", null)
        set(v) = put("last_chat_id", v)

    /** Threads for the next reply: an explicit choice, or the performance mode's, adjusted for heat. */
    fun threadsNow(thermalStatus: Int): Int {
        if (threads > 0) return threads
        val best = if (measuredThreads > 0) measuredThreads else Device.fastCores()
        val base = if (perfMode == PerfMode.ECO) (best / 2).coerceAtLeast(2) else best
        return Device.adjustForHeat(base, perfMode, thermalStatus)
    }

    /** Threads to load with (heat is applied per reply). */
    fun baseThreads(): Int = threadsNow(PowerManager.THERMAL_STATUS_NONE)

    companion object {
        val CONTEXT_SIZES = intArrayOf(2048, 4096, 8192, 16384, 32768)
        val MAX_TOKENS = intArrayOf(512, 1024, 2048, 4096, 8192, 16384)
        val PROMPT_BATCHES = intArrayOf(64, 128, 256, 512)
        val STREAM_INTERVALS = intArrayOf(16, 33, 50, 100, 250)
        val FONT_SCALES = floatArrayOf(0.85f, 1.0f, 1.15f, 1.3f, 1.5f)
        val DRAFT_TOKENS = intArrayOf(0, 1, 2, 3)
        val VIDEO_FRAMES = intArrayOf(4, 6, 8, 12)

        /** How long one recorded or picked sound may be (Gemma 4 hears up to 30 seconds). */
        const val MAX_SOUND_SECONDS = 30
    }
}

/** What this phone's CPU, memory and temperature look like. */
object Device {
    /**
     * Pages this app has had to read back from storage so far (/proc/self/stat, majflt). A model
     * that fits in memory is read once while loading; one that does not is read again on every
     * step, and that is what makes it crawl.
     */
    fun majorFaults(): Long = try {
        val stat = File("/proc/self/stat").readText()
        val fields = stat.substring(stat.lastIndexOf(')') + 2).split(' ')
        fields[9].toLong()  // after ")": state ppid pgrp session tty tpgid flags minflt cminflt majflt
    } catch (e: Exception) {
        0L
    }

    private fun maxFreqs(): List<Long> = (0 until 16).mapNotNull { cpu ->
        try {
            File("/sys/devices/system/cpu/cpu$cpu/cpufreq/cpuinfo_max_freq").readText().trim().toLong()
        } catch (e: Exception) {
            null
        }
    }

    /**
     * The cores whose top clock is close to the fastest one. On a Galaxy S24 FE (one Cortex-X4,
     * five Cortex-A720, four Cortex-A520) that is six. The slow efficiency cores would make
     * every step wait for them. The speed test checks this on the phone itself.
     */
    fun fastCores(): Int {
        val freqs = maxFreqs()
        if (freqs.isEmpty()) return (Runtime.getRuntime().availableProcessors() / 2).coerceIn(2, 8)
        val top = freqs.max()
        return freqs.count { it >= top * 0.7 }.coerceIn(2, 8)
    }

    fun cores(): Int = Runtime.getRuntime().availableProcessors()

    /** Thread counts worth measuring on this phone. */
    fun benchCandidates(): IntArray {
        val fast = fastCores()
        val all = cores()
        return sortedSetOf(2, (fast / 2).coerceAtLeast(2), fast - 1, fast, fast + 1, (fast + all) / 2)
            .filter { it in 1..all }.toIntArray()
    }

    fun adjustForHeat(base: Int, mode: PerfMode, status: Int): Int = when {
        status >= PowerManager.THERMAL_STATUS_CRITICAL -> (base / 3).coerceAtLeast(1)
        mode == PerfMode.MAXIMUM -> base
        status >= PowerManager.THERMAL_STATUS_SEVERE -> (base / 2).coerceAtLeast(2)
        mode == PerfMode.PERFORMANCE -> base
        status >= PowerManager.THERMAL_STATUS_MODERATE -> (base - 2).coerceAtLeast(2)
        mode == PerfMode.ECO && status >= PowerManager.THERMAL_STATUS_LIGHT -> (base - 1).coerceAtLeast(1)
        else -> base
    }

    fun thermalStatus(context: Context): Int {
        val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        return pm.currentThermalStatus
    }

    fun thermalLabel(status: Int): String = when (status) {
        PowerManager.THERMAL_STATUS_NONE -> "normal"
        PowerManager.THERMAL_STATUS_LIGHT -> "warm"
        PowerManager.THERMAL_STATUS_MODERATE -> "hot"
        PowerManager.THERMAL_STATUS_SEVERE -> "very hot"
        PowerManager.THERMAL_STATUS_CRITICAL, PowerManager.THERMAL_STATUS_EMERGENCY,
        PowerManager.THERMAL_STATUS_SHUTDOWN -> "critical"
        else -> "unknown"
    }

    @Suppress("unused")
    val sdk: Int get() = Build.VERSION.SDK_INT
}

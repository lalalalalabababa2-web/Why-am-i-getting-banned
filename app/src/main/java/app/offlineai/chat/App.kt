package app.offlineai.chat

import android.app.ActivityManager
import android.app.Application
import android.app.ApplicationExitInfo
import android.content.Context
import android.os.PowerManager
import app.offlineai.chat.data.ChatStore
import app.offlineai.chat.data.LocalModel
import app.offlineai.chat.data.BackgroundSpeed
import app.offlineai.chat.data.MemoryMode
import app.offlineai.chat.data.ModelStore
import app.offlineai.chat.data.Settings
import app.offlineai.chat.engine.EngineController
import app.offlineai.chat.engine.LoadConfig
import app.offlineai.chat.engine.NativeEngine
import java.io.File
import java.io.PrintWriter
import java.io.StringWriter
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** Why the app closed last time, when it was not the user's doing. */
data class LastExit(val title: String, val message: String, val details: String)

class App : Application() {
    lateinit var settings: Settings
        private set
    lateinit var models: ModelStore
        private set
    lateinit var chats: ChatStore
        private set
    lateinit var engine: EngineController
        private set
    lateinit var chat: ChatController
        private set

    /** Set when the native engine could not start; the app then explains instead of crashing. */
    var nativeError: String? = null
        private set

    /** Shown once on the next screen, then cleared. */
    var lastExit: LastExit? = null

    private val activityFile by lazy { File(filesDir, "engine_activity") }
    private val crashFile by lazy { File(filesDir, "crash.txt") }

    override fun onCreate() {
        super.onCreate()
        settings = Settings(this)
        installCrashHandler()
        // the theme before any screen exists, so none has to be rebuilt for it
        app.offlineai.chat.ui.Palette.apply(this, settings)
        models = ModelStore(this)
        chats = ChatStore(this)
        engine = EngineController()
        chat = ChatController(this)
        lastExit = readLastExit()
        engine.activityLog = { what -> writeActivity(what) }
        try {
            NativeEngine.init(applicationInfo.nativeLibraryDir)
        } catch (t: Throwable) {
            nativeError = "The AI engine could not start on this phone: ${t.message ?: t}"
        }
        chat.restore()
        watchHeat()
        watchFront()
    }

    // ---------------------------------------------------------------- in front or not

    /** One of the app's screens is visible. */
    var inFront = false
        private set
    private var started = 0

    private fun watchFront() {
        registerActivityLifecycleCallbacks(object : Application.ActivityLifecycleCallbacks {
            override fun onActivityStarted(activity: android.app.Activity) {
                started++
                if (started == 1) frontChanged(true)
            }

            override fun onActivityStopped(activity: android.app.Activity) {
                started = (started - 1).coerceAtLeast(0)
                if (started == 0) frontChanged(false)
            }

            override fun onActivityCreated(activity: android.app.Activity, state: android.os.Bundle?) {}
            override fun onActivityResumed(activity: android.app.Activity) {}
            override fun onActivityPaused(activity: android.app.Activity) {}
            override fun onActivitySaveInstanceState(activity: android.app.Activity, state: android.os.Bundle) {}
            override fun onActivityDestroyed(activity: android.app.Activity) {}
        })
    }

    private fun frontChanged(front: Boolean) {
        inFront = front
        applyBackground()
        if (front) {
            GenerationService.clearReplyReady(this)
            // apps may have closed (or opened) meanwhile: a model too big for memory looks again
            engine.memoryChanged()
        }
    }

    /** Gentle writing while another app is in front, if the setting says so. */
    fun applyBackground() {
        engine.setBackground(!inFront && settings.backgroundSpeed == BackgroundSpeed.GENTLE, settings.backgroundThreads())
    }

    // ---------------------------------------------------------------- models

    val totalRam: Long by lazy {
        val am = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        ActivityManager.MemoryInfo().also { am.getMemoryInfo(it) }.totalMem
    }

    fun availableRam(): Long {
        val am = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        return ActivityManager.MemoryInfo().also { am.getMemoryInfo(it) }.availMem
    }

    /**
     * Roughly what a model needs in memory: its weights (less for Gemma's "E" models), its
     * drafter, the conversation memory and working space. The picture part is not counted: it
     * loads only when a picture is sent (see [picturesRam]).
     */
    fun estimatedRam(model: LocalModel): Long {
        val weights = if (model.ple) (model.sizeBytes * 0.5).toLong() else model.sizeBytes
        val config = configFor(model)
        val ctxBytes = settings.contextSize.toLong() * (if (config.kvQ8) 20_000L else 40_000L)
        val drafter = if (config.drafterPath.isNotEmpty()) model.drafterFile.length() else 0L
        return weights + ctxBytes + drafter + 300_000_000L
    }

    /** Extra memory while pictures or sound are being read. */
    fun picturesRam(model: LocalModel): Long = if (model.hasPictures) model.picturesFile.length() + 150_000_000L else 0L

    fun lowMemoryFor(model: LocalModel): Boolean = when (settings.memoryMode) {
        MemoryMode.FAST -> false
        MemoryMode.LOW -> true
        // Fast mode copies the weights into ggml's faster layout in the app's own memory, which
        // Android can only make room for by swapping it out or closing the app; low memory leaves
        // them in the file, where Android can drop pages and read them again. A model of more
        // than 45% of the phone's memory (3.8 GB Bonsai 27B on an 8 GB phone) goes low.
        MemoryMode.AUTO -> !model.ple && model.sizeBytes > totalRam * 0.45
    }

    fun configFor(model: LocalModel): LoadConfig {
        val low = lowMemoryFor(model)
        val drafts = settings.draftsFor(model.file.name, low && settings.streaming && model.catalog?.mtp == true)
        return LoadConfig(
            nCtx = settings.contextSize,
            nThreads = settings.baseThreads(),
            nUbatch = settings.promptBatch,
            lowMemory = low,
            // a model too big for fast mode also gets the half-size conversation memory, unless set by hand
            kvQ8 = settings.kvQ8 || (low && settings.memoryMode == MemoryMode.AUTO),
            specNMax = drafts,
            specNgram = settings.copyDrafts,
            drafterPath = if (drafts > 0 && model.hasDrafter) model.drafterFile.absolutePath else "",
            mmprojPath = if (model.hasPictures) model.picturesFile.absolutePath else "",
            imageMaxTokens = settings.pictureDetail.maxTokens,
            // big Gemma models: a compact sliding-window cache (much less memory, no drafting)
            swaFull = !low,
            pager = settings.streaming,
        )
    }

    /**
     * The app went to the background (or, on older Android, memory runs low): give back the
     * picture part if nothing is using it. A smaller app in the background is the last one
     * Android closes; the picture part loads again with the next picture.
     */
    @Suppress("DEPRECATION")
    override fun onTrimMemory(level: Int) {
        super.onTrimMemory(level)
        val low = level == android.content.ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW ||
            level == android.content.ComponentCallbacks2.TRIM_MEMORY_RUNNING_CRITICAL ||
            level >= android.content.ComponentCallbacks2.TRIM_MEMORY_BACKGROUND
        if (low && !engine.isBusy) engine.releaseMedia()
        // memory is running short with the app in front: a model streamed from storage keeps fewer
        // layers now, before Android has to take them (or close an app for them)
        if (level == android.content.ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW ||
            level == android.content.ComponentCallbacks2.TRIM_MEMORY_RUNNING_CRITICAL ||
            level >= android.content.ComponentCallbacks2.TRIM_MEMORY_COMPLETE
        ) {
            engine.trimMemory()
        }
    }

    /** Loads the model used last time, if it is still here and nothing is loaded. */
    fun loadLastModel() {
        if (nativeError != null || engine.loaded != null || engine.phase != EngineController.Phase.IDLE) return
        val name = settings.lastModelFile ?: return
        val model = models.find(name) ?: return
        loadModel(model)
    }

    fun loadModel(model: LocalModel, onDone: ((String?) -> Unit)? = null) {
        settings.lastModelFile = model.file.name
        engine.load(model.file.name, model.displayName, model.file.absolutePath, configFor(model), onDone)
    }

    /** The loaded model no longer matches the settings (context, memory mode, batch, cache precision). */
    fun needsReload(): Boolean {
        val m = engine.loaded ?: return false
        val local = models.find(m.key) ?: return false
        return !m.config.sameShape(configFor(local))
    }

    fun reloadIfNeeded() {
        if (!needsReload() || engine.isBusy) return
        val local = models.find(engine.loaded?.key ?: return) ?: return
        loadModel(local)
    }

    // ---------------------------------------------------------------- heat

    private var thermalStatus = PowerManager.THERMAL_STATUS_NONE

    fun currentThermal(): Int = thermalStatus

    /** Threads for the reply about to start, given how warm the phone is now. */
    fun threadsNow(): Int = settings.threadsNow(thermalStatus)

    private fun watchHeat() {
        try {
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            thermalStatus = pm.currentThermalStatus
            pm.addThermalStatusListener(mainExecutor) { status ->
                thermalStatus = status
                // takes effect at the next token, in the middle of a reply too
                if (engine.loaded != null) engine.setThreads(threadsNow())
            }
        } catch (e: Exception) {
            // no thermal service on this device: run at the chosen thread count
        }
    }

    // ---------------------------------------------------------------- crashes

    private fun writeActivity(what: String?) {
        try {
            if (what == null) activityFile.delete() else activityFile.writeText(what)
        } catch (e: Exception) {
        }
    }

    private fun installCrashHandler() {
        val previous = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, error ->
            try {
                val sw = StringWriter()
                error.printStackTrace(PrintWriter(sw))
                val stamp = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(Date())
                crashFile.writeText("Offline AI ${BuildConfig.VERSION_NAME}, $stamp, thread ${thread.name}\n\n$sw")
            } catch (e: Exception) {
            }
            previous?.uncaughtException(thread, error)
        }
    }

    /**
     * Works out why the app last closed, from Android's own record (API 30+) and from what the
     * engine said it was doing at the time. A model whose loading took the app down is not
     * loaded again automatically, so it cannot close the app in a loop.
     */
    private fun readLastExit(): LastExit? {
        val activity = try {
            activityFile.takeIf { it.exists() }?.readText()
        } catch (e: Exception) {
            null
        }
        val javaCrash = try {
            crashFile.takeIf { it.exists() }?.readText()
        } catch (e: Exception) {
            null
        }
        crashFile.delete()
        activityFile.delete()

        var info: ApplicationExitInfo? = null
        try {
            val am = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            val prefs = getSharedPreferences("exits", Context.MODE_PRIVATE)
            val seen = prefs.getLong("seen", 0)
            info = am.getHistoricalProcessExitReasons(packageName, 0, 1).firstOrNull()?.takeIf { it.timestamp > seen }
            info?.let { prefs.edit().putLong("seen", it.timestamp).apply() }
        } catch (e: Exception) {
        }

        val reason = info?.reason
        val abnormal = javaCrash != null || reason in setOf(
            ApplicationExitInfo.REASON_CRASH, ApplicationExitInfo.REASON_CRASH_NATIVE,
            ApplicationExitInfo.REASON_LOW_MEMORY, ApplicationExitInfo.REASON_ANR,
        ) || (reason == ApplicationExitInfo.REASON_SIGNALED && activity != null && !activity.startsWith("ready:"))
        if (!abnormal) return null

        val model = activity?.substringAfter(':')
        val doing = when {
            activity == null -> null
            activity.startsWith("loading:") -> "loading $model"
            activity.startsWith("writing:") -> "writing a reply with $model"
            else -> null
        }
        if (activity?.startsWith("loading:") == true && settings.lastModelFile == model) {
            settings.lastModelFile = null
        }
        val (title, message) = when {
            javaCrash != null -> "Offline AI crashed" to
                "Something in the app went wrong${doing?.let { " while $it" } ?: ""}. The details below say where; send them to whoever builds the app."
            reason == ApplicationExitInfo.REASON_LOW_MEMORY || reason == ApplicationExitInfo.REASON_SIGNALED ->
                "Android closed Offline AI to free memory" to
                    "It happened while ${doing ?: "the app was open"}. Close other apps, use a smaller context size or low-memory mode " +
                    "(Settings), or a smaller model." + (if (activity?.startsWith("loading:") == true) " That model won't load by itself next time." else "")
            reason == ApplicationExitInfo.REASON_CRASH_NATIVE -> "The AI engine crashed" to
                "It happened while ${doing ?: "the app was open"}." + (if (activity?.startsWith("loading:") == true) " That model won't load by itself next time." else "")
            reason == ApplicationExitInfo.REASON_ANR -> "Offline AI stopped responding" to
                "It happened while ${doing ?: "the app was open"}."
            else -> "Offline AI closed unexpectedly" to "It happened while ${doing ?: "the app was open"}."
        }
        val details = buildString {
            append("Offline AI ${BuildConfig.VERSION_NAME}\n")
            info?.let {
                append("Android's record: reason ${it.reason}, status ${it.status}, ${it.description ?: ""}\n")
                append("memory at exit: ${it.pss / 1024} MB PSS, ${it.rss / 1024} MB RSS\n")
            }
            activity?.let { append("engine was: $it\n") }
            javaCrash?.let { append("\n$it") }
        }
        try {
            getSharedPreferences("exits", Context.MODE_PRIVATE).edit()
                .putString("last_report", "$title\n$message\n\n$details").apply()
        } catch (e: Exception) {
        }
        return LastExit(title, message, details)
    }

    companion object {
        fun of(context: Context): App = context.applicationContext as App
    }
}

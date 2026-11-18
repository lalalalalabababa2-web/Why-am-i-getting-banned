package app.offlineai.chat

import android.app.ActivityManager
import android.app.Application
import android.app.ApplicationExitInfo
import android.content.Context
import android.content.Intent
import android.os.PowerManager
import app.offlineai.chat.data.PictureStore
import app.offlineai.chat.data.Disguise
import app.offlineai.chat.ui.PongActivity
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
    /** People to chat with, each with their own personality. */
    val characters by lazy { app.offlineai.chat.data.CharacterStore(this) }
    /** What Nyx remembers about you across chats. */
    val memory by lazy { app.offlineai.chat.data.MemoryStore(this) }

    /** The pictures made on this phone. */
    val pictures by lazy { PictureStore(this) }
    /** The pictures being made, carrying on in the background. */
    val pictureJobs by lazy { app.offlineai.chat.engine.PictureJobs(this) }

    /** Set when the native engine could not start; the app then explains instead of crashing. */
    var nativeError: String? = null
        private set

    /** Shown once on the next screen, then cleared. */
    var lastExit: LastExit? = null

    private val activityFile by lazy { File(filesDir, "engine_activity") }
    private val crashFile by lazy { File(filesDir, "crash.txt") }

    /** Lends this phone's memory to the others, or borrows theirs (Phones working together). */
    lateinit var phones: app.offlineai.chat.pool.Phones
        private set

    override fun onCreate() {
        super.onCreate()
        settings = Settings(this)
        // The lending process (LendService) needs only the settings and the engine's library: none
        // of the chat's state, which belongs to the app's main process alone (two processes saving
        // the same chats would undo each other).
        if (android.os.Build.VERSION.SDK_INT >= 28 && Application.getProcessName().endsWith(":lend")) return
        installCrashHandler()
        // the theme before any screen exists, so none has to be rebuilt for it
        app.offlineai.chat.ui.Palette.apply(this, settings)
        models = ModelStore(this)
        chats = ChatStore(this)
        engine = EngineController()
        chat = ChatController(this)
        lastExit = readLastExit()
        engine.activityLog = { what -> writeActivity(what) }
        // the launcher entry always matches the setting (after an update, a restore or cleared
        // data, a game entry left on with no code set would lock Nyx out for good)
        runCatching { Disguise.apply(this, settings.disguised && settings.disguiseCode.isNotEmpty()) }
        try {
            NativeEngine.init(applicationInfo.nativeLibraryDir)
        } catch (t: Throwable) {
            nativeError = "The AI engine could not start on this phone: ${t.message ?: t}"
        }
        chat.restore()
        watchHeat()
        watchFront()
        phones = app.offlineai.chat.pool.Phones(this)
        phones.partsInUse = { engine.loaded?.config?.rpc ?: emptyList() }
        phones.onLost = { name -> phoneLost(name) }
        phones.startPolling()
    }

    /**
     * A phone holding part of the loaded model went away. A reply being written fails at its next
     * step and reloads from there (ChatController); with nothing being written, the model loads
     * again now, with the phones that are still there.
     */
    private fun phoneLost(name: String) {
        lostPhoneName = name
        if (!chat.generating && !engine.isBusy) reloadFresh()
    }

    /** The phone lost last, to say which one went away. */
    var lostPhoneName: String? = null

    /** Loads the model again, deciding anew which phones share it. */
    fun reloadFresh() {
        val m = engine.loaded ?: return
        if (engine.isBusy) return
        models.find(m.key)?.let { loadModel(it) }
    }

    // ---------------------------------------------------------------- in front or not

    /** One of the app's screens is visible. */
    var inFront = false
        private set
    private var started = 0

    private fun watchFront() {
        watchScreen()
        registerActivityLifecycleCallbacks(object : Application.ActivityLifecycleCallbacks {
            override fun onActivityStarted(activity: android.app.Activity) {
                started++
                if (started == 1) frontChanged(true)
            }

            override fun onActivityStopped(activity: android.app.Activity) {
                started = (started - 1).coerceAtLeast(0)
                if (started == 0) frontChanged(false)
            }

            override fun onActivityCreated(activity: android.app.Activity, state: android.os.Bundle?) {
                open.add(activity)
            }

            override fun onActivityDestroyed(activity: android.app.Activity) {
                open.remove(activity)
            }

            override fun onActivityResumed(activity: android.app.Activity) {
                if (activity is PongActivity) return
                // hidden: the recent apps show the game's name and no picture of what is on screen
                val hidden = settings.disguised
                @Suppress("DEPRECATION")
                activity.setTaskDescription(
                    if (hidden) android.app.ActivityManager.TaskDescription(Disguise.GAME_NAME) else android.app.ActivityManager.TaskDescription(),
                )
                if (android.os.Build.VERSION.SDK_INT >= 33) activity.setRecentsScreenshotEnabled(!hidden)
            }
            override fun onActivityPaused(activity: android.app.Activity) {}
            override fun onActivitySaveInstanceState(activity: android.app.Activity, state: android.os.Bundle) {}
        })
    }

    /** Every screen of the app that is open, to close them when it is hidden as a game. */
    private val open = mutableSetOf<android.app.Activity>()
    private val lockTimer = android.os.Handler(android.os.Looper.getMainLooper())
    private val lock = Runnable { if (!inFront && settings.disguised) lockNow() }

    /** Hidden as a game: closes every screen of the app but the game. */
    fun lockNow() {
        open.filter { it !is PongActivity }.forEach { it.finish() }
    }

    private fun watchScreen() {
        androidx.core.content.ContextCompat.registerReceiver(this, object : android.content.BroadcastReceiver() {
            override fun onReceive(c: Context, i: Intent) {
                if (settings.disguised) {
                    lockTimer.removeCallbacks(lock)
                    lockTimer.post { if (!inFront) lock.run() }
                }
            }
        }, android.content.IntentFilter(Intent.ACTION_SCREEN_OFF), androidx.core.content.ContextCompat.RECEIVER_NOT_EXPORTED)
    }

    private fun frontChanged(front: Boolean) {
        inFront = front
        // hidden as a game: a minute away (time to pick a photo or share something), or the
        // screen going off, locks the app again, so the launcher opens the game next time (a
        // reply being written carries on)
        lockTimer.removeCallbacks(lock)
        if (!front && settings.disguised) lockTimer.postDelayed(lock, 60_000)
        applyBackground()
        if (front) GenerationService.clearReplyReady(this)
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

    /** The same estimate for a catalog model before it is downloaded (its drafter not counted). */
    fun estimatedRam(c: app.offlineai.chat.data.CatalogModel): Long {
        val weights = if (c.ple) (c.sizeBytes * 0.5).toLong() else c.sizeBytes
        val low = when (settings.memoryMode) {
            MemoryMode.FAST -> false
            MemoryMode.LOW -> true
            MemoryMode.AUTO -> !c.ple && c.sizeBytes > totalRam * 0.45
        }
        val kvQ8 = settings.kvQ8 || (low && settings.memoryMode == MemoryMode.AUTO)
        return weights + settings.contextSize.toLong() * (if (kvQ8) 20_000L else 40_000L) + 300_000_000L
    }

    /** What the paired phones that answer now could take of a model (Phones together); 0 without any. */
    fun phonesFreeRam(): Long = if (!::phones.isInitialized) 0L else phones.lendable()

    /** Extra memory while pictures or sound are being read. */
    fun picturesRam(model: LocalModel): Long = if (model.hasPictures) model.picturesFile.length() + 150_000_000L else 0L

    /** [localShare]: the part of the model on this phone (less when other phones hold the rest). */
    fun lowMemoryFor(model: LocalModel, localShare: Float = 1f): Boolean = when (settings.memoryMode) {
        MemoryMode.FAST -> false
        MemoryMode.LOW -> true
        // Fast mode copies the weights into ggml's faster layout in the app's own memory, which
        // Android can only make room for by swapping it out or closing the app; low memory leaves
        // them in the file, where Android can drop pages and read them again. A model of more
        // than 45% of the phone's memory (3.8 GB Bonsai 27B on an 8 GB phone) goes low.
        MemoryMode.AUTO -> !model.ple && model.sizeBytes * localShare > totalRam * 0.45
    }

    /** What the whole model needs in memory, wherever it runs (16-bit conversation memory). */
    private fun needFor(model: LocalModel): Long {
        val weights = if (model.ple) (model.sizeBytes * 0.5).toLong() else model.sizeBytes
        return weights + settings.contextSize.toLong() * 40_000L + 300_000_000L
    }

    /** The phones the model is split with when it loads: decided at load, kept while it stays loaded (like [tightFor]). */
    private var poolKept: Pair<String, List<app.offlineai.chat.pool.RpcPart>>? = null

    private fun poolFor(model: LocalModel, fresh: Boolean): List<app.offlineai.chat.pool.RpcPart> {
        if (!::phones.isInitialized) return emptyList()
        val name = model.file.name
        if (!fresh) {
            val kept = poolKept
            if (kept != null && kept.first == name && (engine.loaded?.key == name || engine.loadingKey == name)) return kept.second
        }
        val localFree = availableRam() + (engine.loaded?.let { l -> models.find(l.key)?.sizeBytes } ?: 0L)
        val plan = phones.plan(needFor(model), localFree)
        if (fresh) poolKept = name to plan
        return plan
    }

    /**
     * Automatic memory: the conversation memory at full size would not fit comfortably in what
     * is free now (a long context on a phone with other apps open), so it is kept at 8 bits, half
     * the size. Otherwise Android pushes the model's pages out and reads them back from storage on
     * every word, which is what makes a reply crawl.
     */
    private fun tightFor(model: LocalModel, fresh: Boolean): Boolean {
        if (settings.memoryMode != MemoryMode.AUTO) return false
        // Decided when the model is loaded and kept while it stays loaded: free memory moves all
        // the time, and a changed answer would look like a changed setting and reload the model.
        // The decision itself is kept, not the loaded model's 8-bit flag: that one also holds the
        // 8-bit setting, so turning the setting off again never took effect.
        val name = model.file.name
        if (!fresh) {
            val kept = tightKept
            if (kept != null && kept.first == name && (engine.loaded?.key == name || engine.loadingKey == name)) return kept.second
        }
        val weights = if (model.ple) (model.sizeBytes * 0.5).toLong() else model.sizeBytes
        val full = weights + settings.contextSize.toLong() * 40_000L + 300_000_000L
        val free = availableRam() + (engine.loaded?.let { l -> models.find(l.key)?.sizeBytes } ?: 0L)
        val tight = full > free * 0.6
        if (fresh) tightKept = name to tight
        return tight
    }

    /** The automatic memory decision for the model last loaded: its file name, and whether memory was tight. */
    private var tightKept: Pair<String, Boolean>? = null

    /** How [model] loads with the settings as they are. [fresh]: for loading it now, deciding automatic memory anew. */
    fun configFor(model: LocalModel, fresh: Boolean = false): LoadConfig {
        val parts = poolFor(model, fresh)
        val low = lowMemoryFor(model, 1f - parts.sumOf { it.share.toDouble() }.toFloat())
        val drafts = settings.draftsFor(model.file.name)
        return LoadConfig(
            nCtx = settings.contextSize,
            nThreads = settings.baseThreads(),
            nUbatch = settings.promptBatch,
            lowMemory = low,
            // a model too big for fast mode also gets the half-size conversation memory, unless set by hand
            kvQ8 = settings.kvQ8 || (low && settings.memoryMode == MemoryMode.AUTO) || tightFor(model, fresh),
            specNMax = drafts,
            specNgram = settings.copyDrafts,
            drafterPath = if (drafts > 0 && model.hasDrafter) model.drafterFile.absolutePath else "",
            mmprojPath = if (model.hasPictures) model.picturesFile.absolutePath else "",
            imageMaxTokens = settings.pictureDetail.maxTokens,
            // big Gemma models: a compact sliding-window cache (much less memory, no drafting)
            swaFull = !low,
            rpc = parts,
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
        if (!::engine.isInitialized) return  // the lending process has no engine of its own
        val low = level == android.content.ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW ||
            level == android.content.ComponentCallbacks2.TRIM_MEMORY_RUNNING_CRITICAL ||
            level >= android.content.ComponentCallbacks2.TRIM_MEMORY_BACKGROUND
        if (low && !engine.isBusy) engine.releaseMedia()
    }

    /**
     * The model to suggest first on this phone: the best all-rounder that fits its memory easily
     * (Gemma 4's "E" models need about half their file size in memory).
     */
    fun firstModel(): app.offlineai.chat.data.CatalogModel? {
        val id = when {
            totalRam >= 7_000_000_000L -> "gemma4-e4b"
            totalRam >= 5_000_000_000L -> "gemma4-e2b"
            totalRam >= 3_500_000_000L -> "qwen35-2b"
            else -> "qwen35-0.8b"
        }
        return app.offlineai.chat.data.Catalog.models.firstOrNull { it.id == id }
    }

    /** Loads the model used last time, if it is still here and nothing is loaded. */
    fun loadLastModel() {
        if (nativeError != null || engine.loaded != null || engine.phase != EngineController.Phase.IDLE) return
        val name = settings.lastModelFile ?: return
        val model = models.find(name) ?: return
        loadModel(model)
    }

    /**
     * Loads the team partner the settings name next to the model, or lets one go that is no longer
     * wanted (the team is off, or the model answers alone). [onDone] gets null or why it failed.
     */
    fun applyTeamPartner(onDone: ((String?) -> Unit)? = null) {
        val want = settings.teamPartner?.takeIf { settings.teamSize >= 2 && it != settings.lastModelFile }?.let { models.find(it) }
        val have = engine.partner
        when {
            want == null -> {
                if (have != null) engine.unloadPartner()
                onDone?.invoke(null)
            }
            have?.key == want.file.name -> onDone?.invoke(null)
            else -> engine.loadPartner(want.file.name, want.displayName, want.file.absolutePath, configFor(want), onDone)
        }
    }

    fun loadModel(model: LocalModel, onDone: ((String?) -> Unit)? = null) {
        settings.lastModelFile = model.file.name
        if (::phones.isInitialized) {
            phones.changed = false
            // the other phones were not asked lately: ask first (a few seconds), so the model is
            // split with the ones that are there
            if (phones.needsFreshLook()) {
                engine.preparing(model.file.name, model.displayName)
                phones.lookThen { loadModelNow(model, onDone) }
                return
            }
        }
        loadModelNow(model, onDone)
    }

    private fun loadModelNow(model: LocalModel, onDone: ((String?) -> Unit)?) {
        engine.load(model.file.name, model.displayName, model.file.absolutePath, configFor(model, fresh = true), onDone)
        // the team partner, unless it is now the model itself
        applyTeamPartner()
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
                crashFile.writeText("Nyx ${BuildConfig.VERSION_NAME}, $stamp, thread ${thread.name}\n\n$sw")
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
            javaCrash != null -> "Nyx crashed" to
                "Something in the app went wrong${doing?.let { " while $it" } ?: ""}. The details below say where; send them to whoever builds the app."
            reason == ApplicationExitInfo.REASON_LOW_MEMORY || reason == ApplicationExitInfo.REASON_SIGNALED ->
                "Android closed Nyx to free memory" to
                    "It happened while ${doing ?: "the app was open"}. Close other apps, use a smaller context size or low-memory mode " +
                    "(Settings), or a smaller model." + (if (activity?.startsWith("loading:") == true) " That model won't load by itself next time." else "")
            reason == ApplicationExitInfo.REASON_CRASH_NATIVE -> "The AI engine crashed" to
                "It happened while ${doing ?: "the app was open"}." + (if (activity?.startsWith("loading:") == true) " That model won't load by itself next time." else "")
            reason == ApplicationExitInfo.REASON_ANR -> "Nyx stopped responding" to
                "It happened while ${doing ?: "the app was open"}."
            else -> "Nyx closed unexpectedly" to "It happened while ${doing ?: "the app was open"}."
        }
        val details = buildString {
            append("Nyx ${BuildConfig.VERSION_NAME}\n")
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

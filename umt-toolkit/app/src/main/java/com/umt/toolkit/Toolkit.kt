package com.umt.toolkit

import android.Manifest
import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.hardware.input.InputManager
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.umt.toolkit.apps.AppScanner
import com.umt.toolkit.compat.DeviceCaps
import com.umt.toolkit.core.CrashHandler
import com.umt.toolkit.core.LogLevel
import com.umt.toolkit.core.UmtLog
import com.umt.toolkit.data.Profile
import com.umt.toolkit.data.ProfileRepository
import com.umt.toolkit.data.ToolkitRepository
import com.umt.toolkit.esp.FrameRouter
import com.umt.toolkit.esp.SandboxFeed
import com.umt.toolkit.integration.IntegrationHub
import com.umt.toolkit.integration.PatchManager
import com.umt.toolkit.overlay.OverlayService
import com.umt.toolkit.perf.PerformanceMonitorEngine
import com.umt.toolkit.plugins.PluginManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import java.io.File

/** Wires the toolkit's modules together; one instance per process, owned by [UmtApp]. */
class Toolkit(val app: Application) {
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val dataDir = File(app.filesDir, "state").apply { mkdirs() }

    val log = UmtLog(File(app.filesDir, "logs"))
    val repo = ToolkitRepository(dataDir, log, scope)
    val profiles = ProfileRepository(dataDir, log)
    val perf = PerformanceMonitorEngine(app, log, scope)
    val hub = IntegrationHub(app, log, scope)
    val sandbox = SandboxFeed()
    val frames = FrameRouter(scope, repo, hub, sandbox)
    val patches = PatchManager(dataDir, hub, log)
    val scanner = AppScanner(app, log)
    val notifier = Notifier(app)
    val plugins = PluginManager(this, dataDir)

    fun start() {
        CrashHandler.install(app.filesDir, log)
        hub.start()
        // Governor settings that live outside the UI.
        scope.launch {
            repo.state.map { it.governor }.distinctUntilChanged().collect { g ->
                log.minLevel = LogLevel.valueOf(g.logLevel)
                log.capacity = g.logCapacity
                perf.intervalMs = g.sampleIntervalMs
            }
        }
        // Bring back overlays the user left on, if Android still lets us draw them.
        scope.launch {
            repo.state.map { it.anyOverlay }.distinctUntilChanged().collect { syncOverlays() }
        }
        log.i("App", "Started ${BuildConfig.APPLICATION_ID} ${BuildConfig.VERSION_NAME} on Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})")
    }

    fun canDrawOverlays(): Boolean = Settings.canDrawOverlays(app)

    fun canPostNotifications(): Boolean = Build.VERSION.SDK_INT < 33 ||
        ContextCompat.checkSelfPermission(app, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

    fun maxPassthroughOpacity(): Float = if (Build.VERSION.SDK_INT >= 31) {
        app.getSystemService(InputManager::class.java)?.maximumObscuringOpacityForTouch ?: 0.8f
    } else 1f

    fun deviceCaps() = DeviceCaps(Build.VERSION.SDK_INT, canDrawOverlays(), canPostNotifications(), maxPassthroughOpacity())

    /** Starts or stops the overlay service to match what is switched on. */
    fun syncOverlays() = OverlayService.sync(app, this)

    fun needsOverlayService(): Boolean = repo.current.anyOverlay || plugins.visiblePanels().isNotEmpty()

    /** Kill switch: every layer and panel off, every stream stopped. */
    fun killAll() {
        repo.killAllOverlays()
        plugins.hideAllPanels()
        hub.stopAllStreams()
        syncOverlays()
        log.w("KillSwitch", "All overlays, panels and streams stopped")
    }

    /** When the entity source is an integrated app that is connected, make sure it is streaming. */
    fun ensureStream() {
        val s = repo.current
        if (s.esp.source != "integration") return
        val pkg = s.integration.targetPackage ?: return
        val session = hub.session(pkg) ?: return
        if (session.state == com.umt.toolkit.integration.LinkState.CONNECTED && !session.streaming) {
            hub.setStreaming(pkg, true, s.integration.streamHz)
        }
    }

    fun applyProfile(p: Profile) {
        repo.applyProfileState(p.state)
        plugins.applyEnabledSet(p.enabledPlugins)
        syncOverlays()
        log.i("Profiles", "Applied profile '${p.name}'")
    }

    companion object {
        fun get(context: Context): Toolkit = (context.applicationContext as UmtApp).toolkit
    }
}

class Notifier(private val context: Context) {
    private val nm = context.getSystemService(NotificationManager::class.java)

    init {
        nm.createNotificationChannel(NotificationChannel(OVERLAY_CHANNEL, context.getString(R.string.overlay_channel), NotificationManager.IMPORTANCE_LOW).apply {
            description = context.getString(R.string.overlay_channel_desc)
            setShowBadge(false)
        })
        nm.createNotificationChannel(NotificationChannel(PLUGIN_CHANNEL, context.getString(R.string.plugin_channel), NotificationManager.IMPORTANCE_DEFAULT))
    }

    /** False when Android 13+ notification permission is missing. */
    fun pluginMessage(title: String, text: String): Boolean {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return false
        val n = NotificationCompat.Builder(context, PLUGIN_CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_umt)
            .setContentTitle(title)
            .setContentText(text.take(200))
            .setAutoCancel(true)
            .build()
        nm.notify((System.currentTimeMillis() % 100000).toInt() + 1000, n)
        return true
    }

    companion object {
        const val OVERLAY_CHANNEL = "umt_overlay"
        const val PLUGIN_CHANNEL = "umt_plugin"
    }
}

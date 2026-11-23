package com.umt.toolkit.overlay

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import com.umt.toolkit.Notifier
import com.umt.toolkit.R
import com.umt.toolkit.Toolkit
import com.umt.toolkit.ui.MainActivity
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

/**
 * Foreground service that owns the overlay windows while any layer or plugin panel is on.
 * Not sticky: if Android stops it, overlays stay off until the user opens the toolkit again.
 */
class OverlayService : Service() {
    companion object {
        private const val NOTIFICATION_ID = 42
        private val _running = kotlinx.coroutines.flow.MutableStateFlow(false)
        val runningFlow: kotlinx.coroutines.flow.StateFlow<Boolean> = _running
        val running: Boolean get() = _running.value
        private var instance: OverlayService? = null

        fun sync(context: Context, tk: Toolkit) {
            val needs = tk.needsOverlayService()
            when {
                needs && tk.canDrawOverlays() -> {
                    val inst = instance
                    if (inst != null) inst.refresh()
                    else try {
                        ContextCompat.startForegroundService(context, Intent(context, OverlayService::class.java))
                    } catch (e: Exception) {
                        tk.log.e("Overlay", "Android refused to start the overlay service", e)
                    }
                }
                needs -> tk.log.w("Overlay", "Overlays are on but \"Display over other apps\" is not allowed")
                else -> instance?.let {
                    it.stopForeground(Service.STOP_FOREGROUND_REMOVE)
                    it.stopSelf()
                }
            }
        }
    }

    private lateinit var tk: Toolkit
    private lateinit var host: OverlayHost
    private val jobs = ArrayList<Job>()
    private var screenOn = true
    private var holdingPerf = false

    private val screenReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            screenOn = intent.action != Intent.ACTION_SCREEN_OFF
            refresh()
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        tk = Toolkit.get(this)
        _running.value = true
        instance = this
        ServiceCompat.startForeground(this, NOTIFICATION_ID, buildNotification(),
            if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0)
        host = OverlayHost(this, tk)
        ContextCompat.registerReceiver(this, screenReceiver,
            IntentFilter().apply { addAction(Intent.ACTION_SCREEN_OFF); addAction(Intent.ACTION_SCREEN_ON) },
            ContextCompat.RECEIVER_NOT_EXPORTED)
        jobs += tk.scope.launch { tk.repo.state.collect { refresh() } }
        jobs += tk.scope.launch { tk.plugins.plugins.collect { refresh() } }
        jobs += tk.scope.launch { tk.plugins.status.collect { host.onPluginStatus(it) } }
        jobs += tk.scope.launch { tk.hub.sessions.collect { host.refreshPanels() } }
        jobs += tk.scope.launch { tk.perf.latest.collect { s -> if (s != null) host.onTelemetry(s) } }
        jobs += tk.scope.launch { tk.frames.frame.collectLatest { f -> host.onFrame(f) } }
        tk.log.i("Overlay", "Overlay service started")
        refresh()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_NOT_STICKY

    fun refresh() {
        if (!::host.isInitialized) return
        val state = tk.repo.current
        val paused = !screenOn && state.governor.pauseWhenScreenOff
        val panels = tk.plugins.visiblePanels()
        if (!state.anyOverlay && panels.isEmpty()) {
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            return
        }
        host.apply(state, panels, paused)
        val wantPerf = !paused && (state.overlays.hudEnabled || panels.isNotEmpty())
        if (wantPerf != holdingPerf) {
            if (wantPerf) tk.perf.acquire("overlay") else tk.perf.release("overlay")
            holdingPerf = wantPerf
        }
        val nm = getSystemService(android.app.NotificationManager::class.java)
        nm.notify(NOTIFICATION_ID, buildNotification())
    }

    private fun buildNotification(): Notification {
        val state = if (::tk.isInitialized) tk.repo.current else null
        val parts = ArrayList<String>()
        state?.overlays?.let { o ->
            if (o.hudEnabled) parts += "HUD"
            if (o.reticleEnabled) parts += "Reticle"
            if (o.guideEnabled) parts += "Guide"
            if (o.dimmerEnabled) parts += "Dimmer"
            if (o.espEnabled) parts += "Entity overlay"
        }
        if (::tk.isInitialized) tk.plugins.visiblePanels().forEach { parts += it.title }
        val stop = PendingIntent.getBroadcast(this, 1, Intent(this, KillSwitchReceiver::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val open = PendingIntent.getActivity(this, 2, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        return NotificationCompat.Builder(this, Notifier.OVERLAY_CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_umt)
            .setContentTitle("Overlays on")
            .setContentText(if (parts.isEmpty()) "Starting" else parts.joinToString(" · "))
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(open)
            .addAction(0, "Stop all", stop)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build()
    }

    override fun onDestroy() {
        jobs.forEach { it.cancel() }
        jobs.clear()
        try { unregisterReceiver(screenReceiver) } catch (_: Exception) {}
        if (::host.isInitialized) host.removeAll()
        if (holdingPerf) tk.perf.release("overlay")
        holdingPerf = false
        _running.value = false
        instance = null
        tk.log.i("Overlay", "Overlay service stopped")
        super.onDestroy()
    }
}

/** The notification's "Stop all" button. */
class KillSwitchReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        Toolkit.get(context).killAll()
    }
}

package app.simtoggle

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import java.util.concurrent.Executors

/**
 * Keeps the data watchdog alive. A foreground service: Android doesn't kill it, and it keeps its
 * network access while the phone sleeps. Each alarm runs one [Watchdog.round] on a background
 * thread under a wake lock, then schedules the next alarm.
 */
class WatchdogService : Service() {
    private val worker = Executors.newSingleThreadExecutor()
    private val main = Handler(Looper.getMainLooper())
    private var busy = false
    private lateinit var wakeLock: PowerManager.WakeLock

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        wakeLock = getSystemService(PowerManager::class.java)
            .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "SimToggle:watchdog")
            .apply { setReferenceCounted(false) }
        getSystemService(NotificationManager::class.java).createNotificationChannel(
            NotificationChannel(CHANNEL, "Data watchdog", NotificationManager.IMPORTANCE_LOW).apply {
                description = "Shows that mobile data is being watched, and the last result"
                setShowBadge(false)
            },
        )
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Every start via startForegroundService() must be answered with startForeground().
        goForeground()
        if (intent?.action == Watchdog.ACTION_STOP || !Watchdog.enabled(this)) {
            if (intent?.action == Watchdog.ACTION_STOP) Watchdog.setEnabled(this, false)
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            return START_NOT_STICKY
        }
        if (!busy) {
            busy = true
            // A round takes up to a few minutes when it restarts the SIM.
            wakeLock.acquire(6 * 60_000L)
            updateNotification("Checking…")
            worker.execute {
                val next = try {
                    Watchdog.round(this)
                } catch (t: Throwable) {
                    Sims.log(this, "Watchdog · round failed: ${t.describe()}")
                    Watchdog.intervalMinutes(this) * 60_000L
                }
                main.post {
                    busy = false
                    if (Watchdog.enabled(this)) {
                        Watchdog.schedule(this, next)
                        updateNotification(null)
                    }
                    if (wakeLock.isHeld) wakeLock.release()
                }
            }
        }
        // Killed anyway? Come back, and the restart runs a round.
        return START_STICKY
    }

    override fun onDestroy() {
        // Let a round that's mid-restart finish switching the SIM back on.
        worker.shutdown()
        if (wakeLock.isHeld) wakeLock.release()
        super.onDestroy()
    }

    private fun goForeground() {
        val notification = buildNotification(null)
        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun updateNotification(override: String?) {
        getSystemService(NotificationManager::class.java).notify(NOTIFICATION_ID, buildNotification(override))
    }

    private fun buildNotification(override: String?): Notification {
        val open = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val stop = PendingIntent.getService(
            this, 3, Intent(this, WatchdogService::class.java).setAction(Watchdog.ACTION_STOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        return Notification.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_sim)
            .setContentTitle("Watching mobile data · every ${Watchdog.intervalMinutes(this)} min")
            .setContentText(override ?: Watchdog.status(this))
            .setContentIntent(open)
            .addAction(Notification.Action.Builder(null, "Stop", stop).build())
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setShowWhen(false)
            .apply { if (Build.VERSION.SDK_INT >= 31) setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE) }
            .build()
    }

    companion object {
        private const val CHANNEL = "watchdog"
        private const val NOTIFICATION_ID = 1
    }
}

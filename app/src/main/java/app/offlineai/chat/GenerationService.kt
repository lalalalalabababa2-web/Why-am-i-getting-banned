package app.offlineai.chat

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import app.offlineai.chat.ui.MainActivity

/**
 * Runs only while a reply is being written. As a foreground service (with its notification) it
 * keeps Android from closing the app when you switch away, and its wake lock keeps the CPU
 * running with the screen off, so the reply finishes. It stops itself the moment the reply ends.
 */
class GenerationService : Service() {
    private var wakeLock: PowerManager.WakeLock? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP_REPLY) {
            App.of(this).chat.stop()
            return START_NOT_STICKY
        }
        try {
            // The "special use" type exists from Android 14; earlier versions take the manifest's.
            val type = if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0
            ServiceCompat.startForeground(this, NOTIFICATION_ID, notification(), type)
        } catch (e: Exception) {
            // Android refused (for example, started from the background); the reply still runs
            // while the app is open.
            stopSelf()
            return START_NOT_STICKY
        }
        if (wakeLock == null) {
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "OfflineAI:writing").apply {
                setReferenceCounted(false)
                acquire(60 * 60 * 1000L)  // never more than an hour, whatever happens
            }
        }
        started = true
        // the reply may have ended before the service got here
        if (!App.of(this).chat.generating) stopNow()
        return START_NOT_STICKY
    }

    private fun stopNow() {
        wakeLock?.let { if (it.isHeld) it.release() }
        wakeLock = null
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        started = false
        wakeLock?.let { if (it.isHeld) it.release() }
        wakeLock = null
        super.onDestroy()
    }

    private fun notification(): Notification {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (nm.getNotificationChannel(CHANNEL) == null) {
            nm.createNotificationChannel(
                NotificationChannel(CHANNEL, "Writing a reply", NotificationManager.IMPORTANCE_LOW).apply {
                    description = "Shown while a reply is being written, so it can finish in the background."
                    setShowBadge(false)
                },
            )
        }
        val open = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val stop = PendingIntent.getService(
            this, 1, Intent(this, GenerationService::class.java).setAction(ACTION_STOP_REPLY),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        return NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_spark)
            .setContentTitle("Writing a reply")
            .setContentText(App.of(this).engine.loaded?.displayName ?: "Offline AI")
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(open)
            .addAction(0, "Stop", stop)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build()
    }

    companion object {
        private const val CHANNEL = "writing"
        private const val NOTIFICATION_ID = 7
        private const val ACTION_STOP_REPLY = "app.offlineai.chat.STOP_REPLY"

        /** startForeground has run. Stopping the service before that would make Android end the app. */
        @Volatile private var started = false

        fun start(context: Context) {
            try {
                ContextCompat.startForegroundService(context, Intent(context, GenerationService::class.java))
            } catch (e: Exception) {
                // not allowed right now; the reply runs anyway while the app is open
            }
        }

        /** Ends the service, or, if it has not started yet, leaves it to stop itself when it does. */
        fun stop(context: Context) {
            if (started) runCatching { context.stopService(Intent(context, GenerationService::class.java)) }
        }
    }
}

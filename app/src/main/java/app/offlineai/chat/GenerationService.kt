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
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import app.offlineai.chat.data.BackgroundSpeed
import app.offlineai.chat.ui.MainActivity
import java.util.Locale

/**
 * Runs only while a reply is being written. As a foreground service (with its notification) it
 * keeps Android from closing the app when you switch away, and its wake lock keeps the CPU
 * running with the screen off, so the reply finishes. It stops itself the moment the reply ends.
 * Its notification shows how far the reply has got; when one finishes with the app in the
 * background, a second notification says so (see [replyReady]).
 */
class GenerationService : Service() {
    private var wakeLock: PowerManager.WakeLock? = null
    private val main = Handler(Looper.getMainLooper())
    private val progress = object : Runnable {
        override fun run() {
            if (!started) return
            runCatching {
                (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).notify(NOTIFICATION_ID, notification())
            }
            main.postDelayed(this, 2000)
        }
    }

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
        main.removeCallbacks(progress)
        main.postDelayed(progress, 2000)
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
        main.removeCallbacks(progress)
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
        val app = App.of(this)
        val c = app.chat
        val name = app.engine.loaded?.displayName ?: "Offline AI"
        val reading = c.promptTotal > 0 && c.promptDone < c.promptTotal
        val gentle = !app.inFront && app.settings.backgroundSpeed == BackgroundSpeed.GENTLE
        val title = when {
            reading -> "Reading your message"
            c.generated > 0 -> "Writing a reply"
            else -> "Starting a reply"
        }
        val text = when {
            reading -> "$name · ${c.promptDone} of ${c.promptTotal} tokens${c.promptEtaLabel()}"
            c.generated > 1 -> String.format(Locale.US, "%s · %d tokens · %.1f tok/s", name, c.generated, c.tokensPerSecond())
            else -> name
        } + (if (gentle) " · gentle while you use other apps" else "")
        val b = NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_spark)
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(text))
        if (reading) b.setProgress(c.promptTotal, c.promptDone, false)
        return b
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
        private const val CHANNEL_DONE = "replies"
        private const val DONE_ID = 8

        /**
         * A reply finished (or failed) while the app was in the background: says so, with the
         * start of the reply; tapping it opens the chat. Cleared when the app comes back.
         */
        fun replyReady(context: Context, title: String, text: String) {
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (nm.getNotificationChannel(CHANNEL_DONE) == null) {
                nm.createNotificationChannel(
                    NotificationChannel(CHANNEL_DONE, "Reply ready", NotificationManager.IMPORTANCE_DEFAULT).apply {
                        description = "When a reply finishes while you are in another app."
                    },
                )
            }
            val open = PendingIntent.getActivity(
                context, 2, Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
            )
            val n = NotificationCompat.Builder(context, CHANNEL_DONE)
                .setSmallIcon(R.drawable.ic_spark)
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(NotificationCompat.BigTextStyle().bigText(text))
                .setContentIntent(open)
                .setAutoCancel(true)
                .build()
            runCatching { nm.notify(DONE_ID, n) }  // no permission: nothing shown
        }

        fun clearReplyReady(context: Context) {
            runCatching { (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).cancel(DONE_ID) }
        }
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

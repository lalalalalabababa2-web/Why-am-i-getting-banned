package app.offlineai.chat

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.BitmapFactory
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.os.SystemClock
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import app.offlineai.chat.data.Disguise
import app.offlineai.chat.data.Picture
import app.offlineai.chat.ui.PicturesActivity
import app.offlineai.chat.ui.PongActivity

/**
 * Runs while pictures are being made (PictureJobs): as a foreground service with a notification
 * it keeps Android from stopping the app when another app is in front, and its wake lock keeps
 * the CPU going with the screen off. The notification shows the step and has a Stop button; a
 * picture finished while the app is out of sight gets a notification of its own.
 */
class PictureService : Service() {
    private var wakeLock: PowerManager.WakeLock? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val app = App.of(this)
        if (intent?.action == ACTION_STOP) {
            app.pictureJobs.cancelAll()
            return START_NOT_STICKY
        }
        if (app.pictureJobs.current == null) {
            stopNow()
            return START_NOT_STICKY
        }
        try {
            val type = if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0
            ServiceCompat.startForeground(this, NOTIFICATION_ID, notification(this), type)
        } catch (e: Exception) {
            // refused (started from the background): the picture still finishes while the app is open
            stopSelf()
            return START_NOT_STICKY
        }
        if (wakeLock == null) {
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "OfflineAI:pictures").apply {
                setReferenceCounted(false)
                acquire(2 * 60 * 60 * 1000L)  // never more than two hours, whatever happens
            }
        }
        running = true
        return START_NOT_STICKY
    }

    private fun stopNow() {
        running = false
        wakeLock?.let { if (it.isHeld) it.release() }
        wakeLock = null
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        running = false
        wakeLock?.let { if (it.isHeld) it.release() }
        wakeLock = null
        super.onDestroy()
    }

    companion object {
        private const val CHANNEL = "pictures"
        private const val CHANNEL_DONE = "pictures_done"
        private const val NOTIFICATION_ID = 41
        private const val DONE_ID = 42
        private const val ACTION_STOP = "app.offlineai.chat.action.STOP_PICTURES"

        @Volatile private var running = false
        private var lastUpdate = 0L

        fun start(context: Context) {
            runCatching { ContextCompat.startForegroundService(context, Intent(context, PictureService::class.java)) }
        }

        fun stop(context: Context) {
            running = false
            runCatching { context.stopService(Intent(context, PictureService::class.java)) }
        }

        /** The progress in the notification, at most a few times a second. */
        fun update(context: Context) {
            if (!running) return
            val now = SystemClock.uptimeMillis()
            if (now - lastUpdate < 400) return
            lastUpdate = now
            runCatching {
                (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).notify(NOTIFICATION_ID, notification(context))
            }
        }

        private fun channels(nm: NotificationManager) {
            if (nm.getNotificationChannel(CHANNEL) == null) {
                nm.createNotificationChannel(NotificationChannel(CHANNEL, "Making pictures", NotificationManager.IMPORTANCE_LOW).apply {
                    description = "Shown while pictures are being made, so they can finish in the background."
                    setShowBadge(false)
                })
            }
            if (nm.getNotificationChannel(CHANNEL_DONE) == null) {
                nm.createNotificationChannel(NotificationChannel(CHANNEL_DONE, "Picture ready", NotificationManager.IMPORTANCE_DEFAULT).apply {
                    description = "When a picture finishes while you are in another app."
                })
            }
        }

        /** Opens the Pictures screen, or the game while the app is hidden. */
        private fun open(context: Context, code: Int): PendingIntent {
            val hidden = App.of(context).settings.disguised
            val i = Intent(context, if (hidden) PongActivity::class.java else PicturesActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            return PendingIntent.getActivity(context, code, i, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        }

        private fun notification(context: Context): Notification {
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            channels(nm)
            val app = App.of(context)
            val jobs = app.pictureJobs
            val hidden = app.settings.disguised
            val j = jobs.current
            val sampling = jobs.stage.contains("sampl") && jobs.total > 0
            val title = when {
                hidden -> Disguise.GAME_NAME
                j == null -> "Making pictures"
                sampling -> "Painting · step ${jobs.done.coerceAtMost(jobs.total)} of ${jobs.total}"
                jobs.stage.contains("decod") -> "Finishing the picture"
                else -> "Getting ready to paint"
            }
            val text = when {
                hidden -> "Running"
                j == null -> ""
                else -> j.prompt.take(80) + (if (jobs.waiting > 0) " · ${jobs.waiting} more waiting" else "")
            }
            val stop = PendingIntent.getService(
                context, 43, Intent(context, PictureService::class.java).setAction(ACTION_STOP),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
            )
            return NotificationCompat.Builder(context, CHANNEL)
                .setSmallIcon(R.drawable.ic_image)
                .setContentTitle(title)
                .setContentText(text)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setProgress(if (sampling) jobs.total.toInt() else 0, if (sampling) jobs.done.toInt() else 0, !sampling)
                .setContentIntent(open(context, 44))
                .addAction(0, if (hidden) "Stop" else "Stop", stop)
                .build()
        }

        /** A picture finished while the app was out of sight. */
        fun ready(context: Context, p: Picture) {
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            channels(nm)
            val hidden = App.of(context).settings.disguised
            val b = NotificationCompat.Builder(context, CHANNEL_DONE)
                .setSmallIcon(R.drawable.ic_image)
                .setContentTitle(if (hidden) Disguise.GAME_NAME else "Your picture is ready")
                .setContentText(if (hidden) "Your turn" else p.prompt.take(100))
                .setContentIntent(open(context, 45))
                .setAutoCancel(true)
            if (!hidden) {
                runCatching {
                    val bmp = BitmapFactory.decodeFile(p.file.path, BitmapFactory.Options().apply { inSampleSize = 2 })
                    if (bmp != null) b.setLargeIcon(bmp).setStyle(NotificationCompat.BigPictureStyle().bigPicture(bmp))
                }
            }
            runCatching { nm.notify(DONE_ID, b.build()) }
        }

        fun failed(context: Context, error: String) {
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            channels(nm)
            val hidden = App.of(context).settings.disguised
            val n = NotificationCompat.Builder(context, CHANNEL_DONE)
                .setSmallIcon(R.drawable.ic_image)
                .setContentTitle(if (hidden) Disguise.GAME_NAME else "The picture could not be made")
                .setContentText(if (hidden) "Game over" else error.take(140))
                .setContentIntent(open(context, 46))
                .setAutoCancel(true)
                .build()
            runCatching { nm.notify(DONE_ID, n) }
        }
    }
}

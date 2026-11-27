package app.humkiller

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.graphics.drawable.Icon
import android.os.IBinder

/**
 * Runs while HumKiller is cancelling, so it keeps going with the screen off or another app open.
 * Android only lets an app use the mic in the background from a foreground service of the
 * "microphone" type, started while the app was on screen.
 */
class HumService : Service() {
    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            Engine.start(this)
            Engine.setArmed(false)
            stopSelf()
            return START_NOT_STICKY
        }
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel(CHANNEL, "Cancelling", NotificationManager.IMPORTANCE_LOW))
        val openApp = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE,
        )
        val stop = PendingIntent.getService(
            this, 1, Intent(this, HumService::class.java).setAction(ACTION_STOP), PendingIntent.FLAG_IMMUTABLE,
        )
        val text = when (Engine.mode) {
            Native.MODE_ANC -> "Auto ANC on the hum"
            Native.MODE_LOCK -> "Locked to the hum at %.2f Hz".format(Engine.fundamental)
            else -> "Tones at %.2f Hz".format(Engine.fundamental)
        }
        val n = Notification.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat)
            .setContentTitle("HumKiller is on")
            .setContentText(text)
            .setContentIntent(openApp)
            .setOngoing(true)
            .addAction(Notification.Action.Builder(Icon.createWithResource(this, R.drawable.ic_stat), "Stop", stop).build())
            .build()

        val mic = checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
        val types = ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK or
            (if (mic) ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE else 0)
        try {
            startForeground(1, n, types)
        } catch (e: Exception) {
            // e.g. started while the app wasn't on screen: carry on without background mic access
            try {
                startForeground(1, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
            } catch (e2: Exception) {
                stopSelf()
            }
        }
        return START_NOT_STICKY
    }

    companion object {
        const val CHANNEL = "cancelling"
        const val ACTION_STOP = "app.humkiller.STOP"
    }
}

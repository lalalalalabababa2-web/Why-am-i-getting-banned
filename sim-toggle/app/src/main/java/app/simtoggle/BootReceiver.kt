package app.simtoggle

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Restarts the data watchdog after the phone restarts or the app is updated. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED && intent.action != Intent.ACTION_MY_PACKAGE_REPLACED) return
        if (Watchdog.enabled(context)) {
            runCatching { Watchdog.start(context) }
                .onFailure { Sims.log(context, "Watchdog · couldn't start after ${intent.action}: ${it.describe()}") }
        }
    }
}

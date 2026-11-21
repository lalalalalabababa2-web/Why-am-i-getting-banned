package app.simtoggle

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.os.SystemClock
import android.telephony.SubscriptionManager
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Every few minutes: is mobile data working? If not, switch the data SIM off and on again.
 *
 * Runs in [WatchdogService] (a foreground service, so Android leaves it and its network access
 * alone) and wakes itself with exact alarms, which also fire while the phone is asleep.
 */
object Watchdog {
    const val ACTION_CHECK = "app.simtoggle.watchdog.CHECK"
    const val ACTION_STOP = "app.simtoggle.watchdog.STOP"

    val INTERVALS = intArrayOf(1, 2, 5, 10, 15, 30)

    /** How long after a restart to look again: long enough for the SIM to register. */
    private const val AFTER_RESTART_MS = 75_000L
    private const val MAX_BACKOFF_MS = 30 * 60_000L

    private fun prefs(ctx: Context): SharedPreferences =
        ctx.getSharedPreferences("watchdog", Context.MODE_PRIVATE)

    fun enabled(ctx: Context) = prefs(ctx).getBoolean("enabled", false)

    fun intervalMinutes(ctx: Context) = prefs(ctx).getInt("interval", 2)

    fun setEnabled(ctx: Context, on: Boolean) {
        prefs(ctx).edit().putBoolean("enabled", on).putInt("fixes", 0).apply()
        if (on) {
            Sims.log(ctx, "Watchdog on: checking data every ${intervalMinutes(ctx)} min")
            start(ctx)
        } else {
            cancelAlarm(ctx)
            ctx.stopService(Intent(ctx, WatchdogService::class.java))
            Sims.log(ctx, "Watchdog off")
            setStatus(ctx, "Off")
        }
    }

    fun setInterval(ctx: Context, minutes: Int) {
        prefs(ctx).edit().putInt("interval", minutes).apply()
        if (enabled(ctx)) start(ctx)
    }

    /** Starts the service, which runs a round right away and schedules the next one. */
    fun start(ctx: Context) {
        ctx.startForegroundService(Intent(ctx, WatchdogService::class.java).setAction(ACTION_CHECK))
    }

    /** The last result, for the app and the notification. */
    fun status(ctx: Context): String = prefs(ctx).getString("status", null) ?: "Not checked yet"

    private fun setStatus(ctx: Context, text: String) {
        val time = SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date())
        prefs(ctx).edit().putString("status", "$time · $text").apply()
    }

    /**
     * One round: check data, restart the SIM if it's down. Returns how long to wait before the
     * next round. Blocks for up to a few minutes; background thread only.
     */
    fun round(ctx: Context): Long {
        val p = prefs(ctx)
        val interval = intervalMinutes(ctx) * 60_000L
        ShizukuGate.awaitBinder(3_000)

        // A restart cut short (the app was killed between "off" and "on"): finish it first.
        val pending = p.getInt("restarting_slot", -1)
        if (pending >= 0) {
            if (!ShizukuGate.ready()) {
                setStatus(ctx, "SIM ${pending + 1} was left off; start Shizuku to switch it back on")
                return interval
            }
            val row = Sims.load(ctx).getOrNull(pending)
            if (row != null && row.hasSim && !row.on) Sims.setOn(ctx, row, true)
            p.edit().remove("restarting_slot").apply()
            Sims.log(ctx, "Watchdog · switched SIM ${pending + 1} back on after an interrupted restart")
            return AFTER_RESTART_MS
        }

        var outcome = DataCheck.run(ctx)
        if (outcome is DataCheck.Outcome.Failed) {
            // One dropped request isn't an outage: look again before touching the SIM.
            Thread.sleep(10_000)
            outcome = DataCheck.run(ctx)
        }
        val fixes = p.getInt("fixes", 0)
        val lastKind = p.getString("last_kind", "")

        when (outcome) {
            is DataCheck.Outcome.Ok -> {
                if (fixes > 0) Sims.log(ctx, "Watchdog · data is back after $fixes restart${if (fixes > 1) "s" else ""}")
                else if (lastKind != "ok") Sims.log(ctx, "Watchdog · data OK (${outcome.ms} ms)")
                p.edit().putInt("fixes", 0).putString("last_kind", "ok").apply()
                setStatus(ctx, "Data OK (${outcome.ms} ms)")
                return interval
            }
            is DataCheck.Outcome.Skipped -> {
                if (lastKind != "skip:${outcome.why}") Sims.log(ctx, "Watchdog · not checking: ${outcome.why}")
                p.edit().putInt("fixes", 0).putString("last_kind", "skip:${outcome.why}").apply()
                setStatus(ctx, "Not checked: ${outcome.why}")
                return interval
            }
            is DataCheck.Outcome.Failed -> {
                p.edit().putString("last_kind", "failed").apply()
                if (!ShizukuGate.ready()) {
                    Sims.log(ctx, "Watchdog · no data (${outcome.why}), but Shizuku isn't running to restart the SIM")
                    setStatus(ctx, "No data. Start Shizuku so the SIM can be restarted")
                    return interval
                }
                val slot = dataSlot(ctx)
                val row = Sims.load(ctx).getOrNull(slot)
                if (row == null || !row.hasSim) {
                    setStatus(ctx, "No data, and no SIM in slot ${slot + 1}")
                    return interval
                }
                if (!row.on) {
                    // Switched off on purpose: leave it alone.
                    setStatus(ctx, "No data: ${row.title} is switched off")
                    return interval
                }
                Sims.log(ctx, "Watchdog · no data (${outcome.why}), restarting ${row.title}")
                val result = restart(ctx, row)
                Sims.log(ctx, "Watchdog · ${row.title} $result")
                val n = fixes + 1
                p.edit().putInt("fixes", n).apply()
                setStatus(ctx, "No data, restarted ${row.title}")
                // Two quick retries, then back off: in a dead zone a restart every minute won't help.
                return if (n < 3) AFTER_RESTART_MS else minOf(interval shl (n - 2).coerceAtMost(6), MAX_BACKOFF_MS)
            }
        }
    }

    /** Off, a pause, on. The slot is remembered until it's back on, in case we're killed midway. */
    private fun restart(ctx: Context, row: SimRow): String {
        val p = prefs(ctx)
        p.edit().putInt("restarting_slot", row.slot).commit()
        Sims.setOn(ctx, row, false)
        waitFor(15_000) { Sims.load(ctx).getOrNull(row.slot)?.on == false }
        Thread.sleep(3_000)
        val off = Sims.load(ctx).getOrNull(row.slot)?.takeIf { it.hasSim } ?: row.copy(on = false)
        Sims.setOn(ctx, off, true)
        p.edit().remove("restarting_slot").apply()
        Sims.refreshTile(ctx)
        val back = waitFor(30_000) { Sims.load(ctx).getOrNull(row.slot)?.on == true }
        return if (back) "restarted" else "switched back on, still connecting"
    }

    private fun waitFor(timeoutMs: Long, done: () -> Boolean): Boolean {
        val end = SystemClock.elapsedRealtime() + timeoutMs
        while (SystemClock.elapsedRealtime() < end) {
            if (runCatching(done).getOrDefault(false)) return true
            Thread.sleep(1_000)
        }
        return false
    }

    /** The slot of the SIM used for mobile data (remembered, since a SIM that's off has none). */
    private fun dataSlot(ctx: Context): Int {
        val sub = SubscriptionManager.getDefaultDataSubscriptionId()
        val slot = if (sub >= 0) SubscriptionManager.getSlotIndex(sub) else -1
        if (slot >= 0) {
            prefs(ctx).edit().putInt("data_slot", slot).apply()
            return slot
        }
        return prefs(ctx).getInt("data_slot", Sims.tileSlot(ctx))
    }

    // ---- Waking up ----

    private fun alarmIntent(ctx: Context, exact: Boolean): PendingIntent {
        val intent = Intent(ctx, WatchdogService::class.java).setAction(ACTION_CHECK)
        val flags = PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        // An exact alarm may start a foreground service from the background; an inexact one may
        // only reach the service that's already running.
        return if (exact) PendingIntent.getForegroundService(ctx, 1, intent, flags)
        else PendingIntent.getService(ctx, 2, intent, flags)
    }

    fun schedule(ctx: Context, delayMs: Long) {
        val am = ctx.getSystemService(AlarmManager::class.java)
        val at = SystemClock.elapsedRealtime() + delayMs
        val exact = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms()
        cancelAlarm(ctx)
        if (exact) {
            am.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, at, alarmIntent(ctx, true))
        } else {
            am.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, at, alarmIntent(ctx, false))
        }
        prefs(ctx).edit().putLong("next_at", System.currentTimeMillis() + delayMs).apply()
    }

    fun nextCheck(ctx: Context): Long = prefs(ctx).getLong("next_at", 0)

    private fun cancelAlarm(ctx: Context) {
        val am = ctx.getSystemService(AlarmManager::class.java)
        am.cancel(alarmIntent(ctx, true))
        am.cancel(alarmIntent(ctx, false))
    }
}

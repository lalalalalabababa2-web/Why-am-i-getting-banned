package app.simtoggle

import android.Manifest
import android.annotation.SuppressLint
import android.content.ComponentName
import android.content.Context
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.os.Handler
import android.os.Looper
import android.service.quicksettings.TileService
import android.telephony.SubscriptionInfo
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.Executors

/** How a SIM gets turned off. Turning it back on always undoes whichever was used. */
enum class Method(val label: String, val detail: String) {
    AUTO(
        "Auto",
        "Like the SIM manager switch; powers the SIM down instead if the phone refuses that",
    ),
    SWITCH(
        "SIM manager switch",
        "Turns the SIM's apps off the way Settings does. The SIM stays listed, shown as off",
    ),
    POWER(
        "Power off the SIM card",
        "Cuts power to the card, as if it were taken out. Comes back on when switched on or after a restart",
    ),
}

/** One SIM slot as the app shows it. */
data class SimRow(
    val slot: Int,
    /** The SIM's subscription, or -1 when the slot is empty (or the SIM is powered down). */
    val subId: Int,
    val embedded: Boolean,
    val carrier: String,
    val number: String,
    val on: Boolean,
    /** We cut power to this slot and haven't restored it. */
    val poweredDown: Boolean,
) {
    val title: String get() = if (embedded) "eSIM" else "SIM ${slot + 1}"
    val hasSim: Boolean get() = subId >= 0 || poweredDown
}

object Sims {
    private val worker = Executors.newSingleThreadExecutor()
    private val main = Handler(Looper.getMainLooper())

    /** Binder calls go to one background thread, in order; [done] runs on the main thread. */
    fun <T> background(work: () -> T, done: (Result<T>) -> Unit) {
        worker.execute {
            val result = runCatching(work)
            main.post { done(result) }
        }
    }

    private fun prefs(ctx: Context): SharedPreferences =
        ctx.getSharedPreferences("sims", Context.MODE_PRIVATE)

    fun method(ctx: Context): Method =
        runCatching { Method.valueOf(prefs(ctx).getString("method", null)!!) }.getOrDefault(Method.AUTO)

    fun setMethod(ctx: Context, method: Method) = prefs(ctx).edit().putString("method", method.name).apply()

    /** Which slot the Quick Settings tile switches. */
    fun tileSlot(ctx: Context): Int = prefs(ctx).getInt("tile_slot", 0)

    fun setTileSlot(ctx: Context, slot: Int) {
        prefs(ctx).edit().putInt("tile_slot", slot).apply()
        refreshTile(ctx)
    }

    fun slotCount(ctx: Context): Int =
        ctx.getSystemService(TelephonyManager::class.java).activeModemCount.coerceAtLeast(1)

    private fun poweredDownSince(p: SharedPreferences, slot: Int): Long = p.getLong("down_$slot", 0)

    /** Reads every slot. Blocking binder calls: background thread only. */
    fun load(ctx: Context): List<SimRow> {
        val p = prefs(ctx)
        val slots = slotCount(ctx)
        val subs = if (ShizukuGate.ready()) Telephony.availableSubscriptions() else publicActiveSubscriptions(ctx)

        val bySlot = arrayOfNulls<SubscriptionInfo>(slots)
        val placed = HashSet<Int>()
        fun place(slot: Int, sub: SubscriptionInfo) {
            bySlot[slot] = sub
            placed += sub.subscriptionId
        }
        // Active SIMs report their own slot.
        for (sub in subs) {
            val slot = sub.simSlotIndex
            if (slot in 0 until slots && bySlot[slot] == null) place(slot, sub)
        }
        // A switched-off SIM reports slot -1; put it back where we last saw it.
        for (slot in 0 until slots) {
            if (bySlot[slot] != null) continue
            val last = p.getInt("sub_$slot", -1)
            subs.firstOrNull { it.subscriptionId == last && last !in placed }?.let { place(slot, it) }
        }
        // A physical SIM switched off somewhere else (Settings) before we ever saw it: first free slot.
        for (sub in subs) {
            if (sub.subscriptionId in placed || sub.isEmbedded) continue
            val slot = (0 until slots).firstOrNull { bySlot[it] == null && poweredDownSince(p, it) == 0L } ?: continue
            place(slot, sub)
        }

        val now = System.currentTimeMillis()
        val edit = p.edit()
        val rows = (0 until slots).map { slot ->
            val sub = bySlot[slot]
            val active = sub != null && sub.simSlotIndex >= 0
            var down = poweredDownSince(p, slot) != 0L
            if (active) {
                edit.putInt("sub_$slot", sub.subscriptionId)
                // Power comes back on by itself after a restart. Give a fresh power-down a few
                // seconds to take effect before believing the SIM is really back.
                if (down && now - poweredDownSince(p, slot) > 20_000) {
                    edit.remove("down_$slot")
                    down = false
                }
            }
            SimRow(
                slot = slot,
                subId = sub?.subscriptionId ?: -1,
                embedded = sub?.isEmbedded == true,
                carrier = sub?.let { (it.displayName ?: it.carrierName)?.toString() }.orEmpty(),
                number = sub?.let { @Suppress("DEPRECATION") it.number }.orEmpty(),
                on = active && Telephony.uiccApplicationsEnabled(sub) && !down,
                poweredDown = down,
            )
        }
        edit.apply()
        return rows
    }

    /** Without Shizuku: active SIMs only, if we're allowed to read the phone state at all. */
    @SuppressLint("MissingPermission")
    private fun publicActiveSubscriptions(ctx: Context): List<SubscriptionInfo> {
        if (ctx.checkSelfPermission(Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) {
            return emptyList()
        }
        return ctx.getSystemService(SubscriptionManager::class.java).activeSubscriptionInfoList.orEmpty()
    }

    /** Switches [row] on or off. Returns what happened, for the log. Background thread only. */
    fun setOn(ctx: Context, row: SimRow, on: Boolean): String {
        check(ShizukuGate.ready()) { "Shizuku isn't connected" }
        val p = prefs(ctx)
        val name = row.title
        val method = method(ctx)

        if (on) {
            if (row.poweredDown) {
                Telephony.setSimPower(row.slot, true)
                p.edit().remove("down_${row.slot}").apply()
                return "$name: powered back on"
            }
            require(row.subId >= 0) { "no SIM in this slot" }
            try {
                Telephony.setUiccApplicationsEnabled(row.subId, true)
            } catch (t: Throwable) {
                if (method == Method.SWITCH) throw t
                Telephony.setSimPower(row.slot, true)
                return "$name: switch refused (${t.describe()}), powered the card on instead"
            }
            return "$name: on"
        }

        var why: String? = null
        if (method != Method.POWER && row.subId >= 0) {
            val supported = if (method == Method.AUTO) Telephony.canDisablePhysicalSubscription() else true
            if (supported == false) {
                why = "this phone's modem can't switch SIMs off"
            } else {
                try {
                    Telephony.setUiccApplicationsEnabled(row.subId, false)
                    p.edit().putInt("sub_${row.slot}", row.subId).apply()
                    return "$name: off"
                } catch (t: Throwable) {
                    if (method == Method.SWITCH) throw t
                    why = t.describe()
                }
            }
        }
        Telephony.setSimPower(row.slot, false)
        p.edit().putLong("down_${row.slot}", System.currentTimeMillis()).also {
            if (row.subId >= 0) it.putInt("sub_${row.slot}", row.subId)
        }.apply()
        return "$name: powered off" + (why?.let { " (switch refused: $it)" } ?: "")
    }

    fun refreshTile(ctx: Context) {
        runCatching { TileService.requestListeningState(ctx, ComponentName(ctx, SimTileService::class.java)) }
    }

    // A short history, newest first, shared by the app and the tile.

    @Synchronized
    fun log(ctx: Context, line: String) {
        android.util.Log.i("SimToggle", line)
        val time = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
        val old = prefs(ctx).getString("log", "").orEmpty().lines().filter { it.isNotBlank() }
        prefs(ctx).edit().putString("log", (listOf("$time  $line") + old).take(40).joinToString("\n")).apply()
    }

    fun logText(ctx: Context): String = prefs(ctx).getString("log", "").orEmpty()

    fun clearLog(ctx: Context) = prefs(ctx).edit().remove("log").apply()
}

fun Throwable.describe(): String {
    val text = when (this) {
        is SecurityException -> "not allowed: ${message.orEmpty()}"
        is NoSuchMethodException -> message.orEmpty()
        else -> "${javaClass.simpleName}${message?.let { ": $it" }.orEmpty()}"
    }
    return text.take(220)
}

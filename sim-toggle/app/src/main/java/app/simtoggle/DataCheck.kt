package app.simtoggle

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.os.SystemClock
import android.provider.Settings
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

/**
 * Does mobile data actually reach the internet? Asks Android for the cellular network itself (so
 * the answer is about the SIM even while Wi-Fi is connected) and loads a "204 No Content" page
 * over it, the same kind of page Android uses for its own connectivity check.
 */
object DataCheck {
    sealed class Outcome {
        data class Ok(val ms: Long) : Outcome()
        data class Failed(val why: String) : Outcome()
        /** Nothing to test right now (airplane mode, mobile data switched off...). */
        data class Skipped(val why: String) : Outcome()
    }

    private val PROBES = listOf(
        "https://connectivitycheck.gstatic.com/generate_204",
        "https://www.google.com/generate_204",
        "https://cp.cloudflare.com/generate_204",
    )

    /** Blocks for up to about 40 seconds. Background thread only. */
    fun run(ctx: Context): Outcome {
        if (Settings.Global.getInt(ctx.contentResolver, Settings.Global.AIRPLANE_MODE_ON, 0) != 0) {
            return Outcome.Skipped("airplane mode is on")
        }
        val dataSub = SubscriptionManager.getDefaultDataSubscriptionId()
        if (dataSub != SubscriptionManager.INVALID_SUBSCRIPTION_ID) {
            val tm = ctx.getSystemService(TelephonyManager::class.java).createForSubscriptionId(dataSub)
            if (!runCatching { tm.isDataEnabled }.getOrDefault(true)) {
                return Outcome.Skipped("mobile data is switched off")
            }
        }

        val cm = ctx.getSystemService(ConnectivityManager::class.java)
        return withCellular(cm) { network ->
            if (network == null) return@withCellular Outcome.Failed("no mobile data connection")
            var last = ""
            for (probe in PROBES) {
                val start = SystemClock.elapsedRealtime()
                try {
                    val conn = network.openConnection(URL(probe)) as HttpURLConnection
                    conn.connectTimeout = 8_000
                    conn.readTimeout = 8_000
                    conn.instanceFollowRedirects = false
                    conn.useCaches = false
                    try {
                        val code = conn.responseCode
                        if (code == 204) return@withCellular Outcome.Ok(SystemClock.elapsedRealtime() - start)
                        // A sign-in page or a carrier's "top up" page instead of the internet.
                        last = "got HTTP $code instead of the internet"
                    } finally {
                        conn.disconnect()
                    }
                } catch (e: Exception) {
                    last = e.describe()
                }
            }
            Outcome.Failed(last)
        }
    }

    /**
     * Runs [block] with the cellular network (null if none came up within 15 s), brought up even
     * if Wi-Fi is in use, and holds it until [block] returns.
     */
    private fun <T> withCellular(cm: ConnectivityManager, block: (Network?) -> T): T {
        val request = NetworkRequest.Builder()
            .addTransportType(NetworkCapabilities.TRANSPORT_CELLULAR)
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()
        val ready = CountDownLatch(1)
        val found = AtomicReference<Network?>()
        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                found.set(network)
                ready.countDown()
            }

            override fun onUnavailable() = ready.countDown()
        }
        val registered = runCatching { cm.requestNetwork(request, callback, 15_000) }.isSuccess
        try {
            if (registered) ready.await(16, TimeUnit.SECONDS)
            return block(found.get())
        } finally {
            if (registered) runCatching { cm.unregisterNetworkCallback(callback) }
        }
    }
}

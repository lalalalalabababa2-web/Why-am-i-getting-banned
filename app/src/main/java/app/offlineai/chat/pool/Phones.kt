package app.offlineai.chat.pool

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import app.offlineai.chat.App
import app.offlineai.chat.data.PoolMode
import org.json.JSONArray
import org.json.JSONObject
import java.net.InetAddress
import java.net.ServerSocket
import java.net.Socket
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/** A phone that lends its memory to this one, paired with its code. */
data class HelperPhone(
    val id: String,
    val name: String,
    val host: String,
    val port: Int,
    val code: String,
    val enabled: Boolean = true,
) {
    fun toJson(): JSONObject = JSONObject().put("id", id).put("name", name).put("host", host).put("port", port)
        .put("code", code).put("enabled", enabled)

    companion object {
        fun fromJson(j: JSONObject) = HelperPhone(
            j.optString("id"), j.optString("name"), j.optString("host"), j.optInt("port", PoolWire.PORT),
            j.optString("code"), j.optBoolean("enabled", true),
        )
    }
}

/** A lending phone found on the Wi-Fi that is not paired yet. */
data class NearbyPhone(val id: String, val name: String, val host: String, val port: Int)

/** Part of the model on another phone: the engine's endpoint for it (this phone's gate to it) and the share of layers. */
data class RpcPart(val helperId: String, val endpoint: String, val share: Float)

/**
 * The phones this one borrows memory from (Phones working together): pairing, finding them on the
 * Wi-Fi, how much of a model each one takes, and the gates the engine reaches them through.
 *
 * For each paired phone there is a gate on this phone's loopback (a fixed port while the app
 * runs): the engine connects to it as if it were the other phone's RPC server, and the gate
 * connects through to that phone, passing the pairing-code check first. While a model is split,
 * the phones in use are asked how they are every few seconds; one that stops answering, or that
 * no longer knows this phone, has its connections closed, so the engine's next step fails with a
 * clear message instead of waiting for good, and the model loads again without it.
 */
class Phones(private val app: App) {
    fun interface Listener {
        fun onPhonesChanged()
    }

    private val prefs = app.getSharedPreferences("phones", Context.MODE_PRIVATE)
    private val main = Handler(Looper.getMainLooper())
    private val listeners = mutableListOf<Listener>()
    private val io = Executors.newCachedThreadPool { r -> Thread(r, "phones").apply { isDaemon = true } }

    /** What each paired phone said last, and when (elapsed realtime). */
    private val statuses = ConcurrentHashMap<String, LendStatus>()
    private val seenAt = ConcurrentHashMap<String, Long>()
    private val misses = ConcurrentHashMap<String, Int>()
    /** Answers in a row saying it no longer holds this phone's part. */
    private val strays = ConcurrentHashMap<String, Int>()
    /** Why the last connection to a phone failed, for the Phones screen. */
    val lastError = ConcurrentHashMap<String, String>()

    /** Lending phones found on the Wi-Fi, by id, paired or not. */
    private val found = ConcurrentHashMap<String, NearbyPhone>()

    /** Something was changed on the Phones screen since the model was loaded. */
    @Volatile var changed = false

    /** The Phones screen is open: every paired phone is asked, not only the ones in use. */
    @Volatile var watching = false

    fun addListener(l: Listener) = listeners.add(l)
    fun removeListener(l: Listener) = listeners.remove(l)
    private fun announce() = main.post { listeners.toList().forEach { it.onPhonesChanged() } }

    // ------------------------------------------------------------------ paired phones

    fun saved(): List<HelperPhone> = try {
        val a = JSONArray(prefs.getString("list", "[]"))
        (0 until a.length()).map { HelperPhone.fromJson(a.getJSONObject(it)) }
    } catch (e: Exception) {
        emptyList()
    }

    @Synchronized
    private fun store(list: List<HelperPhone>) {
        prefs.edit().putString("list", JSONArray().apply { list.forEach { put(it.toJson()) } }.toString()).apply()
        announce()
    }

    @Synchronized
    fun upsert(h: HelperPhone) {
        store(saved().filter { it.id != h.id } + h)
        changed = true
    }

    @Synchronized
    fun remove(id: String) {
        store(saved().filter { it.id != id })
        statuses.remove(id)
        links.remove(id)?.close()
        changed = true
    }

    @Synchronized
    fun setEnabled(id: String, on: Boolean) {
        store(saved().map { if (it.id == id) it.copy(enabled = on) else it })
        changed = true
    }

    fun status(id: String): LendStatus? = statuses[id]

    /** Answered within the last 15 seconds. */
    fun online(id: String): Boolean = (seenAt[id] ?: 0L) > SystemClock.elapsedRealtime() - 15_000

    /** Paired phones found on the Wi-Fi now, and those not paired yet. */
    fun nearby(): List<NearbyPhone> {
        val paired = saved().map { it.id }.toSet()
        return found.values.filter { it.id !in paired && it.id != app.settings.deviceId }.sortedBy { it.name }
    }

    /**
     * Checks [code] with the phone at [host]:[port] and pairs it. [onDone] gets null, or why not.
     * The phone's name and id come from its own answer.
     */
    fun pair(host: String, port: Int, code: String, onDone: (String?) -> Unit) {
        io.execute {
            val err = try {
                val st = PoolWire.status(host, port) ?: throw PoolWire.Refused(
                    "No lending phone answered at $host. Check the address, and that Lend this phone is on there.")
                if (st.id == app.settings.deviceId && !allowSelf) throw PoolWire.Refused("That is this phone.")
                PoolWire.open(host, port, code, app.settings.deviceId, myName(), PoolWire.VERIFY).close()
                upsert(HelperPhone(st.id, st.name, host, port, code.trim(), true))
                statuses[st.id] = st
                seenAt[st.id] = SystemClock.elapsedRealtime()
                lastError.remove(st.id)
                null
            } catch (e: PoolWire.Refused) {
                e.message
            } catch (e: Exception) {
                e.message ?: e.toString()
            }
            main.post { onDone(err) }
        }
    }

    fun myName(): String = app.settings.lendName

    /** For the on-device tests only: this phone may lend to itself, over its own loopback. */
    internal var allowSelf = false

    // ------------------------------------------------------------------ gates to the other phones

    private val links = ConcurrentHashMap<String, Link>()

    /** The engine's endpoint for [h]: this phone's gate to it, opened once and kept while the app runs. */
    fun endpointFor(h: HelperPhone): String {
        val link = links.getOrPut(h.id) { Link(h.id) }
        return "127.0.0.1:${link.port}"
    }

    /** Connections now open to [id] through its gate. */
    fun inUse(id: String): Int = links[id]?.active() ?: 0

    private inner class Link(val id: String) {
        private val server = ServerSocket(0, 8, PoolWire.LOOPBACK)
        val port: Int = server.localPort
        private val pipes = mutableSetOf<Pipe>()

        init {
            Thread({
                while (!server.isClosed) {
                    val local = try {
                        server.accept()
                    } catch (e: Exception) {
                        break
                    }
                    io.execute { through(local) }
                }
            }, "phones-gate").apply { isDaemon = true }.start()
        }

        private fun through(local: Socket) {
            local.tcpNoDelay = true
            val h = saved().firstOrNull { it.id == id }
            if (h == null) {
                runCatching { local.close() }
                return
            }
            val remote = try {
                PoolWire.open(h.host, h.port, h.code, app.settings.deviceId, myName(), PoolWire.DATA)
            } catch (e: Exception) {
                lastError[id] = e.message ?: e.toString()
                announce()
                // the engine reads this as the phone being unreachable, and says so
                runCatching { local.close() }
                return
            }
            lastError.remove(id)
            var self: Pipe? = null
            val p = Pipe(local, remote, "phones") { synchronized(pipes) { self?.let { pipes.remove(it) } } }
            synchronized(pipes) {
                self = p
                if (!p.isClosed) pipes += p
            }
        }

        fun active(): Int = synchronized(pipes) { pipes.size }

        /** Cuts every connection through this gate: the engine's next step fails at once. */
        fun cut() {
            synchronized(pipes) { pipes.toList().also { pipes.clear() } }.forEach { it.close() }
        }

        fun close() {
            runCatching { server.close() }
            cut()
        }
    }

    // ------------------------------------------------------------------ how much goes where

    /** What the paired phones that are on and answering could take of a model now. */
    fun lendable(): Long {
        if (app.settings.poolMode == PoolMode.OFF) return 0L
        val me = app.settings.deviceId
        return saved().filter { it.enabled && online(it.id) }.sumOf { h ->
            val st = statuses[h.id] ?: return@sumOf 0L
            if (st.error.isNotEmpty() || (st.busy && st.peerId.isNotEmpty() && st.peerId != me)) 0L
            else (((st.freeRam + (if (st.busy) st.usedRam else 0L)) - 300_000_000L) * 0.8).toLong().coerceAtLeast(0L)
        }
    }

    /**
     * The phones a model should be split with, and each one's share of its layers, from what they
     * said last. [need]: what the whole model needs; [localFree]: what this phone has for it.
     * Automatic: only when it does not fit here, with this phone keeping as much as fits. Always:
     * shared by everyone's free memory.
     */
    fun plan(need: Long, localFree: Long): List<RpcPart> {
        val mode = app.settings.poolMode
        if (mode == PoolMode.OFF || need <= 0) return emptyList()
        val me = app.settings.deviceId
        val helpers = saved().filter { it.enabled && online(it.id) }.mapNotNull { h ->
            val st = statuses[h.id] ?: return@mapNotNull null
            if (st.error.isNotEmpty()) return@mapNotNull null
            // lending to another phone: not free for this one (busy with this phone is fine: it is the model being replaced)
            if (st.busy && st.peerId.isNotEmpty() && st.peerId != me) return@mapNotNull null
            val budget = ((st.freeRam + (if (st.busy) st.usedRam else 0L) - 300_000_000L) * 0.8).toLong()
            if (budget < 200_000_000L) null else Triple(h, st, budget)
        }
        if (helpers.isEmpty()) return emptyList()
        val local = (localFree * 0.75).toLong().coerceAtLeast(0L)
        if (mode == PoolMode.AUTO && need <= local) return emptyList()
        val sum = helpers.sumOf { it.third }.toDouble()
        val remote = when {
            mode == PoolMode.ALWAYS -> sum / (sum + local)
            // what does not fit here, and a little more so neither side is at its edge
            need - local <= sum -> ((need - local).toDouble() / need + 0.05).coerceAtMost(sum / need)
            // more than all of them have: the shortfall spread evenly, instead of all of it landing here
            else -> sum / (sum + local)
        }.coerceIn(0.1, 0.9)
        return helpers.map { (h, _, b) -> RpcPart(h.id, endpointFor(h), (remote * b / sum).toFloat()) }
    }

    // ------------------------------------------------------------------ asking how they are

    /** Some paired phones are on and have not been asked lately, so a model about to load may not know them. */
    fun needsFreshLook(): Boolean {
        if (app.settings.poolMode == PoolMode.OFF) return false
        val stale = SystemClock.elapsedRealtime() - 10_000
        return saved().any { it.enabled && (seenAt[it.id] ?: 0L) < stale }
    }

    /** Asks the paired phones that are on how they are (a few seconds at most), then runs [then] on the main thread. */
    fun lookThen(then: () -> Unit) {
        io.execute {
            val fs = saved().filter { it.enabled }.map { h -> io.submit { askOne(h, false) } }
            fs.forEach { runCatching { it.get(4, TimeUnit.SECONDS) } }
            announce()
            main.post(then)
        }
    }

    @Volatile private var polling = false
    /** The parts of the model loaded now that are on other phones. */
    @Volatile var partsInUse: () -> List<RpcPart> = { emptyList() }
    /** Called on the main thread when a phone holding part of the loaded model is gone. */
    var onLost: ((String) -> Unit)? = null

    /** Starts asking the paired phones how they are, every few seconds, while it is useful. */
    fun startPolling() {
        if (polling) return
        polling = true
        Thread({
            while (polling) {
                val inUse = partsInUse().map { it.helperId }.toSet()
                holdWifi(inUse.isNotEmpty())
                val ask = saved().filter { it.id in inUse || watching || (app.inFront && it.enabled) }
                if (ask.isEmpty() && found.isEmpty()) {
                    sleep(3000)
                    continue
                }
                val futures = ask.map { h -> io.submit { askOne(h, h.id in inUse) } }
                futures.forEach { runCatching { it.get(5, TimeUnit.SECONDS) } }
                announce()
                sleep(3000)
            }
        }, "phones-poll").apply { isDaemon = true }.start()
    }

    private val wifiLocks = mutableListOf<android.net.wifi.WifiManager.WifiLock>()

    /**
     * While a model is split, this phone's Wi-Fi stays awake too: power saving can add tens of
     * milliseconds to each of the round trips every word makes.
     */
    private fun holdWifi(on: Boolean) {
        if (on == wifiLocks.isNotEmpty()) return
        if (!on) {
            wifiLocks.forEach { runCatching { if (it.isHeld) it.release() } }
            wifiLocks.clear()
            return
        }
        val wm = app.applicationContext.getSystemService(Context.WIFI_SERVICE) as? android.net.wifi.WifiManager ?: return
        @Suppress("DEPRECATION")
        val modes = if (android.os.Build.VERSION.SDK_INT >= 29) {
            listOf(android.net.wifi.WifiManager.WIFI_MODE_FULL_LOW_LATENCY, android.net.wifi.WifiManager.WIFI_MODE_FULL_HIGH_PERF)
        } else {
            listOf(android.net.wifi.WifiManager.WIFI_MODE_FULL_HIGH_PERF)
        }
        for (m in modes) {
            runCatching { wm.createWifiLock(m, "OfflineAI:split-$m").apply { setReferenceCounted(false); acquire() } }.getOrNull()?.let { wifiLocks += it }
        }
    }

    private fun sleep(ms: Long) = try {
        Thread.sleep(ms)
    } catch (e: InterruptedException) {
    }

    private fun askOne(h: HelperPhone, inUse: Boolean) {
        val st = PoolWire.status(h.host, h.port, if (inUse) app.settings.deviceId else "")
        if (st != null && st.id == h.id) {
            statuses[h.id] = st
            seenAt[h.id] = SystemClock.elapsedRealtime()
            misses[h.id] = 0
            if (st.name.isNotBlank() && st.name != h.name) {
                synchronized(this) { store(saved().map { if (it.id == h.id) it.copy(name = st.name) else it }) }
            }
            // It no longer holds this phone's part (it was restarted, or let go after a long silence).
            // [inUse] means the loaded model has a part there, so there is no setting-up window
            // (that happens while the model loads, when nothing counts as in use); twice in a row
            // all the same. Whether a connection is still open here says nothing: when the other
            // side goes, its end closes them.
            val gone = inUse && (!st.busy || (st.peerId.isNotEmpty() && st.peerId != app.settings.deviceId))
            val n = if (gone) (strays[h.id] ?: 0) + 1 else 0
            strays[h.id] = n
            if (n >= 2) lost(h)
        } else {
            val n = (misses[h.id] ?: 0) + 1
            misses[h.id] = n
            if (inUse && n >= 3) lost(h)
        }
    }

    /** When each phone was last reported lost, so a phone that stays gone is reported once while the model reloads. */
    private val lostAt = ConcurrentHashMap<String, Long>()

    private fun lost(h: HelperPhone) {
        // whatever is still open to it is cut, so a step waiting on it fails at once
        links[h.id]?.cut()
        seenAt.remove(h.id)
        misses[h.id] = 0
        strays[h.id] = 0
        val now = SystemClock.elapsedRealtime()
        val last = lostAt[h.id] ?: 0L
        if (last != 0L && now - last < 20_000) return
        lostAt[h.id] = now
        main.post { onLost?.invoke(h.name) }
    }

    // ------------------------------------------------------------------ finding them on the Wi-Fi

    private var discovery: NsdManager.DiscoveryListener? = null
    private val resolving = java.util.concurrent.atomic.AtomicBoolean(false)
    private val toResolve = java.util.concurrent.ConcurrentLinkedQueue<NsdServiceInfo>()

    /** Looks for lending phones on the Wi-Fi (mDNS) until [stopDiscovery]. */
    fun startDiscovery() {
        if (discovery != null) return
        val nm = app.getSystemService(Context.NSD_SERVICE) as? NsdManager ?: return
        val l = object : NsdManager.DiscoveryListener {
            override fun onDiscoveryStarted(serviceType: String) {}
            override fun onDiscoveryStopped(serviceType: String) {}
            override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) {
                discovery = null
            }
            override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) {}
            override fun onServiceFound(info: NsdServiceInfo) {
                toResolve.add(info)
                resolveNext(nm)
            }
            override fun onServiceLost(info: NsdServiceInfo) {
                found.values.removeAll { it.name == info.serviceName }
                announce()
            }
        }
        discovery = l
        runCatching { nm.discoverServices(PoolWire.SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, l) }.onFailure { discovery = null }
    }

    fun stopDiscovery() {
        val l = discovery ?: return
        discovery = null
        runCatching { (app.getSystemService(Context.NSD_SERVICE) as NsdManager).stopServiceDiscovery(l) }
    }

    @Suppress("DEPRECATION")
    private fun resolveNext(nm: NsdManager) {
        if (!resolving.compareAndSet(false, true)) return
        val info = toResolve.poll()
        if (info == null) {
            resolving.set(false)
            return
        }
        runCatching {
            nm.resolveService(info, object : NsdManager.ResolveListener {
                override fun onResolveFailed(si: NsdServiceInfo, errorCode: Int) {
                    resolving.set(false)
                    resolveNext(nm)
                }

                override fun onServiceResolved(si: NsdServiceInfo) {
                    val host = si.host?.hostAddress
                    val id = si.attributes["id"]?.toString(Charsets.UTF_8).orEmpty()
                    if (host != null && id.isNotEmpty()) {
                        found[id] = NearbyPhone(id, si.serviceName, host, si.port)
                        // a paired phone whose address changed (a new lease from the router)
                        val h = saved().firstOrNull { it.id == id }
                        if (h != null && (h.host != host || h.port != si.port)) {
                            synchronized(this@Phones) { store(saved().map { if (it.id == id) it.copy(host = host, port = si.port) else it }) }
                        }
                        announce()
                    }
                    resolving.set(false)
                    resolveNext(nm)
                }
            })
        }.onFailure {
            resolving.set(false)
        }
    }
}

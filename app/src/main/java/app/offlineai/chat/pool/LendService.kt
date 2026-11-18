package app.offlineai.chat.pool

import android.app.ActivityManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.net.wifi.WifiManager
import android.os.Build
import android.os.Debug
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.SystemClock
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import app.offlineai.chat.R
import app.offlineai.chat.data.Device
import app.offlineai.chat.data.Disguise
import app.offlineai.chat.data.Settings
import app.offlineai.chat.engine.NativeEngine
import app.offlineai.chat.ui.PhonesActivity
import app.offlineai.chat.ui.PongActivity
import java.io.DataInputStream
import java.io.File
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.ServerSocket
import java.net.Socket
import java.security.SecureRandom
import java.util.concurrent.atomic.AtomicInteger

/**
 * Lend this phone: another phone on the same Wi-Fi keeps part of its model here and this phone
 * computes those layers for it (llama.cpp's RPC server). Runs in a process of its own (":lend"),
 * so its memory is not the chat's, and stopping it is ending that process, which lets go of
 * everything the other phone had here at once.
 *
 * The RPC server listens on this phone's loopback only. What faces the Wi-Fi is the gate here:
 * it answers status questions, checks the pairing code (see [PoolWire]) and only then connects
 * the other phone through to the RPC server. One phone at a time.
 */
class LendService : Service() {
    private val main = Handler(Looper.getMainLooper())
    private var wakeLock: PowerManager.WakeLock? = null
    private val wifiLocks = mutableListOf<WifiManager.WifiLock>()
    private var gate: ServerSocket? = null
    private var nsd: NsdManager.RegistrationListener? = null
    private var started = false

    private var code = ""
    private var name = ""
    private var id = ""
    private var rpcPort = 0
    @Volatile private var serverError = ""

    /** Connections through to the RPC server now (the other phone's engine opens one at a time, briefly two). */
    private val sessions = AtomicInteger(0)
    @Volatile private var peerId = ""
    @Volatile private var peerName = ""
    @Volatile private var lastTraffic = 0L
    private val open = mutableSetOf<Pipe>()
    private var wrongCodes = 0
    private var lockedUntil = 0L
    @Volatile private var cacheBytes = 0L
    private var cacheMeasured = 0L

    private val lendCache: File get() = File(filesDir, "lend-cache").apply { mkdirs() }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopLending()
            return START_NOT_STICKY
        }
        if (intent?.action == ACTION_CLEAR_CACHE) {
            if (sessions.get() == 0) lendCache.listFiles()?.forEach { it.delete() }
            cacheMeasured = 0
            if (!started) stopSelf(startId)
            return START_NOT_STICKY
        }
        // a foreground service shows its notification first, whatever happens next
        try {
            val type = if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0
            ServiceCompat.startForeground(this, NOTIFICATION_ID, notification(), type)
        } catch (e: Exception) {
            stopSelf()
            return START_NOT_STICKY
        }
        val s = Settings(this)
        code = intent?.getStringExtra(EXTRA_CODE) ?: s.lendCode
        name = intent?.getStringExtra(EXTRA_NAME) ?: s.lendName
        // the id the app's main process uses: the two processes do not share settings reliably
        id = intent?.getStringExtra(EXTRA_ID) ?: s.deviceId
        if (!started) {
            started = true
            begin()
        }
        notifyNow()
        return START_STICKY
    }

    private fun begin() {
        runCatching { NativeEngine.init(applicationInfo.nativeLibraryDir) }.onFailure { serverError = "The engine could not start: ${it.message}" }
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "OfflineAI:lending").apply {
            setReferenceCounted(false)
            acquire(8 * 60 * 60 * 1000L)
        }
        // Wi-Fi power saving adds tens of milliseconds to every round trip, and there are a few
        // per word: keep the Wi-Fi awake while lending
        val wm = applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
        @Suppress("DEPRECATION")
        val modes = if (Build.VERSION.SDK_INT >= 29) listOf(WifiManager.WIFI_MODE_FULL_LOW_LATENCY, WifiManager.WIFI_MODE_FULL_HIGH_PERF)
        else listOf(WifiManager.WIFI_MODE_FULL_HIGH_PERF)
        for (m in modes) runCatching { wm.createWifiLock(m, "OfflineAI:lending-$m").apply { setReferenceCounted(false); acquire() } }.getOrNull()?.let { wifiLocks += it }

        // the RPC server, on the loopback only
        rpcPort = ServerSocket(0, 1, InetAddress.getLoopbackAddress()).use { it.localPort }
        if (serverError.isEmpty()) {
            val threads = Device.fastCores().coerceAtLeast(2)
            Thread({
                val why = runCatching {
                    NativeEngine.nativeServe("127.0.0.1:$rpcPort".toByteArray(), lendCache.absolutePath.toByteArray(), threads).toString(Charsets.UTF_8)
                }.getOrElse { it.message ?: it.toString() }
                serverError = why
                main.post { notifyNow() }
            }, "lend-rpc").start()
        }

        // the gate on the Wi-Fi
        val g = runCatching { ServerSocket().apply { reuseAddress = true; bind(InetSocketAddress(PoolWire.PORT)) } }
            .recoverCatching { ServerSocket(0) }.getOrNull()
        gate = g
        if (g == null) {
            serverError = "No network port could be opened for lending."
            return
        }
        runCatching { File(filesDir, PORT_FILE).writeText(g.localPort.toString()) }
        Thread({ acceptLoop(g) }, "lend-gate").start()
        register(g.localPort)
        Thread({ watchdog() }, "lend-watch").apply { isDaemon = true }.start()
    }

    private fun acceptLoop(g: ServerSocket) {
        while (!g.isClosed) {
            val s = try {
                g.accept()
            } catch (e: Exception) {
                break
            }
            Thread({ handle(s) }, "lend-conn").start()
        }
    }

    private fun handle(s: Socket) {
        try {
            s.tcpNoDelay = true
            s.soTimeout = 10_000
            val input = s.getInputStream()
            val out = s.getOutputStream()
            when (val kind = PoolWire.readKind(input)) {
                PoolWire.STATUS -> {
                    // who asks: the phone using this one asks every few seconds, which says it is still there
                    val asker = runCatching { PoolWire.readShort(input) }.getOrDefault("")
                    if (asker.isNotEmpty() && asker == peerId) lastTraffic = SystemClock.elapsedRealtime()
                    out.write((status().toJson().toString() + "\n").toByteArray(Charsets.UTF_8))
                    out.flush()
                    s.close()
                }
                PoolWire.VERIFY, PoolWire.DATA -> gateCheck(s, input, out, kind)
                else -> s.close()
            }
        } catch (e: Exception) {
            runCatching { s.close() }
        }
    }

    private fun gateCheck(s: Socket, input: java.io.InputStream, out: java.io.OutputStream, kind: Int) {
        s.soTimeout = 10_000
        val theirId = PoolWire.readShort(input)
        val theirName = PoolWire.readShort(input)
        val now = SystemClock.elapsedRealtime()
        synchronized(this) {
            when {
                now < lockedUntil -> {
                    out.write(PoolWire.LOCKED); out.flush(); s.close(); return
                }
                kind == PoolWire.DATA && sessions.get() > 0 && theirId != peerId -> {
                    out.write(PoolWire.BUSY); out.flush(); s.close(); return
                }
            }
        }
        val nonce = ByteArray(16).also { SecureRandom().nextBytes(it) }
        out.write(PoolWire.CHALLENGE)
        out.write(nonce)
        out.flush()
        val answer = ByteArray(32)
        DataInputStream(input).readFully(answer)
        val ok = code.isNotEmpty() && PoolWire.same(answer, PoolWire.hmac(code, nonce))
        synchronized(this) {
            if (!ok) {
                wrongCodes++
                if (wrongCodes >= 5) {
                    wrongCodes = 0
                    lockedUntil = SystemClock.elapsedRealtime() + 60_000
                }
            } else {
                wrongCodes = 0
            }
        }
        out.write(if (ok) PoolWire.YES else PoolWire.NO)
        out.flush()
        if (!ok || kind == PoolWire.VERIFY) {
            s.close()
            return
        }
        // through to the RPC server
        val rpc = Socket().apply {
            tcpNoDelay = true
            connect(InetSocketAddress(InetAddress.getLoopbackAddress(), rpcPort), 5000)
        }
        s.soTimeout = 0
        synchronized(this) {
            if (sessions.incrementAndGet() == 1) {
                peerId = theirId
                peerName = theirName
            }
            lastTraffic = SystemClock.elapsedRealtime()
        }
        main.post { notifyNow() }
        var self: Pipe? = null
        val pipe = Pipe(s, rpc, "lend") {
            synchronized(this) {
                if (sessions.decrementAndGet() <= 0) {
                    sessions.set(0)
                    peerId = ""
                    peerName = ""
                }
            }
            synchronized(open) { self?.let { open.remove(it) } }
            main.post { notifyNow() }
        }
        synchronized(open) {
            self = pipe
            if (!pipe.isClosed) open += pipe
        }
    }

    /**
     * A phone that vanished without closing its connections (battery out, out of range) would keep
     * this one busy, and its part of the model in memory, for good: with no word from it for a
     * while, its connections are closed and the RPC server lets go of what it held.
     */
    private fun watchdog() {
        while (started) {
            try {
                Thread.sleep(5000)
            } catch (e: InterruptedException) {
                return
            }
            val idle = SystemClock.elapsedRealtime() - lastTraffic
            if (sessions.get() > 0 && idle > STALE_MS) {
                val all = synchronized(open) { open.toList().also { open.clear() } }
                all.forEach { it.close() }
            }
            // running this phone flat for another one helps no one: below 15% and not charging, stop
            val (level, charging) = battery()
            if (level in 0 until LOW_BATTERY && !charging) {
                main.post {
                    lowBattery()
                    stopLending()
                }
                return
            }
        }
    }

    private fun status(): LendStatus {
        val am = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val mi = ActivityManager.MemoryInfo().also { am.getMemoryInfo(it) }
        val now = SystemClock.elapsedRealtime()
        if (now - cacheMeasured > 30_000) {
            cacheMeasured = now
            cacheBytes = lendCache.listFiles()?.sumOf { it.length() } ?: 0L
        }
        return LendStatus(
            id = id, name = name, freeRam = mi.availMem, totalRam = mi.totalMem, cores = Device.fastCores(),
            busy = sessions.get() > 0, peer = peerName, peerId = peerId,
            usedRam = if (sessions.get() > 0) Debug.getPss() * 1024L else 0L,
            cacheBytes = cacheBytes, version = PoolWire.VERSION, error = serverError,
            battery = battery().first, charging = battery().second,
        )
    }

    /** Battery percent and whether it charges. */
    private fun battery(): Pair<Int, Boolean> {
        val i = registerReceiver(null, android.content.IntentFilter(Intent.ACTION_BATTERY_CHANGED)) ?: return -1 to false
        val level = i.getIntExtra(android.os.BatteryManager.EXTRA_LEVEL, -1)
        val scale = i.getIntExtra(android.os.BatteryManager.EXTRA_SCALE, 100).coerceAtLeast(1)
        val plugged = i.getIntExtra(android.os.BatteryManager.EXTRA_PLUGGED, 0) != 0
        return (if (level < 0) -1 else level * 100 / scale) to plugged
    }

    private fun register(port: Int) {
        val nm = getSystemService(Context.NSD_SERVICE) as? NsdManager ?: return
        val info = NsdServiceInfo().apply {
            serviceName = name.ifBlank { Build.MODEL }
            serviceType = PoolWire.SERVICE_TYPE
            setPort(port)
            setAttribute("id", id)
            setAttribute("v", PoolWire.VERSION.toString())
        }
        val l = object : NsdManager.RegistrationListener {
            override fun onServiceRegistered(si: NsdServiceInfo) {}
            override fun onRegistrationFailed(si: NsdServiceInfo, errorCode: Int) {}
            override fun onServiceUnregistered(si: NsdServiceInfo) {}
            override fun onUnregistrationFailed(si: NsdServiceInfo, errorCode: Int) {}
        }
        runCatching {
            nm.registerService(info, NsdManager.PROTOCOL_DNS_SD, l)
            nsd = l
        }
    }

    private fun stopLending() {
        started = false
        nsd?.let { l -> runCatching { (getSystemService(Context.NSD_SERVICE) as NsdManager).unregisterService(l) } }
        nsd = null
        runCatching { gate?.close() }
        runCatching { File(filesDir, PORT_FILE).delete() }
        synchronized(open) { open.toList().also { open.clear() } }.forEach { it.close() }
        wifiLocks.forEach { runCatching { if (it.isHeld) it.release() } }
        wifiLocks.clear()
        wakeLock?.let { if (it.isHeld) it.release() }
        wakeLock = null
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        stopSelf()
        // the RPC server cannot be told to stop: ending this process (it is the lending one only)
        // stops it and gives back everything the other phone had here
        main.postDelayed({ android.os.Process.killProcess(android.os.Process.myPid()) }, 300)
    }

    /** Says lending stopped for a low battery (a notification of its own, since the service's goes). */
    private fun lowBattery() {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val hidden = Settings(this).disguised
        runCatching {
            nm.notify(NOTIFICATION_ID + 1, NotificationCompat.Builder(this, CHANNEL)
                .setSmallIcon(R.drawable.ic_spark)
                .setContentTitle(if (hidden) Disguise.GAME_NAME else "Lending stopped: battery low")
                .setContentText(if (hidden) "Game over" else "Below $LOW_BATTERY% and not charging. Plug it in and turn lending on again.")
                .setAutoCancel(true)
                .build())
        }
        // the setting goes off too, so the app does not start lending again by itself
        Settings(this).lending = false
    }

    override fun onDestroy() {
        if (started) stopLending()
        super.onDestroy()
    }

    private fun notifyNow() {
        if (!started) return
        runCatching { (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).notify(NOTIFICATION_ID, notification()) }
    }

    private fun notification(): Notification {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (nm.getNotificationChannel(CHANNEL) == null) {
            nm.createNotificationChannel(NotificationChannel(CHANNEL, "Lending this phone", NotificationManager.IMPORTANCE_LOW).apply {
                description = "Shown while another phone can use this phone's memory and processor."
                setShowBadge(false)
            })
        }
        val hidden = Settings(this).disguised
        val open = PendingIntent.getActivity(
            this, 60, Intent(this, if (hidden) PongActivity::class.java else PhonesActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val stop = PendingIntent.getService(
            this, 61, Intent(this, LendService::class.java).setAction(ACTION_STOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val title = when {
            serverError.isNotEmpty() -> "Lending stopped working"
            sessions.get() > 0 -> "Lending to ${peerName.ifBlank { "a phone" }}"
            else -> "Ready to lend this phone"
        }
        val text = when {
            serverError.isNotEmpty() -> serverError
            sessions.get() > 0 -> "Part of a model runs here for it. Keep both phones on the same Wi-Fi."
            else -> "Code ${spaced(code)} · open Phones on the other phone"
        }
        return NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_spark)
            .setContentTitle(if (hidden) Disguise.GAME_NAME else title)
            .setContentText(if (hidden) "Running" else text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(if (hidden) "Running" else text))
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(open)
            .addAction(0, "Stop", stop)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build()
    }

    companion object {
        private const val CHANNEL = "lending"
        private const val NOTIFICATION_ID = 51
        const val ACTION_STOP = "app.offlineai.chat.action.STOP_LENDING"
        const val ACTION_CLEAR_CACHE = "app.offlineai.chat.action.CLEAR_LEND_CACHE"
        const val EXTRA_CODE = "code"
        const val EXTRA_NAME = "name"
        const val EXTRA_ID = "id"
        /** Where the lending process writes the port its gate listens on, for this phone's own screens. */
        const val PORT_FILE = "lend_port"
        /** No word from the phone using this one for this long: it is gone. */
        const val STALE_MS = 90_000L
        /** Battery percent below which lending stops by itself (unless charging). */
        const val LOW_BATTERY = 15

        fun spaced(code: String) = if (code.length == 6) code.substring(0, 3) + " " + code.substring(3) else code

        fun start(context: Context, code: String, name: String) {
            ContextCompat.startForegroundService(context, Intent(context, LendService::class.java)
                .putExtra(EXTRA_CODE, code).putExtra(EXTRA_NAME, name).putExtra(EXTRA_ID, Settings(context).deviceId))
        }

        fun stop(context: Context) {
            runCatching { context.startService(Intent(context, LendService::class.java).setAction(ACTION_STOP)) }
        }

        /** The port this phone's own gate listens on while it lends, or 0. */
        fun localPort(context: Context): Int = runCatching { File(context.filesDir, PORT_FILE).readText().trim().toInt() }.getOrDefault(0)

        fun newCode(): String = (SecureRandom().nextInt(900_000) + 100_000).toString()
    }
}

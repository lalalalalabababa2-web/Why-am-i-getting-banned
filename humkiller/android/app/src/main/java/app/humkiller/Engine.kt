package app.humkiller

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Handler
import android.os.Looper
import kotlin.concurrent.thread

class AudioDev(val id: Int, val label: String, val type: Int)

/**
 * App state that outlives the activity (rotation, the screen going off): what's selected, what's
 * playing, and the latest readings from the engine. Every setter forwards straight to Native.
 */
object Engine {
    const val H = 4

    class Tone(var enabled: Boolean, var levelDb: Float, var phaseDeg: Float)

    class Status {
        var mode = Native.MODE_LOCK
        var armed = false
        var inputActive = false
        var freq = 60.0
        var locked = false
        var ancState = Native.ANC_IDLE
        var ancError = 0
        var findState = 0
        var rmsDb = -180.0
    }

    class ToneStatus {
        var micDb = -180f
        var snrDb = 0f
        var reductionDb = 0f
        var outDb = -180f
        var outPhase = 0f
        var ancActive = false
    }

    var mode = Native.MODE_LOCK; private set
    var armed = false; private set
    var fundamental = 60.0; private set
    val tones = Array(H) { Tone(it == 0, -50f, 0f) }
    var master = 1f; private set

    var outputs: List<AudioDev> = emptyList(); private set
    var inputs: List<AudioDev> = emptyList(); private set
    var outId = 0; private set
    var inId = 0; private set
    var micGranted = false
    var openResult = CLOSED; private set
    val isOpen get() = openResult >= 0

    val status = Status()
    val toneStatus = Array(H) { ToneStatus() }
    var finding = false; private set
    var findMessage: String? = null; private set

    private var started = false
    private lateinit var prefs: SharedPreferences
    private lateinit var am: AudioManager
    private val main = Handler(Looper.getMainLooper())
    private val sBuf = DoubleArray(10)
    private val hBuf = FloatArray(H * 6)
    private var silentSince = 0L
    var micSilent = false; private set

    const val CLOSED = -100

    private val OUT_TYPES = setOf(
        AudioDeviceInfo.TYPE_BUILTIN_SPEAKER, AudioDeviceInfo.TYPE_WIRED_HEADSET, AudioDeviceInfo.TYPE_WIRED_HEADPHONES,
        AudioDeviceInfo.TYPE_USB_HEADSET, AudioDeviceInfo.TYPE_USB_DEVICE, AudioDeviceInfo.TYPE_USB_ACCESSORY,
        AudioDeviceInfo.TYPE_BLUETOOTH_A2DP, AudioDeviceInfo.TYPE_BLE_HEADSET, AudioDeviceInfo.TYPE_BLE_SPEAKER,
        AudioDeviceInfo.TYPE_HEARING_AID,
    )
    private val IN_TYPES = setOf(
        AudioDeviceInfo.TYPE_BUILTIN_MIC, AudioDeviceInfo.TYPE_WIRED_HEADSET, AudioDeviceInfo.TYPE_USB_HEADSET,
        AudioDeviceInfo.TYPE_USB_DEVICE, AudioDeviceInfo.TYPE_USB_ACCESSORY, AudioDeviceInfo.TYPE_BLUETOOTH_SCO,
        AudioDeviceInfo.TYPE_BLE_HEADSET,
    )
    private val WIRED_OUT = setOf(
        AudioDeviceInfo.TYPE_WIRED_HEADSET, AudioDeviceInfo.TYPE_WIRED_HEADPHONES, AudioDeviceInfo.TYPE_USB_HEADSET,
        AudioDeviceInfo.TYPE_USB_DEVICE, AudioDeviceInfo.TYPE_USB_ACCESSORY,
    )

    fun isBluetooth(type: Int) = type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP || type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO ||
        type == AudioDeviceInfo.TYPE_BLE_HEADSET || type == AudioDeviceInfo.TYPE_BLE_SPEAKER ||
        type == AudioDeviceInfo.TYPE_HEARING_AID

    fun start(ctx: Context) {
        if (started) return
        started = true
        val app = ctx.applicationContext
        prefs = app.getSharedPreferences("humkiller", Context.MODE_PRIVATE)
        am = app.getSystemService(AudioManager::class.java)
        Native.init()
        load()
        Native.setMode(mode)
        Native.setFundamental(fundamental)
        Native.setMaster(master)
        pushTones()
        refreshDevices()
    }

    // ---- devices

    private fun describe(d: AudioDeviceInfo, all: List<AudioDeviceInfo>): String {
        val name = d.productName?.toString().orEmpty()
        return when (d.type) {
            AudioDeviceInfo.TYPE_BUILTIN_SPEAKER -> "Phone speaker"
            AudioDeviceInfo.TYPE_BUILTIN_MIC -> {
                val many = all.count { it.type == AudioDeviceInfo.TYPE_BUILTIN_MIC } > 1
                if (many && d.address.isNotEmpty()) "Phone mic (${d.address})" else "Phone mic"
            }
            AudioDeviceInfo.TYPE_WIRED_HEADSET, AudioDeviceInfo.TYPE_WIRED_HEADPHONES -> "Wired headphones"
            AudioDeviceInfo.TYPE_USB_HEADSET, AudioDeviceInfo.TYPE_USB_DEVICE, AudioDeviceInfo.TYPE_USB_ACCESSORY ->
                "USB-C: " + name.ifEmpty { "adapter" }
            AudioDeviceInfo.TYPE_BLUETOOTH_SCO -> "Bluetooth call mic: $name"
            AudioDeviceInfo.TYPE_BLUETOOTH_A2DP -> "Bluetooth: $name"
            AudioDeviceInfo.TYPE_BLE_HEADSET, AudioDeviceInfo.TYPE_BLE_SPEAKER -> "Bluetooth LE: $name"
            AudioDeviceInfo.TYPE_HEARING_AID -> "Hearing aid: $name"
            else -> name
        }
    }

    /** Re-reads the device lists. Returns true if a selection had to change. */
    fun refreshDevices(): Boolean {
        val outs = am.getDevices(AudioManager.GET_DEVICES_OUTPUTS).filter { it.type in OUT_TYPES }
        val ins = am.getDevices(AudioManager.GET_DEVICES_INPUTS).filter { it.type in IN_TYPES }
        outputs = listOf(AudioDev(0, "Automatic", 0)) + outs.map { AudioDev(it.id, describe(it, outs), it.type) }
        inputs = ins.map { AudioDev(it.id, describe(it, ins), it.type) }.ifEmpty { listOf(AudioDev(0, "Automatic", 0)) }

        var changed = false
        if (outputs.none { it.id == outId }) {
            // Headphones on a USB-C adapter (or the jack) if they're there, else let Android route.
            outId = outputs.firstOrNull { it.type in WIRED_OUT }?.id ?: 0
            changed = true
        }
        if (inputs.none { it.id == inId }) {
            // The phone's own mic by default: Lock wants to hear the room, not a headset mic.
            inId = (inputs.firstOrNull { it.type == AudioDeviceInfo.TYPE_BUILTIN_MIC } ?: inputs.first()).id
            changed = true
        }
        return changed
    }

    /** Something was plugged in or out. */
    fun devicesChanged() {
        if (refreshDevices() && isOpen) open()
    }

    fun output() = outputs.firstOrNull { it.id == outId }
    fun input() = inputs.firstOrNull { it.id == inId }

    fun selectOutput(id: Int) {
        if (id == outId) return
        outId = id
        if (isOpen) open()
    }

    fun selectInput(id: Int) {
        if (id == inId) return
        inId = id
        if (isOpen) open()
    }

    fun open() {
        openResult = Native.open(outId, inId, micGranted)
    }

    fun close() {
        Native.close()
        openResult = CLOSED
    }

    // ---- settings

    fun setMode(m: Int) {
        if (m == mode) return
        mode = m
        Native.setMode(m)
        save()
    }

    fun setArmed(ctx: Context, a: Boolean) {
        if (a == armed) return
        armed = a
        Native.setArmed(a)
        val svc = Intent(ctx, HumService::class.java)
        // The foreground service is what lets the mic keep listening with the screen off.
        if (a) ctx.startForegroundService(svc) else ctx.stopService(svc)
    }

    fun setFundamental(hz: Double) {
        val f = (hz.coerceIn(20.0, 2000.0) * 1000).let { Math.round(it) / 1000.0 }
        if (f == fundamental) return
        fundamental = f
        Native.setFundamental(f)
        save()
    }

    fun nudge(d: Double) = setFundamental(fundamental + d)

    fun setTone(k: Int, enabled: Boolean = tones[k].enabled, levelDb: Float = tones[k].levelDb, phaseDeg: Float = tones[k].phaseDeg) {
        var p = phaseDeg
        while (p > 180f) p -= 360f
        while (p < -180f) p += 360f
        tones[k].enabled = enabled
        tones[k].levelDb = levelDb.coerceIn(-80f, -20f)
        tones[k].phaseDeg = p
        Native.setHarmonic(k, enabled, tones[k].levelDb, p)
        save()
    }

    fun setMaster(g: Float) {
        master = g.coerceIn(0f, 1f)
        Native.setMaster(master)
        save()
    }

    fun ancRestart() = Native.ancRestart()

    private fun pushTones() = tones.forEachIndexed { k, t -> Native.setHarmonic(k, t.enabled, t.levelDb, t.phaseDeg) }

    // ---- hum finder

    fun findHum() {
        if (!status.inputActive) {
            findMessage = "Needs the mic."
            return
        }
        finding = true
        findMessage = "Listening for about a second…"
        Native.findStart()
    }

    private fun computeFind() = thread(name = "hum-finder") {
        val r = DoubleArray(2 + H)
        Native.findCompute(r)
        main.post { applyFind(r) }
    }

    private fun applyFind(r: DoubleArray) {
        if (r[0] == 0.0) {
            findMessage = "No steady hum found. Get the phone closer to it, or type the frequency in."
            return
        }
        val f0 = r[1]
        setFundamental(f0)
        val on = (0 until H).map { r[2 + it] >= 10.0 }.toMutableList()
        if (on.none { it }) on[0] = true
        for (k in 0 until H) setTone(k, enabled = on[k])
        val list = (0 until H).filter { r[2 + it] >= 10.0 }.joinToString(", ") { "%.0f Hz".format(f0 * (it + 1)) }
        findMessage = "Found %.3f Hz. Tones on: %s".format(f0, list)
    }

    // ---- polling (the activity calls this ~15 times a second)

    fun poll() {
        if (Native.needsReopen() && isOpen) {
            refreshDevices()
            open()
        }
        Native.status(sBuf)
        status.mode = sBuf[0].toInt()
        status.armed = sBuf[1] != 0.0
        status.inputActive = sBuf[2] != 0.0
        status.freq = sBuf[3]
        status.locked = sBuf[4] != 0.0
        status.ancState = sBuf[5].toInt()
        status.ancError = sBuf[6].toInt()
        status.findState = sBuf[7].toInt()
        status.rmsDb = sBuf[8]
        Native.harmonics(hBuf)
        for (k in 0 until H) {
            val t = toneStatus[k]
            val o = k * 6
            t.micDb = hBuf[o]
            t.snrDb = hBuf[o + 1]
            t.reductionDb = hBuf[o + 2]
            t.outDb = hBuf[o + 3]
            t.outPhase = hBuf[o + 4]
            t.ancActive = hBuf[o + 5] != 0f
        }
        if (finding && status.findState == Native.FIND_READY) {
            finding = false
            computeFind()
        }
        val now = System.currentTimeMillis()
        if (status.inputActive && status.rmsDb < -150) {
            if (silentSince == 0L) silentSince = now
            micSilent = now - silentSince > 2000
        } else {
            silentSince = 0L
            micSilent = false
        }
    }

    // ---- saved between launches (not the phase: that only means something within one session)

    private fun load() {
        mode = prefs.getInt("mode", Native.MODE_LOCK)
        fundamental = Math.round(prefs.getFloat("f0", 60f) * 1000.0) / 1000.0
        master = prefs.getFloat("master", 1f)
        for (k in 0 until H) {
            tones[k].enabled = prefs.getBoolean("en$k", k == 0)
            tones[k].levelDb = prefs.getFloat("lvl$k", -50f)
        }
    }

    private fun save() {
        val e = prefs.edit()
        e.putInt("mode", mode).putFloat("f0", fundamental.toFloat()).putFloat("master", master)
        for (k in 0 until H) e.putBoolean("en$k", tones[k].enabled).putFloat("lvl$k", tones[k].levelDb)
        e.apply()
    }
}

package com.umt.toolkit.perf

import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.display.DisplayManager
import android.os.BatteryManager
import android.os.Build
import android.os.Debug
import android.os.PowerManager
import android.os.Process
import android.os.SystemClock
import android.view.Display
import com.umt.toolkit.core.AtomicJsonStore
import com.umt.toolkit.core.UmtJson
import com.umt.toolkit.core.UmtLog
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import java.io.File
import java.util.UUID

@Serializable
data class PerfSession(
    val id: String,
    val name: String,
    val startedAt: Long,
    val endedAt: Long,
    val intervalMs: Int,
    val summary: SessionSummary,
    val samples: List<TelemetrySample>,
)

@Serializable
data class SessionIndexEntry(val id: String, val name: String, val startedAt: Long, val endedAt: Long, val summary: SessionSummary)

data class DeviceStatic(
    val manufacturer: String,
    val model: String,
    val soc: String?,
    val android: String,
    val sdk: Int,
    val abis: List<String>,
    val cores: Int,
    val maxFreqMhz: List<Int>,
    val totalRamMb: Float,
    val glEs: String,
    val refreshRates: List<Float>,
    val modes: List<String>,
)

/**
 * Samples real telemetry while something holds it (a screen, the HUD, a recording).
 * Everything here comes from public APIs; anything Android withholds is reported as such.
 */
class PerformanceMonitorEngine(
    private val context: Context,
    private val log: UmtLog,
    private val scope: CoroutineScope,
) {
    private val am = context.getSystemService(ActivityManager::class.java)
    private val pm = context.getSystemService(PowerManager::class.java)
    private val bm = context.getSystemService(BatteryManager::class.java)
    private val dm = context.getSystemService(DisplayManager::class.java)
    val frames = FrameMonitor()

    private val holders = HashSet<String>()
    private var job: Job? = null
    @Volatile var intervalMs: Int = 1000

    private val _latest = MutableStateFlow<TelemetrySample?>(null)
    val latest: StateFlow<TelemetrySample?> = _latest
    private val _history = MutableStateFlow<List<TelemetrySample>>(emptyList())
    val history: StateFlow<List<TelemetrySample>> = _history

    /** null until the first try; true when /proc/stat is blocked (Android 8+). */
    private val _globalCpuRestricted = MutableStateFlow<Boolean?>(null)
    val globalCpuRestricted: StateFlow<Boolean?> = _globalCpuRestricted

    private val _gpu = MutableStateFlow<GpuInfo?>(null)
    val gpu: StateFlow<GpuInfo?> = _gpu
    private var gpuProbed = false

    // recording
    private val sessionsDir = File(context.filesDir, "sessions").apply { mkdirs() }
    private val index = AtomicJsonStore(File(sessionsDir, "index.json"))
    private val _sessions = MutableStateFlow(index.read<List<SessionIndexEntry>> { emptyList() })
    val sessions: StateFlow<List<SessionIndexEntry>> = _sessions
    private val _recording = MutableStateFlow<Recording?>(null)
    val recording: StateFlow<Recording?> = _recording

    data class Recording(val name: String, val startedAt: Long, val samples: List<TelemetrySample>)

    private var lastCpuMs = 0L
    private var lastWallMs = 0L
    private var lastProcStat: Pair<Long, Long>? = null

    val static: DeviceStatic by lazy { readStatic() }

    @Synchronized
    fun acquire(owner: String) {
        holders += owner
        if (job?.isActive != true) {
            frames.start()
            lastCpuMs = Process.getElapsedCpuTime()
            lastWallMs = SystemClock.elapsedRealtime()
            job = scope.launch(Dispatchers.IO) {
                while (isActive) {
                    delay(intervalMs.toLong())
                    try {
                        val s = sample()
                        _latest.value = s
                        _history.value = (_history.value + s).takeLast(180)
                        _recording.value?.let { r -> _recording.value = r.copy(samples = r.samples + s) }
                    } catch (e: Exception) {
                        log.w("Perf", "Sample failed", e)
                    }
                }
            }
            log.d("Perf", "Monitor started")
        }
    }

    @Synchronized
    fun release(owner: String) {
        holders -= owner
        if (holders.isEmpty()) {
            job?.cancel()
            job = null
            frames.stop()
            log.d("Perf", "Monitor stopped")
        }
    }

    fun probeGpuOnce() {
        if (gpuProbed) return
        gpuProbed = true
        scope.launch(Dispatchers.Default) {
            _gpu.value = try {
                GpuProbe.probe()
            } catch (t: Throwable) {
                log.w("Perf", "GPU probe failed", t)
                null
            }
        }
    }

    private fun sample(): TelemetrySample {
        val now = SystemClock.elapsedRealtime()
        val cpuMs = Process.getElapsedCpuTime()
        val cores = Runtime.getRuntime().availableProcessors()
        val cpuSelf = PerfMath.cpuPercent(cpuMs - lastCpuMs, now - lastWallMs, cores)
        val cpuCore = PerfMath.cpuPercent(cpuMs - lastCpuMs, now - lastWallMs, 1)
        lastCpuMs = cpuMs
        lastWallMs = now

        val refresh = display()?.refreshRate ?: 60f
        val intervals = frames.recent(1000f)
        val fs = PerfMath.frameStats(intervals, intervals.size, 1000f / refresh)

        val mi = ActivityManager.MemoryInfo().also { am.getMemoryInfo(it) }
        val rt = Runtime.getRuntime()

        val battery = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        val level = battery?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale = battery?.getIntExtra(BatteryManager.EXTRA_SCALE, 100) ?: 100
        val tempTenths = battery?.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, Int.MIN_VALUE) ?: Int.MIN_VALUE
        val voltage = battery?.getIntExtra(BatteryManager.EXTRA_VOLTAGE, -1) ?: -1
        val status = battery?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
        val currentUa = bm?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CURRENT_NOW) ?: Int.MIN_VALUE

        val thermal = if (Build.VERSION.SDK_INT >= 29) pm.currentThermalStatus else -1
        val headroom = if (Build.VERSION.SDK_INT >= 30) pm.getThermalHeadroom(10).takeIf { !it.isNaN() } else null

        return TelemetrySample(
            t = System.currentTimeMillis(),
            uiFps = fs.fps,
            frameP50 = fs.p50,
            frameP95 = fs.p95,
            frameMax = fs.max,
            jank = fs.jank,
            stutter = fs.stutter,
            cpuSelf = cpuSelf,
            cpuSelfCore = cpuCore,
            cpuGlobal = globalCpu(),
            memAvailMb = mi.availMem / 1048576f,
            memTotalMb = mi.totalMem / 1048576f,
            lowMemory = mi.lowMemory,
            pssMb = Debug.getPss() / 1024f,
            heapMb = (rt.totalMemory() - rt.freeMemory()) / 1048576f,
            batteryPct = if (level >= 0 && scale > 0) level * 100f / scale else -1f,
            batteryTempC = if (tempTenths != Int.MIN_VALUE) tempTenths / 10f else null,
            voltageMv = voltage.takeIf { it > 0 },
            currentMa = currentUa.takeIf { it != Int.MIN_VALUE && it != 0 }?.let { it / 1000f },
            charging = status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL,
            thermalStatus = thermal,
            thermalHeadroom = headroom,
            refreshHz = refresh,
            threads = File("/proc/self/task").list()?.size ?: Thread.activeCount(),
        )
    }

    private fun globalCpu(): Float? {
        if (_globalCpuRestricted.value == true) return null
        return try {
            val line = File("/proc/stat").bufferedReader().use { it.readLine() } ?: throw IllegalStateException("empty")
            val cur = PerfMath.parseProcStat(line) ?: throw IllegalStateException("unparseable")
            val prev = lastProcStat
            lastProcStat = cur
            _globalCpuRestricted.value = false
            prev?.let { PerfMath.globalCpu(it, cur) }
        } catch (e: Exception) {
            if (_globalCpuRestricted.value == null) log.i("Perf", "Device-wide CPU usage is not readable here (/proc/stat restricted by SELinux)")
            _globalCpuRestricted.value = true
            null
        }
    }

    private fun display(): Display? = dm?.getDisplay(Display.DEFAULT_DISPLAY)

    private fun readStatic(): DeviceStatic {
        val mi = ActivityManager.MemoryInfo().also { am.getMemoryInfo(it) }
        val cores = Runtime.getRuntime().availableProcessors()
        val freqs = (0 until cores).mapNotNull { i ->
            try {
                File("/sys/devices/system/cpu/cpu$i/cpufreq/cpuinfo_max_freq").readText().trim().toIntOrNull()?.div(1000)
            } catch (e: Exception) { null }
        }
        val d = display()
        val modes = d?.supportedModes.orEmpty()
        return DeviceStatic(
            manufacturer = Build.MANUFACTURER,
            model = Build.MODEL,
            soc = if (Build.VERSION.SDK_INT >= 31) "${Build.SOC_MANUFACTURER} ${Build.SOC_MODEL}".trim() else null,
            android = Build.VERSION.RELEASE,
            sdk = Build.VERSION.SDK_INT,
            abis = Build.SUPPORTED_ABIS.toList(),
            cores = cores,
            maxFreqMhz = freqs,
            totalRamMb = mi.totalMem / 1048576f,
            glEs = am.deviceConfigurationInfo?.glEsVersion ?: "unknown",
            refreshRates = modes.map { it.refreshRate }.distinct().sorted(),
            modes = modes.map { "${it.physicalWidth}x${it.physicalHeight} @ ${"%.0f".format(it.refreshRate)} Hz" }.distinct(),
        )
    }

    // ---- Recording sessions -----------------------------------------------------------------

    fun startRecording(name: String) {
        if (_recording.value != null) return
        acquire("recording")
        _recording.value = Recording(name.ifBlank { "Session" }, System.currentTimeMillis(), emptyList())
        log.i("Perf", "Recording '${name}' started")
    }

    suspend fun stopRecording(): PerfSession? {
        val r = _recording.value ?: return null
        _recording.value = null
        release("recording")
        val session = PerfSession(UUID.randomUUID().toString(), r.name, r.startedAt, System.currentTimeMillis(),
            intervalMs, PerfMath.summarize(r.samples), r.samples)
        withContext(Dispatchers.IO) {
            AtomicJsonStore(File(sessionsDir, "${session.id}.json")).write(session)
            val list = _sessions.value + SessionIndexEntry(session.id, session.name, session.startedAt, session.endedAt, session.summary)
            index.write(list)
            _sessions.value = list
        }
        log.i("Perf", "Recording '${r.name}' saved: ${r.samples.size} samples")
        return session
    }

    suspend fun loadSession(id: String): PerfSession? = withContext(Dispatchers.IO) {
        AtomicJsonStore(File(sessionsDir, "$id.json")).read<PerfSession?> { null }
    }

    suspend fun exportSession(id: String): String? = loadSession(id)?.let { UmtJson.encodeToString(it) }

    suspend fun deleteSession(id: String) = withContext(Dispatchers.IO) {
        File(sessionsDir, "$id.json").delete()
        val list = _sessions.value.filterNot { it.id == id }
        index.write(list)
        _sessions.value = list
    }

    suspend fun clearSessions() = withContext(Dispatchers.IO) {
        sessionsDir.listFiles()?.forEach { if (it.name != "index.json") it.delete() }
        index.write(emptyList<SessionIndexEntry>())
        _sessions.value = emptyList()
    }

    fun clearHistory() { _history.value = emptyList() }
}

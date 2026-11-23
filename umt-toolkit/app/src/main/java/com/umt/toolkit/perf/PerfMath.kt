package com.umt.toolkit.perf

import kotlinx.serialization.Serializable

@Serializable
data class TelemetrySample(
    val t: Long,
    val uiFps: Float,
    val frameP50: Float,
    val frameP95: Float,
    val frameMax: Float,
    val jank: Int,
    val stutter: Int,
    val cpuSelf: Float,
    val cpuSelfCore: Float,
    val cpuGlobal: Float? = null,
    val memAvailMb: Float,
    val memTotalMb: Float,
    val lowMemory: Boolean,
    val pssMb: Float,
    val heapMb: Float,
    val batteryPct: Float,
    val batteryTempC: Float? = null,
    val voltageMv: Int? = null,
    val currentMa: Float? = null,
    val charging: Boolean,
    val thermalStatus: Int,
    val thermalHeadroom: Float? = null,
    val refreshHz: Float,
    val threads: Int,
)

@Serializable
data class SessionSummary(
    val durationSec: Float,
    val samples: Int,
    val avgUiFps: Float,
    val worstP95FrameMs: Float,
    val jankTotal: Int,
    val stutterTotal: Int,
    val avgCpuSelf: Float,
    val peakPssMb: Float,
    val minMemAvailMb: Float,
    val batteryStart: Float,
    val batteryEnd: Float,
    val tempStart: Float?,
    val tempEnd: Float?,
    val maxThermal: Int,
)

data class FrameStats(
    val fps: Float,
    val p50: Float,
    val p95: Float,
    val max: Float,
    val jank: Int,
    val stutter: Int,
    val frames: Int,
)

/** Pure arithmetic behind the performance screens (unit tested). */
object PerfMath {
    /** Nearest-rank percentile of the first [count] values; [p] in 0..100. */
    fun percentile(values: FloatArray, count: Int = values.size, p: Float): Float {
        if (count <= 0) return 0f
        val sorted = values.copyOf(count).also { it.sort() }
        val rank = Math.ceil(p / 100.0 * count).toInt().coerceIn(1, count)
        return sorted[rank - 1]
    }

    /** Frames longer than 1.5x the refresh period count as jank, longer than 2.5x as stutter. */
    fun frameStats(intervalsMs: FloatArray, count: Int, refreshPeriodMs: Float): FrameStats {
        if (count <= 0) return FrameStats(0f, 0f, 0f, 0f, 0, 0, 0)
        var sum = 0.0
        var max = 0f
        var jank = 0
        var stutter = 0
        for (i in 0 until count) {
            val v = intervalsMs[i]
            sum += v
            if (v > max) max = v
            if (v > refreshPeriodMs * 2.5f) stutter++ else if (v > refreshPeriodMs * 1.5f) jank++
        }
        val fps = if (sum > 0) (count * 1000.0 / sum).toFloat() else 0f
        return FrameStats(fps, percentile(intervalsMs, count, 50f), percentile(intervalsMs, count, 95f), max, jank, stutter, count)
    }

    /** Share of the whole device (all cores) used by this process over the interval. */
    fun cpuPercent(cpuMsDelta: Long, wallMsDelta: Long, cores: Int): Float {
        if (wallMsDelta <= 0 || cores <= 0) return 0f
        return (cpuMsDelta.toFloat() * 100f / (wallMsDelta.toFloat() * cores)).coerceIn(0f, 100f)
    }

    /** "cpu  2255 34 2290 22625563 6290 127 456" -> (total, idle) jiffies. */
    fun parseProcStat(line: String): Pair<Long, Long>? {
        val parts = line.trim().split(Regex("\\s+"))
        if (parts.size < 5 || parts[0] != "cpu") return null
        val nums = parts.drop(1).mapNotNull { it.toLongOrNull() }
        if (nums.size < 4) return null
        val idle = nums[3] + (nums.getOrNull(4) ?: 0L)
        return nums.sum() to idle
    }

    fun globalCpu(prev: Pair<Long, Long>, cur: Pair<Long, Long>): Float? {
        val total = cur.first - prev.first
        val idle = cur.second - prev.second
        if (total <= 0) return null
        return ((total - idle).toFloat() * 100f / total).coerceIn(0f, 100f)
    }

    fun summarize(samples: List<TelemetrySample>): SessionSummary {
        if (samples.isEmpty()) return SessionSummary(0f, 0, 0f, 0f, 0, 0, 0f, 0f, 0f, 0f, 0f, null, null, -1)
        val first = samples.first()
        val last = samples.last()
        return SessionSummary(
            durationSec = (last.t - first.t) / 1000f,
            samples = samples.size,
            avgUiFps = samples.map { it.uiFps }.average().toFloat(),
            worstP95FrameMs = samples.maxOf { it.frameP95 },
            jankTotal = samples.sumOf { it.jank },
            stutterTotal = samples.sumOf { it.stutter },
            avgCpuSelf = samples.map { it.cpuSelf }.average().toFloat(),
            peakPssMb = samples.maxOf { it.pssMb },
            minMemAvailMb = samples.minOf { it.memAvailMb },
            batteryStart = first.batteryPct,
            batteryEnd = last.batteryPct,
            tempStart = first.batteryTempC,
            tempEnd = last.batteryTempC,
            maxThermal = samples.maxOf { it.thermalStatus },
        )
    }

    fun thermalLabel(status: Int): String = when (status) {
        -1 -> "Unavailable (needs Android 10+)"
        0 -> "None"
        1 -> "Light"
        2 -> "Moderate"
        3 -> "Severe"
        4 -> "Critical"
        5 -> "Emergency"
        6 -> "Shutdown"
        else -> "Unknown ($status)"
    }
}

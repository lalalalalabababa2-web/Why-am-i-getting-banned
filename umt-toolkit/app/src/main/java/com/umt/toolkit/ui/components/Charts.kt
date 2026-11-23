package com.umt.toolkit.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import com.umt.toolkit.ui.theme.Mono
import com.umt.toolkit.ui.theme.Umt

/**
 * Frame-time bars (one series, accent) with labelled reference lines. Frames over 2.5x the
 * refresh period are drawn in the warning colour and counted in text beside the chart.
 * Touch a bar to read its exact value.
 */
@Composable
fun FrameTimeChart(intervals: FloatArray, refreshHz: Float, modifier: Modifier = Modifier) {
    var picked by remember { mutableStateOf<Int?>(null) }
    val period = 1000f / refreshHz.coerceAtLeast(1f)
    val ceiling = maxOf(period * 3f, 40f, intervals.maxOrNull() ?: 0f).coerceAtMost(250f)
    val stutters = intervals.count { it > period * 2.5f }
    Column(modifier) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("Frame time, last ${intervals.size} frames", style = MaterialTheme.typography.bodySmall, color = Umt.TextDim, modifier = Modifier.weight(1f))
            val p = picked
            Text(
                if (p != null && p < intervals.size) "frame ${p + 1}: %.1f ms".format(intervals[p]) else "over %.0f ms: %d".format(period * 2.5f, stutters),
                style = Mono, color = Umt.Text,
            )
        }
        Canvas(
            Modifier
                .fillMaxWidth()
                .height(96.dp)
                .padding(horizontal = 12.dp, vertical = 4.dp)
                .pointerInput(intervals.size) {
                    fun pick(x: Float) {
                        if (intervals.isEmpty()) return
                        picked = ((x / size.width) * intervals.size).toInt().coerceIn(0, intervals.size - 1)
                    }
                    detectTapGestures { pick(it.x) }
                }
                .pointerInput(intervals.size) {
                    detectDragGestures(onDragEnd = { picked = null }) { change, _ ->
                        if (intervals.isNotEmpty()) picked = ((change.position.x / size.width) * intervals.size).toInt().coerceIn(0, intervals.size - 1)
                    }
                },
        ) {
            val w = size.width
            val h = size.height
            fun y(ms: Float) = h - (ms / ceiling).coerceIn(0f, 1f) * h
            // Reference lines: one refresh period and two.
            val dash = PathEffect.dashPathEffect(floatArrayOf(6f, 6f))
            for (ref in listOf(period, period * 2)) {
                drawLine(Umt.OutlineStrong, Offset(0f, y(ref)), Offset(w, y(ref)), 1.dp.toPx(), pathEffect = dash)
            }
            drawLine(Umt.Outline, Offset(0f, h), Offset(w, h), 1.dp.toPx())
            if (intervals.isEmpty()) return@Canvas
            val slot = w / maxOf(intervals.size, 60)
            val gap = if (slot > 4.dp.toPx()) 2.dp.toPx() else 0f
            val barW = (slot - gap).coerceAtLeast(1f)
            intervals.forEachIndexed { i, ms ->
                val top = y(ms)
                val color = when {
                    picked == i -> Umt.Text
                    ms > period * 2.5f -> Umt.Warn
                    else -> Umt.Accent
                }
                drawRoundRect(color, Offset(i * slot, top), Size(barW, h - top), CornerRadius(minOf(barW / 2, 2.dp.toPx())))
            }
        }
        Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp)) {
            Text("dashed: %.1f ms and %.1f ms (1× and 2× refresh)".format(period, period * 2), style = MaterialTheme.typography.labelSmall, color = Umt.TextFaint)
        }
    }
}

/** One-series sparkline with its latest value as text. */
@Composable
fun Sparkline(title: String, values: List<Float>, unit: String, modifier: Modifier = Modifier, decimals: Int = 1) {
    Column(modifier.padding(horizontal = 12.dp, vertical = 4.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(title, style = MaterialTheme.typography.bodySmall, color = Umt.TextDim, modifier = Modifier.weight(1f))
            val last = values.lastOrNull()
            val lo = values.minOrNull()
            val hi = values.maxOrNull()
            Text(
                if (last == null) "—" else "%.${decimals}f %s  (%.${decimals}f–%.${decimals}f)".format(last, unit, lo, hi),
                style = Mono, color = Umt.Text,
            )
        }
        Canvas(Modifier.fillMaxWidth().height(36.dp).padding(top = 4.dp)) {
            drawLine(Umt.Outline, Offset(0f, size.height), Offset(size.width, size.height), 1.dp.toPx())
            if (values.size < 2) return@Canvas
            val lo = values.min()
            val hi = values.max()
            val span = (hi - lo).takeIf { it > 1e-3f } ?: 1f
            val step = size.width / (values.size - 1)
            val path = Path()
            values.forEachIndexed { i, v ->
                val x = i * step
                val y = size.height - (v - lo) / span * (size.height - 4.dp.toPx()) - 2.dp.toPx()
                if (i == 0) path.moveTo(x, y) else path.lineTo(x, y)
            }
            drawPath(path, Umt.Accent, style = Stroke(2.dp.toPx(), cap = StrokeCap.Round))
        }
    }
}

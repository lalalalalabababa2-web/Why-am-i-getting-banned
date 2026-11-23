package com.umt.toolkit.core

import android.os.Build
import com.umt.toolkit.BuildConfig
import java.io.File
import java.io.PrintWriter
import java.io.StringWriter
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** Writes a report for any uncaught exception; the Console screen lists them on the next start. */
object CrashHandler {
    private const val DIR = "crashes"

    fun install(filesDir: File, log: UmtLog) {
        val dir = File(filesDir, DIR).apply { mkdirs() }
        val previous = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, error ->
            try {
                File(dir, "crash-${System.currentTimeMillis()}.txt").writeText(report(thread, error, log))
            } catch (_: Throwable) {
            }
            previous?.uncaughtException(thread, error)
        }
    }

    fun reports(filesDir: File): List<File> =
        File(filesDir, DIR).listFiles { f -> f.name.startsWith("crash-") }?.sortedByDescending { it.name } ?: emptyList()

    fun clear(filesDir: File): Int = reports(filesDir).count { it.delete() }

    private fun report(thread: Thread, error: Throwable, log: UmtLog): String {
        val sw = StringWriter()
        error.printStackTrace(PrintWriter(sw))
        return buildString {
            appendLine("Universal Mod Toolkit crash report")
            appendLine("Time: ${SimpleDateFormat("yyyy-MM-dd HH:mm:ss Z", Locale.US).format(Date())}")
            appendLine("App: ${BuildConfig.APPLICATION_ID} ${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})")
            appendLine("Device: ${Build.MANUFACTURER} ${Build.MODEL}, Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})")
            appendLine("ABIs: ${Build.SUPPORTED_ABIS.joinToString()}")
            appendLine("Thread: ${thread.name}")
            appendLine()
            appendLine(sw.toString())
            appendLine("Last log lines:")
            log.tail(60).forEach { appendLine(it.format()) }
        }
    }
}

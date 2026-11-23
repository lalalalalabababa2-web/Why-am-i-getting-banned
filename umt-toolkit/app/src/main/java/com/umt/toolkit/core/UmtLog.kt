package com.umt.toolkit.core

import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.Executors

enum class LogLevel(val letter: String) { DEBUG("D"), INFO("I"), WARN("W"), ERROR("E") }

data class LogEntry(val time: Long, val level: LogLevel, val tag: String, val message: String) {
    fun format(): String = "${TIME.get()!!.format(Date(time))} ${level.letter}/$tag: $message"

    companion object {
        val TIME: ThreadLocal<SimpleDateFormat> = ThreadLocal.withInitial { SimpleDateFormat("MM-dd HH:mm:ss.SSS", Locale.US) }
    }
}

/**
 * In-memory ring buffer for the Console screen plus an append-only file (rotated at 512 KB)
 * that survives restarts and goes into crash reports and exports.
 */
class UmtLog(dir: File?) {
    private val lock = Any()
    private val buffer = ArrayDeque<LogEntry>()
    private val file: File? = dir?.let { it.mkdirs(); File(it, "umt.log") }
    private val writer = Executors.newSingleThreadExecutor { r -> Thread(r, "umt-log").apply { isDaemon = true } }

    @Volatile var minLevel: LogLevel = LogLevel.INFO
    @Volatile var capacity: Int = 2000
        set(value) {
            field = value.coerceIn(100, 20_000)
            synchronized(lock) { trimLocked(); publishLocked() }
        }

    private val _entries = MutableStateFlow<List<LogEntry>>(emptyList())
    val entries: StateFlow<List<LogEntry>> = _entries

    fun d(tag: String, message: String) = log(LogLevel.DEBUG, tag, message, null)
    fun i(tag: String, message: String) = log(LogLevel.INFO, tag, message, null)
    fun w(tag: String, message: String, t: Throwable? = null) = log(LogLevel.WARN, tag, message, t)
    fun e(tag: String, message: String, t: Throwable? = null) = log(LogLevel.ERROR, tag, message, t)

    fun log(level: LogLevel, tag: String, message: String, t: Throwable?) {
        if (level.ordinal < minLevel.ordinal) return
        val text = if (t != null) "$message (${t.javaClass.simpleName}: ${t.message})" else message
        val entry = LogEntry(System.currentTimeMillis(), level, tag, text)
        synchronized(lock) {
            buffer.addLast(entry)
            trimLocked()
            publishLocked()
        }
        val priority = when (level) {
            LogLevel.DEBUG -> Log.DEBUG
            LogLevel.INFO -> Log.INFO
            LogLevel.WARN -> Log.WARN
            LogLevel.ERROR -> Log.ERROR
        }
        Log.println(priority, "UMT/$tag", text)
        val f = file ?: return
        writer.execute {
            try {
                if (f.length() > 512 * 1024) {
                    val old = File(f.parentFile, "umt.log.1")
                    old.delete()
                    f.renameTo(old)
                }
                f.appendText(entry.format() + "\n")
            } catch (_: Exception) {
            }
        }
    }

    fun clear() = synchronized(lock) {
        buffer.clear()
        publishLocked()
    }

    /** Drops all but the newest [keep] entries; returns how many were dropped. */
    fun trim(keep: Int): Int = synchronized(lock) {
        val before = buffer.size
        while (buffer.size > keep) buffer.removeFirst()
        publishLocked()
        before - buffer.size
    }

    fun tail(n: Int): List<LogEntry> = synchronized(lock) { buffer.toList().takeLast(n) }

    /** The log files (previous then current) as text, or the in-memory buffer if there are none. */
    fun exportText(): String {
        val f = file
        if (f != null) {
            val old = File(f.parentFile, "umt.log.1")
            val text = buildString {
                if (old.exists()) append(old.readText())
                if (f.exists()) append(f.readText())
            }
            if (text.isNotEmpty()) return text
        }
        return synchronized(lock) { buffer.joinToString("\n") { it.format() } }
    }

    private fun trimLocked() {
        while (buffer.size > capacity) buffer.removeFirst()
    }

    private fun publishLocked() {
        _entries.value = buffer.toList()
    }
}

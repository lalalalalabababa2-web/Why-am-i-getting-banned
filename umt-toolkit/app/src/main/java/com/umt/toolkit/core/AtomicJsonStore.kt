package com.umt.toolkit.core

import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.io.File
import java.io.FileOutputStream
import java.nio.file.Files
import java.nio.file.StandardCopyOption

/** Shared JSON settings for everything the toolkit stores or exports. */
val UmtJson: Json = Json {
    ignoreUnknownKeys = true
    encodeDefaults = true
    explicitNulls = false
    prettyPrint = true
    prettyPrintIndent = "  "
}

/**
 * One JSON file written atomically: the new text goes to `name.tmp`, is flushed to disk,
 * then renamed over the old file, so a crash or power cut leaves either the old or the new
 * file, never half of one. A file that no longer parses is kept as `name.corrupt`.
 */
class AtomicJsonStore(val file: File) {
    private val lock = Any()

    fun readText(): String? = synchronized(lock) {
        File(file.path + ".tmp").takeIf { it.exists() }?.delete()
        if (file.exists()) file.readText() else null
    }

    fun writeText(text: String) = synchronized(lock) {
        file.parentFile?.mkdirs()
        val tmp = File(file.path + ".tmp")
        FileOutputStream(tmp).use { out ->
            out.write(text.toByteArray(Charsets.UTF_8))
            out.flush()
            out.fd.sync()
        }
        Files.move(tmp.toPath(), file.toPath(), StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE)
        Unit
    }

    fun delete() = synchronized(lock) { file.delete() }

    fun quarantine() = synchronized(lock) {
        if (file.exists()) {
            val bad = File(file.path + ".corrupt")
            bad.delete()
            file.renameTo(bad)
        }
    }

    inline fun <reified T> read(json: Json = UmtJson, default: () -> T): T {
        val text = readText() ?: return default()
        return try {
            json.decodeFromString<T>(text)
        } catch (e: Exception) {
            quarantine()
            default()
        }
    }

    inline fun <reified T> write(value: T, json: Json = UmtJson) = writeText(json.encodeToString(value))
}

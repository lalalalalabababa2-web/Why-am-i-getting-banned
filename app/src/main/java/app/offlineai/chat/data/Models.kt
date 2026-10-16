package app.offlineai.chat.data

import android.app.DownloadManager
import android.content.Context
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.os.StatFs
import android.provider.OpenableColumns
import java.io.File
import java.io.RandomAccessFile

enum class Family { QWEN, GEMMA, OTHER }

/** Sampling a model's makers recommend. */
data class Sampling(val temp: Float, val topP: Float, val topK: Int, val minP: Float)

fun Family.recommended(): Sampling = when (this) {
    Family.QWEN -> Sampling(0.6f, 0.95f, 20, 0.0f)
    Family.GEMMA -> Sampling(1.0f, 0.95f, 64, 0.0f)
    Family.OTHER -> Sampling(0.7f, 0.95f, 40, 0.05f)
}

data class CatalogModel(
    val id: String,
    val name: String,
    val maker: String,
    val blurb: String,
    val repo: String,
    val file: String,
    val sizeBytes: Long,
    val family: Family,
    val official: Boolean,
) {
    val url: String get() = "https://huggingface.co/$repo/resolve/main/$file?download=true"
    val page: String get() = "https://huggingface.co/$repo"
}

/** Hand-picked GGUF files that fit an 8 GB phone (all Q4_K_M, sizes as published). */
object Catalog {
    val models = listOf(
        CatalogModel(
            "gemma4-e4b", "Gemma 4 E4B", "Google",
            "The best all-round model for this phone: chat, writing, code. Thinks before answering when thinking is on.",
            "unsloth/gemma-4-E4B-it-GGUF", "gemma-4-E4B-it-Q4_K_M.gguf", 4_977_171_584L, Family.GEMMA, true,
        ),
        CatalogModel(
            "gemma4-e2b", "Gemma 4 E2B", "Google",
            "Smaller and faster Gemma 4. Pick this if E4B feels slow or the phone runs short of memory.",
            "unsloth/gemma-4-E2B-it-GGUF", "gemma-4-E2B-it-Q4_K_M.gguf", 3_106_738_272L, Family.GEMMA, true,
        ),
        CatalogModel(
            "qwen35-4b", "Qwen3.5 4B", "Alibaba Qwen",
            "The official Qwen3.5 small model. Strong at reasoning and code for its size.",
            "unsloth/Qwen3.5-4B-GGUF", "Qwen3.5-4B-Q4_K_M.gguf", 2_740_937_888L, Family.QWEN, true,
        ),
        CatalogModel(
            "qwopus35-4b-v3", "Qwopus3.5 4B v3", "Jackrong (community)",
            "Qwen3.5 4B tuned for shorter, steadier reasoning, so less waiting on a phone. Best community pick for code.",
            "Jackrong/Qwopus3.5-4B-v3-GGUF", "Qwen3.5-4B.Q4_K_M.gguf", 2_708_800_320L, Family.QWEN, false,
        ),
        CatalogModel(
            "qwopus35-4b-coder", "Qwopus3.5 4B Coder", "Jackrong (community)",
            "Qwen3.5 4B tuned for coding, debugging and tool use. Experimental.",
            "Jackrong/Qwopus3.5-4B-Coder-MTP-GGUF", "Qwopus3.5-4B-Coder-MTP-Q4_K_M.gguf", 2_783_446_560L, Family.QWEN, false,
        ),
        CatalogModel(
            "qwen38-4b", "Qwen3.8 4B", "Empero (community)",
            "Qwen3.5 4B distilled from a much larger Qwen3.8 model. Better general knowledge, slightly weaker at math.",
            "empero-ai/Qwen3.8-4B-GGUF", "Qwen3.8-4B-Q4_K_M.gguf", 2_783_446_304L, Family.QWEN, false,
        ),
        CatalogModel(
            "teichai-qwen35-4b", "Qwen3.5 4B Claude Reasoning", "TeichAI (community)",
            "Qwen3.5 4B trained lightly on reasoning examples. Shorter answers, fewer thinking loops; good for chat.",
            "TeichAI/Qwen3.5-4B-Claude-Opus-Reasoning-Distill-GGUF", "Qwen3.5-4B-Claude-Reasoning.q4_k_m.gguf",
            2_708_805_568L, Family.QWEN, false,
        ),
        CatalogModel(
            "adi-qwen35-4b-glm", "ADI Qwen3.5 4B GLM-5.2", "AdvancedDataIntelligence (community)",
            "Qwen3.5 4B trained on general-knowledge answers from GLM-5.2.",
            "AdvancedDataIntelligence/adi-qwen3.5-4b-glm5.2-general-GGUF", "adi-qwen3.5-4b-glm5.2-general-q4_k_m.gguf",
            2_708_804_064L, Family.QWEN, false,
        ),
    )

    fun byFile(file: String): CatalogModel? = models.firstOrNull { it.file == file }
}

/** A .gguf file in the app's model folder. */
data class LocalModel(val file: File, val catalog: CatalogModel?) {
    val displayName: String get() = catalog?.name ?: file.name.removeSuffix(".gguf")
    val sizeBytes: Long get() = file.length()
    val family: Family
        get() = catalog?.family ?: run {
            val n = file.name.lowercase()
            when {
                "gemma" in n -> Family.GEMMA
                "qwen" in n || "qwopus" in n -> Family.QWEN
                else -> Family.OTHER
            }
        }
}

data class DownloadState(
    val fileName: String,
    val status: Int,      // DownloadManager.STATUS_*
    val done: Long,
    val total: Long,
    val reason: Int,
)

/**
 * The models on this phone and the downloads in progress. Files live in the app's own
 * external folder (Android/data/app.offlineai.chat/files/models). Downloads are handed to
 * Android's download manager, so they carry on with the app closed and resume after a dropped
 * connection.
 */
class ModelStore(private val context: Context) {
    private val prefs = context.getSharedPreferences("downloads", Context.MODE_PRIVATE)
    private val dm = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
    private val main = Handler(Looper.getMainLooper())

    val dir: File
        get() = (context.getExternalFilesDir("models") ?: File(context.filesDir, "models")).apply { mkdirs() }

    /** The last thing that went wrong with a download or import, per file name. */
    val failures = mutableMapOf<String, String>()

    fun local(): List<LocalModel> =
        (dir.listFiles() ?: emptyArray())
            .filter { it.isFile && it.name.endsWith(".gguf", ignoreCase = true) }
            .sortedBy { it.name.lowercase() }
            .map { LocalModel(it, Catalog.byFile(it.name)) }

    fun find(fileName: String): LocalModel? = local().firstOrNull { it.file.name == fileName }

    fun freeBytes(): Long = try {
        StatFs(dir.path).availableBytes
    } catch (e: Exception) {
        -1
    }

    fun isDownloading(fileName: String): Boolean = prefs.contains(fileName)

    fun download(url: String, fileName: String, title: String) {
        failures.remove(fileName)
        File(dir, "$fileName.part").delete()
        val request = DownloadManager.Request(Uri.parse(url))
            .setTitle(title)
            .setDescription("Model for Offline AI")
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            .setDestinationInExternalFilesDir(context, "models", "$fileName.part")
            .setAllowedOverMetered(true)
            .setAllowedOverRoaming(false)
            .addRequestHeader("User-Agent", "OfflineAI/0.1 (Android)")
        val id = dm.enqueue(request)
        prefs.edit().putLong(fileName, id).apply()
    }

    fun cancel(fileName: String) {
        val id = prefs.getLong(fileName, -1)
        if (id >= 0) dm.remove(id)
        prefs.edit().remove(fileName).apply()
        File(dir, "$fileName.part").delete()
    }

    fun delete(model: LocalModel): Boolean = model.file.delete()

    /** Current downloads; finished ones are checked and moved into place on the way. */
    fun poll(): List<DownloadState> {
        val out = mutableListOf<DownloadState>()
        for ((fileName, value) in prefs.all) {
            val id = (value as? Long) ?: continue
            val cursor = dm.query(DownloadManager.Query().setFilterById(id))
            if (cursor == null) continue
            cursor.use { c ->
                if (!c.moveToFirst()) {
                    // removed outside the app (for example from the notification)
                    prefs.edit().remove(fileName).apply()
                    return@use
                }
                val status = c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))
                val done = c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR))
                val total = c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES))
                val reason = c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON))
                val localUri = c.getString(c.getColumnIndexOrThrow(DownloadManager.COLUMN_LOCAL_URI))
                when (status) {
                    DownloadManager.STATUS_SUCCESSFUL -> {
                        prefs.edit().remove(fileName).apply()
                        finish(fileName, localUri)
                    }
                    DownloadManager.STATUS_FAILED -> {
                        prefs.edit().remove(fileName).apply()
                        dm.remove(id)
                        failures[fileName] = describeFailure(reason)
                    }
                    else -> out.add(DownloadState(fileName, status, done, total, reason))
                }
            }
        }
        return out
    }

    private fun finish(fileName: String, localUri: String?) {
        val part = localUri?.let { Uri.parse(it).path }?.let { File(it) } ?: File(dir, "$fileName.part")
        val problem = checkGguf(part, Catalog.byFile(fileName)?.sizeBytes)
        if (problem != null) {
            part.delete()
            failures[fileName] = problem
            return
        }
        val target = File(dir, fileName)
        target.delete()
        if (!part.renameTo(target)) {
            failures[fileName] = "The finished download could not be moved into place."
        }
    }

    /** Copies a .gguf file the user picked into the model folder. Runs on its own thread. */
    fun import(uri: Uri, onProgress: (Long, Long) -> Unit, onDone: (String?) -> Unit) {
        Thread {
            var name = "model.gguf"
            var size = -1L
            context.contentResolver.query(uri, null, null, null, null)?.use { c ->
                if (c.moveToFirst()) {
                    val ni = c.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    val si = c.getColumnIndex(OpenableColumns.SIZE)
                    if (ni >= 0) name = c.getString(ni) ?: name
                    if (si >= 0 && !c.isNull(si)) size = c.getLong(si)
                }
            }
            name = name.replace('/', '_')
            if (!name.endsWith(".gguf", ignoreCase = true)) name += ".gguf"
            val part = File(dir, "$name.part")
            val error = try {
                val free = freeBytes()
                if (size > 0 && free in 0 until size + 64L * 1024 * 1024) {
                    "Not enough free space for this file."
                } else {
                    context.contentResolver.openInputStream(uri).use { input ->
                        if (input == null) throw IllegalStateException("The file could not be opened.")
                        part.outputStream().use { out ->
                            val buf = ByteArray(1 shl 20)
                            var copied = 0L
                            var lastReport = 0L
                            while (true) {
                                val n = input.read(buf)
                                if (n < 0) break
                                out.write(buf, 0, n)
                                copied += n
                                if (copied - lastReport > 16L * 1024 * 1024) {
                                    lastReport = copied
                                    val c = copied
                                    main.post { onProgress(c, size) }
                                }
                            }
                        }
                    }
                    checkGguf(part, null) ?: run {
                        val target = File(dir, name)
                        target.delete()
                        if (part.renameTo(target)) null else "The file could not be moved into place."
                    }
                }
            } catch (e: Exception) {
                e.message ?: "The file could not be copied."
            }
            if (error != null) part.delete()
            main.post { onDone(error) }
        }.start()
    }

    companion object {
        /** A GGUF file starts with these four bytes. */
        fun checkGguf(file: File, expectedSize: Long?): String? {
            if (!file.exists()) return "The downloaded file is missing."
            if (expectedSize != null && expectedSize > 0 && file.length() != expectedSize) {
                return "The download is incomplete (${file.length()} of $expectedSize bytes). Try again."
            }
            return try {
                RandomAccessFile(file, "r").use { f ->
                    val magic = ByteArray(4)
                    f.readFully(magic)
                    if (String(magic, Charsets.US_ASCII) == "GGUF") null
                    else "This is not a GGUF model file. If it came from a link, use the link to the .gguf file itself."
                }
            } catch (e: Exception) {
                "The file could not be read."
            }
        }

        /** Turns a pasted link into a direct file link and a file name, or explains what is wrong. */
        fun parseLink(raw: String): Pair<String, String>? {
            var url = raw.trim()
            if (!url.startsWith("http://") && !url.startsWith("https://")) return null
            // A Hugging Face page link to a file (…/blob/main/x.gguf) downloads the page, not the file.
            url = url.replace("/blob/", "/resolve/")
            val path = Uri.parse(url).path ?: return null
            val name = path.substringAfterLast('/')
            if (!name.endsWith(".gguf", ignoreCase = true)) return null
            return url to Uri.decode(name)
        }

        fun describeFailure(reason: Int): String = when (reason) {
            DownloadManager.ERROR_INSUFFICIENT_SPACE -> "Not enough free space on the phone."
            DownloadManager.ERROR_HTTP_DATA_ERROR, DownloadManager.ERROR_TOO_MANY_REDIRECTS,
            DownloadManager.ERROR_UNHANDLED_HTTP_CODE -> "The server stopped the download. Try again."
            DownloadManager.ERROR_CANNOT_RESUME -> "The download could not resume. Start it again."
            404 -> "The file was not found at that link."
            401, 403 -> "That file needs a sign-in on Hugging Face, so it cannot be downloaded here."
            else -> "The download failed (code $reason)."
        }

        fun formatBytes(bytes: Long): String = when {
            bytes >= 1_000_000_000L -> String.format("%.2f GB", bytes / 1e9)
            bytes >= 1_000_000L -> String.format("%.0f MB", bytes / 1e6)
            bytes >= 1_000L -> String.format("%.0f KB", bytes / 1e3)
            else -> "$bytes B"
        }
    }
}

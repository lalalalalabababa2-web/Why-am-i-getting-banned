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

enum class Family { QWEN, GEMMA, LLAMA, LIQUID, MISTRAL, OTHER }

/** Sampling a model's makers recommend. */
data class Sampling(val temp: Float, val topP: Float, val topK: Int, val minP: Float, val repeat: Float = 1.0f)

fun Family.recommended(): Sampling = when (this) {
    Family.QWEN -> Sampling(0.6f, 0.95f, 20, 0.0f)
    Family.GEMMA -> Sampling(1.0f, 0.95f, 64, 0.0f)
    Family.LLAMA -> Sampling(0.6f, 0.9f, 40, 0.0f)
    // Liquid's own settings for LFM2.5: low temperature, min-p, a light repeat penalty
    Family.LIQUID -> Sampling(0.3f, 1.0f, 0, 0.15f, 1.05f)
    // Mistral recommends a low temperature for its instruct models
    Family.MISTRAL -> Sampling(0.15f, 1.0f, 0, 0.0f)
    Family.OTHER -> Sampling(0.7f, 0.95f, 40, 0.05f)
}

/** A file that goes with a model: its picture/sound projector, or a small drafter that speeds it up. */
data class ExtraFile(val file: String, val sizeBytes: Long, val repo: String) {
    val url: String get() = "https://huggingface.co/$repo/resolve/main/$file?download=true"
}

data class CatalogModel(
    val id: String,
    val name: String,
    val maker: String,
    val blurb: String,
    val repo: String,
    val file: String,
    val sizeBytes: Long,     // as published (approximate)
    val family: Family,
    val official: Boolean,
    // Gemma's "E" models keep most of their size in per-layer embeddings that are read a row at
    // a time straight from the file, so they need far less memory than their file size.
    val ple: Boolean = false,
    val large: Boolean = false,
    /** Reads pictures (and [hears] sound) once its projector is downloaded. */
    val pictures: ExtraFile? = null,
    val hears: Boolean = false,
    /** A drafter file for drafting ahead (Gemma 4); optional, added from the model's row. */
    val drafter: ExtraFile? = null,
    /** The file carries its own multi-token-prediction head (Qwen3.5 "MTP" files). */
    val mtp: Boolean = false,
    /** A copy smaller than this is an older download without the MTP head (same file name). */
    val olderBelow: Long = 0,
) {
    val url: String get() = "https://huggingface.co/$repo/resolve/main/$file?download=true"
    val page: String get() = "https://huggingface.co/$repo"
}

/** Hand-picked GGUF files that fit an 8 GB phone (sizes as published). */
object Catalog {
    private fun qwenPictures(size: String, bytes: Long) = ExtraFile("mmproj-F16.gguf", bytes, "unsloth/Qwen3.5-$size-MTP-GGUF")

    val models = listOf(
        // ---- Google
        CatalogModel(
            "gemma4-e4b", "Gemma 4 E4B", "Google",
            "The best all-round model for this phone: chat, writing, code. Sees pictures and hears sound once its " +
                "picture support is added.",
            "unsloth/gemma-4-E4B-it-GGUF", "gemma-4-E4B-it-Q4_K_M.gguf", 4_977_171_584L, Family.GEMMA, true, ple = true,
            pictures = ExtraFile("mmproj-F16.gguf", 990_000_000L, "unsloth/gemma-4-E4B-it-GGUF"), hears = true,
            drafter = ExtraFile("mtp-gemma-4-E4B-it.gguf", 98_700_000L, "unsloth/gemma-4-E4B-it-GGUF"),
        ),
        CatalogModel(
            "gemma4-e2b", "Gemma 4 E2B", "Google",
            "Smaller and faster Gemma 4. Pick this if E4B feels slow or the phone runs short of memory. Pictures and sound too.",
            "unsloth/gemma-4-E2B-it-GGUF", "gemma-4-E2B-it-Q4_K_M.gguf", 3_106_738_272L, Family.GEMMA, true, ple = true,
            pictures = ExtraFile("mmproj-F16.gguf", 986_000_000L, "unsloth/gemma-4-E2B-it-GGUF"), hears = true,
            drafter = ExtraFile("mtp-gemma-4-E2B-it.gguf", 97_800_000L, "unsloth/gemma-4-E2B-it-GGUF"),
        ),
        CatalogModel(
            "gemma3-270m", "Gemma 3 270M", "Google",
            "Tiny and very fast. Fine for short replies, rewording and simple questions; it knows little and does not reason.",
            "unsloth/gemma-3-270m-it-GGUF", "gemma-3-270m-it-Q8_0.gguf", 292_000_000L, Family.GEMMA, true,
        ),
        // ---- Alibaba Qwen
        CatalogModel(
            "qwen35-4b", "Qwen3.5 4B", "Alibaba Qwen",
            "The official Qwen3.5 small model. Strong at reasoning and code for its size. Sees pictures.",
            "unsloth/Qwen3.5-4B-MTP-GGUF", "Qwen3.5-4B-Q4_K_M.gguf", 2_830_000_000L, Family.QWEN, true,
            pictures = qwenPictures("4B", 672_000_000L), mtp = true, olderBelow = 2_780_000_000L,
        ),
        CatalogModel(
            "qwen35-2b", "Qwen3.5 2B", "Alibaba Qwen",
            "Half the size of the 4B, so it writes faster and leaves more memory free. Sees pictures.",
            "unsloth/Qwen3.5-2B-MTP-GGUF", "Qwen3.5-2B-Q4_K_M.gguf", 1_330_000_000L, Family.QWEN, true,
            pictures = qwenPictures("2B", 668_000_000L), mtp = true,
        ),
        CatalogModel(
            "qwen35-0.8b", "Qwen3.5 0.8B", "Alibaba Qwen",
            "The smallest Qwen3.5: very fast, sees pictures, good for quick questions and describing photos.",
            "unsloth/Qwen3.5-0.8B-MTP-GGUF", "Qwen3.5-0.8B-Q4_K_M.gguf", 550_000_000L, Family.QWEN, true,
            pictures = qwenPictures("0.8B", 205_000_000L), mtp = true,
        ),
        // ---- PrismML: Qwen models rebuilt with weights of -1, 0 or +1 (or 1 bit), so big models get small
        CatalogModel(
            "bonsai2-9b", "Ternary Bonsai 2 9B", "PrismML",
            "Qwen3.5 9B rebuilt so every weight is -1, 0 or +1: the knowledge of a 9B model in 2.6 GB, so it loads easily " +
                "and leaves memory free. Sees pictures.",
            "prism-ml/Ternary-Bonsai-2-9B-gguf", "Ternary-Bonsai-2-9B-Q2_0.gguf", 2_556_640_128L, Family.QWEN, true,
            pictures = ExtraFile("Ternary-Bonsai-2-9B-mmproj-Q8_0.gguf", 624_229_664L, "prism-ml/Ternary-Bonsai-2-9B-gguf"),
        ),
        // ---- Liquid AI
        CatalogModel(
            "lfm25-1.2b", "LFM2.5 1.2B", "Liquid AI",
            "Built for phones: a hybrid design that reads and writes fast on a CPU. Good for chat and summaries.",
            "LiquidAI/LFM2.5-1.2B-Instruct-GGUF", "LFM2.5-1.2B-Instruct-Q4_K_M.gguf", 731_000_000L, Family.LIQUID, true,
        ),
        CatalogModel(
            "lfm25-vl-1.6b", "LFM2.5-VL 1.6B", "Liquid AI",
            "Liquid's fast phone model with eyes: describes photos, reads text in pictures.",
            "LiquidAI/LFM2.5-VL-1.6B-GGUF", "LFM2.5-VL-1.6B-Q4_K_M.gguf", 731_000_000L, Family.LIQUID, true,
            pictures = ExtraFile("mmproj-LFM2.5-VL-1.6b-Q8_0.gguf", 583_000_000L, "LiquidAI/LFM2.5-VL-1.6B-GGUF"),
        ),
        // ---- Meta
        CatalogModel(
            "llama32-1b", "Llama 3.2 1B", "Meta",
            "Meta's small Llama. Fast and light; fine for everyday chat, weaker at reasoning than newer models.",
            "unsloth/Llama-3.2-1B-Instruct-GGUF", "Llama-3.2-1B-Instruct-Q4_K_M.gguf", 808_000_000L, Family.LLAMA, true,
        ),
        CatalogModel(
            "llama32-3b", "Llama 3.2 3B", "Meta",
            "The bigger small Llama: a steady everyday assistant with good English writing.",
            "unsloth/Llama-3.2-3B-Instruct-GGUF", "Llama-3.2-3B-Instruct-Q4_K_M.gguf", 2_020_000_000L, Family.LLAMA, true,
        ),
        // ---- Mistral, IBM, Microsoft
        CatalogModel(
            "ministral3-3b", "Ministral 3 3B", "Mistral AI",
            "Mistral's phone-sized model: follows instructions closely, many languages, sees pictures.",
            "mistralai/Ministral-3-3B-Instruct-2512-GGUF", "Ministral-3-3B-Instruct-2512-Q4_K_M.gguf", 2_150_000_000L,
            Family.MISTRAL, true,
            pictures = ExtraFile("Ministral-3-3B-Instruct-2512-BF16-mmproj.gguf", 842_000_000L, "mistralai/Ministral-3-3B-Instruct-2512-GGUF"),
        ),
        CatalogModel(
            "granite41-3b", "Granite 4.1 3B", "IBM",
            "IBM's small model, made for summaries, rewriting and structured answers.",
            "unsloth/granite-4.1-3b-GGUF", "granite-4.1-3b-Q4_K_M.gguf", 2_100_000_000L, Family.OTHER, true,
        ),
        CatalogModel(
            "phi4-mini", "Phi-4-mini 3.8B", "Microsoft",
            "Strong at maths, logic and code for its size; plainer at casual chat.",
            "unsloth/Phi-4-mini-instruct-GGUF", "Phi-4-mini-instruct-Q4_K_M.gguf", 2_490_000_000L, Family.OTHER, true,
        ),
        // ---- community fine-tunes of Qwen3.5 4B
        CatalogModel(
            "qwopus35-4b-v3", "Qwopus3.5 4B v3", "Jackrong (community)",
            "Qwen3.5 4B tuned for shorter, steadier reasoning, so less waiting on a phone. Best community pick for code.",
            "Jackrong/Qwopus3.5-4B-v3-GGUF", "Qwen3.5-4B.Q4_K_M.gguf", 2_708_800_320L, Family.QWEN, false,
        ),
        CatalogModel(
            "qwopus35-4b-coder", "Qwopus3.5 4B Coder", "Jackrong (community)",
            "Qwen3.5 4B tuned for coding, debugging and tool use. Experimental.",
            "Jackrong/Qwopus3.5-4B-Coder-MTP-GGUF", "Qwopus3.5-4B-Coder-MTP-Q4_K_M.gguf", 2_783_446_560L, Family.QWEN, false,
            mtp = true,
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
        // ---- abliterated: community copies with the refusal direction removed from the weights
        // (huihui-ai's method), quantized by mradermacher or huihui-ai. Same skills as the originals,
        // sometimes a little weaker; they answer things the originals decline.
        CatalogModel(
            "abl-qwen35-4b", "Qwen3.5 4B abliterated", "huihui-ai (community)",
            "Qwen3.5 4B with its refusals removed. Answers what the original declines; otherwise much the same model. Sees pictures.",
            "mradermacher/Huihui-Qwen3.5-4B-abliterated-GGUF", "Huihui-Qwen3.5-4B-abliterated.Q4_K_M.gguf", 2_707_514_688L,
            Family.QWEN, false,
            pictures = ExtraFile("Huihui-Qwen3.5-4B-abliterated.mmproj-f16.gguf", 672_423_552L, "mradermacher/Huihui-Qwen3.5-4B-abliterated-GGUF"),
        ),
        CatalogModel(
            "abl-qwen35-2b", "Qwen3.5 2B abliterated", "huihui-ai (community)",
            "The smaller Qwen3.5 with its refusals removed: faster, lighter, sees pictures.",
            "mradermacher/Huihui-Qwen3.5-2B-abliterated-GGUF", "Huihui-Qwen3.5-2B-abliterated.Q4_K_M.gguf", 1_270_809_024L,
            Family.QWEN, false,
            pictures = ExtraFile("Huihui-Qwen3.5-2B-abliterated.mmproj-f16.gguf", 668_227_200L, "mradermacher/Huihui-Qwen3.5-2B-abliterated-GGUF"),
        ),
        CatalogModel(
            "abl-gemma4-e4b", "Gemma 4 E4B abliterated", "huihui-ai (community)",
            "Gemma 4 E4B with its refusals removed. The strongest uncensored all-rounder here. Sees pictures.",
            "mradermacher/Huihui-gemma-4-E4B-it-abliterated-GGUF", "Huihui-gemma-4-E4B-it-abliterated.Q4_K_M.gguf", 5_335_286_272L,
            Family.GEMMA, false, ple = true,
            pictures = ExtraFile("Huihui-gemma-4-E4B-it-abliterated.mmproj-f16.gguf", 990_372_672L, "mradermacher/Huihui-gemma-4-E4B-it-abliterated-GGUF"),
        ),
        CatalogModel(
            "abl-gemma4-e2b", "Gemma 4 E2B abliterated", "huihui-ai (community)",
            "Gemma 4 E2B (Google's quantization-trained version) with its refusals removed. Faster than E4B. Sees pictures.",
            "huihui-ai/Huihui-gemma-4-E2B-it-qat-q4_0-unquantized-abliterated-GGUF",
            "Huihui-gemma-4-E2B-it-qat-q4_0-unquantized-abliterated-Q4_K.gguf", 3_416_118_240L, Family.GEMMA, false, ple = true,
            pictures = ExtraFile("mmproj-model-bf16.gguf", 986_833_408L, "huihui-ai/Huihui-gemma-4-E2B-it-qat-q4_0-unquantized-abliterated-GGUF"),
        ),
        CatalogModel(
            "abl-llama32-3b", "Llama 3.2 3B abliterated", "huihui-ai (community)",
            "Meta's Llama 3.2 3B with its refusals removed. A plain, steady chat model.",
            "mradermacher/Llama-3.2-3B-Instruct-abliterated-GGUF", "Llama-3.2-3B-Instruct-abliterated.Q4_K_M.gguf", 2_241_004_512L,
            Family.LLAMA, false,
        ),
        CatalogModel(
            "abl-lfm25-1.2b", "LFM2.5 1.2B abliterated", "huihui-ai (community)",
            "Liquid's fast phone model with its refusals removed.",
            "mradermacher/Huihui-LFM2.5-1.2B-Instruct-abliterated-GGUF", "Huihui-LFM2.5-1.2B-Instruct-abliterated.Q4_K_M.gguf",
            730_896_000L, Family.LIQUID, false,
        ),
        CatalogModel(
            "abl-qwen35-9b", "Qwen3.5 9B Opus abliterated", "huihui-ai (community)",
            "Qwen3.5 9B tuned on Claude-style reasoning, refusals removed, squeezed to about 3 bits. Smarter on hard " +
                "questions but slower; close other apps first. Sees pictures.",
            "mradermacher/Huihui-Qwen3.5-9B-Claude-4.6-Opus-abliterated-GGUF",
            "Huihui-Qwen3.5-9B-Claude-4.6-Opus-abliterated.Q3_K_S.gguf", 4_259_403_840L, Family.QWEN, false, large = true,
            pictures = ExtraFile("Huihui-Qwen3.5-9B-Claude-4.6-Opus-abliterated.mmproj-Q8_0.gguf", 624_230_080L,
                "mradermacher/Huihui-Qwen3.5-9B-Claude-4.6-Opus-abliterated-GGUF"),
        ),
        // ---- Bigger than 4B: these only fit an 8 GB phone squeezed to about 3 bits, with other apps closed.
        CatalogModel(
            "lfm25-8b-a1b", "LFM2.5 8B-A1B", "Liquid AI",
            "8B of knowledge but only about 1.5B of it works on each word (mixture of experts), so it writes nearly " +
                "as fast as a 1.5B model. Needs most of the free memory.",
            "unsloth/LFM2.5-8B-A1B-GGUF", "LFM2.5-8B-A1B-UD-Q3_K_M.gguf", 3_940_000_000L, Family.LIQUID, true, large = true,
        ),
        CatalogModel(
            "qwen35-9b-iq3", "Qwen3.5 9B (compact)", "Alibaba Qwen",
            "More than twice the size of the 4B models, squeezed to about 3 bits. Smarter on hard questions, " +
                "but slower to write. Close other apps first.",
            "unsloth/Qwen3.5-9B-MTP-GGUF", "Qwen3.5-9B-UD-IQ3_XXS.gguf", 4_300_000_000L, Family.QWEN, true, large = true,
            pictures = qwenPictures("9B", 918_000_000L), mtp = true, olderBelow = 4_150_000_000L,
        ),
        CatalogModel(
            "qwen35-9b-q3km", "Qwen3.5 9B", "Alibaba Qwen",
            "The same 9B model a little less squeezed: better answers, but it fills almost all of an 8 GB phone's " +
                "free memory. Uses low-memory mode automatically.",
            "unsloth/Qwen3.5-9B-GGUF", "Qwen3.5-9B-Q3_K_M.gguf", 4_670_000_000L, Family.QWEN, true, large = true,
            pictures = qwenPictures("9B", 918_000_000L),
        ),
        CatalogModel(
            "bonsai-27b", "Bonsai 27B (1-bit)", "PrismML",
            "Qwen3.6 27B with 1-bit weights: a 27B model in 3.8 GB, the most knowledge this phone can hold. The slowest " +
                "model here, and it needs about 4.3 GB of free memory: on an 8 GB phone close every other app first, " +
                "because if it does not fit it reads itself from storage on every step and crawls. Sees pictures.",
            "prism-ml/Bonsai-27B-gguf", "Bonsai-27B-Q1_0.gguf", 3_803_452_480L, Family.QWEN, true, large = true,
            pictures = ExtraFile("Bonsai-27B-mmproj-Q8_0.gguf", 629_246_880L, "prism-ml/Bonsai-27B-gguf"),
        ),
        // ---- OpenBMB: a 35B mixture of experts, bigger than the phone's memory; each word uses only
        // the 8 experts (of 256) it picks, about 1 GB, which low-memory mode reads ahead from storage
        CatalogModel(
            "minicpmv47-35b-fast", "MiniCPM-V 4.7 35B-A3B (fastest)", "OpenBMB",
            "35B of knowledge but only 3B works on each word, so it runs from storage even though it is bigger " +
                "than the phone's memory. The smallest build (1-2 bits): the fastest, a little less accurate. " +
                "Needs 10 GB of storage. Sees pictures.",
            "AtomicChat/MiniCPM-V-4.7-35B-A3B-GGUF", "MiniCPM-V-4.7-35B-A3B-AD-IQ2_XXS-IQ1_M.gguf", 10_100_000_000L,
            Family.QWEN, false, large = true,
            pictures = ExtraFile("mmproj-model-f16.gguf", 1_119_575_840L, "openbmb/MiniCPM-V-4.7-35B-A3B-gguf"),
        ),
        CatalogModel(
            "minicpmv47-35b", "MiniCPM-V 4.7 35B-A3B", "OpenBMB",
            "The same 35B mixture of experts at about 2 bits: better answers than the fastest build, about 10% slower. " +
                "Needs 11 GB of storage. Sees pictures.",
            "AtomicChat/MiniCPM-V-4.7-35B-A3B-GGUF", "MiniCPM-V-4.7-35B-A3B-AD-IQ2_XS-IQ2_XXS.gguf", 11_300_000_000L,
            Family.QWEN, false, large = true,
            pictures = ExtraFile("mmproj-model-f16.gguf", 1_119_575_840L, "openbmb/MiniCPM-V-4.7-35B-A3B-gguf"),
        ),
        CatalogModel(
            "gemma4-12b", "Gemma 4 12B", "Google",
            "The biggest Gemma that fits: Gemma 4 12B squeezed to about 3 bits. Smarter than E4B, sees pictures " +
                "and hears sound, but writes much slower. Close other apps first.",
            "unsloth/gemma-4-12b-it-GGUF", "gemma-4-12b-it-UD-IQ3_XXS.gguf", 4_640_000_000L, Family.GEMMA, true, large = true,
            pictures = ExtraFile("mmproj-F16.gguf", 175_000_000L, "unsloth/gemma-4-12b-it-GGUF"), hears = true,
        ),
    )

    fun byFile(file: String): CatalogModel? = models.firstOrNull { it.file == file }
}

/** A .gguf file in the app's model folder. */
data class LocalModel(val file: File, val catalog: CatalogModel?) {
    val ple: Boolean get() = catalog?.ple ?: Regex("gemma-?[34]n?-e[24]b", RegexOption.IGNORE_CASE).containsMatchIn(file.name)
    val displayName: String get() = catalog?.name ?: file.name.removeSuffix(".gguf")
    val sizeBytes: Long get() = file.length()
    val family: Family
        get() = catalog?.family ?: run {
            val n = file.name.lowercase()
            when {
                "gemma" in n -> Family.GEMMA
                "qwen" in n || "qwopus" in n -> Family.QWEN
                "llama" in n -> Family.LLAMA
                "lfm" in n -> Family.LIQUID
                "mistral" in n || "ministral" in n -> Family.MISTRAL
                else -> Family.OTHER
            }
        }

    /** Where its companion files live: models/extras/<model file>/. */
    val extrasDir: File get() = File(file.parentFile, "extras/${file.name}")
    val picturesFile: File get() = File(extrasDir, "mmproj.gguf")
    val drafterFile: File get() = File(extrasDir, "drafter.gguf")
    val hasPictures: Boolean get() = picturesFile.isFile
    val hasDrafter: Boolean get() = drafterFile.isFile

    /** Downloaded before the catalog switched to the file with the MTP head (same name, smaller). */
    val isOlderCopy: Boolean get() = (catalog?.olderBelow ?: 0L) > 0 && file.length() in 1 until catalog!!.olderBelow
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

    /** Starts a download; returns why it could not start, or null. */
    fun download(url: String, fileName: String, title: String): String? {
        failures.remove(fileName)
        File(dir, "$fileName.part").apply { parentFile?.mkdirs() }.delete()
        val request = DownloadManager.Request(Uri.parse(url))
            .setTitle(title)
            .setDescription("Model for Offline AI")
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            .setDestinationInExternalFilesDir(context, "models", "$fileName.part")
            .setAllowedOverMetered(true)
            .setAllowedOverRoaming(false)
            .addRequestHeader("User-Agent", "OfflineAI/0.1 (Android)")
        return try {
            val id = dm.enqueue(request)
            prefs.edit().putLong(fileName, id).apply()
            null
        } catch (e: Exception) {
            "Android's download manager refused the download: ${e.message ?: e}"
        }
    }

    fun cancel(fileName: String) {
        val id = prefs.getLong(fileName, -1)
        if (id >= 0) runCatching { dm.remove(id) }
        prefs.edit().remove(fileName).apply()
        File(dir, "$fileName.part").delete()
    }

    fun delete(model: LocalModel): Boolean {
        model.extrasDir.deleteRecursively()
        return model.file.delete()
    }

    /** The download key of a model's companion file ("extras/<model>/mmproj.gguf"). */
    fun companionKey(model: String, kind: String) = "extras/$model/$kind.gguf"

    fun downloadCompanion(modelFile: String, kind: String, c: ExtraFile, title: String): String? {
        File(dir, "extras/$modelFile").mkdirs()
        return download(c.url, companionKey(modelFile, kind), title)
    }

    fun deleteCompanion(model: LocalModel, kind: String) {
        File(model.extrasDir, "$kind.gguf").delete()
    }

    /** Current downloads; finished ones are checked and moved into place on the way. */
    fun poll(): List<DownloadState> {
        val out = mutableListOf<DownloadState>()
        for ((fileName, value) in prefs.all) {
            val id = (value as? Long) ?: continue
            val cursor = try {
                dm.query(DownloadManager.Query().setFilterById(id))
            } catch (e: Exception) {
                null
            } ?: continue
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
                        finish(fileName, localUri, total)
                    }
                    DownloadManager.STATUS_FAILED -> {
                        prefs.edit().remove(fileName).apply()
                        runCatching { dm.remove(id) }
                        failures[fileName] = describeFailure(reason)
                    }
                    else -> out.add(DownloadState(fileName, status, done, total, reason))
                }
            }
        }
        return out
    }

    private fun finish(fileName: String, localUri: String?, serverSize: Long) {
        val part = localUri?.let { Uri.parse(it).path }?.let { File(it) } ?: File(dir, "$fileName.part")
        // The size the server announced is the reference; a file cut short is caught here.
        val problem = checkGguf(part, if (serverSize > 0) serverSize else null)
        if (problem != null) {
            part.delete()
            failures[fileName] = problem
            return
        }
        val target = File(dir, fileName)
        target.parentFile?.mkdirs()
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

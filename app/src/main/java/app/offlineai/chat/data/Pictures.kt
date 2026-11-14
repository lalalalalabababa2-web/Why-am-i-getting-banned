package app.offlineai.chat.data

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import org.json.JSONObject
import java.io.File

/**
 * A model that makes pictures. Each was tried on real prompts before going in the list, with the
 * settings it was made for (few steps, little or no guidance), so a picture takes seconds to a
 * few minutes on a phone's CPU. Times in the blurbs: on four ARM server cores (CI), 4 threads.
 */
data class PictureModel(
    val id: String,
    val name: String,
    val maker: String,
    val blurb: String,
    val repo: String,
    val file: String,
    val sizeBytes: Long,
    /** The steps it was made for (the Steps control starts here; 1 to MAX_STEPS). */
    val steps: Int,
    val sampler: String,
    /** The tiny decoder it uses (about half the time of the full one, the same picture to the eye), if any. */
    val decoder: PictureCatalog.Decoder?,
    /** Its own size: it was trained at this many pixels a side and draws best there. */
    val native: Int = 512,
    /** Guidance: 1 for the distilled models (no second pass), more for the ones that need it. */
    val cfg: Float = 1f,
    /** Kept out of every picture (only for models with guidance above 1). */
    val negative: String = "",
    val license: String,
    /** Bigger and slower: SDXL class. */
    val xl: Boolean = false,
    /** The noise schedule it was made for ("" for the library's default). */
    val scheduler: String = "",
) {
    val url: String get() = "https://huggingface.co/$repo/resolve/main/$file?download=true"
    /** Where it is kept: in the models folder, under pictures/ (so the chat model list leaves it alone). */
    val key: String get() = "pictures/$file"
}

object PictureCatalog {
    const val MAX_STEPS = 30

    /** The tiny decoders (10 MB each): one for Stable Diffusion 1 and 2, one for SDXL. */
    enum class Decoder(val repo: String, val key: String) {
        SD("madebyollin/taesd", "pictures/taesd.safetensors"),
        SDXL("madebyollin/taesdxl", "pictures/taesdxl.safetensors");

        val url: String get() = "https://huggingface.co/$repo/resolve/main/diffusion_pytorch_model.safetensors?download=true"
    }

    private const val NEGATIVE = "blurry, low quality, deformed, bad anatomy, extra fingers, watermark, text"

    // Best looking first. Times: one 512 or 768 pixel picture on four CPU cores, 4 threads.
    val models = listOf(
        PictureModel(
            id = "dreamshaper-xl", name = "DreamShaper XL Turbo", maker = "Lykon",
            blurb = "The best looking here: SDXL pictures at 768 pixels with rich, natural detail, photos and art " +
                "alike, in six steps. About 2 minutes.",
            repo = "off-grid-ai/dreamshaper-xl-v2-turbo-GGUF", file = "dreamshaper-xl-v2-turbo-Q4_K.gguf",
            sizeBytes = 2_798_084_896L, steps = 6, sampler = "euler_a", scheduler = "karras",
            decoder = Decoder.SDXL, native = 768, xl = true,
            license = "CreativeML OpenRAIL++-M",
        ),
        PictureModel(
            id = "realvis-xl", name = "RealVisXL 5 Lightning", maker = "SG_161222",
            blurb = "Photographs that look real, SDXL at 768 pixels in five steps: light, fur, skin. About 2 to 4 minutes.",
            repo = "off-grid-ai/realvisxl-v5.0-lightning-GGUF", file = "realvisxl-v5.0-lightning-Q4_K.gguf",
            sizeBytes = 2_797_755_008L, steps = 5, sampler = "euler_a", scheduler = "karras",
            decoder = Decoder.SDXL, native = 768, xl = true,
            license = "CreativeML OpenRAIL++-M",
        ),
        PictureModel(
            id = "realistic-vision", name = "Realistic Vision 6 Hyper", maker = "SG_161222",
            blurb = "Real-looking photographs at 512 pixels in six steps, with soft natural light. A smaller download " +
                "than the XL models; about 2 to 4 minutes.",
            repo = "second-state/Realistic_Vision_V6.0_B1-GGUF", file = "realisticVisionV60B1_v51HyperVAE-Q4_k.gguf",
            sizeBytes = 1_621_979_488L, steps = 6, sampler = "euler_a", scheduler = "karras", decoder = Decoder.SD,
            cfg = 1.5f, negative = NEGATIVE,
            license = "CreativeML OpenRAIL-M",
        ),
        PictureModel(
            id = "sd-turbo", name = "SD-Turbo", maker = "Stability AI",
            blurb = "Photos, people and animals with good detail in two steps. About half a minute.",
            repo = "Green-Sky/SD-Turbo-GGUF", file = "sd_turbo-f16-q8_0.gguf",
            sizeBytes = 2_023_745_376L, steps = 2, sampler = "euler_a", decoder = Decoder.SD,
            license = "Stability AI Community License (non-commercial)",
        ),
        PictureModel(
            id = "sdxs", name = "SDXS 512", maker = "IDKiro (distilled from Stable Diffusion)",
            blurb = "The quickest: a picture in one step, about 8 seconds. Good for ideas and sketches; " +
                "less detail than the others.",
            repo = "concedo/sdxs-512-tinySDdistilled-GGUF", file = "sdxs-512-tinySDdistilled_Q8_0.gguf",
            sizeBytes = 682_847_200L, steps = 1, sampler = "euler_a", decoder = null,
            license = "OpenRAIL++",
        ),
        PictureModel(
            id = "dreamshaper-lcm", name = "DreamShaper 8 LCM", maker = "Lykon",
            blurb = "Artistic: paintings, fantasy and illustration in four steps, about a minute. Warm, rich colour.",
            repo = "stduhpf/dreamshaper-8LCM-im-GGUF-sdcpp", file = "dreamshaper_8LCM-iq4_nl.gguf",
            sizeBytes = 1_570_742_432L, steps = 4, sampler = "lcm", decoder = Decoder.SD,
            license = "CreativeML OpenRAIL-M",
        ),
        PictureModel(
            id = "dmd2", name = "DreamShaper DMD2", maker = "Lykon, distilled with DMD2",
            blurb = "Moody and cinematic: strong light and shadow in four steps, about a minute.",
            repo = "mrfatso/DMD2-dreamshaper-v1-5-GGUF", file = "DMD2-dreamshaper-v1-5-q4_0.gguf",
            sizeBytes = 1_575_490_304L, steps = 4, sampler = "lcm", decoder = Decoder.SD,
            license = "CreativeML OpenRAIL-M",
        ),
    )

    fun byId(id: String?): PictureModel? = models.firstOrNull { it.id == id }
}

/**
 * The one line the picture maker holds: nothing sexual with children. A prompt that puts sexual
 * words together with words for children or young teenagers is refused, and a sexual prompt
 * otherwise gets children kept out of the picture (its negative prompt), so a model never drifts
 * young. Nothing else is filtered.
 */
object PictureLine {
    private val sexual = Regex(
        "\\b(nude|naked|nsfw|sex|sexy|sexual|porn\\w*|erotic\\w*|lewd|topless|bottomless|nipples?|genitals?|" +
            "penis|vagina|breasts?|boobs?|lingerie|undress\\w*|explicit|hentai|orgasm\\w*|fetish\\w*|seductive|aroused)\\b",
        RegexOption.IGNORE_CASE,
    )
    private val young = Regex(
        "\\b(child|children|kid|kids|minor|minors|underage|under\\s*age|loli\\w*|shota\\w*|toddler\\w*|baby|babies|" +
            "infant\\w*|preteen\\w*|pre-teen\\w*|tween\\w*|teen|teens|teenager\\w*|schoolgirl\\w*|schoolboy\\w*|" +
            "little girl|little boy|young girl|young boy|elementary|middle school|junior high|" +
            "(?:[1-9]|1[0-7])\\s*(?:yo|y/o|years?\\s*old))\\b",
        RegexOption.IGNORE_CASE,
    )

    fun isSexual(prompt: String): Boolean = sexual.containsMatchIn(prompt)

    /** True when the prompt must not be made. */
    fun refuses(prompt: String): Boolean = isSexual(prompt) && young.containsMatchIn(prompt)

    /** Kept out of every sexual picture. */
    const val KEEP_OUT = "child, children, kid, teen, teenager, young, minor, underage"
}

/** A style: words added to the prompt, and words to keep out. */
data class PictureStyle(val name: String, val suffix: String, val negative: String = "")

object PictureStyles {
    val all = listOf(
        PictureStyle("None", ""),
        PictureStyle("Photo", ", professional photograph, natural light, sharp focus, detailed", "drawing, painting, cartoon, blurry"),
        PictureStyle("Cinematic", ", cinematic still, dramatic lighting, film grain, shallow depth of field", "cartoon, flat"),
        PictureStyle("Anime", ", anime illustration, clean line art, vibrant colours", "photo, realistic"),
        PictureStyle("Oil painting", ", oil painting, visible brush strokes, rich texture", "photo"),
        PictureStyle("Watercolour", ", watercolour painting, soft washes, paper texture", "photo"),
        PictureStyle("3D render", ", 3d render, soft studio lighting, octane, highly detailed", "photo, drawing"),
        PictureStyle("Pixel art", ", pixel art, 16-bit, crisp pixels, limited palette", "photo, blurry"),
        PictureStyle("Sketch", ", pencil sketch, graphite, hand drawn, paper", "colour, photo"),
    )

    fun byName(name: String?): PictureStyle = all.firstOrNull { it.name == name } ?: all[0]
}

/** One made picture and how it was made (kept next to it as JSON). */
data class Picture(
    val file: File,
    val prompt: String,
    val style: String,
    val model: String,
    val seed: Long,
    val width: Int,
    val height: Int,
    val millis: Long,
    val createdAt: Long,
    val steps: Int = 0,
) {
    val id: String get() = file.nameWithoutExtension
}

/** The pictures made on this phone, newest first: files/pictures/<id>.png with <id>.json. */
class PictureStore(context: Context) {
    val dir: File = File(context.filesDir, "pictures").apply { mkdirs() }

    fun all(): List<Picture> = (dir.listFiles() ?: emptyArray())
        .filter { it.name.endsWith(".png") }
        .mapNotNull { read(it) }
        .sortedByDescending { it.createdAt }

    private fun read(png: File): Picture? = try {
        val j = JSONObject(File(dir, png.nameWithoutExtension + ".json").readText())
        Picture(
            png, j.optString("prompt"), j.optString("style"), j.optString("model"), j.optLong("seed"),
            j.optInt("width"), j.optInt("height"), j.optLong("millis"), j.optLong("createdAt", png.lastModified()),
            j.optInt("steps"),
        )
    } catch (e: Exception) {
        Picture(png, "", "", "", 0, 0, 0, 0, png.lastModified())
    }

    fun save(bitmap: Bitmap, prompt: String, style: String, model: String, seed: Long, millis: Long, steps: Int = 0): Picture {
        val now = System.currentTimeMillis()
        val id = "pic-$now"
        val png = File(dir, "$id.png")
        png.outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
        val j = JSONObject()
            .put("prompt", prompt).put("style", style).put("model", model).put("seed", seed)
            .put("width", bitmap.width).put("height", bitmap.height).put("millis", millis).put("createdAt", now).put("steps", steps)
        File(dir, "$id.json").writeText(j.toString())
        return Picture(png, prompt, style, model, seed, bitmap.width, bitmap.height, millis, now, steps)
    }

    fun delete(p: Picture) {
        p.file.delete()
        File(dir, p.id + ".json").delete()
    }

    /** A small copy for the grid. */
    fun thumb(p: Picture, sidePx: Int): Bitmap? = try {
        val o = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(p.file.path, o)
        var sample = 1
        while (o.outWidth / (sample * 2) >= sidePx) sample *= 2
        BitmapFactory.decodeFile(p.file.path, BitmapFactory.Options().apply { inSampleSize = sample })
    } catch (e: Exception) {
        null
    }
}

package app.offlineai.chat.data

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import org.json.JSONObject
import java.io.File

/**
 * A model that makes pictures. Each was tried on real prompts before going in the list; the
 * settings are the ones it was made for (few steps, no guidance), so a picture takes seconds to
 * a minute on a phone's CPU instead of many minutes. Times in the blurbs: 512 x 512 on four ARM
 * server cores (CI), 4 threads: SDXS 7.4 s, SD-Turbo 29.5 s, DMD2 56 s, DreamShaper LCM 60 s.
 */
data class PictureModel(
    val id: String,
    val name: String,
    val maker: String,
    val blurb: String,
    val repo: String,
    val file: String,
    val sizeBytes: Long,
    val steps: Int,
    val sampler: String,
    /** Decodes with the tiny decoder (TAESD): about half the time, the same picture to the eye. */
    val tinyDecoder: Boolean,
    /** Its own size: it was trained at this many pixels a side and draws best there. */
    val native: Int = 512,
    val license: String,
) {
    val url: String get() = "https://huggingface.co/$repo/resolve/main/$file?download=true"
    /** Where it is kept: in the models folder, under pictures/ (so the chat model list leaves it alone). */
    val key: String get() = "pictures/$file"
}

object PictureCatalog {
    /** The tiny decoder the bigger models share (10 MB). */
    val decoder = ExtraFile("diffusion_pytorch_model.safetensors", 9_793_292L, "madebyollin/taesd")
    const val DECODER_KEY = "pictures/taesd.safetensors"

    val models = listOf(
        PictureModel(
            id = "sdxs", name = "SDXS 512", maker = "IDKiro (distilled from Stable Diffusion)",
            blurb = "The quickest: a picture in one step, about 8 seconds. Good for ideas and sketches; " +
                "less detail than the others.",
            repo = "concedo/sdxs-512-tinySDdistilled-GGUF", file = "sdxs-512-tinySDdistilled_Q8_0.gguf",
            sizeBytes = 682_847_200L, steps = 1, sampler = "euler_a", tinyDecoder = false,
            license = "OpenRAIL++",
        ),
        PictureModel(
            id = "sd-turbo", name = "SD-Turbo", maker = "Stability AI",
            blurb = "The best looking here: photos, people and animals with real detail in two steps. " +
                "About half a minute.",
            repo = "Green-Sky/SD-Turbo-GGUF", file = "sd_turbo-f16-q8_0.gguf",
            sizeBytes = 2_023_745_376L, steps = 2, sampler = "euler_a", tinyDecoder = true,
            license = "Stability AI Community License (non-commercial)",
        ),
        PictureModel(
            id = "dreamshaper-lcm", name = "DreamShaper 8 LCM", maker = "Lykon",
            blurb = "Artistic: paintings, fantasy and illustration in four steps, about a minute. Warm, rich colour.",
            repo = "stduhpf/dreamshaper-8LCM-im-GGUF-sdcpp", file = "dreamshaper_8LCM-iq4_nl.gguf",
            sizeBytes = 1_570_742_432L, steps = 4, sampler = "lcm", tinyDecoder = true,
            license = "CreativeML OpenRAIL-M",
        ),
        PictureModel(
            id = "dmd2", name = "DreamShaper DMD2", maker = "Lykon, distilled with DMD2",
            blurb = "Moody and cinematic: strong light and shadow in four steps, about a minute.",
            repo = "mrfatso/DMD2-dreamshaper-v1-5-GGUF", file = "DMD2-dreamshaper-v1-5-q4_0.gguf",
            sizeBytes = 1_575_490_304L, steps = 4, sampler = "lcm", tinyDecoder = true,
            license = "CreativeML OpenRAIL-M",
        ),
    )

    fun byId(id: String?): PictureModel? = models.firstOrNull { it.id == id }
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
        )
    } catch (e: Exception) {
        Picture(png, "", "", "", 0, 0, 0, 0, png.lastModified())
    }

    fun save(bitmap: Bitmap, prompt: String, style: String, model: String, seed: Long, millis: Long): Picture {
        val now = System.currentTimeMillis()
        val id = "pic-$now"
        val png = File(dir, "$id.png")
        png.outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
        val j = JSONObject()
            .put("prompt", prompt).put("style", style).put("model", model).put("seed", seed)
            .put("width", bitmap.width).put("height", bitmap.height).put("millis", millis).put("createdAt", now)
        File(dir, "$id.json").writeText(j.toString())
        return Picture(png, prompt, style, model, seed, bitmap.width, bitmap.height, millis, now)
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

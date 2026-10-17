package app.offlineai.chat.data

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Bitmap
import android.graphics.ImageDecoder
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMetadataRetriever
import android.media.MediaRecorder
import android.net.Uri
import android.os.SystemClock
import android.provider.OpenableColumns
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.Locale
import java.util.UUID

/**
 * Turns what you pick into files the engine reads: JPEG pictures (a video becomes a few of
 * them, spread over its length) and 16 kHz mono WAV sound. Everything is copied into the app's
 * own storage, so a chat keeps its attachments even if the originals are deleted.
 */
object MediaImport {
    const val SAMPLE_RATE = 16_000

    fun displayName(context: Context, uri: Uri): String = try {
        context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c ->
            if (c.moveToFirst()) c.getString(0) ?: "" else ""
        } ?: ""
    } catch (e: Exception) {
        ""
    }

    private fun newFile(dir: File, ext: String) = File(dir.apply { mkdirs() }, "${UUID.randomUUID()}.$ext")

    private fun saveJpeg(bitmap: Bitmap, file: File) {
        FileOutputStream(file).use { out ->
            if (!bitmap.compress(Bitmap.CompressFormat.JPEG, 90, out)) throw IOException("The picture could not be saved.")
        }
    }

    /** A picture, scaled so its longest side is at most [maxSide] pixels (models shrink it anyway). */
    fun image(context: Context, uri: Uri, dir: File, maxSide: Int): Attachment {
        val bitmap = try {
            ImageDecoder.decodeBitmap(ImageDecoder.createSource(context.contentResolver, uri)) { decoder, info, _ ->
                val w = info.size.width
                val h = info.size.height
                val longest = maxOf(w, h)
                if (longest > maxSide) {
                    val scale = maxSide.toFloat() / longest
                    decoder.setTargetSize(maxOf(1, (w * scale).toInt()), maxOf(1, (h * scale).toInt()))
                }
                // a software bitmap, so it can be written out as JPEG
                decoder.allocator = ImageDecoder.ALLOCATOR_SOFTWARE
            }
        } catch (e: Exception) {
            throw IOException("That picture could not be opened (${e.message ?: "unknown format"}).")
        }
        val file = newFile(dir, "jpg")
        try {
            saveJpeg(bitmap, file)
        } finally {
            bitmap.recycle()
        }
        return Attachment("image", listOf(file.absolutePath), name = displayName(context, uri))
    }

    fun timeLabel(ms: Long): String = String.format(Locale.US, "[%dm%.1fs]", ms / 60_000, (ms % 60_000) / 1000.0)

    /** A video as [frames] pictures evenly spread over its length, each labelled with its time. */
    fun video(context: Context, uri: Uri, dir: File, frames: Int, maxSide: Int): Attachment {
        val r = MediaMetadataRetriever()
        try {
            r.setDataSource(context, uri)
            val duration = r.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull() ?: 0L
            val w = r.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)?.toIntOrNull() ?: 0
            val h = r.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)?.toIntOrNull() ?: 0
            val longest = maxOf(w, h)
            val scale = if (longest > maxSide) maxSide.toFloat() / longest else 1f
            val n = if (duration <= 0) 1 else frames.coerceIn(1, 32)
            val files = mutableListOf<String>()
            val labels = mutableListOf<String>()
            for (i in 0 until n) {
                val tMs = if (duration <= 0) 0L else duration * (2 * i + 1) / (2L * n)
                val bmp = if (w > 0 && h > 0) {
                    r.getScaledFrameAtTime(tMs * 1000, MediaMetadataRetriever.OPTION_CLOSEST_SYNC,
                        maxOf(1, (w * scale).toInt()), maxOf(1, (h * scale).toInt()))
                } else {
                    r.getFrameAtTime(tMs * 1000, MediaMetadataRetriever.OPTION_CLOSEST_SYNC)
                } ?: continue
                val f = newFile(dir, "jpg")
                try {
                    saveJpeg(bmp, f)
                } finally {
                    bmp.recycle()
                }
                files += f.absolutePath
                labels += timeLabel(tMs)
            }
            if (files.isEmpty()) throw IOException("No pictures could be read from that video.")
            return Attachment("video", files, labels, displayName(context, uri), duration)
        } catch (e: IOException) {
            throw e
        } catch (e: Exception) {
            throw IOException("That video could not be read (${e.message ?: "unknown format"}).")
        } finally {
            runCatching { r.release() }
        }
    }

    /** Sound from any file Android can decode, as at most [maxSeconds] of 16 kHz mono WAV. */
    fun audio(context: Context, uri: Uri, dir: File, maxSeconds: Int): Attachment {
        val ex = MediaExtractor()
        var codec: MediaCodec? = null
        try {
            ex.setDataSource(context, uri, null)
            var format: MediaFormat? = null
            for (i in 0 until ex.trackCount) {
                val f = ex.getTrackFormat(i)
                if ((f.getString(MediaFormat.KEY_MIME) ?: "").startsWith("audio/")) {
                    ex.selectTrack(i)
                    format = f
                    break
                }
            }
            if (format == null) throw IOException("That file has no sound in it.")
            val mime = format.getString(MediaFormat.KEY_MIME) ?: throw IOException("Unknown sound format.")
            val c = MediaCodec.createDecoderByType(mime)
            codec = c
            c.configure(format, null, null, 0)
            c.start()
            var rate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
            var channels = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT).coerceAtLeast(1)
            var encoding = AudioFormat.ENCODING_PCM_16BIT
            var mono = FloatArray(rate * 4)
            var count = 0
            fun add(v: Float) {
                if (count == mono.size) mono = mono.copyOf(mono.size * 2)
                mono[count++] = v
            }
            val info = MediaCodec.BufferInfo()
            var inputDone = false
            var outputDone = false
            val started = SystemClock.uptimeMillis()
            while (!outputDone) {
                if (SystemClock.uptimeMillis() - started > 60_000) throw IOException("Reading that sound took too long.")
                if (!inputDone) {
                    val inIdx = c.dequeueInputBuffer(10_000)
                    if (inIdx >= 0) {
                        val buf = c.getInputBuffer(inIdx) ?: throw IOException("The sound decoder failed.")
                        val n = ex.readSampleData(buf, 0)
                        if (n < 0) {
                            c.queueInputBuffer(inIdx, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
                            inputDone = true
                        } else {
                            c.queueInputBuffer(inIdx, 0, n, ex.sampleTime, 0)
                            ex.advance()
                        }
                    }
                }
                val outIdx = c.dequeueOutputBuffer(info, 10_000)
                if (outIdx == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
                    val of = c.outputFormat
                    rate = of.getInteger(MediaFormat.KEY_SAMPLE_RATE)
                    channels = of.getInteger(MediaFormat.KEY_CHANNEL_COUNT).coerceAtLeast(1)
                    if (of.containsKey(MediaFormat.KEY_PCM_ENCODING)) encoding = of.getInteger(MediaFormat.KEY_PCM_ENCODING)
                } else if (outIdx >= 0) {
                    val ob = c.getOutputBuffer(outIdx)
                    if (ob != null && info.size > 0) {
                        ob.position(info.offset)
                        ob.limit(info.offset + info.size)
                        ob.order(ByteOrder.LITTLE_ENDIAN)
                        if (encoding == AudioFormat.ENCODING_PCM_FLOAT) {
                            val fb = ob.slice().order(ByteOrder.LITTLE_ENDIAN).asFloatBuffer()
                            while (fb.remaining() >= channels) {
                                var sum = 0f
                                repeat(channels) { sum += fb.get() }
                                add(sum / channels)
                            }
                        } else {
                            val sb = ob.slice().order(ByteOrder.LITTLE_ENDIAN).asShortBuffer()
                            while (sb.remaining() >= channels) {
                                var sum = 0f
                                repeat(channels) { sum += sb.get() / 32768f }
                                add(sum / channels)
                            }
                        }
                    }
                    c.releaseOutputBuffer(outIdx, false)
                    if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) outputDone = true
                    if (count >= maxSeconds.toLong() * rate) outputDone = true
                }
            }
            val take = minOf(count, (maxSeconds.toLong() * rate).toInt())
            if (take <= 0) throw IOException("That file has no sound in it.")
            val pcm = resample(mono, take, rate, SAMPLE_RATE)
            val file = newFile(dir, "wav")
            writeWav(file, pcm, pcm.size, SAMPLE_RATE)
            return Attachment("audio", listOf(file.absolutePath), name = displayName(context, uri),
                durationMs = pcm.size * 1000L / SAMPLE_RATE)
        } catch (e: IOException) {
            throw e
        } catch (e: Exception) {
            throw IOException("That sound could not be read (${e.message ?: "unknown format"}).")
        } finally {
            runCatching { codec?.stop() }
            runCatching { codec?.release() }
            runCatching { ex.release() }
        }
    }

    /** Linear resampling; plenty for speech going into a model. */
    fun resample(src: FloatArray, n: Int, from: Int, to: Int): FloatArray {
        if (from == to) return src.copyOf(n)
        val outN = (n.toLong() * to / from).toInt().coerceAtLeast(1)
        val out = FloatArray(outN)
        val step = from.toDouble() / to
        for (i in 0 until outN) {
            val x = i * step
            val i0 = x.toInt().coerceAtMost(n - 1)
            val i1 = (i0 + 1).coerceAtMost(n - 1)
            val f = (x - i0).toFloat()
            out[i] = src[i0] * (1 - f) + src[i1] * f
        }
        return out
    }

    fun writeWav(file: File, pcm: FloatArray, n: Int, rate: Int) {
        val b = ByteBuffer.allocate(44 + n * 2).order(ByteOrder.LITTLE_ENDIAN)
        header(b, n * 2, rate)
        for (i in 0 until n) b.putShort((pcm[i].coerceIn(-1f, 1f) * 32767f).toInt().toShort())
        file.writeBytes(b.array())
    }

    fun writeWav16(file: File, pcm16: ByteArray, rate: Int) {
        val b = ByteBuffer.allocate(44 + pcm16.size).order(ByteOrder.LITTLE_ENDIAN)
        header(b, pcm16.size, rate)
        b.put(pcm16)
        file.writeBytes(b.array())
    }

    private fun header(b: ByteBuffer, dataBytes: Int, rate: Int) {
        b.put("RIFF".toByteArray(Charsets.US_ASCII))
        b.putInt(36 + dataBytes)
        b.put("WAVE".toByteArray(Charsets.US_ASCII))
        b.put("fmt ".toByteArray(Charsets.US_ASCII))
        b.putInt(16)
        b.putShort(1)            // PCM
        b.putShort(1)            // mono
        b.putInt(rate)
        b.putInt(rate * 2)
        b.putShort(2)
        b.putShort(16)
        b.put("data".toByteArray(Charsets.US_ASCII))
        b.putInt(dataBytes)
    }

    fun newSoundFile(dir: File) = newFile(dir, "wav")
}

/** Records from the microphone as 16 kHz mono, for models that hear. The caller asks for the permission. */
class SoundRecorder(private val maxSeconds: Int) {
    private var record: AudioRecord? = null
    private var thread: Thread? = null
    @Volatile private var running = false
    private val pcm = ByteArrayOutputStream()

    val seconds: Float get() = synchronized(pcm) { pcm.size() } / 2f / MediaImport.SAMPLE_RATE
    val isRecording: Boolean get() = running

    @SuppressLint("MissingPermission")
    fun start(): Boolean {
        val rate = MediaImport.SAMPLE_RATE
        val min = AudioRecord.getMinBufferSize(rate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
        if (min <= 0) return false
        val r = try {
            AudioRecord(MediaRecorder.AudioSource.MIC, rate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT, maxOf(min, rate))
        } catch (e: Exception) {
            return false
        }
        if (r.state != AudioRecord.STATE_INITIALIZED) {
            r.release()
            return false
        }
        record = r
        running = true
        r.startRecording()
        thread = Thread({
            val buf = ByteArray(3200)
            while (running) {
                val n = r.read(buf, 0, buf.size)
                if (n > 0) synchronized(pcm) { pcm.write(buf, 0, n) }
                if (seconds >= maxSeconds) running = false
            }
        }, "recorder").apply { start() }
        return true
    }

    private fun halt() {
        running = false
        thread?.join(1500)
        thread = null
        runCatching { record?.stop() }
        runCatching { record?.release() }
        record = null
    }

    /** Stops and writes what was recorded; returns its length in milliseconds (0 if nothing). */
    fun stop(file: File): Long {
        halt()
        val bytes = synchronized(pcm) { pcm.toByteArray() }
        if (bytes.size < MediaImport.SAMPLE_RATE / 5) return 0  // under a tenth of a second
        MediaImport.writeWav16(file, bytes, MediaImport.SAMPLE_RATE)
        return bytes.size / 2 * 1000L / MediaImport.SAMPLE_RATE
    }

    fun cancel() = halt()
}

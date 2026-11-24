package app.offlineai.chat.data

import android.content.Context
import java.io.BufferedInputStream
import java.io.DataInputStream
import java.io.EOFException
import java.io.File
import java.io.FileInputStream
import java.io.InputStream

/**
 * How much of a model file has to stay in memory while it writes, read from the file's own table
 * of tensors instead of guessed from its size.
 *
 * Every weight a step multiplies with is read on every word, so all of it has to fit in memory or
 * the phone reads it back from storage again and again. Two kinds of weights are only looked up a
 * row at a time: Gemma's per-layer embeddings (`per_layer_token_embd`, 1.6-2.3 GB of a Gemma 4
 * E4B file) and the token embeddings when the model has a separate output layer. Those stay in the
 * file and cost almost nothing. A Gemma 4 E4B Q4_K_M file of 4.98 GB needs 3.0 GB, not the 2.5 GB
 * that half its size suggested; NVIDIA's Nemotron Bolt file of 5.06 GB needs 3.5 GB.
 *
 * The sizes come from the tensors' offsets in the file, so no table of weight formats is needed.
 */
object GgufScan {
    data class Footprint(val residentBytes: Long, val lookupBytes: Long)

    private const val PREFS = "gguf_scan"
    private val cache = HashMap<String, Footprint>()
    private var appContext: Context? = null

    /** Called once from the Application, so results are kept between starts. */
    fun init(context: Context) {
        appContext = context.applicationContext
    }

    /** The footprint of [file], cached by name, size and time; null if it cannot be read. */
    fun footprint(file: File): Footprint? {
        val key = "${file.name}:${file.length()}:${file.lastModified()}"
        synchronized(cache) { cache[key]?.let { return it } }
        val prefs = appContext?.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        prefs?.getString(key, null)?.split(',')?.takeIf { it.size == 2 }?.let { p ->
            val fp = Footprint(p[0].toLongOrNull() ?: return@let, p[1].toLongOrNull() ?: return@let)
            synchronized(cache) { cache[key] = fp }
            return fp
        }
        val fp = runCatching { scan(file) }.getOrNull() ?: return null
        synchronized(cache) { cache[key] = fp }
        if (prefs != null) {
            // older entries for the same file name go
            val edit = prefs.edit()
            prefs.all.keys.filter { it.startsWith("${file.name}:") && it != key }.forEach { edit.remove(it) }
            edit.putString(key, "${fp.residentBytes},${fp.lookupBytes}").apply()
        }
        return fp
    }

    /** Reads the header of a GGUF file (versions 2 and 3). Throws if it is not one. */
    fun scan(file: File): Footprint {
        val total = file.length()
        CountingInput(BufferedInputStream(FileInputStream(file), 1 shl 16)).use { cin ->
            val d = DataInputStream(cin)
            val magic = ByteArray(4)
            d.readFully(magic)
            require(String(magic, Charsets.US_ASCII) == "GGUF") { "not a GGUF file" }
            val version = d.u32()
            require(version in 2..3) { "GGUF version $version" }
            val nTensors = d.u64()
            val nKv = d.u64()
            require(nTensors in 0..1_000_000 && nKv in 0..1_000_000) { "bad header" }
            var alignment = 32L
            repeat(nKv.toInt()) {
                val k = d.str()
                val t = d.u32()
                if (k == "general.alignment" && t == 4L) alignment = d.u32().coerceAtLeast(1) else d.skipValue(t)
            }
            val names = ArrayList<String>(nTensors.toInt())
            val offsets = LongArray(nTensors.toInt())
            for (i in 0 until nTensors.toInt()) {
                names += d.str()
                val nd = d.u32()
                require(nd in 0..8) { "bad tensor" }
                repeat(nd.toInt()) { d.u64() }
                d.u32()  // type
                offsets[i] = d.u64()
            }
            val dataStart = (cin.count + alignment - 1) / alignment * alignment
            val order = offsets.indices.sortedBy { offsets[it] }
            val tiedOutput = names.none { it == "output.weight" }
            var lookup = 0L
            var all = 0L
            for ((j, i) in order.withIndex()) {
                val end = if (j + 1 < order.size) offsets[order[j + 1]] else total - dataStart
                val size = (end - offsets[i]).coerceAtLeast(0)
                all += size
                val n = names[i]
                if (n.startsWith("per_layer_token_embd") || (n == "token_embd.weight" && !tiedOutput)) lookup += size
            }
            return Footprint(residentBytes = (all - lookup).coerceAtLeast(0), lookupBytes = lookup)
        }
    }

    private class CountingInput(private val inner: InputStream) : InputStream() {
        var count = 0L
        override fun read(): Int = inner.read().also { if (it >= 0) count++ }
        override fun read(b: ByteArray, off: Int, len: Int): Int = inner.read(b, off, len).also { if (it > 0) count += it }
        override fun skip(n: Long): Long {
            var left = n
            while (left > 0) {
                val s = inner.skip(left)
                if (s <= 0) {
                    if (inner.read() < 0) throw EOFException()
                    left--
                    count++
                } else {
                    left -= s
                    count += s
                }
            }
            return n
        }
        override fun close() = inner.close()
    }

    // GGUF is little-endian; DataInputStream reads big-endian
    private fun DataInputStream.u32(): Long = Integer.reverseBytes(readInt()).toLong() and 0xffffffffL
    private fun DataInputStream.u64(): Long = java.lang.Long.reverseBytes(readLong())
    private fun DataInputStream.str(): String {
        val n = u64()
        require(n in 0..(1 shl 24)) { "bad string" }
        val b = ByteArray(n.toInt())
        readFully(b)
        return String(b, Charsets.UTF_8)
    }
    private fun DataInputStream.skipN(n: Long) {
        require(n >= 0)
        var left = n
        while (left > 0) {
            val s = skip(left)
            if (s <= 0) {
                readByte()
                left--
            } else {
                left -= s
            }
        }
    }

    /** Value sizes by GGUF type: uint8 int8 uint16 int16 uint32 int32 float32 bool string array uint64 int64 float64. */
    private fun DataInputStream.skipValue(type: Long) {
        when (type) {
            0L, 1L, 7L -> skipN(1)
            2L, 3L -> skipN(2)
            4L, 5L, 6L -> skipN(4)
            10L, 11L, 12L -> skipN(8)
            8L -> skipN(u64())
            9L -> {
                val at = u32()
                val n = u64()
                require(n in 0..100_000_000) { "bad array" }
                when (at) {
                    8L -> repeat(n.toInt()) { skipN(u64()) }
                    9L -> repeat(n.toInt()) { skipValue(9L) }
                    else -> skipN(n * when (at) {
                        0L, 1L, 7L -> 1L
                        2L, 3L -> 2L
                        4L, 5L, 6L -> 4L
                        10L, 11L, 12L -> 8L
                        else -> throw IllegalArgumentException("bad array type $at")
                    })
                }
            }
            else -> throw IllegalArgumentException("bad value type $type")
        }
    }
}

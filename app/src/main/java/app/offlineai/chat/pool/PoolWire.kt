package app.offlineai.chat.pool

import org.json.JSONObject
import java.io.DataInputStream
import java.io.IOException
import java.io.InputStream
import java.io.OutputStream
import java.net.InetSocketAddress
import java.net.Socket
import java.security.MessageDigest
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * How two phones talk when one lends its memory to the other (Phones working together).
 *
 * The phone that lends runs llama.cpp's RPC server (it holds part of a model and computes its
 * layers) on its own loopback only, behind a small gate on the Wi-Fi port (LendService). The
 * phone that borrows has a gate of its own on its loopback (PoolLinks), which its engine connects
 * to as if the other phone were there. Every connection starts with:
 *
 *     MAGIC, then one letter:
 *       'S'  status: a JSON line comes back (name, free memory, busy), no code needed
 *       'V'  check a pairing code, nothing else
 *       'D'  data: after the code check, the connection carries the engine's RPC as it is
 *
 * The pairing code (6 digits, shown on the lending phone) never crosses the Wi-Fi: the lending
 * phone sends a random challenge and the other answers with an HMAC of it keyed by the code.
 * After that the RPC goes as it is. It holds numbers from the middle of the model (one row per
 * token at the point where the layers change phones), never the words of the conversation, which
 * are tokenized, embedded and turned back into words on the phone you write on.
 */
object PoolWire {
    const val SERVICE_TYPE = "_nyxpool._tcp."
    const val PORT = 50652
    const val VERSION = 1
    private val MAGIC = "NYXP1".toByteArray(Charsets.US_ASCII)

    const val STATUS = 'S'.code
    const val VERIFY = 'V'.code
    const val DATA = 'D'.code

    // the lending phone's answers
    const val CHALLENGE = 'C'.code
    const val YES = 'Y'.code
    const val NO = 'N'.code
    const val BUSY = 'B'.code
    const val LOCKED = 'L'.code

    fun hmac(code: String, nonce: ByteArray): ByteArray {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(("nyx-pool:" + code.trim()).toByteArray(Charsets.UTF_8), "HmacSHA256"))
        return mac.doFinal(nonce)
    }

    fun same(a: ByteArray, b: ByteArray): Boolean = MessageDigest.isEqual(a, b)

    fun writeMagic(out: OutputStream, kind: Int) {
        out.write(MAGIC)
        out.write(kind)
        out.flush()
    }

    /** The letter after the magic, or -1 when the connection is not one of ours. */
    fun readKind(input: InputStream): Int {
        val got = ByteArray(MAGIC.size)
        DataInputStream(input).readFully(got)
        if (!got.contentEquals(MAGIC)) return -1
        return input.read()
    }

    fun writeShort(out: OutputStream, s: String) {
        val b = s.toByteArray(Charsets.UTF_8).let { if (it.size > 200) it.copyOf(200) else it }
        out.write(b.size)
        out.write(b)
    }

    fun readShort(input: InputStream): String {
        val n = input.read()
        if (n < 0) throw IOException("closed")
        val b = ByteArray(n)
        DataInputStream(input).readFully(b)
        return String(b, Charsets.UTF_8)
    }

    fun readLine(input: InputStream, max: Int = 8192): String {
        val sb = StringBuilder()
        while (sb.length < max) {
            val c = input.read()
            if (c < 0 || c == '\n'.code) break
            sb.append(c.toChar())
        }
        return sb.toString()
    }

    fun connect(host: String, port: Int, timeoutMs: Int): Socket = Socket().apply {
        tcpNoDelay = true
        connect(InetSocketAddress(host, port), timeoutMs)
        soTimeout = timeoutMs
    }

    /**
     * What a lending phone says about itself; null when it does not answer. [myId]: this phone's,
     * when it uses that one (its asking every few seconds tells the other it is still there).
     */
    fun status(host: String, port: Int, myId: String = "", timeoutMs: Int = 2500): LendStatus? = try {
        connect(host, port, timeoutMs).use { s ->
            val out = s.getOutputStream()
            out.write(MAGIC)
            out.write(STATUS)
            writeShort(out, myId)
            out.flush()
            LendStatus.parse(readLine(s.getInputStream()))
        }
    } catch (e: Exception) {
        null
    }

    /** Why a code check or a connection was refused. */
    class Refused(message: String) : IOException(message)

    /**
     * Opens a connection that has passed the code check: [kind] DATA to carry the engine's RPC,
     * VERIFY to only check the code. Throws [Refused] with a reason a person can read.
     */
    fun open(host: String, port: Int, code: String, myId: String, myName: String, kind: Int, timeoutMs: Int = 5000): Socket {
        val s = try {
            connect(host, port, timeoutMs)
        } catch (e: Exception) {
            throw Refused("The other phone could not be reached at $host. Check that both phones are on the same Wi-Fi " +
                "(or one is on the other's hotspot) and that Lend this phone is on there.")
        }
        try {
            val out = s.getOutputStream()
            val input = s.getInputStream()
            writeMagic(out, kind)
            writeShort(out, myId)
            writeShort(out, myName)
            out.flush()
            when (input.read()) {
                CHALLENGE -> {}
                BUSY -> throw Refused("That phone is lending its memory to another phone right now.")
                LOCKED -> throw Refused("Too many wrong codes were tried; that phone waits a minute before it listens again.")
                else -> throw Refused("That phone answered something unexpected. Update Nyx on both phones.")
            }
            val nonce = ByteArray(16)
            DataInputStream(input).readFully(nonce)
            out.write(hmac(code, nonce))
            out.flush()
            when (input.read()) {
                YES -> {}
                NO -> throw Refused("Wrong code. Check the code shown on the other phone, under Lend this phone.")
                else -> throw Refused("The other phone closed the connection.")
            }
            // the RPC that follows waits as long as the other phone computes: no read timeout from here
            s.soTimeout = 0
            return s
        } catch (e: Exception) {
            runCatching { s.close() }
            throw if (e is Refused) e else Refused("The connection to the other phone broke off (${e.message ?: e}).")
        }
    }
}

/** A lending phone, as it describes itself. */
data class LendStatus(
    val id: String,
    val name: String,
    val freeRam: Long,
    val totalRam: Long,
    val cores: Int,
    /** Lending to a phone right now, and its name. */
    val busy: Boolean,
    val peer: String,
    val peerId: String,
    /** Memory the lending side holds for the other phone now. */
    val usedRam: Long,
    /** Weights it keeps on its storage, so they need not be sent again. */
    val cacheBytes: Long,
    val version: Int,
    val error: String,
) {
    fun toJson(): JSONObject = JSONObject()
        .put("id", id).put("name", name).put("free", freeRam).put("total", totalRam).put("cores", cores)
        .put("busy", busy).put("peer", peer).put("peer_id", peerId).put("used", usedRam).put("cache", cacheBytes).put("v", version)
        .put("error", error)

    companion object {
        fun parse(line: String): LendStatus? = try {
            val j = JSONObject(line)
            LendStatus(
                id = j.optString("id"),
                name = j.optString("name"),
                freeRam = j.optLong("free"),
                totalRam = j.optLong("total"),
                cores = j.optInt("cores"),
                busy = j.optBoolean("busy"),
                peer = j.optString("peer"),
                peerId = j.optString("peer_id"),
                usedRam = j.optLong("used"),
                cacheBytes = j.optLong("cache"),
                version = j.optInt("v"),
                error = j.optString("error"),
            )
        } catch (e: Exception) {
            null
        }
    }
}

/**
 * Copies one socket into another until either side closes, then closes both. Each direction has
 * its own thread; the RPC is a conversation of small messages, so nothing is held back.
 */
class Pipe(private val a: Socket, private val b: Socket, name: String, private val onEnd: () -> Unit) {
    @Volatile private var closed = false
    val isClosed: Boolean get() = closed

    init {
        Thread({ pump(a, b) }, "$name>").start()
        Thread({ pump(b, a) }, "$name<").start()
    }

    private fun pump(from: Socket, to: Socket) {
        val buf = ByteArray(256 * 1024)
        try {
            val input = from.getInputStream()
            val out = to.getOutputStream()
            while (true) {
                val n = input.read(buf)
                if (n < 0) break
                out.write(buf, 0, n)
                out.flush()
            }
        } catch (e: Exception) {
            // one side went away
        }
        close()
    }

    fun close() {
        synchronized(this) {
            if (closed) return
            closed = true
        }
        runCatching { a.close() }
        runCatching { b.close() }
        onEnd()
    }
}

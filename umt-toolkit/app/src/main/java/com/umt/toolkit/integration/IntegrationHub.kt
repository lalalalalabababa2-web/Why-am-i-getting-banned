package com.umt.toolkit.integration

import android.app.BroadcastOptions
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.SystemClock
import androidx.core.content.ContextCompat
import com.umt.sdk.Ack
import com.umt.sdk.CoerceResult
import com.umt.sdk.Diagnostics
import com.umt.sdk.EntityFrame
import com.umt.sdk.LogLine
import com.umt.sdk.PatchRequest
import com.umt.sdk.Schema
import com.umt.sdk.SetRequest
import com.umt.sdk.StreamRequest
import com.umt.sdk.UmtProtocol
import com.umt.sdk.ValuesSnapshot
import com.umt.sdk.coerce
import com.umt.toolkit.core.UmtLog
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.JsonPrimitive
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

enum class LinkState(val label: String) {
    CONNECTING("Connecting"),
    CONNECTED("Connected"),
    NO_RESPONSE("No response"),
    DISCONNECTED("Disconnected"),
}

data class KeyStatus(val state: String, val message: String? = null)

data class Session(
    val pkg: String,
    val state: LinkState = LinkState.CONNECTING,
    val schema: Schema? = null,
    val values: Map<String, JsonPrimitive> = emptyMap(),
    val keyStatus: Map<String, KeyStatus> = emptyMap(),
    val streaming: Boolean = false,
    val streamMessage: String? = null,
    val frames: Long = 0,
    val frameHz: Float = 0f,
    val lastFrameAt: Long = 0,
    val diag: Diagnostics? = null,
    val logs: List<LogLine> = emptyList(),
    val lastSeen: Long = 0,
    val dropped: Int = 0,
)

/**
 * The toolkit's end of the umt-sdk link. Talks only to packages the user connected, checks the
 * sender on Android 14+, validates every value against the app's schema before sending it,
 * and treats a missing acknowledgement as a failure rather than assuming success.
 */
class IntegrationHub(private val context: Context, private val log: UmtLog, private val scope: CoroutineScope) {
    private val _sessions = MutableStateFlow<Map<String, Session>>(emptyMap())
    val sessions: StateFlow<Map<String, Session>> = _sessions

    private val frameFlows = ConcurrentHashMap<String, MutableStateFlow<EntityFrame?>>()
    private val waiters = ConcurrentHashMap<String, CompletableDeferred<Ack>>()
    private val frameCounters = ConcurrentHashMap<String, IntArray>()
    private var started = false

    private val receiver = object : BroadcastReceiver() {
        override fun onReceive(ctx: Context, intent: Intent) {
            val claimed = intent.getStringExtra(UmtProtocol.EXTRA_SOURCE) ?: return
            if (Build.VERSION.SDK_INT >= 34) {
                val actual = sentFromPackage
                if (actual != claimed) {
                    countDropped(claimed)
                    log.w("Integration", "Dropped an event claiming to be from $claimed (sent by ${actual ?: "unknown"})")
                    return
                }
            }
            if (!_sessions.value.containsKey(claimed)) return
            handle(claimed, intent.getStringExtra(UmtProtocol.EXTRA_KIND) ?: return,
                intent.getStringExtra(UmtProtocol.EXTRA_PAYLOAD) ?: "")
        }
    }

    fun start() {
        if (started) return
        started = true
        ContextCompat.registerReceiver(context, receiver, IntentFilter(UmtProtocol.ACTION_EVENT), ContextCompat.RECEIVER_EXPORTED)
        scope.launch(kotlinx.coroutines.Dispatchers.Default) {
            while (true) {
                delay(1000)
                updateRates()
            }
        }
    }

    fun session(pkg: String?): Session? = pkg?.let { _sessions.value[it] }

    fun frames(pkg: String): StateFlow<EntityFrame?> = frameFlows.getOrPut(pkg) { MutableStateFlow(null) }

    fun connect(pkg: String) {
        _sessions.update { it + (pkg to Session(pkg, LinkState.CONNECTING, lastSeen = 0)) }
        send(pkg, UmtProtocol.CMD_HELLO, "{}")
        log.i("Integration", "Connecting to $pkg")
        scope.launch {
            delay(3000)
            val s = _sessions.value[pkg]
            if (s != null && s.state == LinkState.CONNECTING) {
                mutate(pkg) { it.copy(state = LinkState.NO_RESPONSE) }
                log.w("Integration", "$pkg did not answer. Open the app, check it includes umt-sdk and calls UmtSdk.init().")
            }
        }
    }

    fun disconnect(pkg: String) {
        if (_sessions.value[pkg]?.streaming == true) setStreaming(pkg, false, 0)
        send(pkg, UmtProtocol.CMD_BYE, "{}")
        _sessions.update { it - pkg }
        frameFlows[pkg]?.value = null
        log.i("Integration", "Disconnected from $pkg")
    }

    /** Validates locally, sends, and returns the request id (or the local rejection reason). */
    fun setValue(pkg: String, key: String, value: JsonPrimitive): Result<String> {
        val s = _sessions.value[pkg] ?: return Result.failure(IllegalStateException("not connected"))
        val schema = s.schema ?: return Result.failure(IllegalStateException("not connected yet"))
        val spec = schema.values.firstOrNull { it.key == key } ?: return Result.failure(IllegalArgumentException("unknown key $key"))
        if (!schema.allowRemoteChanges) return Result.failure(IllegalStateException("the app does not allow remote changes"))
        val v = when (val r = spec.coerce(value)) {
            is CoerceResult.Ok -> r.value
            is CoerceResult.Rejected -> return Result.failure(IllegalArgumentException(r.reason))
        }
        val id = newId()
        waiters[id] = CompletableDeferred()
        mutate(pkg) { it.copy(keyStatus = it.keyStatus + (key to KeyStatus("pending"))) }
        send(pkg, UmtProtocol.CMD_SET, UmtProtocol.json.encodeToString(SetRequest(id, key, v)))
        scope.launch {
            val ack = awaitAck(id)
            mutate(pkg) {
                val st = when {
                    ack == null -> KeyStatus("timeout", "no acknowledgement within 3 s")
                    key in ack.applied -> KeyStatus("ok")
                    else -> KeyStatus("rejected", ack.rejected[key] ?: ack.message)
                }
                it.copy(keyStatus = it.keyStatus + (key to st))
            }
        }
        return Result.success(id)
    }

    /** Sends several values at once and waits for the acknowledgement (null = timed out). */
    suspend fun applyValues(pkg: String, patchId: String, values: Map<String, JsonPrimitive>): Ack? {
        val id = newId()
        waiters[id] = CompletableDeferred()
        send(pkg, UmtProtocol.CMD_PATCH, UmtProtocol.json.encodeToString(PatchRequest(id, patchId, values)))
        return awaitAck(id)
    }

    suspend fun awaitAck(requestId: String, timeoutMs: Long = 3000): Ack? {
        val d = waiters[requestId] ?: return null
        return try {
            withTimeoutOrNull(timeoutMs) { d.await() }
        } finally {
            waiters.remove(requestId)
        }
    }

    fun setStreaming(pkg: String, enabled: Boolean, hz: Int) {
        val id = newId()
        waiters[id] = CompletableDeferred()
        send(pkg, UmtProtocol.CMD_STREAM, UmtProtocol.json.encodeToString(StreamRequest(id, enabled, hz.coerceIn(1, 60))))
        scope.launch {
            val ack = awaitAck(id)
            mutate(pkg) {
                when {
                    ack == null -> it.copy(streaming = false, streamMessage = "No answer to the stream request")
                    !ack.ok -> it.copy(streaming = false, streamMessage = ack.message ?: "Refused by the app")
                    else -> it.copy(streaming = enabled, streamMessage = ack.message)
                }
            }
            if (!enabled) frameFlows[pkg]?.value = null
        }
    }

    fun stopAllStreams() {
        _sessions.value.values.filter { it.streaming }.forEach { setStreaming(it.pkg, false, 1) }
    }

    fun clearLogs(pkg: String) = mutate(pkg) { it.copy(logs = emptyList()) }

    // ---- Incoming ----------------------------------------------------------------------------

    private fun handle(pkg: String, kind: String, payload: String) {
        if (payload.length > UmtProtocol.MAX_PAYLOAD_CHARS) return
        val now = System.currentTimeMillis()
        try {
            when (kind) {
                UmtProtocol.EV_SCHEMA -> {
                    val schema = UmtProtocol.json.decodeFromString<Schema>(payload)
                    if (schema.appPackage != pkg) return
                    mutate(pkg) { it.copy(state = LinkState.CONNECTED, schema = schema, lastSeen = now) }
                    log.i("Integration", "$pkg connected: ${schema.values.size} values, SDK ${schema.sdkVersion}, " +
                        "remote changes ${if (schema.allowRemoteChanges) "on" else "off"}, streaming ${if (schema.allowStreaming) "on" else "off"}")
                }
                UmtProtocol.EV_VALUES -> {
                    val v = UmtProtocol.json.decodeFromString<ValuesSnapshot>(payload)
                    mutate(pkg) { it.copy(values = v.values, lastSeen = now, state = if (it.schema != null) LinkState.CONNECTED else it.state) }
                }
                UmtProtocol.EV_ACK -> {
                    val ack = UmtProtocol.json.decodeFromString<Ack>(payload)
                    waiters[ack.requestId]?.complete(ack)
                    mutate(pkg) { it.copy(lastSeen = now) }
                }
                UmtProtocol.EV_FRAME -> {
                    val f = UmtProtocol.json.decodeFromString<EntityFrame>(payload)
                    val frame = if (f.entities.size > UmtProtocol.MAX_ENTITIES) f.copy(entities = f.entities.take(UmtProtocol.MAX_ENTITIES)) else f
                    frames(pkg)
                    frameFlows[pkg]?.value = frame
                    frameCounters.getOrPut(pkg) { IntArray(1) }[0]++
                }
                UmtProtocol.EV_DIAG -> {
                    val d = UmtProtocol.json.decodeFromString<Diagnostics>(payload)
                    mutate(pkg) { it.copy(diag = d, lastSeen = now) }
                }
                UmtProtocol.EV_LOG -> {
                    val l = UmtProtocol.json.decodeFromString<LogLine>(payload)
                    mutate(pkg) { it.copy(logs = (it.logs + l).takeLast(300), lastSeen = now) }
                }
                UmtProtocol.EV_GOODBYE -> {
                    mutate(pkg) { it.copy(state = LinkState.DISCONNECTED, streaming = false) }
                    frameFlows[pkg]?.value = null
                    log.i("Integration", "$pkg closed the link")
                }
            }
        } catch (e: Exception) {
            countDropped(pkg)
            log.w("Integration", "Bad '$kind' event from $pkg", e)
        }
    }

    private fun updateRates() {
        val now = SystemClock.elapsedRealtime()
        for ((pkg, counter) in frameCounters) {
            val n = counter[0]
            counter[0] = 0
            mutate(pkg) {
                if (n == 0 && it.frameHz == 0f) it
                else it.copy(frames = it.frames + n, frameHz = n.toFloat(), lastFrameAt = if (n > 0) now else it.lastFrameAt)
            }
        }
    }

    private fun countDropped(pkg: String) = mutate(pkg) { it.copy(dropped = it.dropped + 1) }

    private fun mutate(pkg: String, f: (Session) -> Session) = _sessions.update { m ->
        val s = m[pkg] ?: return@update m
        val n = f(s)
        if (n === s) m else m + (pkg to n)
    }

    private fun send(pkg: String, kind: String, payload: String) {
        val intent = Intent(UmtProtocol.ACTION_COMMAND)
            .setPackage(pkg)
            .putExtra(UmtProtocol.EXTRA_KIND, kind)
            .putExtra(UmtProtocol.EXTRA_PAYLOAD, payload)
            .putExtra(UmtProtocol.EXTRA_REPLY_TO, context.packageName)
            .putExtra(UmtProtocol.EXTRA_PROTOCOL, UmtProtocol.VERSION)
        try {
            if (Build.VERSION.SDK_INT >= 34) {
                context.sendBroadcast(intent, null, BroadcastOptions.makeBasic().setShareIdentityEnabled(true).toBundle())
            } else {
                context.sendBroadcast(intent)
            }
        } catch (e: Exception) {
            log.e("Integration", "Could not send '$kind' to $pkg", e)
        }
    }

    private fun newId() = UUID.randomUUID().toString().substring(0, 13)
}

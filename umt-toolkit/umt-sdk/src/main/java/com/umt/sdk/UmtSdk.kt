package com.umt.sdk

import android.app.BroadcastOptions
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import android.view.View
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.longOrNull

/**
 * Developer-side entry point. Add umt-sdk to an app you own, declare
 * `com.umt.integration.supported=true` in its manifest, call [init] from Application.onCreate,
 * register the values the toolkit may show or change, and publish entity frames if you want
 * the toolkit's entity overlay.
 *
 * By default remote changes and streaming are only allowed in debuggable builds of your app.
 */
object UmtSdk {
    private const val TAG = "UmtSdk"

    class Config @JvmOverloads constructor(
        /** null = only in debuggable builds */
        val allowRemoteChanges: Boolean? = null,
        /** null = only in debuggable builds */
        val allowStreaming: Boolean? = null,
        val maxStreamHz: Int = 30,
    )

    private val lock = Any()
    private val main = Handler(Looper.getMainLooper())

    @Volatile private var appContext: Context? = null
    @Volatile private var remoteChanges = false
    @Volatile private var streamingAllowed = false
    @Volatile private var maxHz = 30

    private val specs = LinkedHashMap<String, ValueSpec>()
    private val values = HashMap<String, JsonPrimitive>()
    private val listeners = HashMap<String, (JsonPrimitive) -> Unit>()

    @Volatile private var replyTo: String? = null
    @Volatile private var streaming = false
    @Volatile private var streamHz = 20
    @Volatile private var lastFrameAt = 0L
    @Volatile private var lastDiagAt = 0L
    @Volatile private var logWindowStart = 0L
    @Volatile private var logsInWindow = 0
    private var seq = 0L

    @JvmStatic
    @JvmOverloads
    fun init(context: Context, config: Config = Config()) {
        val app = context.applicationContext
        val debuggable = (app.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0
        appContext = app
        remoteChanges = config.allowRemoteChanges ?: debuggable
        streamingAllowed = config.allowStreaming ?: debuggable
        maxHz = config.maxStreamHz.coerceIn(1, 60)
        sendSchemaIfConnected()
    }

    @JvmStatic val isInitialized: Boolean get() = appContext != null
    @JvmStatic val isConnected: Boolean get() = replyTo != null
    @JvmStatic val isStreaming: Boolean get() = streaming && replyTo != null

    // ---- Registration -------------------------------------------------------------------

    @JvmStatic
    @JvmOverloads
    fun registerBool(key: String, label: String, default: Boolean, group: String = "General",
                     description: String = "", onChange: ((Boolean) -> Unit)? = null) =
        register(ValueSpec(key, label, ValueType.BOOL, JsonPrimitive(default), group, description),
            onChange?.let { cb -> { v: JsonPrimitive -> cb(v.booleanOrNull ?: default) } })

    @JvmStatic
    @JvmOverloads
    fun registerInt(key: String, label: String, default: Int, min: Int, max: Int, step: Int = 1,
                    group: String = "General", description: String = "", onChange: ((Int) -> Unit)? = null) =
        register(ValueSpec(key, label, ValueType.INT, JsonPrimitive(default), group, description,
            min.toDouble(), max.toDouble(), step.toDouble()),
            onChange?.let { cb -> { v: JsonPrimitive -> cb(v.longOrNull?.toInt() ?: default) } })

    @JvmStatic
    @JvmOverloads
    fun registerFloat(key: String, label: String, default: Float, min: Float, max: Float, step: Float = 0f,
                      group: String = "General", description: String = "", onChange: ((Float) -> Unit)? = null) =
        register(ValueSpec(key, label, ValueType.FLOAT, JsonPrimitive(default.toDouble()), group, description,
            min.toDouble(), max.toDouble(), if (step > 0f) step.toDouble() else null),
            onChange?.let { cb -> { v: JsonPrimitive -> cb(v.doubleOrNull?.toFloat() ?: default) } })

    @JvmStatic
    @JvmOverloads
    fun registerChoice(key: String, label: String, choices: List<String>, default: String, group: String = "General",
                       description: String = "", onChange: ((String) -> Unit)? = null) {
        require(default in choices) { "default '$default' is not one of $choices" }
        register(ValueSpec(key, label, ValueType.CHOICE, JsonPrimitive(default), group, description, choices = choices),
            onChange?.let { cb -> { v: JsonPrimitive -> cb(v.content) } })
    }

    private fun register(spec: ValueSpec, onChange: ((JsonPrimitive) -> Unit)?) {
        require(UmtProtocol.KEY_REGEX.matches(spec.key)) { "key '${spec.key}' must match ${UmtProtocol.KEY_REGEX}" }
        synchronized(lock) {
            specs[spec.key] = spec
            if (!values.containsKey(spec.key)) values[spec.key] = spec.default
            if (onChange != null) listeners[spec.key] = onChange else listeners.remove(spec.key)
        }
        sendSchemaIfConnected()
    }

    // ---- Reading and local changes ------------------------------------------------------

    @JvmStatic fun getBool(key: String): Boolean = synchronized(lock) { values[key]?.booleanOrNull } ?: false
    @JvmStatic fun getInt(key: String): Int = synchronized(lock) { values[key]?.longOrNull?.toInt() } ?: 0
    @JvmStatic fun getFloat(key: String): Float = synchronized(lock) { values[key]?.doubleOrNull?.toFloat() } ?: 0f
    @JvmStatic fun getString(key: String): String = synchronized(lock) { values[key]?.content } ?: ""

    /** A change made by the app itself (its own UI); the toolkit is told, the listener is not called. */
    @JvmStatic
    fun setLocal(key: String, value: Any) {
        val spec = synchronized(lock) { specs[key] } ?: return
        val primitive = when (value) {
            is Boolean -> JsonPrimitive(value)
            is Number -> JsonPrimitive(value)
            else -> JsonPrimitive(value.toString())
        }
        val result = spec.coerce(primitive)
        if (result is CoerceResult.Ok) {
            synchronized(lock) { values[key] = result.value }
            sendValues()
        } else {
            Log.w(TAG, "setLocal($key) rejected: ${(result as CoerceResult.Rejected).reason}")
        }
    }

    // ---- Publishing ---------------------------------------------------------------------

    /**
     * Sends one entity frame if the toolkit asked for a stream; throttled to the agreed rate.
     * Entity coordinates are in [view]'s pixels. Returns true if the frame was sent.
     */
    @JvmStatic
    @JvmOverloads
    fun publishFrame(view: View, entities: List<Entity>, player: Pose? = null): Boolean {
        if (!isStreaming) return false
        val loc = IntArray(2)
        view.getLocationOnScreen(loc)
        return publishFrame(loc[0], loc[1], view.width, view.height, entities, player)
    }

    @JvmStatic
    @JvmOverloads
    fun publishFrame(originX: Int, originY: Int, viewW: Int, viewH: Int, entities: List<Entity>, player: Pose? = null): Boolean {
        if (!isStreaming || viewW <= 0 || viewH <= 0) return false
        val now = SystemClock.elapsedRealtime()
        val minGap = 1000L / streamHz.coerceIn(1, maxHz)
        if (now - lastFrameAt < minGap) return false
        lastFrameAt = now
        val frame = EntityFrame(
            seq = synchronized(lock) { ++seq },
            timeMs = System.currentTimeMillis(),
            originX = originX, originY = originY, viewW = viewW, viewH = viewH,
            entities = if (entities.size > UmtProtocol.MAX_ENTITIES) entities.subList(0, UmtProtocol.MAX_ENTITIES) else entities,
            player = player,
        )
        return send(UmtProtocol.EV_FRAME, UmtProtocol.json.encodeToString(frame))
    }

    /** At most twice a second. [fps] is whatever your app measures for itself. */
    @JvmStatic
    @JvmOverloads
    fun publishDiagnostics(fps: Float? = null, metrics: Map<String, String> = emptyMap()): Boolean {
        if (!isConnected) return false
        val now = SystemClock.elapsedRealtime()
        if (now - lastDiagAt < 500) return false
        lastDiagAt = now
        return send(UmtProtocol.EV_DIAG, UmtProtocol.json.encodeToString(Diagnostics(fps, metrics.entries.take(32).associate { it.key.take(48) to it.value.take(160) })))
    }

    /** A line for the toolkit's integration console; at most 20 a second. */
    @JvmStatic
    fun log(message: String): Boolean {
        if (!isConnected) return false
        val now = SystemClock.elapsedRealtime()
        if (now - logWindowStart > 1000) { logWindowStart = now; logsInWindow = 0 }
        if (++logsInWindow > 20) return false
        return send(UmtProtocol.EV_LOG, UmtProtocol.json.encodeToString(LogLine(System.currentTimeMillis(), message.take(500))))
    }

    /** Tells the toolkit the app is going away (call from onDestroy of your last activity if you like). */
    @JvmStatic
    fun shutdown() {
        if (isConnected) send(UmtProtocol.EV_GOODBYE, "{}")
        replyTo = null
        streaming = false
    }

    // ---- Commands from the toolkit ------------------------------------------------------

    internal fun handleCommand(receiver: BroadcastReceiver, context: Context, intent: Intent) {
        val reply = intent.getStringExtra(UmtProtocol.EXTRA_REPLY_TO) ?: return
        if (reply !in UmtProtocol.TOOLKIT_PACKAGES) return
        if (Build.VERSION.SDK_INT >= 34) {
            val sender = receiver.sentFromPackage
            if (sender != reply) {
                Log.w(TAG, "ignored a command claiming to be from $reply (sent by ${sender ?: "unknown"})")
                return
            }
        }
        if (appContext == null) init(context)
        val kind = intent.getStringExtra(UmtProtocol.EXTRA_KIND) ?: return
        val payload = intent.getStringExtra(UmtProtocol.EXTRA_PAYLOAD) ?: ""
        if (payload.length > UmtProtocol.MAX_PAYLOAD_CHARS) return
        try {
            when (kind) {
                UmtProtocol.CMD_HELLO -> {
                    replyTo = reply
                    sendSchema()
                    sendValues()
                }
                UmtProtocol.CMD_BYE -> if (replyTo == reply) {
                    replyTo = null
                    streaming = false
                }
                UmtProtocol.CMD_SET -> {
                    replyTo = reply
                    val req = UmtProtocol.json.decodeFromString<SetRequest>(payload)
                    sendAck(applyRemote(req.requestId, mapOf(req.key to req.value)))
                }
                UmtProtocol.CMD_PATCH -> {
                    replyTo = reply
                    val req = UmtProtocol.json.decodeFromString<PatchRequest>(payload)
                    sendAck(applyRemote(req.requestId, req.values))
                }
                UmtProtocol.CMD_STREAM -> {
                    replyTo = reply
                    val req = UmtProtocol.json.decodeFromString<StreamRequest>(payload)
                    if (req.enabled && !streamingAllowed) {
                        sendAck(Ack(req.requestId, ok = false, message = "streaming is disabled in this build of the app"))
                    } else {
                        streaming = req.enabled
                        streamHz = req.maxHz.coerceIn(1, maxHz)
                        sendAck(Ack(req.requestId, ok = true, message = if (req.enabled) "streaming at up to $streamHz Hz" else "stream stopped"))
                    }
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "bad '$kind' command: ${e.message}")
        }
    }

    private fun applyRemote(requestId: String, requested: Map<String, JsonPrimitive>): Ack {
        if (!remoteChanges) {
            return Ack(requestId, ok = false, rejected = requested.mapValues { "remote changes are disabled in this build of the app" })
        }
        val applied = LinkedHashMap<String, JsonPrimitive>()
        val rejected = LinkedHashMap<String, String>()
        for ((key, raw) in requested) {
            val spec = synchronized(lock) { specs[key] }
            if (spec == null) { rejected[key] = "unknown key"; continue }
            when (val r = spec.coerce(raw)) {
                is CoerceResult.Rejected -> rejected[key] = r.reason
                is CoerceResult.Ok -> {
                    val previous = synchronized(lock) { values.put(key, r.value) }
                    val listener = synchronized(lock) { listeners[key] }
                    try {
                        listener?.let { cb -> runOnMain { cb(r.value) } }
                        applied[key] = r.value
                    } catch (e: Exception) {
                        synchronized(lock) { if (previous != null) values[key] = previous }
                        rejected[key] = "the app's handler failed: ${e.message}"
                    }
                }
            }
        }
        if (applied.isNotEmpty()) sendValues()
        return Ack(requestId, ok = rejected.isEmpty(), applied = applied, rejected = rejected)
    }

    private fun runOnMain(block: () -> Unit) {
        if (Looper.myLooper() == Looper.getMainLooper()) block() else main.post(block)
    }

    // ---- Sending ------------------------------------------------------------------------

    private fun sendSchemaIfConnected() { if (isConnected) sendSchema() }

    private fun sendSchema() {
        val ctx = appContext ?: return
        val version = try {
            @Suppress("DEPRECATION")
            ctx.packageManager.getPackageInfo(ctx.packageName, 0).versionName ?: "?"
        } catch (e: Exception) { "?" }
        val schema = Schema(
            protocol = UmtProtocol.VERSION,
            sdkVersion = UmtProtocol.SDK_VERSION,
            appPackage = ctx.packageName,
            appVersion = version,
            allowRemoteChanges = remoteChanges,
            allowStreaming = streamingAllowed,
            maxStreamHz = maxHz,
            values = synchronized(lock) { specs.values.toList() },
        )
        send(UmtProtocol.EV_SCHEMA, UmtProtocol.json.encodeToString(schema))
    }

    private fun sendValues() {
        val snapshot = ValuesSnapshot(synchronized(lock) { HashMap(values) })
        send(UmtProtocol.EV_VALUES, UmtProtocol.json.encodeToString(snapshot))
    }

    private fun sendAck(ack: Ack) { send(UmtProtocol.EV_ACK, UmtProtocol.json.encodeToString(ack)) }

    private fun send(kind: String, payload: String): Boolean {
        val target = replyTo ?: return false
        val ctx = appContext ?: return false
        val intent = Intent(UmtProtocol.ACTION_EVENT)
            .setPackage(target)
            .putExtra(UmtProtocol.EXTRA_KIND, kind)
            .putExtra(UmtProtocol.EXTRA_PAYLOAD, payload)
            .putExtra(UmtProtocol.EXTRA_SOURCE, ctx.packageName)
            .putExtra(UmtProtocol.EXTRA_PROTOCOL, UmtProtocol.VERSION)
        return try {
            if (Build.VERSION.SDK_INT >= 34) {
                ctx.sendBroadcast(intent, null, BroadcastOptions.makeBasic().setShareIdentityEnabled(true).toBundle())
            } else {
                ctx.sendBroadcast(intent)
            }
            true
        } catch (e: Exception) {
            Log.w(TAG, "send $kind failed: ${e.message}")
            false
        }
    }
}

/** Receives the toolkit's commands; declared in the SDK's manifest. */
class UmtCommandReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == UmtProtocol.ACTION_COMMAND) UmtSdk.handleCommand(this, context, intent)
    }
}

package com.umt.sdk

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull

/**
 * Wire protocol between the toolkit and an app that integrates umt-sdk.
 *
 * Toolkit -> app: an explicit broadcast with [ACTION_COMMAND] to the app's package.
 * App -> toolkit: an explicit broadcast with [ACTION_EVENT] to the toolkit's package.
 * Every payload is a JSON string in [EXTRA_PAYLOAD]. On Android 14+ both sides share their
 * identity with the broadcast and each side checks who actually sent it.
 */
object UmtProtocol {
    const val VERSION = 1
    const val SDK_VERSION = "1.0.0"

    /** `<meta-data android:name="com.umt.integration.supported" android:value="true"/>` */
    const val META_SUPPORTED = "com.umt.integration.supported"

    const val ACTION_COMMAND = "com.umt.sdk.action.COMMAND"
    const val ACTION_EVENT = "com.umt.toolkit.action.EVENT"

    const val EXTRA_KIND = "umt.kind"
    const val EXTRA_PAYLOAD = "umt.payload"
    const val EXTRA_REPLY_TO = "umt.replyTo"
    const val EXTRA_SOURCE = "umt.source"
    const val EXTRA_PROTOCOL = "umt.protocol"

    val TOOLKIT_PACKAGES: Set<String> = setOf("com.umt.toolkit", "com.umt.toolkit.debug")

    const val MAX_ENTITIES = 256
    const val MAX_PAYLOAD_CHARS = 200_000
    const val MAX_TEXT_LENGTH = 256

    // Commands (toolkit -> app)
    const val CMD_HELLO = "hello"
    const val CMD_SET = "set"
    const val CMD_PATCH = "patch"
    const val CMD_STREAM = "stream"
    const val CMD_BYE = "bye"

    // Events (app -> toolkit)
    const val EV_SCHEMA = "schema"
    const val EV_VALUES = "values"
    const val EV_FRAME = "frame"
    const val EV_DIAG = "diag"
    const val EV_ACK = "ack"
    const val EV_LOG = "log"
    const val EV_GOODBYE = "goodbye"

    val KEY_REGEX = Regex("^[a-z][a-z0-9_]{0,47}$")

    val json: Json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
        explicitNulls = false
    }
}

@Serializable
enum class ValueType { BOOL, INT, FLOAT, CHOICE, TEXT }

/** One value the integrated app exposes to the toolkit. */
@Serializable
data class ValueSpec(
    val key: String,
    val label: String,
    val type: ValueType,
    val default: JsonPrimitive,
    val group: String = "General",
    val description: String = "",
    val min: Double? = null,
    val max: Double? = null,
    val step: Double? = null,
    val choices: List<String> = emptyList(),
)

@Serializable
data class Schema(
    val protocol: Int,
    val sdkVersion: String,
    val appPackage: String,
    val appVersion: String,
    val allowRemoteChanges: Boolean,
    val allowStreaming: Boolean,
    val maxStreamHz: Int,
    val values: List<ValueSpec>,
)

@Serializable
data class ValuesSnapshot(val values: Map<String, JsonPrimitive>)

@Serializable
data class SetRequest(val requestId: String, val key: String, val value: JsonPrimitive)

@Serializable
data class PatchRequest(val requestId: String, val patchId: String, val values: Map<String, JsonPrimitive>)

@Serializable
data class StreamRequest(val requestId: String, val enabled: Boolean, val maxHz: Int = 20)

@Serializable
data class Ack(
    val requestId: String,
    val ok: Boolean,
    val applied: Map<String, JsonPrimitive> = emptyMap(),
    val rejected: Map<String, String> = emptyMap(),
    val message: String? = null,
)

/**
 * An entity in the integrated app's own view, in that view's pixels.
 * [visible] = false means it is off screen or behind the camera; x/y then point in its direction.
 */
@Serializable
data class Entity(
    val id: Int,
    val kind: String,
    val x: Float,
    val y: Float,
    val w: Float,
    val h: Float,
    val label: String = "",
    val distance: Float? = null,
    val health: Float? = null,
    val worldX: Float? = null,
    val worldZ: Float? = null,
    val visible: Boolean = true,
)

/** Camera/player position on the ground plane, yaw in degrees clockwise from +z. */
@Serializable
data class Pose(val x: Float, val z: Float, val yawDeg: Float)

@Serializable
data class EntityFrame(
    val seq: Long,
    val timeMs: Long,
    val originX: Int,
    val originY: Int,
    val viewW: Int,
    val viewH: Int,
    val entities: List<Entity>,
    val player: Pose? = null,
)

@Serializable
data class Diagnostics(
    val fps: Float? = null,
    val metrics: Map<String, String> = emptyMap(),
)

@Serializable
data class LogLine(val timeMs: Long, val message: String)

sealed class CoerceResult {
    data class Ok(val value: JsonPrimitive) : CoerceResult()
    data class Rejected(val reason: String) : CoerceResult()
}

/** Checks [input] against the spec's type and range. Never clamps: out of range is rejected. */
fun ValueSpec.coerce(input: JsonPrimitive): CoerceResult {
    fun rangeError(v: Double): String? {
        min?.let { if (v < it) return "${fmt(v)} is below the minimum ${fmt(it)}" }
        max?.let { if (v > it) return "${fmt(v)} is above the maximum ${fmt(it)}" }
        return null
    }
    return when (type) {
        ValueType.BOOL -> input.booleanOrNull?.let { CoerceResult.Ok(JsonPrimitive(it)) }
            ?: CoerceResult.Rejected("expected true or false, got '${input.content}'")
        ValueType.INT -> {
            val d = input.content.toDoubleOrNull()
            when {
                d == null || d.isNaN() || d.isInfinite() -> CoerceResult.Rejected("expected a whole number, got '${input.content}'")
                d != Math.floor(d) -> CoerceResult.Rejected("expected a whole number, got ${input.content}")
                else -> rangeError(d)?.let { CoerceResult.Rejected(it) } ?: CoerceResult.Ok(JsonPrimitive(d.toLong()))
            }
        }
        ValueType.FLOAT -> {
            val d = input.content.toDoubleOrNull()
            when {
                d == null || d.isNaN() || d.isInfinite() -> CoerceResult.Rejected("expected a number, got '${input.content}'")
                else -> rangeError(d)?.let { CoerceResult.Rejected(it) } ?: CoerceResult.Ok(JsonPrimitive(d))
            }
        }
        ValueType.CHOICE -> if (input.content in choices) CoerceResult.Ok(JsonPrimitive(input.content))
        else CoerceResult.Rejected("'${input.content}' is not one of ${choices.joinToString()}")
        ValueType.TEXT -> if (input.content.length <= UmtProtocol.MAX_TEXT_LENGTH) CoerceResult.Ok(JsonPrimitive(input.content))
        else CoerceResult.Rejected("text longer than ${UmtProtocol.MAX_TEXT_LENGTH} characters")
    }
}

private fun fmt(v: Double): String = if (v == Math.floor(v) && !v.isInfinite()) v.toLong().toString() else v.toString()

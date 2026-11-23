package com.umt.sdk

import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.JsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ProtocolTest {
    private val intSpec = ValueSpec("count", "Count", ValueType.INT, JsonPrimitive(4), min = 1.0, max = 64.0)
    private val floatSpec = ValueSpec("speed", "Speed", ValueType.FLOAT, JsonPrimitive(1.0), min = 0.1, max = 3.0)
    private val choiceSpec = ValueSpec("palette", "Palette", ValueType.CHOICE, JsonPrimitive("a"), choices = listOf("a", "b"))
    private val boolSpec = ValueSpec("debug", "Debug", ValueType.BOOL, JsonPrimitive(false))

    @Test fun intAcceptsWholeNumbersInRange() {
        assertEquals(CoerceResult.Ok(JsonPrimitive(12L)), intSpec.coerce(JsonPrimitive(12)))
        assertEquals(CoerceResult.Ok(JsonPrimitive(12L)), intSpec.coerce(JsonPrimitive("12")))
    }

    @Test fun intRejectsFractionsAndOutOfRange() {
        assertTrue(intSpec.coerce(JsonPrimitive(1.5)) is CoerceResult.Rejected)
        val r = intSpec.coerce(JsonPrimitive(100)) as CoerceResult.Rejected
        assertEquals("100 is above the maximum 64", r.reason)
        assertTrue(intSpec.coerce(JsonPrimitive(0)) is CoerceResult.Rejected)
    }

    @Test fun floatRejectsNanAndRange() {
        assertTrue(floatSpec.coerce(JsonPrimitive("NaN")) is CoerceResult.Rejected)
        assertTrue(floatSpec.coerce(JsonPrimitive(5.0)) is CoerceResult.Rejected)
        assertEquals(CoerceResult.Ok(JsonPrimitive(2.5)), floatSpec.coerce(JsonPrimitive(2.5)))
    }

    @Test fun choiceAndBool() {
        assertTrue(choiceSpec.coerce(JsonPrimitive("c")) is CoerceResult.Rejected)
        assertEquals(CoerceResult.Ok(JsonPrimitive("b")), choiceSpec.coerce(JsonPrimitive("b")))
        assertEquals(CoerceResult.Ok(JsonPrimitive(true)), boolSpec.coerce(JsonPrimitive("true")))
        assertTrue(boolSpec.coerce(JsonPrimitive("yes")) is CoerceResult.Rejected)
    }

    @Test fun frameRoundTrips() {
        val frame = EntityFrame(7, 1000, 0, 80, 1080, 2000,
            listOf(Entity(1, "npc", 10f, 20f, 30f, 40f, "Guard", 12.5f, 0.5f, 3f, 4f)), Pose(1f, 2f, 90f))
        val text = UmtProtocol.json.encodeToString(frame)
        assertEquals(frame, UmtProtocol.json.decodeFromString<EntityFrame>(text))
    }

    @Test fun unknownFieldsAreIgnored() {
        val ack = UmtProtocol.json.decodeFromString<Ack>("""{"requestId":"r1","ok":true,"future":42}""")
        assertEquals("r1", ack.requestId)
        assertTrue(ack.ok)
    }
}

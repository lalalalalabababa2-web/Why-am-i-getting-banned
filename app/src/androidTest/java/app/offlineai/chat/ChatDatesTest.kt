package app.offlineai.chat

import app.offlineai.chat.ui.ChatDates
import org.junit.Assert.assertEquals
import org.junit.Test
import java.time.LocalDateTime
import java.time.ZoneId
import java.util.Locale

/** The headings in the list of chats. */
class ChatDatesTest {
    private val zone = ZoneId.of("Europe/Lisbon")
    private val now = at(2026, 11, 12, 21, 0)

    private fun at(y: Int, mo: Int, d: Int, h: Int, mi: Int) =
        LocalDateTime.of(y, mo, d, h, mi).atZone(zone).toInstant().toEpochMilli()

    private fun section(t: Long) = ChatDates.section(t, now, zone, Locale.ENGLISH)

    @Test
    fun headings() {
        assertEquals("Today", section(at(2026, 11, 12, 0, 1)))
        assertEquals("Today", section(at(2026, 11, 12, 23, 59)))
        assertEquals("a clock that moved: still today", "Today", section(at(2026, 11, 14, 9, 0)))
        assertEquals("Yesterday", section(at(2026, 11, 11, 23, 59)))
        assertEquals("Yesterday", section(at(2026, 11, 11, 0, 0)))
        assertEquals("Previous 7 days", section(at(2026, 11, 10, 12, 0)))
        assertEquals("Previous 7 days", section(at(2026, 11, 6, 12, 0)))
        assertEquals("Previous 30 days", section(at(2026, 11, 5, 12, 0)))
        assertEquals("Previous 30 days", section(at(2026, 10, 14, 12, 0)))
        assertEquals("October", section(at(2026, 10, 13, 12, 0)))
        assertEquals("January", section(at(2026, 1, 2, 12, 0)))
        assertEquals("December 2025", section(at(2025, 12, 31, 12, 0)))
    }

    @Test
    fun midnightIsTheLocalOne() {
        // just after midnight on the 12th in Lisbon is still the evening of the 11th in New York
        val early = at(2026, 11, 12, 0, 30)
        assertEquals("Today", ChatDates.section(early, now, zone, Locale.ENGLISH))
        assertEquals("Yesterday", ChatDates.section(early, now, ZoneId.of("America/New_York"), Locale.ENGLISH))
    }
}

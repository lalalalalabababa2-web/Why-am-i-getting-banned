package app.offlineai.chat.ui

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.TextStyle
import java.util.Locale

/** The heading a chat goes under in the list of chats, by when it was last written in. */
object ChatDates {
    fun section(updatedAt: Long, now: Long, zone: ZoneId = ZoneId.systemDefault(), locale: Locale = Locale.getDefault()): String {
        val day = Instant.ofEpochMilli(updatedAt).atZone(zone).toLocalDate()
        val today = Instant.ofEpochMilli(now).atZone(zone).toLocalDate()
        return when {
            !day.isBefore(today) -> "Today"  // later than now (a clock that moved) counts as today
            day == today.minusDays(1) -> "Yesterday"
            day.isAfter(today.minusDays(7)) -> "Previous 7 days"
            day.isAfter(today.minusDays(30)) -> "Previous 30 days"
            day.year == today.year -> month(day, locale)
            else -> "${month(day, locale)} ${day.year}"
        }
    }

    private fun month(day: LocalDate, locale: Locale) =
        day.month.getDisplayName(TextStyle.FULL_STANDALONE, locale).replaceFirstChar { it.titlecase(locale) }
}

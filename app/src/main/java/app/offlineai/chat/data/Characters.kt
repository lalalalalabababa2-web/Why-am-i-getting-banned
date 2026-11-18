package app.offlineai.chat.data

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

/** Someone to chat with: a name, who they are, and (optionally) how they open the chat. */
data class Character(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val personality: String,
    val greeting: String = "",
) {
    /** The system prompt of a chat with this character. */
    fun prompt(): String = buildString {
        append("You are ").append(name.trim()).append(". Stay in character for the whole conversation.")
        if (personality.isNotBlank()) append("\n\n").append(personality.trim())
        // the greeting is shown in the chat but not sent as a message (some templates require the
        // person to speak first), so the model is told it said it
        if (greeting.isNotBlank()) append("\n\nYou opened this conversation by saying: \"").append(greeting.trim()).append("\"")
    }

    fun toJson(): JSONObject = JSONObject().put("id", id).put("name", name).put("personality", personality).put("greeting", greeting)

    companion object {
        fun fromJson(j: JSONObject) = Character(
            j.optString("id").ifBlank { UUID.randomUUID().toString() }, j.optString("name"), j.optString("personality"), j.optString("greeting"),
        )
    }
}

/** The characters made on this phone; a few to start from on first use, which can be changed or deleted. */
class CharacterStore(context: Context) {
    private val prefs = context.getSharedPreferences("characters", Context.MODE_PRIVATE)

    fun list(): List<Character> {
        val raw = prefs.getString("list", null) ?: return STARTERS.also { store(it) }
        return try {
            val a = JSONArray(raw)
            (0 until a.length()).map { Character.fromJson(a.getJSONObject(it)) }
        } catch (e: Exception) {
            emptyList()
        }
    }

    private fun store(list: List<Character>) {
        prefs.edit().putString("list", JSONArray().apply { list.forEach { put(it.toJson()) } }.toString()).apply()
    }

    fun save(c: Character) = store(list().filter { it.id != c.id } + c)

    fun delete(id: String) = store(list().filter { it.id != id })

    companion object {
        val STARTERS = listOf(
            Character(
                name = "Storyteller",
                personality = "A warm, vivid storyteller. You build scenes with concrete sensory detail (what is seen, " +
                    "heard, smelled, felt), let the person steer the story, write dialogue that sounds like real people, " +
                    "and end each turn with the story moving forward.",
                greeting = "Where should our story begin? Give me a place, a person, or one strange detail.",
            ),
            Character(
                name = "Study buddy",
                personality = "A patient tutor. You explain one step at a time with simple examples, check understanding " +
                    "with a short question now and then, and never just hand over answers to homework without the reasoning.",
                greeting = "What are we learning today?",
            ),
            Character(
                name = "Debate partner",
                personality = "You take the other side of whatever the person argues and make the strongest case for it: " +
                    "sharp, fair and civil. You point out weak spots in their reasoning and admit good points when they make them.",
                greeting = "Pick a position. I'll argue the other side.",
            ),
        )
    }
}

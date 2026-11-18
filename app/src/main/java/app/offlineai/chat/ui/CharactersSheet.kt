package app.offlineai.chat.ui

import android.app.Activity
import android.text.InputType
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import app.offlineai.chat.App
import app.offlineai.chat.R
import app.offlineai.chat.data.Character

/**
 * Characters: pick one to start a chat with it, make a new one, or change or delete one. A chat
 * with a character keeps its personality as the system prompt (in place of the one in Settings).
 */
object CharactersSheet {
    fun show(a: Activity, app: App, onStarted: () -> Unit = {}) {
        val all = app.characters.list()
        val sheet = Sheet(a, "Characters", "Start a chat with someone. Every model plays them; Memory still applies.")
        for (c in all) {
            sheet.item(c.name, R.drawable.ic_spark, c.personality.take(90) + if (c.personality.length > 90) "…" else "") {
                app.chat.newChatWith(c)
                onStarted()
            }
        }
        sheet.divider()
            .item("Make a character", R.drawable.ic_add) { edit(a, app, null, onStarted) }
        if (all.isNotEmpty()) {
            sheet.item("Change or delete one", R.drawable.ic_settings) { pickToEdit(a, app, onStarted) }
        }
        sheet.show()
    }

    private fun pickToEdit(a: Activity, app: App, onStarted: () -> Unit) {
        val sheet = Sheet(a, "Change or delete")
        for (c in app.characters.list()) sheet.item(c.name, R.drawable.ic_spark) { edit(a, app, c, onStarted) }
        sheet.show()
    }

    private fun field(a: Activity, value: String, hint: String, lines: Int): EditText = EditText(a).apply {
        setText(value)
        this.hint = hint
        setHintTextColor(Palette.text3)
        setTextColor(Palette.text)
        textSize = 15f * Palette.fontScale
        background = rounded(Palette.surface2, a.dp(14).toFloat(), a.dp(1), Palette.border)
        setPadding(a.dp(14), a.dp(12), a.dp(14), a.dp(12))
        if (lines > 1) {
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_MULTI_LINE or InputType.TYPE_TEXT_FLAG_CAP_SENTENCES
            minLines = 2
            maxLines = lines
        } else {
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_WORDS
            isSingleLine = true
        }
    }

    /** Makes a character ([c] null) or changes one; saving a new one starts a chat with it. */
    private fun edit(a: Activity, app: App, c: Character?, onStarted: () -> Unit) {
        val name = field(a, c?.name ?: "", "Name", 1)
        val who = field(a, c?.personality ?: "", "Who they are: personality, how they talk, what they know, what they want", 8)
        val hello = field(a, c?.greeting ?: "", "How they open the chat (optional)", 4)
        val box = LinearLayout(a).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(a.dp(20), a.dp(8), a.dp(20), 0)
            addView(name, lp(MATCH, WRAP))
            addView(who, lp(MATCH, WRAP).apply { topMargin = a.dp(10) })
            addView(hello, lp(MATCH, WRAP).apply { topMargin = a.dp(10) })
        }
        val scroll = ScrollView(a).apply { addView(box) }
        val d = AlertDialog.Builder(a)
            .setTitle(if (c == null) "Make a character" else "Change ${c.name}")
            .setView(scroll)
            .setPositiveButton(if (c == null) "Save and chat" else "Save") { _, _ ->
                val n = name.text.toString().trim().take(40)
                if (n.isEmpty()) {
                    Toast.makeText(a, "Give them a name.", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                val saved = Character(
                    id = c?.id ?: java.util.UUID.randomUUID().toString(),
                    name = n,
                    personality = who.text.toString().trim().take(4000),
                    greeting = hello.text.toString().trim().take(1000),
                )
                app.characters.save(saved)
                if (c == null) {
                    app.chat.newChatWith(saved)
                    onStarted()
                } else {
                    Toast.makeText(a, "Saved. New chats with ${saved.name} use it.", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancel", null)
        if (c != null) {
            d.setNeutralButton("Delete") { _, _ ->
                app.characters.delete(c.id)
                Toast.makeText(a, "${c.name} deleted. Chats with them stay.", Toast.LENGTH_SHORT).show()
            }
        }
        d.show()
    }
}

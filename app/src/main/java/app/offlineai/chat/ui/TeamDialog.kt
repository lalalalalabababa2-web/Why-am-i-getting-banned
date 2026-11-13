package app.offlineai.chat.ui

import android.app.Activity
import android.content.res.ColorStateList
import android.widget.LinearLayout
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import app.offlineai.chat.App
import app.offlineai.chat.data.ModelStore

/**
 * Working together: how many separate answers each message gets before the reply is written from
 * them, and who writes every second answer: the model itself, or another model on the phone,
 * loaded next to it.
 */
object TeamDialog {
    fun show(activity: Activity, app: App, onChanged: () -> Unit) {
        val s = app.settings
        val loaded = app.engine.loaded
        val others = app.models.local().filter { it.file.name != loaded?.key }

        val box = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(activity.dp(24), activity.dp(4), activity.dp(24), activity.dp(8))
        }
        box.addView(activity.text(
            "Each message is answered separately two or three times. Then the answers are checked against each " +
                "other, mistakes are looked for, and the reply is written from them. It takes as long as an " +
                "ordinary reply for each answer, plus the review.", 14f, Palette.text2,
        ))

        box.addView(activity.sectionTitle("Answers"))
        val sizes = RadioGroup(activity)
        val current = if (s.teamSize >= 2) s.teamSize.coerceAtMost(3) else 0
        for ((n, label) in listOf(0 to "One, as usual", 2 to "Two, then a review", 3 to "Three, then a review")) {
            sizes.addView(radio(activity, label, SIZE_IDS + n, n == current))
        }
        box.addView(sizes)

        box.addView(activity.sectionTitle("Every second answer by"))
        val partners = RadioGroup(activity)
        val chosen = others.indexOfFirst { it.file.name == s.teamPartner }
        partners.addView(radio(activity, "The same model" + (loaded?.let { " (${it.displayName})" } ?: ""), SAME_ID, chosen < 0))
        others.forEachIndexed { i, m ->
            val more = ModelStore.formatBytes(app.estimatedRam(m))
            partners.addView(radio(activity, "${m.displayName}, next to it (about $more more memory)", PARTNER_IDS + i, i == chosen))
        }
        box.addView(partners)
        if (others.isEmpty()) {
            box.addView(activity.text("Download another model to have two different models work together.", 13f, Palette.text3))
        }
        fun partnerChoice(on: Boolean) {
            for (k in 0 until partners.childCount) partners.getChildAt(k).isEnabled = on
        }
        partnerChoice(current >= 2)
        sizes.setOnCheckedChangeListener { _, id -> partnerChoice(id - SIZE_IDS >= 2) }

        Sheet(activity, "Work together")
            .view(box, 0)
            .button("Done") {
                val n = (sizes.checkedRadioButtonId - SIZE_IDS).let { if (it >= 2) it else 0 }
                val partner = others.getOrNull(partners.checkedRadioButtonId - PARTNER_IDS)
                val apply = {
                    s.teamSize = n
                    s.teamPartner = partner?.file?.name
                    if (n >= 2 && partner != null && app.engine.partner?.key != partner.file.name) {
                        Toast.makeText(activity, "Loading ${partner.displayName} next to the model…", Toast.LENGTH_SHORT).show()
                    }
                    app.applyTeamPartner { err ->
                        if (err != null) {
                            Toast.makeText(activity, "${partner?.displayName ?: "The partner"} could not be loaded: $err",
                                Toast.LENGTH_LONG).show()
                        }
                        onChanged()
                    }
                    onChanged()
                }
                val need = if (n >= 2 && partner != null && app.engine.partner?.key != partner.file.name) app.estimatedRam(partner) else 0L
                val free = app.availableRam()
                if (need > free) {
                    AlertDialog.Builder(activity)
                        .setTitle("This may not fit right now")
                        .setMessage("${partner?.displayName} needs about ${ModelStore.formatBytes(need)} more memory and " +
                            "${ModelStore.formatBytes(free)} is free. If both do not fit, replies crawl while the phone " +
                            "reads the models from storage again and again. Close other apps first, or pick a smaller partner.")
                        .setPositiveButton("Load anyway") { _, _ -> apply() }
                        .setNegativeButton("Cancel", null)
                        .show()
                } else {
                    apply()
                }
            }
            .show()
    }

    /** What the team is, in a few words, for menus and the message box ("" when it is off). */
    fun summary(app: App): String {
        val n = app.settings.teamSize
        if (n < 2) return ""
        val p = app.engine.partner?.takeIf { it.key == app.settings.teamPartner && it.key != app.engine.loaded?.key }
        return "${n.coerceAtMost(3)} answers, then a review" + (p?.let { ", with ${it.displayName}" } ?: "")
    }

    private fun radio(activity: Activity, label: String, id: Int, checked: Boolean) = RadioButton(activity).apply {
        this.id = id
        text = label
        textSize = 15f * Palette.fontScale
        setTextColor(Palette.text)
        buttonTintList = ColorStateList.valueOf(Palette.accent)
        isChecked = checked
        setPadding(activity.dp(4), activity.dp(8), 0, activity.dp(8))
    }

    private const val SIZE_IDS = 100
    private const val SAME_ID = 200
    private const val PARTNER_IDS = 300
}

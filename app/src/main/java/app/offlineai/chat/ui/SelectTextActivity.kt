package app.offlineai.chat.ui

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.LinearLayout
import android.widget.ScrollView
import androidx.appcompat.app.AppCompatActivity
import app.offlineai.chat.App

/**
 * A message on its own, where any part of it can be selected and copied. (Text in the chat
 * itself is not selectable: a selectable view scrolls the chat to its cursor as it changes.)
 */
class SelectTextActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Palette.apply(this, App.of(this).settings)
        val body = pending ?: ""
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Palette.bg)
        }
        val bar = topBar("Select text")
        bar.addView(pill("Copy all") { copyText("message", body) })
        root.addView(bar, lp(MATCH, WRAP))
        val scroll = ScrollView(this)
        scroll.addView(text(body, 15f).apply {
            setTextIsSelectable(true)
            setPadding(dp(20), dp(8), dp(20), dp(32))
        })
        root.addView(scroll, lp(MATCH, 0, 1f))
        setContentView(root)
        edgeToEdge(root)
    }

    companion object {
        // Handed over in memory: an intent extra has a size limit long replies can exceed.
        private var pending: String? = null

        fun open(context: Context, text: String) {
            pending = text
            context.startActivity(Intent(context, SelectTextActivity::class.java))
        }
    }
}

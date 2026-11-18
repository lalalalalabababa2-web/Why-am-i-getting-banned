package app.offlineai.chat.ui

import android.content.res.ColorStateList
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.SwitchCompat
import app.offlineai.chat.App
import app.offlineai.chat.data.ModelStore
import app.offlineai.chat.data.PoolMode
import app.offlineai.chat.pool.HelperPhone
import app.offlineai.chat.pool.LendService
import app.offlineai.chat.pool.LendStatus
import app.offlineai.chat.pool.Phones
import app.offlineai.chat.pool.PoolWire
import java.net.Inet4Address
import java.net.NetworkInterface
import java.util.concurrent.Executors

/**
 * Phones working together: lend this phone's memory to another one, or use other phones' memory
 * for a model too big for this one. Same Wi-Fi (or one phone on the other's hotspot); paired with
 * a 6-digit code shown on the lending phone.
 */
class PhonesActivity : AppCompatActivity(), Phones.Listener {
    private lateinit var app: App
    private lateinit var content: LinearLayout
    private val io = Executors.newSingleThreadExecutor { r -> Thread(r, "phones-screen") }
    /** What this phone's own lending says about itself, while it lends. */
    @Volatile private var mine: LendStatus? = null
    private var shown = ""

    private val tick = object : Runnable {
        override fun run() {
            if (app.settings.lending) {
                io.execute {
                    val port = LendService.localPort(this@PhonesActivity)
                    val st = if (port > 0) PoolWire.status("127.0.0.1", port) else null
                    runOnUiThread {
                        mine = st
                        refresh()
                    }
                }
            }
            content.postDelayed(this, 2000)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        app = App.of(this)
        Palette.apply(this, app.settings)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Palette.bg)
        }
        root.addView(topBar("Phones together"), lp(MATCH, WRAP))
        val scroll = ScrollView(this)
        content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, 0, 0, dp(32))
        }
        scroll.addView(content, FrameLayout.LayoutParams(MATCH, WRAP))
        root.addView(scroll, lp(MATCH, 0, 1f))
        setContentView(root)
        edgeToEdge(root)
        refresh(force = true)
    }

    override fun onResume() {
        super.onResume()
        app.phones.watching = true
        app.phones.addListener(this)
        app.phones.startDiscovery()
        content.removeCallbacks(tick)
        content.post(tick)
    }

    override fun onPause() {
        super.onPause()
        app.phones.watching = false
        app.phones.removeListener(this)
        app.phones.stopDiscovery()
        content.removeCallbacks(tick)
        // what was changed here applies to the loaded model now, not at its next load
        if (app.phones.changed && app.engine.loaded != null && !app.engine.isBusy && !app.chat.generating) {
            app.phones.changed = false
            app.reloadFresh()
            Toast.makeText(this, "Loading the model again with the phones as set…", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onDestroy() {
        io.shutdown()
        super.onDestroy()
    }

    override fun onPhonesChanged() = refresh()

    // ------------------------------------------------------------------ the screen

    /** Rebuilds the screen when what it shows has changed (the status changes every few seconds). */
    private fun refresh(force: Boolean = false) {
        if (isDestroyed) return
        val p = app.phones
        val key = buildString {
            append(app.settings.lending).append(app.settings.lendCode).append(app.settings.poolMode)
            append(mine?.let { "${it.busy}|${it.peer}|${it.usedRam / 50_000_000}|${it.cacheBytes / 50_000_000}|${it.error}" })
            for (h in p.saved()) append("|${h.id}${h.enabled}${h.name}${p.online(h.id)}${p.status(h.id)?.freeRam?.div(100_000_000)}${p.status(h.id)?.busy}${p.lastError[h.id]}${p.status(h.id)?.rttMs?.div(10)}${p.status(h.id)?.battery}")
            for (n in p.nearby()) append("|n${n.id}${n.host}")
            append(app.engine.loaded?.info?.nRemoteLayers).append(app.engine.phase)
        }
        if (!force && key == shown) return
        shown = key
        build()
    }

    private fun build() {
        content.removeAllViews()
        content.addView(text("Two phones can run one model together. The other phone holds part of the model and " +
            "works on that part, so this phone can run models bigger than its own memory. Both need to be on the same " +
            "Wi-Fi, or one on the other's hotspot (Bluetooth is far too slow for this).\n\n" +
            "It is for models that do not fit here: a model that fits is faster on one phone, because every word " +
            "waits for the Wi-Fi.", 14f, Palette.text2).apply { setPadding(dp(20), dp(4), dp(20), dp(4)) })
        lendSection()
        useSection()
        nowSection()
    }

    private fun lendSection() {
        content.addView(sectionTitle("Lend this phone"))
        val c = card().apply { setPadding(0, dp(6), 0, dp(6)) }
        content.addView(c)
        val s = app.settings
        c.addView(switchRow("Let another phone use this one",
            "Its memory and processor work on part of the other phone's model while this is on. Keep it on charge for long chats.",
            s.lending) { on -> setLending(on) })
        if (!s.lending) return
        val st = mine
        val box = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(4), dp(20), dp(12))
        }
        box.addView(text("Pairing code", 13f, Palette.text3))
        box.addView(text(LendService.spaced(s.lendCode), 34f, Palette.accent, mono = true).apply {
            letterSpacing = 0.08f
            setPadding(0, dp(2), 0, dp(2))
        })
        box.addView(text("Type it on the other phone, under Use other phones. This phone shows there as \"${s.lendName}\".",
            13f, Palette.text2))
        val addrs = addresses()
        box.addView(text(if (addrs.isEmpty()) "Not on a Wi-Fi network or hotspot right now." else
            "Its address, if the other phone does not find it by itself: " + addrs.joinToString(", "), 13f, Palette.text2).apply {
            setPadding(0, dp(8), 0, 0)
            setTextIsSelectable(true)
        })
        val state = when {
            st == null -> "Starting…"
            st.error.isNotEmpty() -> st.error
            st.busy -> "Lending to ${st.peer.ifBlank { "a phone" }} · ${ModelStore.formatBytes(st.usedRam)} in use here"
            else -> "Waiting for a phone · ${ModelStore.formatBytes(st.freeRam)} free to lend"
        }
        box.addView(text(state, 15f, if (st?.error?.isNotEmpty() == true) Palette.danger else Palette.text, bold = true).apply {
            setPadding(0, dp(12), 0, 0)
        })
        if (st != null && st.cacheBytes > 0) {
            box.addView(text("Kept here so the model loads faster next time: ${ModelStore.formatBytes(st.cacheBytes)}", 13f, Palette.text3))
        }
        val buttons = FlowLayout(this)
        buttons.addView(pill("New code") {
            s.lendCode = LendService.newCode()
            LendService.start(this, s.lendCode, s.lendName)
            refresh(force = true)
        })
        buttons.addView(pill("Rename this phone") { renameThis() })
        if (st != null && st.cacheBytes > 0 && !st.busy) {
            buttons.addView(pill("Clear what it keeps") {
                startService(android.content.Intent(this, LendService::class.java).setAction(LendService.ACTION_CLEAR_CACHE))
                Toast.makeText(this, "Cleared.", Toast.LENGTH_SHORT).show()
            })
        }
        box.addView(buttons, lp(MATCH, WRAP).apply { topMargin = dp(12) })
        if (app.engine.loaded != null) {
            box.addView(text("A model is loaded on this phone too. For lending, unload it (Models screen), so the other phone " +
                "gets this phone's memory.", 13f, Palette.caution).apply { setPadding(0, dp(10), 0, 0) })
        }
        c.addView(box)
    }

    private fun setLending(on: Boolean) {
        val s = app.settings
        if (on) {
            if (s.lendCode.isEmpty()) s.lendCode = LendService.newCode()
            s.lending = true
            LendService.start(this, s.lendCode, s.lendName)
        } else {
            s.lending = false
            mine = null
            LendService.stop(this)
        }
        refresh(force = true)
    }

    private fun renameThis() {
        val field = input(app.settings.lendName, "This phone's name")
        AlertDialog.Builder(this)
            .setTitle("This phone's name")
            .setView(padded(field))
            .setPositiveButton("Save") { _, _ ->
                val n = field.text.toString().trim().take(40)
                if (n.isNotEmpty()) {
                    app.settings.lendName = n
                    if (app.settings.lending) LendService.start(this, app.settings.lendCode, n)
                    refresh(force = true)
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun useSection() {
        content.addView(sectionTitle("Use other phones"))
        val c = card().apply { setPadding(0, dp(6), 0, dp(6)) }
        content.addView(c)
        val p = app.phones
        val mode = app.settings.poolMode
        c.addView(row("Share a model", mode.label + "\n" + mode.help) {
            val modes = PoolMode.entries
            AlertDialog.Builder(this)
                .setTitle("Share a model with other phones")
                .setSingleChoiceItems(modes.map { it.label }.toTypedArray(), modes.indexOf(mode)) { d, which ->
                    d.dismiss()
                    if (modes[which] != app.settings.poolMode) {
                        app.settings.poolMode = modes[which]
                        p.changed = true
                    }
                    refresh(force = true)
                }
                .setNegativeButton("Cancel", null)
                .show()
        })
        val saved = p.saved()
        for (h in saved) c.addView(pairedRow(h))
        val near = p.nearby()
        for (n in near) {
            c.addView(row(n.name, "Nearby, lending · tap to pair with its code") { askCode(n.name) { code -> pair(n.host, n.port, code) } })
        }
        if (saved.isEmpty() && near.isEmpty()) {
            c.addView(text("Looking for phones on this Wi-Fi… On the other phone, open Phones together and turn on Let another " +
                "phone use this one.", 13f, Palette.text2).apply { setPadding(dp(20), dp(8), dp(20), dp(8)) })
        }
        val buttons = FlowLayout(this).apply { setPadding(dp(20), dp(8), dp(20), dp(8)) }
        buttons.addView(pill("Add by address") { addByAddress() })
        c.addView(buttons, lp(MATCH, WRAP))
    }

    private fun pairedRow(h: HelperPhone): View {
        val p = app.phones
        val st = p.status(h.id)
        val err = p.lastError[h.id]
        val line = when {
            err != null && err.startsWith("Wrong code") -> "Wrong code: tap to type it again"
            !p.online(h.id) -> "Not answering. Is it on this Wi-Fi with lending on?"
            st == null -> "Asking…"
            st.error.isNotEmpty() -> "Its lending stopped working: ${st.error}"
            st.busy && st.peerId != app.settings.deviceId -> "Lending to ${st.peer.ifBlank { "another phone" }} right now"
            st.busy -> "Holding part of this phone's model · ${ModelStore.formatBytes(st.usedRam)}"
            else -> "Ready · ${ModelStore.formatBytes(st.freeRam)} free · ${st.cores} fast cores"
        } + (if (st != null && p.online(h.id)) extras(st) else "")
        return switchRow(h.name, line, h.enabled, onLongClick = { pairedMenu(h) }) { on -> p.setEnabled(h.id, on) }
    }

    /** The Wi-Fi delay (a few of these go into every word) and the battery. */
    private fun extras(st: LendStatus): String {
        val parts = mutableListOf<String>()
        if (st.rttMs >= 0) parts += "Wi-Fi delay ${st.rttMs} ms" + if (st.rttMs > 40) " (slow: closer to the router, or use a hotspot)" else ""
        if (st.battery >= 0) parts += "battery ${st.battery}%" + if (st.charging) ", charging" else ""
        return if (parts.isEmpty()) "" else "\n" + parts.joinToString(" · ")
    }

    private fun pairedMenu(h: HelperPhone) {
        Sheet(this, h.name, "${h.host}:${h.port}")
            .item("Type the code again") { askCode(h.name) { code -> pair(h.host, h.port, code) } }
            .item("Remove", danger = true) { app.phones.remove(h.id); refresh(force = true) }
            .show()
    }

    private fun askCode(name: String, onCode: (String) -> Unit) {
        val field = input("", "6-digit code").apply { inputType = InputType.TYPE_CLASS_NUMBER }
        AlertDialog.Builder(this)
            .setTitle("Code from $name")
            .setMessage("On $name: Phones together, Lend this phone. The code is shown there.")
            .setView(padded(field))
            .setPositiveButton("Pair") { _, _ -> onCode(field.text.toString().filter { it.isDigit() }) }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun pair(host: String, port: Int, code: String) {
        if (code.length != 6) {
            Toast.makeText(this, "The code has 6 digits.", Toast.LENGTH_LONG).show()
            return
        }
        Toast.makeText(this, "Checking the code…", Toast.LENGTH_SHORT).show()
        app.phones.pair(host, port, code) { err ->
            Toast.makeText(this, err ?: "Paired. Models that do not fit here now share it.", Toast.LENGTH_LONG).show()
            refresh(force = true)
        }
    }

    private fun addByAddress() {
        val addr = input("", "Address, like 192.168.1.23").apply { inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI }
        val code = input("", "6-digit code").apply { inputType = InputType.TYPE_CLASS_NUMBER }
        val box = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(8), dp(20), 0)
            addView(text("Both are on the other phone, under Phones together, Lend this phone.", 13f, Palette.text2))
            addView(addr, lp(MATCH, WRAP).apply { topMargin = dp(12) })
            addView(code, lp(MATCH, WRAP).apply { topMargin = dp(8) })
        }
        AlertDialog.Builder(this)
            .setTitle("Add a phone by address")
            .setView(box)
            .setPositiveButton("Pair") { _, _ ->
                val raw = addr.text.toString().trim()
                val host = raw.substringBefore(':').trim()
                val port = raw.substringAfter(':', "").toIntOrNull() ?: PoolWire.PORT
                if (host.isEmpty()) return@setPositiveButton
                pair(host, port, code.text.toString().filter { it.isDigit() })
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun nowSection() {
        val m = app.engine.loaded ?: return
        content.addView(sectionTitle("Now"))
        val c = card()
        content.addView(c)
        val i = m.info
        val names = m.config.rpc.mapNotNull { r -> app.phones.saved().firstOrNull { it.id == r.helperId }?.name }
        c.addView(text(if (i.nRemoteLayers > 0)
            "${m.displayName}: ${i.nRemoteLayers} of its ${i.nLayer} layers are on ${names.joinToString(" and ").ifBlank { "another phone" }}, " +
                "the rest on this phone."
        else "${m.displayName} runs on this phone alone.", 15f))
        if (app.phones.changed) {
            c.addView(text("Changes here apply when the model loads again: leaving this screen does that.", 13f, Palette.text2).apply {
                setPadding(0, dp(6), 0, 0)
            })
        }
    }

    // ------------------------------------------------------------------ small parts

    private fun row(title: String, value: String, onClick: () -> Unit): View = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(20), dp(12), dp(20), dp(12))
        background = ripple(null, 0f)
        setOnClickListener { onClick() }
        addView(text(title, 15f))
        addView(text(value, 13f, Palette.text2))
    }

    private fun switchRow(title: String, help: String, value: Boolean, onLongClick: (() -> Unit)? = null, onChange: (Boolean) -> Unit): View {
        val r = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(20), dp(12), dp(16), dp(12))
            background = ripple(null, 0f)
        }
        val texts = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        texts.addView(text(title, 15f))
        texts.addView(text(help, 13f, Palette.text2))
        r.addView(texts, lp(0, WRAP, 1f))
        val sw = SwitchCompat(this).apply {
            isChecked = value
            thumbTintList = ColorStateList(arrayOf(intArrayOf(android.R.attr.state_checked), intArrayOf()), intArrayOf(Palette.accent, Palette.text3))
            trackTintList = ColorStateList(arrayOf(intArrayOf(android.R.attr.state_checked), intArrayOf()),
                intArrayOf((Palette.accent and 0x00FFFFFF) or 0x66000000, Palette.surface3))
            setOnCheckedChangeListener { _, checked -> onChange(checked) }
        }
        r.addView(sw)
        r.setOnClickListener { sw.toggle() }
        if (onLongClick != null) r.setOnLongClickListener { onLongClick(); true }
        return r
    }

    private fun input(value: String, hintText: String): EditText = EditText(this).apply {
        setText(value)
        hint = hintText
        setHintTextColor(Palette.text3)
        setTextColor(Palette.text)
        textSize = 16f * Palette.fontScale
        background = rounded(Palette.surface2, dp(14).toFloat(), dp(1), Palette.border)
        setPadding(dp(14), dp(12), dp(14), dp(12))
        isSingleLine = true
    }

    private fun padded(v: View): View = LinearLayout(this).apply {
        setPadding(dp(20), dp(8), dp(20), 0)
        addView(v, lp(MATCH, WRAP))
    }

    /** This phone's addresses on its Wi-Fi and hotspot. */
    private fun addresses(): List<String> = try {
        NetworkInterface.getNetworkInterfaces().toList()
            .filter { it.isUp && !it.isLoopback && !it.name.startsWith("rmnet") && !it.name.startsWith("dummy") }
            .flatMap { ni -> ni.inetAddresses.toList().filterIsInstance<Inet4Address>().map { it.hostAddress ?: "" } }
            .filter { it.isNotEmpty() }
            .map { a -> if (app.settings.lending && LendService.localPort(this).let { it > 0 && it != PoolWire.PORT }) "$a:${LendService.localPort(this)}" else a }
    } catch (e: Exception) {
        emptyList()
    }
}

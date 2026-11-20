package app.simtoggle

import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.RippleDrawable
import android.content.res.ColorStateList
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.Switch
import android.widget.TextView
import android.widget.Toast
import rikka.shizuku.Shizuku
import kotlin.math.roundToInt

class MainActivity : Activity() {
    private val main = Handler(Looper.getMainLooper())

    private lateinit var shizukuCard: LinearLayout
    private lateinit var simCard: LinearLayout
    private lateinit var settingsCard: LinearLayout
    private lateinit var logText: TextView

    private var rows: List<SimRow> = emptyList()
    private val busy = HashSet<Int>()
    private var askedPermission = false
    private var askedPhonePermission = false
    private var lastState: ShizukuGate.State? = null

    private val binderReceived = Shizuku.OnBinderReceivedListener { refresh() }
    private val binderDead = Shizuku.OnBinderDeadListener { refresh() }
    private val permissionResult = Shizuku.OnRequestPermissionResultListener { _, _ -> refresh() }
    private val refreshTask = Runnable { refresh() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(buildLayout())
        Shizuku.addBinderReceivedListenerSticky(binderReceived, main)
        Shizuku.addBinderDeadListener(binderDead, main)
        Shizuku.addRequestPermissionResultListener(permissionResult, main)
    }

    override fun onDestroy() {
        Shizuku.removeBinderReceivedListener(binderReceived)
        Shizuku.removeBinderDeadListener(binderDead)
        Shizuku.removeRequestPermissionResultListener(permissionResult)
        super.onDestroy()
    }

    override fun onResume() {
        super.onResume()
        refresh()
    }

    override fun onPause() {
        main.removeCallbacks(refreshTask)
        super.onPause()
    }

    // ---- State ----

    private fun refresh() {
        val state = ShizukuGate.state(this)
        if (state != lastState) {
            if (state == ShizukuGate.State.READY) {
                Sims.background({ Telephony.canDisablePhysicalSubscription() }) { r ->
                    val can = r.getOrNull()
                    Sims.log(this, "Shizuku connected (${ShizukuGate.identity()}). SIM switch supported by the modem: " +
                        when (can) { true -> "yes"; false -> "no, SIMs will be powered off"; null -> "unknown" })
                    renderLog()
                }
            }
            lastState = state
        }
        if (state == ShizukuGate.State.NEEDS_PERMISSION && !askedPermission) {
            askedPermission = true
            ShizukuGate.requestPermission()
        }
        if (state != ShizukuGate.State.READY && !askedPhonePermission &&
            checkSelfPermission(android.Manifest.permission.READ_PHONE_STATE) != android.content.pm.PackageManager.PERMISSION_GRANTED
        ) {
            // Only to list the SIMs while Shizuku is off; nothing breaks without it.
            askedPhonePermission = true
            requestPermissions(arrayOf(android.Manifest.permission.READ_PHONE_STATE), 1)
        }
        renderShizuku(state)
        renderSettings()
        renderLog()
        Sims.background({ Sims.load(this) }) { r ->
            r.onSuccess { rows = it }.onFailure { Sims.log(this, "Reading SIMs failed: ${it.describe()}") }
            renderSims()
            renderLog()
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        refresh()
    }

    private fun refreshSoon() {
        main.removeCallbacks(refreshTask)
        for (delay in longArrayOf(400, 1_500, 4_000, 8_000)) main.postDelayed(refreshTask, delay)
    }

    private fun toggle(row: SimRow, on: Boolean) {
        if (!ShizukuGate.ready()) {
            Toast.makeText(this, "Connect Shizuku first (top of the screen)", Toast.LENGTH_SHORT).show()
            renderSims()
            return
        }
        busy += row.slot
        renderSims()
        Sims.background({ Sims.setOn(this, row, on) }) { r ->
            busy -= row.slot
            r.onSuccess { Sims.log(this, it) }
                .onFailure {
                    Sims.log(this, "${row.title}: failed: ${it.describe()}")
                    Toast.makeText(this, it.describe(), Toast.LENGTH_LONG).show()
                }
            Sims.refreshTile(this)
            renderLog()
            refreshSoon()
        }
    }

    // ---- Rendering ----

    private fun renderShizuku(state: ShizukuGate.State) {
        shizukuCard.removeAllViews()
        val (title, detail, action) = when (state) {
            ShizukuGate.State.READY -> Triple(
                "Connected through Shizuku (${ShizukuGate.identity()})",
                "Ready. Shizuku has to be started again after the phone restarts.",
                null,
            )
            ShizukuGate.State.NOT_INSTALLED -> Triple(
                "Shizuku isn't installed",
                "Android only lets system apps switch SIMs. Shizuku lends this app that permission " +
                    "through Wireless debugging, no root or computer needed.",
                "Get Shizuku" to { open(Uri.parse(ShizukuGate.DOWNLOAD_URL)) },
            )
            ShizukuGate.State.NOT_RUNNING -> Triple(
                "Shizuku isn't running",
                "Open Shizuku and start it with Wireless debugging (connect to Wi-Fi first). " +
                    "It stops when the phone restarts.",
                "Open Shizuku" to { openShizuku() },
            )
            ShizukuGate.State.TOO_OLD -> Triple(
                "Shizuku is out of date",
                "Update Shizuku to version 11 or newer.",
                "Get Shizuku" to { open(Uri.parse(ShizukuGate.DOWNLOAD_URL)) },
            )
            ShizukuGate.State.NEEDS_PERMISSION -> Triple(
                "Allow SIM Toggle in Shizuku",
                "Shizuku asks once whether this app may use it.",
                "Allow" to { ShizukuGate.requestPermission() },
            )
            ShizukuGate.State.DENIED -> Triple(
                "Shizuku access was denied",
                "Open Shizuku, go to Authorized applications, and turn SIM Toggle on.",
                "Open Shizuku" to { openShizuku() },
            )
        }
        val ok = state == ShizukuGate.State.READY
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(24.dp, 20.dp, 20.dp, 20.dp)
        }
        row.addView(View(this).apply {
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(if (ok) color(R.color.good) else color(R.color.warn))
            }
        }, LinearLayout.LayoutParams(10.dp, 10.dp).apply { marginEnd = 16.dp })
        val texts = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        texts.addView(text(title, 17f, R.color.text_primary, bold = true))
        texts.addView(text(detail, 14f, R.color.text_secondary).apply { setPadding(0, 4.dp, 0, 0) })
        row.addView(texts, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        if (action != null) {
            row.addView(pill(action.first) { action.second() },
                LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                    marginStart = 12.dp
                })
        }
        shizukuCard.addView(row)
    }

    private fun renderSims() {
        simCard.removeAllViews()
        if (rows.isEmpty()) {
            simCard.addView(text(
                if (ShizukuGate.ready()) "Reading SIMs…" else "Connect Shizuku to see and switch your SIMs.",
                16f, R.color.text_secondary,
            ).apply { setPadding(24.dp, 24.dp, 24.dp, 24.dp) })
            return
        }
        rows.forEachIndexed { i, row ->
            if (i > 0) simCard.addView(divider())
            simCard.addView(if (row.hasSim) simRow(row) else emptySlot())
        }
    }

    private fun simRow(row: SimRow): View {
        val isBusy = row.slot in busy
        val line = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(24.dp, 22.dp, 20.dp, 22.dp)
            minimumHeight = 96.dp
        }
        line.addView(ImageView(this).apply {
            setImageResource(R.drawable.ic_sim_badge)
            alpha = if (row.on) 1f else 0.45f
        }, LinearLayout.LayoutParams(36.dp, 36.dp).apply { marginEnd = 24.dp })

        val texts = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        texts.addView(text(row.title, 20f, R.color.text_primary))
        if (row.carrier.isNotEmpty()) texts.addView(text(row.carrier, 16f, R.color.text_secondary).apply { setPadding(0, 4.dp, 0, 0) })
        val status = when {
            isBusy -> "Switching…"
            row.poweredDown -> "Powered off"
            !row.on -> "Off"
            row.number.isNotEmpty() -> row.number
            else -> "Unknown number"
        }
        texts.addView(text(status, 16f, if (isBusy) R.color.accent else R.color.text_secondary).apply { setPadding(0, 2.dp, 0, 0) })
        line.addView(texts, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))

        line.addView(View(this).apply { setBackgroundColor(color(R.color.divider)) },
            LinearLayout.LayoutParams(1.dp, 28.dp).apply { marginStart = 12.dp; marginEnd = 16.dp })

        val switch = Switch(this).apply {
            isChecked = row.on
            isEnabled = !isBusy
            setOnClickListener { toggle(row, isChecked) }
        }
        line.addView(switch)
        line.background = ripple()
        // performClick ignores isEnabled, so check it here.
        line.setOnClickListener { if (switch.isEnabled) switch.performClick() }
        line.isClickable = !isBusy
        return line
    }

    private fun emptySlot(): View = text("No SIM card", 20f, R.color.text_tertiary).apply {
        setPadding(36.dp, 30.dp, 24.dp, 30.dp)
    }

    private fun renderSettings() {
        settingsCard.removeAllViews()
        val method = Sims.method(this)
        settingsCard.addView(settingRow("Turn SIMs off by", method.label) { pickMethod() })
        settingsCard.addView(divider())
        val slot = Sims.tileSlot(this)
        settingsCard.addView(settingRow("Quick Settings tile switches", "SIM ${slot + 1}") { pickTileSlot() })
    }

    private fun settingRow(title: String, value: String, onClick: () -> Unit): View {
        val box = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(24.dp, 18.dp, 24.dp, 18.dp)
            background = ripple()
            setOnClickListener { onClick() }
        }
        box.addView(text(title, 18f, R.color.text_primary))
        box.addView(text(value, 15f, R.color.accent).apply { setPadding(0, 4.dp, 0, 0) })
        return box
    }

    private fun pickMethod() {
        val methods = Method.entries
        val labels = methods.map { "${it.label}\n${it.detail}" }.toTypedArray()
        AlertDialog.Builder(this)
            .setTitle("Turn SIMs off by")
            .setSingleChoiceItems(labels, methods.indexOf(Sims.method(this))) { dialog, which ->
                Sims.setMethod(this, methods[which])
                dialog.dismiss()
                renderSettings()
            }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }

    private fun pickTileSlot() {
        val count = Sims.slotCount(this)
        val labels = Array(count) { "SIM ${it + 1}" }
        AlertDialog.Builder(this)
            .setTitle("Quick Settings tile switches")
            .setSingleChoiceItems(labels, Sims.tileSlot(this).coerceIn(0, count - 1)) { dialog, which ->
                Sims.setTileSlot(this, which)
                dialog.dismiss()
                renderSettings()
            }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }

    private fun renderLog() {
        logText.text = Sims.logText(this).ifEmpty { "Nothing yet." }
    }

    // ---- Layout ----

    private fun buildLayout(): View {
        val column = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(16.dp, 0, 16.dp, 32.dp)
        }
        column.addView(text("SIM Toggle", 34f, R.color.text_primary).apply {
            setPadding(12.dp, 56.dp, 12.dp, 4.dp)
        })
        column.addView(text("Switch your SIM on and off without digging through Settings.", 15f, R.color.text_secondary).apply {
            setPadding(12.dp, 0, 12.dp, 8.dp)
        })

        shizukuCard = card()
        simCard = card()
        settingsCard = card()
        val logCard = card()
        logText = text("", 12.5f, R.color.text_secondary).apply {
            typeface = Typeface.MONOSPACE
            setPadding(24.dp, 18.dp, 24.dp, 18.dp)
            setTextIsSelectable(true)
        }
        logCard.addView(logText)

        column.addView(section("Shizuku"))
        column.addView(shizukuCard)
        column.addView(section("SIM cards"))
        column.addView(simCard)
        column.addView(section("Settings"))
        column.addView(settingsCard)
        column.addView(LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.BOTTOM
            addView(section("Activity"), LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
            addView(text("Clear", 15f, R.color.accent).apply {
                setPadding(16.dp, 8.dp, 16.dp, 10.dp)
                background = ripple()
                setOnClickListener { Sims.clearLog(this@MainActivity); renderLog() }
            })
        })
        column.addView(logCard)
        column.addView(text(
            "Add the tile: pull down the notification shade, tap the pencil (edit), and drag \"SIM\" into your tiles.",
            14f, R.color.text_secondary,
        ).apply { setPadding(12.dp, 20.dp, 12.dp, 0) })

        val scroll = ScrollView(this).apply {
            isFillViewport = true
            addView(column)
        }
        // Edge to edge: keep the content clear of the status and navigation bars.
        return FrameLayout(this).apply {
            setBackgroundColor(color(R.color.bg))
            addView(scroll)
            setOnApplyWindowInsetsListener { v, insets ->
                val bars = insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout())
                v.setPadding(bars.left, bars.top, bars.right, bars.bottom)
                WindowInsets.CONSUMED
            }
        }
    }

    private fun card() = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        background = GradientDrawable().apply {
            cornerRadius = 26.dp.toFloat()
            setColor(color(R.color.card))
        }
        clipToOutline = true
    }

    private fun section(title: String) = text(title, 15f, R.color.text_secondary, bold = true).apply {
        setPadding(12.dp, 28.dp, 12.dp, 12.dp)
    }

    private fun divider() = View(this).apply {
        setBackgroundColor(color(R.color.divider))
        layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 1).apply {
            marginStart = 24.dp
            marginEnd = 24.dp
        }
    }

    private fun pill(label: String, onClick: () -> Unit) = text(label, 15f, R.color.on_accent, bold = true).apply {
        setPadding(18.dp, 10.dp, 18.dp, 10.dp)
        background = RippleDrawable(
            ColorStateList.valueOf(color(R.color.ripple)),
            GradientDrawable().apply { cornerRadius = 100.dp.toFloat(); setColor(color(R.color.accent)) },
            null,
        )
        setOnClickListener { onClick() }
    }

    private fun ripple() = RippleDrawable(ColorStateList.valueOf(color(R.color.ripple)), null,
        GradientDrawable().apply { setColor(0xFFFFFFFF.toInt()) })

    private fun text(value: String, sizeSp: Float, colorRes: Int, bold: Boolean = false) = TextView(this).apply {
        text = value
        setTextSize(TypedValue.COMPLEX_UNIT_SP, sizeSp)
        setTextColor(color(colorRes))
        if (bold) typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
    }

    private fun color(res: Int) = getColor(res)

    private val Int.dp: Int get() = (this * resources.displayMetrics.density).roundToInt()

    private fun openShizuku() {
        val launch = packageManager.getLaunchIntentForPackage(ShizukuGate.PACKAGE)
        if (launch != null) startActivity(launch) else open(Uri.parse(ShizukuGate.DOWNLOAD_URL))
    }

    private fun open(uri: Uri) {
        runCatching { startActivity(Intent(Intent.ACTION_VIEW, uri)) }
            .onFailure { Toast.makeText(this, uri.toString(), Toast.LENGTH_LONG).show() }
    }
}

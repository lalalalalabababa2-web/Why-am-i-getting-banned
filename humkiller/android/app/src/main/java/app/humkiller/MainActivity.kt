package app.humkiller

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.media.AudioDeviceCallback
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.ScrollView
import android.widget.SeekBar
import android.widget.Spinner
import android.widget.TextView

/** The whole UI, built in code: devices, mode, the hum, four tones, start/stop. */
class MainActivity : Activity() {
    private val main = Handler(Looper.getMainLooper())
    private lateinit var am: AudioManager
    private var polling = false
    private var updating = false

    private lateinit var outSpinner: Spinner
    private lateinit var inSpinner: Spinner
    private lateinit var warnings: TextView
    private lateinit var audioMsg: TextView
    private lateinit var modeGroup: RadioGroup
    private val modeButtons = arrayOfNulls<RadioButton>(3)
    private lateinit var modeHelp: TextView
    private lateinit var statusDot: View
    private lateinit var statusText: TextView
    private lateinit var freqEdit: EditText
    private lateinit var findButton: Button
    private lateinit var findMsg: TextView
    private lateinit var volumeRow: LinearLayout
    private lateinit var volumeBar: SeekBar
    private lateinit var remeasure: Button
    private lateinit var startButton: Button
    private val toneViews = arrayOfNulls<ToneViews>(Engine.H)

    private class ToneViews(
        val check: CheckBox, val meter: ProgressBar, val micDb: TextView, val reduction: TextView,
        val ancInfo: TextView, val controls: LinearLayout,
        val level: SeekBar, val levelText: TextView, val phase: SeekBar, val phaseText: TextView,
    ) {
        var dragging = false
    }

    private val deviceCb = object : AudioDeviceCallback() {
        override fun onAudioDevicesAdded(added: Array<out AudioDeviceInfo>) = devicesChanged()
        override fun onAudioDevicesRemoved(removed: Array<out AudioDeviceInfo>) = devicesChanged()
    }

    private val tick = object : Runnable {
        override fun run() {
            if (!polling) return
            Engine.poll()
            refresh()
            main.postDelayed(this, 66)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        am = getSystemService(AudioManager::class.java)
        Engine.start(this)
        Engine.micGranted = hasMic()
        setContentView(buildUi())
        if (!Engine.micGranted) requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), REQ_MIC)
        am.registerAudioDeviceCallback(deviceCb, main)
    }

    override fun onStart() {
        super.onStart()
        if (!Engine.isOpen) Engine.open()
        polling = true
        main.post(tick)
    }

    override fun onStop() {
        super.onStop()
        polling = false
        // Not cancelling: let go of the mic and headphones (and the mic-in-use dot) while we're away.
        if (!Engine.armed) Engine.close()
    }

    override fun onDestroy() {
        am.unregisterAudioDeviceCallback(deviceCb)
        super.onDestroy()
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQ_MIC) {
            Engine.micGranted = hasMic()
            Engine.open()
        }
    }

    private fun hasMic() = checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED

    private fun devicesChanged() {
        Engine.devicesChanged()
        fillSpinners()
    }

    // ---------------------------------------------------------------------------------------------
    // Building

    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()
    private val wrap = ViewGroup.LayoutParams.WRAP_CONTENT
    private val match = ViewGroup.LayoutParams.MATCH_PARENT

    private fun label(s: String = "", size: Float = 15f, bold: Boolean = false, secondary: Boolean = false) =
        TextView(this).apply {
            text = s
            textSize = size
            if (bold) setTypeface(typeface, Typeface.BOLD)
            if (secondary) alpha = 0.7f
        }

    private fun row(vararg views: View, gravity: Int = Gravity.CENTER_VERTICAL) = LinearLayout(this).apply {
        orientation = LinearLayout.HORIZONTAL
        this.gravity = gravity
        views.forEach { addView(it) }
    }

    private fun weighted(v: View, w: Float = 1f) = v.apply { layoutParams = LinearLayout.LayoutParams(0, wrap, w) }

    private fun small(title: String, onClick: () -> Unit) = Button(this).apply {
        text = title
        isAllCaps = false
        textSize = 13f
        minWidth = 0
        minimumWidth = 0
        setPadding(dp(8), 0, dp(8), 0)
        setOnClickListener { onClick() }
    }

    private fun card(title: String, body: LinearLayout.() -> Unit): LinearLayout {
        val box = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(14), dp(12), dp(14), dp(12))
            background = GradientDrawable().apply {
                cornerRadius = dp(16).toFloat()
                setColor(0x1A808080)
            }
        }
        box.addView(label(title, 17f, bold = true))
        box.body()
        return box.apply {
            layoutParams = LinearLayout.LayoutParams(match, wrap).apply { topMargin = dp(12) }
        }
    }

    private fun gap(h: Int) = View(this).apply { layoutParams = LinearLayout.LayoutParams(1, dp(h)) }

    private fun buildUi(): View {
        val col = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(16), dp(8), dp(16), dp(24))
        }
        col.addView(label("HumKiller", 26f, bold = true))
        col.addView(label("Cancels steady hum in your headphones.", 14f, secondary = true))

        col.addView(card("Devices") {
            addView(label("Headphones", 13f, secondary = true))
            outSpinner = Spinner(this@MainActivity)
            addView(outSpinner)
            addView(gap(6))
            addView(label("Mic", 13f, secondary = true))
            inSpinner = Spinner(this@MainActivity)
            addView(inSpinner)
            warnings = label("", 14f).apply { setTextColor(ORANGE) }
            addView(warnings)
            audioMsg = label("", 14f).apply { setTextColor(RED) }
            addView(audioMsg)
        })
        outSpinner.onItemSelectedListener = spinnerListener { i -> Engine.outputs.getOrNull(i)?.let { Engine.selectOutput(it.id) } }
        inSpinner.onItemSelectedListener = spinnerListener { i -> Engine.inputs.getOrNull(i)?.let { Engine.selectInput(it.id) } }
        fillSpinners()

        col.addView(card("Mode") {
            modeGroup = RadioGroup(this@MainActivity).apply { orientation = LinearLayout.HORIZONTAL }
            listOf("Manual", "Lock", "Auto ANC").forEachIndexed { i, t ->
                val b = RadioButton(this@MainActivity).apply {
                    text = t
                    id = View.generateViewId()
                    layoutParams = RadioGroup.LayoutParams(0, wrap, 1f)
                }
                modeButtons[i] = b
                modeGroup.addView(b)
            }
            modeGroup.setOnCheckedChangeListener { _, checked ->
                if (updating) return@setOnCheckedChangeListener
                val m = modeButtons.indexOfFirst { it?.id == checked }
                if (m >= 0) Engine.setMode(m)
                refresh()
            }
            addView(modeGroup)
            modeHelp = label("", 14f, secondary = true)
            addView(modeHelp)
            addView(gap(6))
            statusDot = View(this@MainActivity).apply {
                layoutParams = LinearLayout.LayoutParams(dp(10), dp(10)).apply { marginEnd = dp(8) }
            }
            statusText = label("", 15f)
            addView(row(statusDot, weighted(statusText)))
        })

        col.addView(card("Hum") {
            freqEdit = EditText(this@MainActivity).apply {
                inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL
                imeOptions = EditorInfo.IME_ACTION_DONE
                setSelectAllOnFocus(true)
                textSize = 18f
                setOnEditorActionListener { v, action, _ ->
                    if (action == EditorInfo.IME_ACTION_DONE) {
                        commitFreq()
                        v.clearFocus()
                        getSystemService(InputMethodManager::class.java).hideSoftInputFromWindow(v.windowToken, 0)
                    }
                    false
                }
                setOnFocusChangeListener { _, has -> if (!has) commitFreq() }
            }
            addView(row(label("Fundamental", 15f), gap(0).apply { layoutParams = LinearLayout.LayoutParams(dp(12), 1) },
                weighted(freqEdit), label(" Hz", 15f)))
            val nudges = LinearLayout(this@MainActivity).apply { orientation = LinearLayout.HORIZONTAL }
            listOf("−1" to -1.0, "−.1" to -0.1, "−.01" to -0.01, "+.01" to 0.01, "+.1" to 0.1, "+1" to 1.0).forEach { (t, d) ->
                nudges.addView(weighted(small(t) { Engine.nudge(d); refresh(force = true) }))
            }
            addView(nudges)
            findButton = Button(this@MainActivity).apply {
                text = "Find hum"
                isAllCaps = false
                setOnClickListener { Engine.findHum(); refresh() }
            }
            addView(row(weighted(findButton, 2f), weighted(small("50 Hz") { Engine.setFundamental(50.0); refresh(force = true) }),
                weighted(small("60 Hz") { Engine.setFundamental(60.0); refresh(force = true) })))
            findMsg = label("", 14f, secondary = true)
            addView(findMsg)
        })

        col.addView(card("Tones") {
            for (k in 0 until Engine.H) {
                if (k > 0) addView(View(this@MainActivity).apply {
                    layoutParams = LinearLayout.LayoutParams(match, dp(1)).apply { topMargin = dp(8); bottomMargin = dp(8) }
                    setBackgroundColor(0x33808080)
                })
                addView(buildTone(k))
            }
        })

        volumeBar = SeekBar(this).apply {
            max = 100
            setOnSeekBarChangeListener(seekListener { p, user -> if (user) Engine.setMaster(p / 100f) })
        }
        volumeRow = row(label("Volume  ", 15f), weighted(volumeBar))
        remeasure = Button(this).apply {
            text = "Re-measure"
            isAllCaps = false
            setOnClickListener { Engine.ancRestart() }
        }
        startButton = Button(this).apply {
            textSize = 18f
            isAllCaps = false
            setOnClickListener {
                val on = !Engine.armed
                if (on && Build.VERSION.SDK_INT >= 33 &&
                    checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), REQ_NOTIFY)
                }
                if (on && !Engine.isOpen) Engine.open()
                Engine.setArmed(this@MainActivity, on)
                refresh()
            }
        }
        col.addView(gap(14))
        col.addView(volumeRow)
        col.addView(remeasure)
        col.addView(startButton, LinearLayout.LayoutParams(match, dp(56)).apply { topMargin = dp(8) })

        val scroll = ScrollView(this).apply {
            addView(col)
            isFillViewport = true
        }
        // Android 15+ draws edge to edge: keep everything clear of the status bar, nav bar and keyboard.
        scroll.setOnApplyWindowInsetsListener { v, insets ->
            val bars = insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout() or WindowInsets.Type.ime())
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            WindowInsets.CONSUMED
        }
        refresh(force = true)
        return scroll
    }

    private fun buildTone(k: Int): View {
        val check = CheckBox(this).apply { textSize = 15f }
        val meter = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = 100
            layoutParams = LinearLayout.LayoutParams(dp(72), dp(8))
        }
        val micDb = label("", 12f, secondary = true).apply {
            gravity = Gravity.END
            layoutParams = LinearLayout.LayoutParams(dp(52), wrap)
        }
        val reduction = label("", 14f, bold = true).apply {
            gravity = Gravity.END
            layoutParams = LinearLayout.LayoutParams(dp(64), wrap)
        }
        val ancInfo = label("", 12f, secondary = true)
        val level = SeekBar(this).apply { max = 120 }           // -80 ... -20 dB in 0.5 dB steps
        val levelText = label("", 13f).apply { layoutParams = LinearLayout.LayoutParams(dp(64), wrap); gravity = Gravity.END }
        val phase = SeekBar(this).apply { max = 360 }           // -180 ... 180 degrees
        val phaseText = label("", 13f).apply { layoutParams = LinearLayout.LayoutParams(dp(52), wrap); gravity = Gravity.END }
        val controls = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            addView(row(label("Level", 13f).apply { layoutParams = LinearLayout.LayoutParams(dp(46), wrap) }, weighted(level), levelText,
                small("−") { Engine.setTone(k, levelDb = Engine.tones[k].levelDb - 0.5f) },
                small("+") { Engine.setTone(k, levelDb = Engine.tones[k].levelDb + 0.5f) }))
            addView(row(label("Phase", 13f).apply { layoutParams = LinearLayout.LayoutParams(dp(46), wrap) }, weighted(phase), phaseText,
                small("−") { Engine.setTone(k, phaseDeg = Engine.tones[k].phaseDeg - 2f) },
                small("+") { Engine.setTone(k, phaseDeg = Engine.tones[k].phaseDeg + 2f) }))
        }
        val tv = ToneViews(check, meter, micDb, reduction, ancInfo, controls, level, levelText, phase, phaseText)
        toneViews[k] = tv

        check.setOnCheckedChangeListener { _, on -> if (!updating) { Engine.setTone(k, enabled = on); refresh() } }
        level.setOnSeekBarChangeListener(seekListener(tv) { p, user -> if (user) Engine.setTone(k, levelDb = -80f + p * 0.5f) })
        phase.setOnSeekBarChangeListener(seekListener(tv) { p, user -> if (user) Engine.setTone(k, phaseDeg = p - 180f) })

        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            addView(row(weighted(check), meter, micDb, reduction))
            addView(ancInfo)
            addView(controls)
        }
    }

    private fun spinnerListener(onPick: (Int) -> Unit) = object : AdapterView.OnItemSelectedListener {
        override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
            if (!updating) { onPick(position); refresh() }
        }
        override fun onNothingSelected(parent: AdapterView<*>?) {}
    }

    private fun seekListener(tv: ToneViews? = null, onChange: (Int, Boolean) -> Unit) = object : SeekBar.OnSeekBarChangeListener {
        override fun onProgressChanged(s: SeekBar, p: Int, fromUser: Boolean) = onChange(p, fromUser)
        override fun onStartTrackingTouch(s: SeekBar) { tv?.dragging = true }
        override fun onStopTrackingTouch(s: SeekBar) { tv?.dragging = false }
    }

    private fun fillSpinners() {
        updating = true
        outSpinner.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, Engine.outputs.map { it.label })
        inSpinner.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, Engine.inputs.map { it.label })
        outSpinner.setSelection(Engine.outputs.indexOfFirst { it.id == Engine.outId }.coerceAtLeast(0), false)
        inSpinner.setSelection(Engine.inputs.indexOfFirst { it.id == Engine.inId }.coerceAtLeast(0), false)
        updating = false
    }

    private fun commitFreq() {
        val v = freqEdit.text.toString().replace(',', '.').toDoubleOrNull() ?: return
        Engine.setFundamental(v)
        refresh(force = true)
    }

    // ---------------------------------------------------------------------------------------------
    // Refreshing (15 times a second while on screen)

    private fun refresh(force: Boolean = false) {
        val st = Engine.status
        val mode = Engine.mode
        val anc = mode == Native.MODE_ANC
        updating = true

        modeButtons[mode]?.let { if (!it.isChecked) it.isChecked = true }
        modeHelp.text = when (mode) {
            Native.MODE_MANUAL -> "Plays the tones at a fixed frequency, no mic. Mains hum wanders a little, so a perfect tuning slides out of line within seconds."
            Native.MODE_LOCK -> "The phone's mic listens to the room and keeps the tones locked to the hum. Raise a tone until it changes the hum, sweep its phase until the hum dips, then fine-tune both. Keep the phone still near you."
            else -> "Adaptive noise cancelling for the hum. Needs a small mic inside one earcup (a lav mic on a headset splitter in the USB-C adapter). It measures your headphones, then keeps the hum cancelled on its own."
        }
        val (txt, color) = statusLine(st)
        statusText.text = txt
        statusDot.background = GradientDrawable().apply { shape = GradientDrawable.OVAL; setColor(color) }

        if (force || !freqEdit.hasFocus()) {
            val s = "%.3f".format(Engine.fundamental)
            if (freqEdit.text.toString() != s) freqEdit.setText(s)
        }
        findButton.isEnabled = !Engine.finding && st.inputActive
        findMsg.text = Engine.findMessage.orEmpty()
        findMsg.visibility = if (Engine.findMessage == null) View.GONE else View.VISIBLE

        for (k in 0 until Engine.H) {
            val tv = toneViews[k] ?: continue
            val t = Engine.tones[k]
            val ts = Engine.toneStatus[k]
            tv.check.text = "%d×   %.2f Hz".format(k + 1, st.freq * (k + 1))
            if (tv.check.isChecked != t.enabled) tv.check.isChecked = t.enabled
            tv.meter.progress = (((ts.micDb + 100f) / 70f).coerceIn(0f, 1f) * 100).toInt()
            tv.meter.alpha = if (ts.snrDb > 10f) 1f else 0.4f
            tv.micDb.text = if (ts.micDb > -150f) "%.0f dB".format(ts.micDb) else "—"
            tv.reduction.visibility = if (anc && ts.ancActive) View.VISIBLE else View.GONE
            tv.reduction.text = "%+.1f dB".format(ts.reductionDb)
            tv.reduction.setTextColor(if (ts.reductionDb < -10f) GREEN else ORANGE)
            tv.ancInfo.visibility = if (anc && t.enabled) View.VISIBLE else View.GONE
            tv.ancInfo.text = if (ts.ancActive) "playing %.1f dBFS at %.0f°".format(ts.outDb, ts.outPhase) else "waiting"
            tv.controls.visibility = if (!anc && t.enabled) View.VISIBLE else View.GONE
            if (!tv.dragging) {
                tv.level.progress = Math.round((t.levelDb + 80f) / 0.5f)
                tv.phase.progress = Math.round(t.phaseDeg + 180f)
            }
            tv.levelText.text = "%.1f dB".format(t.levelDb)
            tv.phaseText.text = "%.0f°".format(t.phaseDeg)
        }

        volumeRow.visibility = if (anc) View.GONE else View.VISIBLE
        volumeBar.progress = Math.round(Engine.master * 100)
        remeasure.visibility = if (anc) View.VISIBLE else View.GONE
        remeasure.isEnabled = Engine.armed
        startButton.text = if (Engine.armed) "Stop" else "Start"

        warnings.text = warningText().joinToString("\n\n")
        warnings.visibility = if (warnings.text.isEmpty()) View.GONE else View.VISIBLE
        audioMsg.text = audioMessage().orEmpty()
        audioMsg.visibility = if (audioMsg.text.isEmpty()) View.GONE else View.VISIBLE
        updating = false
    }

    private fun statusLine(st: Engine.Status): Pair<String, Int> {
        val mode = Engine.mode
        val f = "%.3f".format(st.freq)
        if (mode == Native.MODE_MANUAL) return "Free-running at $f Hz" to GREY
        if (!st.inputActive) return "No mic open" to RED
        if (mode == Native.MODE_LOCK) {
            return if (st.locked) "Locked to the hum at $f Hz" to GREEN
            else "Listening for the hum near %.3f Hz…".format(Engine.fundamental) to ORANGE
        }
        return when (st.ancState) {
            Native.ANC_IDLE -> "Press Start" to GREY
            Native.ANC_CALIBRATING -> "Measuring headphones → mic (short tones)…" to ORANGE
            Native.ANC_RUNNING -> {
                val worst = Engine.toneStatus.filter { it.ancActive }.maxOfOrNull { it.reductionDb } ?: 0f
                ("Cancelling" + (if (st.locked) " · locked at $f Hz" else "") + " · worst tone %.1f dB".format(worst)) to GREEN
            }
            else -> when (st.ancError) {
                Native.ANC_ERR_NO_PATH -> "The mic can't hear the headphones. Put it inside the earcup, turn the volume up a little, press Re-measure." to RED
                Native.ANC_ERR_NO_HUM -> "The mic doesn't hear a hum at these frequencies. Run Find hum in Lock mode first." to RED
                else -> "No mic open" to RED
            }
        }
    }

    private fun warningText(): List<String> {
        val w = mutableListOf<String>()
        val out = Engine.output()
        val inp = Engine.input()
        val mode = Engine.mode
        when {
            out != null && Engine.isBluetooth(out.type) ->
                w += "Bluetooth adds 150–300 ms of shifting delay, so the anti-hum can't stay lined up. Plug the Evo's aux cable into a USB-C to 3.5 mm adapter."
            out?.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER ->
                w += "That's the phone speaker. Plug the Evo in with its aux cable and a USB-C to 3.5 mm adapter."
            out?.id == 0 && Engine.outputs.none { it.type != 0 && !Engine.isBluetooth(it.type) && it.type != AudioDeviceInfo.TYPE_BUILTIN_SPEAKER } ->
                w += "No wired headphones found. The Evo needs its aux cable and a USB-C to 3.5 mm adapter."
        }
        if (mode != Native.MODE_MANUAL && inp != null && Engine.isBluetooth(inp.type))
            w += "A Bluetooth mic puts the headphones in call mode. Use the phone's mic or a wired one."
        if (mode == Native.MODE_ANC && inp?.type == AudioDeviceInfo.TYPE_BUILTIN_MIC)
            w += "Auto ANC needs the mic inside the earcup. The phone's mic hears the room, not your ear, so use Lock with it."
        if (Engine.status.inputActive && Native.inputPreset() != Native.PRESET_UNPROCESSED)
            w += "This phone has no unprocessed mic, so HumKiller uses the voice-recognition one. Very low hum may read weaker."
        if (Engine.micSilent)
            w += "The mic is sending pure silence. Check that HumKiller has microphone permission."
        return w
    }

    private fun audioMessage(): String? {
        val r = Engine.openResult
        return when {
            r == Engine.CLOSED -> null
            r < 0 -> "Couldn't open the headphones. Try another output or replug the adapter."
            !Engine.micGranted -> "No mic permission, so only Manual works. Allow it in Settings → Apps → HumKiller → Permissions."
            r == 1 -> "The mic didn't open. Lock and Auto ANC need it."
            else -> null
        }
    }

    companion object {
        private const val REQ_MIC = 1
        private const val REQ_NOTIFY = 2
        private val ORANGE = Color.rgb(0xE6, 0x8A, 0x00)
        private val RED = Color.rgb(0xE5, 0x39, 0x35)
        private val GREEN = Color.rgb(0x2E, 0xA0, 0x43)
        private val GREY = Color.rgb(0x90, 0x90, 0x90)
    }
}

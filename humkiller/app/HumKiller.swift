// HumKiller - SwiftUI front end. All audio and DSP live in the C++ core (core/hk_core.h);
// this file only shows state and forwards what you change.
import AppKit
import AVFoundation
import Combine
import SwiftUI

private let kH = Int(HK_MAX_HARMONICS)

private func fmtHz(_ f: Double) -> String { String(format: "%.3f", f) }

struct AudioDevice: Identifiable, Hashable {
    let id: Int32
    let name: String
    let isDefault: Bool
    let transport: Int32
    let clock: UInt32

    var label: String { transport == HK_TRANSPORT_BLUETOOTH ? "\(name)  (Bluetooth)" : name }
}

struct HarmonicSetting: Equatable {
    var enabled: Bool
    var levelDb: Double
    var phaseDeg: Double
}

struct HarmonicReadout {
    var micDb: Double = -120
    var snrDb: Double = 0
    var reductionDb: Double = 0
    var outDb: Double = -120
    var outPhase: Double = 0
    var ancActive = false
}

final class HumModel: ObservableObject {
    @Published var outputs: [AudioDevice] = []
    @Published var inputs: [AudioDevice] = []
    @Published var outputID: Int32 = -1 { didSet { if oldValue != outputID { reopen() } } }
    @Published var inputID: Int32 = -1 { didSet { if oldValue != inputID { reopen() } } }
    @Published var mode: Int32 = 1 { didSet { hk_set_mode(mode) } }   // 1 = HK_MODE_LOCK
    @Published var armed = false { didSet { hk_set_armed(armed ? 1 : 0) } }
    @Published var fundamental: Double = 60 { didSet { hk_set_fundamental(fundamental) } }
    @Published var harmonics: [HarmonicSetting] = HumModel.defaultHarmonics
    @Published var master: Double = 1 { didSet { hk_set_master(Float(master)) } }

    @Published var status = hk_status()
    @Published var readout = [HarmonicReadout](repeating: HarmonicReadout(), count: kH)
    @Published var micGranted = true
    @Published var micSilent = false
    @Published var audioMessage: String?
    @Published var findMessage: String?
    @Published var finding = false

    private var timer: Timer?
    private var harmonicsSub: AnyCancellable?
    private var silentSince: Date?
    private var suppressReopen = false

    static let defaultHarmonics: [HarmonicSetting] =
        (0..<kH).map { HarmonicSetting(enabled: $0 == 0, levelDb: -50, phaseDeg: 0) }

    init() {
        if hk_audio_init() != 0 { audioMessage = "CoreAudio didn't start." }
        hk_set_mode(mode)
        hk_set_fundamental(fundamental)
        hk_set_master(Float(master))
        // Every slider/toggle edit lands here with the new array (sends the current one right away too).
        harmonicsSub = $harmonics.sink { HumModel.push($0) }
        loadDevices()
        requestMic()
        let t = Timer(timeInterval: 1.0 / 15.0, repeats: true) { [weak self] _ in self?.poll() }
        RunLoop.main.add(t, forMode: .common)   // keeps ticking while a slider is being dragged
        timer = t
    }

    // MARK: devices

    func loadDevices() {
        hk_device_refresh()
        func read(_ output: Int32) -> [AudioDevice] {
            (0..<hk_device_count(output)).map { i in
                AudioDevice(id: i, name: String(cString: hk_device_name(output, i)),
                            isDefault: hk_device_is_default(output, i) != 0,
                            transport: hk_device_transport(output, i),
                            clock: hk_device_clock_domain(output, i))
            }
        }
        let prevOut = outputs.first { $0.id == outputID }?.name
        let prevIn = inputs.first { $0.id == inputID }?.name
        let outs = read(1), ins = read(0)
        // The jack shows up as "External Headphones"; prefer it over whatever the system default is.
        let wired = outs.first { $0.transport == HK_TRANSPORT_BUILTIN && $0.name.localizedCaseInsensitiveContains("headphone") }?.name
        suppressReopen = true
        outputs = outs
        inputs = ins
        outputID = pick(outs, prevOut ?? wired)
        inputID = pick(ins, prevIn)
        suppressReopen = false
    }

    private func pick(_ list: [AudioDevice], _ name: String?) -> Int32 {
        if let n = name, let d = list.first(where: { $0.name == n }) { return d.id }
        if let d = list.first(where: { $0.isDefault }) { return d.id }
        return list.first?.id ?? -1
    }

    private func requestMic() {
        switch AVCaptureDevice.authorizationStatus(for: .audio) {
        case .authorized:
            micGranted = true
            reopen()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .audio) { ok in
                DispatchQueue.main.async {
                    self.micGranted = ok
                    self.reopen()
                }
            }
        default:
            micGranted = false
            reopen()
        }
    }

    func reopen() {
        if suppressReopen { return }
        let r = hk_audio_open(outputID, micGranted ? inputID : -2)
        let outName = outputs.first { $0.id == outputID }?.name ?? "the output"
        if r < 0 {
            audioMessage = "Couldn't open \(outName) (error \(r))."
        } else if !micGranted {
            audioMessage = "No mic access, so only Manual works. Allow it in System Settings → Privacy & Security → Microphone, then reopen the app."
        } else if r == 1 {
            audioMessage = "The mic didn't open. Lock and Auto ANC need it."
        } else {
            audioMessage = nil
        }
    }

    // MARK: settings

    private static func push(_ harmonics: [HarmonicSetting]) {
        for (k, h) in harmonics.enumerated() {
            hk_set_harmonic(Int32(k), h.enabled ? 1 : 0, Float(h.levelDb), Float(h.phaseDeg))
        }
    }

    func shiftPhase(_ k: Int, _ d: Double) {
        var p = harmonics[k].phaseDeg + d
        if p > 180 { p -= 360 }
        if p < -180 { p += 360 }
        harmonics[k].phaseDeg = p
    }

    func nudge(_ d: Double) { fundamental = min(2000, max(20, ((fundamental + d) * 1000).rounded() / 1000)) }

    // MARK: hum finder

    func findHum() {
        guard status.input_active != 0 else { findMessage = "Needs the mic."; return }
        findMessage = "Listening for about a second…"
        finding = true
        hk_find_start()
    }

    private func computeFind() {
        DispatchQueue.global(qos: .userInitiated).async {
            var r = hk_find_result()
            hk_find_compute(&r)
            DispatchQueue.main.async { self.applyFind(r) }
        }
    }

    private func applyFind(_ r: hk_find_result) {
        guard r.ok != 0 else {
            findMessage = "No steady hum found. Get the Mac closer to it, or type the frequency in."
            return
        }
        let prom = [r.prominence_db.0, r.prominence_db.1, r.prominence_db.2, r.prominence_db.3].map { Double($0) }
        fundamental = (r.f0 * 1000).rounded() / 1000
        var hs = harmonics
        for k in 0..<kH { hs[k].enabled = prom[k] >= 10 }
        if !hs.contains(where: { $0.enabled }) { hs[0].enabled = true }
        harmonics = hs
        let list = (0..<kH).filter { prom[$0] >= 10 }.map { String(format: "%.0f Hz", r.f0 * Double($0 + 1)) }
        findMessage = "Found \(fmtHz(r.f0)) Hz. Tones on: " + list.joined(separator: ", ")
    }

    // MARK: polling

    private func poll() {
        var st = hk_status()
        hk_get_status(&st)
        status = st
        var r = readout
        for k in 0..<kH {
            var h = hk_harmonic_status()
            hk_get_harmonic(Int32(k), &h)
            r[k] = HarmonicReadout(micDb: Double(h.mic_db), snrDb: Double(h.snr_db), reductionDb: Double(h.reduction_db),
                                   outDb: Double(h.out_db), outPhase: Double(h.out_phase_deg), ancActive: h.anc_active != 0)
        }
        readout = r

        if finding && st.find_state == HK_FIND_READY {
            finding = false
            computeFind()
        }
        if st.input_active != 0 && st.input_rms_db < -150 {
            if silentSince == nil { silentSince = Date() }
            micSilent = Date().timeIntervalSince(silentSince!) > 2
        } else {
            silentSince = nil
            micSilent = false
        }
    }

    // MARK: text

    var modeHelp: String {
        switch mode {
        case HK_MODE_MANUAL:
            return "Plays the tones at a fixed frequency, no mic. Mains hum wanders a little, so a perfect tuning slides out of line within seconds. Good for hearing what the tones do."
        case HK_MODE_LOCK:
            return "The Mac's mic listens to the room and keeps the tones locked to the hum. Raise a tone until it changes the hum, sweep its phase until the hum dips, then fine-tune level and phase in turn. It stays tuned while you sit still."
        default:
            return "Adaptive noise cancelling for the hum. Needs a small mic inside one earcup (a lav mic on a headset splitter in the jack, or USB). It measures your headphones, then keeps the hum cancelled as you move, change volume or the hum drifts."
        }
    }

    var deviceWarnings: [String] {
        var w: [String] = []
        let out = outputs.first { $0.id == outputID }
        let inp = inputs.first { $0.id == inputID }
        if out?.transport == HK_TRANSPORT_BLUETOOTH {
            w.append("Bluetooth adds 150–300 ms of shifting delay, so the anti-hum can't stay lined up. Plug the Evo's aux cable into the Mac's headphone jack and pick External Headphones.")
        }
        if inp?.transport == HK_TRANSPORT_BLUETOOTH && mode != HK_MODE_MANUAL {
            w.append("A Bluetooth mic forces the headphones into call mode. Use the Mac's mic or a wired one.")
        }
        if mode == HK_MODE_ANC, let i = inp, i.transport == HK_TRANSPORT_BUILTIN,
           !i.name.localizedCaseInsensitiveContains("external") {
            w.append("Auto ANC needs the mic inside the earcup. The MacBook's own mic hears the room, not your ear, so use Lock with it instead.")
        }
        if mode != HK_MODE_MANUAL, let o = out, let i = inp, o.clock != 0, i.clock != 0, o.clock != i.clock {
            w.append(mode == HK_MODE_LOCK
                     ? "The mic and headphones run on separate clocks, so a by-ear tuning will drift over a few minutes."
                     : "The mic and headphones run on separate clocks. Auto ANC keeps up with that.")
        }
        if micSilent {
            w.append("The mic is sending pure silence. Check System Settings → Privacy & Security → Microphone.")
        }
        return w
    }

    var statusText: String {
        let st = status
        if st.input_active == 0 {
            return mode == HK_MODE_MANUAL ? "Free-running at \(fmtHz(fundamental)) Hz" : "No mic open"
        }
        switch mode {
        case HK_MODE_MANUAL:
            return "Free-running at \(fmtHz(st.freq)) Hz"
        case HK_MODE_LOCK:
            return st.locked != 0 ? "Locked to the hum at \(fmtHz(st.freq)) Hz"
                                  : "Listening for the hum near \(fmtHz(fundamental)) Hz…"
        default:
            switch st.anc_state {
            case HK_ANC_IDLE: return "Press Start"
            case HK_ANC_CALIBRATING: return "Measuring headphones → mic (short tones)…"
            case HK_ANC_RUNNING:
                let worst = readout.filter { $0.ancActive }.map(\.reductionDb).max() ?? 0
                return "Cancelling" + (st.locked != 0 ? " · locked at \(fmtHz(st.freq)) Hz" : "")
                    + String(format: " · worst tone %.1f dB", worst)
            default:
                switch st.anc_error {
                case HK_ANC_ERR_NO_PATH:
                    return "The mic can't hear the headphones. Put it inside the earcup, turn the volume up a little, press Re-measure."
                case HK_ANC_ERR_NO_HUM:
                    return "The mic doesn't hear a hum at these frequencies. Run Find hum in Lock mode first."
                default:
                    return "No mic open"
                }
            }
        }
    }

    var statusColor: Color {
        let st = status
        if mode == HK_MODE_MANUAL { return .secondary }
        if st.input_active == 0 { return .red }
        if mode == HK_MODE_LOCK { return st.locked != 0 ? .green : .orange }
        switch st.anc_state {
        case HK_ANC_RUNNING: return .green
        case HK_ANC_CALIBRATING: return .orange
        case HK_ANC_FAILED: return .red
        default: return .secondary
        }
    }
}

// MARK: - Views

struct ContentView: View {
    @EnvironmentObject var m: HumModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                DevicesBox()
                ModeBox()
                FrequencyBox()
                TonesBox()
                StartBar()
            }
            .padding(18)
        }
        .frame(minWidth: 640, idealWidth: 680, minHeight: 600, idealHeight: 820)
    }
}

struct DevicesBox: View {
    @EnvironmentObject var m: HumModel

    var body: some View {
        GroupBox {
            VStack(alignment: .leading, spacing: 8) {
                Picker("Headphones", selection: $m.outputID) {
                    ForEach(m.outputs) { d in Text(d.label).tag(d.id) }
                }
                Picker("Mic", selection: $m.inputID) {
                    ForEach(m.inputs) { d in Text(d.label).tag(d.id) }
                }
                HStack {
                    Button("Refresh devices") {
                        m.loadDevices()
                        m.reopen()
                    }
                    Spacer()
                }
                ForEach(m.deviceWarnings, id: \.self) { w in
                    Label(w, systemImage: "exclamationmark.triangle.fill")
                        .font(.callout)
                        .foregroundStyle(Color.orange)
                        .fixedSize(horizontal: false, vertical: true)
                }
                if let msg = m.audioMessage {
                    Text(msg).font(.callout).foregroundStyle(Color.red).fixedSize(horizontal: false, vertical: true)
                }
            }
            .padding(6)
        } label: {
            Text("Devices").font(.headline)
        }
    }
}

struct ModeBox: View {
    @EnvironmentObject var m: HumModel

    var body: some View {
        GroupBox {
            VStack(alignment: .leading, spacing: 8) {
                Picker("Mode", selection: $m.mode) {
                    Text("Manual").tag(HK_MODE_MANUAL)
                    Text("Lock").tag(HK_MODE_LOCK)
                    Text("Auto ANC").tag(HK_MODE_ANC)
                }
                .pickerStyle(.segmented)
                .labelsHidden()
                Text(m.modeHelp)
                    .font(.callout)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Circle().fill(m.statusColor).frame(width: 9, height: 9)
                    Text(m.statusText).font(.callout).fixedSize(horizontal: false, vertical: true)
                }
            }
            .padding(6)
        } label: {
            Text("Mode").font(.headline)
        }
    }
}

struct FrequencyBox: View {
    @EnvironmentObject var m: HumModel

    var body: some View {
        GroupBox {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 6) {
                    Text("Fundamental")
                    TextField("Hz", value: $m.fundamental, format: .number.precision(.fractionLength(3)))
                        .textFieldStyle(.roundedBorder)
                        .frame(width: 90)
                    Text("Hz")
                    Spacer()
                    nudge("−1", -1)
                    nudge("−0.1", -0.1)
                    nudge("−0.01", -0.01)
                    nudge("+0.01", 0.01)
                    nudge("+0.1", 0.1)
                    nudge("+1", 1)
                }
                HStack(spacing: 8) {
                    Button {
                        m.findHum()
                    } label: {
                        Label("Find hum", systemImage: "magnifyingglass")
                    }
                    .disabled(m.finding || m.status.input_active == 0)
                    Button("50 Hz") { m.fundamental = 50 }
                    Button("60 Hz") { m.fundamental = 60 }
                    if m.finding { ProgressView().controlSize(.small) }
                    Spacer()
                }
                if let f = m.findMessage {
                    Text(f).font(.callout).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
                }
            }
            .padding(6)
        } label: {
            Text("Hum").font(.headline)
        }
    }

    private func nudge(_ title: String, _ d: Double) -> some View {
        Button(title) { m.nudge(d) }
            .buttonStyle(.bordered)
            .controlSize(.small)
    }
}

struct TonesBox: View {
    @EnvironmentObject var m: HumModel

    var body: some View {
        GroupBox {
            VStack(alignment: .leading, spacing: 10) {
                ForEach(0..<kH, id: \.self) { k in
                    ToneRow(k: k)
                    if k < kH - 1 { Divider() }
                }
            }
            .padding(6)
        } label: {
            Text("Tones").font(.headline)
        }
    }
}

struct ToneRow: View {
    @EnvironmentObject var m: HumModel
    let k: Int

    var body: some View {
        let anc = m.mode == HK_MODE_ANC
        let r = m.readout[k]
        let hz = m.status.freq * Double(k + 1)
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 10) {
                Toggle(isOn: $m.harmonics[k].enabled) {
                    Text("\(k + 1)×   " + String(format: "%.2f Hz", hz)).monospacedDigit()
                }
                Spacer()
                MicMeter(db: r.micDb, snr: r.snrDb)
                if anc && r.ancActive {
                    Text(String(format: "%+.1f dB", r.reductionDb))
                        .monospacedDigit()
                        .foregroundStyle(r.reductionDb < -10 ? Color.green : Color.orange)
                        .frame(width: 70, alignment: .trailing)
                        .help("How much quieter this tone is at your ear than without HumKiller")
                }
            }
            if anc {
                if m.harmonics[k].enabled {
                    Text(r.ancActive ? String(format: "playing %.1f dBFS at %.0f°", r.outDb, r.outPhase) : "waiting")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            } else if m.harmonics[k].enabled {
                HStack {
                    Text("Level").frame(width: 46, alignment: .leading)
                    Slider(value: $m.harmonics[k].levelDb, in: -80...(-20))
                    Text(String(format: "%.1f dB", m.harmonics[k].levelDb)).monospacedDigit().frame(width: 66, alignment: .trailing)
                    Stepper("Level", value: $m.harmonics[k].levelDb, in: -80...(-20), step: 0.5).labelsHidden()
                }
                HStack {
                    Text("Phase").frame(width: 46, alignment: .leading)
                    Slider(value: $m.harmonics[k].phaseDeg, in: -180...180)
                    Text(String(format: "%.0f°", m.harmonics[k].phaseDeg)).monospacedDigit().frame(width: 66, alignment: .trailing)
                    Stepper("Phase", onIncrement: { m.shiftPhase(k, 2) }, onDecrement: { m.shiftPhase(k, -2) }).labelsHidden()
                }
            }
        }
    }
}

struct MicMeter: View {
    let db: Double
    let snr: Double

    var body: some View {
        let frac = max(0, min(1, (db + 100) / 70))   // -100 ... -30 dBFS
        HStack(spacing: 6) {
            ZStack(alignment: .leading) {
                Capsule().fill(Color.secondary.opacity(0.2))
                Capsule().fill(snr > 10 ? Color.accentColor : Color.secondary.opacity(0.6)).frame(width: 90 * frac)
            }
            .frame(width: 90, height: 6)
            Text(db > -150 ? String(format: "%.0f dB", db) : "—")
                .font(.caption)
                .monospacedDigit()
                .foregroundStyle(.secondary)
                .frame(width: 48, alignment: .trailing)
        }
        .help("What the mic hears at this tone. Coloured = clearly above the background noise.")
    }
}

struct StartBar: View {
    @EnvironmentObject var m: HumModel

    var body: some View {
        HStack(spacing: 10) {
            if m.mode == HK_MODE_ANC {
                Button("Re-measure") { hk_anc_restart() }.disabled(!m.armed)
            } else {
                Text("Volume")
                Slider(value: $m.master, in: 0...1).frame(width: 180)
            }
            Spacer()
            Button(m.armed ? "Stop" : "Start") { m.armed.toggle() }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
        }
    }
}

// MARK: - App

final class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
    func applicationWillTerminate(_ notification: Notification) { hk_audio_close() }
}

@main
struct HumKillerApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @StateObject private var model = HumModel()

    var body: some Scene {
        WindowGroup("HumKiller") {
            ContentView().environmentObject(model)
        }
        .windowResizability(.contentMinSize)
    }
}

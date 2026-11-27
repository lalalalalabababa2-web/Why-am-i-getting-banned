package app.humkiller

/** The C++ engine (src/main/cpp/hk_android.cpp over humkiller/core). */
object Native {
    init {
        System.loadLibrary("humkiller")
    }

    const val MODE_MANUAL = 0
    const val MODE_LOCK = 1
    const val MODE_ANC = 2

    const val ANC_IDLE = 0
    const val ANC_CALIBRATING = 1
    const val ANC_RUNNING = 2
    const val ANC_FAILED = 3

    const val ANC_ERR_NO_PATH = 1
    const val ANC_ERR_NO_HUM = 2

    const val FIND_READY = 2

    const val PRESET_UNPROCESSED = 9

    @JvmStatic external fun init()
    /** 0 = headphones and mic running, 1 = headphones only, < 0 = headphones failed. Device 0 = system choice. */
    @JvmStatic external fun open(outDevice: Int, inDevice: Int, mic: Boolean): Int
    @JvmStatic external fun close()
    @JvmStatic external fun needsReopen(): Boolean
    @JvmStatic external fun inputPreset(): Int
    @JvmStatic external fun outputDeviceId(): Int
    @JvmStatic external fun inputDeviceId(): Int

    @JvmStatic external fun setMode(mode: Int)
    @JvmStatic external fun setArmed(armed: Boolean)
    @JvmStatic external fun setFundamental(hz: Double)
    @JvmStatic external fun setHarmonic(k: Int, enabled: Boolean, levelDb: Float, phaseDeg: Float)
    @JvmStatic external fun setMaster(gain: Float)
    @JvmStatic external fun ancRestart()
    @JvmStatic external fun findStart()

    /** [mode, armed, input_active, freq, locked, anc_state, anc_error, find_state, input_rms_db, dither_floor_db] */
    @JvmStatic external fun status(out: DoubleArray)
    /** Per harmonic: [mic_db, snr_db, reduction_db, out_db, out_phase_deg, anc_active] x 4 */
    @JvmStatic external fun harmonics(out: FloatArray)
    /** [ok, f0, prominence x 4]. Slow-ish (an FFT); call off the main thread. */
    @JvmStatic external fun findCompute(out: DoubleArray)
}

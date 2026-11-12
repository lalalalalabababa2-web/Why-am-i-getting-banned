package app.offlineai.chat.ui

import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer

/**
 * Speech to text for the message box, with the phone's own on-device recognizer (Android 12 and
 * later): what is said never leaves the phone. Where a phone has no on-device recognizer it says
 * so; it never falls back to one that goes online.
 */
class Dictation(
    private val context: Context,
    /** Words so far, while speaking. */
    private val onPartial: (String) -> Unit,
    /** The final words (empty if nothing was understood), or the reason it stopped. */
    private val onDone: (text: String, error: String?) -> Unit,
    /** How loud the voice is right now, 0 to 1 (for the button to move with it). */
    private val onLevel: (Float) -> Unit = {},
) {
    private var recognizer: SpeechRecognizer? = null

    val listening: Boolean get() = recognizer != null

    companion object {
        /** The reason given when only silence came in. */
        const val NOTHING_HEARD = "Nothing was heard."

        /** Whether this phone can turn speech into text without going online. */
        fun available(context: Context): Boolean =
            Build.VERSION.SDK_INT >= 31 && runCatching { SpeechRecognizer.isOnDeviceRecognitionAvailable(context) }.getOrDefault(false)
    }

    /** Starts listening; returns why it cannot, or null. */
    fun start(): String? {
        if (Build.VERSION.SDK_INT < 31) return "Dictation needs Android 12 or later, for speech recognition that stays on the phone."
        if (!SpeechRecognizer.isOnDeviceRecognitionAvailable(context)) {
            return "This phone has no speech recognition that works offline. On many phones it comes with Google's " +
                "speech services (Settings, System, Languages, On-device recognition)."
        }
        val r = try {
            SpeechRecognizer.createOnDeviceSpeechRecognizer(context)
        } catch (e: Exception) {
            return "Speech recognition could not start: ${e.message ?: e}"
        }
        r.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) {}
            override fun onBeginningOfSpeech() {}
            // recognizers report about -2 dB for silence and 10 for a raised voice
            override fun onRmsChanged(rmsdB: Float) = onLevel(((rmsdB + 2f) / 12f).coerceIn(0f, 1f))
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {}
            override fun onEvent(eventType: Int, params: Bundle?) {}

            override fun onPartialResults(partialResults: Bundle?) {
                val words = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()
                if (!words.isNullOrBlank()) onPartial(words)
            }

            override fun onResults(results: Bundle?) {
                val words = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull() ?: ""
                finish(words, null)
            }

            override fun onError(error: Int) {
                finish("", when (error) {
                    SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> NOTHING_HEARD
                    SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Dictation needs the microphone permission."
                    SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED, SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE ->
                        "The phone's offline speech recognition does not have this language yet."
                    else -> "Speech recognition stopped (code $error)."
                })
            }
        })
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            .putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
        return try {
            r.startListening(intent)
            recognizer = r
            null
        } catch (e: Exception) {
            r.destroy()
            "Speech recognition could not start: ${e.message ?: e}"
        }
    }

    /** Stops listening; what was said so far comes back through onDone. */
    fun stop() {
        runCatching { recognizer?.stopListening() }
    }

    /** Gives up without a result. */
    fun cancel() {
        val r = recognizer ?: return
        recognizer = null
        runCatching { r.cancel() }
        runCatching { r.destroy() }
    }

    private fun finish(text: String, error: String?) {
        val r = recognizer ?: return  // cancelled meanwhile
        recognizer = null
        runCatching { r.destroy() }
        onDone(text, error)
    }
}

package app.offlineai.chat.engine

/**
 * The calls into the native engine (app/src/main/cpp/jni_bridge.cpp). Text crosses as UTF-8
 * bytes both ways. Load, chat, read-ahead and unload must all come from the same single thread;
 * only [nativeStop], [nativeAllowReadAhead], [nativeSetThreads] and [nativeSetBackground] may be
 * called from anywhere.
 */
object NativeEngine {
    @Volatile
    private var initialised = false

    @Synchronized
    fun init(nativeLibraryDir: String) {
        if (initialised) return
        System.loadLibrary("offlineai")
        nativeInit(nativeLibraryDir)
        initialised = true
    }

    @JvmStatic external fun nativeInit(libDir: String)
    @JvmStatic external fun nativeSystemInfo(): String
    /** [options] is JSON (UTF-8): n_ctx, n_threads, n_batch, n_ubatch, low_memory, kv_q8, spec_n_max, spec_ngram, drafter, mmproj, image_max_tokens. */
    @JvmStatic external fun nativeLoad(path: ByteArray, options: ByteArray, listener: LoadListener?): ByteArray?
    @JvmStatic external fun nativeUnload()
    /** A second model next to the first, for team replies; null on success, else why it failed. */
    @JvmStatic external fun nativeLoadPartner(path: ByteArray, options: ByteArray): ByteArray?
    @JvmStatic external fun nativeUnloadPartner()
    @JvmStatic external fun nativeInfo(): ByteArray
    @JvmStatic external fun nativeStop()
    @JvmStatic external fun nativeResetCache()
    @JvmStatic external fun nativeReleaseMedia()
    @JvmStatic external fun nativeChat(request: ByteArray, listener: ChatListener?): ByteArray
    /**
     * Reads the conversation ahead of the next message, so the next reply only has to read the
     * message itself. [request] is what [nativeChat] takes, with the next message in it as the
     * text given under "probe". Same thread as load and chat.
     */
    @JvmStatic external fun nativeReadAhead(request: ByteArray): ByteArray
    /** From any thread. Off ends a read-ahead in progress after its current step (about a second) and holds the next ones back. */
    @JvmStatic external fun nativeAllowReadAhead(on: Boolean)
    @JvmStatic external fun nativeSetThreads(n: Int)
    /** Gentle writing while another app is in front: [threads] threads, low priority, takes effect at the next step. */
    @JvmStatic external fun nativeSetBackground(on: Boolean, threads: Int)
    @JvmStatic external fun nativeBench(threads: IntArray, nPrompt: Int, nGen: Int): ByteArray
}

interface LoadListener {
    /** Return false to cancel loading. */
    fun onProgress(progress: Float): Boolean
    /** Loading is done; the weights are being read once so the first reply starts quickly. */
    fun onWarmup()
}

interface ChatListener {
    fun onPromptProgress(done: Int, total: Int)
    fun onUpdate(reasoning: ByteArray, content: ByteArray, generated: Int)
    /** About to read attachment [index] of [total]; index -1 while the picture part loads. */
    fun onMedia(index: Int, total: Int)
}

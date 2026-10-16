package app.offlineai.chat.engine

/**
 * The calls into the native engine (app/src/main/cpp/jni_bridge.cpp). Text crosses as UTF-8
 * bytes both ways. Load, chat and unload must all come from the same single thread; only
 * [nativeStop] may be called from anywhere.
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
    @JvmStatic external fun nativeLoad(
        path: ByteArray,
        nCtx: Int,
        nThreads: Int,
        nBatch: Int,
        useMmap: Boolean,
        listener: LoadListener?,
    ): ByteArray?
    @JvmStatic external fun nativeUnload()
    @JvmStatic external fun nativeInfo(): ByteArray
    @JvmStatic external fun nativeStop()
    @JvmStatic external fun nativeResetCache()
    @JvmStatic external fun nativeChat(request: ByteArray, listener: ChatListener?): ByteArray
}

interface LoadListener {
    /** Return false to cancel loading. */
    fun onProgress(progress: Float): Boolean
}

interface ChatListener {
    fun onPromptProgress(done: Int, total: Int)
    fun onUpdate(reasoning: ByteArray, content: ByteArray, generated: Int)
}

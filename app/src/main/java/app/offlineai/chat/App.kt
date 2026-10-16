package app.offlineai.chat

import android.app.Application
import android.content.Context
import app.offlineai.chat.data.ChatStore
import app.offlineai.chat.data.ModelStore
import app.offlineai.chat.data.Settings
import app.offlineai.chat.engine.EngineController
import app.offlineai.chat.engine.NativeEngine
import java.io.File

class App : Application() {
    lateinit var settings: Settings
        private set
    lateinit var models: ModelStore
        private set
    lateinit var chats: ChatStore
        private set
    lateinit var engine: EngineController
        private set
    lateinit var chat: ChatController
        private set

    /** Set when the native engine could not start; the app then explains instead of crashing. */
    var nativeError: String? = null
        private set

    override fun onCreate() {
        super.onCreate()
        settings = Settings(this)
        models = ModelStore(this)
        chats = ChatStore(this)
        engine = EngineController()
        chat = ChatController(this)
        try {
            NativeEngine.init(applicationInfo.nativeLibraryDir)
        } catch (t: Throwable) {
            nativeError = "The AI engine could not start on this phone: ${t.message ?: t}"
        }
        chat.restore()
    }

    /** Loads the model used last time, if it is still here and nothing is loaded. */
    fun loadLastModel() {
        if (nativeError != null || engine.loaded != null || engine.phase != EngineController.Phase.IDLE) return
        val name = settings.lastModelFile ?: return
        val model = models.find(name) ?: return
        loadModel(model.file, model.displayName)
    }

    fun loadModel(file: File, displayName: String, onDone: ((String?) -> Unit)? = null) {
        settings.lastModelFile = file.name
        engine.load(file.name, displayName, file.absolutePath, settings.contextSize, settings.effectiveThreads(), onDone)
    }

    /** The loaded model no longer matches the settings (context size or threads changed). */
    fun needsReload(): Boolean {
        val m = engine.loaded ?: return false
        return m.nCtx != settings.contextSize || m.nThreads != settings.effectiveThreads()
    }

    fun reloadIfNeeded() {
        val m = engine.loaded ?: return
        if (!needsReload() || engine.isBusy) return
        engine.load(m.key, m.displayName, m.path, settings.contextSize, settings.effectiveThreads())
    }

    companion object {
        fun of(context: Context): App = context.applicationContext as App
    }
}

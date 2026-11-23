package com.umt.toolkit

import android.app.Application
import android.content.ComponentCallbacks2

class UmtApp : Application() {
    lateinit var toolkit: Toolkit
        private set

    override fun onCreate() {
        super.onCreate()
        toolkit = Toolkit(this)
        toolkit.start()
    }

    override fun onTrimMemory(level: Int) {
        super.onTrimMemory(level)
        if (level >= ComponentCallbacks2.TRIM_MEMORY_BACKGROUND) {
            val icons = toolkit.scanner.clearIconCache()
            toolkit.perf.clearHistory()
            toolkit.log.d("App", "Trimmed memory (level $level): $icons cached icons dropped")
        }
    }
}

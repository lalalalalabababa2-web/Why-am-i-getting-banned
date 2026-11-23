package com.umt.toolkit.data

import com.umt.toolkit.core.AtomicJsonStore
import com.umt.toolkit.core.UmtLog
import com.umt.toolkit.model.EspSettings
import com.umt.toolkit.model.GovernorSettings
import com.umt.toolkit.model.OverlaySettings
import com.umt.toolkit.model.ToolkitState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.io.File

/** The single source of truth for [ToolkitState]; writes are debounced and atomic. */
class ToolkitRepository(dir: File, private val log: UmtLog, private val scope: CoroutineScope) {
    private val store = AtomicJsonStore(File(dir, "toolkit.json"))
    private val _state = MutableStateFlow(store.read { ToolkitState() }.sanitized())
    val state: StateFlow<ToolkitState> = _state
    private var pendingSave: Job? = null

    val current: ToolkitState get() = _state.value

    fun update(transform: (ToolkitState) -> ToolkitState) {
        _state.update { transform(it).sanitized() }
        scheduleSave()
    }

    fun updateOverlays(f: (OverlaySettings) -> OverlaySettings) = update { it.copy(overlays = f(it.overlays)) }
    fun updateEsp(f: (EspSettings) -> EspSettings) = update { it.copy(esp = f(it.esp)) }
    fun updateGovernor(f: (GovernorSettings) -> GovernorSettings) = update { it.copy(governor = f(it.governor)) }

    /** Replaces everything but the integration target (a profile should not switch apps). */
    fun applyProfileState(state: ToolkitState) = update {
        state.copy(integration = state.integration.copy(targetPackage = it.integration.targetPackage))
    }

    /** Kill switch: every overlay layer off. */
    fun killAllOverlays() = updateOverlays {
        it.copy(hudEnabled = false, reticleEnabled = false, guideEnabled = false, dimmerEnabled = false, espEnabled = false)
    }

    fun resetAll() {
        _state.value = ToolkitState()
        scheduleSave()
        log.i("Settings", "All settings reset to defaults")
    }

    fun flush() {
        pendingSave?.cancel()
        save()
    }

    private fun scheduleSave() {
        pendingSave?.cancel()
        pendingSave = scope.launch(Dispatchers.IO) {
            delay(300)
            save()
        }
    }

    private fun save() {
        try {
            store.write(_state.value)
        } catch (e: Exception) {
            log.e("Settings", "Could not save settings", e)
        }
    }
}

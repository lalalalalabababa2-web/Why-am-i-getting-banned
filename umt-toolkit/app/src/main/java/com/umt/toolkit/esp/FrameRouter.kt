package com.umt.toolkit.esp

import com.umt.sdk.EntityFrame
import com.umt.toolkit.data.ToolkitRepository
import com.umt.toolkit.integration.IntegrationHub
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/**
 * Supplies the current entity frame to whoever needs it (the in-app preview, the overlay):
 * either the Local Sandbox Test Feed stepped at the governor's overlay rate, or frames from the
 * connected integrated app. Nothing runs while nobody is watching.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class FrameRouter(
    private val scope: CoroutineScope,
    private val repo: ToolkitRepository,
    private val hub: IntegrationHub,
    val sandbox: SandboxFeed,
) {
    private val _frame = MutableStateFlow<EntityFrame?>(null)
    val frame: StateFlow<EntityFrame?> = _frame
    private val _rate = MutableStateFlow(0f)
    val rate: StateFlow<Float> = _rate
    private val watchers = MutableStateFlow(0)

    private data class Plan(val watching: Boolean, val source: String, val target: String?, val fps: Int, val count: Int)

    init {
        scope.launch {
            combine(watchers, repo.state) { w, s ->
                Plan(w > 0, s.esp.source, s.integration.targetPackage, s.governor.overlayMaxFps, s.esp.sandboxEntities)
            }.distinctUntilChanged().flatMapLatest { plan ->
                when {
                    !plan.watching -> emptyFlow()
                    plan.source == "sandbox" -> sandboxFlow(plan.fps, plan.count)
                    plan.target != null -> hub.frames(plan.target)
                    else -> flow { emit(null) }
                }
            }.collect { f -> _frame.value = f }
        }
        scope.launch(Dispatchers.Default) {
            var last: EntityFrame? = null
            var n = 0
            var windowStart = System.currentTimeMillis()
            frame.collect { f ->
                if (f != null && f !== last) n++
                last = f
                val now = System.currentTimeMillis()
                if (now - windowStart >= 1000) {
                    _rate.value = n * 1000f / (now - windowStart)
                    n = 0
                    windowStart = now
                }
            }
        }
    }

    // Stepped and projected off the main thread.
    private fun sandboxFlow(fps: Int, count: Int) = flow {
        if (sandbox.count != count) sandbox.reset(count)
        val period = 1000L / fps.coerceIn(5, 120)
        var last = System.nanoTime()
        while (currentCoroutineContextActive()) {
            val now = System.nanoTime()
            sandbox.step(((now - last) / 1e9f).coerceAtMost(0.25f))
            last = now
            emit(sandbox.frame())
            delay(period)
        }
    }.flowOn(Dispatchers.Default)

    private suspend fun currentCoroutineContextActive() = kotlin.coroutines.coroutineContext.isActive

    fun acquire() { watchers.value = watchers.value + 1 }
    fun release() { watchers.value = (watchers.value - 1).coerceAtLeast(0) }

    /** For screens that want "watching" as a flow of on/off. */
    val active = watchers.map { it > 0 }
}

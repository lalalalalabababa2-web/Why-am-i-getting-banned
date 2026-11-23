package com.umt.toolkit.integration

import com.umt.sdk.Ack
import com.umt.sdk.CoerceResult
import com.umt.sdk.Schema
import com.umt.sdk.coerce
import com.umt.toolkit.core.AtomicJsonStore
import com.umt.toolkit.core.UmtJson
import com.umt.toolkit.core.UmtLog
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.JsonPrimitive
import java.io.File
import java.util.UUID

/** A named set of values for an integrated app, applied through umt-sdk and verified by its ack. */
@Serializable
data class ConfigPatch(
    val id: String,
    val name: String,
    val targetPackage: String,
    val appVersion: String? = null,
    val values: Map<String, JsonPrimitive>,
    val createdAt: Long,
    val notes: String = "",
)

@Serializable
data class PatchHistoryEntry(
    val patchId: String,
    val patchName: String,
    val targetPackage: String,
    val action: String,
    val time: Long,
    /** verified, partial, failed, timeout or blocked */
    val result: String,
    val requested: Map<String, JsonPrimitive>,
    val applied: Map<String, JsonPrimitive> = emptyMap(),
    val rejected: Map<String, String> = emptyMap(),
    /** Values before an apply; what a revert restores. */
    val backup: Map<String, JsonPrimitive> = emptyMap(),
    val message: String? = null,
)

@Serializable
data class PatchStore(
    val patches: List<ConfigPatch> = emptyList(),
    val history: List<PatchHistoryEntry> = emptyList(),
    /** patchId -> the apply that is currently in effect */
    val active: Map<String, PatchHistoryEntry> = emptyMap(),
)

@Serializable
data class PatchBundle(val format: String = FORMAT, val version: Int = 1, val patches: List<ConfigPatch>) {
    companion object { const val FORMAT = "umt-patches" }
}

data class PatchIssue(val key: String?, val error: Boolean, val message: String)
data class DiffRow(val key: String, val label: String, val current: String?, val patched: String, val changes: Boolean)

/** The checks and comparisons behind the patch manager (unit tested). */
object PatchPlanner {
    fun validate(patch: ConfigPatch, schema: Schema?, connected: Boolean): List<PatchIssue> {
        val issues = ArrayList<PatchIssue>()
        if (!connected || schema == null) {
            issues += PatchIssue(null, true, "Not connected to ${patch.targetPackage}")
            return issues
        }
        if (schema.appPackage != patch.targetPackage) issues += PatchIssue(null, true, "Patch is for ${patch.targetPackage}, connected app is ${schema.appPackage}")
        if (!schema.allowRemoteChanges) issues += PatchIssue(null, true, "This build of the app does not allow remote changes")
        if (patch.values.isEmpty()) issues += PatchIssue(null, true, "Patch has no values")
        if (patch.appVersion != null && patch.appVersion != schema.appVersion) {
            issues += PatchIssue(null, false, "Made for version ${patch.appVersion}; the app is now ${schema.appVersion}")
        }
        val specs = schema.values.associateBy { it.key }
        for ((k, v) in patch.values) {
            val spec = specs[k]
            if (spec == null) {
                issues += PatchIssue(k, true, "'$k' no longer exists in the app (incompatible update)")
                continue
            }
            val r = spec.coerce(v)
            if (r is CoerceResult.Rejected) issues += PatchIssue(k, true, "'$k': ${r.reason}")
        }
        return issues
    }

    fun diff(patch: ConfigPatch, schema: Schema?, current: Map<String, JsonPrimitive>): List<DiffRow> {
        val labels = schema?.values?.associate { it.key to it.label }.orEmpty()
        return patch.values.map { (k, v) ->
            val cur = current[k]
            DiffRow(k, labels[k] ?: k, cur?.content, v.content, cur?.content != v.content)
        }
    }

    /** verified = everything applied with the requested value; partial = some; failed = none. */
    fun verify(requested: Map<String, JsonPrimitive>, ack: Ack?): String {
        if (ack == null) return "timeout"
        val ok = requested.count { (k, v) -> ack.applied[k]?.content == v.content || ack.applied[k]?.content?.toDoubleOrNull()?.let { a -> v.content.toDoubleOrNull() == a } == true }
        return when {
            ok == requested.size && requested.isNotEmpty() -> "verified"
            ok > 0 -> "partial"
            else -> "failed"
        }
    }
}

class PatchManager(dir: File, private val hub: IntegrationHub, private val log: UmtLog) {
    private val store = AtomicJsonStore(File(dir, "patches.json"))
    private val _state = MutableStateFlow(store.read { PatchStore() })
    val state: StateFlow<PatchStore> = _state

    fun create(name: String, pkg: String, appVersion: String?, values: Map<String, JsonPrimitive>, notes: String = ""): ConfigPatch {
        val p = ConfigPatch(UUID.randomUUID().toString(), name.trim().ifEmpty { "Patch" }, pkg, appVersion, values, System.currentTimeMillis(), notes)
        commit(_state.value.copy(patches = _state.value.patches + p))
        log.i("Patches", "Created patch '${p.name}' for $pkg (${values.size} values)")
        return p
    }

    fun delete(id: String) = commit(_state.value.let { s -> s.copy(patches = s.patches.filterNot { it.id == id }, active = s.active - id) })

    fun forTarget(pkg: String?) = _state.value.patches.filter { it.targetPackage == pkg }

    suspend fun apply(patchId: String): PatchHistoryEntry {
        val patch = _state.value.patches.first { it.id == patchId }
        val session = hub.session(patch.targetPackage)
        val issues = PatchPlanner.validate(patch, session?.schema, session?.state == LinkState.CONNECTED)
        if (issues.any { it.error }) {
            return record(PatchHistoryEntry(patch.id, patch.name, patch.targetPackage, "apply", System.currentTimeMillis(), "blocked",
                patch.values, message = issues.filter { it.error }.joinToString("; ") { it.message }), activeChange = null)
        }
        val backup = patch.values.keys.mapNotNull { k -> session!!.values[k]?.let { k to it } }.toMap()
        val ack = hub.applyValues(patch.targetPackage, patch.id, patch.values)
        val result = PatchPlanner.verify(patch.values, ack)
        val entry = PatchHistoryEntry(patch.id, patch.name, patch.targetPackage, "apply", System.currentTimeMillis(), result,
            patch.values, ack?.applied.orEmpty(), ack?.rejected.orEmpty(), backup, ack?.message)
        log.i("Patches", "Applied '${patch.name}': $result")
        return record(entry, activeChange = if (result == "verified" || result == "partial") (patch.id to entry) else null)
    }

    suspend fun revert(patchId: String): PatchHistoryEntry {
        val active = _state.value.active[patchId] ?: error("patch is not applied")
        val toRestore = active.backup.filterKeys { it in active.applied }
        val session = hub.session(active.targetPackage)
        if (session?.state != LinkState.CONNECTED) {
            return record(PatchHistoryEntry(patchId, active.patchName, active.targetPackage, "revert", System.currentTimeMillis(), "blocked",
                toRestore, message = "Not connected to ${active.targetPackage}"), activeChange = null)
        }
        val ack = hub.applyValues(active.targetPackage, patchId, toRestore)
        val result = PatchPlanner.verify(toRestore, ack)
        val entry = PatchHistoryEntry(patchId, active.patchName, active.targetPackage, "revert", System.currentTimeMillis(), result,
            toRestore, ack?.applied.orEmpty(), ack?.rejected.orEmpty(), message = ack?.message)
        log.i("Patches", "Reverted '${active.patchName}': $result")
        return record(entry, activeChange = if (result == "verified") (patchId to null) else null)
    }

    fun exportJson(ids: Collection<String>): String =
        UmtJson.encodeToString(PatchBundle(patches = _state.value.patches.filter { it.id in ids }))

    fun importJson(text: String): Int {
        val bundle = UmtJson.decodeFromString<PatchBundle>(text)
        require(bundle.format == PatchBundle.FORMAT) { "not a patch export (format '${bundle.format}')" }
        val existing = _state.value.patches.map { it.id }.toSet()
        val incoming = bundle.patches.map { if (it.id in existing) it.copy(id = UUID.randomUUID().toString()) else it }
        commit(_state.value.copy(patches = _state.value.patches + incoming))
        log.i("Patches", "Imported ${incoming.size} patch(es)")
        return incoming.size
    }

    fun clearHistory() = commit(_state.value.copy(history = emptyList()))

    private fun record(entry: PatchHistoryEntry, activeChange: Pair<String, PatchHistoryEntry?>?): PatchHistoryEntry {
        val s = _state.value
        var active = s.active
        if (activeChange != null) {
            active = if (activeChange.second == null) active - activeChange.first else active + (activeChange.first to activeChange.second!!)
        }
        commit(s.copy(history = (listOf(entry) + s.history).take(200), active = active))
        return entry
    }

    private fun commit(s: PatchStore) {
        _state.value = s
        try {
            store.write(s)
        } catch (e: Exception) {
            log.e("Patches", "Could not save patches", e)
        }
    }
}

package com.umt.toolkit.data

import com.umt.toolkit.core.AtomicJsonStore
import com.umt.toolkit.core.UmtJson
import com.umt.toolkit.core.UmtLog
import com.umt.toolkit.model.ToolkitState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import java.io.File
import java.util.UUID

@Serializable
data class Profile(
    val id: String,
    val name: String,
    val createdAt: Long,
    val updatedAt: Long,
    val state: ToolkitState,
    /** Plugin ids that were enabled when the profile was saved. */
    val enabledPlugins: List<String> = emptyList(),
)

@Serializable
data class ProfileBundle(
    val format: String = FORMAT,
    val version: Int = 1,
    val exportedAt: Long,
    val profiles: List<Profile>,
) {
    companion object {
        const val FORMAT = "umt-profiles"
        const val CONTENT_TYPE = "profiles"
    }
}

data class ImportResult(val added: Int, val renamed: Int)

class ProfileRepository(dir: File, private val log: UmtLog) {
    private val store = AtomicJsonStore(File(dir, "profiles.json"))
    private val _profiles = MutableStateFlow(store.read<List<Profile>> { emptyList() })
    val profiles: StateFlow<List<Profile>> = _profiles

    fun saveCurrent(name: String, state: ToolkitState, enabledPlugins: List<String>): Profile {
        val now = System.currentTimeMillis()
        val profile = Profile(UUID.randomUUID().toString(), name.trim().ifEmpty { "Profile" }, now, now, state, enabledPlugins)
        commit(_profiles.value + profile)
        log.i("Profiles", "Saved profile '${profile.name}'")
        return profile
    }

    fun overwrite(id: String, state: ToolkitState, enabledPlugins: List<String>) = commit(_profiles.value.map {
        if (it.id == id) it.copy(state = state, enabledPlugins = enabledPlugins, updatedAt = System.currentTimeMillis()) else it
    })

    fun rename(id: String, name: String) = commit(_profiles.value.map {
        if (it.id == id) it.copy(name = name.trim().ifEmpty { it.name }, updatedAt = System.currentTimeMillis()) else it
    })

    fun delete(id: String) = commit(_profiles.value.filterNot { it.id == id })

    fun get(id: String): Profile? = _profiles.value.firstOrNull { it.id == id }

    fun findByName(name: String): Profile? = _profiles.value.firstOrNull { it.name.equals(name, ignoreCase = true) }

    fun exportJson(ids: Collection<String>?): String {
        val chosen = if (ids == null) _profiles.value else _profiles.value.filter { it.id in ids }
        return UmtJson.encodeToString(ProfileBundle(exportedAt = System.currentTimeMillis(), profiles = chosen))
    }

    /** Accepts a bundle or a single profile. Ids that clash get new ids; names get "(imported)". */
    fun importJson(text: String): ImportResult {
        val incoming: List<Profile> = try {
            val bundle = UmtJson.decodeFromString<ProfileBundle>(text)
            require(bundle.format == ProfileBundle.FORMAT) { "not a profile export (format '${bundle.format}')" }
            bundle.profiles
        } catch (e: IllegalArgumentException) {
            listOf(UmtJson.decodeFromString<Profile>(text))
        }
        val existing = _profiles.value
        val ids = existing.map { it.id }.toMutableSet()
        val names = existing.map { it.name.lowercase() }.toMutableSet()
        var renamed = 0
        val added = incoming.map { p ->
            var q = p.copy(state = p.state.sanitized())
            if (q.id in ids) q = q.copy(id = UUID.randomUUID().toString())
            if (q.name.lowercase() in names) { q = q.copy(name = "${q.name} (imported)"); renamed++ }
            ids += q.id; names += q.name.lowercase()
            q
        }
        commit(existing + added)
        log.i("Profiles", "Imported ${added.size} profile(s)")
        return ImportResult(added.size, renamed)
    }

    private fun commit(list: List<Profile>) {
        _profiles.value = list
        try {
            store.write(list)
        } catch (e: Exception) {
            log.e("Profiles", "Could not save profiles", e)
        }
    }
}

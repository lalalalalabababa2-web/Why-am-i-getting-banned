package com.umt.toolkit.ui.screens

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.foundation.layout.padding
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.umt.toolkit.core.ProtectedExport
import com.umt.toolkit.data.ProfileBundle
import com.umt.toolkit.ui.LocalMessages
import com.umt.toolkit.ui.LocalToolkit
import com.umt.toolkit.ui.components.ButtonRow
import com.umt.toolkit.ui.components.ConfirmDialog
import com.umt.toolkit.ui.components.EmptyState
import com.umt.toolkit.ui.components.Note
import com.umt.toolkit.ui.components.Panel
import com.umt.toolkit.ui.components.PasswordDialog
import com.umt.toolkit.ui.components.RowDivider
import com.umt.toolkit.ui.components.ScreenColumn
import com.umt.toolkit.ui.components.SmallButton
import com.umt.toolkit.ui.components.TextInputDialog
import com.umt.toolkit.ui.readText
import com.umt.toolkit.ui.theme.Umt
import com.umt.toolkit.ui.writeText
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.DateFormat
import java.util.Date

@Composable
fun ProfilesScreen() {
    val tk = LocalToolkit.current
    val messages = LocalMessages.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val profiles by tk.profiles.profiles.collectAsStateWithLifecycle()
    var naming by remember { mutableStateOf(false) }
    var renaming by remember { mutableStateOf<String?>(null) }
    var deleting by remember { mutableStateOf<String?>(null) }
    var applying by remember { mutableStateOf<String?>(null) }
    // Export: which ids (null = all) and whether to encrypt; the password is asked before the file picker.
    var exportIds by remember { mutableStateOf<List<String>?>(null) }
    var exportProtected by remember { mutableStateOf(false) }
    var askExportPassword by remember { mutableStateOf(false) }
    var exportPassword by remember { mutableStateOf<CharArray?>(null) }
    var importText by remember { mutableStateOf<String?>(null) }
    val df = remember { DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT) }

    val exporter = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        val pw = exportPassword
        exportPassword = null
        if (uri != null) scope.launch {
            try {
                val plain = tk.profiles.exportJson(exportIds)
                val text = if (exportProtected && pw != null) withContext(Dispatchers.Default) {
                    ProtectedExport.encrypt(plain, pw, ProfileBundle.CONTENT_TYPE)
                } else plain
                writeText(context, uri, text)
                messages.show(if (exportProtected) "Protected export saved" else "Export saved")
            } catch (e: Exception) {
                messages.show("Export failed: ${e.message}")
            } finally {
                pw?.fill('\u0000')
            }
        }
    }
    val importer = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) scope.launch {
            try {
                val text = readText(context, uri)
                if (ProtectedExport.isProtected(text)) importText = text
                else {
                    val r = tk.profiles.importJson(text)
                    messages.show("Imported ${r.added} profile(s)" + if (r.renamed > 0) ", ${r.renamed} renamed" else "")
                }
            } catch (e: Exception) {
                messages.show("Import failed: ${e.message}")
            }
        }
    }

    fun startExport(ids: List<String>?, protected: Boolean) {
        exportIds = ids
        exportProtected = protected
        if (protected) askExportPassword = true
        else exporter.launch(if (ids?.size == 1) "${profiles.first { it.id == ids[0] }.name}.umt-profile.json" else "umt-profiles.json")
    }

    ScreenColumn {
        Panel("Profiles") {
            Note("A profile captures every overlay, entity-overlay and governor setting plus which plugins are on. Applying one keeps the current integration target.")
            ButtonRow {
                SmallButton("Save current", primary = true) { naming = true }
                SmallButton("Import") { importer.launch(arrayOf("application/json", "*/*")) }
                SmallButton("Export all", enabled = profiles.isNotEmpty()) { startExport(null, false) }
                SmallButton("Export all (protected)", enabled = profiles.isNotEmpty()) { startExport(null, true) }
            }
        }
        if (profiles.isEmpty()) Panel("Saved") { EmptyState("No profiles yet") }
        profiles.forEach { p ->
            Panel(null) {
                Column(Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) {
                    Text(p.name, style = MaterialTheme.typography.bodyLarge)
                    Text("Updated ${df.format(Date(p.updatedAt))} · ${p.enabledPlugins.size} plugin(s)", style = MaterialTheme.typography.bodySmall, color = Umt.TextDim)
                    val o = p.state.overlays
                    val on = listOfNotNull(
                        "HUD".takeIf { o.hudEnabled }, "Reticle".takeIf { o.reticleEnabled }, "Guide".takeIf { o.guideEnabled },
                        "Dimmer".takeIf { o.dimmerEnabled }, "Entity overlay".takeIf { o.espEnabled },
                    )
                    Text(if (on.isEmpty()) "No overlays on" else on.joinToString(" · "), style = MaterialTheme.typography.bodySmall, color = Umt.TextFaint)
                }
                RowDivider()
                ButtonRow {
                    SmallButton("Apply", primary = true) { applying = p.id }
                    SmallButton("Overwrite") {
                        tk.profiles.overwrite(p.id, tk.repo.current, tk.plugins.enabledIds())
                        messages.show("'${p.name}' updated from the current settings")
                    }
                    SmallButton("Rename") { renaming = p.id }
                    SmallButton("Export") { startExport(listOf(p.id), false) }
                    SmallButton("Export (protected)") { startExport(listOf(p.id), true) }
                    SmallButton("Delete", danger = true) { deleting = p.id }
                }
            }
        }
    }

    if (naming) TextInputDialog("Save profile", "", "Profile name", "Save", onDismiss = { naming = false }) { name ->
        tk.profiles.saveCurrent(name, tk.repo.current, tk.plugins.enabledIds())
        messages.show("Saved '$name'")
    }
    renaming?.let { id ->
        TextInputDialog("Rename profile", profiles.firstOrNull { it.id == id }?.name ?: "", "Profile name", "Rename", onDismiss = { renaming = null }) {
            tk.profiles.rename(id, it)
        }
    }
    deleting?.let { id ->
        ConfirmDialog("Delete profile?", "This cannot be undone. Exports you made are not affected.", "Delete", danger = true, onDismiss = { deleting = null }) {
            tk.profiles.delete(id)
        }
    }
    applying?.let { id ->
        val p = profiles.firstOrNull { it.id == id }
        if (p != null) ConfirmDialog("Apply '${p.name}'?", "Your current overlay, entity-overlay, governor and plugin settings are replaced. Save them as a profile first if you want them back.",
            "Apply", onDismiss = { applying = null }) {
            tk.applyProfile(p)
            messages.show("Applied '${p.name}'")
        }
    }
    if (askExportPassword) PasswordDialog("Protect export", confirmTwice = true, onDismiss = { askExportPassword = false }) { pw ->
        exportPassword = pw
        exporter.launch("umt-profiles.protected.json")
    }
    importText?.let { text ->
        PasswordDialog("Protected file: enter password", confirmTwice = false, onDismiss = { importText = null }) { pw ->
            scope.launch {
                try {
                    val (type, plain) = withContext(Dispatchers.Default) { ProtectedExport.decrypt(text, pw) }
                    require(type == ProfileBundle.CONTENT_TYPE) { "this protected file holds '$type', not profiles" }
                    val r = tk.profiles.importJson(plain)
                    messages.show("Imported ${r.added} profile(s)")
                } catch (e: Exception) {
                    messages.show(e.message ?: "Could not decrypt")
                } finally {
                    pw.fill('\u0000')
                }
            }
        }
    }
}

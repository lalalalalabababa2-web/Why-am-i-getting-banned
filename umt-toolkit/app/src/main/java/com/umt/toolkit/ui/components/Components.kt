@file:OptIn(ExperimentalLayoutApi::class)

package com.umt.toolkit.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.umt.toolkit.ui.theme.Mono
import com.umt.toolkit.ui.theme.Umt

/** Scrollable screen body with consistent padding and spacing. */
@Composable
fun ScreenColumn(content: @Composable ColumnScope.() -> Unit) {
    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
        content = content,
    )
}

/** A bordered section with a small uppercase title and optional actions. */
@Composable
fun Panel(
    title: String?,
    modifier: Modifier = Modifier,
    actions: @Composable RowScope.() -> Unit = {},
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(6.dp))
            .background(Umt.Surface)
            .border(1.dp, Umt.Outline, RoundedCornerShape(6.dp)),
    ) {
        if (title != null) {
            Row(
                Modifier.fillMaxWidth().padding(start = 12.dp, end = 6.dp, top = 8.dp, bottom = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(title.uppercase(), style = MaterialTheme.typography.labelSmall, color = Umt.TextDim, modifier = Modifier.weight(1f))
                actions()
            }
        }
        Column(Modifier.fillMaxWidth().padding(bottom = 6.dp), content = content)
    }
}

@Composable
fun RowDivider() = HorizontalDivider(Modifier.padding(horizontal = 12.dp), thickness = 1.dp, color = Umt.Outline)

@Composable
fun SettingRow(
    title: String,
    subtitle: String? = null,
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    trailing: @Composable RowScope.() -> Unit = {},
) {
    Row(
        modifier
            .fillMaxWidth()
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .defaultMinSize(minHeight = 40.dp)
            .padding(horizontal = 12.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.bodyMedium, color = Umt.Text)
            if (subtitle != null) Text(subtitle, style = MaterialTheme.typography.bodySmall, color = Umt.TextDim)
        }
        trailing()
    }
}

@Composable
fun ToggleRow(title: String, checked: Boolean, subtitle: String? = null, enabled: Boolean = true, onChange: (Boolean) -> Unit) {
    SettingRow(title, subtitle, onClick = if (enabled) ({ onChange(!checked) }) else null) {
        Switch(
            checked = checked,
            onCheckedChange = if (enabled) onChange else null,
            enabled = enabled,
            modifier = Modifier.scale(0.78f).height(28.dp),
            colors = SwitchDefaults.colors(
                checkedTrackColor = Umt.AccentDim,
                checkedThumbColor = Umt.Accent,
                checkedBorderColor = Umt.Accent,
                uncheckedTrackColor = Umt.Surface2,
                uncheckedThumbColor = Umt.TextDim,
                uncheckedBorderColor = Umt.OutlineStrong,
            ),
        )
    }
}

@Composable
fun SliderRow(
    title: String,
    value: Float,
    range: ClosedFloatingPointRange<Float>,
    valueText: (Float) -> String,
    steps: Int = 0,
    enabled: Boolean = true,
    onChange: (Float) -> Unit,
) {
    // Drag locally; commit when the finger lifts so persistence is not hammered.
    var dragging by remember { mutableStateOf(false) }
    var local by remember { mutableFloatStateOf(value) }
    val shown = if (dragging) local else value
    Column(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 2.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(title, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
            Text(valueText(shown), style = Mono, color = Umt.TextDim)
        }
        Slider(
            value = shown.coerceIn(range.start, range.endInclusive),
            onValueChange = { dragging = true; local = it },
            onValueChangeFinished = { dragging = false; onChange(local) },
            valueRange = range,
            steps = steps,
            enabled = enabled,
            modifier = Modifier.height(26.dp),
            colors = SliderDefaults.colors(
                thumbColor = Umt.Accent,
                activeTrackColor = Umt.Accent,
                inactiveTrackColor = Umt.Surface3,
                activeTickColor = Umt.AccentDim,
                inactiveTickColor = Umt.Outline,
            ),
        )
    }
}

/** A row of small selectable chips. */
@Composable
fun ChoiceRow(title: String?, options: List<Pair<String, String>>, selected: String?, enabled: Boolean = true, onSelect: (String) -> Unit) {
    Column(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp)) {
        if (title != null) Text(title, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(bottom = 4.dp))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            options.forEach { (key, label) -> Chip(label, key == selected, enabled) { onSelect(key) } }
        }
    }
}

@Composable
fun Chip(label: String, selected: Boolean, enabled: Boolean = true, leading: Color? = null, onClick: () -> Unit) {
    val shape = RoundedCornerShape(4.dp)
    Row(
        Modifier
            .clip(shape)
            .background(if (selected) Umt.AccentDim else Umt.Surface2)
            .border(1.dp, if (selected) Umt.Accent else Umt.Outline, shape)
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 9.dp, vertical = 5.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (leading != null) {
            Box(Modifier.size(9.dp).clip(RoundedCornerShape(2.dp)).background(leading))
            Spacer(Modifier.width(6.dp))
        }
        Text(label, style = MaterialTheme.typography.labelMedium, color = if (!enabled) Umt.TextFaint else if (selected) Umt.Text else Umt.TextDim)
    }
}

@Composable
fun InfoRow(key: String, value: String, mono: Boolean = false, valueColor: Color = Umt.Text) {
    Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 3.dp), verticalAlignment = Alignment.Top) {
        Text(key, style = MaterialTheme.typography.bodySmall, color = Umt.TextDim, modifier = Modifier.width(118.dp))
        Text(value, style = if (mono) Mono else MaterialTheme.typography.bodySmall, color = valueColor, modifier = Modifier.weight(1f))
    }
}

enum class Tone { Neutral, Accent, Good, Warn, Bad }

fun toneColor(t: Tone) = when (t) {
    Tone.Neutral -> Umt.TextDim
    Tone.Accent -> Umt.Accent
    Tone.Good -> Umt.Good
    Tone.Warn -> Umt.Warn
    Tone.Bad -> Umt.Bad
}

/** Status label: always text plus colour, never colour alone. */
@Composable
fun StatusPill(text: String, tone: Tone) {
    val c = toneColor(tone)
    val shape = RoundedCornerShape(3.dp)
    Row(
        Modifier.clip(shape).border(1.dp, c.copy(alpha = 0.55f), shape).padding(horizontal = 6.dp, vertical = 1.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(6.dp).clip(RoundedCornerShape(3.dp)).background(c))
        Spacer(Modifier.width(5.dp))
        Text(text, style = MaterialTheme.typography.labelSmall, color = Umt.Text, maxLines = 1)
    }
}

@Composable
fun SmallButton(
    text: String,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
    primary: Boolean = false,
    danger: Boolean = false,
    enabled: Boolean = true,
    onClick: () -> Unit,
) {
    val padding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
    val content: @Composable RowScope.() -> Unit = {
        if (icon != null) {
            Icon(icon, null, Modifier.size(16.dp))
            Spacer(Modifier.width(5.dp))
        }
        Text(text, style = MaterialTheme.typography.labelMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
    if (primary) {
        Button(onClick, modifier.height(32.dp), enabled = enabled, shape = RoundedCornerShape(4.dp), contentPadding = padding,
            colors = ButtonDefaults.buttonColors(containerColor = Umt.Accent, contentColor = Color(0xFF0E1419)), content = content)
    } else {
        OutlinedButton(onClick, modifier.height(32.dp), enabled = enabled, shape = RoundedCornerShape(4.dp), contentPadding = padding,
            border = BorderStroke(1.dp, if (danger) Umt.Bad.copy(alpha = 0.6f) else Umt.OutlineStrong),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = if (danger) Umt.Bad else Umt.Text), content = content)
    }
}

@Composable
fun ButtonRow(content: @Composable RowScope.() -> Unit) {
    FlowRow(
        Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) { Row(horizontalArrangement = Arrangement.spacedBy(8.dp), content = content) }
}

@Composable
fun Note(text: String, tone: Tone = Tone.Neutral) {
    Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp)) {
        if (tone != Tone.Neutral) {
            Box(Modifier.padding(top = 4.dp).size(6.dp).clip(RoundedCornerShape(3.dp)).background(toneColor(tone)))
            Spacer(Modifier.width(7.dp))
        }
        Text(text, style = MaterialTheme.typography.bodySmall, color = Umt.TextDim)
    }
}

@Composable
fun EmptyState(text: String) {
    Text(text, style = MaterialTheme.typography.bodySmall, color = Umt.TextFaint, modifier = Modifier.fillMaxWidth().padding(12.dp))
}

/** Compact single-line text field in the graphite style. */
@Composable
fun CompactField(
    value: String,
    onChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier,
    password: Boolean = false,
    keyboard: KeyboardType = KeyboardType.Text,
    mono: Boolean = false,
) {
    val shape = RoundedCornerShape(4.dp)
    Box(
        modifier
            .clip(shape)
            .background(Umt.Surface2)
            .border(1.dp, Umt.Outline, shape)
            .padding(horizontal = 10.dp, vertical = 8.dp),
    ) {
        if (value.isEmpty()) Text(placeholder, style = MaterialTheme.typography.bodyMedium, color = Umt.TextFaint)
        BasicTextField(
            value = value,
            onValueChange = onChange,
            singleLine = true,
            textStyle = (if (mono) Mono else MaterialTheme.typography.bodyMedium).copy(color = Umt.Text),
            cursorBrush = SolidColor(Umt.Accent),
            visualTransformation = if (password) PasswordVisualTransformation() else VisualTransformation.None,
            keyboardOptions = KeyboardOptions(keyboardType = if (password) KeyboardType.Password else keyboard),
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
fun CheckRow(label: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    Row(
        Modifier.fillMaxWidth().clickable { onChange(!checked) }.padding(horizontal = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Checkbox(checked, onChange, colors = CheckboxDefaults.colors(checkedColor = Umt.Accent, uncheckedColor = Umt.OutlineStrong, checkmarkColor = Umt.Bg))
        Text(label, style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
fun ConfirmDialog(title: String, text: String, confirm: String, danger: Boolean = false, onDismiss: () -> Unit, onConfirm: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Umt.Surface2,
        title = { Text(title, style = MaterialTheme.typography.titleMedium) },
        text = { Text(text, style = MaterialTheme.typography.bodyMedium, color = Umt.TextDim) },
        confirmButton = { TextButton(onClick = { onConfirm(); onDismiss() }) { Text(confirm, color = if (danger) Umt.Bad else Umt.Accent) } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel", color = Umt.TextDim) } },
    )
}

@Composable
fun TextInputDialog(title: String, initial: String, placeholder: String, confirm: String, onDismiss: () -> Unit, onConfirm: (String) -> Unit) {
    var text by remember { mutableStateOf(initial) }
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Umt.Surface2,
        title = { Text(title, style = MaterialTheme.typography.titleMedium) },
        text = { CompactField(text, { text = it }, placeholder, Modifier.fillMaxWidth()) },
        confirmButton = { TextButton(onClick = { onConfirm(text); onDismiss() }, enabled = text.isNotBlank()) { Text(confirm, color = Umt.Accent) } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel", color = Umt.TextDim) } },
    )
}

/** Password entry; [confirmTwice] asks for it twice (for encrypting). */
@Composable
fun PasswordDialog(title: String, confirmTwice: Boolean, onDismiss: () -> Unit, onConfirm: (CharArray) -> Unit) {
    var a by remember { mutableStateOf("") }
    var b by remember { mutableStateOf("") }
    val ok = a.length >= 6 && (!confirmTwice || a == b)
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Umt.Surface2,
        title = { Text(title, style = MaterialTheme.typography.titleMedium) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                CompactField(a, { a = it }, "Password (6+ characters)", Modifier.fillMaxWidth(), password = true)
                if (confirmTwice) {
                    CompactField(b, { b = it }, "Repeat password", Modifier.fillMaxWidth(), password = true)
                    if (b.isNotEmpty() && a != b) Text("Passwords differ", color = Umt.Bad, style = MaterialTheme.typography.bodySmall)
                    Text("AES-256-GCM with a PBKDF2 key. There is no way to recover a forgotten password.",
                        style = MaterialTheme.typography.bodySmall, color = Umt.TextDim)
                }
            }
        },
        confirmButton = { TextButton(onClick = { onConfirm(a.toCharArray()); onDismiss() }, enabled = ok) { Text("OK", color = Umt.Accent) } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel", color = Umt.TextDim) } },
    )
}

/** Monospace block for reports and logs. */
@Composable
fun MonoBlock(text: String, modifier: Modifier = Modifier) {
    Text(
        text,
        style = Mono.copy(color = Umt.Text),
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp)
            .clip(RoundedCornerShape(4.dp))
            .background(Umt.Bg)
            .padding(8.dp),
    )
}

fun formatBytes(b: Long): String = when {
    b >= 1L shl 30 -> "%.2f GB".format(b / 1073741824.0)
    b >= 1L shl 20 -> "%.1f MB".format(b / 1048576.0)
    b >= 1L shl 10 -> "%.0f KB".format(b / 1024.0)
    else -> "$b B"
}

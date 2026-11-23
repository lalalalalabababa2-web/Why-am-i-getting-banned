package com.umt.toolkit.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** Dark graphite with one restrained accent. */
object Umt {
    val Bg = Color(0xFF141619)
    val Surface = Color(0xFF1A1D21)
    val Surface2 = Color(0xFF21252A)
    val Surface3 = Color(0xFF2A2F35)
    val Outline = Color(0xFF30353C)
    val OutlineStrong = Color(0xFF3D434B)
    val Text = Color(0xFFE2E5E9)
    val TextDim = Color(0xFF9AA3AD)
    val TextFaint = Color(0xFF6C747E)
    val Accent = Color(0xFF7DA3C4)
    val AccentDim = Color(0xFF2F4253)
    val Good = Color(0xFF7FB38A)
    val Warn = Color(0xFFD1A85E)
    val Bad = Color(0xFFCF7A70)
}

private val scheme = darkColorScheme(
    primary = Umt.Accent,
    onPrimary = Color(0xFF0E1419),
    primaryContainer = Umt.AccentDim,
    onPrimaryContainer = Umt.Text,
    secondary = Umt.Accent,
    onSecondary = Color(0xFF0E1419),
    secondaryContainer = Umt.Surface3,
    onSecondaryContainer = Umt.Text,
    tertiary = Umt.Accent,
    background = Umt.Bg,
    onBackground = Umt.Text,
    surface = Umt.Surface,
    onSurface = Umt.Text,
    surfaceVariant = Umt.Surface2,
    onSurfaceVariant = Umt.TextDim,
    surfaceTint = Color.Transparent,
    outline = Umt.Outline,
    outlineVariant = Umt.Outline,
    error = Umt.Bad,
    onError = Color(0xFF1A0E0C),
    surfaceContainerLowest = Umt.Bg,
    surfaceContainerLow = Umt.Surface,
    surfaceContainer = Umt.Surface,
    surfaceContainerHigh = Umt.Surface2,
    surfaceContainerHighest = Umt.Surface3,
    inverseSurface = Umt.Text,
    inverseOnSurface = Umt.Bg,
)

private val type = Typography(
    titleLarge = TextStyle(fontSize = 17.sp, fontWeight = FontWeight.Medium, lineHeight = 22.sp),
    titleMedium = TextStyle(fontSize = 15.sp, fontWeight = FontWeight.Medium, lineHeight = 20.sp),
    titleSmall = TextStyle(fontSize = 13.sp, fontWeight = FontWeight.Medium, lineHeight = 18.sp),
    bodyLarge = TextStyle(fontSize = 14.sp, lineHeight = 19.sp),
    bodyMedium = TextStyle(fontSize = 13.sp, lineHeight = 18.sp),
    bodySmall = TextStyle(fontSize = 12.sp, lineHeight = 16.sp),
    labelLarge = TextStyle(fontSize = 13.sp, fontWeight = FontWeight.Medium, lineHeight = 18.sp),
    labelMedium = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Medium, lineHeight = 16.sp),
    labelSmall = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.Medium, lineHeight = 14.sp),
)

val Mono = TextStyle(fontFamily = FontFamily.Monospace, fontSize = 12.sp, lineHeight = 17.sp)

@Composable
fun UmtTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = scheme,
        typography = type,
        shapes = Shapes(
            extraSmall = RoundedCornerShape(3.dp),
            small = RoundedCornerShape(4.dp),
            medium = RoundedCornerShape(6.dp),
            large = RoundedCornerShape(8.dp),
            extraLarge = RoundedCornerShape(10.dp),
        ),
        content = content,
    )
}

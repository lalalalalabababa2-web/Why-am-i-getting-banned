@file:OptIn(ExperimentalMaterial3Api::class)

package com.umt.toolkit.ui

import android.content.Context
import android.hardware.display.DisplayManager
import android.net.Uri
import android.os.Bundle
import android.view.Display
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Apps
import androidx.compose.material.icons.outlined.Bookmarks
import androidx.compose.material.icons.outlined.Extension
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Hub
import androidx.compose.material.icons.outlined.Layers
import androidx.compose.material.icons.outlined.Menu
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.Speed
import androidx.compose.material.icons.outlined.Terminal
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.NavigationDrawerItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.umt.toolkit.BuildConfig
import com.umt.toolkit.Toolkit
import com.umt.toolkit.perf.Governor
import com.umt.toolkit.ui.screens.AppDetailScreen
import com.umt.toolkit.ui.screens.AppsScreen
import com.umt.toolkit.ui.screens.ConsoleScreen
import com.umt.toolkit.ui.screens.HomeScreen
import com.umt.toolkit.ui.screens.IntegrationScreen
import com.umt.toolkit.ui.screens.OverlaysScreen
import com.umt.toolkit.ui.screens.PerformanceScreen
import com.umt.toolkit.ui.screens.PluginEditorScreen
import com.umt.toolkit.ui.screens.PluginsScreen
import com.umt.toolkit.ui.screens.ProfilesScreen
import com.umt.toolkit.ui.screens.SettingsScreen
import com.umt.toolkit.ui.theme.Umt
import com.umt.toolkit.ui.theme.UmtTheme
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

val LocalToolkit = staticCompositionLocalOf<Toolkit> { error("no toolkit") }
val LocalMessages = staticCompositionLocalOf<Messages> { error("no messages") }

/** Snackbar messages from any screen. */
class Messages(private val host: SnackbarHostState, private val scope: CoroutineScope) {
    fun show(text: String) {
        scope.launch {
            host.currentSnackbarData?.dismiss()
            host.showSnackbar(text)
        }
    }
}

enum class Dest(val route: String, val title: String, val icon: ImageVector) {
    HOME("home", "Home", Icons.Outlined.Home),
    APPS("apps", "Apps", Icons.Outlined.Apps),
    OVERLAYS("overlays", "Overlays", Icons.Outlined.Layers),
    INTEGRATION("integration", "Integration", Icons.Outlined.Hub),
    PLUGINS("plugins", "Plugins & menus", Icons.Outlined.Extension),
    PERFORMANCE("performance", "Performance", Icons.Outlined.Speed),
    PROFILES("profiles", "Profiles", Icons.Outlined.Bookmarks),
    CONSOLE("console", "Console", Icons.Outlined.Terminal),
    SETTINGS("settings", "Settings", Icons.Outlined.Settings),
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val tk = Toolkit.get(this)
        setContent {
            UmtTheme {
                val state by tk.repo.state.collectAsStateWithLifecycle()
                LaunchedEffect(state.governor.refreshRateHz) {
                    val display = getSystemService(DisplayManager::class.java)?.getDisplay(Display.DEFAULT_DISPLAY)
                    Governor.applyRefreshRate(window, display, state.governor.refreshRateHz)
                }
                AppRoot(tk)
            }
        }
    }

    override fun onStop() {
        super.onStop()
        Toolkit.get(this).repo.flush()
    }
}

@Composable
fun AppRoot(tk: Toolkit) {
    val nav = rememberNavController()
    val drawer = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val snack = remember { SnackbarHostState() }
    val messages = remember { Messages(snack, scope) }
    val entry by nav.currentBackStackEntryAsState()
    val route = entry?.destination?.route ?: Dest.HOME.route
    val top = Dest.entries.firstOrNull { it.route == route }
    val title = top?.title ?: when {
        route.startsWith("app/") -> "App analysis"
        route == "apk" -> "APK analysis"
        route.startsWith("plugin/") -> "Plugin editor"
        else -> "Mod Toolkit"
    }

    CompositionLocalProvider(LocalToolkit provides tk, LocalMessages provides messages) {
        ModalNavigationDrawer(
            drawerState = drawer,
            gesturesEnabled = top != null,
            drawerContent = {
                ModalDrawerSheet(drawerContainerColor = Umt.Surface, modifier = Modifier.width(260.dp)) {
                    Column(Modifier.verticalScroll(rememberScrollState())) {
                        Column(Modifier.padding(horizontal = 16.dp, vertical = 14.dp)) {
                            Text("Universal Mod Toolkit", style = MaterialTheme.typography.titleMedium)
                            Text("v${BuildConfig.VERSION_NAME}", style = MaterialTheme.typography.bodySmall, color = Umt.TextDim)
                        }
                        HorizontalDivider(color = Umt.Outline)
                        Spacer(Modifier.height(6.dp))
                        Dest.entries.forEach { d ->
                            NavigationDrawerItem(
                                label = { Text(d.title, style = MaterialTheme.typography.bodyMedium) },
                                icon = { Icon(d.icon, null, Modifier.padding(0.dp)) },
                                selected = d == top,
                                onClick = {
                                    scope.launch { drawer.close() }
                                    nav.navigate(d.route) {
                                        popUpTo(Dest.HOME.route) { saveState = true }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                },
                                modifier = Modifier.padding(horizontal = 8.dp).height(42.dp).testTag("nav_${d.route}"),
                                colors = NavigationDrawerItemDefaults.colors(
                                    selectedContainerColor = Umt.AccentDim,
                                    unselectedContainerColor = Umt.Surface,
                                    selectedTextColor = Umt.Text,
                                    unselectedTextColor = Umt.TextDim,
                                    selectedIconColor = Umt.Accent,
                                    unselectedIconColor = Umt.TextDim,
                                ),
                            )
                        }
                    }
                }
            },
        ) {
            Scaffold(
                containerColor = Umt.Bg,
                snackbarHost = { SnackbarHost(snack) },
                topBar = {
                    Row(
                        Modifier.fillMaxWidth().height(48.dp).background(Umt.Bg).padding(horizontal = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        if (top != null) {
                            IconButton(onClick = { scope.launch { drawer.open() } }) { Icon(Icons.Outlined.Menu, "Menu") }
                        } else {
                            IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
                        }
                        Text(title, style = MaterialTheme.typography.titleMedium)
                    }
                },
            ) { padding ->
                Box(Modifier.fillMaxSize().padding(padding)) {
                    Navigation(nav)
                }
            }
        }
    }
}

@Composable
private fun Navigation(nav: NavHostController) {
    NavHost(nav, startDestination = Dest.HOME.route) {
        composable(Dest.HOME.route) { HomeScreen(nav) }
        composable(Dest.APPS.route) { AppsScreen(nav) }
        composable(Dest.OVERLAYS.route) { OverlaysScreen(nav) }
        composable(Dest.INTEGRATION.route) { IntegrationScreen() }
        composable(Dest.PLUGINS.route) { PluginsScreen(nav) }
        composable(Dest.PERFORMANCE.route) { PerformanceScreen() }
        composable(Dest.PROFILES.route) { ProfilesScreen() }
        composable(Dest.CONSOLE.route) { ConsoleScreen() }
        composable(Dest.SETTINGS.route) { SettingsScreen() }
        composable("app/{pkg}", arguments = listOf(navArgument("pkg") { type = NavType.StringType })) { e ->
            AppDetailScreen(nav, e.arguments?.getString("pkg"))
        }
        composable("apk") { AppDetailScreen(nav, null) }
        composable("plugin/{id}", arguments = listOf(navArgument("id") { type = NavType.StringType })) { e ->
            PluginEditorScreen(nav, e.arguments?.getString("id") ?: "new")
        }
    }
}

// ---- File helpers shared by the screens ------------------------------------------------------

suspend fun writeText(context: Context, uri: Uri, text: String) = withContext(Dispatchers.IO) {
    context.contentResolver.openOutputStream(uri, "wt")?.use { it.write(text.toByteArray()) }
        ?: error("could not open the file for writing")
}

suspend fun readText(context: Context, uri: Uri, maxBytes: Int = 8 * 1024 * 1024): String = withContext(Dispatchers.IO) {
    context.contentResolver.openInputStream(uri)?.use { input ->
        val bytes = input.readBytes()
        require(bytes.size <= maxBytes) { "file is larger than ${maxBytes / 1048576} MB" }
        String(bytes, Charsets.UTF_8)
    } ?: error("could not open the file")
}

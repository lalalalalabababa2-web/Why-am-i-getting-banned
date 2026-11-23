package com.umt.toolkit.apps

import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.content.pm.PermissionInfo
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.provider.OpenableColumns
import android.util.LruCache
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.core.graphics.drawable.toBitmap
import com.umt.sdk.UmtProtocol
import com.umt.toolkit.core.UmtLog
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import java.io.File
import java.util.zip.ZipFile

data class InstalledApp(
    val packageName: String,
    val label: String,
    val versionName: String?,
    val versionCode: Long,
    val isSystem: Boolean,
    val integrated: Boolean,
    val debuggable: Boolean,
    val enabled: Boolean,
    val targetSdk: Int,
    val minSdk: Int,
    val apkBytes: Long,
    val splitCount: Int,
    val lastUpdate: Long,
)

@Serializable
data class ApkFileInfo(val name: String, val bytes: Long, val kind: String)

@Serializable
data class PermissionRow(val name: String, val protection: String, val granted: Boolean?)

@Serializable
data class AppAnalysis(
    val source: String,
    val packageName: String,
    val label: String,
    val versionName: String?,
    val versionCode: Long,
    val minSdk: Int,
    val targetSdk: Int,
    val compileSdk: Int?,
    val location: String,
    val installer: String?,
    val firstInstall: Long?,
    val lastUpdate: Long?,
    val isSystem: Boolean,
    val debuggable: Boolean,
    val integrated: Boolean,
    val files: List<ApkFileInfo>,
    val totalBytes: Long,
    val permissions: List<PermissionRow>,
    val activities: List<String>,
    val services: List<String>,
    val receivers: List<String>,
    val providers: List<String>,
    val framework: FrameworkReport,
    val deviceAbis: List<String>,
    val deviceSdk: Int,
    val warnings: List<String>,
    val analyzedAt: Long,
)

class AnalysisException(message: String) : Exception(message)

/**
 * Lists installed apps and analyses one installed app or an APK/APKS/XAPK file.
 * Only public data is read: PackageManager metadata and the world-readable APK files.
 */
class AppScanner(private val context: Context, private val log: UmtLog) {
    private val pm: PackageManager = context.packageManager
    private val icons = object : LruCache<String, ImageBitmap>(160) {}

    @Suppress("DEPRECATION")
    suspend fun listInstalled(): List<InstalledApp> = withContext(Dispatchers.IO) {
        val infos: List<PackageInfo> = if (Build.VERSION.SDK_INT >= 33) {
            pm.getInstalledPackages(PackageManager.PackageInfoFlags.of(PackageManager.GET_META_DATA.toLong()))
        } else {
            pm.getInstalledPackages(PackageManager.GET_META_DATA)
        }
        infos.mapNotNull { pi ->
            val ai = pi.applicationInfo ?: return@mapNotNull null
            val splits = ai.splitSourceDirs?.toList().orEmpty()
            InstalledApp(
                packageName = pi.packageName,
                label = ai.loadLabel(pm).toString(),
                versionName = pi.versionName,
                versionCode = versionCode(pi),
                isSystem = (ai.flags and ApplicationInfo.FLAG_SYSTEM) != 0,
                integrated = ai.metaData?.getBoolean(UmtProtocol.META_SUPPORTED, false) == true,
                debuggable = (ai.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0,
                enabled = ai.enabled,
                targetSdk = ai.targetSdkVersion,
                minSdk = if (Build.VERSION.SDK_INT >= 24) ai.minSdkVersion else 0,
                apkBytes = (listOfNotNull(ai.sourceDir) + splits).sumOf { File(it).length() },
                splitCount = splits.size,
                lastUpdate = pi.lastUpdateTime,
            )
        }.sortedBy { it.label.lowercase() }
    }

    suspend fun icon(packageName: String): ImageBitmap? {
        icons.get(packageName)?.let { return it }
        return withContext(Dispatchers.IO) {
            try {
                val bmp = pm.getApplicationIcon(packageName).toBitmap(96, 96, Bitmap.Config.ARGB_8888).asImageBitmap()
                icons.put(packageName, bmp)
                bmp
            } catch (e: Exception) {
                null
            }
        }
    }

    fun clearIconCache(): Int {
        val n = icons.size()
        icons.evictAll()
        return n
    }

    fun launchIntent(packageName: String) = pm.getLaunchIntentForPackage(packageName)

    // ---- Installed app -------------------------------------------------------------------

    @Suppress("DEPRECATION")
    suspend fun analyzeInstalled(packageName: String): AppAnalysis = withContext(Dispatchers.IO) {
        val pi = packageInfoWithComponents(packageName)
            ?: throw AnalysisException("$packageName is not installed or not visible")
        val ai = pi.applicationInfo ?: throw AnalysisException("$packageName has no application info")
        val paths = listOfNotNull(ai.sourceDir) + ai.splitSourceDirs.orEmpty()
        val files = paths.map { p ->
            val f = File(p)
            ApkFileInfo(f.name, f.length(), if (p == ai.sourceDir) "base" else "split")
        }
        val report = scanZips(paths.map(::File))
        val installer = try {
            if (Build.VERSION.SDK_INT >= 30) pm.getInstallSourceInfo(packageName).installingPackageName
            else pm.getInstallerPackageName(packageName)
        } catch (e: Exception) { null }
        build(
            source = "installed",
            pi = pi,
            ai = ai,
            location = ai.sourceDir?.substringBeforeLast('/') ?: "unknown",
            installer = installer,
            files = files,
            report = withSplitAbis(report, paths),
            installed = true,
        )
    }

    @Suppress("DEPRECATION")
    private fun packageInfoWithComponents(pkg: String): PackageInfo? {
        val full = PackageManager.GET_PERMISSIONS or PackageManager.GET_ACTIVITIES or PackageManager.GET_SERVICES or
            PackageManager.GET_RECEIVERS or PackageManager.GET_PROVIDERS or PackageManager.GET_META_DATA
        fun get(flags: Int): PackageInfo? = try {
            if (Build.VERSION.SDK_INT >= 33) pm.getPackageInfo(pkg, PackageManager.PackageInfoFlags.of(flags.toLong()))
            else pm.getPackageInfo(pkg, flags)
        } catch (e: PackageManager.NameNotFoundException) {
            null
        }
        return try {
            get(full)
        } catch (e: RuntimeException) {
            // Very large apps can exceed the binder limit with every component at once.
            log.w("Analyzer", "Full package query failed for $pkg, retrying in parts", e)
            val base = get(PackageManager.GET_PERMISSIONS or PackageManager.GET_META_DATA) ?: return null
            base.activities = runCatching { get(PackageManager.GET_ACTIVITIES)?.activities }.getOrNull()
            base.services = runCatching { get(PackageManager.GET_SERVICES)?.services }.getOrNull()
            base.receivers = runCatching { get(PackageManager.GET_RECEIVERS)?.receivers }.getOrNull()
            base.providers = runCatching { get(PackageManager.GET_PROVIDERS)?.providers }.getOrNull()
            base
        }
    }

    // ---- APK file ------------------------------------------------------------------------

    /** Copies the chosen file into the cache and analyses it; supports .apk, .apks and .xapk. */
    suspend fun analyzeUri(uri: Uri): AppAnalysis = withContext(Dispatchers.IO) {
        val name = displayName(uri) ?: "selected.apk"
        val workDir = File(context.cacheDir, "analyze").apply { deleteRecursively(); mkdirs() }
        val copy = File(workDir, "input.bin")
        context.contentResolver.openInputStream(uri)?.use { input ->
            copy.outputStream().use { input.copyTo(it) }
        } ?: throw AnalysisException("Could not open $name")
        val zip = try {
            ZipFile(copy)
        } catch (e: Exception) {
            throw AnalysisException("$name is not a ZIP-based package (APK, APKS or XAPK). Encrypted bundles such as .apkm are not supported.")
        }
        val innerApks = zip.use { z -> z.entries().asSequence().filter { !it.isDirectory && it.name.endsWith(".apk") }.map { it.name to it.size }.toList() }
        if (innerApks.isEmpty()) {
            analyzeApkFile(copy, name, listOf(ApkFileInfo(name, copy.length(), "base")))
        } else {
            // A bundle: pull out every APK, analyse the base, scan all of them for runtimes and ABIs.
            val extracted = ArrayList<File>()
            ZipFile(copy).use { z ->
                for ((entryName, _) in innerApks) {
                    val out = File(workDir, entryName.substringAfterLast('/'))
                    z.getInputStream(z.getEntry(entryName)).use { input -> out.outputStream().use { input.copyTo(it) } }
                    extracted += out
                }
            }
            val base = extracted.firstOrNull { it.name == "base.apk" }
                ?: extracted.firstOrNull { !it.name.contains("config.") && !it.name.startsWith("split_") }
                ?: extracted.maxByOrNull { it.length() }
                ?: throw AnalysisException("$name contains no APKs")
            val files = extracted.map { ApkFileInfo(it.name, it.length(), if (it == base) "base" else "split") }
            analyzeApkFile(base, name, files, extracted)
        }
    }

    @Suppress("DEPRECATION")
    private fun analyzeApkFile(apk: File, displayName: String, files: List<ApkFileInfo>, all: List<File> = listOf(apk)): AppAnalysis {
        val flags = PackageManager.GET_PERMISSIONS or PackageManager.GET_ACTIVITIES or PackageManager.GET_SERVICES or
            PackageManager.GET_RECEIVERS or PackageManager.GET_PROVIDERS or PackageManager.GET_META_DATA
        val pi = if (Build.VERSION.SDK_INT >= 33) pm.getPackageArchiveInfo(apk.path, PackageManager.PackageInfoFlags.of(flags.toLong()))
        else pm.getPackageArchiveInfo(apk.path, flags)
        if (pi == null) throw AnalysisException("Android could not parse $displayName as an APK")
        val ai = pi.applicationInfo ?: throw AnalysisException("$displayName has no application section")
        ai.sourceDir = apk.path
        ai.publicSourceDir = apk.path
        val report = withSplitAbis(scanZips(all), all.map { it.name })
        return build("file", pi, ai, displayName, null, files, report, installed = false)
    }

    // ---- Shared --------------------------------------------------------------------------

    private fun scanZips(files: List<File>): FrameworkReport {
        val entries = ArrayList<ZipEntryInfo>()
        for (f in files) {
            try {
                ZipFile(f).use { z -> z.entries().asSequence().filter { !it.isDirectory }.forEach { entries += ZipEntryInfo(it.name, it.size) } }
            } catch (e: Exception) {
                log.w("Analyzer", "Could not read ${f.name}", e)
            }
        }
        return FrameworkDetector.detect(entries.asSequence())
    }

    private fun withSplitAbis(report: FrameworkReport, paths: List<String>): FrameworkReport {
        val fromSplits = paths.mapNotNull { FrameworkDetector.abiFromSplitName(it) }
        if (fromSplits.isEmpty()) return report
        return report.copy(abis = (report.abis + fromSplits).distinct())
    }

    @Suppress("DEPRECATION")
    private fun build(
        source: String, pi: PackageInfo, ai: ApplicationInfo, location: String, installer: String?,
        files: List<ApkFileInfo>, report: FrameworkReport, installed: Boolean,
    ): AppAnalysis {
        val requested = pi.requestedPermissions.orEmpty()
        val requestedFlags = pi.requestedPermissionsFlags
        val permissions = requested.mapIndexed { i, name ->
            val protection = try {
                val info = pm.getPermissionInfo(name, 0)
                val base = if (Build.VERSION.SDK_INT >= 28) info.protection else info.protectionLevel and PermissionInfo.PROTECTION_MASK_BASE
                when (base) {
                    PermissionInfo.PROTECTION_DANGEROUS -> "dangerous"
                    PermissionInfo.PROTECTION_NORMAL -> "normal"
                    PermissionInfo.PROTECTION_SIGNATURE -> "signature"
                    else -> "other"
                }
            } catch (e: PackageManager.NameNotFoundException) {
                "undefined on this device"
            }
            val granted = if (installed && requestedFlags != null && i < requestedFlags.size)
                (requestedFlags[i] and PackageInfo.REQUESTED_PERMISSION_GRANTED) != 0 else null
            PermissionRow(name, protection, granted)
        }.sortedWith(compareBy({ order(it.protection) }, { it.name }))

        val deviceAbis = Build.SUPPORTED_ABIS.toList()
        val minSdk = if (Build.VERSION.SDK_INT >= 24) ai.minSdkVersion else 0
        val warnings = ArrayList<String>()
        if (minSdk > Build.VERSION.SDK_INT) warnings += "Needs Android API $minSdk; this device runs API ${Build.VERSION.SDK_INT}."
        if (!installed && ai.targetSdkVersion < 23 && Build.VERSION.SDK_INT >= 34) warnings += "Targets API ${ai.targetSdkVersion}; Android 14+ refuses to install apps targeting below API 23."
        if (report.nativeLibs.isNotEmpty() || report.abis.isNotEmpty()) {
            if (report.abis.none { it in deviceAbis }) warnings += "No native code for this device's ABIs (${deviceAbis.joinToString()}); it would not run here."
            else if (report.abis.none { it == deviceAbis.first() }) warnings += "No native code for the primary ABI ${deviceAbis.first()}; it would run in a slower compatibility mode."
        }
        val debuggable = (ai.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0
        if (debuggable && !installed) warnings += "Built as debuggable (a development build)."
        if (files.size > 1 && files.none { it.kind == "base" }) warnings += "Bundle has no base APK."

        return AppAnalysis(
            source = source,
            packageName = pi.packageName,
            label = ai.loadLabel(pm).toString(),
            versionName = pi.versionName,
            versionCode = versionCode(pi),
            minSdk = minSdk,
            targetSdk = ai.targetSdkVersion,
            compileSdk = if (Build.VERSION.SDK_INT >= 31) ai.compileSdkVersion.takeIf { it > 0 } else null,
            location = location,
            installer = installer,
            firstInstall = if (installed) pi.firstInstallTime else null,
            lastUpdate = if (installed) pi.lastUpdateTime else null,
            isSystem = (ai.flags and ApplicationInfo.FLAG_SYSTEM) != 0,
            debuggable = debuggable,
            integrated = ai.metaData?.getBoolean(UmtProtocol.META_SUPPORTED, false) == true,
            files = files,
            totalBytes = files.sumOf { it.bytes },
            permissions = permissions,
            activities = pi.activities.orEmpty().map { it.name },
            services = pi.services.orEmpty().map { it.name },
            receivers = pi.receivers.orEmpty().map { it.name },
            providers = pi.providers.orEmpty().map { it.name },
            framework = report,
            deviceAbis = deviceAbis,
            deviceSdk = Build.VERSION.SDK_INT,
            warnings = warnings,
            analyzedAt = System.currentTimeMillis(),
        )
    }

    private fun order(protection: String) = when (protection) {
        "dangerous" -> 0; "signature" -> 1; "normal" -> 2; else -> 3
    }

    private fun displayName(uri: Uri): String? = try {
        context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c ->
            if (c.moveToFirst()) c.getString(0) else null
        }
    } catch (e: Exception) { null }

    @Suppress("DEPRECATION")
    private fun versionCode(pi: PackageInfo): Long =
        if (Build.VERSION.SDK_INT >= 28) pi.longVersionCode else pi.versionCode.toLong()
}

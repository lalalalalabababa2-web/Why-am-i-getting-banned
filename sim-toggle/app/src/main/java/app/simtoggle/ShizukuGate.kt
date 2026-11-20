package app.simtoggle

import android.content.Context
import android.content.pm.PackageManager
import android.os.Handler
import android.os.Looper
import rikka.shizuku.Shizuku
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/** Where we stand with Shizuku, the thing that lets a normal app make shell-level binder calls. */
object ShizukuGate {
    const val PACKAGE = "moe.shizuku.privileged.api"
    const val DOWNLOAD_URL = "https://shizuku.rikka.app/download/"
    const val PERMISSION_REQUEST = 7

    enum class State { NOT_INSTALLED, NOT_RUNNING, TOO_OLD, NEEDS_PERMISSION, DENIED, READY }

    // Shizuku's calls throw if its server dies between pingBinder() and the call; that just
    // means it isn't running.

    fun state(ctx: Context): State = try {
        when {
            !Shizuku.pingBinder() -> if (installed(ctx)) State.NOT_RUNNING else State.NOT_INSTALLED
            Shizuku.isPreV11() -> State.TOO_OLD
            Shizuku.checkSelfPermission() == PackageManager.PERMISSION_GRANTED -> State.READY
            // True once the user picked "deny" in Shizuku's dialog: asking again shows nothing.
            Shizuku.shouldShowRequestPermissionRationale() -> State.DENIED
            else -> State.NEEDS_PERMISSION
        }
    } catch (_: RuntimeException) {
        State.NOT_RUNNING
    }

    fun ready(): Boolean = try {
        Shizuku.pingBinder() && !Shizuku.isPreV11() &&
            Shizuku.checkSelfPermission() == PackageManager.PERMISSION_GRANTED
    } catch (_: RuntimeException) {
        false
    }

    fun requestPermission() {
        runCatching { Shizuku.requestPermission(PERMISSION_REQUEST) }
    }

    fun installed(ctx: Context): Boolean = try {
        ctx.packageManager.getPackageInfo(PACKAGE, 0)
        true
    } catch (_: PackageManager.NameNotFoundException) {
        false
    }

    /** "adb" when Shizuku was started with Wireless debugging, "root" on a rooted phone. */
    fun identity(): String = when (val uid = runCatching { Shizuku.getUid() }.getOrDefault(-1)) {
        0 -> "root"
        2000 -> "adb"
        else -> "uid $uid"
    }

    /**
     * Shizuku sends its binder a moment after our process starts, so a tile tap on a cold process
     * can arrive before it. Waits up to [timeoutMs] for it. Never call on the main thread.
     */
    fun awaitBinder(timeoutMs: Long): Boolean {
        if (Shizuku.pingBinder()) return true
        val latch = CountDownLatch(1)
        val listener = Shizuku.OnBinderReceivedListener { latch.countDown() }
        Shizuku.addBinderReceivedListenerSticky(listener, Handler(Looper.getMainLooper()))
        try {
            latch.await(timeoutMs, TimeUnit.MILLISECONDS)
        } finally {
            Shizuku.removeBinderReceivedListener(listener)
        }
        return Shizuku.pingBinder()
    }
}

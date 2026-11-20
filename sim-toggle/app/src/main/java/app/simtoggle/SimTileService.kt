package app.simtoggle

import android.app.PendingIntent
import android.content.Intent
import android.graphics.drawable.Icon
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService

/** A Quick Settings tile that switches one SIM (SIM 1 unless changed in the app). */
class SimTileService : TileService() {
    private val main = Handler(Looper.getMainLooper())
    private var switching = false

    private data class Snapshot(val ready: Boolean, val row: SimRow?, val failed: Boolean = false)

    override fun onStartListening() = update()

    override fun onStopListening() = main.removeCallbacksAndMessages(null)

    override fun onClick() {
        // Don't let a SIM be switched off from the lock screen.
        if (isLocked) unlockAndRun { click() } else click()
    }

    private fun click() {
        if (switching) return
        switching = true
        show(Snapshot(true, null))
        Sims.background({
            // A cold process may not have Shizuku's binder yet.
            if (!ShizukuGate.awaitBinder(2_000) || !ShizukuGate.ready()) return@background null
            val row = Sims.load(this).getOrNull(Sims.tileSlot(this))
            check(row != null && row.hasSim) { "no SIM in that slot" }
            Sims.setOn(this, row, !row.on)
        }) { result ->
            switching = false
            result.onSuccess { line ->
                if (line == null) {
                    openApp()
                } else {
                    Sims.log(this, "Tile · $line")
                }
            }.onFailure { Sims.log(this, "Tile · failed: ${it.describe()}") }
            // The SIM takes a few seconds to come up or go away.
            update()
            for (delay in longArrayOf(1_500, 4_000, 8_000)) main.postDelayed({ update() }, delay)
        }
    }

    private fun update() {
        Sims.background({
            ShizukuGate.awaitBinder(1_500)
            val rows = runCatching { Sims.load(this) }
            Snapshot(ShizukuGate.ready(), rows.getOrNull()?.getOrNull(Sims.tileSlot(this)), rows.isFailure)
        }) { result -> show(result.getOrDefault(Snapshot(false, null))) }
    }

    private fun show(snapshot: Snapshot) {
        val tile = qsTile ?: return
        val row = snapshot.row
        tile.icon = Icon.createWithResource(this, R.drawable.ic_sim)
        tile.label = row?.title ?: "SIM ${Sims.tileSlot(this) + 1}"
        when {
            switching -> {
                tile.state = Tile.STATE_UNAVAILABLE
                tile.subtitle = "Switching…"
            }
            !snapshot.ready -> {
                tile.state = Tile.STATE_INACTIVE
                tile.subtitle = "Tap to set up"
            }
            snapshot.failed -> {
                tile.state = Tile.STATE_INACTIVE
                tile.subtitle = "Couldn't read SIM"
            }
            row == null || !row.hasSim -> {
                tile.state = Tile.STATE_UNAVAILABLE
                tile.subtitle = "No SIM card"
            }
            row.on -> {
                tile.state = Tile.STATE_ACTIVE
                tile.subtitle = row.carrier.ifEmpty { "On" }
            }
            else -> {
                tile.state = Tile.STATE_INACTIVE
                tile.subtitle = "Off"
            }
        }
        tile.updateTile()
    }

    private fun openApp() {
        val intent = Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        if (Build.VERSION.SDK_INT >= 34) {
            startActivityAndCollapse(
                PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT),
            )
        } else {
            @Suppress("DEPRECATION")
            startActivityAndCollapse(intent)
        }
    }
}

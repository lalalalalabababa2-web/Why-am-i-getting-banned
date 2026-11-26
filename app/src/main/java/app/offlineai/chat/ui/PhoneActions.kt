package app.offlineai.chat.ui

import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.net.Uri
import android.provider.AlarmClock
import android.provider.Settings
import java.util.Locale

/**
 * Things you can ask the phone to do from the message box, done right away without the model:
 * "open settings" (or Wi-Fi, Bluetooth, display, sound, battery, apps, location, notifications),
 * "open <app>", "open <website>", "set an alarm for 7:30 am", "set a timer for 5 minutes",
 * "flashlight on/off", "call <number>", "text <number> <message>". Calls and texts open the dialer
 * or the messages app filled in: you press call or send. Anything else goes to the model.
 */
object PhoneActions {
    private var torchOn = false

    /** Does what [text] asks, if it is one of these; returns what to say about it, or null. */
    fun run(a: Activity, text: String): String? {
        val t = text.trim().trimEnd('.', '!', '?').replace(Regex("\\s+"), " ")
        val low = t.lowercase(Locale.ROOT).removePrefix("please ").removePrefix("can you ").removePrefix("nyx ")

        Regex("^(?:open|launch|show|go to)(?: the| my)? (settings|wi-?fi|bluetooth|display|screen|sound|volume|battery|apps|location|notifications)(?: settings)?$")
            .find(low)?.let { m ->
                val (action, name) = when (m.groupValues[1]) {
                    "wifi", "wi-fi" -> Settings.ACTION_WIFI_SETTINGS to "Wi-Fi settings"
                    "bluetooth" -> Settings.ACTION_BLUETOOTH_SETTINGS to "Bluetooth settings"
                    "display", "screen" -> Settings.ACTION_DISPLAY_SETTINGS to "Display settings"
                    "sound", "volume" -> Settings.ACTION_SOUND_SETTINGS to "Sound settings"
                    "battery" -> Intent.ACTION_POWER_USAGE_SUMMARY to "Battery settings"
                    "apps" -> Settings.ACTION_APPLICATION_SETTINGS to "App settings"
                    "location" -> Settings.ACTION_LOCATION_SOURCE_SETTINGS to "Location settings"
                    "notifications" -> Settings.ACTION_SETTINGS to "Settings"
                    else -> Settings.ACTION_SETTINGS to "Settings"
                }
                return start(a, Intent(action), "Opening $name.") ?: start(a, Intent(Settings.ACTION_SETTINGS), "Opening Settings.")
            }

        Regex("^(?:turn |switch )?(?:the )?(?:flash ?light|torch)(?: (on|off))?$|^(?:turn|switch) (on|off) (?:the )?(?:flash ?light|torch)$")
            .find(low)?.let { m ->
                val want = (m.groupValues[1].ifEmpty { m.groupValues[2] }).let { if (it.isEmpty()) !torchOn else it == "on" }
                return torch(a, want)
            }

        Regex("^set (?:an |a |my )?alarm (?:for |at )?(\\d{1,2})(?:[:.](\\d{2}))? ?(am|pm|a\\.m|p\\.m)?$").find(low)?.let { m ->
            var hour = m.groupValues[1].toInt()
            val minute = m.groupValues[2].toIntOrNull() ?: 0
            val ap = m.groupValues[3]
            if (ap.startsWith("p") && hour < 12) hour += 12
            if (ap.startsWith("a") && hour == 12) hour = 0
            if (hour > 23 || minute > 59) return null
            val i = Intent(AlarmClock.ACTION_SET_ALARM).putExtra(AlarmClock.EXTRA_HOUR, hour).putExtra(AlarmClock.EXTRA_MINUTES, minute)
            return start(a, i, String.format(Locale.US, "Setting an alarm for %d:%02d.", hour, minute))
        }

        Regex("^set (?:a |an )?timer (?:for )?(\\d+) ?(seconds?|secs?|minutes?|mins?|hours?|hrs?)$").find(low)?.let { m ->
            val n = m.groupValues[1].toInt()
            val secs = when (m.groupValues[2].first()) { 's' -> n; 'h' -> n * 3600; else -> n * 60 }
            if (secs <= 0 || secs > 86_400) return null
            val i = Intent(AlarmClock.ACTION_SET_TIMER).putExtra(AlarmClock.EXTRA_LENGTH, secs).putExtra(AlarmClock.EXTRA_SKIP_UI, false)
            return start(a, i, "Setting a timer for ${m.groupValues[1]} ${m.groupValues[2]}.")
        }

        Regex("^(?:call|dial|phone) ([+\\d][\\d ()-]{2,})$").find(low)?.let { m ->
            val number = m.groupValues[1].filter { it.isDigit() || it == '+' }
            return start(a, Intent(Intent.ACTION_DIAL, Uri.parse("tel:$number")), "Opening the dialer with $number: press call.")
        }

        Regex("^(?:text|message|sms) ([+\\d][\\d ()-]{2,}?)(?: saying| that)? (.+)$").find(t.lowercase(Locale.ROOT))?.let { m ->
            val number = m.groupValues[1].filter { it.isDigit() || it == '+' }
            val body = t.substring(t.length - m.groupValues[2].length)
            val i = Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:$number")).putExtra("sms_body", body)
            return start(a, i, "Opening your messages to $number with the text filled in: press send.")
        }

        Regex("^(?:open |go to |visit )?(https?://\\S+|(?:www\\.)?[a-z0-9-]+\\.(?:com|org|net|io|co|dev|app|gov|edu|uk|de|tv|me)(?:/\\S*)?)$").find(low)?.let { m ->
            val url = m.groupValues[1].let { if (it.startsWith("http")) it else "https://$it" }
            return start(a, Intent(Intent.ACTION_VIEW, Uri.parse(url)), "Opening $url.")
        }

        Regex("^(?:open|launch|start) (?:the )?(.{2,40}?)(?: app)?$").find(low)?.let { m ->
            return openApp(a, m.groupValues[1])
        }
        return null
    }

    private fun start(a: Activity, i: Intent, said: String): String? = try {
        a.startActivity(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        said
    } catch (e: Exception) {
        null
    }

    /** The app on the phone whose name is [name] (or starts with it, or holds it). */
    private fun openApp(a: Activity, name: String): String? {
        val pm = a.packageManager
        val apps = pm.queryIntentActivities(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER), 0)
            .map { it.loadLabel(pm).toString() to it.activityInfo.packageName }
            .filter { it.second != a.packageName }
        val n = name.lowercase(Locale.ROOT)
        val hit = apps.firstOrNull { it.first.lowercase(Locale.ROOT) == n }
            ?: apps.firstOrNull { it.first.lowercase(Locale.ROOT).startsWith(n) }
            ?: apps.firstOrNull { it.first.lowercase(Locale.ROOT).contains(n) }
            ?: return null
        val launch = pm.getLaunchIntentForPackage(hit.second) ?: return null
        return start(a, launch, "Opening ${hit.first}.")
    }

    private fun torch(a: Activity, on: Boolean): String {
        if (!a.packageManager.hasSystemFeature(PackageManager.FEATURE_CAMERA_FLASH)) return "This phone has no flashlight."
        return try {
            val cm = a.getSystemService(CameraManager::class.java)
            val id = cm.cameraIdList.first { cm.getCameraCharacteristics(it).get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true }
            cm.setTorchMode(id, on)
            torchOn = on
            if (on) "Flashlight on." else "Flashlight off."
        } catch (e: Exception) {
            "The flashlight could not be switched (the camera may be in use)."
        }
    }
}

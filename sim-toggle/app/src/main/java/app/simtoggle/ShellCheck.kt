package app.simtoggle

import android.os.Build
import android.os.Process
import android.telephony.SubscriptionInfo
import kotlin.system.exitProcess

/**
 * The app's telephony calls, run as the shell user without Shizuku: the same identity Shizuku
 * lends the app when it is started with Wireless debugging. CI runs it on emulators, and it works
 * on a phone over adb too:
 *
 *     adb shell 'CLASSPATH=$(pm path app.simtoggle | cut -d: -f2) app_process /system/bin app.simtoggle.ShellCheck'
 *
 * Add --toggle to switch the first SIM off and on again (both ways: the SIM switch, then power).
 * Exits 1 if a call is missing or refused for lack of permission, the failures that would break
 * the app; a modem that can't carry out a request is only reported.
 */
object ShellCheck {
    private var broken = false

    @JvmStatic
    fun main(args: Array<String>) {
        Telephony.wrap = { it }
        println("uid ${Process.myUid()}, Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT}), ${Build.MANUFACTURER} ${Build.MODEL}")

        val subs = step("list SIMs") { Telephony.availableSubscriptions() }.orEmpty()
        show(subs)
        step("modem can switch SIMs off") { Telephony.canDisablePhysicalSubscription() }

        if ("--toggle" in args) {
            val sim = subs.firstOrNull { !it.isEmbedded && it.simSlotIndex >= 0 }
            if (sim == null) {
                println("no active SIM to switch")
            } else {
                val id = sim.subscriptionId
                val slot = sim.simSlotIndex
                step("SIM switch off (sub $id)") { Telephony.setUiccApplicationsEnabled(id, false) }
                settle("SIM switched off") { s -> s.none { it.subscriptionId == id && it.simSlotIndex >= 0 } }
                step("SIM switch on (sub $id)") { Telephony.setUiccApplicationsEnabled(id, true) }
                settle("SIM back on") { s -> s.any { it.subscriptionId == id && it.simSlotIndex >= 0 } }
                step("power off (slot $slot)") { Telephony.setSimPower(slot, false) }
                settle("SIM powered off") { s -> s.none { it.subscriptionId == id && it.simSlotIndex >= 0 } }
                step("power on (slot $slot)") { Telephony.setSimPower(slot, true) }
                settle("SIM powered on") { s -> s.any { it.subscriptionId == id && it.simSlotIndex >= 0 } }
            }
        }

        println(if (broken) "RESULT: broken" else "RESULT: ok")
        exitProcess(if (broken) 1 else 0)
    }

    private fun <T> step(name: String, block: () -> T): T? = try {
        block().also { println("ok    $name${if (it is Unit || it is List<*>) "" else ": $it"}") }
    } catch (t: Throwable) {
        val fatal = t is SecurityException || t is ReflectiveOperationException || t is LinkageError
        if (fatal) broken = true
        println("${if (fatal) "FAIL " else "note "} $name: ${t.describe()}")
        null
    }

    /** Waits up to 20 s for the SIM list to match, then prints it either way. */
    private fun settle(what: String, done: (List<SubscriptionInfo>) -> Boolean) {
        var subs: List<SubscriptionInfo> = emptyList()
        val start = System.currentTimeMillis()
        while (System.currentTimeMillis() - start < 20_000) {
            subs = runCatching { Telephony.availableSubscriptions() }.getOrDefault(emptyList())
            if (done(subs)) {
                println("ok    $what after ${(System.currentTimeMillis() - start) / 1000.0} s")
                show(subs)
                return
            }
            Thread.sleep(500)
        }
        println("note  $what: not seen within 20 s")
        show(subs)
    }

    private fun show(subs: List<SubscriptionInfo>) {
        if (subs.isEmpty()) println("        (no SIMs)")
        for (s in subs) {
            println("        sub ${s.subscriptionId}  slot ${s.simSlotIndex}  ${s.displayName}" +
                "  apps ${if (Telephony.uiccApplicationsEnabled(s)) "on" else "off"}" +
                (if (s.isEmbedded) "  eSIM" else ""))
        }
    }
}

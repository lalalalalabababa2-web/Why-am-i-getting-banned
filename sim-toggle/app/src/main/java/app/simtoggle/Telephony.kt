package app.simtoggle

import android.os.IBinder
import android.telephony.SubscriptionInfo
import rikka.shizuku.ShizukuBinderWrapper
import java.lang.reflect.InvocationTargetException
import java.lang.reflect.Method

/**
 * The hidden telephony calls behind Settings' SIM switch, made through Shizuku.
 *
 * Each call goes to the real system service ("isub" or "phone") wrapped in a
 * [ShizukuBinderWrapper], so the service sees the shell user (or root) as the caller. Shell holds
 * MODIFY_PHONE_STATE and READ_PRIVILEGED_PHONE_STATE, which is all these calls check.
 */
object Telephony {
    /** The calling package that matches the shell user Shizuku runs as. */
    private const val SHELL = "com.android.shell"

    // TelephonyManager.CARD_POWER_DOWN / CARD_POWER_UP
    private const val POWER_DOWN = 0
    private const val POWER_UP = 1

    /**
     * Routes a system service's binder through Shizuku. [ShellCheck] swaps in the identity, since
     * it already runs as the shell user.
     */
    internal var wrap: (IBinder) -> IBinder = { ShizukuBinderWrapper(it) }

    private fun service(name: String, iface: String): Any {
        val raw = Class.forName("android.os.ServiceManager")
            .getMethod("getService", String::class.java)
            .invoke(null, name) as IBinder?
            ?: throw IllegalStateException("system service \"$name\" isn't running")
        val asInterface = Class.forName("$iface\$Stub").getMethod("asInterface", IBinder::class.java)
        return asInterface.invoke(null, wrap(raw))
            ?: throw IllegalStateException("couldn't open $iface")
    }

    private fun isub() = service("isub", "com.android.internal.telephony.ISub")
    private fun phone() = service("phone", "com.android.internal.telephony.ITelephony")

    /**
     * Every SIM the phone sees, including ones that are switched off. A switched-off SIM is
     * "inactive": it is still listed, but its slot index is -1.
     */
    fun availableSubscriptions(): List<SubscriptionInfo> {
        val sub = isub()
        val list = try {
            callFilled(sub, "getAvailableSubscriptionInfoList")
        } catch (_: NoSuchMethodException) {
            callFilled(sub, "getActiveSubscriptionInfoList")
        }
        return (list as? List<*>).orEmpty().filterIsInstance<SubscriptionInfo>()
    }

    /** Whether the SIM's apps are switched on. A @SystemApi getter, so read by reflection. */
    fun uiccApplicationsEnabled(sub: SubscriptionInfo): Boolean =
        runCatching { SubscriptionInfo::class.java.getMethod("areUiccApplicationsEnabled").invoke(sub) as Boolean }
            .getOrDefault(true)

    /** False when the modem can't disable a SIM's apps (radio HAL older than 1.5). */
    fun canDisablePhysicalSubscription(): Boolean? =
        runCatching { call(isub(), "canDisablePhysicalSubscription") as Boolean }.getOrNull()

    /** What Settings' SIM switch does: the SIM stays in, its apps (and the network) go off. */
    fun setUiccApplicationsEnabled(subId: Int, enabled: Boolean) {
        call(isub(), "setUiccApplicationsEnabled", enabled, subId)
    }

    /** Cuts or restores power to the SIM card in [slot]. */
    fun setSimPower(slot: Int, on: Boolean) {
        call(phone(), "setSimPowerStateForSlot", slot, if (on) POWER_UP else POWER_DOWN)
    }

    private fun call(target: Any, name: String, vararg args: Any?): Any? {
        val method = target.javaClass.methods.firstOrNull { it.name == name && it.parameterTypes.size == args.size }
            ?: throw NoSuchMethodException("$name (${args.size} arguments) isn't on this Android build")
        return invoke(method, target, args)
    }

    /**
     * For calls whose parameters changed between Android versions: the first String is the
     * calling package, other Strings (feature id) are null, booleans (isForAllProfiles) are true.
     */
    private fun callFilled(target: Any, name: String): Any? {
        val methods = target.javaClass.methods.filter { it.name == name }.sortedBy { it.parameterTypes.size }
        if (methods.isEmpty()) throw NoSuchMethodException("$name isn't on this Android build")
        var failure: Throwable? = null
        for (method in methods) {
            var packageGiven = false
            val args = method.parameterTypes.map<Class<*>, Any?> { type ->
                when (type) {
                    String::class.java -> if (packageGiven) null else SHELL.also { packageGiven = true }
                    java.lang.Boolean.TYPE -> true
                    Integer.TYPE -> 0
                    else -> null
                }
            }.toTypedArray()
            try {
                return invoke(method, target, args)
            } catch (t: Throwable) {
                failure = t
            }
        }
        throw failure!!
    }

    private fun invoke(method: Method, target: Any, args: Array<out Any?>): Any? = try {
        method.invoke(target, *args)
    } catch (e: InvocationTargetException) {
        throw e.targetException ?: e
    }
}

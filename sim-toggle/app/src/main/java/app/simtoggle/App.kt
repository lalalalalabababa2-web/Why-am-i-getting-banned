package app.simtoggle

import android.app.Application
import android.content.Context
import org.lsposed.hiddenapibypass.HiddenApiBypass

class App : Application() {
    override fun attachBaseContext(base: Context) {
        super.attachBaseContext(base)
        // ISub, ITelephony and ServiceManager are hidden API. Without this exemption Android 9+
        // hides their methods from reflection and every SIM call fails with NoSuchMethodException.
        HiddenApiBypass.addHiddenApiExemptions("L")
    }
}

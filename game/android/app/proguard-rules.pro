# The WebView calls these by name through window.NT
-keepclassmembers class app.neontide.game.MainActivity$Bridge {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface,*Annotation*

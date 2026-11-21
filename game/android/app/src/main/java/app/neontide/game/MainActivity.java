package app.neontide.game;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Log;
import android.view.DisplayCutout;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Neon Tide's Android shell. The whole game is a WebGL app in assets/www; this activity
 * gives it a fullscreen landscape WebView, serves the assets from a secure https origin
 * (so saves in localStorage persist), and bridges back button, pause and vibration.
 */
public class MainActivity extends Activity {
    private static final String TAG = "NeonTide";
    // Reserved by Android for exactly this purpose: never resolved on the network.
    private static final String HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + HOST + "/www/index.html";

    private WebView webView;
    private float safeL, safeT, safeR, safeB;
    private OnBackInvokedCallback backCallback;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Window window = getWindow();
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = window.getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            window.setAttributes(lp);
        }

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(18, 6, 31));
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
        webView.setHapticFeedbackEnabled(false);
        webView.setLongClickable(false);
        webView.setOnLongClickListener(v -> true);
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        s.setTextZoom(100);
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            s.setSafeBrowsingEnabled(false);
        }

        webView.addJavascriptInterface(new Bridge(), "NT");
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage m) {
                Log.d(TAG, m.message() + " (" + m.sourceId() + ":" + m.lineNumber() + ")");
                return true;
            }
        });
        webView.setWebViewClient(new AssetClient());

        webView.setOnApplyWindowInsetsListener((v, insets) -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                DisplayCutout c = insets.getDisplayCutout();
                float d = getResources().getDisplayMetrics().density;
                if (c != null) {
                    safeL = c.getSafeInsetLeft() / d;
                    safeT = c.getSafeInsetTop() / d;
                    safeR = c.getSafeInsetRight() / d;
                    safeB = c.getSafeInsetBottom() / d;
                } else {
                    safeL = safeT = safeR = safeB = 0;
                }
                pushSafeInsets();
            }
            return v.onApplyWindowInsets(insets);
        });

        setContentView(webView);
        hideSystemBars();

        if (Build.VERSION.SDK_INT >= 33) {
            backCallback = this::handleBack;
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT, backCallback);
        }

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl(START_URL);
        }
    }

    private void pushSafeInsets() {
        if (webView == null) return;
        String js = String.format(Locale.US,
                "window.__setSafeInsets&&window.__setSafeInsets(%.1f,%.1f,%.1f,%.1f)",
                safeL, safeT, safeR, safeB);
        webView.evaluateJavascript(js, null);
    }

    @SuppressWarnings("deprecation")
    private void hideSystemBars() {
        Window window = getWindow();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false);
            WindowInsetsController c = window.getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            window.getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                            | View.SYSTEM_UI_FLAG_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    private void handleBack() {
        if (webView == null) {
            finish();
            return;
        }
        webView.evaluateJavascript("window.__onAndroidBack ? window.__onAndroidBack() : false", result -> {
            if (!"true".equals(result)) moveTaskToBack(true);
        });
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        // Android 12 and older; 13+ uses the OnBackInvokedCallback registered in onCreate.
        handleBack();
    }

    @Override
    protected void onPause() {
        if (webView != null) {
            webView.evaluateJavascript("window.__onAppPause&&window.__onAppPause()", null);
            webView.onPause();
        }
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        hideSystemBars();
        if (webView != null) {
            webView.onResume();
            webView.evaluateJavascript("window.__onAppResume&&window.__onAppResume()", null);
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) webView.saveState(outState);
    }

    @Override
    protected void onDestroy() {
        if (Build.VERSION.SDK_INT >= 33 && backCallback != null) {
            getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(backCallback);
        }
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    /** Serves assets/www/** at https://appassets.androidplatform.net/www/**. */
    private class AssetClient extends WebViewClient {
        private final Map<String, String> mime = new HashMap<>();

        AssetClient() {
            mime.put("html", "text/html");
            mime.put("js", "text/javascript");
            mime.put("mjs", "text/javascript");
            mime.put("css", "text/css");
            mime.put("json", "application/json");
            mime.put("png", "image/png");
            mime.put("jpg", "image/jpeg");
            mime.put("svg", "image/svg+xml");
            mime.put("woff2", "font/woff2");
            mime.put("mp3", "audio/mpeg");
            mime.put("ogg", "audio/ogg");
            mime.put("wav", "audio/wav");
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
            if (!HOST.equals(req.getUrl().getHost())) return null;
            String path = req.getUrl().getPath();
            if (path == null || path.length() < 2) return null;
            path = path.substring(1);
            if (path.contains("..")) return null;
            String ext = path.substring(path.lastIndexOf('.') + 1).toLowerCase(Locale.US);
            String type = mime.containsKey(ext) ? mime.get(ext) : "application/octet-stream";
            try {
                InputStream in = getAssets().open(path);
                WebResourceResponse r = new WebResourceResponse(type, "utf-8", in);
                Map<String, String> h = new HashMap<>();
                h.put("Access-Control-Allow-Origin", "*");
                h.put("Cache-Control", "no-store");
                r.setResponseHeaders(h);
                return r;
            } catch (IOException e) {
                Log.w(TAG, "missing asset " + path);
                return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", null, null);
            }
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
            return !HOST.equals(req.getUrl().getHost());
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            pushSafeInsets();
        }

        @Override
        public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
            // The GPU/renderer process died (usually memory pressure). Start over cleanly
            // instead of letting the whole app crash; the game reloads its last save.
            Log.e(TAG, "renderer gone, crashed=" + detail.didCrash());
            if (webView != null) {
                ((android.view.ViewGroup) webView.getParent()).removeView(webView);
                webView.destroy();
                webView = null;
            }
            recreate();
            return true;
        }
    }

    /** window.NT in JavaScript. */
    private class Bridge {
        @JavascriptInterface
        public void vibrate(int ms) {
            Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (v == null || !v.hasVibrator()) return;
            int d = Math.max(1, Math.min(ms, 400));
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                v.vibrate(VibrationEffect.createOneShot(d, VibrationEffect.DEFAULT_AMPLITUDE));
            }
        }

        @JavascriptInterface
        public void quit() {
            runOnUiThread(MainActivity.this::finishAndRemoveTask);
        }

        @JavascriptInterface
        public String platform() {
            return "android " + Build.VERSION.SDK_INT + " " + Build.MODEL;
        }
    }
}

package pvzmod;

import android.app.Activity;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewConfiguration;
import android.view.WindowManager;
import android.widget.CompoundButton;
import android.widget.LinearLayout;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.util.Arrays;

/**
 * Floating, draggable mod menu. Called from PvZActivity.onCreate (one smali line).
 * Each switch writes its patch bytes into libpvz.so's code through /proc/self/mem,
 * which ignores page protection for the process's own memory, and writes the
 * original bytes back when switched off. Switch states are remembered.
 */
public final class ModMenu {
    private static final String LIB = "libpvz.so";
    private static long base;

    public static void init(final Activity activity) {
        final View decor = activity.getWindow().getDecorView();
        // The window token exists only once the activity window is attached.
        decor.post(new Runnable() {
            @Override public void run() {
                try {
                    show(activity);
                } catch (Throwable t) {
                    Toast.makeText(activity, "Mod menu: " + t, Toast.LENGTH_LONG).show();
                }
            }
        });
    }

    private static void show(final Activity activity) {
        final SharedPreferences prefs = activity.getSharedPreferences("pvzmod", 0);
        final WindowManager wm = activity.getWindowManager();
        final float dp = activity.getResources().getDisplayMetrics().density;

        final LinearLayout panel = new LinearLayout(activity);
        panel.setOrientation(LinearLayout.VERTICAL);
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(0xE0202020);
        bg.setCornerRadius(12 * dp);
        bg.setStroke((int) dp, 0xFF66BB6A);
        panel.setBackground(bg);
        int pad = (int) (8 * dp);
        panel.setPadding(pad, pad, pad, pad);

        final TextView header = new TextView(activity);
        header.setText("🌻 Mods");
        header.setTextColor(Color.WHITE);
        header.setTextSize(15);
        header.setPadding(pad, pad / 2, pad, pad / 2);
        panel.addView(header);

        final LinearLayout body = new LinearLayout(activity);
        body.setOrientation(LinearLayout.VERTICAL);
        body.setVisibility(View.GONE);
        panel.addView(body);

        for (final Mod mod : Patches.MODS) {
            final Switch sw = new Switch(activity);
            sw.setText(mod.label);
            sw.setTextColor(Color.WHITE);
            sw.setTextSize(14);
            sw.setPadding(pad, pad / 2, pad, pad / 2);
            boolean on = prefs.getBoolean(mod.label, false);
            if (on && apply(mod, true) != null) on = false;
            sw.setChecked(on);
            sw.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
                @Override public void onCheckedChanged(CompoundButton b, boolean checked) {
                    String err = apply(mod, checked);
                    if (err != null) {
                        Toast.makeText(activity, mod.label + ": " + err, Toast.LENGTH_LONG).show();
                        b.setOnCheckedChangeListener(null);
                        b.setChecked(!checked);
                        b.setOnCheckedChangeListener(this);
                        return;
                    }
                    prefs.edit().putBoolean(mod.label, checked).apply();
                }
            });
            body.addView(sw);
        }

        final WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT, WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.TYPE_APPLICATION,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT);
        lp.gravity = Gravity.TOP | Gravity.LEFT;
        lp.x = prefs.getInt("x", (int) (16 * dp));
        lp.y = prefs.getInt("y", (int) (80 * dp));

        // Drag by the header; a tap without movement folds the switches in and out.
        final int slop = ViewConfiguration.get(activity).getScaledTouchSlop();
        header.setOnTouchListener(new View.OnTouchListener() {
            float downX, downY;
            int startX, startY;
            boolean dragging;

            @Override public boolean onTouch(View v, MotionEvent e) {
                switch (e.getActionMasked()) {
                    case MotionEvent.ACTION_DOWN:
                        downX = e.getRawX(); downY = e.getRawY();
                        startX = lp.x; startY = lp.y;
                        dragging = false;
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        float dx = e.getRawX() - downX, dy = e.getRawY() - downY;
                        if (!dragging && Math.hypot(dx, dy) > slop) dragging = true;
                        if (dragging) {
                            lp.x = startX + (int) dx;
                            lp.y = startY + (int) dy;
                            wm.updateViewLayout(panel, lp);
                        }
                        return true;
                    case MotionEvent.ACTION_UP:
                        if (dragging) {
                            prefs.edit().putInt("x", lp.x).putInt("y", lp.y).apply();
                        } else {
                            body.setVisibility(body.getVisibility() == View.VISIBLE ? View.GONE : View.VISIBLE);
                        }
                        return true;
                }
                return false;
            }
        });

        wm.addView(panel, lp);
    }

    /** Writes the mod's patches (or the originals); returns an error message or null. */
    static String apply(Mod mod, boolean on) {
        try {
            long b = base();
            if (b == 0) return LIB + " is not loaded";
            RandomAccessFile mem = new RandomAccessFile("/proc/self/mem", "rw");
            try {
                // Check every site first so a mod is never left half applied.
                for (Patch p : mod.patches) {
                    byte[] have = new byte[p.orig.length];
                    mem.seek(b + p.addr);
                    mem.readFully(have);
                    if (!Arrays.equals(have, p.orig) && !Arrays.equals(have, p.patched)) {
                        return "unexpected code at 0x" + Long.toHexString(p.addr) + " (different game version?)";
                    }
                }
                for (Patch p : mod.patches) {
                    mem.seek(b + p.addr);
                    mem.write(on ? p.patched : p.orig);
                }
            } finally {
                mem.close();
            }
            return null;
        } catch (IOException e) {
            return e.toString();
        }
    }

    /** Load address of libpvz.so: start of its first mapping minus that mapping's file offset. */
    private static long base() throws IOException {
        if (base != 0) return base;
        BufferedReader r = new BufferedReader(new FileReader("/proc/self/maps"));
        try {
            String line;
            while ((line = r.readLine()) != null) {
                if (!line.endsWith(LIB)) continue;
                String[] f = line.split("\\s+");
                long start = Long.parseLong(f[0].substring(0, f[0].indexOf('-')), 16);
                long offset = Long.parseLong(f[2], 16);
                return base = start - offset;
            }
        } finally {
            r.close();
        }
        return 0;
    }
}

final class Mod {
    final String label;
    final Patch[] patches;

    Mod(String label, Patch[] patches) {
        this.label = label;
        this.patches = patches;
    }
}

final class Patch {
    final long addr;
    final byte[] orig, patched;

    Patch(long addr, String orig, String patched) {
        this.addr = addr;
        this.orig = hex(orig);
        this.patched = hex(patched);
    }

    private static byte[] hex(String s) {
        byte[] b = new byte[s.length() / 2];
        for (int i = 0; i < b.length; i++) b[i] = (byte) Integer.parseInt(s.substring(2 * i, 2 * i + 2), 16);
        return b;
    }
}

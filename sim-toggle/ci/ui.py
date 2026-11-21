#!/usr/bin/env python3
"""A small UI driver for the CI emulator: find an on-screen view by its text and tap it.

    ui.py tap "Some text" [--exact]   scrolls down until it's on screen (up to 6 times), taps it
"""
import re
import subprocess
import sys
import time


def adb(*args):
    return subprocess.run(["adb", *args], capture_output=True, text=True).stdout


def nodes():
    adb("shell", "uiautomator", "dump", "/sdcard/ui.xml")
    xml = adb("shell", "cat", "/sdcard/ui.xml")
    for m in re.finditer(r'<node\b[^>]*>', xml):
        attrs = dict(re.findall(r'([\w-]+)="([^"]*)"', m.group(0)))
        b = re.match(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', attrs.get("bounds", ""))
        if b:
            x1, y1, x2, y2 = map(int, b.groups())
            yield attrs.get("text", ""), ((x1 + x2) // 2, (y1 + y2) // 2)


def tap(text, exact):
    for attempt in range(7):
        for node_text, (x, y) in nodes():
            if (node_text == text) if exact else (text.lower() in node_text.lower()):
                adb("shell", "input", "tap", str(x), str(y))
                print(f'tapped "{node_text}" at {x},{y}')
                time.sleep(1.5)
                return True
        adb("shell", "input", "swipe", "540", "1700", "540", "900", "400")
        time.sleep(1)
    print(f'"{text}" not found on screen')
    return False


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "tap":
        sys.exit(0 if tap(sys.argv[2], "--exact" in sys.argv) else 1)
    print(__doc__)
    sys.exit(2)

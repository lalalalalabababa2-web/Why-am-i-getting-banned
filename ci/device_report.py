#!/usr/bin/env python3
"""Turns the on-device test results into workflow annotations, so a run can be read without
downloading its logs: failures (with their stack traces) and crashes as errors, the app's own
test log lines as a notice."""
import glob
import re
import sys
import xml.etree.ElementTree as ET


def emit(kind, title, text):
    chunks, cur = [], ""
    for line in text.splitlines():
        if len(cur) + len(line) > 6000:
            chunks.append(cur)
            cur = ""
        cur += line[:500] + "\n"
    if cur:
        chunks.append(cur)
    for n, c in enumerate(chunks[:4], 1):
        enc = c.replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")
        print(f"::{kind} title={title} {n}/{min(len(chunks), 4)}::{enc}")


failures, passed = [], 0
for path in glob.glob("app/build/outputs/androidTest-results/connected/**/*.xml", recursive=True):
    try:
        root = ET.parse(path).getroot()
    except ET.ParseError:
        continue
    for case in root.iter("testcase"):
        bad = case.find("failure") if case.find("failure") is not None else case.find("error")
        if bad is None:
            passed += 1
        else:
            failures.append(f"{case.get('classname')}.{case.get('name')}\n{(bad.text or bad.get('message') or '')[:3000]}")

log = ""
try:
    log = open("logcat.txt", errors="replace").read()
except OSError:
    pass
ours = [l for l in log.splitlines() if "OfflineAI" in l]
crash = [l for l in log.splitlines()
         if re.search(r"FATAL EXCEPTION|AndroidRuntime|libc  |DEBUG   :|backtrace|UnsatisfiedLink|SIGSEGV|SIGABRT|GGML_ASSERT", l)]

print(f"passed: {passed}, failed: {len(failures)}")
if ours:
    emit("notice", "app log", "\n".join(ours[-150:]))
if failures:
    emit("error", "failed tests", "\n\n".join(failures))
if crash:
    emit("error", "crash", "\n".join(crash[:200]))
sys.exit(1 if failures or (passed == 0) else 0)

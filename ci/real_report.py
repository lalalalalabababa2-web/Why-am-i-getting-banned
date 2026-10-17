"""Turns tools/host-test/real.sh output into a few GitHub annotations (failures as errors)."""
import os
import sys

path, cpu = sys.argv[1], sys.argv[2]
if not os.path.exists(path):
    sys.exit(0)
lines = open(path, errors="replace").read().splitlines()


def esc(s):
    return s.replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")


def emit(kind, title, body):
    for i in range(0, len(body), 30):
        part = body[i:i + 30]
        print(f"::{kind} title={title} ({i // 30 + 1})::" + esc("\n".join(part)))


speed = [l[len("SPEED: "):] for l in lines if l.startswith("SPEED:")]
fails = [l.strip() for l in lines if "FAIL" in l]
detail = [l.rstrip() for l in lines if l.startswith("==") or l.startswith("  ") or l.startswith("    ")]
emit("notice", f"{cpu} speeds", speed)
emit("notice", f"{cpu} details", [l for l in detail if "FAIL" not in l][:120])
if fails:
    emit("error", f"{cpu} failures", fails)

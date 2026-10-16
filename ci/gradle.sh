#!/usr/bin/env bash
# Runs Gradle and, if it fails, republishes the lines that explain the failure as workflow
# error annotations, so a failed build can be diagnosed without downloading the full log.
set -o pipefail
LOG="$(mktemp)"
./gradlew --no-daemon --console=plain "$@" 2>&1 | tee "$LOG"
status=${PIPESTATUS[0]}
if [ "$status" -ne 0 ]; then
  python3 - "$LOG" "$PWD" <<'PY'
import re, sys

log_path, workspace = sys.argv[1], sys.argv[2]
lines = open(log_path, errors="replace").read().splitlines()

interesting = re.compile(
    r"^(e: |FAILURE|\* What went wrong|> Task .* FAILED|Caused by|ERROR|\s+> )"
    r"|error:|Unresolved reference|Could not |AAPT|Execution failed|There were failing tests"
    r"|Script compilation error|^\s+Line \d+:|^\s*\^|FAILED$"
)
keep, in_summary, last = [], False, None
for i, line in enumerate(lines):
    if line.startswith("* What went wrong"):
        in_summary = True
    elif line.startswith("* Try:"):
        in_summary = False
    take = in_summary or bool(interesting.search(line))
    # Keep the line after a script-compilation "Line N:" marker too; it carries the code.
    if not take and i > 0 and re.match(r"^\s+Line \d+:", lines[i - 1]):
        take = True
    if take and line != last and line.strip():
        keep.append(line.replace("file://" + workspace + "/", "").replace(workspace + "/", ""))
        last = line

if not keep:
    keep = lines[-60:]

chunks, current = [], ""
for line in keep:
    if len(current) + len(line) + 1 > 7000:
        chunks.append(current)
        current = ""
    current += line[:600] + "\n"
if current:
    chunks.append(current)

for n, chunk in enumerate(chunks[:9], 1):
    encoded = chunk.replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")
    print(f"::error title=build log {n}/{min(len(chunks), 9)}::{encoded}")
PY
fi
exit "$status"

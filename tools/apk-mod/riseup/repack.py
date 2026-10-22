#!/usr/bin/env python3
"""Rewrites an APK with some entries replaced and its old signature removed.

usage: python3 repack.py in.apk out.apk [entry=file ...] [+entry=file ...]

entry=file replaces an entry; +entry=file adds a new one (deflated).

Each entry keeps its original compression: this game ships its native libraries
compressed (extractNativeLibs), and storing them would add about 90 MB.
"""
import sys
import zipfile


def main():
    src, dst, *repl = sys.argv[1:]
    replace = dict(r.split("=", 1) for r in repl if not r.startswith("+"))
    add = dict(r[1:].split("=", 1) for r in repl if r.startswith("+"))
    with zipfile.ZipFile(src) as zin, zipfile.ZipFile(dst, "w") as zout:
        for name, path in add.items():
            if name in zin.namelist():
                sys.exit(f"{name} is already in {src}")
            zout.write(path, name, compress_type=zipfile.ZIP_DEFLATED)
        for info in zin.infolist():
            name = info.filename
            if name.startswith("META-INF/") and name.rsplit(".", 1)[-1] in ("SF", "RSA", "DSA", "EC", "MF"):
                continue
            data = open(replace.pop(name), "rb").read() if name in replace else zin.read(name)
            out = zipfile.ZipInfo(name, date_time=info.date_time)
            out.external_attr = info.external_attr
            out.compress_type = info.compress_type
            zout.writestr(out, data)
    if replace:
        sys.exit(f"not in {src}: {', '.join(replace)}")


if __name__ == "__main__":
    main()

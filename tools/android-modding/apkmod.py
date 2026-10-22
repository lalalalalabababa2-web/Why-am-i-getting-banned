#!/usr/bin/env python3
"""apkmod: decode, patch, rebuild and sign Android game APKs.

  apkmod decode game.apk [workdir]      apktool decode + jadx Java view
  apkmod build workdir [out.apk]        apktool build + zipalign + sign
  apkmod ret workdir Class method VAL   force a smali method to return VAL
  apkmod find workdir REGEX             grep smali + jadx sources
  apkmod engine game.apk                tell Unity Mono / IL2CPP / Unreal / Godot / native
"""
import os
import re
import shutil
import struct
import subprocess
import sys
import zipfile

KEY_DIR = os.path.expanduser("~/.apkmod")
KEYSTORE = os.path.join(KEY_DIR, "debug.jks")
KS_PASS = "android"


def run(*cmd):
    print("+", " ".join(cmd))
    subprocess.run(cmd, check=True)


def decode(apk, work=None):
    work = work or os.path.splitext(os.path.basename(apk))[0]
    run("apktool", "d", "-f", "-o", work, apk)
    run("jadx", "-q", "--no-res", "-d", os.path.join(work, "_jadx"), apk)
    print(f"\nsmali:  {work}/smali*/\njava:   {work}/_jadx/sources/  (read-only view; edit smali)")


def ensure_keystore():
    if os.path.exists(KEYSTORE):
        return
    os.makedirs(KEY_DIR, exist_ok=True)
    run("keytool", "-genkeypair", "-keystore", KEYSTORE, "-storepass", KS_PASS,
        "-keypass", KS_PASS, "-alias", "apkmod", "-keyalg", "RSA", "-keysize", "2048",
        "-validity", "10000", "-dname", "CN=apkmod")


def build(work, out=None):
    out = out or work.rstrip("/") + "-modded.apk"
    raw, aligned = out + ".raw", out + ".aligned"
    run("apktool", "b", "-o", raw, work)
    run("zipalign", "-f", "-p", "4", raw, aligned)
    ensure_keystore()
    run("apksigner", "sign", "--ks", KEYSTORE, "--ks-pass", "pass:" + KS_PASS, "--out", out, aligned)
    for f in (raw, aligned, out + ".idsig"):
        if os.path.exists(f):
            os.remove(f)
    print(f"\nsigned: {out}\nuninstall the store version first (signature differs), then: adb install {out}")


def smali_files(work):
    for d in sorted(os.listdir(work)):
        if d.startswith("smali"):
            for root, _, files in os.walk(os.path.join(work, d)):
                for f in files:
                    if f.endswith(".smali"):
                        yield os.path.join(root, f)


def const_for(ret_type, value):
    """Instructions that load VALUE into v0/v1 for the method's return type."""
    v = value.lower()
    if ret_type == "Z":
        n = 1 if v in ("true", "1") else 0
        return [f"const/4 v0, 0x{n}", "return v0"], 1
    if ret_type in ("I", "S", "B", "C"):
        return [f"const v0, {int(value, 0):#x}", "return v0"], 1
    if ret_type == "F":
        bits = struct.unpack("<I", struct.pack("<f", float(value)))[0]
        return [f"const v0, {bits:#x}", "return v0"], 1
    if ret_type == "J":
        return [f"const-wide v0, {int(value, 0):#x}L", "return-wide v0"], 2
    if ret_type == "D":
        bits = struct.unpack("<Q", struct.pack("<d", float(value)))[0]
        return [f"const-wide v0, {bits:#x}L", "return-wide v0"], 2
    if ret_type == "V":
        return ["return-void"], 0
    raise SystemExit(f"return type {ret_type} not supported (primitives and void only)")


def force_return(work, cls, method, value):
    path_tail = cls.replace(".", "/") + ".smali"
    targets = [f for f in smali_files(work) if f.endswith("/" + path_tail)]
    if not targets:
        raise SystemExit(f"class {cls} not found under {work}/smali*")
    src = open(targets[0]).read()
    pat = re.compile(r"(\.method [^\n]*\b" + re.escape(method) + r"\(([^)]*)\)(\S+)\n)(.*?)(\.end method)", re.S)
    hits = 0

    def repl(m):
        nonlocal hits
        header, ret_type, body = m.group(1), m.group(3), m.group(4)
        if " abstract " in header or " native " in header:
            return m.group(0)
        hits += 1
        code, regs = const_for(ret_type, value)
        # .registers counts params too; .locals does not. Keep whatever is larger.
        dm = re.search(r"\.(locals|registers) (\d+)", body)
        kind, n = (dm.group(1), int(dm.group(2))) if dm else ("locals", 0)
        decl = f"    .{kind} {max(n, regs)}\n"
        return header + decl + "\n" + "".join(f"    {c}\n" for c in code) + m.group(5)

    out = pat.sub(repl, src)
    if not hits:
        raise SystemExit(f"method {method} not found in {targets[0]}")
    open(targets[0], "w").write(out)
    print(f"patched {hits} overload(s) of {cls}.{method} -> {value} in {targets[0]}")


def find(work, regex):
    rx = re.compile(regex)
    roots = list(smali_files(work))
    jadx = os.path.join(work, "_jadx", "sources")
    for root, _, files in os.walk(jadx):
        roots += [os.path.join(root, f) for f in files if f.endswith(".java")]
    for f in roots:
        with open(f, errors="replace") as fh:
            for i, line in enumerate(fh, 1):
                if rx.search(line):
                    print(f"{f}:{i}: {line.strip()}")


def engine(apk):
    names = zipfile.ZipFile(apk).namelist()
    has = lambda s: [n for n in names if s in n]
    abis = sorted({n.split("/")[1] for n in names if n.startswith("lib/") and n.count("/") >= 2})
    print("ABIs:", ", ".join(abis) or "none (pure Java/Kotlin)")
    if has("libil2cpp.so"):
        print("Unity IL2CPP  ->", has("libil2cpp.so")[0], "+", (has("global-metadata.dat") or ["global-metadata.dat missing (encrypted/renamed?)"])[0])
        print("  dump with Il2CppDumper, or hook live with frida-il2cpp-bridge")
    elif has("Assembly-CSharp.dll"):
        print("Unity Mono    ->", has("Assembly-CSharp.dll")[0])
        print("  edit the DLL with dnSpy/ILSpy (or Mono.Cecil), drop it back, apkmod build")
    elif has("libUE4.so") or has("libUnreal.so"):
        print("Unreal        ->", (has("libUE4.so") or has("libUnreal.so"))[0], "(dump SDK, hook natives)")
    elif has("libgodot_android.so"):
        print("Godot         -> look for a .pck in assets/")
    elif has("libcocos2d"):
        print("Cocos2d-x     -> scripts often in assets/ as .luac / .jsc (frequently XXTEA-encrypted)")
    elif has("assets/index.android.bundle"):
        print("React Native  -> assets/index.android.bundle (JS or Hermes bytecode)")
    elif has("libflutter.so"):
        print("Flutter       -> logic is AOT in libapp.so (use blutter/reFlutter)")
    else:
        print("Java/Kotlin or custom native -> apkmod decode, read _jadx, patch smali")
    if has("assets/bin/Data/"):
        print("Unity assets  -> assets/bin/Data/ (edit with UnityPy)")


def main():
    a = sys.argv[1:]
    if not a or a[0] in ("-h", "--help"):
        print(__doc__)
        return
    for tool in ("apktool", "jadx", "zipalign", "apksigner", "keytool"):
        if a[0] in ("decode", "build") and not shutil.which(tool):
            raise SystemExit(f"{tool} not on PATH; run setup.sh")
    cmds = {"decode": decode, "build": build, "ret": force_return, "find": find, "engine": engine}
    if a[0] not in cmds:
        raise SystemExit(__doc__)
    cmds[a[0]](*a[1:])


if __name__ == "__main__":
    main()

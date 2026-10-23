# Rebuild the APK: copy every untouched entry byte-for-byte (raw compressed
# data), replace the web bundle + manifest, add realism assets, drop the old
# signature, 4-byte-align stored entries. Signing happens afterwards (apksig).
import zipfile, zlib, struct, os, sys, binascii, time
sys.path.insert(0, os.path.dirname(__file__))
import axml
src_apk, web_root, out_apk = sys.argv[1], sys.argv[2], sys.argv[3]
VERSION_CODE, VERSION_NAME_OLD, VERSION_NAME_NEW = 12100, '11.0.0', '12.1.0'
zin = zipfile.ZipFile(src_apk)
raw = open(src_apk, 'rb').read()

def patched_manifest(data):
    data = bytearray(data)
    strings, attrs = axml.parse(bytes(data))
    for el, an, rawi, vt, vd, q in attrs:
        if el == 'manifest' and an == 'versionCode':
            struct.pack_into('<I', data, q + 16, VERSION_CODE)
    for s, p, n, enc in strings:
        if s == VERSION_NAME_OLD and enc == 'utf16':
            data[p:p + 2 * n] = VERSION_NAME_NEW.encode('utf-16le')
    return bytes(data)

entries = []  # (name, method, crc, csize, usize, payload_bytes, dostime, dosdate)
def dos_now():
    t = time.localtime(1792000000)
    return ((t.tm_hour << 11) | (t.tm_min << 5) | (t.tm_sec // 2), ((t.tm_year - 1980) << 9) | (t.tm_mon << 5) | t.tm_mday)
def add_new(name, data, method):
    crc = binascii.crc32(data) & 0xffffffff
    if method == 8:
        c = zlib.compressobj(9, zlib.DEFLATED, -15)
        payload = c.compress(data) + c.flush()
    else:
        payload = data
    dt, dd = dos_now()
    entries.append((name, method, crc, len(payload), len(data), payload, dt, dd))

skip = {'META-INF/MANIFEST.MF'}
replace = {}
web_prefix = 'assets/public/'
for info in zin.infolist():
    n = info.filename
    if n.startswith('META-INF/') and (n.endswith('.SF') or n.endswith('.RSA') or n.endswith('.DSA') or n.endswith('.EC') or n in skip):
        continue
    if n == 'AndroidManifest.xml':
        add_new(n, patched_manifest(zin.read(n)), 8)
        continue
    if n.startswith(web_prefix):
        rel = n[len(web_prefix):]
        local = os.path.join(web_root, rel)
        if os.path.exists(local):
            data = open(local, 'rb').read()
            if data != zin.read(n):
                add_new(n, data, info.compress_type)
                continue
    # copy raw
    lh = info.header_offset
    sig, ver, flag, meth, mt, md, crc, cs, us, fnl, exl = struct.unpack_from('<IHHHHHIIIHH', raw, lh)
    assert sig == 0x04034b50
    start = lh + 30 + fnl + exl
    payload = raw[start:start + info.compress_size]
    entries.append((n, info.compress_type, info.CRC, info.compress_size, info.file_size, payload, info.date_time and mt, md))
# new realism assets
existing = {e[0] for e in entries}
for root, dirs, files in os.walk(os.path.join(web_root, 'assets', 'realism')):
    dirs.sort()
    for f in sorted(files):
        p = os.path.join(root, f)
        name = web_prefix + os.path.relpath(p, web_root).replace(os.sep, '/')
        if name in existing: continue
        data = open(p, 'rb').read()
        add_new(name, data, 0 if f.endswith(('.jpg', '.png')) else 8)

out = bytearray()
central = bytearray()
for name, method, crc, cs, us, payload, dt, dd in entries:
    nb = name.encode('utf8')
    offset = len(out)
    extra = b''
    if method == 0:
        data_start = offset + 30 + len(nb)
        pad = (-data_start) % 4
        extra = b'\x00' * pad
    out += struct.pack('<IHHHHHIIIHH', 0x04034b50, 20 if method == 8 else 10, 0x0800 if any(ord(c) > 127 for c in name) else 0, method, dt, dd, crc, cs, us, len(nb), len(extra))
    out += nb + extra + payload
    central += struct.pack('<IHHHHHHIIIHHHHHII', 0x02014b50, 20, 20 if method == 8 else 10, 0, method, dt, dd, crc, cs, us, len(nb), 0, 0, 0, 0, 0, offset)
    central += nb
cd_off = len(out)
out += central
out += struct.pack('<IHHHHIIH', 0x06054b50, 0, 0, len(entries), len(entries), len(central), cd_off, 0)
open(out_apk, 'wb').write(out)
print('entries', len(entries), 'size', len(out))

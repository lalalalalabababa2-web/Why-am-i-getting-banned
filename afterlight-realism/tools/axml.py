# Minimal Android binary XML reader/patcher for versionCode / versionName.
import struct, sys
def parse(data):
    assert struct.unpack_from('<HHI', data, 0)[0] == 0x0003
    off = 8
    strings = []; sp_off = None
    attrs = []
    while off < len(data):
        typ, hsz, size = struct.unpack_from('<HHI', data, off)
        if typ == 0x0001:  # string pool
            sp_off = off
            cnt, scnt, flags, sstart, stystart = struct.unpack_from('<IIIII', data, off + 8)
            utf8 = flags & 0x100
            offs = struct.unpack_from('<%dI' % cnt, data, off + hsz)
            for o in offs:
                p = off + sstart + o
                if utf8:
                    n = data[p]; p += 2 if n & 0x80 else 1
                    n2 = data[p]; 
                    if n2 & 0x80: n2 = ((n2 & 0x7f) << 8) | data[p+1]; p += 2
                    else: p += 1
                    strings.append((data[p:p+n2].decode('utf8'), p, n2, 'utf8'))
                else:
                    n = struct.unpack_from('<H', data, p)[0]; p += 2
                    strings.append((data[p:p+2*n].decode('utf-16le'), p, n, 'utf16'))
        elif typ == 0x0102:  # start element
            ns, name, aStart, aSize, aCount = struct.unpack_from('<iIHHH', data, off + 16)
            ap = off + 16 + aStart
            for i in range(aCount):
                q = ap + i * aSize
                ans, aname, araw, vsize, res0, vtype, vdata = struct.unpack_from('<iiiHBBI', data, q)
                attrs.append((strings[name][0], strings[aname][0], araw, vtype, vdata, q))
        off += size
    return strings, attrs
if __name__ == '__main__':
    data = bytearray(open(sys.argv[1], 'rb').read())
    strings, attrs = parse(data)
    for el, an, raw, vt, vd, q in attrs:
        if el in ('manifest', 'uses-sdk', 'application') and an in ('versionCode', 'versionName', 'minSdkVersion', 'targetSdkVersion', 'compileSdkVersion', 'package', 'debuggable', 'label'):
            print(el, an, 'raw=' + (strings[raw][0] if raw >= 0 else '-'), 'type=0x%x' % vt, 'data=%d' % vd)

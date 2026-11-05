// Localized names. Skyrim.esm stores names as ids into strings/skyrim_english.strings,
// which ships inside "Skyrim - Interface.bsa" (archive version 105, LZ4 frames).
// Format references: UESP, "Skyrim Mod:Archive File Format" and "Skyrim Mod:String Table File Format".
import fs from 'node:fs';

// Pull named files out of a BSA. names: lower-case paths with forward slashes.
export function readFromBsa(file, names) {
  const buf = fs.readFileSync(file);
  if (buf.toString('latin1', 0, 4) !== 'BSA\0' || buf.readUInt32LE(4) !== 105) throw new Error('not a version 105 BSA');
  const flags = buf.readUInt32LE(12), folders = buf.readUInt32LE(16), files = buf.readUInt32LE(20);
  const compressedByDefault = (flags & 0x4) !== 0, embedNames = (flags & 0x100) !== 0;
  let p = 36;
  const counts = [];
  for (let i = 0; i < folders; i++) { counts.push(buf.readUInt32LE(p + 8)); p += 24; }
  const recs = [];
  for (let i = 0; i < folders; i++) {
    const len = buf[p];
    const folder = buf.toString('latin1', p + 1, p + len); // includes the trailing zero
    p += 1 + len;
    for (let j = 0; j < counts[i]; j++) {
      recs.push({ folder: folder.replace(/\0$/, ''), size: buf.readUInt32LE(p + 8), offset: buf.readUInt32LE(p + 12) });
      p += 16;
    }
  }
  // File names follow, zero-terminated, in record order.
  for (let i = 0; i < files; i++) {
    const z = buf.indexOf(0, p);
    recs[i].name = `${recs[i].folder.split(String.fromCharCode(92)).join('/')}/${buf.toString('latin1', p, z)}`.toLowerCase();
    p = z + 1;
  }
  const out = {};
  for (const r of recs) {
    if (!names.includes(r.name)) continue;
    let off = r.offset, size = r.size & 0x3fffffff;
    const compressed = compressedByDefault !== ((r.size & 0x40000000) !== 0);
    if (embedNames) { const l = buf[off]; off += 1 + l; size -= 1 + l; }
    out[r.name] = compressed ? lz4Frame(buf.subarray(off + 4, off + size), buf.readUInt32LE(off)) : buf.subarray(off, off + size);
  }
  return out;
}

// LZ4 frame format: header, then blocks of literals and back-references.
function lz4Frame(src, outSize) {
  if (src.readUInt32LE(0) !== 0x184d2204) throw new Error('not an LZ4 frame');
  const flg = src[4];
  let p = 6 + ((flg & 0x08) ? 8 : 0) + 1; // FLG, BD, optional content size, header checksum
  const out = Buffer.alloc(outSize);
  let o = 0;
  for (;;) {
    const bsize = src.readUInt32LE(p); p += 4;
    if (bsize === 0) break;
    const raw = (bsize & 0x80000000) !== 0, len = bsize & 0x7fffffff;
    if (raw) { src.copy(out, o, p, p + len); o += len; }
    else {
      const end = p + len;
      let q = p;
      while (q < end) {
        const token = src[q++];
        let lit = token >> 4;
        if (lit === 15) { let b; do { b = src[q++]; lit += b; } while (b === 255); }
        src.copy(out, o, q, q + lit); o += lit; q += lit;
        if (q >= end) break;
        const offset = src[q] | (src[q + 1] << 8); q += 2;
        let m = token & 15;
        if (m === 15) { let b; do { b = src[q++]; m += b; } while (b === 255); }
        m += 4;
        for (let k = 0; k < m; k++) { out[o] = out[o - offset]; o++; }
      }
    }
    p += len + ((flg & 0x10) ? 4 : 0); // optional block checksum
  }
  return out;
}

// A .STRINGS table: count, data size, directory of (id, offset), then zero-terminated strings.
export function parseStrings(buf) {
  const count = buf.readUInt32LE(0), base = 8 + count * 8;
  const map = new Map();
  for (let i = 0; i < count; i++) {
    const id = buf.readUInt32LE(8 + i * 8), off = base + buf.readUInt32LE(12 + i * 8);
    const z = buf.indexOf(0, off);
    map.set(id, buf.toString('utf8', off, z));
  }
  return map;
}

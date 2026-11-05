// Reads Skyrim Special Edition plugin files (.esm). Format reference: UESP, "Skyrim Mod:Mod File Format".
// A plugin is a TES4 header record followed by groups (GRUP) of records. Each record is a
// 24-byte header and a list of subrecords (4-character type, uint16 size, data). Records
// flagged compressed hold a uint32 size and a zlib stream.
import fs from 'node:fs';
import zlib from 'node:zlib';

const COMPRESSED = 0x00040000;

// Every record of the given types, as { type, formId, flags, subs: [{ type, data }] }.
export function readPlugin(file, types) {
  const buf = fs.readFileSync(file);
  const want = new Set(types);
  const out = [];
  const tes4 = readRecord(buf, 0);
  const masters = tes4.subs.filter((s) => s.type === 'MAST').map((s) => zstring(s.data));
  let pos = 24 + buf.readUInt32LE(4);
  while (pos < buf.length) {
    // Top-level groups hold one record type each; skip the ones we do not need.
    const size = buf.readUInt32LE(pos + 4);
    const label = buf.toString('latin1', pos + 8, pos + 12);
    if (want.has(label)) walkGroup(buf, pos + 24, pos + size, want, out);
    pos += size;
  }
  return { masters, localized: (tes4.flags & 0x80) !== 0, records: out };
}

function walkGroup(buf, start, end, want, out) {
  let pos = start;
  while (pos < end) {
    const type = buf.toString('latin1', pos, pos + 4);
    if (type === 'GRUP') {
      walkGroup(buf, pos + 24, pos + buf.readUInt32LE(pos + 4), want, out);
      pos += buf.readUInt32LE(pos + 4);
      continue;
    }
    const size = buf.readUInt32LE(pos + 4);
    if (want.has(type)) out.push(readRecord(buf, pos));
    pos += 24 + size;
  }
}

function readRecord(buf, pos) {
  const type = buf.toString('latin1', pos, pos + 4);
  const size = buf.readUInt32LE(pos + 4);
  const flags = buf.readUInt32LE(pos + 8);
  const formId = buf.readUInt32LE(pos + 12);
  let data = buf.subarray(pos + 24, pos + 24 + size);
  if (flags & COMPRESSED) data = zlib.inflateSync(data.subarray(4));
  const subs = [];
  let p = 0, big = 0;
  while (p + 6 <= data.length) {
    const st = data.toString('latin1', p, p + 4);
    let ss = data.readUInt16LE(p + 4);
    // XXXX carries the real size of the next subrecord when it is over 65535 bytes.
    if (st === 'XXXX') { big = data.readUInt32LE(p + 6); p += 6 + ss; continue; }
    if (big) { ss = big; big = 0; }
    subs.push({ type: st, data: data.subarray(p + 6, p + 6 + ss) });
    p += 6 + ss;
  }
  return { type, formId, flags, subs };
}

export const zstring = (b) => { const z = b.indexOf(0); return b.toString('latin1', 0, z < 0 ? b.length : z); };
export const sub = (rec, type) => rec.subs.find((s) => s.type === type)?.data;
export const subs = (rec, type) => rec.subs.filter((s) => s.type === type).map((s) => s.data);
export const hex = (id) => id.toString(16).toUpperCase().padStart(8, '0');

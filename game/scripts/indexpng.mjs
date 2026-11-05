// Write an RGBA image as an 8-bit palette PNG (colour type 3, with tRNS alpha) when it
// has 256 colours or fewer. The sprite sheets use under a hundred, so this is lossless
// and about a quarter of the size. Returns null when the image has too many colours.
import zlib from 'node:zlib';

const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = (buf) => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length), td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  out.writeUInt32BE(data.length, 0); td.copy(out, 4); out.writeUInt32BE(crc(td), 8 + data.length);
  return out;
}

export function indexedPng(width, height, rgba) {
  const index = new Map(), px = new Uint8Array(width * height);
  for (let i = 0; i < px.length; i++) {
    // Fully transparent pixels all share one entry whatever their RGB.
    const a = rgba[i * 4 + 3], key = a === 0 ? 0 : rgba.readUInt32BE(i * 4);
    let k = index.get(key);
    if (k === undefined) { if (index.size === 256) return null; k = index.size; index.set(key, k); }
    px[i] = k;
  }
  const keys = [...index.keys()], plte = Buffer.alloc(keys.length * 3), trns = Buffer.alloc(keys.length);
  keys.forEach((key, k) => { plte[k * 3] = key >>> 24; plte[k * 3 + 1] = (key >>> 16) & 255; plte[k * 3 + 2] = (key >>> 8) & 255; trns[k] = key & 255; });
  // Each row: try no filter and the Up filter, keep whichever has more zero bytes.
  const raw = Buffer.alloc((width + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = px.subarray(y * width, (y + 1) * width), prev = y ? px.subarray((y - 1) * width, y * width) : null, o = y * (width + 1);
    let zNone = 0, zUp = 0;
    for (let x = 0; x < width; x++) { if (!row[x]) zNone++; if (prev && row[x] === prev[x]) zUp++; }
    if (prev && zUp > zNone) { raw[o] = 2; for (let x = 0; x < width; x++) raw[o + 1 + x] = (row[x] - prev[x]) & 255; }
    else { raw[o] = 0; raw.set(row, o + 1); }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 3;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('PLTE', plte), chunk('tRNS', trns),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

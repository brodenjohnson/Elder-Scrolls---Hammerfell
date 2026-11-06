// Make the voice recordings (design bible decisions 28 and 44) with ElevenLabs.
// Reads public/data/voice/lines.json (what is said) and cast.json (who says it), and writes
// public/audio/voice/<speaker>/<line>.mp3 plus a manifest the game reads. A line is only made
// again when its text, voice or settings change, so re-running is cheap.
//
//   npm run voices -- --list          the voices in your ElevenLabs account, with their IDs
//   npm run voices -- --dry           what would be made, and how many characters (the cost)
//   npm run voices                    make everything that is missing or changed
//   npm run voices -- --only=kasim    one speaker only
//   npm run voices -- --force         make everything again
//
// The API key is read from the ELEVENLABS_API_KEY environment variable, never from a file.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const game = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(game, 'public/data/voice'), outDir = path.join(game, 'public/audio/voice');
const args = process.argv.slice(2), flag = (f) => args.includes(f), opt = (k) => args.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];
const key = process.env.ELEVENLABS_API_KEY;
const API = 'https://api.elevenlabs.io/v1';

if (flag('--list')) {
  if (!key) fail('Set ELEVENLABS_API_KEY first (see the note at the top of this script).');
  const r = await fetch(`${API}/voices`, { headers: { 'xi-api-key': key } });
  if (!r.ok) fail(`ElevenLabs said ${r.status}: ${await r.text()}`);
  const { voices } = await r.json();
  for (const v of voices) console.log(`${v.voice_id}  ${v.name.padEnd(28)} ${[v.labels?.gender, v.labels?.age, v.labels?.accent, v.labels?.description].filter(Boolean).join(', ')}`);
  process.exit(0);
}

const lines = JSON.parse(fs.readFileSync(path.join(dataDir, 'lines.json'), 'utf8'));
const cast = JSON.parse(fs.readFileSync(path.join(dataDir, 'cast.json'), 'utf8'));
const BANDITS = ['hakon', 'bilal', 'jorund', 'fenn', 'qadir'];
const speakersOf = (by) => (by === 'bandits' ? BANDITS : by === 'chief' ? ['qadir'] : [by]);

// Every recording to make: one per speaker, line and (for {name} lines) name.
const clips = [];
for (const [set, def] of Object.entries(lines.sets)) for (const speaker of speakersOf(def.by)) def.lines.forEach((text, i) => {
  const names = text.includes('{name}') ? lines.names.filter((n) => n.toLowerCase() !== speaker) : [null];
  for (const name of names) clips.push({ speaker, id: `${set}.${i}${name ? `.${name.toLowerCase()}` : ''}`, text: name ? text.replaceAll('{name}', name) : text, direction: def.direction });
});

const manifestPath = path.join(outDir, 'manifest.json');
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};
const only = opt('only');
const todo = [], skipped = new Set();
for (const c of clips) {
  if (only && c.speaker !== only) continue;
  const who = cast.speakers[c.speaker];
  if (!who?.voice_id) { skipped.add(c.speaker); continue; }
  const model = who.model || cast.model;
  // eleven_v3 reads a stage direction in square brackets; the older models would say it aloud.
  const text = model === 'eleven_v3' ? `[${c.direction}] ${c.text}` : c.text;
  const settings = { stability: who.stability ?? 0.4, similarity_boost: 0.75, style: who.style ?? 0.45, use_speaker_boost: true };
  const hash = crypto.createHash('sha1').update(JSON.stringify([text, who.voice_id, model, settings])).digest('hex').slice(0, 12);
  const file = path.join(outDir, c.speaker, `${c.id}.mp3`);
  if (!flag('--force') && manifest[c.speaker]?.[c.id] === hash && fs.existsSync(file)) continue;
  todo.push({ ...c, text, model, settings, hash, file, voice: who.voice_id });
}
const chars = todo.reduce((n, c) => n + c.text.length, 0);
console.log(`${clips.length} lines in all; ${todo.length} to make (${chars} characters).${skipped.size ? ` No voice yet for: ${[...skipped].join(', ')} (set voice_id in cast.json).` : ''}`);
if (flag('--dry') || !todo.length) process.exit(0);
if (!key) fail('Set ELEVENLABS_API_KEY first (see the note at the top of this script).');

let done = 0;
for (const c of todo) {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(`${API}/text-to-speech/${c.voice}?output_format=mp3_44100_128`, {
      method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text: c.text, model_id: c.model, voice_settings: c.settings }),
    });
    if (r.status === 429 && attempt < 5) { await new Promise((ok) => setTimeout(ok, 2000 * (attempt + 1))); continue; } // busy: wait and try again
    if (!r.ok) fail(`ElevenLabs said ${r.status} for ${c.speaker} ${c.id}: ${await r.text()}`);
    fs.mkdirSync(path.dirname(c.file), { recursive: true });
    fs.writeFileSync(c.file, Buffer.from(await r.arrayBuffer()));
    (manifest[c.speaker] ??= {})[c.id] = c.hash;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1)); // saved as it goes, so a stop loses nothing
    console.log(`${++done}/${todo.length}  ${c.speaker}  ${c.text}`);
    break;
  }
}
console.log('Done. Commit public/audio/voice to publish them.');

function fail(m) { console.error(m); process.exit(1); }

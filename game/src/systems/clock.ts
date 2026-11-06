// Game time. Skyrim runs its clock at TimeScale 20 (a global, not a game setting, so it
// is not in the export): a game day is 72 real minutes. Time is kept in game seconds
// from midnight before day 1.

export const TIMESCALE = 20;
export const DAY = 24 * 3600;
export const START_TIME = 7 * 3600; // a new game wakes at 07:00 on day 1

export function clockText(t: number) {
  const day = Math.floor(t / DAY) + 1, s = t % DAY, h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return `Day ${day}, ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// The light over the world through the day: a colour the whole scene is multiplied by.
// Keyed by hour; between keys the colour is blended.
// Night is dark (0.8.0): moonlight is about a fifth of the day, so fires, lamps and torches matter.
const KEYS: [number, [number, number, number]][] = [
  [0, [0.17, 0.2, 0.36]], [4.5, [0.2, 0.22, 0.38]], [6, [0.82, 0.62, 0.55]], [7.5, [1, 0.94, 0.86]],
  [10, [1, 1, 1]], [16, [1, 1, 1]], [18, [1, 0.86, 0.7]], [19.5, [0.72, 0.52, 0.56]], [21, [0.24, 0.26, 0.42]], [24, [0.17, 0.2, 0.36]],
];
export function daylight(t: number): number {
  const h = (t % DAY) / 3600;
  let i = 0;
  while (i < KEYS.length - 2 && h >= KEYS[i + 1][0]) i++;
  const [h0, c0] = KEYS[i], [h1, c1] = KEYS[i + 1], u = (h - h0) / (h1 - h0);
  const ch = (k: number) => Math.round(255 * (c0[k] + (c1[k] - c0[k]) * u));
  return (ch(0) << 16) | (ch(1) << 8) | ch(2);
}
export const isNight = (t: number) => { const h = (t % DAY) / 3600; return h < 5 || h >= 20.5; };

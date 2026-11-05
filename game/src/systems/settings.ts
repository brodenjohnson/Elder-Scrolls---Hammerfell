// Player settings (bible 11.3, SYSTEMS_SPEC 11): kept per browser, not in saves, so a
// setting holds across every character and every save slot.

export type Gore = 'off' | 'some' | 'full';
export type Settings = { gore: Gore; warned: boolean };

const KEY = 'hammerfell.settings';
const DEFAULTS: Settings = { gore: 'full', warned: false };

export function loadSettings(): Settings {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return { ...DEFAULTS }; }
}
export function saveSettings(s: Settings) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private window: settings last this session only */ }
}

// What each gore level shows: blood (sprays, pools, trails) and severed parts.
export const GORE_LEVELS: Record<Gore, { label: string; blood: boolean; dismember: boolean }> = {
  off: { label: 'Off: no blood, no dismemberment', blood: false, dismember: false },
  some: { label: 'Some: blood, no dismemberment', blood: true, dismember: false },
  full: { label: 'Full: blood and dismemberment', blood: true, dismember: true },
};

// The game's entry: the engine (src/engine/game.js) and its interface (src/engine/ui.js),
// and the notice when a newer version has been published (CLAUDE.md release flow).
import './engine/ui.js';
import './engine/game.js';

const VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
const notice = document.getElementById('notice');
const newer = (a, b) => {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0);
  return false;
};
async function checkVersion() {
  try {
    const r = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
    const { version } = await r.json();
    if (newer(version, VERSION)) { notice.textContent = `Version ${version} is out. Save (F5), then reload the page to update.`; notice.hidden = false; }
  } catch { /* offline: say nothing */ }
}
checkVersion();
setInterval(checkVersion, 10 * 60 * 1000);

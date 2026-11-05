// Release: bump VERSION, run the checks, commit and tag. Usage:
//   npm run release -- patch|minor|major "One line on what changed" [--push]
// Write the player-facing changelog entry first (CHANGELOG.md, top section headed
// with the new version); this script refuses to release without one.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const game = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(game, '..');
const [kind = 'patch', summary = '', ...rest] = process.argv.slice(2);
const push = rest.includes('--push') || summary === '--push';
const run = (cmd, cwd = game) => execSync(cmd, { cwd, stdio: 'inherit' });

const current = fs.readFileSync(path.join(root, 'VERSION'), 'utf8').trim();
const [ma, mi, pa] = current.split('.').map(Number);
const next = kind === 'major' ? `${ma + 1}.0.0` : kind === 'minor' ? `${ma}.${mi + 1}.0` : `${ma}.${mi}.${pa + 1}`;
const log = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
if (!log.includes(`## ${next} `)) {
  console.error(`CHANGELOG.md has no entry for ${next}. Add "## ${next} (date): title" with the changes, then run again.`);
  process.exit(1);
}
fs.writeFileSync(path.join(root, 'VERSION'), `${next}\n`);
try {
  run('npm run typecheck');
  run('npx playwright test'); // builds, then runs the regression list
} catch {
  fs.writeFileSync(path.join(root, 'VERSION'), `${current}\n`);
  console.error('Checks failed; VERSION put back.');
  process.exit(1);
}
run('git add -A', root);
run(`git commit -m "Release ${next}${summary && summary !== '--push' ? `: ${summary}` : ''}"`, root);
run(`git tag v${next}`, root);
if (push) { run('git push origin main', root); run(`git push origin v${next}`, root); }
console.log(`Released ${next}${push ? ' and pushed (GitHub Pages deploys from main)' : '. Push with: git push origin main --tags'}`);

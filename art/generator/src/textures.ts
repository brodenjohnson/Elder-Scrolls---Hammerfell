import { hash3, vnoise3 } from './sdf.ts';

// ---------- material texture ----------
// Tone nudges in object space, added after lighting. Kept sparse: the brief asks
// for rich texture without noise. Materials are matched by their family (the part
// before the first dot), so "cloth.red" textures like any other cloth.
export function materialTexture(mat: string, x: number, y: number, z: number): number {
  const f = Math.floor;
  const family = mat.split('.')[0];
  switch (family) {
    case 'linen':
    case 'cloth': {
      const h = hash3(f(x / 1.6), f(y / 3.4), f(z / 1.6));
      return h < 0.13 ? -1 : h > 0.95 ? 1 : 0;
    }
    case 'wool': {
      const h = hash3(f(x / 1.3), f(y / 1.3), f(z / 1.3));
      return h < 0.12 ? -1 : 0;
    }
    case 'leather': {
      const h = hash3(f(x / 2.2), f(y / 1.6), f(z / 2.2));
      return h > 0.86 ? 1 : h < 0.08 ? -1 : 0;
    }
    case 'plaster': {
      // Large soft stains plus a little grit.
      const s = vnoise3(x / 22, y / 14, z / 22);
      const g = hash3(f(x / 1.5), f(y / 1.5), f(z / 1.5));
      return (s < 0.3 ? -1 : s > 0.78 ? 1 : 0) + (g < 0.06 ? -1 : 0);
    }
    case 'sandstone':
    case 'rock': {
      // Bedding layers, then pits.
      const band = vnoise3(x / 30, y / 2.6, z / 30);
      const g = hash3(f(x / 1.8), f(y / 1.8), f(z / 1.8));
      return (band < 0.28 ? -1 : band > 0.8 ? 1 : 0) + (g < 0.07 ? -1 : g > 0.97 ? 1 : 0);
    }
    case 'wood': {
      // Grain runs along y unless the model paints its own.
      const n = vnoise3(x / 1.1, y / 10, z / 1.1);
      return n < 0.28 ? -1 : n > 0.84 ? 1 : 0;
    }
    case 'clay': {
      const g = hash3(f(x / 1.4), f(y / 1.4), f(z / 1.4));
      return g < 0.06 ? -1 : g > 0.98 ? 1 : 0;
    }
    case 'iron':
    case 'steel': {
      // Worn metal: dull patches and the odd bright scratch.
      const g = hash3(f(x / 1.2), f(y / 1.2), f(z / 1.2));
      const wear = vnoise3(x / 6, y / 6, z / 6);
      return (g > 0.96 ? 1 : g < 0.07 ? -1 : 0) + (wear < 0.3 ? -1 : 0);
    }
    case 'bark':
      return ((y / 3.4) % 1 + 1) % 1 < 0.3 ? -1 : 0;
    case 'leaf': {
      const g = hash3(f(x / 1.2), f(y / 1.2), f(z / 1.2));
      return g < 0.2 ? -1 : g > 0.9 ? 1 : 0;
    }
    case 'fur': {
      // Clumps stretched along the body (z) read as hair direction.
      const g = hash3(f(x / 1.1), f(y / 1.3), f(z / 3.2));
      return g < 0.22 ? -1 : g > 0.84 ? 1 : 0;
    }
    case 'scrub': {
      const g = hash3(f(x / 1.3), f(y / 1.3), f(z / 1.3));
      return g < 0.3 ? -1 : g > 0.85 ? 1 : 0;
    }
    default:
      return 0;
  }
}

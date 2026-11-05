// True isometric projection: a 64 by 32 tile, a running east-south-east, b running west-south-west.
export const TILE_W = 64, TILE_H = 32;
export const CHUNK = 16; // tiles per ground chunk side

export const toScreen = (a: number, b: number): [number, number] => [(a - b) * (TILE_W / 2), (a + b) * (TILE_H / 2)];
export const toGround = (x: number, y: number): [number, number] => [(x / (TILE_W / 2) + y / (TILE_H / 2)) / 2, (y / (TILE_H / 2) - x / (TILE_W / 2)) / 2];

// The eight facings, indexed by screen angle in 45 degree steps from east.
export const FACINGS = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'] as const;
export type Facing = (typeof FACINGS)[number];
export const facingOf = (sx: number, sy: number): Facing => FACINGS[((Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) % 8) + 8) % 8];

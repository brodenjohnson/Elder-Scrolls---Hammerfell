// The master map (data/world/slices.json): 12 by 9 slices of 128 by 128 tiles.
// Global tile coordinates (a, b): a runs east (screen down-right), b runs south
// (screen down-left). Slice (sx, sy) covers a in [sx*128, sx*128+128), b likewise.

export const SLICE = 128;

export type SliceInfo = {
  x: number; y: number;                       // 1-based, as in slices.json
  biome: 'sea' | 'desert' | 'coastal grassland' | 'rocky badlands' | 'highlands and mountains' | 'jungle';
  region: string; level_band: string; locations: string[]; roads: string[]; wadi: boolean;
};

export class WorldMap {
  readonly cols: number;
  readonly rows: number;
  private readonly grid: (SliceInfo | undefined)[];
  constructor(data: { cols: number; rows: number; slices: SliceInfo[] }) {
    this.cols = data.cols; this.rows = data.rows;
    this.grid = new Array(this.cols * this.rows);
    for (const s of data.slices) this.grid[(s.y - 1) * this.cols + (s.x - 1)] = s;
  }
  // Zero-based slice coordinates; off the map is open sea.
  info(sx: number, sy: number): SliceInfo {
    const s = sx >= 0 && sy >= 0 && sx < this.cols && sy < this.rows ? this.grid[sy * this.cols + sx] : undefined;
    return s ?? { x: sx + 1, y: sy + 1, biome: 'sea', region: 'Open sea', level_band: '', locations: [], roads: [], wadi: false };
  }
  sliceOf(a: number, b: number): [number, number] { return [Math.floor(a / SLICE), Math.floor(b / SLICE)]; }
  get widthTiles() { return this.cols * SLICE; }
  get heightTiles() { return this.rows * SLICE; }
}

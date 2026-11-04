import type { V3 } from './sdf.ts';

// Joint positions in character space (units are 1x pixels before projection).
// Figure height H = 134 units, which projects to about 120 px on screen at
// the 30 degree iso camera. L is the character's left (+x).
export type Side = 'L' | 'R';

export type Pose = {
  pelvis: V3;
  chest: V3;
  neck: V3;
  head: V3;
  headPitch: number;
  hip: Record<Side, V3>;
  knee: Record<Side, V3>;
  ankle: Record<Side, V3>;
  footYaw: Record<Side, number>;
  shoulder: Record<Side, V3>;
  elbow: Record<Side, V3>;
  wrist: Record<Side, V3>;
  hand: Record<Side, V3>;
};

export const H = 134;

const mirror = (v: V3): V3 => [-v[0], v[1], v[2]];
const both = (l: V3): Record<Side, V3> => ({ L: l, R: mirror(l) });

// A farmer standing easy: weight even, arms hanging a little forward and out.
export function idlePose(): Pose {
  return {
    pelvis: [0, 72, 0],
    chest: [0, 97, 0.4],
    neck: [0, 111, -0.6],
    head: [0, 124.6, 1.0],
    headPitch: 0,
    hip: both([7.6, 70, 0]),
    knee: both([8.0, 38.5, 1.4]),
    ankle: both([8.6, 6.4, -0.4]),
    footYaw: { L: 0.16, R: -0.16 },
    shoulder: both([13.4, 106.8, -0.8]),
    elbow: both([15.6, 82.5, -1.0]),
    wrist: both([16.4, 61.5, 2.4]),
    hand: both([16.2, 51.5, 3.6]),
  };
}

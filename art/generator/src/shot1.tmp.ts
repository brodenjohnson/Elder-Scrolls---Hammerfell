// Scratch: render single frames to PNG for a look. Not part of the pipeline.
import { renderFrame } from './frames.ts';
import { cell, writePng } from './pipeline.ts';
const [outfit, facing = 'S', anim = 'idle', race = 'redguard'] = process.argv.slice(2);
const r = renderFrame({ race, outfit, anim, frame: 0, facing: facing as never });
writePng(process.argv[6] ?? `../../out/${outfit}_${facing}.png`, cell.w, cell.h, r.composite);
console.log(outfit, facing, r.ms, 'ms');

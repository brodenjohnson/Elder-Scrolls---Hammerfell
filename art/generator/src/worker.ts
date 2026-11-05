import { parentPort } from 'node:worker_threads';
import { renderFrame, type FrameJob } from './frames.ts';

// Renders frames sent by sprites.ts, one at a time, and hands the pixels back without copying.
parentPort!.on('message', (job: FrameJob) => {
  const r = renderFrame(job);
  parentPort!.postMessage(r, [r.composite.buffer as ArrayBuffer, ...r.pieces.map((p) => p.data.buffer as ArrayBuffer)]);
});

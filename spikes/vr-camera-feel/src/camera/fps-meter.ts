export type FpsMeter = {
  frames: number; totalSec: number; worstMs: number;
  recentSec: number; recentFrames: number; recentFps: number;
};

export function createFpsMeter(): FpsMeter {
  return { frames: 0, totalSec: 0, worstMs: 0, recentSec: 0, recentFrames: 0, recentFps: 0 };
}

export function pushFrame(m: FpsMeter, dtSec: number): void {
  m.frames += 1;
  m.totalSec += dtSec;
  if (dtSec * 1000 > m.worstMs) m.worstMs = dtSec * 1000;
  m.recentSec += dtSec;
  m.recentFrames += 1;
  if (m.recentSec >= 1) {
    m.recentFps = m.recentFrames / m.recentSec;
    m.recentSec = 0;
    m.recentFrames = 0;
  }
}

/** Resets the since-reset numbers. The rolling one-second fps keeps running. */
export function resetFpsMeter(m: FpsMeter): void {
  m.frames = 0;
  m.totalSec = 0;
  m.worstMs = 0;
}

export function readFpsMeter(m: FpsMeter): { avgFps: number; worstMs: number; recentFps: number; frames: number } {
  return { avgFps: m.totalSec > 0 ? m.frames / m.totalSec : 0, worstMs: m.worstMs, recentFps: m.recentFps, frames: m.frames };
}

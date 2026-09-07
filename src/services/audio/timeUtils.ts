/**
 * Phase 2 — Time utilities with sample-accurate precision.
 *
 * Beginner explanation:
 * Audio is stored as thousands of tiny snapshots per second ("samples").
 * 44100 Hz = 44100 snapshots per second.
 * We keep time as integer SAMPLES internally to avoid rounding errors,
 * and only convert to milliseconds/strings for display.
 */

export const MS_PER_SECOND = 1000;

/** Convert sample index -> milliseconds (float, for display/playback). */
export function samplesToMs(samples: number, sampleRate: number): number {
  if (sampleRate <= 0) return 0;
  return (samples / sampleRate) * MS_PER_SECOND;
}

/** Convert milliseconds -> nearest integer sample index. */
export function msToSamples(ms: number, sampleRate: number): number {
  if (sampleRate <= 0) return 0;
  return Math.max(0, Math.round((ms / MS_PER_SECOND) * sampleRate));
}

/** Convert sample count -> duration in ms. */
export function sampleCountToDurationMs(sampleCount: number, sampleRate: number): number {
  return samplesToMs(sampleCount, sampleRate);
}

/** Clamp a time value into [0, durationMs]. */
export function clampMs(ms: number, durationMs: number): number {
  if (!Number.isFinite(ms)) return 0;
  return Math.max(0, Math.min(durationMs, ms));
}

/** Normalize a selection so start <= end and both are in range. */
export function normalizeSelection(
  aMs: number,
  bMs: number,
  durationMs: number
): { startMs: number; endMs: number; durationMs: number } {
  const startMs = clampMs(Math.min(aMs, bMs), durationMs);
  const endMs = clampMs(Math.max(aMs, bMs), durationMs);
  return { startMs: Math.round(startMs), endMs: Math.round(endMs), durationMs: Math.round(endMs - startMs) };
}

/**
 * Display format required by spec: MM:SS.mmm  e.g. 00:01.234
 * Internally we keep full precision; this is display-only.
 */
export function formatTimecode(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  const millis = Math.floor(clamped % 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const mmm = String(millis).padStart(3, '0');
  return `${mm}:${ss}.${mmm}`;
}

/** Short label: 1.234s */
export function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(3)}s`;
}

/**
 * Phase 2 — Dedicated AudioEngine (playback separated from GUI + waveform).
 *
 * Beginner explanation:
 * Think of this as the "CD player" box. The buttons/waveform on screen
 * (the GUI) TALK to this box, but the box itself doesn't draw anything.
 * That keeps things tidy: fix sound bugs here, fix drawing bugs elsewhere.
 *
 * Features: load(), play(), pause(), stop(), seek(), position(),
 * duration(), setVolume(), playSelection(), loop-selection.
 *
 * Uses Web Audio API (works for WAV/FLAC/MP3/OGG via decodeAudioData).
 */

import { getAudioContext } from '../dsp/audioUtils';
import { clampMs } from './timeUtils';

export type EngineState = 'empty' | 'ready' | 'playing' | 'paused';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private buffer: AudioBuffer | null = null;

  private state: EngineState = 'empty';
  private startCtxTime = 0; // ctx.currentTime when (re)started
  private startOffsetSec = 0; // buffer offset in seconds when started
  private pausedMs = 0;
  private volume = 0.9;
  private rafId: number | null = null;
  private stopAtMs: number | null = null; // for playSelection end limit
  private loopSel: { startMs: number; endMs: number } | null = null;

  private onTick: ((ms: number) => void) | null = null;
  private onEnded: (() => void) | null = null;

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = getAudioContext();
      this.gain = this.ctx.createGain();
      this.gain.gain.value = this.volume;
      this.gain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** Load a decoded buffer. Resets position. */
  load(buffer: AudioBuffer): void {
    this.teardownSource();
    this.buffer = buffer;
    this.state = 'ready';
    this.pausedMs = 0;
    this.stopAtMs = null;
  }

  getState(): EngineState {
    return this.state;
  }

  duration(): number {
    if (!this.buffer) return 0;
    return Math.round(this.buffer.duration * 1000);
  }

  /** Current position in ms — accurate while playing AND paused. */
  position(): number {
    if (!this.buffer || !this.ctx) return Math.round(this.pausedMs);
    if (this.state === 'playing') {
      const elapsed = (this.ctx.currentTime - this.startCtxTime) * 1000;
      return Math.round(clampMs((this.startOffsetSec * 1000 + elapsed), this.duration()));
    }
    return Math.round(this.pausedMs);
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.gain && this.ctx) {
      this.gain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
    }
  }

  getVolume(): number {
    return this.volume;
  }

  onTimeUpdate(cb: ((ms: number) => void) | null): void {
    this.onTick = cb;
  }

  onPlaybackEnded(cb: (() => void) | null): void {
    this.onEnded = cb;
  }

  private teardownSource(): void {
    if (this.source) {
      try {
        this.source.onended = null;
        this.source.stop();
      } catch { /* already stopped */ }
      try { this.source.disconnect(); } catch { /* noop */ }
      this.source = null;
    }
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private startTracking(): void {
    if (!this.ctx) return;
    const loop = () => {
      if (this.state !== 'playing' || !this.ctx) return;
      const pos = this.position();
      // Selection end / loop handling
      if (this.stopAtMs !== null && pos >= this.stopAtMs) {
        const endPos = this.stopAtMs;
        if (this.loopSel) {
          // loop: restart at selection start
          const s = this.loopSel.startMs;
          this.play(s, { stopAtMs: this.loopSel.endMs, loop: this.loopSel });
          return;
        }
        this.stopAtMs = null;
        const endCb = this.onEnded;
        this.stopKeepPosition(endPos);
        if (endCb) endCb();
        return;
      }
      if (this.onTick) this.onTick(pos);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private startSource(offsetMs: number, stopAtMs: number | null): void {
    const ctx = this.ensureCtx();
    if (!this.buffer || !this.gain) return;
    this.teardownSource();
    const src = ctx.createBufferSource();
    src.buffer = this.buffer;
    src.connect(this.gain);
    const offsetSec = clampMs(offsetMs, this.duration()) / 1000;
    this.startOffsetSec = offsetSec;
    this.startCtxTime = ctx.currentTime + 0.01;
    this.stopAtMs = stopAtMs;
    src.onended = () => {
      // Natural end (not manual stop): onended fires; guard with state
      if (this.state === 'playing' && this.source === src) {
        const naturalEnd = this.stopAtMs === null || this.position() >= (this.stopAtMs ?? this.duration());
        if (naturalEnd && !this.loopSel) {
          this.state = 'ready';
          this.pausedMs = this.stopAtMs ?? this.duration();
          this.stopAtMs = null;
          if (this.rafId !== null) { cancelAnimationFrame(this.rafId); this.rafId = null; }
          if (this.onTick) this.onTick(Math.round(this.pausedMs));
          const cb = this.onEnded;
          this.source = null;
          if (cb) cb();
        }
      }
    };
    this.source = src;
    this.state = 'playing';
    // If a stop limit exists but buffer is longer, schedule stop via tracking loop
    // (more sample-accurate than ctx timer for our UI needs).
    src.start(this.startCtxTime, offsetSec);
    this.startTracking();
  }

  play(fromMs?: number, opts?: { stopAtMs?: number | null; loop?: { startMs: number; endMs: number } | null }): void {
    if (!this.buffer) return;
    this.ensureCtx();
    this.loopSel = opts?.loop ?? null;
    const start = fromMs !== undefined ? fromMs : this.pausedMs;
    this.startSource(start, opts?.stopAtMs ?? null);
  }

  /** Play only [startMs, endMs). */
  playSelection(startMs: number, endMs: number, loop = false): void {
    if (!this.buffer || endMs <= startMs) return;
    this.play(startMs, {
      stopAtMs: endMs,
      loop: loop ? { startMs, endMs } : null,
    });
  }

  setLoop(startMs: number, endMs: number): void {
    if (endMs > startMs) this.loopSel = { startMs, endMs };
  }

  clearLoop(): void {
    // only clears future loops; doesn't interrupt current play unless it was looping
    if (this.state === 'playing' && this.loopSel) {
      this.loopSel = null;
      // keep stopAtMs as-is so it stops at end once
    } else {
      this.loopSel = null;
    }
  }

  pause(): void {
    if (this.state !== 'playing') return;
    this.pausedMs = this.position();
    const cb = this.onTick;
    this.teardownSource();
    this.state = 'paused';
    if (cb) cb(Math.round(this.pausedMs));
  }

  /** Stop = halt + keep playhead where it stopped (GUI decides to reset). */
  private stopKeepPosition(posMs: number): void {
    this.pausedMs = clampMs(posMs, this.duration());
    this.teardownSource();
    this.state = 'ready';
    this.loopSel = null;
    if (this.onTick) this.onTick(Math.round(this.pausedMs));
  }

  stop(): void {
    if (this.state === 'empty') return;
    this.stopKeepPosition(this.position());
  }

  /** Jump playhead. If playing, resumes playing from new spot. */
  seek(ms: number): void {
    if (!this.buffer) return;
    const target = clampMs(ms, this.duration());
    const wasPlaying = this.state === 'playing';
    const loop = this.loopSel;
    // preserve selection-stop only if target is inside it
    const stopAt = this.stopAtMs !== null && target < this.stopAtMs ? this.stopAtMs : null;
    if (wasPlaying) {
      this.loopSel = loop;
      this.startSource(target, stopAt);
      if (this.onTick) this.onTick(Math.round(target));
    } else {
      this.pausedMs = target;
      if (this.onTick) this.onTick(Math.round(target));
    }
  }

  dispose(): void {
    this.teardownSource();
    this.buffer = null;
    this.state = 'empty';
  }
}

/** Singleton for the main workspace (simple apps need just one player). */
let shared: AudioEngine | null = null;
export function getSharedAudioEngine(): AudioEngine {
  if (!shared) shared = new AudioEngine();
  return shared;
}

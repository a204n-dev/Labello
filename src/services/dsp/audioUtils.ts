/**
 * Audio DSP & Web Audio Utilities
 */

let globalAudioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!globalAudioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    globalAudioCtx = new AudioContextClass();
  }
  if (globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume();
  }
  return globalAudioCtx;
}

/**
 * Decodes an ArrayBuffer or File into an AudioBuffer
 */
export async function decodeAudioData(data: ArrayBuffer): Promise<AudioBuffer> {
  const ctx = getAudioContext();
  // Decode copy of buffer to prevent detachment issues
  const bufferCopy = data.slice(0);
  return await ctx.decodeAudioData(bufferCopy);
}

/**
 * Generates an interleaved min-max peak array for fast waveform rendering
 */
export function extractPeaks(audioBuffer: AudioBuffer, targetPoints: number = 2000): Float32Array {
  const channelData = audioBuffer.getChannelData(0);
  const totalSamples = channelData.length;
  const blockSize = Math.max(1, Math.floor(totalSamples / targetPoints));
  const peaks = new Float32Array(targetPoints * 2);

  for (let i = 0; i < targetPoints; i++) {
    const start = i * blockSize;
    const end = Math.min(start + blockSize, totalSamples);
    let min = 1.0;
    let max = -1.0;

    for (let j = start; j < end; j++) {
      const val = channelData[j];
      if (val < min) min = val;
      if (val > max) max = val;
    }

    if (min > max) {
      min = 0;
      max = 0;
    }

    peaks[i * 2] = min;
    peaks[i * 2 + 1] = max;
  }

  return peaks;
}

/**
 * Finds the nearest zero-crossing point around a given sample position
 */
export function findNearestZeroCrossing(channelData: Float32Array, sampleIndex: number, searchRadius: number = 200): number {
  const minIdx = Math.max(0, sampleIndex - searchRadius);
  const maxIdx = Math.min(channelData.length - 2, sampleIndex + searchRadius);

  let bestIndex = sampleIndex;
  let minAbsVal = Math.abs(channelData[sampleIndex] || 0);

  for (let i = minIdx; i < maxIdx; i++) {
    // Check sign transition
    if ((channelData[i] <= 0 && channelData[i + 1] >= 0) || (channelData[i] >= 0 && channelData[i + 1] <= 0)) {
      return i;
    }
    const abs = Math.abs(channelData[i]);
    if (abs < minAbsVal) {
      minAbsVal = abs;
      bestIndex = i;
    }
  }

  return bestIndex;
}

/**
 * Audio playback controller using Web Audio API
 */
export class WorkstationAudioPlayer {
  private currentSource: AudioBufferSourceNode | null = null;
  private startTime: number = 0;
  private offsetTime: number = 0;
  private isPlayingState: boolean = false;
  private onTimeUpdateCallback: ((timeMs: number) => void) | null = null;
  private onEndedCallback: (() => void) | null = null;
  private animFrameId: number | null = null;
  private loopRange: { startMs: number; endMs: number } | null = null;

  public play(
    audioBuffer: AudioBuffer, 
    startOffsetMs: number = 0, 
    endLimitMs?: number, 
    onTimeUpdate?: (timeMs: number) => void,
    onEnded?: () => void
  ) {
    this.stop();
    const ctx = getAudioContext();

    this.currentSource = ctx.createBufferSource();
    this.currentSource.buffer = audioBuffer;
    this.currentSource.connect(ctx.destination);

    this.offsetTime = Math.max(0, startOffsetMs / 1000);
    const duration = endLimitMs ? Math.max(0, (endLimitMs - startOffsetMs) / 1000) : (audioBuffer.duration - this.offsetTime);

    this.startTime = ctx.currentTime;
    this.isPlayingState = true;
    this.onTimeUpdateCallback = onTimeUpdate || null;
    this.onEndedCallback = onEnded || null;

    if (duration > 0) {
      this.currentSource.start(0, this.offsetTime, duration);
    } else {
      this.currentSource.start(0, this.offsetTime);
    }

    this.currentSource.onended = () => {
      this.handlePlaybackEnded();
    };

    this.startTracking();
  }

  public stop() {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch {
        // Source might already be stopped
      }
      this.currentSource = null;
    }
    this.isPlayingState = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public isPlaying(): boolean {
    return this.isPlayingState;
  }

  private handlePlaybackEnded() {
    this.isPlayingState = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.onEndedCallback) {
      this.onEndedCallback();
    }
  }

  private startTracking() {
    const ctx = getAudioContext();
    const track = () => {
      if (!this.isPlayingState) return;
      const elapsed = ctx.currentTime - this.startTime;
      const currentMs = (this.offsetTime + elapsed) * 1000;
      if (this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(currentMs);
      }
      this.animFrameId = requestAnimationFrame(track);
    };
    this.animFrameId = requestAnimationFrame(track);
  }
}

/**
 * Creates synthetic representative vocal samples (WAV format AudioBuffers)
 * Enables immediate out-of-the-box exploration for Japanese CV voicebank & DiffSinger singing phrases.
 */
export function createSyntheticVocalBuffer(
  type: 'cv_ka' | 'cv_sa' | 'cv_ta' | 'cv_na' | 'diffsinger_phrase'
): AudioBuffer {
  const ctx = getAudioContext();
  const sampleRate = 44100;

  if (type === 'diffsinger_phrase') {
    // 3.2 seconds singing phrase: "a - i - sh - i - t - e - r - u" with melody F4 -> G4 -> A4 -> G4
    const duration = 3.2;
    const totalSamples = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, totalSamples, sampleRate);
    const data = buffer.getChannelData(0);

    const notes = [
      { start: 0.1, end: 0.8, freq: 349.23, phoneme: 'a' },     // F4
      { start: 0.85, end: 1.5, freq: 392.0, phoneme: 'i' },     // G4
      { start: 1.55, end: 2.3, freq: 440.0, phoneme: 'sh i' },  // A4
      { start: 2.35, end: 3.1, freq: 392.0, phoneme: 't e' },   // G4
    ];

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      let sample = 0;

      for (const note of notes) {
        if (t >= note.start && t < note.end) {
          const noteT = t - note.start;
          const noteLen = note.end - note.start;
          // Envelope: attack, sustain, decay
          const env = Math.min(1, noteT / 0.05) * Math.min(1, (noteLen - noteT) / 0.08);
          // Glottal harmonic waveform
          const f0 = note.freq;
          const harmonic1 = Math.sin(2 * Math.PI * f0 * t) * 0.45;
          const harmonic2 = Math.sin(2 * Math.PI * f0 * 2 * t) * 0.25;
          const harmonic3 = Math.sin(2 * Math.PI * f0 * 3 * t) * 0.15;
          const vibrato = Math.sin(2 * Math.PI * 5.5 * t) * (noteT > 0.3 ? 0.05 : 0);
          
          sample = (harmonic1 + harmonic2 + harmonic3 + vibrato) * env;
          break;
        }
      }

      // Add gentle acoustic background air noise (realistic vocal SNR)
      sample += (Math.random() - 0.5) * 0.005;
      data[i] = sample * 0.7;
    }
    return buffer;
  }

  // Japanese CV Samples (Duration ~1.2s)
  const duration = 1.2;
  const totalSamples = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(1, totalSamples, sampleRate);
  const data = buffer.getChannelData(0);

  // Define consonant onset timing & acoustic characteristics
  let onsetSec = 0.15;
  let vowelOnsetSec = 0.25;
  let vowelFreq = 261.63; // C4 (261.6Hz)

  if (type === 'cv_ka') {
    // [k a]: plosive burst at ~140ms, silence closure before burst, vowel [a] starts ~210ms
    onsetSec = 0.14;
    vowelOnsetSec = 0.22;
  } else if (type === 'cv_sa') {
    // [s a]: high-frequency fricative noise from 120ms to 240ms, vowel [a] starts ~240ms
    onsetSec = 0.12;
    vowelOnsetSec = 0.24;
  } else if (type === 'cv_ta') {
    // [t a]: plosive burst at ~160ms, vowel [a] starts ~230ms
    onsetSec = 0.16;
    vowelOnsetSec = 0.23;
  } else if (type === 'cv_na') {
    // [n a]: voiced nasal murmur from 130ms to 220ms, vowel [a] starts ~220ms
    onsetSec = 0.13;
    vowelOnsetSec = 0.22;
  }

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    // Consonant generation
    if (t >= onsetSec && t < vowelOnsetSec) {
      if (type === 'cv_ka' || type === 'cv_ta') {
        // Plosive burst: sharp noise spike followed by rapid aspiration
        const burstT = t - onsetSec;
        if (burstT < 0.02) {
          sample = (Math.random() - 0.5) * 0.6 * Math.exp(-burstT * 200);
        } else {
          sample = (Math.random() - 0.5) * 0.12 * Math.exp(-burstT * 50);
        }
      } else if (type === 'cv_sa') {
        // Fricative: continuous shaped white noise
        sample = (Math.random() - 0.5) * 0.35;
      } else if (type === 'cv_na') {
        // Nasal: low fundamental murmur
        sample = Math.sin(2 * Math.PI * 130 * t) * 0.25 + (Math.random() - 0.5) * 0.02;
      }
    }

    // Vowel generation (stable vowel resonance with natural release envelope)
    if (t >= vowelOnsetSec && t < 0.95) {
      const vowelT = t - vowelOnsetSec;
      const vowelLen = 0.95 - vowelOnsetSec;
      const attack = Math.min(1, vowelT / 0.04);
      const decay = Math.min(1, (vowelLen - vowelT) / 0.15);
      const env = attack * decay;

      // Vocal cords source: fundamental + formants (F1 ~800Hz, F2 ~1200Hz for [a])
      const h1 = Math.sin(2 * Math.PI * vowelFreq * t) * 0.5;
      const h2 = Math.sin(2 * Math.PI * vowelFreq * 2 * t) * 0.3;
      const f1 = Math.sin(2 * Math.PI * 800 * t) * 0.2;
      const f2 = Math.sin(2 * Math.PI * 1250 * t) * 0.12;

      sample += (h1 + h2 + f1 + f2) * env;
    }

    // Gentle floor noise
    sample += (Math.random() - 0.5) * 0.003;
    data[i] = sample * 0.65;
  }

  return buffer;
}

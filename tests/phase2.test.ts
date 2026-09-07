/**
 * Phase 2 tests — run with: npx tsx tests/phase2.test.ts
 * Covers: metadata extraction rules, duration/sample counts, waveform peaks,
 * time/sample conversion, selection math, project audio registration.
 * No GUI needed; pure-logic + synthetic buffers.
 */
import assert from 'node:assert';
import {
  samplesToMs,
  msToSamples,
  clampMs,
  normalizeSelection,
  formatTimecode,
} from '../src/services/audio/timeUtils';
import {
  detectFormatFromName,
  isSupportedAudioFile,
  validateAudioFile,
} from '../src/services/audio/audioMetadata';
import { matchReimportedFile } from '../src/services/audio/projectStore';
import { extractPeaks } from '../src/services/dsp/audioUtils';

let passed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  PASS ${name}`);
  } catch (err) {
    console.error(`  FAIL ${name}`, err);
    process.exitCode = 1;
  }
}

// --- Time/sample conversion ---
check('samplesToMs: 44100 samples @44100Hz = 1000ms', () => {
  assert.strictEqual(samplesToMs(44100, 44100), 1000);
});
check('msToSamples: 1000ms @44100Hz = 44100', () => {
  assert.strictEqual(msToSamples(1000, 44100), 44100);
});
check('round-trip 1234ms @48000Hz stays within 1 sample', () => {
  const sr = 48000;
  const s = msToSamples(1234, sr);
  const back = samplesToMs(s, sr);
  assert.ok(Math.abs(back - 1234) < 1000 / sr + 0.001);
});
check('different sample rates give different counts', () => {
  assert.ok(msToSamples(1000, 48000) > msToSamples(1000, 22050));
});
check('clampMs keeps range', () => {
  assert.strictEqual(clampMs(-5, 1000), 0);
  assert.strictEqual(clampMs(5000, 1000), 1000);
  assert.strictEqual(clampMs(250, 1000), 250);
});
check('formatTimecode 00:01.234', () => {
  assert.strictEqual(formatTimecode(1234), '00:01.234');
  assert.strictEqual(formatTimecode(795), '00:00.795');
});

// --- Selection calculations ---
check('normalizeSelection orders + clamps', () => {
  const s = normalizeSelection(2035, 1240, 10000);
  assert.deepStrictEqual(s, { startMs: 1240, endMs: 2035, durationMs: 795 });
});
check('normalizeSelection clamps to duration', () => {
  const s = normalizeSelection(-100, 99999, 5000);
  assert.deepStrictEqual(s, { startMs: 0, endMs: 5000, durationMs: 5000 });
});

// --- Metadata / validation ---
check('detectFormat WAV/FLAC/MP3/OGG', () => {
  assert.strictEqual(detectFormatFromName('ka.wav'), 'WAV');
  assert.strictEqual(detectFormatFromName('song.FLAC'), 'FLAC');
  assert.strictEqual(detectFormatFromName('v.mp3'), 'MP3');
  assert.strictEqual(detectFormatFromName('v.ogg'), 'OGG');
  assert.strictEqual(detectFormatFromName('notes.txt'), 'UNKNOWN');
});
check('isSupportedAudioFile accepts wav/flac/mp3/ogg', () => {
  assert.ok(isSupportedAudioFile('a.wav'));
  assert.ok(isSupportedAudioFile('a.flac'));
  assert.ok(isSupportedAudioFile('a.mp3'));
  assert.ok(isSupportedAudioFile('a.ogg'));
  assert.ok(!isSupportedAudioFile('a.txt'));
});
function fakeFile(name: string, size: number, type = ''): File {
  return { name, size, type } as unknown as File;
}
check('validate: missing file fails friendly', () => {
  const r = validateAudioFile(null);
  assert.strictEqual(r.ok, false);
  assert.ok((r.friendlyMessage || '').length > 5);
});
check('validate: empty file fails', () => {
  assert.strictEqual(validateAudioFile(fakeFile('a.wav', 0)).ok, false);
});
check('validate: unsupported fails', () => {
  assert.strictEqual(validateAudioFile(fakeFile('notes.txt', 100)).ok, false);
});
check('validate: wav passes', () => {
  assert.strictEqual(validateAudioFile(fakeFile('ka.wav', 44100, 'audio/wav')).ok, true);
});

// --- Waveform generation (synthetic stereo/mono/short/long) ---
function fakeAudioBuffer(numSamples: number, sampleRate: number, channels: number): AudioBuffer {
  const data: Float32Array[] = [];
  for (let c = 0; c < channels; c++) {
    const arr = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) arr[i] = Math.sin((i / sampleRate) * 440 * 2 * Math.PI) * 0.5;
    data.push(arr);
  }
  return {
    sampleRate,
    length: numSamples,
    duration: numSamples / sampleRate,
    numberOfChannels: channels,
    getChannelData: (c: number) => data[Math.min(c, data.length - 1)],
  } as unknown as AudioBuffer;
}
check('extractPeaks: output length = points*2, mono short', () => {
  const buf = fakeAudioBuffer(4410, 44100, 1); // 0.1s very short
  const peaks = extractPeaks(buf, 200);
  assert.strictEqual(peaks.length, 400);
});
check('extractPeaks: stereo uses ch0, long file downsampled', () => {
  const buf = fakeAudioBuffer(44100 * 10, 44100, 2); // 10s long stereo
  const peaks = extractPeaks(buf, 1200);
  assert.strictEqual(peaks.length, 2400);
  // peaks should contain real min/max spread for a sine wave
  let maxAbs = 0;
  for (let i = 0; i < peaks.length; i++) maxAbs = Math.max(maxAbs, Math.abs(peaks[i]));
  assert.ok(maxAbs > 0.3, `expected visible waveform, got ${maxAbs}`);
});
check('duration math: samples/rate', () => {
  const buf = fakeAudioBuffer(48000, 48000, 1);
  assert.strictEqual(Math.round(buf.duration * 1000), 1000);
});

// --- Project audio registration ---
check('matchReimportedFile exact/moved/changed', () => {
  const entry = {
    id: 'x', fileName: 'ka.wav', filePath: 'ka.wav', fileHash: 'h1',
    metadata: { fileName: 'ka.wav', fullPath: 'ka.wav', durationMs: 1000, sampleRate: 44100, channels: 1, bitDepth: 16, format: 'WAV', numSamples: 44100, sizeBytes: 88200, fileHash: 'h1' },
    status: 'pending', aliasOrLyrics: 'ka', addedAt: 0,
  } as never;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m = matchReimportedFile as any;
  assert.strictEqual(m(entry, 'ka.wav', 'h1', 88200), 'exact');
  assert.strictEqual(m(entry, 'ka_renamed.wav', 'h1', 999), 'moved_or_renamed');
  assert.strictEqual(m(entry, 'ka.wav', 'different', 123), 'changed');
});

console.log(`\nPhase 2 tests: ${passed} passed${process.exitCode ? ' (WITH FAILURES)' : ''}`);

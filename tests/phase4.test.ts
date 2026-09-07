/**
 * Phase 4 tests — Reclist parser + WAV/alias/OTO matching
 * Run: npx tsx tests/phase4.test.ts
 */

import assert from 'node:assert';
import {
  parseReclist,
  decodeReclistContent,
  matchAll,
  formatMatchReport,
  exportMatchCsv,
  fuzzyScore,
  generateCandidates,
} from '../src/services/reclist/reclistParser';
import { AudioFileItem, ParsedOtoEntry } from '../src/types/workstation';

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

// --- Parser tests ---
check('parseReclist: basic one per line', () => {
  const text = 'a\ni\nu\ne\no\nka\nki\nku\nke\nko\n';
  const buf = new TextEncoder().encode(text);
  const result = parseReclist(buf);
  assert.strictEqual(result.errors.length, 0);
  assert.strictEqual(result.entries.length, 10);
  assert.strictEqual(result.entries[0].alias, 'a');
  assert.strictEqual(result.entries[5].alias, 'ka');
});

check('parseReclist: ignores comments and blanks', () => {
  const text = '# comment\n\na\n; another\nka\n';
  const buf = new TextEncoder().encode(text);
  const result = parseReclist(buf);
  assert.strictEqual(result.entries.length, 2);
});

check('parseReclist: alias with phoneme', () => {
  const text = 'ka k a\nki k i\n';
  const buf = new TextEncoder().encode(text);
  const result = parseReclist(buf);
  assert.strictEqual(result.entries[0].alias, 'ka');
  assert.strictEqual(result.entries[0].phoneme, 'k a');
});

check('parseReclist: filename-style entries', () => {
  const text = 'ka.wav\nki.wav\n';
  const buf = new TextEncoder().encode(text);
  const result = parseReclist(buf);
  assert.strictEqual(result.entries[0].alias, 'ka');
  assert.strictEqual(result.entries[0].expectedFileName, 'ka.wav');
});

check('decodeReclistContent: UTF-8 BOM', () => {
  const text = 'a\nka\n';
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const buf = new Uint8Array(bom.length + bytes.length);
  buf.set(bom, 0);
  buf.set(bytes, bom.length);
  const { text: decoded, encoding } = decodeReclistContent(buf);
  assert.strictEqual(encoding, 'UTF-8-BOM');
  assert.ok(decoded.includes('a'));
});

// --- Matching helpers ---
check('fuzzyScore: exact match = 100', () => {
  assert.strictEqual(fuzzyScore('ka', 'ka'), 100);
  assert.strictEqual(fuzzyScore('KA', 'ka'), 100);
});

check('fuzzyScore: substring = 85', () => {
  assert.ok(fuzzyScore('ka', 'a_ka') >= 80);
});

check('fuzzyScore: similar strings', () => {
  const s = fuzzyScore('ka', 'k a');
  assert.ok(s >= 60 && s <= 90);
});

check('generateCandidates: produces expected variants', () => {
  const cands = generateCandidates('ka', 'singer', 'mono');
  assert.ok(cands.includes('ka.wav'));
  assert.ok(cands.includes('singer_ka.wav'));
  assert.ok(cands.includes('ka_mono.wav'));
  assert.ok(cands.includes('KA.WAV'));
});

// --- Full matching ---
function makeAudio(name: string, alias?: string): AudioFileItem {
  return {
    id: `f_${name}`,
    name,
    sizeBytes: 1000,
    durationMs: 1000,
    sampleRate: 44100,
    channels: 1,
    audioBuffer: null as any,
    waveformPeaks: new Float32Array(),
    status: 'analyzed',
    confidence: 90,
    alias: alias || name.replace(/\.[^/.]+$/, ''),
    lyrics: '',
    issues: [],
    lastModified: Date.now(),
    userModified: false,
  };
}

function makeOto(fileName: string, alias: string): ParsedOtoEntry {
  return {
    fileName,
    alias,
    oto: { offsetMs: 100, overlapMs: 30, preutteranceMs: 80, fixedMs: 150, cutoffMs: -200 },
    rawLine: '',
    lineNumber: 1,
  };
}

check('matchAll: exact filename match', () => {
  const audio = [makeAudio('ka.wav', 'ka')];
  const reclist = [{ alias: 'ka', phoneme: 'k a', lineNumber: 1, rawLine: 'ka' }];
  const oto = [makeOto('ka.wav', 'ka')];
  const results = matchAll(audio, reclist, oto);
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].match, 'exact');
  assert.strictEqual(results[0].confidence, 100);
  assert.ok(results[0].audioFile);
  assert.ok(results[0].otoEntry);
});

check('matchAll: fuzzy alias match', () => {
  const audio = [makeAudio('singer_ka.wav', 'ka')];
  const reclist = [{ alias: 'ka', phoneme: 'k a', lineNumber: 1, rawLine: 'ka' }];
  const oto = [makeOto('singer_ka.wav', 'ka')];
  const results = matchAll(audio, reclist, oto, { prefix: 'singer' });
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].match, 'exact');
});

check('matchAll: missing WAV detected', () => {
  const audio: AudioFileItem[] = [];
  const reclist = [{ alias: 'ka', phoneme: 'k a', lineNumber: 1, rawLine: 'ka' }];
  const oto = [makeOto('ka.wav', 'ka')];
  const results = matchAll(audio, reclist, oto);
  assert.strictEqual(results[0].match, 'missing_wav');
  assert.ok(results[0].issues.some(i => i.includes('No matching WAV')));
});

check('matchAll: extra WAV not in reclist', () => {
  const audio = [makeAudio('extra.wav', 'extra')];
  const reclist = [{ alias: 'ka', phoneme: 'k a', lineNumber: 1, rawLine: 'ka' }];
  const oto: ParsedOtoEntry[] = [];
  const results = matchAll(audio, reclist, oto);
  assert.ok(results.some(r => r.match === 'missing_reclist'));
});

check('matchAll: missing OTO detected', () => {
  const audio = [makeAudio('ka.wav', 'ka')];
  const reclist = [{ alias: 'ka', phoneme: 'k a', lineNumber: 1, rawLine: 'ka' }];
  const oto: ParsedOtoEntry[] = [];
  const results = matchAll(audio, reclist, oto);
  assert.strictEqual(results[0].match, 'missing_oto');
});

check('matchAll: duplicate alias detected', () => {
  const audio = [makeAudio('ka.wav', 'ka'), makeAudio('ka2.wav', 'ka')];
  const reclist = [{ alias: 'ka', phoneme: 'k a', lineNumber: 1, rawLine: 'ka' }];
  const oto = [makeOto('ka.wav', 'ka')];
  const results = matchAll(audio, reclist, oto);
  assert.ok(results.some(r => r.match === 'duplicate'));
});

check('formatMatchReport: produces readable output', () => {
  const audio = [makeAudio('ka.wav', 'ka')];
  const reclist = [{ alias: 'ka', phoneme: 'k a', lineNumber: 1, rawLine: 'ka' }];
  const oto = [makeOto('ka.wav', 'ka')];
  const results = matchAll(audio, reclist, oto);
  const report = formatMatchReport(results);
  assert.ok(report.includes('Exact: 1'));
  assert.ok(report.includes('ka.wav'));
});

check('exportMatchCsv: valid CSV format', () => {
  const audio = [makeAudio('ka.wav', 'ka')];
  const reclist = [{ alias: 'ka', phoneme: 'k a', lineNumber: 1, rawLine: 'ka' }];
  const oto = [makeOto('ka.wav', 'ka')];
  const results = matchAll(audio, reclist, oto);
  const csv = exportMatchCsv(results);
  const lines = csv.trim().split('\n');
  assert.strictEqual(lines[0], 'FileName,Alias,MatchType,Confidence,Issues,HasWAV,HasReclist,HasOTO');
  assert.ok(lines[1].includes('ka.wav'));
  assert.ok(lines[1].includes('exact'));
});

console.log(`\nPhase 4 tests: ${passed} passed${process.exitCode ? ' (WITH FAILURES)' : ''}`);
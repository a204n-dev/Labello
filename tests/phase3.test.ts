/**
 * Phase 3 tests — OTO parser/generator/validator/updater
 * Run: npx tsx tests/phase3.test.ts
 */

import assert from 'node:assert';
import {
  parseOtoIni,
  encodeOtoContent,
} from '../src/services/oto/otoParser';
import {
  generateOtoFromFeatures,
  generateOtoBatch,
} from '../src/services/oto/otoGenerator';
import {
  validateOto,
  validateOtoBatch,
  formatValidationReport,
} from '../src/services/oto/otoValidator';
import {
  compareOto,
  applyOtoChanges,
  formatComparisonTable,
  compareBatch,
} from '../src/services/oto/otoUpdater';
import { AcousticFeatures } from '../src/services/dsp/spectralAnalysis';

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

// ---- Sample acoustic features for testing ----
function makeFeatures(overrides: Partial<AcousticFeatures> = {}): AcousticFeatures {
  const frames = 100;
  return {
    timeStepMs: 5,
    durationMs: 500,
    hasSignal: true,
    consonantOnsetCandidateMs: 120,
    vowelOnsetCandidateMs: 220,
    decayOffsetCandidateMs: 950,
    silenceThreshold: 0.05,
    f0Contour: new Float32Array(frames).fill(220),
    rmsEnergy: new Float32Array(frames).fill(0.5),
    zeroCrossingRate: new Float32Array(frames).fill(0.1),
    spectralCentroid: new Float32Array(frames).fill(2000),
    ...overrides,
  };
}

// --- Parser tests ---
check('parseOtoIni: basic valid line', () => {
  const content = 'ka.wav=ka,100,150,-200,80,30\r\n';
  const buf = new TextEncoder().encode(content);
  const result = parseOtoIni(buf);
  assert.strictEqual(result.errors.length, 0);
  assert.strictEqual(result.entries.length, 1);
  assert.strictEqual(result.entries[0].fileName, 'ka.wav');
  assert.strictEqual(result.entries[0].alias, 'ka');
  assert.strictEqual(result.entries[0].oto.offsetMs, 100);
  assert.strictEqual(result.entries[0].oto.fixedMs, 150);
  assert.strictEqual(result.entries[0].oto.cutoffMs, -200);
  assert.strictEqual(result.entries[0].oto.preutteranceMs, 80);
  assert.strictEqual(result.entries[0].oto.overlapMs, 30);
});

check('parseOtoIni: ignores comments and blank lines', () => {
  const content = '# comment\r\n\r\nka.wav=ka,100,150,-200,80,30\r\n# another\n';
  const buf = new TextEncoder().encode(content);
  const result = parseOtoIni(buf);
  assert.strictEqual(result.entries.length, 1);
  assert.strictEqual(result.warnings.length, 0);
});

check('parseOtoIni: malformed line produces warning', () => {
  const content = 'bad line without equals\r\nka.wav=ka,100,150,-200,80,30\r\n';
  const buf = new TextEncoder().encode(content);
  const result = parseOtoIni(buf);
  assert.strictEqual(result.entries.length, 1);
  assert.ok(result.warnings.length >= 1);
});

check('parseOtoIni: UTF-8 BOM handled', () => {
  const text = 'ka.wav=ka,100,150,-200,80,30\n';
  const encoder = new TextEncoder();
  const textBytes = encoder.encode(text);
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const buf = new Uint8Array(bom.length + textBytes.length);
  buf.set(bom, 0);
  buf.set(textBytes, bom.length);
  const result = parseOtoIni(buf);
  assert.strictEqual(result.encoding, 'UTF-8-BOM');
  assert.strictEqual(result.entries.length, 1);
});

check('encodeOtoContent: CRLF + UTF-8-BOM', () => {
  const content = 'ka.wav=ka,100,150,-200,80,30\n';
  const buf = encodeOtoContent(content, 'UTF-8-BOM', 'CRLF');
  assert.strictEqual(buf[0], 0xEF);
  assert.strictEqual(buf[1], 0xBB);
  assert.strictEqual(buf[2], 0xBF);
  const decoded = new TextDecoder('utf-8').decode(buf);
  assert.ok(decoded.includes('\r\n'));
});

// --- Generator tests ---
check('generateOtoFromFeatures: CV profile produces sensible values', () => {
  const features = makeFeatures();
  const oto = generateOtoFromFeatures(features, { profile: 'CV' });
  assert.ok(oto.offsetMs >= 0);
  assert.ok(oto.preutteranceMs > 0);
  assert.ok(oto.overlapMs >= 0);
  assert.ok(oto.fixedMs >= oto.preutteranceMs);
  assert.ok(oto.cutoffMs <= 0);
});

check('generateOtoFromFeatures: VCV increases overlap', () => {
  const features = makeFeatures();
  const cv = generateOtoFromFeatures(features, { profile: 'CV' });
  const vcv = generateOtoFromFeatures(features, { profile: 'VCV' });
  assert.ok(vcv.overlapMs > cv.overlapMs);
});

check('generateOtoFromFeatures: overlapMs override works', () => {
  const features = makeFeatures();
  const oto = generateOtoFromFeatures(features, { profile: 'CV', overlapMs: 99 });
  assert.strictEqual(oto.overlapMs, 99);
});

check('generateOtoBatch: returns Map with all files', () => {
  const features = makeFeatures();
  const items = [
    { fileName: 'ka.wav', features, profile: 'CV' as const },
    { fileName: 'sa.wav', features, profile: 'CV' as const },
  ];
  const map = generateOtoBatch(items);
  assert.strictEqual(map.size, 2);
  assert.ok(map.has('ka.wav'));
  assert.ok(map.has('sa.wav'));
});

// --- Validator tests ---
check('validateOto: valid CV oto passes', () => {
  const oto = { offsetMs: 100, overlapMs: 30, preutteranceMs: 80, fixedMs: 150, cutoffMs: -200 };
  const r = validateOto(oto, 1000);
  assert.strictEqual(r.isValid, true);
  assert.ok(r.score >= 80);
});

check('validateOto: negative offset fails', () => {
  const oto = { offsetMs: -10, overlapMs: 30, preutteranceMs: 80, fixedMs: 150, cutoffMs: -200 };
  const r = validateOto(oto, 1000);
  assert.strictEqual(r.isValid, false);
  assert.ok(r.issues.some(i => i.param === 'offsetMs' && i.severity === 'error'));
});

check('validateOto: zero preutterance fails', () => {
  const oto = { offsetMs: 100, overlapMs: 30, preutteranceMs: 0, fixedMs: 150, cutoffMs: -200 };
  const r = validateOto(oto, 1000);
  assert.strictEqual(r.isValid, false);
  assert.ok(r.issues.some(i => i.param === 'preutteranceMs' && i.severity === 'error'));
});

check('validateOto: positive cutoff warns', () => {
  const oto = { offsetMs: 100, overlapMs: 30, preutteranceMs: 80, fixedMs: 150, cutoffMs: 200 };
  const r = validateOto(oto, 1000);
  assert.ok(r.issues.some(i => i.param === 'cutoffMs' && i.severity === 'warning'));
});

check('validateOto: cutoff before preutterance fails', () => {
  // cutoff -50 on 1000ms = usable end 950, preutterance at 180, but if cutoff is -900, usable end 100
  const oto = { offsetMs: 50, overlapMs: 30, preutteranceMs: 80, fixedMs: 150, cutoffMs: -900 };
  const r = validateOto(oto, 1000);
  assert.ok(r.issues.some(i => i.param === 'general' && i.severity === 'error'));
});

check('validateOtoBatch: summary counts correctly', () => {
  const entries = [
    { fileName: 'good.wav', oto: { offsetMs: 100, overlapMs: 30, preutteranceMs: 80, fixedMs: 150, cutoffMs: -200 }, durationMs: 1000 },
    { fileName: 'bad.wav', oto: { offsetMs: -10, overlapMs: 30, preutteranceMs: 80, fixedMs: 150, cutoffMs: -200 }, durationMs: 1000 },
  ];
  const { summary } = validateOtoBatch(entries);
  assert.strictEqual(summary.valid, 1);
  assert.strictEqual(summary.invalid, 1);
  assert.ok(summary.avgScore > 0 && summary.avgScore <= 100);
});

check('formatValidationReport: produces readable output', () => {
  const entries = [
    { fileName: 'bad.wav', oto: { offsetMs: -10, overlapMs: 30, preutteranceMs: 80, fixedMs: 150, cutoffMs: -200 }, durationMs: 1000 },
  ];
  const result = validateOtoBatch(entries);
  const report = formatValidationReport(result);
  assert.ok(report.includes('bad.wav'));
  assert.ok(report.includes('ERROR'));
});

// --- Updater/Comparison tests ---
check('compareOto: detect changes between base and generated', () => {
  const base = { offsetMs: 100, overlapMs: 30, preutteranceMs: 80, fixedMs: 150, cutoffMs: -200 };
  const generated = { offsetMs: 110, overlapMs: 35, preutteranceMs: 85, fixedMs: 155, cutoffMs: -210 };
  const cmp = compareOto(base, generated, 'ka', 'ka.wav', 1000);
  assert.strictEqual(cmp.changes.length, 5);
  assert.strictEqual(cmp.changes[0].param, 'offsetMs');
  assert.strictEqual(cmp.changes[0].oldValue, 100);
  assert.strictEqual(cmp.changes[0].newValue, 110);
  assert.strictEqual(cmp.changes[0].delta, 10);
});

check('compareOto: no base = all new', () => {
  const generated = { offsetMs: 100, overlapMs: 30, preutteranceMs: 80, fixedMs: 150, cutoffMs: -200 };
  const cmp = compareOto(null, generated, 'ka', 'ka.wav', 1000);
  assert.strictEqual(cmp.changes.length, 5);
  assert.ok(cmp.changes.every(c => c.oldValue === 0));
});

check('applyOtoChanges: generate mode applies all', () => {
  const base = { offsetMs: 100, overlapMs: 30, preutteranceMs: 80, fixedMs: 150, cutoffMs: -200 };
  const generated = { offsetMs: 110, overlapMs: 35, preutteranceMs: 85, fixedMs: 155, cutoffMs: -210 };
  const cmp = compareOto(base, generated, 'ka', 'ka.wav', 1000);
  const applied = applyOtoChanges(cmp, { mode: 'generate' });
  assert.strictEqual(applied.offsetMs, 110);
  assert.strictEqual(applied.overlapMs, 35);
});

check('applyOtoChanges: update mode applies only accepted', () => {
  const base = { offsetMs: 100, overlapMs: 30, preutteranceMs: 80, fixedMs: 150, cutoffMs: -200 };
  const generated = { offsetMs: 110, overlapMs: 35, preutteranceMs: 85, fixedMs: 155, cutoffMs: -210 };
  const cmp = compareOto(base, generated, 'ka', 'ka.wav', 1000);
  const applied = applyOtoChanges(cmp, { mode: 'update' }, new Set(['offsetMs']));
  assert.strictEqual(applied.offsetMs, 110); // accepted
  assert.strictEqual(applied.overlapMs, 30); // kept base
});

check('applyOtoChanges: hybrid mode uses threshold', () => {
  const base = { offsetMs: 100, overlapMs: 30, preutteranceMs: 80, fixedMs: 150, cutoffMs: -200 };
  const generated = { offsetMs: 110, overlapMs: 35, preutteranceMs: 85, fixedMs: 155, cutoffMs: -210 };
  const cmp = compareOto(base, generated, 'ka', 'ka.wav', 1000);
  // High confidence changes (all > 75 in our mock) should apply
  const applied = applyOtoChanges(cmp, { mode: 'hybrid', hybridConfidenceThreshold: 75 });
  assert.strictEqual(applied.offsetMs, 110);
});

check('applyOtoChanges: explicit rejection overrides hybrid threshold', () => {
  const base = { offsetMs: 100, overlapMs: 30, preutteranceMs: 80, fixedMs: 150, cutoffMs: -200 };
  const generated = { offsetMs: 110, overlapMs: 35, preutteranceMs: 85, fixedMs: 155, cutoffMs: -210 };
  const cmp = compareOto(base, generated, 'ka', 'ka.wav', 1000);
  const applied = applyOtoChanges(cmp, { mode: 'hybrid', hybridConfidenceThreshold: 75 }, new Set());
  assert.deepStrictEqual(applied, base);
});

check('formatComparisonTable: readable lines', () => {
  const base = { offsetMs: 100, overlapMs: 30, preutteranceMs: 80, fixedMs: 150, cutoffMs: -200 };
  const generated = { offsetMs: 110, overlapMs: 35, preutteranceMs: 85, fixedMs: 155, cutoffMs: -210 };
  const cmp = compareOto(base, generated, 'ka', 'ka.wav', 1000);
  const lines = formatComparisonTable(cmp);
  assert.ok(lines[0].includes('ka.wav'));
  assert.ok(lines.some(l => l.includes('offsetMs')));
});

check('compareBatch: matches base + generated by filename', () => {
  const baseEntries = [
    { fileName: 'ka.wav', alias: 'ka', oto: { offsetMs: 100, overlapMs: 30, preutteranceMs: 80, fixedMs: 150, cutoffMs: -200 }, rawLine: '', lineNumber: 1 },
    { fileName: 'sa.wav', alias: 'sa', oto: { offsetMs: 110, overlapMs: 35, preutteranceMs: 90, fixedMs: 160, cutoffMs: -210 }, rawLine: '', lineNumber: 2 },
  ];
  const generatedMap = new Map([
    ['ka.wav', { offsetMs: 105, overlapMs: 32, preutteranceMs: 82, fixedMs: 152, cutoffMs: -205 }],
    ['sa.wav', { offsetMs: 112, overlapMs: 37, preutteranceMs: 92, fixedMs: 162, cutoffMs: -212 }],
    ['ta.wav', { offsetMs: 120, overlapMs: 33, preutteranceMs: 88, fixedMs: 158, cutoffMs: -215 }], // no base
  ]);
  const aliasMap = new Map([['ka.wav', 'ka'], ['sa.wav', 'sa'], ['ta.wav', 'ta']]);
  const durations = new Map([['ka.wav', 1000], ['sa.wav', 1000], ['ta.wav', 1000]]);
  const confidenceMap = new Map([['ka.wav', 60]]);

  const results = compareBatch(baseEntries, generatedMap, aliasMap, durations, confidenceMap);
  assert.strictEqual(results.length, 3); // 2 matched + 1 new
  assert.ok(results.some(r => r.fileName === 'ta.wav'));
  const kaComparison = results.find(r => r.fileName === 'ka.wav');
  assert.ok(kaComparison);
  assert.ok(kaComparison.changes.every(change => change.confidence <= 60));
});

console.log(`\nPhase 3 tests: ${passed} passed${process.exitCode ? ' (WITH FAILURES)' : ''}`);
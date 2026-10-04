import assert from 'node:assert/strict';
import type { AudioFileItem } from '../src/types/workstation';
import { exportLabText, exportTextGrid } from '../src/services/diffsinger/diffsingerExporter';
import {
  exportAudacityLabels,
  importDatasetLabelFiles,
  parseDatasetLabels,
} from '../src/services/diffsinger/datasetLabelFormats';
import { validateDatasetHealth } from '../src/services/diffsinger/datasetValidator';

function audioFile(name: string, durationMs = 1000): AudioFileItem {
  return {
    id: name,
    name,
    sizeBytes: 1000,
    durationMs,
    sampleRate: 44100,
    channels: 1,
    audioBuffer: {
      duration: durationMs / 1000,
      sampleRate: 44100,
      length: Math.round(durationMs * 44.1),
      numberOfChannels: 1,
      getChannelData: () => new Float32Array(Math.round(durationMs * 44.1)),
      copyFromChannel: () => undefined,
      copyToChannel: () => undefined,
    } as AudioBuffer,
    waveformPeaks: new Float32Array([0.1, 0.3]),
    status: 'pending',
    confidence: 0,
    issues: [],
    lastModified: 0,
    userModified: false,
  };
}

const file = audioFile('phrase.wav');
file.phonemes = [
  { id: 'one', phoneme: 'a', startMs: 0, endMs: 400, confidence: 90, status: 'high_confidence' },
  { id: 'two', phoneme: 'sh i', startMs: 400, endMs: 1000, confidence: 85, status: 'moderate' },
];

assert.equal(exportLabText(file, 'LF'), '0 4000000 a\n4000000 10000000 sh i\n');
assert.deepEqual(
  parseDatasetLabels(exportLabText(file, 'LF'), 'lab'),
  [
    { startMs: 0, endMs: 400, phoneme: 'a' },
    { startMs: 400, endMs: 1000, phoneme: 'sh i' },
  ],
);

assert.deepEqual(
  parseDatasetLabels(exportAudacityLabels(file), 'audacity'),
  [
    { startMs: 0, endMs: 400, phoneme: 'a' },
    { startMs: 400, endMs: 1000, phoneme: 'sh i' },
  ],
);

const textGrid = exportTextGrid(file);
assert.deepEqual(
  parseDatasetLabels(textGrid, 'textgrid'),
  [
    { startMs: 0, endMs: 400, phoneme: 'a' },
    { startMs: 400, endMs: 1000, phoneme: 'sh i' },
  ],
);

const multiTierTextGrid = `File type = "ooTextFile"
Object class = "TextGrid"

xmin = 0
xmax = 1
tiers? <exists>
size = 2
item []:
    item [1]:
        class = "IntervalTier"
        name = "words"
        xmin = 0
        xmax = 1
        intervals: size = 1
        intervals [1]:
            xmin = 0
            xmax = 1
            text = "hello"
    item [2]:
        class = "IntervalTier"
        name = "phones"
        xmin = 0
        xmax = 1
        intervals: size = 2
        intervals [1]:
            xmin = 0
            xmax = 0.5
            text = "h"
        intervals [2]:
            xmin = 0.5
            xmax = 1
            text = "ə"
`;
assert.deepEqual(parseDatasetLabels(multiTierTextGrid, 'textgrid'), [
  { startMs: 0, endMs: 500, phoneme: 'h' },
  { startMs: 500, endMs: 1000, phoneme: 'ə' },
]);

const imported = importDatasetLabelFiles([file], [{
  name: 'phrase.lab',
  text: '0 5000000 k\n5000000 10000000 a\n',
  format: 'lab',
}]);
assert.equal(imported.files[0].status, 'analyzed');
assert.equal(imported.files[0].confidence, 80);
assert.deepEqual(imported.files[0].phonemes?.map(phoneme => [phoneme.startMs, phoneme.endMs, phoneme.phoneme]), [
  [0, 500, 'k'],
  [500, 1000, 'a'],
]);
assert.deepEqual(imported.filesWithoutLabels, []);
assert.deepEqual(importDatasetLabelFiles([file], [{
  name: 'unmatched.lab',
  text: '0 10000000 a\n',
  format: 'lab',
}]).unmatchedLabelFiles, ['unmatched.lab']);

const duplicateNames = validateDatasetHealth([
  { ...audioFile('ka.wav'), alias: 'か' },
  { ...audioFile('ka.wav'), id: 'second', alias: 'か' },
], 'utau');
assert.ok(duplicateNames.issues.some(issue => issue.code === 'DUPLICATE_FILE'));
assert.ok(duplicateNames.issues.some(issue => issue.code === 'DUPLICATE_ALIAS'));

const silent = audioFile('silent.wav');
silent.waveformPeaks = new Float32Array([0, 0, 0, 0]);
const silentReport = validateDatasetHealth([silent], 'diffsinger');
assert.ok(silentReport.issues.some(issue => issue.code === 'SILENT_AUDIO'));
assert.ok(silentReport.issues.some(issue => issue.code === 'MISSING_PHONEMES'));

const clipped = audioFile('clipped.wav');
clipped.waveformPeaks = new Float32Array([0, 1, -1, 0]);
assert.ok(validateDatasetHealth([clipped], 'diffsinger').issues.some(issue => issue.code === 'AUDIO_CLIPPING'));

const missingBuffer = audioFile('missing.wav');
delete missingBuffer.audioBuffer;
assert.ok(validateDatasetHealth([missingBuffer], 'diffsinger').issues.some(issue => issue.code === 'MISSING_AUDIO'));

const orphaned = audioFile('orphaned.wav');
orphaned.phonemes = [{ id: 'outside', phoneme: 'a', startMs: 0, endMs: 1500, confidence: 80, status: 'moderate' }];
assert.ok(validateDatasetHealth([orphaned], 'diffsinger').issues.some(issue => issue.code === 'ORPHANED_PHONEME_BOUNDARY'));

console.log('Phase 7 tests: dataset label formats, safe import, and cleanup diagnostics passed');

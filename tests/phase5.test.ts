/**
 * Phase 5 tests — native-first analysis availability and manual-review confidence.
 * Run: npx tsx tests/phase5.test.ts
 */
import assert from 'node:assert/strict';
import { EngineCoordinator } from '../src/services/engines/engineCoordinator';
import { createOtoIniBlob } from '../src/services/oto/otoExporter';

function makeAudioBuffer(): AudioBuffer {
  const sampleRate = 16000;
  const samples = new Float32Array(8000);
  for (let i = 800; i < samples.length - 400; i++) {
    samples[i] = Math.sin((i / sampleRate) * 440 * 2 * Math.PI) * 0.35;
  }
  return {
    sampleRate,
    length: samples.length,
    duration: samples.length / sampleRate,
    numberOfChannels: 1,
    getChannelData: () => samples,
  } as unknown as AudioBuffer;
}

async function run() {
  const coordinator = new EngineCoordinator();
  const engines = coordinator.getAvailableEngines();
  assert.strictEqual(engines.find(engine => engine.id === 'acoustic_dsp')?.isAvailable, true);
  assert.strictEqual(engines.find(engine => engine.id === 'sofa_aligner')?.isAvailable, false);
  assert.strictEqual(engines.find(engine => engine.id === 'whisper_asr')?.isAvailable, false);
  assert.strictEqual(engines.find(engine => engine.id === 'mfa_aligner')?.isAvailable, false);

  const audio = makeAudioBuffer();
  const oto = await coordinator.runCrossVerification(audio, 'ka.wav', 'ka', 'utau');
  assert.ok(oto.verifiedOto);
  assert.ok(oto.overallConfidence < 70);
  assert.strictEqual(oto.agreementLevel, 'split');
  assert.ok(oto.conflicts.some(conflict => conflict.explanation.includes('single-engine')));

  const alignment = await coordinator.runCrossVerification(audio, 'phrase.wav', 'a i sh i', 'diffsinger');
  assert.strictEqual(alignment.verifiedPhonemes?.length, 4);
  assert.ok(alignment.verifiedPhonemes?.every(phoneme => phoneme.status === 'needs_review' && phoneme.confidence < 70));
  assert.strictEqual(alignment.conflicts.length, 4);

  assert.throws(
    () => createOtoIniBlob('ka.wav=ka,0,0,0,0,0', 'Shift-JIS'),
    /requires the native desktop application/
  );

  console.log('Phase 5 tests: native engine availability and conservative estimates passed');
}

run().catch(err => {
  console.error(err);
  process.exitCode = 1;
});

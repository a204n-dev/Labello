import assert from 'node:assert/strict';
import { analyzeAcousticFeatures } from '../src/services/dsp/spectralAnalysis';
import { AcousticEngine } from '../src/services/engines/acousticEngine';
import { generateOtoFromFeatures } from '../src/services/oto/otoGenerator';
import { JAPANESE_VOICEBANK_PROFILES } from '../src/services/oto/otoProfiles';
import { validateOto } from '../src/services/oto/otoValidator';

function makeBuffer(samples: Float32Array, sampleRate = 16000): AudioBuffer {
  return {
    sampleRate,
    length: samples.length,
    duration: samples.length / sampleRate,
    numberOfChannels: 1,
    getChannelData: () => samples,
  } as unknown as AudioBuffer;
}

async function run() {
  const sampleRate = 16000;
  const samples = new Float32Array(sampleRate);
  for (let i = 1600; i < 14400; i++) {
    samples[i] = Math.sin((i / sampleRate) * 440 * 2 * Math.PI) * 0.35;
  }
  const features = analyzeAcousticFeatures(makeBuffer(samples), 1024, 256, false);
  assert.equal(features.hasSignal, true);
  assert.ok(features.consonantOnsetCandidateMs >= 70 && features.consonantOnsetCandidateMs <= 120, `onset was ${features.consonantOnsetCandidateMs}ms`);
  assert.ok(features.decayOffsetCandidateMs >= 850 && features.decayOffsetCandidateMs <= 1000, `decay was ${features.decayOffsetCandidateMs}ms`);
  const centroid = features.spectralCentroid[Math.floor(500 / features.timeStepMs)];
  assert.ok(centroid >= 350 && centroid <= 550, `expected 440Hz spectral centroid, got ${centroid}`);

  const oto = generateOtoFromFeatures(features, { profile: 'CV' });
  assert.ok(validateOto(oto, features.durationMs).isValid);
  assert.deepEqual(
    JAPANESE_VOICEBANK_PROFILES.map(profile => profile.recordingStyle).sort(),
    ['CV', 'CVVC', 'VCV']
  );

  const vowelOnlySamples = new Float32Array(sampleRate / 2);
  for (let i = 0; i < vowelOnlySamples.length; i++) {
    vowelOnlySamples[i] = Math.sin((i / sampleRate) * 440 * 2 * Math.PI) * 0.25;
  }
  const vowelOnlyFeatures = analyzeAcousticFeatures(makeBuffer(vowelOnlySamples), 1024, 256, false);
  assert.equal(vowelOnlyFeatures.consonantOnsetCandidateMs, 0);
  assert.equal(vowelOnlyFeatures.vowelOnsetCandidateMs, 0);

  const shortBuffer = makeBuffer(new Float32Array(200).fill(0.2));
  assert.equal(analyzeAcousticFeatures(shortBuffer, 1024, 256, false).hasSignal, true);

  const silentBuffer = makeBuffer(new Float32Array(200));
  const silent = analyzeAcousticFeatures(silentBuffer, 1024, 256, false);
  assert.equal(silent.hasSignal, false);
  const silentResult = await new AcousticEngine().analyzeAudio(silentBuffer, 'silent.wav', 'a', { mode: 'utau' });
  assert.equal(silentResult.isSuccessful, false);
  assert.equal(silentResult.otoParameters, undefined);

  const engine = new AcousticEngine();
  const cv = await engine.analyzeAudio(makeBuffer(samples), 'ka.wav', 'ka', { mode: 'utau', profileId: 'japanese_cv' });
  const vcv = await engine.analyzeAudio(makeBuffer(samples), 'a_ka.wav', 'a ka', { mode: 'utau', profileId: 'japanese_vcv' });
  const cvvc = await engine.analyzeAudio(makeBuffer(samples), 'ka_a_k.wav', 'ka a k', { mode: 'utau', profileId: 'japanese_cvvc' });
  assert.ok(cv.otoParameters && cvvc.otoParameters && vcv.otoParameters);
  assert.ok(cvvc.otoParameters!.overlapMs < cv.otoParameters!.overlapMs);
  assert.ok(vcv.otoParameters!.overlapMs > cv.otoParameters!.overlapMs);

  console.log('Phase 6 tests: robust UTAU acoustic boundaries and profile-aware OTO estimates passed');
}

run().catch(err => {
  console.error(err);
  process.exitCode = 1;
});

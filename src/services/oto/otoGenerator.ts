/**
 * Phase 3 — OTO Generator.
 * Produces UTAU OTO parameters from acoustic features.
 * Pure logic, no UI dependencies.
 */

import { OtoParameters } from '../../types/workstation';
import { AcousticFeatures } from '../dsp/spectralAnalysis';

export interface GeneratorOptions {
  profile: 'CV' | 'VCV' | 'CVVC' | 'ARPAsing';
  /** Safety margin before detected onset (ms) */
  onsetMarginMs?: number;
  /** Override automatic overlap calculation */
  overlapMs?: number;
}

const DEFAULTS: Required<GeneratorOptions> = {
  profile: 'CV',
  onsetMarginMs: 5,
  overlapMs: undefined,
};

/**
 * Estimate OTO parameters from acoustic features.
 * Input: features extracted by analyzeAcousticFeatures()
 * Output: OtoParameters ready for export.
 */
export function generateOtoFromFeatures(
  features: AcousticFeatures,
  options: GeneratorOptions = { profile: 'CV' }
): OtoParameters {
  const opts = { ...DEFAULTS, ...options };

  // Offset: consonant onset with small safety margin
  const offsetMs = Math.max(0, Math.round(features.consonantOnsetCandidateMs - opts.onsetMarginMs));

  // Preutterance: vowel onset (where periodic pitch + energy stabilize)
  const preutteranceMs = Math.max(5, Math.round(features.vowelOnsetCandidateMs - features.consonantOnsetCandidateMs));

  // Overlap: profile-dependent, or use provided override
  let overlapMs: number;
  if (opts.overlapMs !== undefined) {
    overlapMs = opts.overlapMs;
  } else {
    overlapMs = estimateOverlapFromProfile(opts.profile, features);
  }

  // Fixed: slightly past preutterance to protect consonant during resampling
  const fixedMs = Math.round(preutteranceMs * 1.2 + overlapMs * 0.5);

  // Cutoff: negative from end, where vowel energy decays below threshold
  const totalDurationMs = Math.round(features.rmsEnergy.length * features.timeStepMs);
  const cutoffMs = -Math.round(Math.max(50, totalDurationMs - features.decayOffsetCandidateMs));

  return {
    offsetMs,
    overlapMs,
    preutteranceMs,
    fixedMs,
    cutoffMs,
  };
}

/** Heuristic overlap per voicebank profile. */
function estimateOverlapFromProfile(profile: GeneratorOptions['profile'], features: AcousticFeatures): number {
  // Base overlap on consonant type detected from spectral centroid/ZCR at onset
  const onsetFrame = Math.floor(features.consonantOnsetCandidateMs / features.timeStepMs);
  const centroidAtOnset = features.spectralCentroid[Math.min(onsetFrame, features.spectralCentroid.length - 1)];
  const zcrAtOnset = features.zeroCrossingRate[Math.min(onsetFrame, features.zeroCrossingRate.length - 1)];

  // High centroid + high ZCR = voiceless fricative (s, sh) → longer overlap
  // Low centroid + low ZCR = vowel-like (n, m) → shorter
  // Mid = plosive (k, t, p) → medium
  let baseOverlap = 40; // default middle ground

  if (centroidAtOnset > 3000 && zcrAtOnset > 0.3) {
    baseOverlap = 50; // fricative
  } else if (centroidAtOnset < 1500 && zcrAtOnset < 0.15) {
    baseOverlap = 30; // nasal/voiced
  } else {
    baseOverlap = 35; // plosive
  }

  // Profile adjustments
  switch (profile) {
    case 'VCV':
      return Math.round(baseOverlap * 1.3); // continuous needs more
    case 'CVVC':
      return Math.round(baseOverlap * 0.9);
    case 'ARPAsing':
      return Math.round(baseOverlap * 1.0);
    default:
      return baseOverlap;
  }
}

/**
 * Generate OTO for multiple files from their analysis results.
 * Called by batch processing.
 */
export function generateOtoBatch(
  items: Array<{ fileName: string; features: AcousticFeatures; profile: GeneratorOptions['profile'] }>
): Map<string, OtoParameters> {
  const results = new Map<string, OtoParameters>();
  for (const item of items) {
    const oto = generateOtoFromFeatures(item.features, { profile: item.profile });
    results.set(item.fileName, oto);
  }
  return results;
}
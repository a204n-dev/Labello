import { IAnalysisEngine, CrossVerificationResult } from "./engineInterface";
import { AcousticEngine } from "./acousticEngine";
import { SofaEngine } from "./sofaEngine";
import { WhisperEngine } from "./whisperEngine";
import { MfaEngine } from "./mfaEngine";
import { PitchEngine } from "./pitchEngine";
import { OtoParameters, DiffSingerPhoneme, EngineStatus } from "../../types/workstation";

export class EngineCoordinator {
  private engines: Map<string, IAnalysisEngine> = new Map();

  constructor() {
    this.registerEngine(new AcousticEngine());
    this.registerEngine(new SofaEngine());
    this.registerEngine(new WhisperEngine());
    this.registerEngine(new MfaEngine());
    this.registerEngine(new PitchEngine());
  }

  public registerEngine(engine: IAnalysisEngine) {
    this.engines.set(engine.id, engine);
  }

  public getAvailableEngines(): EngineStatus[] {
    return Array.from(this.engines.values()).map(e => ({
      id: e.id,
      name: e.name,
      version: e.version,
      type: e.isLocal ? 'local_model' : 'online_fallback',
      isInstalled: e.isInstalled,
      isAvailable: e.isInstalled,
      description: `Analysis engine with confidence weight ${(e.defaultWeight * 100).toFixed(0)}%`,
      confidenceWeight: e.defaultWeight,
    }));
  }

  public async runCrossVerification(
    audioBuffer: AudioBuffer,
    fileName: string,
    aliasOrLyrics: string,
    mode: 'utau' | 'diffsinger',
    options?: {
      enabledEngineIds?: string[];
      onlineFallback?: boolean;
      profileId?: string;
    }
  ): Promise<CrossVerificationResult> {
    const enabledIds = options?.enabledEngineIds || ['acoustic_dsp', 'sofa_aligner', 'whisper_asr', 'mfa_aligner'];
    const activeEngines = enabledIds
      .map(id => this.engines.get(id))
      .filter((e): e is IAnalysisEngine => !!e && e.isInstalled);

    if (activeEngines.length === 0) {
      // Fallback to acoustic DSP if none selected
      const dsp = this.engines.get('acoustic_dsp')!;
      activeEngines.push(dsp);
    }

    // Execute engines in parallel
    const enginePromises = activeEngines.map(engine => 
      engine.analyzeAudio(audioBuffer, fileName, aliasOrLyrics, { mode, profileId: options?.profileId })
        .catch(err => ({
          engineId: engine.id,
          engineName: engine.name,
          isSuccessful: false,
          confidence: 0,
          diagnosticNotes: `Error: ${err instanceof Error ? err.message : 'Engine failure'}`,
          latencyMs: 0,
        }))
    );

    const results = await Promise.all(enginePromises);
    const successfulResults = results.filter(r => r.isSuccessful);

    if (mode === 'utau') {
      return this.verifyUtauResults(successfulResults, aliasOrLyrics);
    } else {
      return this.verifyDiffSingerResults(successfulResults, aliasOrLyrics);
    }
  }

  private verifyUtauResults(
    results: Array<{ engineId: string; confidence: number; otoParameters?: OtoParameters; diagnosticNotes?: string }>,
    alias: string
  ): CrossVerificationResult {
    const conflicts: CrossVerificationResult['conflicts'] = [];

    if (results.length === 0) {
      return {
        overallConfidence: 40,
        agreementLevel: 'conflicted',
        conflicts: [{
          regionIndex: 0,
          phonemeOrParam: 'all',
          engineVotes: {},
          maxBoundaryDeltaMs: 0,
          explanation: 'No analysis engines returned valid acoustic boundaries.',
        }],
      };
    }

    const otoResults = results.filter((result): result is typeof result & { otoParameters: OtoParameters } => !!result.otoParameters);
    if (otoResults.length === 0) {
      return {
        overallConfidence: 0,
        agreementLevel: 'conflicted',
        conflicts: [{
          regionIndex: 0,
          phonemeOrParam: 'all',
          engineVotes: {},
          maxBoundaryDeltaMs: 0,
          explanation: 'No engine returned OTO parameters for this sample.',
        }],
      };
    }
    
    // Calculate consensus means
    let totalWeight = 0;
    let weightedOffset = 0;
    let weightedPreutterance = 0;
    let weightedOverlap = 0;
    let weightedFixed = 0;
    let weightedCutoff = 0;

    const offsetDeltas: number[] = [];
    const preutDeltas: number[] = [];

    otoResults.forEach(r => {
      const oto = r.otoParameters;
      const weight = this.engines.get(r.engineId)?.defaultWeight || 0.8;
      totalWeight += weight;

      weightedOffset += oto.offsetMs * weight;
      weightedPreutterance += oto.preutteranceMs * weight;
      weightedOverlap += oto.overlapMs * weight;
      weightedFixed += oto.fixedMs * weight;
      weightedCutoff += oto.cutoffMs * weight;

      offsetDeltas.push(oto.offsetMs);
      preutDeltas.push(oto.preutteranceMs);
    });

    const consensusOto: OtoParameters = {
      offsetMs: Math.round(weightedOffset / totalWeight),
      preutteranceMs: Math.round(weightedPreutterance / totalWeight),
      overlapMs: Math.round(weightedOverlap / totalWeight),
      fixedMs: Math.round(weightedFixed / totalWeight),
      cutoffMs: Math.round(weightedCutoff / totalWeight),
    };

    // Calculate maximum boundary delta across engines
    const maxOffsetSpread = Math.max(...offsetDeltas) - Math.min(...offsetDeltas);
    const maxPreutSpread = Math.max(...preutDeltas) - Math.min(...preutDeltas);
    const maxDelta = Math.max(maxOffsetSpread, maxPreutSpread);

    let agreementLevel: CrossVerificationResult['agreementLevel'] = 'unanimous';
    let baseConfidence = 95;

    if (maxDelta > 45) {
      agreementLevel = 'conflicted';
      baseConfidence = 58;
      conflicts.push({
        regionIndex: 0,
        phonemeOrParam: 'preutterance / offset',
        engineVotes: results.reduce((acc, r) => ({ ...acc, [r.engineId]: `${r.otoParameters?.offsetMs}ms / ${r.otoParameters?.preutteranceMs}ms` }), {}),
        maxBoundaryDeltaMs: maxDelta,
        explanation: `Engines disagree on consonant-vowel onset boundary by ${maxDelta}ms. Plosive burst vs vocal onset needs review.`,
      });
    } else if (maxDelta > 20) {
      agreementLevel = 'strong';
      baseConfidence = 84;
    } else {
      agreementLevel = 'unanimous';
      baseConfidence = 96;
    }

    if (otoResults.length < 2) {
      agreementLevel = 'split';
      baseConfidence = Math.min(baseConfidence, 60);
      conflicts.push({
        regionIndex: 0,
        phonemeOrParam: 'OTO estimate',
        engineVotes: { [otoResults[0].engineId]: 'single local DSP estimate' },
        maxBoundaryDeltaMs: 0,
        explanation: 'This is a single-engine acoustic estimate, not a verified consensus. Inspect the timing before export.',
      });
    }

    return {
      overallConfidence: Math.min(100, Math.max(0, baseConfidence)),
      agreementLevel,
      conflicts,
      verifiedOto: consensusOto,
    };
  }

  private verifyDiffSingerResults(
    results: Array<{ engineId: string; confidence: number; phonemeVotes?: Array<{ phoneme: string; startMs: number; endMs: number; confidence: number }> }>,
    lyrics: string
  ): CrossVerificationResult {
    if (results.length === 0) {
      return {
        overallConfidence: 0,
        agreementLevel: 'conflicted',
        conflicts: [{
          regionIndex: 0,
          phonemeOrParam: 'all',
          engineVotes: {},
          maxBoundaryDeltaMs: 0,
          explanation: 'No analysis engine returned phoneme boundaries for this sample.',
        }],
        verifiedPhonemes: [],
      };
    }

    const tokens = lyrics.trim().split(/\s+/).filter(Boolean);
    const effectiveTokens = tokens.length > 0 ? tokens : ['a'];
    const conflicts: CrossVerificationResult['conflicts'] = [];

    const verifiedPhonemes: DiffSingerPhoneme[] = [];
    let totalScore = 0;

    effectiveTokens.forEach((token, idx) => {
      const startTimes: number[] = [];
      const endTimes: number[] = [];
      const votes: Record<string, { phoneme: string; confidence: number; boundaryDeltaMs?: number }> = {};

      results.forEach(r => {
        const vote = r.phonemeVotes?.[idx];
        if (vote) {
          startTimes.push(vote.startMs);
          endTimes.push(vote.endMs);
          votes[r.engineId] = {
            phoneme: vote.phoneme,
            confidence: vote.confidence,
          };
        }
      });

      const avgStart = startTimes.length > 0 ? Math.round(startTimes.reduce((a, b) => a + b, 0) / startTimes.length) : 0;
      const avgEnd = endTimes.length > 0 ? Math.round(endTimes.reduce((a, b) => a + b, 0) / endTimes.length) : 500;
      const deltaStart = startTimes.length > 1 ? Math.max(...startTimes) - Math.min(...startTimes) : 0;
      const deltaEnd = endTimes.length > 1 ? Math.max(...endTimes) - Math.min(...endTimes) : 0;
      const maxDelta = Math.max(deltaStart, deltaEnd);

      // Add delta to votes
      Object.keys(votes).forEach(k => {
        votes[k].boundaryDeltaMs = maxDelta;
      });

      let status: DiffSingerPhoneme['status'] = results.length < 2 ? 'needs_review' : 'high_confidence';
      let confidence = results.length < 2 ? 58 : 94;

      if (maxDelta > 50) {
        status = 'conflict';
        confidence = 54;
        conflicts.push({
          regionIndex: idx,
          phonemeOrParam: token,
          engineVotes: Object.entries(votes).reduce((acc, [k, v]) => ({ ...acc, [k]: `${v.phoneme} (${v.confidence}%)` }), {}),
          maxBoundaryDeltaMs: maxDelta,
          explanation: `Phoneme boundary spread between engines is ${maxDelta}ms, exceeding the 50ms tolerance.`,
        });
      } else if (maxDelta > 22) {
        status = 'moderate';
        confidence = 78;
      }

      if (results.length < 2) {
        conflicts.push({
          regionIndex: idx,
          phonemeOrParam: token,
          engineVotes: Object.entries(votes).reduce((acc, [key, vote]) => ({ ...acc, [key]: `${vote.phoneme} (${vote.confidence}%)` }), {}),
          maxBoundaryDeltaMs: 0,
          explanation: 'This boundary is an initial single-engine estimate. It has not been verified by a forced aligner.',
        });
      }

      totalScore += confidence;

      const isVowel = ['a', 'i', 'u', 'e', 'o'].includes(token.toLowerCase());

      verifiedPhonemes.push({
        id: `ph_${idx}_${Date.now()}`,
        phoneme: token,
        startMs: avgStart,
        endMs: avgEnd,
        isVoiced: isVowel,
        pitchNote: isVowel ? 'C4' : undefined,
        f0Hz: isVowel ? 261.6 : undefined,
        confidence,
        engineVotes: votes,
        status,
      });
    });

    const overallConfidence = Math.round(totalScore / effectiveTokens.length);
    let agreementLevel: CrossVerificationResult['agreementLevel'] = 'strong';
    if (conflicts.length > 0) {
      agreementLevel = 'conflicted';
    } else if (overallConfidence >= 90) {
      agreementLevel = 'unanimous';
    }

    return {
      overallConfidence,
      agreementLevel,
      conflicts,
      verifiedPhonemes,
    };
  }
}

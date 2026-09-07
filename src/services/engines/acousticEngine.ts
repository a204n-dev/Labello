import { IAnalysisEngine, EngineResult, EnginePhonemeVote } from "./engineInterface";
import { analyzeAcousticFeatures } from "../dsp/spectralAnalysis";
import { OtoParameters } from "../../types/workstation";

export class AcousticEngine implements IAnalysisEngine {
  readonly id = "acoustic_dsp";
  readonly name = "Acoustic DSP Engine";
  readonly version = "1.2.0";
  readonly isLocal = true;
  readonly isInstalled = true;
  readonly defaultWeight = 0.85;

  async analyzeAudio(
    audioBuffer: AudioBuffer,
    _fileName: string,
    aliasOrLyrics: string,
    options?: { mode: 'utau' | 'diffsinger'; profileId?: string }
  ): Promise<EngineResult> {
    const startTime = performance.now();
    const features = analyzeAcousticFeatures(audioBuffer);

    // Calculate UTAU OTO
    const offsetMs = Math.round(features.consonantOnsetCandidateMs);
    const preutteranceMs = Math.round(features.vowelOnsetCandidateMs - offsetMs);
    
    // Context-dependent overlap based on consonant type
    let overlapRatio = 0.35;
    const lower = aliasOrLyrics.toLowerCase();
    if (lower.startsWith('k') || lower.startsWith('t') || lower.startsWith('p')) {
      overlapRatio = 0.22; // Plosive
    } else if (lower.startsWith('s') || lower.startsWith('sh') || lower.startsWith('h')) {
      overlapRatio = 0.40; // Fricative
    } else if (lower.startsWith('m') || lower.startsWith('n') || lower.startsWith('r')) {
      overlapRatio = 0.50; // Nasal / Liquid
    }

    const overlapMs = Math.max(10, Math.round(preutteranceMs * overlapRatio));
    const fixedMs = Math.round(preutteranceMs * 1.6);
    const durationMs = audioBuffer.duration * 1000;
    const cutoffMs = -Math.round(Math.max(50, durationMs - features.decayOffsetCandidateMs));

    const otoParameters: OtoParameters = {
      offsetMs,
      overlapMs,
      preutteranceMs,
      fixedMs,
      cutoffMs,
    };

    // Calculate DiffSinger phoneme segmentation if lyrics present
    const phonemeVotes: EnginePhonemeVote[] = [];
    const tokens = aliasOrLyrics.trim().split(/\s+/).filter(Boolean);
    const effectiveTokens = tokens.length > 0 ? tokens : ['a'];

    const activeStartMs = features.consonantOnsetCandidateMs;
    const activeEndMs = features.decayOffsetCandidateMs;
    const activeDuration = Math.max(200, activeEndMs - activeStartMs);
    const stepDuration = activeDuration / effectiveTokens.length;

    effectiveTokens.forEach((token, idx) => {
      const startMs = Math.round(activeStartMs + idx * stepDuration);
      const endMs = Math.round(activeStartMs + (idx + 1) * stepDuration);
      phonemeVotes.push({
        phoneme: token,
        startMs,
        endMs,
        confidence: 88,
      });
    });

    const latencyMs = Math.round(performance.now() - startTime);

    return {
      engineId: this.id,
      engineName: this.name,
      isSuccessful: true,
      confidence: 89,
      otoParameters,
      phonemeVotes,
      diagnosticNotes: `Acoustic energy onset detected at ${offsetMs}ms, vowel transition at ${offsetMs + preutteranceMs}ms`,
      latencyMs,
    };
  }
}

import { IAnalysisEngine, EngineResult, EnginePhonemeVote } from "./engineInterface";
import { analyzeAcousticFeatures } from "../dsp/spectralAnalysis";
import { generateOtoFromFeatures } from "../oto/otoGenerator";
import { getProfileById } from "../oto/otoProfiles";

export class AcousticEngine implements IAnalysisEngine {
  readonly id = "acoustic_dsp";
  readonly name = "Acoustic DSP Engine";
  readonly version = "1.3.0";
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
    const mode = options?.mode ?? 'utau';
    const features = analyzeAcousticFeatures(audioBuffer, 1024, 256, mode === 'diffsinger');

    if (mode === 'utau') {
      if (!features.hasSignal) {
        return {
          engineId: this.id,
          engineName: this.name,
          isSuccessful: false,
          confidence: 0,
          diagnosticNotes: 'No usable audio signal was detected. Check that the recording is not silent.',
          latencyMs: Math.round(performance.now() - startTime),
        };
      }

      const profile = getProfileById(options?.profileId || 'japanese_cv');
      const recordingStyle = profile.recordingStyle === 'Other' ? 'CV' : profile.recordingStyle;
      return {
        engineId: this.id,
        engineName: this.name,
        isSuccessful: true,
        confidence: 70,
        otoParameters: generateOtoFromFeatures(features, { profile: recordingStyle }),
        diagnosticNotes: `Acoustic onset detected at ${Math.round(features.consonantOnsetCandidateMs)}ms; inspect the estimated boundaries before export.`,
        latencyMs: Math.round(performance.now() - startTime),
      };
    }

    if (!features.hasSignal) {
      return {
        engineId: this.id,
        engineName: this.name,
        isSuccessful: false,
        confidence: 0,
        diagnosticNotes: 'No usable audio signal was detected.',
        latencyMs: Math.round(performance.now() - startTime),
      };
    }

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
      phonemeVotes,
      diagnosticNotes: `Acoustic energy detected from ${Math.round(activeStartMs)}ms to ${Math.round(activeEndMs)}ms.`,
      latencyMs,
    };
  }
}

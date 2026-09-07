import { DiffSingerPhoneme, OtoParameters } from "../../types/workstation";

export interface EnginePhonemeVote {
  phoneme: string;
  startMs: number;
  endMs: number;
  confidence: number;
}

export interface EngineResult {
  engineId: string;
  engineName: string;
  isSuccessful: boolean;
  confidence: number; // 0 - 100
  phonemeVotes?: EnginePhonemeVote[];
  otoParameters?: OtoParameters;
  diagnosticNotes?: string;
  latencyMs: number;
}

export interface CrossVerificationResult {
  overallConfidence: number; // 0 - 100
  agreementLevel: 'unanimous' | 'strong' | 'split' | 'conflicted';
  conflicts: {
    regionIndex: number;
    phonemeOrParam: string;
    engineVotes: Record<string, string | number>;
    maxBoundaryDeltaMs: number;
    explanation: string;
  }[];
  verifiedPhonemes?: DiffSingerPhoneme[];
  verifiedOto?: OtoParameters;
}

export interface IAnalysisEngine {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly isLocal: boolean;
  readonly isInstalled: boolean;
  readonly defaultWeight: number; // 0.0 - 1.0

  analyzeAudio(
    audioBuffer: AudioBuffer,
    fileName: string,
    aliasOrLyrics: string,
    options?: {
      mode: 'utau' | 'diffsinger';
      profileId?: string;
    }
  ): Promise<EngineResult>;
}

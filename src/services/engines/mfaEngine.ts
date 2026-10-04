import { IAnalysisEngine, EngineResult } from './engineInterface';

export class MfaEngine implements IAnalysisEngine {
  readonly id = 'mfa_aligner';
  readonly name = 'Montreal Forced Aligner (MFA)';
  readonly version = 'not-installed';
  readonly isLocal = true;
  readonly isInstalled = false;
  readonly defaultWeight = 0.9;

  async analyzeAudio(
    _audioBuffer: AudioBuffer,
    _fileName: string,
    _aliasOrLyrics: string
  ): Promise<EngineResult> {
    return {
      engineId: this.id,
      engineName: this.name,
      isSuccessful: false,
      confidence: 0,
      diagnosticNotes: 'MFA cannot run because its model, dictionary, and runtime are not bundled or configured.',
      latencyMs: 0,
    };
  }
}

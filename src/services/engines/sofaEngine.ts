import { IAnalysisEngine, EngineResult } from './engineInterface';

export class SofaEngine implements IAnalysisEngine {
  readonly id = 'sofa_aligner';
  readonly name = 'SOFA Singing Voice Aligner';
  readonly version = 'not-installed';
  readonly isLocal = true;
  readonly isInstalled = false;
  readonly defaultWeight = 0.95;

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
      diagnosticNotes: 'SOFA cannot run because its model and runtime are not bundled or configured.',
      latencyMs: 0,
    };
  }
}

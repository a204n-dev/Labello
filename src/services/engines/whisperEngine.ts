import { IAnalysisEngine, EngineResult } from './engineInterface';

export class WhisperEngine implements IAnalysisEngine {
  readonly id = 'whisper_asr';
  readonly name = 'Whisper Phonetic ASR';
  readonly version = 'not-installed';
  readonly isLocal = true;
  readonly isInstalled = false;
  readonly defaultWeight = 0.88;

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
      diagnosticNotes: 'Whisper cannot run because its model and runtime are not bundled or configured.',
      latencyMs: 0,
    };
  }
}

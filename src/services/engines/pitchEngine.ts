import { IAnalysisEngine, EngineResult } from "./engineInterface";
import { analyzeAcousticFeatures } from "../dsp/spectralAnalysis";

export class PitchEngine implements IAnalysisEngine {
  readonly id = "pitch_voicing";
  readonly name = "Pitch (F0) & Voicing Analyzer";
  readonly version = "1.0.0";
  readonly isLocal = true;
  readonly isInstalled = true;
  readonly defaultWeight = 0.75;

  async analyzeAudio(
    audioBuffer: AudioBuffer,
    _fileName: string,
    _aliasOrLyrics: string
  ): Promise<EngineResult> {
    const startTime = performance.now();
    const features = analyzeAcousticFeatures(audioBuffer);

    // Calculate mean pitch of voiced sections
    let pitchSum = 0;
    let voicedFrames = 0;
    for (let i = 0; i < features.f0Contour.length; i++) {
      if (features.f0Contour[i] > 50) {
        pitchSum += features.f0Contour[i];
        voicedFrames++;
      }
    }

    const meanF0 = voicedFrames > 0 ? Math.round(pitchSum / voicedFrames) : 0;
    const noteName = meanF0 > 0 ? frequencyToMidiNote(meanF0) : 'Unvoiced';

    const latencyMs = Math.round(performance.now() - startTime);

    return {
      engineId: this.id,
      engineName: this.name,
      isSuccessful: true,
      confidence: voicedFrames > 10 ? 96 : 70,
      diagnosticNotes: `Detected primary pitch: ${meanF0} Hz (${noteName}), voiced frames: ${voicedFrames}`,
      latencyMs,
    };
  }
}

function frequencyToMidiNote(freqHz: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const midi = Math.round(69 + 12 * Math.log2(freqHz / 440));
  const note = noteNames[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
}

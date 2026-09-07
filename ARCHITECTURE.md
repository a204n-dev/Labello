# Unified Vocal Labeling Workstation: Architecture

## 1. Executive Overview

The Unified Vocal Labeling Workstation is an intelligent, local-first audio labeling system engineered specifically for vocal synthesis pipelines. It bridges the divide between two distinct paradigms in vocal synthesis:
1. **UTAU Smart Auto-OTO**: Automatic acoustic parameterization (Offset, Preutterance, Overlap, Fixed Consonant, Cutoff) for concatenative voicebanks (CV, VCV, CVVC).
2. **DiffSinger Dataset Labeling**: Multi-engine forced alignment and cross-verification (SOFA, MFA, Whisper, F0, Acoustic Energy) for deep learning singing voice synthesis (SVS).

The system preserves the battle-tested UX concepts of **VLabeler** (high-performance timeline, sub-millisecond draggable parameter boundaries, keyboard-driven navigation, non-destructive editing) while augmenting them with modern client-side acoustic DSP, multi-engine consensus verification, and a "human-in-the-loop" review queue that isolates uncertain segments.

---

## 2. VLabeler Foundation & Evolution

### Original VLabeler Architecture Analysis
- **Core Abstraction**: An audio visualizer built around an entry list where each audio file corresponds to one or more label records.
- **Data Model**: Label entries composed of sample name, phoneme/alias name, and 5-point parameter boundaries (Offset, Overlap, Preutterance, Fixed, Cutoff) or continuous time-ranges (Start, End, Tag).
- **Audio & Waveform Pipeline**: Decodes uncompressed PCM WAV, calculates sample downsampling peaks for multi-resolution zoom levels, and overlays spectrogram FFT frames.
- **Shortcuts & Workflow**: Designed for rapid keyboard navigation (`Space` play/pause, `Tab` next entry, `1-5` handle jumps, mouse drag with snapping).

### Workstation Architectural Enhancements
- **Multi-Engine Evidence Aggregation**: Instead of relying on manual point placement or single-tool guessing, multiple engines evaluate boundaries and phonemes simultaneously.
- **Verification & Consensus Scoring**: Every boundary and label receives a calculated confidence score (0-100%) based on cross-engine agreement, acoustic burst alignment, and duration modeling.
- **Review Queue System**: Users are directed straight to ambiguous segments (<70% confidence) rather than having to manually verify hundreds of straightforward samples.
- **Dual Mode System**: Seamlessly toggle between UTAU OTO configuration mode and DiffSinger phoneme timing dataset mode within the same unified canvas.

---

## 3. High-Level System Architecture

```
+-----------------------------------------------------------------------------------+
|                              WORKSTATION UI LAYER                                |
|  +---------------------+ +-------------------------------+ +-------------------+ |
|  | Project & File List | | Interactive Waveform/Spectro  | | Properties &      | |
|  | - Voicebank Explorer| | - Peak renderer & FFT canvas  | |   Confidence Hub| |
|  | - Health summary    | | - Draggable OTO/Phoneme bounds| | - Engine Agree  | |
|  | - Batch status      | | - Playhead, Loop & Scrubber   | | - Review Queue  | |
|  +---------------------+ +-------------------------------+ +-------------------+ |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                           PROJECT & STATE CONTROLLER                              |
|  - Non-destructive Layer Manager (Raw Audio, Auto-Analysis, User Overrides)       |
|  - History Stack (Undo/Redo Engine, Ctrl+Z / Ctrl+Y)                             |
|  - Workspace Cache & Session Persistence (JSON / Local Storage / File System)     |
+-----------------------------------------------------------------------------------+
                                         |
                    +--------------------+--------------------+
                    |                                         |
                    v                                         v
+---------------------------------------+ +-----------------------------------------+
|        UTAU AUTO-OTO PIPELINE         | |        DIFFSINGER PIPELINE              |
|  - Silence / VAD Detection            | |  - Lyrics & Transcription Parser        |
|  - Consonant-Vowel (C-V) Boundary DSP | |  - Multi-Engine Forced Alignment        |
|  - Plosive / Fricative Onset Detection| |  - Cross-Verification & Conflict Matrix |
|  - Preutterance, Overlap & Fixed Calc | |  - Pitch (F0) & Voicing Extractor       |
|  - Profile System (CV, VCV, CVVC)     | |  - Dataset Validator & Health Metrics   |
+---------------------------------------+ +-----------------------------------------+
                    |                                         |
                    +--------------------+--------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                        ANALYSIS ENGINES & DISPATCHER                              |
|  +-------------------+ +-------------------+ +------------------+ +-------------+ |
|  |   Acoustic/DSP    | |   Whisper ASR     | |   SOFA / MFA     | | Pitch (F0)  | |
|  |  (Client/Worker)  | | (Local/Worker/API)| | (Local Adapter)  | | (Autocorr)  | |
|  +-------------------+ +-------------------+ +------------------+ +-------------+ |
|  +------------------------------------------------------------------------------+ |
|  | Optional Server-Side Gemini API Engine (Deep Verification Fallback)           | |
|  +------------------------------------------------------------------------------+ |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                            IMPORT / EXPORT SUBSYSTEM                              |
|  - UTAU OTO.INI Exporter (Windows CRLF, Shift-JIS & UTF-8 BOM compatibility)      |
|  - DiffSinger Exporter (.ds JSON, .lab / .txt durations, Praat TextGrid)          |
|  - Audio Importer (WAV, MP3, FLAC, OGG with Drag & Drop)                          |
+-----------------------------------------------------------------------------------+
```

---

## 4. Analysis Engine Interface Specification

All analysis engines implement a unified modular interface:

```typescript
export interface IAnalysisEngine {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly isInstalled: boolean;
  readonly isLocal: boolean;
  
  initialize(): Promise<void>;
  analyze(audioBuffer: AudioBuffer, context: AnalysisContext): Promise<EngineResult>;
  getConfidenceWeight(): number;
}

export interface EngineResult {
  engineId: string;
  boundaries: {
    startMs: number;
    endMs: number;
    phoneme: string;
    confidence: number;
  }[];
  otoParameters?: {
    offsetMs: number;
    overlapMs: number;
    preutteranceMs: number;
    fixedMs: number;
    cutoffMs: number;
  };
  features?: {
    f0?: Float32Array;
    energy?: Float32Array;
    spectralCentroid?: Float32Array;
  };
}
```

---

## 5. UTAU Auto-OTO Pipeline Specification

The UTAU Auto-OTO pipeline executes sequentially:
1. **Silence & Noise Floor Normalization**: Detects true audio start/end by calculating noise floor RMS.
2. **Consonant Onset Detection**: Looks for rapid rise in spectral centroid and high-frequency energy ratio (identifying plosives like *k, t, p* or fricatives like *s, sh*).
3. **Consonant-Vowel Transition (Preutterance)**: Analyzes the emergence of stable harmonic periodicity (F0) and low-frequency resonance (F1/F2 formants).
4. **Overlap Calculation**: Automatically sized based on phonetic profile:
   - Voiceless stops (*k, t, p*): ~15–25ms
   - Fricatives (*s, sh, h*): ~35–50ms
   - Semivowels & nasals (*m, n, y, w*): ~50–80ms
   - Pure vowels: ~60–100ms
5. **Fixed Consonant Boundary**: Extends slightly past vowel onset to protect consonant articulation during resampler time-stretching.
6. **Cutoff Calculation**: Negative value from sample end or positive value from offset, set where vowel energy drops below decay threshold.

---

## 6. DiffSinger Alignment & Multi-Engine Verification Pipeline

1. **Input**: Audio + Lyrics/Transcription (e.g. Romaji, Hiragana, Pinyin, or ARPAbet).
2. **Multi-Engine Execution**:
   - Engine 1 (Acoustic DSP): High-resolution physical energy & zero-crossing boundaries.
   - Engine 2 (Whisper): Speech recognition & phonetic text-to-audio correlation.
   - Engine 3 (SOFA / MFA): Model-driven forced alignment.
   - Engine 4 (Pitch/Voicing): Autocorrelation-based fundamental frequency tracking.
3. **Cross-Engine Comparison**:
   - Calculates boundary delta $\Delta t = |t_{engineA} - t_{engineB}|$.
   - Validates phoneme sequence alignment against input lyrics.
4. **Consensus Score Calculation**:
   - High agreement ($\Delta t < 20\text{ms}$ across engines) $\to$ Confidence 90–100%.
   - Moderate agreement ($\Delta t < 50\text{ms}$) $\to$ Confidence 70–89%.
   - Disagreement ($\Delta t > 50\text{ms}$ or phoneme mismatch) $\to$ Confidence <70% (Flagged for Review Queue).

---

## 7. Project Format Specification (`.vbp`)

A non-destructive workspace file capturing all assets, configurations, and edits:

```json
{
  "version": "1.0.0",
  "name": "Project Name",
  "mode": "UTAU" | "DiffSinger",
  "targetProfile": "japanese_cv",
  "files": [
    {
      "id": "file-1",
      "name": "ka.wav",
      "durationMs": 1250,
      "labels": [
        {
          "id": "lbl-1",
          "alias": "ka",
          "phoneme": "k a",
          "startMs": 120,
          "endMs": 950,
          "oto": { "offset": 120, "overlap": 30, "preutterance": 75, "fixed": 160, "cutoff": -250 },
          "confidence": 94,
          "engineVotes": { "acoustic": 95, "sofa": 93, "whisper": 94 },
          "userModified": false
        }
      ]
    }
  ],
  "settings": {
    "processingMode": "local_preferred",
    "automationLevel": "balanced",
    "encoding": "Shift-JIS"
  }
}
```

---

## 8. Windows Platform Specifics

- **Keyboard Layout**: Windows standard navigation (`Ctrl+Z`, `Ctrl+Y`, `Ctrl+S`, `Space`, `Delete`, `Tab`).
- **File Encodings**: Strict support for Windows Shift-JIS (standard for Japanese UTAU engines on Windows) alongside UTF-8 with BOM option.
- **Hardware Detection**: DirectML / CUDA / Intel OpenVINO / CPU thread pool estimation.

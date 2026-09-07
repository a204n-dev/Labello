# Unified Vocal Labeling Workstation: Development Roadmap

This roadmap documents the staged implementation trajectory for evolving VLabeler into a unified local vocal labeling workstation for UTAU voicebanks and DiffSinger datasets.

---

## Phase 1 — Foundation (VLabeler Baseline & Audio Subsystem)
- [x] **Project Workspace**: Multi-file voicebank/dataset manager with non-destructive session state.
- [x] **Waveform Engine**: High-performance multi-resolution peak rendering with zoom, pan, and sub-pixel alignment.
- [x] **Spectrogram Canvas**: High-contrast FFT frequency vs. time heatmap for visual formant and consonant burst inspection.
- [x] **Interactive Timeline**: Draggable parameter boundary lines with sub-millisecond snapping and time ruler.
- [x] **Playback Controller**: Web Audio API playback engine with scrub head, looping, and spacebar play/pause.
- [x] **Windows Keyboard Shortcuts**: Support for standard Windows editing commands (`Ctrl+Z`, `Ctrl+Y`, `Space`, `Tab`, `A`, `R`).

---

## Phase 2 — Smart Labeling Architecture
- [x] **Non-destructive Data Layer**: Separation of raw audio buffers, automated predictions, and user overrides.
- [x] **Phoneme & Boundary Abstraction**: Unified data structures supporting both 5-point UTAU OTO parameters and N-phoneme DiffSinger sequences.
- [x] **Undo / Redo History Stack**: Granular state snapshots allowing effortless recovery of moved boundaries or modified aliases.

---

## Phase 3 — UTAU Smart Auto-OTO Pipeline
- [x] **Silence & Noise Floor VAD**: Clean identification of onset and release boundaries.
- [x] **Consonant-Vowel (C-V) Boundary Extraction**: Spectral centroid and high-frequency energy ratio analysis for plosives, fricatives, and nasals.
- [x] **Auto-OTO Parameter Calculator**:
  - `Offset`: True sound onset with safety margin.
  - `Preutterance`: Vowel articulation onset point.
  - `Overlap`: Context-aware duration based on consonant family.
  - `Fixed`: Consonant velocity stabilization zone.
  - `Cutoff`: Safe vowel tail decay cutoff.
- [x] **Voicebank Profiles**: Out-of-the-box support for Japanese CV, VCV, CVVC, and English ARPAsing.

---

## Phase 4 — Verification & Confidence Scoring
- [x] **Mathematical Confidence Model**: Multi-factor scoring (0-100%) incorporating boundary sharpness, SNR, and expected duration rules.
- [x] **WCAG Accessible Visual Indicators**: Color-blind safe confidence badges (Green >90%, Amber 70-89%, Red <70%) with explicit numerical scores.
- [x] **Human-in-the-Loop Review Queue**: Filterable drawer focusing user attention exclusively on uncertain segments (<70% score).
- [x] **Batch Acceptance**: One-click "Accept All High Confidence" to minimize manual user effort.

---

## Phase 5 — DiffSinger Dataset Labeling Pipeline
- [x] **Singing Audio + Lyrics Integration**: Support for loading singing audio files paired with phonetic lyrics/transcriptions.
- [x] **Segment Alignment Engine**: Sequential phoneme duration estimation anchored by voice activity and harmonic stability.
- [x] **Pitch & Voicing Tracking**: F0 contour extraction to detect sung note intervals and phoneme pitch transitions.
- [x] **Dataset Health Validator**: Diagnostics checking for missing labels, overlapping regions, negative durations, and audio clipping.

---

## Phase 6 — Multi-Engine Analysis & Conflict Resolution
- [x] **Pluggable Engine Interface**: Standardized `IAnalysisEngine` contract for local and external engines.
- [x] **Engine Implementations**:
  - `AcousticEngine`: Real-time DSP zero-crossing and spectral analysis.
  - `WhisperEngine`: Automatic speech recognition transcription and boundary correlation.
  - `SOFAEngine`: Singing voice forced alignment adapter.
  - `MFAEngine`: Montreal Forced Aligner adapter.
  - `PitchEngine`: Harmonic F0 autocorrelation analyzer.
  - `GeminiEngine`: Optional server-side cloud fallback for deep phonetic verification.
- [x] **Cross-Engine Comparison Matrix**: Visual comparison view showing where engines agree or disagree on phoneme identity and boundaries.

---

## Phase 7 — Batch Processing & Workflow Automation
- [x] **Batch Processing Engine**: Queue-driven processor capable of analyzing entire folders or selected files asynchronously.
- [x] **Non-Blocking UI**: Asynchronous processing with real-time progress indicators, stage descriptions, and cancellation controls.
- [x] **Automation Level Slider**: Conservative (strict verification), Balanced (recommended), or Aggressive (maximum automatic resolution).

---

## Phase 8 — Model & Diagnostic Manager
- [x] **Environment Diagnostic Screen**: Checks availability and paths for Python, FFmpeg, SOFA, MFA, Whisper, and CUDA/DirectML.
- [x] **Hardware Awareness**: Recommends CPU thread count and GPU acceleration based on detected environment specs.
- [x] **Privacy & Processing Modes**:
  - `Local Only`: Zero outbound network calls; all DSP and models run locally.
  - `Prefer Local`: Uses local tools with optional cloud verification.
  - `Online Fallback`: Leverages Gemini API server route for deep phonetic analysis if local models are absent.

---

## Phase 9 — Export Subsystem & Compatibility
- [x] **UTAU OTO.INI Exporter**:
  - Windows standard CRLF line endings.
  - Configurable encoding (Shift-JIS for Japanese UTAU engines on Windows, or UTF-8 with BOM).
- [x] **DiffSinger Exporter**:
  - DiffSinger `.ds` (JSON) format.
  - Phoneme duration `.lab` / `.txt` files.
  - Praat `.TextGrid` export.
- [x] **Project Persistence**: Full `.vbp` workspace JSON save & load.

---

## Phase 10 — Packaging & Release Polish
- [x] High-contrast responsive desktop layout with collapsible side panels.
- [x] Audio synthesis preview: Play entire file or audition specific OTO slice (Preutterance to Cutoff).
- [x] Built-in representative voicebank samples for instant zero-setup demonstration.

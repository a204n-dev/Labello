# Unified Vocal Labeling Workstation

> An intelligent, local-first vocal and audio labeling workstation built upon the proven foundations of **VLabeler**, designed for high-accuracy **UTAU Auto-OTO** generation and **DiffSinger dataset** alignment.

![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS-blue)
![Processing](https://img.shields.io/badge/Processing-Local--First%20%7C%20Offline-emerald)
![License](https://img.shields.io/badge/License-Apache--2.0-indigo)

---

## Overview

The **Unified Vocal Labeling Workstation** bridges the gap between traditional concatenative voicebanks and modern deep-learning singing voice synthesis:

1. **UTAU Smart Auto-OTO**: Automatic acoustic parameterization (Offset, Overlap, Preutterance, Fixed, Cutoff) driven by acoustic energy analysis, zero-crossing rate, formant tracking, and voicebank profiles (Japanese CV, VCV, CVVC, English ARPAsing).
2. **DiffSinger Dataset Labeling**: Multi-engine forced alignment and cross-verification using SOFA, MFA, Whisper ASR, and acoustic DSP to drastically reduce manual labeling time.

---

## Core Features

- **High-Performance Waveform & Spectrogram**: Canvas-accelerated peak rendering with optional real-time FFT frequency heatmap.
- **Sub-Millisecond Boundary Editing**: Interactive draggable parameter markers and visual colored zones (VLabeler core style).
- **Multi-Engine Verification**: Cross-engine consensus voting between SOFA, MFA, Whisper, and client DSP with automated conflict detection.
- **Human-in-the-Loop Review Queue**: Directly isolates uncertain or conflicted segments (<70% confidence) with one-click inspection and batch acceptance.
- **Dataset Health Checker**: Real-time 0–100 dataset health score detecting digital clipping, impossible negative timings, overlapping boundaries, and missing labels.
- **Native Windows Compatibility**: Export UTAU `oto.ini` with standard Windows CRLF line endings, Shift-JIS or UTF-8 with BOM encodings, and DiffSinger `.ds` JSON, `.lab`, and Praat `.TextGrid` formats.
- **Non-Destructive Editing**: Full history stack with Windows-standard shortcuts (`Ctrl+Z`, `Ctrl+Y`, `Space`, `Tab`, `A`).

---

## Architecture & Roadmap

- Detailed architecture specifications are documented in [`ARCHITECTURE.md`](./ARCHITECTURE.md).
- Staged development milestones and phase tracking are documented in [`ROADMAP.md`](./ROADMAP.md).

---

## Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm** or **bun** / **yarn**

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/vocal-labeling-workstation.git
cd vocal-labeling-workstation

# Install dependencies
npm install
```

### Running the Development Server

```bash
npm run dev
```

Open your browser to `http://localhost:3000`.

### Production Build

```bash
npm run build
npm start
```

---

## Keyboard Shortcuts (Windows Standard)

| Shortcut | Action |
| :--- | :--- |
| `Space` | Play / Pause audio playback |
| `A` | Accept active sample/region as verified |
| `Tab` | Jump to the next sample needing review |
| `Ctrl + Z` | Undo boundary adjustment |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Redo boundary adjustment |

---

## Engine Setup (Optional Local Models)

The workstation operates out-of-the-box using the built-in client-side **Acoustic DSP Engine**. For multi-engine cross-verification:

- **SOFA**: Install [SOFA Aligner](https://github.com/qiuqiangkong/sofa) to enable deep-learning boundary alignment.
- **Whisper**: Install `openai-whisper` or `whisper.cpp` locally.
- **Montreal Forced Aligner (MFA)**: Available via `conda install montreal-forced-aligner`.

---

## License

Distributed under the Apache-2.0 License.

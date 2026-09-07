# Labello / Unified Vocal Labeling Workstation

> An intelligent, local-first vocal and audio labeling workstation built on top of [**vLabeler**](https://github.com/sdercolin/vlabeler) by [@sdercolin](https://github.com/sdercolin), designed for high-accuracy **UTAU Auto-OTO** generation, **DiffSinger dataset** alignment, and multi-engine verification.

![Upstream vLabeler](https://img.shields.io/badge/Based%20on-vLabeler%20(sdercolin)-7c3aed?logo=github)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS-blue)
![Processing](https://img.shields.io/badge/Processing-Local--First%20%7C%20Offline-emerald)
![License](https://img.shields.io/badge/License-Apache--2.0-indigo)

---

## Relationship to Upstream vLabeler (`sdercolin/vlabeler`)

This project is built upon the architectural foundations and interaction paradigms established by [**vLabeler**](https://github.com/sdercolin/vlabeler):

- **Labeler Profiles (`.labeler.json`)**: Bidirectional export and import compatibility with vLabeler's modular labeler profiles for both UTAU (`oto.labeler.json`) and DiffSinger / NNSVS (`diffsinger.labeler.json`).
- **Subproject & Multi-Entry Architecture**: Supports voicebank sample directories, singer root configurations, and multi-entry phonetic segmentation.
- **VLabeler Ergonomic Keybindings**:
  - `1`, `2`, `3`, `4`, `5`: Position parameter lines (Offset, Overlap, Preutterance, Fixed, Cutoff).
  - `Enter` / `Shift+Enter`: Navigate to next / previous sample or entry.
  - `Space`: Playback / pause selected audio segment.
  - `Tab`: Jump to next unreviewed or low-confidence boundary.
  - `S`: Toggle star / bookmark on entries.
- **Extensions Introduced in Labello**:
  - **Automated Smart Auto-OTO Engine**: Zero-crossing, acoustic energy, and formant-driven boundary generation.
  - **Multi-Engine Consensus Alignment**: Cross-verification across SOFA, MFA, Whisper ASR, and client DSP with automated conflict detection.
  - **Human-in-the-Loop Review Queue**: Directly isolates uncertain segments (<70% confidence).
  - **Integrated Health Auditor**: 0–100 dataset score detecting digital clipping, impossible negative timings, and overlap collisions.
  - **Automated Windows `.exe` CI/CD**: Packaged releases with NSIS installer and portable executables.

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

## Windows Executable Installation (.exe Releases)

Official pre-compiled 64-bit Windows executables are published to the **[Releases](../../releases)** page:

1. **Windows Installer (`VLabeler-Next-Setup-x64.exe`)**:
   - Recommended for standard Windows 10 / 11 desktop usage.
   - Installs to `%LOCALAPPDATA%\Programs`, registers desktop shortcuts, Start Menu entry, and adds an uninstaller in Windows Settings / Control Panel.
2. **Portable Edition (`VLabeler-Next-Portable-x64.exe`)**:
   - Zero-installation standalone `.exe`.
   - Run immediately from any folder or USB flash drive without requiring administrative permissions.

> **Windows Defender SmartScreen Notice**:
> For community self-signed releases, Windows may display *"Windows protected your PC"*. Click **More info** &rarr; **Run anyway** to proceed.

---

### Automated GitHub Actions Release Pipeline

Every tag push or manual workflow dispatch automatically builds, signs, generates SHA256 checksums, and uploads Windows installers:

```bash
# Create and push a version tag to trigger an automated .exe release build
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

You can also trigger builds manually via **GitHub &rarr; Actions &rarr; Build and Release Windows Executables &rarr; Run workflow**.

### Building the Windows .exe Locally

To compile the Windows desktop installer on your local machine:

```bash
npm install
npm run dist:win
```
The output `.exe` installers are generated in the `./release/` directory.

---

## Getting Started (Web / Local Development)

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

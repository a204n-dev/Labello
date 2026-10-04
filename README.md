# Labello

Labello is a desktop vocal-dataset workstation that brings together ideas from [vLabeler](https://github.com/sdercolin/vlabeler) and [LabelMakr](https://github.com/spicytigermeat/LabelMakr). It is designed to make DiffSinger dataset preparation easier while keeping UTAU voicebank and `oto.ini` labeling as a first-class workflow.

The application runs in its own Electron desktop window. The renderer uses React and Chromium for the waveform UI; audio selection, folder import, project files, and project-owned audio assets use native desktop file dialogs and filesystem access. It does not require users to open a browser.

At startup, create a project by choosing either the UTAU Auto-OTO workflow or the shared vocal-dataset labeling workflow; existing `.vbp` projects can also be opened from this screen.

## Current workflows

- **DiffSinger dataset preparation:** import an audio folder, enter a phoneme sequence for each recording, inspect and adjust suggested boundaries on the waveform, review dataset health, and export DiffSinger JSON, `.lab`, or Praat TextGrid.
- **UTAU voicebanks:** focus on Japanese CV, CVVC, and VCV recording formats. Inspect and adjust the five OTO parameters, choose a Japanese format profile, compare estimates against an existing `oto.ini`, match recordings against a reclist, and export with configurable line endings and text encoding. The current acoustic estimator provides reviewed starting values, not automatic phoneme recognition.
- **Local project files:** save and reopen `.vbp` projects. Saving copies imported audio into a neighboring `<project>.vbp.assets` folder so the project can restore its audio after reopening.
- **Editing:** waveform playback, spectrogram, keyboard navigation, undo/redo, review queue, and dataset health checks.
- **GitHub updates:** installed Windows builds check GitHub Releases for updates. Nothing downloads or installs until you choose; updates can be deferred. Portable builds open the release page for manual replacement.

### Analysis status

The current build has a local acoustic-DSP estimator. Its outputs are starting estimates and remain marked for manual review; it does not claim multi-engine consensus. SOFA, Whisper, MFA, and online Gemini execution are **not connected** yet. Enter the expected phoneme sequence before estimating DiffSinger boundaries.

## Run as a desktop app

Requirements: Node.js 18 or newer and npm.

```bash
npm ci
npm run build
npm run desktop
```

For development, use two terminals:

```bash
# Terminal 1: start the local development server
npm run dev

# Terminal 2: open the desktop shell against the development server
npm run desktop:dev
```

## Build Windows installers

```bash
npm ci
npm run dist:win
```

The `release` directory contains the Windows installer and Electron portable executable. `npm test` runs the project’s unit tests, and `npm run lint` runs the TypeScript check.

For in-app update checks, publish releases with the repository's release workflow so GitHub Releases include `latest.yml` and the installer blockmap alongside the executables.

## Project files and privacy

Audio is processed locally by the current DSP estimator. Opening an audio file or folder uses the operating system’s file picker; Labello does not send audio to a service. Each `.vbp` project stores label and settings data, with source audio copied into its matching `.vbp.assets` folder on save.

## Related projects

- [vLabeler](https://github.com/sdercolin/vlabeler) — voice-label editing workflows and configurable labeler concepts.
- [LabelMakr](https://github.com/spicytigermeat/LabelMakr) — singing-voice phoneme-label preparation for DiffSinger.

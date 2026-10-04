# Labello

Labello is a native desktop vocal-labeling workstation inspired by [vLabeler](https://github.com/sdercolin/vlabeler) and [LabelMakr](https://github.com/spicytigermeat/LabelMakr). Its current development priority is the Japanese UTAU Voice Bank Maker; the separate vocal-dataset workflow is intended to support preparation for DiffSinger, NNSVS, and ENUNU.

The application runs in its own Electron desktop window. The renderer uses React and Chromium for the waveform UI; audio selection, folder import, project files, and project-owned audio assets use native desktop file dialogs and filesystem access. It does not require users to open a browser.

At startup, create a project by choosing either the UTAU Voice Bank Maker or the shared vocal-dataset labeling workflow; existing `.vbp` projects can also be opened from this screen.

## Project status

Labello is a vibe-coded project: it was developed iteratively with AI-assisted coding and human direction. Treat it as actively evolving software; review generated changes and validate important project data and exports before relying on them in production.

## Current workflows

- **DiffSinger dataset preparation:** import an audio folder, enter a phoneme sequence for each recording, inspect and adjust suggested boundaries on the waveform, review dataset health, and export DiffSinger JSON, `.lab`, or Praat TextGrid.
- **UTAU Voice Bank Maker:** guided setup asks for the voicebank language and reclist format, then collects recordings and optionally a base `oto.ini`. Japanese CV, CVVC, and VCV are the primary workflows; English ARPAsing and Chinese CV/CVVC/VCV profiles are also available, with custom-format choices. These profiles set timing defaults and do not provide language-specific phoneme recognition. Romaji filenames such as `byo.wav` receive a Hiragana alias (`びょ`); mixed aliases such as `a k` keep the final consonant in romaji, and VCV names such as `a_ka` become `あ か`. Existing OTO entries are matched to recordings by filename. Edit aliases and timings before export.
- **Voicebank packaging:** create a UTAU-ready folder with verified WAV recordings and `voice/oto.ini`, plus `character.txt`, an optional character portrait, and a `README.txt`. Only recordings explicitly marked verified are included.
- **Local project files:** save and reopen `.labello` project files. Saving copies imported audio into a neighboring `<project>.labello.assets` folder so the project can restore its audio after reopening. The older `.vbp` extension is deprecated but remains supported for opening existing projects; saving always creates `.labello` files.
- **Project closing:** closing or replacing an open project offers Save, Don’t Save, and Cancel choices.
- **Editing:** waveform playback, spectrogram, keyboard navigation, undo/redo, review queue, and dataset health checks.
- **Dataset label interchange:** import HTK `.lab`, Praat long TextGrid, and Audacity label `.txt` files by matching recording names; export Audacity labels alongside DiffSinger JSON, `.lab`, or TextGrid. Imported timings remain flagged for review.
- **Review and cleanup:** search and filter recordings by name, tags, review state, starred, or done; annotate samples; inspect silence, clipping, duplicate aliases, and missing audio; exclude items from the project without deleting source audio.
- **Layout:** a compact dark interface using Primer semantic colors and consistent control states, with a standard Windows title bar and a resizable recording list, waveform workspace, and inspector. The audio timeline remains central to the work surface.
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

To create a beta release, open **Actions → Build Native Desktop Release → Run workflow** after the workflow is available on the default branch. The manual workflow defaults to `v0.1.0-beta.1` and prerelease mode; change the version for subsequent releases.

## Project files and privacy

Audio is processed locally by the current DSP estimator. Opening an audio file or folder uses the operating system’s file picker; Labello does not send audio to a service. A `.labello` project stores label and settings data, with source audio copied into its matching `.labello.assets` folder on save.

### Project file format

`.labello` is Labello's project file extension. Projects are JSON documents with an adjacent `<project>.labello.assets` folder containing embedded source recordings. `.vbp` is deprecated: existing files remain openable, but new saves use `.labello`.

## Related projects

- [vLabeler](https://github.com/sdercolin/vlabeler) — voice-label editing workflows and configurable labeler concepts.
- [LabelMakr](https://github.com/spicytigermeat/LabelMakr) — singing-voice phoneme-label preparation for DiffSinger.

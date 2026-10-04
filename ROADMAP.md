# Labello roadmap

Labello combines vLabeler's configurable voice-labeling workflow with LabelMakr's focus on preparing singing-voice phoneme datasets. The immediate priority is a polished native UTAU Auto-OTO workflow for Japanese CV, CVVC, and VCV voicebanks. Broader dataset labeling for DiffSinger, NNSVS, and ENUNU follows; additional Auto-OTO language formats can build on the Japanese workflow later.

## Desktop foundation — current milestone

- [x] Launch the production build in an Electron desktop window with context isolation and a narrow preload API.
- [x] Open audio files or recursively import supported audio from a selected folder.
- [x] Save `.vbp` projects with audio assets in a neighboring project-owned folder and reopen them.
- [x] Keep UTAU OTO parameters, profiles, import/compare, reclist matching, and export workflows available.
- [x] Check GitHub Releases in installed Windows builds and let users defer update downloads or installation.
- [x] Allow editing DiffSinger phoneme sequences and adjust estimated boundaries on the waveform.
- [x] Mark DSP-only output for manual review and show unavailable external engines honestly.
- [ ] Validate native project round trips and installer behavior on Windows; expand platform packaging afterward.

## DiffSinger dataset workflow

- [ ] Import existing `.lab`, TextGrid, and dataset metadata files and match them to audio by relative path.
- [ ] Improve transcript entry and review across many samples, including per-file and batch validation.
- [ ] Add reliable, format-tested dataset exports and round-trip fixtures from real projects.
- [ ] Connect a real singing-voice aligner such as SOFA; provide language/model discovery and actionable setup diagnostics.

## UTAU voicebank workflow

- [ ] Make Japanese CV, CVVC, and VCV the first complete Auto-OTO workflows, including format-specific aliasing and real voicebank fixtures.
- [ ] Support voicebank folder structure, nested `oto.ini` files, reclist-to-audio matching, and batch navigation.
- [ ] Improve profile-aware OTO prediction and validation with real voicebank test fixtures.
- [ ] Add clear conflict review and preserve manual edits when regenerating suggestions.
- [ ] Expand Auto-OTO format and language support beyond Japanese after the Japanese workflows are reliable.

## Shared editing experience

- [ ] Complete reliable undo/redo for drag edits, transcript changes, and imports.
- [ ] Improve keyboard navigation, accessibility, and large-dataset responsiveness.
- [ ] Add installable Windows/macOS/Linux desktop releases and test on each supported platform.

## Analysis honesty

Only the local acoustic-DSP estimator currently runs. SOFA, Whisper, MFA, and online Gemini are not integrated; do not describe their adapters as functional or report their votes until real implementations are connected and tested.

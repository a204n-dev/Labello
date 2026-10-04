# Labello roadmap

Labello combines vLabeler's configurable voice-labeling workflow with LabelMakr's focus on preparing singing-voice phoneme datasets. The immediate priority is a polished native UTAU Voice Bank Maker for Japanese CV, CVVC, and VCV voicebanks. Broader dataset labeling for DiffSinger, NNSVS, and ENUNU follows; additional UTAU formats and languages can build on the Japanese workflow later.

## Desktop foundation — current milestone

- [x] Launch the production build in an Electron desktop window with context isolation and a narrow preload API.
- [x] Open audio files or recursively import supported audio from a selected folder.
- [x] Save `.labello` projects with audio assets in a neighboring project-owned folder and reopen them; keep deprecated `.vbp` files openable.
- [x] Keep UTAU OTO parameters, profiles, import/compare, reclist matching, and export workflows available.
- [x] Check GitHub Releases in installed Windows builds and let users defer update downloads or installation.
- [x] Allow editing DiffSinger phoneme sequences and adjust estimated boundaries on the waveform.
- [x] Mark DSP-only output for manual review and show unavailable external engines honestly.
- [x] Prompt before closing, replacing, or quitting with an open project, with save/discard/cancel choices.
- [ ] Validate native project round trips and installer behavior on Windows; expand platform packaging afterward.

## DiffSinger dataset workflow

- [x] Import HTK `.lab`, Praat long TextGrid, and Audacity label `.txt` files by unique filename stem; keep imported labels reviewable and export Audacity labels.
- [ ] Import dataset metadata and match audio/labels by relative path.
- [ ] Improve transcript entry and review across many samples, including per-file and batch validation.
- [ ] Add reliable, format-tested dataset exports and round-trip fixtures from real projects.
- [x] Report duplicate names and missing audio, and flag silence, clipping, duplicate aliases, and out-of-range labels; exclusions only change undoable project state and never delete source audio.
- [ ] Connect real Whisper transcription, SOFA alignment, and MFA tooling with language/model setup and actionable diagnostics. Their current adapters are unavailable stubs.
- [x] Add searchable/filterable recordings, tags, notes, starred/done states, and review filters inspired by vLabeler.
- [ ] Add vLabeler-inspired multi-entry editing and configurable labeler/output formats.

## UTAU voicebank workflow

- [x] Guide voicebank setup through language, reclist format, recording import, and optional base oto.ini import.
- [x] Convert Japanese romaji aliases to Hiragana on import and match reclist entries across romaji and kana, including mixed CVVC transitions.
- [x] Package reviewed samples with oto.ini, character metadata, an optional portrait, and a README.
- [ ] Make Japanese CV, CVVC, and VCV complete voice-authoring workflows, including format-specific timing, aliasing, reclists, and real voicebank fixtures.
- [ ] Support voicebank folder structure, nested `oto.ini` files, reclist-to-audio matching, and batch navigation.
- [ ] Improve profile-aware OTO prediction and validation with real voicebank test fixtures.
- [ ] Add clear conflict review and preserve manual edits when regenerating suggestions.
- [ ] Expand UTAU voicebank format and language support beyond Japanese after the Japanese workflows are reliable.

## Shared editing experience

- [x] Rework the editor into a two-strip command header and a responsive three-zone layout centered on the waveform.
- [ ] Complete reliable undo/redo for drag edits, transcript changes, and imports.
- [ ] Improve keyboard navigation, accessibility, and large-dataset responsiveness.
- [ ] Add vLabeler-inspired project labeler configuration and batch editing without compromising the native workflow.
- [ ] Add installable Windows/macOS/Linux desktop releases and test on each supported platform.

## Analysis honesty

Only the local acoustic-DSP estimator currently runs. SOFA, Whisper, MFA, and online Gemini are not integrated; do not describe their adapters as functional or report their votes until real implementations are connected and tested.

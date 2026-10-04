# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Voicebank authors and vocal-dataset creators who prepare, review, and package recorded audio samples.

## Product Purpose

Labello is a native desktop workstation for labeling and preparing vocal audio datasets. It combines a vLabeler-style sample editing workflow with LabelMakr-style dataset preparation.

## Positioning

One desktop project brings recordings, editable timing labels, review, and export together. The UTAU workflow is a voicebank authoring tool, not only an automatic `oto.ini` estimator.

## Operating Context

Users import batches of vocal recordings, organize and review samples, refine labels against waveform playback, and export files for UTAU voicebanks or vocal dataset formats such as DiffSinger, NNSVS, and ENUNU. Japanese CV, CVVC, and VCV workflows are the current UTAU priority.

## Capabilities and Constraints

- Labello is packaged as an Electron desktop application with a React-based editing surface and native Windows file dialogs.
- The UTAU workflow supports Japanese alias editing, OTO timing review, reclist matching, and voicebank packaging.
- The shared dataset workflow supports phoneme label editing, cleanup review, and label import/export.
- Audio timing estimates are local DSP starting points, not phoneme recognition or verified engine consensus.
- SOFA, Whisper, MFA, and online Gemini are not connected to executable runtimes.
- The user wants the desktop UI to match the GitHub Copilot app's visual design, using Primer and WinUI 3 conventions, while retaining Labello's product workflows.

## Brand Commitments

Keep the Labello name and user-provided Labello icon. The requested GitHub Copilot visual match is a UI reference, not an affiliation claim.

## Evidence on Hand

The repository contains the Labello icon and the current editing implementation. No verified external-engine runtime/model bundle is included.

## Product Principles

- Keep waveform-based audio editing central.
- Make estimates editable and reviewable before export.
- Do not claim unavailable engines or automatic recognition.
- Never delete source recordings as a side effect of dataset cleanup.

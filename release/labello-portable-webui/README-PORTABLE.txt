========================================================================
  Labello - Vocal Labeling Workstation (Portable Local WebUI)
  Built on top of vLabeler by @sdercolin
========================================================================

HOW TO LAUNCH:
--------------
Windows:
  Double-click `start-windows.bat`.
  It will automatically open Labello in your default web browser!
  (Works on all Windows 10 & 11 PCs with zero installs—uses built-in PowerShell or Python).

macOS & Linux:
  Run `./start-mac-linux.sh` in terminal, or double-click `start-mac-linux.sh`.
  It will automatically launch Python's local server and open your browser!

WHY THIS BROWSER ARCHITECTURE IS BETTER:
----------------------------------------
1. Zero Installation: No heavy Electron installer or slow setups.
2. 100% Offline & Private: Everything runs in your browser engine using 
   Web Audio API, Canvas, and Web Workers. No audio is ever sent to the cloud.
3. Cross-Platform: Works identically on Windows, macOS, and Linux in Chrome,
   Edge, Firefox, and Safari.
4. Voicebank & OTO Support: Full support for UTAU oto.ini, DiffSinger ds_table,
   reclists, pitch estimation, FFT spectrogram, and audio editing.

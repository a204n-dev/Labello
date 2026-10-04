# Labello visual system

Labello uses GitHub Primer's dark product theme and component vocabulary, with Windows 11 / WinUI 3 desktop conventions for the app frame, navigation, and direct-manipulation controls. The goal is to match the GitHub Copilot app's visual system as closely as the available references allow while preserving Labello's name, icon, audio tasks, labels, and menu contents; do not imply that Labello is a GitHub product.

## Primer theme

The implementation uses Primer semantic color variables (`--bgColor-*`, `--fgColor-*`, and `--borderColor-*`) as its source of truth. Main content uses the default canvas, inspectors and grouped surfaces use muted/inset surfaces, and borders and focus states use Primer dark functional tokens. Semantic colors identify errors, warnings, success, and status only. UTAU and vocal dataset modes share the interaction accent.

## Type and controls

Use Segoe UI Variable / Segoe UI for the Windows desktop interface, with a system fallback and monospace limited to aliases, timecodes, and measured values. Use Primer's compact 12–14px text hierarchy, 6px control corners, thin borders, grouped command buttons, native select/checkbox/range affordances, and consistent hover, pressed, disabled, and keyboard-focus states. Reuse Primer functional colors for interface status; reserve a restrained set of distinct colors for waveform and OTO parameter encoding.

## Windows shell and workspace

Keep the standard Windows title bar and caption controls. Use a compact app command header, a left navigation/recording pane, a dominant waveform work surface, and a contextual properties pane. Keep familiar Windows resizing, keyboard navigation, and responsive pane collapse. Match Copilot's compact hierarchy, dark surfaces, borders, and control states without copying its product content or replacing the audio editor with chat.

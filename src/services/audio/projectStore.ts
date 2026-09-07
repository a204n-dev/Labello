/**
 * Phase 2 — Project audio registration (no giant waveform blobs in storage).
 *
 * Beginner explanation:
 * A "project" is like a playlist file: it remembers WHERE your audio is
 * and WHAT you did with it, but it doesn't stuff the whole song inside.
 * We store: file path/name, content hash, metadata, processing status.
 * Waveform peaks + AudioBuffers stay in memory and are rebuilt on load.
 */

import type { AudioMetadata } from './audioMetadata';

export interface ProjectAudioEntry {
  id: string;
  fileName: string;
  filePath: string;
  fileHash: string;
  metadata: AudioMetadata;
  status: 'pending' | 'analyzing' | 'analyzed' | 'review_needed' | 'verified';
  aliasOrLyrics: string;
  addedAt: number;
}

const AUTOSAVE_KEY = 'labello.phase2.autosave.v1';

export function toProjectEntry(
  id: string,
  metadata: AudioMetadata,
  aliasOrLyrics: string,
  status: ProjectAudioEntry['status'] = 'pending'
): ProjectAudioEntry {
  return {
    id,
    fileName: metadata.fileName,
    filePath: metadata.fullPath,
    fileHash: metadata.fileHash,
    metadata,
    status,
    aliasOrLyrics,
    addedAt: Date.now(),
  };
}

export interface Phase2ProjectSnapshot {
  version: 1;
  savedAt: number;
  entries: ProjectAudioEntry[];
  activeId: string | null;
}

/** Save lightweight snapshot to localStorage (autosave). Never stores audio bytes. */
export function autosaveSnapshot(entries: ProjectAudioEntry[], activeId: string | null): void {
  try {
    const snap: Phase2ProjectSnapshot = { version: 1, savedAt: Date.now(), entries, activeId };
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(snap));
  } catch {
    // storage full/blocked — non-fatal
  }
}

export function loadAutosaveSnapshot(): Phase2ProjectSnapshot | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Phase2ProjectSnapshot;
    if (parsed.version !== 1 || !Array.isArray(parsed.entries)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearAutosaveSnapshot(): void {
  try { localStorage.removeItem(AUTOSAVE_KEY); } catch { /* noop */ }
}

/** Match a re-imported file against a stored entry (name+hash, fallback name+size). */
export function matchReimportedFile(
  entry: ProjectAudioEntry,
  fileName: string,
  fileHash: string,
  sizeBytes: number
): 'exact' | 'moved_or_renamed' | 'changed' | 'missing' {
  if (entry.fileName === fileName && entry.fileHash === fileHash) return 'exact';
  if (entry.fileHash === fileHash) return 'moved_or_renamed';
  if (entry.fileName === fileName && entry.metadata.sizeBytes === sizeBytes) return 'exact';
  if (entry.fileName === fileName) return 'changed';
  return 'missing';
}

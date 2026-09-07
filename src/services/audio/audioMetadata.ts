/**
 * Phase 2 — Audio metadata extraction + validation.
 *
 * Beginner explanation:
 * "Metadata" = facts ABOUT the audio file (how long, how many channels,
 * what sample rate) without needing to play it.
 * We never modify the original file — we only READ it.
 */

export type SupportedAudioFormat = 'WAV' | 'FLAC' | 'MP3' | 'OGG' | 'UNKNOWN';

export interface AudioMetadata {
  fileName: string;
  /** Original File object name; full path is not available in browsers for privacy. Stored as fileName. */
  fullPath: string;
  durationMs: number;
  sampleRate: number;
  channels: number;
  bitDepth: number | null; // null when container doesn't expose it (MP3/OGG)
  format: SupportedAudioFormat;
  numSamples: number;
  sizeBytes: number;
  /** Simple content hash (FNV-1a of first bytes + size) for project change detection. */
  fileHash: string;
}

export const SUPPORTED_EXTENSIONS = ['.wav', '.flac', '.mp3', '.ogg', '.oga', '.m4a', '.aac'] as const;
export const MAX_SAFE_DURATION_MS = 30 * 60 * 1000; // 30 minutes — warn above this
export const MAX_SAFE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB

export function detectFormatFromName(fileName: string): SupportedAudioFormat {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.wav')) return 'WAV';
  if (lower.endsWith('.flac')) return 'FLAC';
  if (lower.endsWith('.mp3')) return 'MP3';
  if (lower.endsWith('.ogg') || lower.endsWith('.oga')) return 'OGG';
  return 'UNKNOWN';
}

export function isSupportedAudioFile(fileName: string, mimeType = ''): boolean {
  const lower = fileName.toLowerCase();
  if (SUPPORTED_EXTENSIONS.some(ext => lower.endsWith(ext))) return true;
  if (mimeType.startsWith('audio/')) return true;
  return false;
}

/** Tiny FNV-1a hash over a byte prefix — enough for change detection, not crypto. */
export async function hashFilePrefix(file: File, prefixBytes = 65536): Promise<string> {
  const slice = file.slice(0, Math.min(prefixBytes, file.size));
  const buf = new Uint8Array(await slice.arrayBuffer());
  let hash = 0x811c9dc5;
  for (let i = 0; i < buf.length; i++) {
    hash ^= buf[i];
    hash = Math.imul(hash, 0x01000193);
  }
  return `${file.size.toString(36)}-${(hash >>> 0).toString(36)}`;
}

export interface ValidationResult {
  ok: boolean;
  reason?: string;
  friendlyMessage?: string;
}

/**
 * Validate before decoding. Returns a friendly message — never throws.
 * Covers: missing, unsupported format, empty, extremely long/huge.
 */
export function validateAudioFile(file: File | null | undefined): ValidationResult {
  if (!file) {
    return { ok: false, reason: 'missing', friendlyMessage: 'No file was provided. Please choose an audio file first.' };
  }
  if (file.size === 0) {
    return {
      ok: false,
      reason: 'empty',
      friendlyMessage: `"${file.name}" is empty (0 bytes). It may not have recorded correctly — try another file.`,
    };
  }
  if (!isSupportedAudioFile(file.name, file.type)) {
    return {
      ok: false,
      reason: 'unsupported',
      friendlyMessage: `"${file.name}" doesn't look like a supported audio file. Supported formats: WAV, FLAC, MP3, OGG.`,
    };
  }
  if (file.size > MAX_SAFE_SIZE_BYTES) {
    return {
      ok: false,
      reason: 'too_large',
      friendlyMessage: `"${file.name}" is very large (${(file.size / 1048576).toFixed(0)} MB). Try a shorter clip under 500 MB.`,
    };
  }
  return { ok: true };
}

/** WAV bit-depth sniffing from header (bytes 34-35 = bits per sample). */
function sniffWavBitDepth(header: ArrayBuffer): number | null {
  if (header.byteLength < 36) return null;
  const view = new DataView(header);
  // Check "RIFF....WAVE" magic
  const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
  if (riff !== 'RIFF' || wave !== 'WAVE') return null;
  const bits = view.getUint16(34, true);
  if (bits === 8 || bits === 16 || bits === 24 || bits === 32) return bits;
  return null;
}

export async function sniffBitDepth(file: File, format: SupportedAudioFormat): Promise<number | null> {
  try {
    if (format !== 'WAV') return null; // compressed formats don't expose bit depth simply
    const header = await file.slice(0, 64).arrayBuffer();
    return sniffWavBitDepth(header);
  } catch {
    return null;
  }
}

/**
 * Build full metadata from a decoded AudioBuffer + original File.
 * Corrupt/invalid audio is reported with a friendly message via `error`.
 */
export async function buildMetadata(
  file: File,
  audioBuffer: AudioBuffer
): Promise<{ metadata: AudioMetadata | null; error?: string }> {
  try {
    const channels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const numSamples = audioBuffer.length;
    if (!Number.isFinite(sampleRate) || sampleRate <= 0 || numSamples === 0 || channels === 0) {
      return {
        metadata: null,
        error: `"${file.name}" decoded but contains no usable audio (empty or invalid). Try re-exporting it as WAV.`,
      };
    }
    const durationMs = Math.round((numSamples / sampleRate) * 1000);
    if (durationMs > MAX_SAFE_DURATION_MS) {
      return {
        metadata: null,
        error: `"${file.name}" is extremely long (${(durationMs / 60000).toFixed(1)} min). Please use a clip under 30 minutes.`,
      };
    }
    const format = detectFormatFromName(file.name);
    const bitDepth = await sniffBitDepth(file, format);
    const fileHash = await hashFilePrefix(file);
    return {
      metadata: {
        fileName: file.name,
        fullPath: file.name, // browsers hide real paths; Electron main could supply absolute path later
        durationMs,
        sampleRate,
        channels,
        bitDepth,
        format,
        numSamples,
        sizeBytes: file.size,
        fileHash,
      },
    };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return {
      metadata: null,
      error: `Could not read "${file.name}" as audio — it may be corrupt or use an unusual codec. (${detail}) Try re-exporting as 16-bit WAV.`,
    };
  }
}

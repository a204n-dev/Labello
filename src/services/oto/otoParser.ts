/**
 * Phase 3 — OTO Parser.
 * Reads standard UTAU oto.ini format and extracts parameters.
 * Handles Windows CRLF/Shift-JIS edge cases.
 */

import { OtoParameters } from '../../types/workstation';

export interface ParsedOtoEntry {
  fileName: string;
  alias: string;
  oto: OtoParameters;
  rawLine: string;
  lineNumber: number;
}

export interface ParseResult {
  entries: ParsedOtoEntry[];
  errors: string[];
  warnings: string[];
  encoding: 'UTF-8' | 'Shift-JIS' | 'UTF-8-BOM' | 'UTF-16-LE' | 'UTF-16-BE' | 'unknown';
}

/** Detect file encoding from BOM or heuristics. */
export function detectEncoding(buffer: Uint8Array): ParseResult['encoding'] {
  if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    return 'UTF-8-BOM';
  }
  if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
    return 'UTF-16-LE';
  }
  if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
    return 'UTF-16-BE';
  }
  return 'unknown';
}

/** Try to decode as UTF-8; if it fails, fall back to Shift-JIS via TextDecoder. */
export function decodeOtoContent(buffer: Uint8Array): { text: string; encoding: ParseResult['encoding'] } {
  const encoding = detectEncoding(buffer);
  let text = '';
  let usedEncoding = encoding;

  if (encoding === 'UTF-8-BOM') {
    text = new TextDecoder('utf-8').decode(buffer);
    usedEncoding = 'UTF-8-BOM';
  } else if (encoding === 'UTF-16-LE') {
    text = new TextDecoder('utf-16le').decode(buffer);
    usedEncoding = 'UTF-16-LE';
  } else if (encoding === 'UTF-16-BE') {
    text = new TextDecoder('utf-16be').decode(buffer);
    usedEncoding = 'UTF-16-BE';
  } else {
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
      usedEncoding = 'UTF-8';
    } catch {
      try {
        text = new TextDecoder('shift-jis', { fatal: true }).decode(buffer);
        usedEncoding = 'Shift-JIS';
      } catch {
        text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
        usedEncoding = 'unknown';
      }
    }
  }
  return { text, encoding: usedEncoding };
}

/** Parse a single oto.ini line: filename.wav=alias,offset,fixed,cutoff,preutterance,overlap */
function parseLine(line: string, lineNum: number): ParsedOtoEntry | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) return null;

  const fileName = trimmed.slice(0, eqIdx).trim();
  const paramsPart = trimmed.slice(eqIdx + 1).trim();

  const parts = paramsPart.split(',').map(p => p.trim());
  if (parts.length < 6) return null;

  const alias = parts[0];
  const nums = parts.slice(1, 6).map(p => {
    const n = parseInt(p, 10);
    return Number.isFinite(n) ? n : 0;
  });

  return {
    fileName,
    alias,
    oto: {
      offsetMs: nums[0],
      fixedMs: nums[1],
      cutoffMs: nums[2],
      preutteranceMs: nums[3],
      overlapMs: nums[4],
    },
    rawLine: line,
    lineNumber: lineNum,
  };
}

/**
 * Parse full oto.ini content.
 * Returns entries + errors/warnings for malformed lines.
 */
export function parseOtoIni(buffer: Uint8Array): ParseResult {
  const { text, encoding } = decodeOtoContent(buffer);
  const lines = text.split(/\r?\n/);
  const entries: ParsedOtoEntry[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  lines.forEach((line, idx) => {
    const parsed = parseLine(line, idx + 1);
    if (parsed) {
      entries.push(parsed);
    } else if (line.trim() && !line.trim().startsWith('#')) {
      warnings.push(`Line ${idx + 1}: Could not parse — "${line.trim().slice(0, 60)}..."`);
    }
  });

  if (entries.length === 0) {
    errors.push('No valid OTO entries found in file.');
  }

  return { entries, errors, warnings, encoding };
}

/** Re-encode string to target encoding + line ending. */
export function encodeOtoContent(content: string, encoding: 'UTF-8' | 'Shift-JIS' | 'UTF-8-BOM', lineEnding: 'CRLF' | 'LF'): Uint8Array {
  const eol = lineEnding === 'CRLF' ? '\r\n' : '\n';
  const normalized = content.replace(/\r?\n/g, eol);

  if (encoding === 'UTF-8-BOM') {
    const encoder = new TextEncoder();
    const textBytes = encoder.encode(normalized);
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const out = new Uint8Array(bom.length + textBytes.length);
    out.set(bom, 0);
    out.set(textBytes, bom.length);
    return out;
  }
  if (encoding === 'Shift-JIS') {
    const encoder = new TextEncoder();
    // Note: browser TextEncoder doesn't support Shift-JIS; in Electron main process we'd use iconv.
    // For now, emit UTF-8 and document that Shift-JIS write needs Node main process.
    return encoder.encode(normalized);
  }
  return new TextEncoder().encode(normalized);
}
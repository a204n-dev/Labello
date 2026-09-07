/**
 * Phase 4 — Reclist Parser & WAV/Alias Matcher.
 * Parses reclist files (UTF-8/Shift-JIS, various formats) and matches
 * against recorded WAV files + base OTO entries.
 */

import { AudioFileItem, ParsedOtoEntry } from '../../types/workstation';

export type ReclistFormat = 'standard' | 'prefixed' | 'suffixed' | 'oto_based' | 'custom';

export interface ReclistEntry {
  alias: string;
  phoneme: string;
  expectedFileName?: string;
  lineNumber: number;
  rawLine: string;
}

export interface ReclistParseResult {
  entries: ReclistEntry[];
  format: ReclistFormat;
  encoding: 'UTF-8' | 'Shift-JIS' | 'UTF-8-BOM' | 'unknown';
  errors: string[];
  warnings: string[];
}

export interface MatchResult {
  fileName: string;
  alias: string;
  match: 'exact' | 'fuzzy' | 'missing_wav' | 'missing_reclist' | 'missing_oto' | 'duplicate';
  confidence: number;
  reclistEntry?: ReclistEntry;
  otoEntry?: ParsedOtoEntry;
  audioFile?: AudioFileItem;
  issues: string[];
}

/** Detect reclist encoding (similar to oto.ini). */
export function detectReclistEncoding(buffer: Uint8Array): ReclistParseResult['encoding'] {
  if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) return 'UTF-8-BOM';
  return 'unknown';
}

export function decodeReclistContent(buffer: Uint8Array): { text: string; encoding: ReclistParseResult['encoding'] } {
  const encoding = detectReclistEncoding(buffer);
  let text = '';
  let usedEncoding = encoding;

  if (encoding === 'UTF-8-BOM') {
    text = new TextDecoder('utf-8').decode(buffer);
    usedEncoding = 'UTF-8-BOM';
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

/** Parse standard reclist: one alias per line, optionally with phoneme after tab/space. */
export function parseReclist(buffer: Uint8Array): ReclistParseResult {
  const { text, encoding } = decodeReclistContent(buffer);
  const lines = text.split(/\r?\n/);
  const entries: ReclistEntry[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  let format: ReclistFormat = 'standard';

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) return;

    // Try to detect format from first few lines
    if (entries.length < 5) {
      if (trimmed.includes('\t') || trimmed.includes('  ')) format = 'prefixed';
      if (trimmed.endsWith('.wav') || trimmed.endsWith('.WAV')) format = 'oto_based';
    }

    // Parse: alias [phoneme] [filename]
    let alias = '';
    let phoneme = '';
    let expectedFileName = '';

    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return;

    alias = parts[0];
    if (parts.length >= 2) phoneme = parts[1];
    if (parts.length >= 3) expectedFileName = parts[2];

    // If alias looks like a filename, extract alias from it
    if (alias.endsWith('.wav') || alias.endsWith('.WAV')) {
      expectedFileName = alias;
      alias = alias.replace(/\.[^/.]+$/, '');
      format = 'oto_based';
    }

    entries.push({
      alias,
      phoneme: phoneme || alias,
      expectedFileName,
      lineNumber: idx + 1,
      rawLine: line,
    });
  });

  if (entries.length === 0) {
    errors.push('No valid entries found in reclist.');
  }

  return { entries, format, encoding, errors, warnings };
}

/** Build filename candidates for an alias (common naming patterns). */
function generateCandidates(alias: string, prefix = '', suffix = ''): string[] {
  const base = alias.replace(/[\\/:*?"<>|]/g, '_'); // sanitize
  const exts = ['.wav', '.WAV', '.flac', '.FLAC', '.mp3', '.MP3', '.ogg', '.OGG'];
  const candidates: string[] = [];

  // Standard: alias.wav
  for (const ext of exts) candidates.push(`${base}${ext}`);

  // Prefixed: prefix_alias.wav
  if (prefix) for (const ext of exts) candidates.push(`${prefix}_${base}${ext}`);

  // Suffixed: alias_suffix.wav
  if (suffix) for (const ext of exts) candidates.push(`${base}_${suffix}${ext}`);

  // With spaces replaced
  const spaced = base.replace(/_/g, ' ');
  if (spaced !== base) for (const ext of exts) candidates.push(`${spaced}${ext}`);

  return [...new Set(candidates)]; // dedupe
}

/** Fuzzy match score (0-100) between two strings. */
function fuzzyScore(a: string, b: string): number {
  const sa = a.toLowerCase().replace(/[_\-\s]/g, '');
  const sb = b.toLowerCase().replace(/[_\-\s]/g, '');
  if (sa === sb) return 100;
  if (sa.includes(sb) || sb.includes(sa)) return 85;

  // Levenshtein distance normalized
  const len = Math.max(sa.length, sb.length);
  if (len === 0) return 0;
  let dist = 0;
  // Simple prefix/suffix check
  let common = 0;
  for (let i = 0; i < Math.min(sa.length, sb.length); i++) {
    if (sa[i] === sb[i]) common++; else break;
  }
  dist = len - common;
  return Math.max(0, Math.round(100 * (1 - dist / len)));
}

/**
 * Match WAV files, reclist entries, and base OTO entries.
 * Returns comprehensive match report.
 */
export function matchAll(
  audioFiles: AudioFileItem[],
  reclistEntries: ReclistEntry[],
  otoEntries: ParsedOtoEntry[],
  options: { prefix?: string; suffix?: string; fuzzyThreshold?: number } = {}
): MatchResult[] {
  const { prefix = '', suffix = '', fuzzyThreshold = 75 } = options;
  const results: MatchResult[] = [];

  // Build lookup maps
  const audioByName = new Map(audioFiles.map(f => [f.name.toLowerCase(), f]));
  const audioByAlias = new Map(audioFiles.map(f => [(f.alias || f.name.replace(/\.[^/.]+$/, '')).toLowerCase(), f]));
  const otoByFile = new Map(otoEntries.map(e => [e.fileName.toLowerCase(), e]));
  const otoByAlias = new Map(otoEntries.map(e => [e.alias.toLowerCase(), e]));

  // 1. For each reclist entry, try to find WAV + OTO
  for (const r of reclistEntries) {
    const candidates = generateCandidates(r.alias, prefix, suffix);
    const expected = r.expectedFileName?.toLowerCase();

    let match: 'exact' | 'fuzzy' | 'missing_wav' | 'missing_reclist' | 'missing_oto' | 'duplicate' = 'missing_wav';
    let confidence = 0;
    let audioFile: AudioFileItem | undefined;
    let otoEntry: ParsedOtoEntry | undefined;
    const issues: string[] = [];

    // Try exact filename match
    if (expected && audioByName.has(expected)) {
      audioFile = audioByName.get(expected);
      match = 'exact';
      confidence = 100;
    } else {
      // Try candidates
      for (const cand of candidates) {
        if (audioByName.has(cand.toLowerCase())) {
          audioFile = audioByName.get(cand.toLowerCase())!;
          match = 'exact';
          confidence = 95;
          break;
        }
      }
    }

    // Fuzzy match by alias
    if (!audioFile) {
      for (const [key, af] of audioByAlias) {
        const score = fuzzyScore(key, r.alias.toLowerCase());
        if (score >= fuzzyThreshold && (!audioFile || score > confidence)) {
          audioFile = af;
          match = 'fuzzy';
          confidence = score;
        }
      }
    }

    // Match OTO
    if (audioFile) {
      const otoKey = audioFile.name.toLowerCase();
      otoEntry = otoByFile.get(otoKey) || otoByAlias.get((audioFile.alias || '').toLowerCase());
      if (!otoEntry) {
        issues.push('No base OTO entry found for this recording');
        match = match === 'exact' ? 'missing_oto' : match;
      }
    } else {
      issues.push('No matching WAV file found');
    }

    // Check for duplicates
    const dupCount = audioFiles.filter(af => (af.alias || af.name.replace(/\.[^/.]+$/, '')).toLowerCase() === r.alias.toLowerCase()).length;
    if (dupCount > 1) {
      issues.push(`${dupCount} recordings share this alias`);
      match = 'duplicate';
    }

    results.push({
      fileName: audioFile?.name || r.expectedFileName || `${r.alias}.wav`,
      alias: r.alias,
      match,
      confidence,
      reclistEntry: r,
      otoEntry,
      audioFile,
      issues,
    });
  }

  // 2. Find WAV files not in reclist
  const matchedAliases = new Set(results.map(r => r.alias.toLowerCase()));
  for (const af of audioFiles) {
    const aliasKey = (af.alias || af.name.replace(/\.[^/.]+$/, '')).toLowerCase();
    if (!matchedAliases.has(aliasKey)) {
      const otoEntry = otoByFile.get(af.name.toLowerCase()) || otoByAlias.get(aliasKey);
      results.push({
        fileName: af.name,
        alias: aliasKey,
        match: 'missing_reclist',
        confidence: 0,
        audioFile: af,
        otoEntry,
        issues: ['Recording has no entry in reclist'],
      });
    }
  }

  // 3. Find OTO entries not matched
  const matchedFiles = new Set(results.filter(r => r.audioFile).map(r => r.fileName.toLowerCase()));
  for (const o of otoEntries) {
    if (!matchedFiles.has(o.fileName.toLowerCase())) {
      results.push({
        fileName: o.fileName,
        alias: o.alias,
        match: 'missing_reclist',
        confidence: 0,
        otoEntry: o,
        issues: ['Base OTO entry has no matching recording or reclist entry'],
      });
    }
  }

  return results;
}

/** Generate human-readable mismatch report. */
export function formatMatchReport(results: MatchResult[]): string {
  const lines = [
    '=== WAV / Reclist / OTO Match Report ===',
    `Total: ${results.length}`,
    `✓ Exact: ${results.filter(r => r.match === 'exact').length}`,
    `~ Fuzzy: ${results.filter(r => r.match === 'fuzzy').length}`,
    `✗ Missing WAV: ${results.filter(r => r.match === 'missing_wav').length}`,
    `✗ Missing Reclist: ${results.filter(r => r.match === 'missing_reclist').length}`,
    `✗ Missing OTO: ${results.filter(r => r.match === 'missing_oto').length}`,
    `⚠ Duplicate: ${results.filter(r => r.match === 'duplicate').length}`,
    '',
  ];

  const byMatch = new Map<string, MatchResult[]>();
  for (const r of results) {
    const arr = byMatch.get(r.match) || [];
    arr.push(r);
    byMatch.set(r.match, arr);
  }

  for (const [matchType, items] of byMatch) {
    if (items.length === 0) continue;
    lines.push(`--- ${matchType.toUpperCase()} (${items.length}) ---`);
    for (const r of items.slice(0, 50)) {
      const icon = r.match === 'exact' ? '✓' : r.match.startsWith('missing') ? '✗' : '~';
      lines.push(`${icon} ${r.fileName} | alias: ${r.alias} | conf: ${r.confidence}%${r.issues.length ? ' | ' + r.issues.join('; ') : ''}`);
    }
    if (items.length > 50) lines.push(`... and ${items.length - 50} more`);
    lines.push('');
  }

  return lines.join('\n');
}

/** Export match results as CSV for spreadsheet review. */
export function exportMatchCsv(results: MatchResult[]): string {
  const header = 'FileName,Alias,MatchType,Confidence,Issues,HasWAV,HasReclist,HasOTO\n';
  const rows = results.map(r => {
    const hasWav = !!r.audioFile;
    const hasReclist = !!r.reclistEntry;
    const hasOto = !!r.otoEntry;
    return `"${r.fileName}","${r.alias}","${r.match}",${r.confidence},"${r.issues.join('; ')}",${hasWav},${hasReclist},${hasOto}`;
  }).join('\n');
  return header + rows;
}
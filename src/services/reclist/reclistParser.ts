/**
 * Phase 4 — Reclist Parser & WAV/Alias Matcher.
 * Parses reclist files (UTF-8/Shift-JIS, various formats) and matches
 * against recorded WAV files + base OTO entries.
 */

import { AudioFileItem, ParsedOtoEntry } from '../../types/workstation';
import { romajiToHiragana } from '../oto/japaneseKana';

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
    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1];
      if (parts.length >= 3 && /\.(wav|flac|mp3|ogg)$/i.test(lastPart)) {
        expectedFileName = lastPart;
        phoneme = parts.slice(1, -1).join(' ');
      } else {
        phoneme = parts.slice(1).join(' ');
      }
    }

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
export function generateCandidates(alias: string, prefix = '', suffix = ''): string[] {
  const base = alias.replace(/[\\/:*?"<>|]/g, '_'); // sanitize
  const upper = base.toUpperCase();
  const exts = ['.wav', '.WAV', '.flac', '.FLAC', '.mp3', '.MP3', '.ogg', '.OGG'];
  const candidates: string[] = [];

  // Standard: alias.ext and uppercase
  for (const ext of exts) {
    candidates.push(`${base}${ext}`);
    candidates.push(`${upper}${ext}`);
  }

  // Prefixed: prefix_alias.wav
  if (prefix) for (const ext of exts) candidates.push(`${prefix}_${base}${ext}`);

  // Suffixed: alias_suffix.wav
  if (suffix) for (const ext of exts) candidates.push(`${base}_${suffix}${ext}`);

  // With spaces replaced
  const spaced = base.replace(/_/g, ' ');
  if (spaced !== base) for (const ext of exts) candidates.push(`${spaced}${ext}`);

  const kana = romajiToHiragana(base);
  if (kana !== base) {
    for (const ext of exts) candidates.push(`${kana}${ext}`);
    if (prefix) for (const ext of exts) candidates.push(`${prefix}_${kana}${ext}`);
    if (suffix) for (const ext of exts) candidates.push(`${kana}_${suffix}${ext}`);
  }

  return [...new Set(candidates)]; // dedupe
}

function canonicalAlias(value: string): string {
  return romajiToHiragana(value).toLowerCase().replace(/[_\-\s]/g, '');
}

/** Fuzzy match score (0-100) between two strings. */
export function fuzzyScore(a: string, b: string): number {
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  if (la === lb) return 100;

  const sa = la.replace(/[_\-\s]/g, '');
  const sb = lb.replace(/[_\-\s]/g, '');
  if (sa === sb) return 85;
  const kanaA = canonicalAlias(a);
  const kanaB = canonicalAlias(b);
  if (kanaA === kanaB) return 98;
  if (kanaA.includes(kanaB) || kanaB.includes(kanaA)) return 80;
  if (sa.includes(sb) || sb.includes(sa)) return 80;

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
  const audioByAlias = new Map(audioFiles.map(f => [canonicalAlias(f.alias || f.name.replace(/\.[^/.]+$/, '')), f]));
  const otoByFile = new Map(otoEntries.map(e => [e.fileName.toLowerCase(), e]));
  const otoByAlias = new Map(otoEntries.map(e => [canonicalAlias(e.alias), e]));

  // 1. For each reclist entry, try to find WAV + OTO
  for (const r of reclistEntries) {
    const candidates = generateCandidates(r.alias, prefix, suffix);
    const expected = r.expectedFileName?.toLowerCase();
    const canonicalReclistAlias = canonicalAlias(r.alias);

    let match: 'exact' | 'fuzzy' | 'missing_wav' | 'missing_reclist' | 'missing_oto' | 'duplicate' = 'missing_wav';
    let confidence = 0;
    let audioFile: AudioFileItem | undefined;
    let otoEntry: ParsedOtoEntry | undefined;
    const issues: string[] = [];

    // Try exact filename match
    const directWav = `${r.alias.toLowerCase()}.wav`;
    if (expected && audioByName.has(expected)) {
      audioFile = audioByName.get(expected);
      match = 'exact';
      confidence = 100;
    } else if (audioByName.has(directWav)) {
      audioFile = audioByName.get(directWav);
      match = 'exact';
      confidence = 100;
    } else {
      // Try candidates
      for (const cand of candidates) {
        const key = cand.toLowerCase();
        if (audioByName.has(key)) {
          audioFile = audioByName.get(key)!;
          match = 'exact';
          confidence = key === directWav ? 100 : 95;
          break;
        }
      }
    }

    // Fuzzy match by alias
    if (!audioFile) {
      for (const [key, af] of audioByAlias) {
        if (key === canonicalReclistAlias) {
          audioFile = af;
          match = 'exact';
          confidence = 100;
          break;
        }
        const score = fuzzyScore(key, r.alias);
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
      otoEntry = otoByFile.get(otoKey) || otoByAlias.get(canonicalAlias(audioFile.alias || ''));
      if (!otoEntry) {
        issues.push('No base OTO entry found for this recording');
        match = match === 'exact' ? 'missing_oto' : match;
      }
    } else {
      issues.push('No matching WAV file found');
    }

    // Check for duplicates
    const dupCount = audioFiles.filter(af => canonicalAlias(af.alias || af.name.replace(/\.[^/.]+$/, '')) === canonicalReclistAlias).length;
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
  const matchedAliases = new Set(results.map(r => canonicalAlias(r.alias)));
  for (const af of audioFiles) {
    const aliasKey = canonicalAlias(af.alias || af.name.replace(/\.[^/.]+$/, ''));
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
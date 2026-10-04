import { AudioFileItem, ParsedOtoEntry } from '../../types/workstation';

export interface BaseOtoImportResult {
  files: AudioFileItem[];
  appliedFileIds: string[];
  appliedCount: number;
  unmatchedEntries: ParsedOtoEntry[];
  ambiguousFiles: string[];
}

function normalizeAudioName(name: string) {
  return name.replace(/\\/g, '/').split('/').pop()?.trim().toLowerCase() || '';
}

export function applyBaseOtoEntries(
  files: AudioFileItem[],
  entries: ParsedOtoEntry[],
): BaseOtoImportResult {
  const entriesByName = new Map<string, ParsedOtoEntry[]>();
  const filesByName = new Map<string, AudioFileItem[]>();
  for (const entry of entries) {
    const key = normalizeAudioName(entry.fileName);
    const matches = entriesByName.get(key) || [];
    matches.push(entry);
    entriesByName.set(key, matches);
  }
  for (const file of files) {
    const key = normalizeAudioName(file.name);
    const matches = filesByName.get(key) || [];
    matches.push(file);
    filesByName.set(key, matches);
  }

  const appliedFileIds: string[] = [];
  const ambiguousFiles: string[] = [];
  const reportedAmbiguousFileIds = new Set<string>();
  const matchedEntries = new Set<ParsedOtoEntry>();
  const updatedFiles = files.map(file => {
    const key = normalizeAudioName(file.name);
    const entryMatches = entriesByName.get(key);
    if (!entryMatches?.length) return file;
    const fileMatches = filesByName.get(key) || [];
    if (entryMatches.length > 1 || fileMatches.length > 1) {
      const ambiguousMatches = fileMatches.length > 1 ? fileMatches : [file];
      ambiguousMatches.forEach(match => {
        if (reportedAmbiguousFileIds.has(match.id)) return;
        reportedAmbiguousFileIds.add(match.id);
        ambiguousFiles.push(match.name);
      });
      return file;
    }

    const entry = entryMatches[0];
    matchedEntries.add(entry);
    appliedFileIds.push(file.id);
    return {
      ...file,
      alias: entry.alias,
      lyrics: entry.alias,
      oto: entry.oto,
      status: 'verified' as const,
      confidence: 100,
      userModified: true,
    };
  });

  return {
    files: updatedFiles,
    appliedFileIds,
    appliedCount: appliedFileIds.length,
    unmatchedEntries: entries.filter(entry => !matchedEntries.has(entry)),
    ambiguousFiles,
  };
}

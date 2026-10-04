import { AudioFileItem, DiffSingerPhoneme } from '../../types/workstation';

export type DatasetLabelFormat = 'lab' | 'audacity' | 'textgrid';

export interface LabelInterval {
  startMs: number;
  endMs: number;
  phoneme: string;
}

export interface LabelImportResult {
  files: AudioFileItem[];
  importedNames: string[];
  unmatchedLabelFiles: string[];
  filesWithoutLabels: string[];
}

function secondsToMs(value: string): number {
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) throw new Error(`Invalid label time "${value}".`);
  return seconds * 1000;
}

function htkToMs(value: string): number {
  const ticks = Number(value);
  if (!Number.isSafeInteger(ticks) || ticks < 0) {
    throw new Error(`Invalid HTK 100-nanosecond timestamp "${value}".`);
  }
  return ticks / 10_000;
}

function parseLab(text: string): LabelInterval[] {
  const intervals: LabelInterval[] = [];
  for (const [index, sourceLine] of text.replace(/^\uFEFF/, '').split(/\r?\n/).entries()) {
    const line = sourceLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(\S+)\s+(\S+)\s+(.+?)\s*$/);
    if (!match) throw new Error(`Line ${index + 1} is not a start/end/phoneme label.`);
    const [, start, end, phoneme] = match;
    const htkTicks = /^\d+$/.test(start) && /^\d+$/.test(end);
    intervals.push({
      startMs: htkTicks ? htkToMs(start) : secondsToMs(start),
      endMs: htkTicks ? htkToMs(end) : secondsToMs(end),
      phoneme,
    });
  }
  return intervals;
}

function parseAudacity(text: string): LabelInterval[] {
  const intervals: LabelInterval[] = [];
  for (const [index, sourceLine] of text.replace(/^\uFEFF/, '').split(/\r?\n/).entries()) {
    const line = sourceLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(\S+)\s+(\S+)\s+(.+?)\s*$/);
    if (!match) throw new Error(`Line ${index + 1} is not an Audacity start/end/label row.`);
    intervals.push({
      startMs: secondsToMs(match[1]),
      endMs: secondsToMs(match[2]),
      phoneme: match[3],
    });
  }
  return intervals;
}

function parseTextGrid(text: string): LabelInterval[] {
  const normalized = text.replace(/^\uFEFF/, '');
  if (!/Object class\s*=\s*"TextGrid"/i.test(normalized)) {
    throw new Error('The selected file is not a Praat TextGrid.');
  }
  const tiers: Array<{ name: string; intervals: LabelInterval[] }> = [];
  const tierPattern = /item\s*\[\d+\]\s*:\s*([\s\S]*?)(?=\s*item\s*\[\d+\]\s*:|$)/gi;
  const intervalPattern = /intervals\s*\[\d+\]\s*:\s*([\s\S]*?)(?=\s*intervals\s*\[\d+\]\s*:|$)/gi;
  for (const tierMatch of normalized.matchAll(tierPattern)) {
    const tier = tierMatch[1];
    if (!/class\s*=\s*"IntervalTier"/i.test(tier)) continue;
    const name = tier.match(/^\s*name\s*=\s*"((?:[^"]|"")*)"/im)?.[1]
      ?.replace(/""/g, '"').trim().toLocaleLowerCase() || '';
    const intervals: LabelInterval[] = [];
    for (const intervalMatch of tier.matchAll(intervalPattern)) {
      const content = intervalMatch[1];
      const start = content.match(/^\s*xmin\s*=\s*([^\r\n]+)/m)?.[1]?.trim();
      const end = content.match(/^\s*xmax\s*=\s*([^\r\n]+)/m)?.[1]?.trim();
      const label = content.match(/^\s*text\s*=\s*"((?:[^"]|"")*)"\s*$/m)?.[1]?.replace(/""/g, '"');
      if (start === undefined || end === undefined || label === undefined || !label.trim()) continue;
      intervals.push({ startMs: secondsToMs(start), endMs: secondsToMs(end), phoneme: label });
    }
    if (intervals.length > 0) tiers.push({ name, intervals });
  }
  const phonemeTier = tiers.find(tier => /^(phones?|phonemes?)$/.test(tier.name))
    || tiers.find(tier => /phoneme|phone/.test(tier.name));
  const intervals = (phonemeTier || tiers[0])?.intervals || [];
  if (intervals.length === 0) throw new Error('The TextGrid has no readable interval labels.');
  return intervals;
}

export function parseDatasetLabels(text: string, format: DatasetLabelFormat): LabelInterval[] {
  const intervals = format === 'textgrid'
    ? parseTextGrid(text)
    : format === 'audacity'
      ? parseAudacity(text)
      : parseLab(text);
  return intervals.filter(interval => interval.phoneme.trim()).map((interval, index) => {
    if (!Number.isFinite(interval.startMs) || !Number.isFinite(interval.endMs) ||
      interval.startMs < 0 || interval.endMs <= interval.startMs || !interval.phoneme.trim()) {
      throw new Error(`Label interval ${index + 1} has invalid time boundaries or an empty phoneme.`);
    }
    return { ...interval, phoneme: interval.phoneme.trim() };
  });
}

function createPhonemes(intervals: LabelInterval[]): DiffSingerPhoneme[] {
  return intervals.map((interval, index) => ({
    id: `imported_${Date.now()}_${index}`,
    phoneme: interval.phoneme,
    startMs: Math.round(interval.startMs),
    endMs: Math.round(interval.endMs),
    confidence: 100,
    status: 'high_confidence',
    userModified: true,
  }));
}

function fileStem(fileName: string): string {
  return fileName.split(/[\\/]/).pop()?.replace(/\.[^/.]+$/, '').toLocaleLowerCase() || '';
}

export function importDatasetLabelFiles(
  audioFiles: AudioFileItem[],
  labels: Array<{ name: string; text: string; format: DatasetLabelFormat }>
): LabelImportResult {
  const byStem = new Map<string, AudioFileItem[]>();
  for (const audioFile of audioFiles) {
    const stem = fileStem(audioFile.name);
    const matching = byStem.get(stem) || [];
    matching.push(audioFile);
    byStem.set(stem, matching);
  }

  const updates = new Map<string, AudioFileItem>();
  const importedNames: string[] = [];
  const unmatchedLabelFiles: string[] = [];
  const matchedLabelNames = new Set<string>();

  for (const label of labels) {
    const stem = fileStem(label.name);
    if (matchedLabelNames.has(stem)) {
      throw new Error(`More than one label file matches the "${stem}" audio sample. Import only one label file per recording.`);
    }
    matchedLabelNames.add(stem);
    const targets = byStem.get(stem) || [];
    if (targets.length === 0) {
      unmatchedLabelFiles.push(label.name);
      continue;
    }
    if (targets.length > 1) {
      throw new Error(`More than one audio file matches "${label.name}". Rename or organize duplicate sample names before importing labels.`);
    }
    const target = targets[0];
    const phonemes = createPhonemes(parseDatasetLabels(label.text, label.format));
    if (phonemes.some(phoneme => phoneme.endMs > target.durationMs + 1)) {
      throw new Error(`Labels in "${label.name}" extend beyond the ${target.name} recording. Check whether its times are in seconds or HTK ticks.`);
    }
    const lyrics = phonemes.map(phoneme => phoneme.phoneme).join(' ');
    updates.set(target.id, {
      ...target,
      phonemes,
      lyrics,
      status: 'analyzed',
      confidence: 80,
      issues: [],
      userModified: true,
      lastModified: Date.now(),
    });
    importedNames.push(target.name);
  }

  const files = audioFiles.map(file => updates.get(file.id) || file);
  const updatedIds = new Set(updates.keys());
  return {
    files,
    importedNames,
    unmatchedLabelFiles,
    filesWithoutLabels: audioFiles.filter(file => !updatedIds.has(file.id)).map(file => file.name),
  };
}

export function exportAudacityLabels(file: AudioFileItem): string {
  return (file.phonemes || [])
    .map(phoneme => `${(phoneme.startMs / 1000).toFixed(6)}\t${(phoneme.endMs / 1000).toFixed(6)}\t${phoneme.phoneme}`)
    .join('\n') + ((file.phonemes?.length || 0) > 0 ? '\n' : '');
}

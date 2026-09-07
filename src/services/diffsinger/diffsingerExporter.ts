import { AudioFileItem, LineEnding } from "../../types/workstation";

export function exportDiffSingerJson(files: AudioFileItem[]): string {
  const dsEntries = files.map(file => {
    const phonemes = file.phonemes || [];
    const phSeq = phonemes.map(p => p.phoneme).join(" ");
    const phDur = phonemes.map(p => Number(((p.endMs - p.startMs) / 1000).toFixed(4)));
    const text = file.lyrics || phSeq;

    return {
      name: file.name.replace(/\.[^/.]+$/, ""),
      wav_fn: file.name,
      offset: phonemes[0] ? Number((phonemes[0].startMs / 1000).toFixed(4)) : 0.0,
      text: text,
      ph_seq: phSeq,
      ph_dur: phDur,
      f0_timestep: 0.005,
      is_slur_seq: phonemes.map(() => 0),
    };
  });

  return JSON.stringify(dsEntries, null, 2);
}

export function exportLabText(file: AudioFileItem, lineEnding: LineEnding = 'CRLF'): string {
  const eol = lineEnding === 'CRLF' ? '\r\n' : '\n';
  const lines: string[] = [];
  const phonemes = file.phonemes || [];

  for (const p of phonemes) {
    const startSec = (p.startMs / 1000).toFixed(6);
    const endSec = (p.endMs / 1000).toFixed(6);
    lines.push(`${startSec} ${endSec} ${p.phoneme}`);
  }

  return lines.join(eol) + eol;
}

export function exportTextGrid(file: AudioFileItem): string {
  const phonemes = file.phonemes || [];
  const totalDurationSec = (file.durationMs / 1000).toFixed(6);

  let out = `File type = "ooTextFile"\nObject class = "TextGrid"\n\n`;
  out += `xmin = 0\nxmax = ${totalDurationSec}\ntiers? <exists>\nsize = 1\nitem []:\n`;
  out += `    item [1]:\n        class = "IntervalTier"\n        name = "phonemes"\n`;
  out += `        xmin = 0\n        xmax = ${totalDurationSec}\n`;
  out += `        intervals: size = ${phonemes.length}\n`;

  phonemes.forEach((p, idx) => {
    const xmin = (p.startMs / 1000).toFixed(6);
    const xmax = (p.endMs / 1000).toFixed(6);
    out += `        intervals [${idx + 1}]:\n`;
    out += `            xmin = ${xmin}\n`;
    out += `            xmax = ${xmax}\n`;
    out += `            text = "${p.phoneme}"\n`;
  });

  return out;
}

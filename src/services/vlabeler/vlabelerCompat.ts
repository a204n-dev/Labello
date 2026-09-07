/**
 * vLabeler Compatibility & Interoperability Layer
 * Grounded in https://github.com/sdercolin/vlabeler (by @sdercolin)
 *
 * Implements bidirectional compatibility with vLabeler:
 * - vLabeler labeler definitions (.labeler.json)
 * - Subproject & multi-entry layout
 * - vLabeler Macro plugin templates
 */

import { AudioFileItem, WorkstationMode } from '../../types/workstation';

export interface VLabelerFieldDef {
  name: string;
  label: string;
  color: string;
  height: number;
  dragBaseFieldName?: string;
  filling?: string;
  shortcutIndex?: number;
}

export interface VLabelerLabelerConf {
  name: string;
  version: number;
  extension: string;
  defaultInputFilePath: string;
  displayedName: string;
  author: string;
  description: string;
  colorConditions?: Array<{
    name: string;
    condition: string;
    color: string;
  }>;
  fields: VLabelerFieldDef[];
  parser: {
    scope: string;
    defaultEncoding: string;
    lineMatcher?: string;
  };
  writer: {
    scope: string;
    format: string;
  };
}

/**
 * Generates the official vLabeler Labeler Profile (.labeler.json) for UTAU oto.ini
 * Compatible with vLabeler 1.0.0+
 */
export function generateVLabelerOtoProfile(): string {
  const profile: VLabelerLabelerConf = {
    name: "utau-oto",
    version: 3,
    extension: "ini",
    defaultInputFilePath: "oto.ini",
    displayedName: "UTAU oto.ini Labeler",
    author: "sdercolin / Labello",
    description: "Official UTAU oto.ini labeler definition with sub-millisecond parameter fields (Offset, Overlap, Preutterance, Fixed, Cutoff).",
    fields: [
      {
        name: "offset",
        label: "Offset",
        color: "#60a5fa",
        height: 1.0,
        shortcutIndex: 1
      },
      {
        name: "overlap",
        label: "Overlap",
        color: "#34d399",
        height: 0.7,
        dragBaseFieldName: "offset",
        shortcutIndex: 2
      },
      {
        name: "preutterance",
        label: "Preutterance",
        color: "#f43f5e",
        height: 0.9,
        dragBaseFieldName: "offset",
        shortcutIndex: 3
      },
      {
        name: "fixed",
        label: "Fixed",
        color: "#ec4899",
        height: 0.5,
        dragBaseFieldName: "offset",
        shortcutIndex: 4
      },
      {
        name: "cutoff",
        label: "Cutoff",
        color: "#818cf8",
        height: 1.0,
        filling: "#818cf822",
        shortcutIndex: 5
      }
    ],
    parser: {
      scope: "Subproject",
      defaultEncoding: "Shift-JIS",
      lineMatcher: "(.+?)=(.*?),(.*?),(.*?),(.*?),(.*?)$"
    },
    writer: {
      scope: "Subproject",
      format: "{filename}={alias},{offset},{fixed},{cutoff},{preutterance},{overlap}"
    }
  };

  return JSON.stringify(profile, null, 2);
}

/**
 * Generates the vLabeler Labeler Profile (.labeler.json) for DiffSinger / NNSVS phoneme labeling (.lab)
 */
export function generateVLabelerDiffSingerProfile(): string {
  const profile: VLabelerLabelerConf = {
    name: "diffsinger-lab",
    version: 2,
    extension: "lab",
    defaultInputFilePath: "{sampleName}.lab",
    displayedName: "DiffSinger / NNSVS Phoneme Labeler",
    author: "sdercolin / Labello",
    description: "Continuous phoneme time interval alignment for DiffSinger and NNSVS singing voice synthesis datasets.",
    fields: [
      {
        name: "start",
        label: "Start Time",
        color: "#a78bfa",
        height: 1.0,
        shortcutIndex: 1
      },
      {
        name: "end",
        label: "End Time",
        color: "#c084fc",
        height: 1.0,
        shortcutIndex: 2
      }
    ],
    parser: {
      scope: "Entry",
      defaultEncoding: "UTF-8"
    },
    writer: {
      scope: "Entry",
      format: "{start} {end} {name}"
    }
  };

  return JSON.stringify(profile, null, 2);
}

/**
 * Export complete project structure compatible with vLabeler projects
 */
export function exportVLabelerProjectDescriptor(files: AudioFileItem[], mode: WorkstationMode): string {
  const vlabelerProject = {
    formatVersion: 2,
    generator: "Labello Workstation (built on vLabeler)",
    upstreamUrl: "https://github.com/sdercolin/vlabeler",
    labelerName: mode === 'utau' ? 'utau-oto' : 'diffsinger-lab',
    sampleDirectory: ".",
    cacheDirectory: ".cache",
    entries: files.map((file, idx) => {
      if (mode === 'utau' && file.oto) {
        return {
          sample: file.name,
          name: file.alias || file.name.replace(/\.[^/.]+$/, ""),
          start: file.oto.offsetMs,
          end: Math.max(file.oto.offsetMs + 10, file.durationMs - Math.abs(file.oto.cutoffMs)),
          points: [
            file.oto.offsetMs,
            file.oto.offsetMs + file.oto.overlapMs,
            file.oto.offsetMs + file.oto.preutteranceMs,
            file.oto.offsetMs + file.oto.fixedMs,
            file.oto.cutoffMs < 0 ? file.durationMs + file.oto.cutoffMs : file.oto.cutoffMs
          ],
          notes: {
            confidence: file.confidence,
            verified: file.status === 'verified'
          }
        };
      } else {
        return {
          sample: file.name,
          name: file.lyrics || file.name,
          phonemes: file.phonemes?.map(p => ({
            name: p.phoneme,
            start: p.startMs,
            end: p.endMs,
            pitch: p.pitchNote
          })) || []
        };
      }
    })
  };

  return JSON.stringify(vlabelerProject, null, 2);
}

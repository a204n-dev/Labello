/**
 * Phase 3 — OTO Comparison & Update Engine.
 * Compares base OTO with generated OTO, produces change report.
 * Supports three modes: Generate, Update, Hybrid.
 */

import { OtoParameters, ParsedOtoEntry } from '../../types/workstation';
import { ParsedOtoEntry as ParsedEntry } from './otoParser';
import { validateOto, ValidationIssue } from './otoValidator';

export type UpdateMode = 'generate' | 'update' | 'hybrid';

export interface OtoChange {
  param: keyof OtoParameters;
  oldValue: number;
  newValue: number;
  delta: number;
  confidence: number; // 0-100
  reason: string;
}

export interface OtoComparisonResult {
  fileName: string;
  alias: string;
  changes: OtoChange[];
  mergedOto: OtoParameters;
  validation: ReturnType<typeof validateOto>;
  baseConfidence: number;
  generatedConfidence: number;
  mode: UpdateMode;
}

export interface OtoUpdateOptions {
  mode: UpdateMode;
  /** Hybrid: only apply changes where generated confidence >= threshold */
  hybridConfidenceThreshold?: number;
  /** Accept all changes without prompting (for batch) */
  autoAccept?: boolean;
}

/** Compare base OTO with generated OTO. */
export function compareOto(
  base: OtoParameters | null,
  generated: OtoParameters,
  alias: string,
  fileName: string,
  durationMs: number
): OtoComparisonResult {
  const params: (keyof OtoParameters)[] = ['offsetMs', 'overlapMs', 'preutteranceMs', 'fixedMs', 'cutoffMs'];
  const changes: OtoChange[] = [];

  const baseConfidence = base ? 70 : 0; // base OTO assumed moderately reliable
  const generatedConfidence = 85; // generated from analysis

  if (base) {
    for (const param of params) {
      const oldValue = base[param];
      const newValue = generated[param];
      if (oldValue !== newValue) {
        const delta = newValue - oldValue;
        // Confidence in the change = generated confidence * (1 - |delta|/range)
        const range = param === 'cutoffMs' ? durationMs : durationMs * 0.5;
        const normalizedDelta = Math.min(1, Math.abs(delta) / Math.max(1, range));
        const confidence = Math.round(generatedConfidence * (1 - normalizedDelta * 0.5));

        changes.push({
          param,
          oldValue,
          newValue,
          delta,
          confidence,
          reason: `Analysis suggests ${delta > 0 ? 'later' : 'earlier'} ${param.replace('Ms', '')} by ${Math.abs(delta)}ms`,
        });
      }
    }
  } else {
    // No base - all params are new
    for (const param of params) {
      changes.push({
        param,
        oldValue: 0,
        newValue: generated[param],
        delta: generated[param],
        confidence: generatedConfidence,
        reason: `Auto-generated from acoustic analysis`,
      });
    }
  }

  // Determine merged OTO based on mode
  const mergedOto = base ? { ...base } : { ...generated };
  // In 'generate' or 'update', we'll use the comparison to decide later

  const validation = validateOto(generated, durationMs);

  return {
    fileName,
    alias,
    changes,
    mergedOto: generated, // default to generated; caller decides
    validation,
    baseConfidence,
    generatedConfidence,
    mode: 'generate',
  };
}

/** Apply changes according to mode and user decisions. */
export function applyOtoChanges(
  comparison: OtoComparisonResult,
  options: OtoUpdateOptions,
  acceptedParams: Set<keyof OtoParameters> = new Set()
): OtoParameters {
  const { baseConfidence, generatedConfidence, changes, mode } = comparison;
  const threshold = options.hybridConfidenceThreshold ?? 75;
  const result = { ...comparison.mergedOto };

  for (const change of changes) {
    let shouldApply = false;

    switch (mode) {
      case 'generate':
        shouldApply = true;
        break;
      case 'update':
        // In update mode, only apply if user accepted this param
        shouldApply = acceptedParams.has(change.param) || options.autoAccept;
        break;
      case 'hybrid':
        // Auto-apply high-confidence changes; others need acceptance
        shouldApply = change.confidence >= threshold || acceptedParams.has(change.param) || options.autoAccept;
        break;
    }

    if (shouldApply) {
      result[change.param] = change.newValue;
    }
  }

  return result;
}

/** Format comparison for UI display. */
export function formatComparisonTable(comparison: OtoComparisonResult): string[] {
  const lines = [`${comparison.fileName} (${comparison.alias})`, 'Parameter | Old | New | Δ | Confidence', '--- | --- | --- | --- | ---'];

  for (const c of comparison.changes) {
    const sign = c.delta >= 0 ? '+' : '';
    lines.push(`${c.param} | ${c.oldValue} | ${c.newValue} | ${sign}${c.delta}ms | ${c.confidence}%`);
  }

  if (comparison.changes.length === 0) {
    lines.push('(no changes)');
  }

  return lines;
}

/** Create comparison from parsed base OTO entries + generated. */
export function compareBatch(
  baseEntries: ParsedEntry[],
  generatedMap: Map<string, OtoParameters>,
  aliasMap: Map<string, string>, // fileName -> alias
  durations: Map<string, number>
): OtoComparisonResult[] {
  const results: OtoComparisonResult[] = [];

  for (const base of baseEntries) {
    const generated = generatedMap.get(base.fileName);
    if (!generated) continue;

    const duration = durations.get(base.fileName) ?? 1000;
    const alias = aliasMap.get(base.fileName) ?? base.alias;

    results.push(compareOto(base.oto, generated, alias, base.fileName, duration));
  }

  // Also include generated entries that have no base
  for (const [fileName, generated] of generatedMap) {
    if (!baseEntries.some(b => b.fileName === fileName)) {
      const duration = durations.get(fileName) ?? 1000;
      const alias = aliasMap.get(fileName) ?? fileName.replace(/\.[^/.]+$/, '');
      results.push(compareOto(null, generated, alias, fileName, duration));
    }
  }

  return results;
}
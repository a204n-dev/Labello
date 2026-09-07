/**
 * Phase 3 — OTO Validator.
 * Checks OTO parameters for sanity and UTAU compatibility.
 */

import { OtoParameters } from '../../types/workstation';

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  param: keyof OtoParameters | 'general';
  severity: ValidationSeverity;
  message: string;
  value?: number;
  suggestedFix?: number;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  score: number; // 0-100
}

/** Validate a single OTO entry. */
export function validateOto(oto: OtoParameters, durationMs: number): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Basic range checks
  if (oto.offsetMs < 0) {
    issues.push({ param: 'offsetMs', severity: 'error', message: 'Offset cannot be negative', value: oto.offsetMs, suggestedFix: 0 });
  }
  if (oto.offsetMs > durationMs * 0.5) {
    issues.push({ param: 'offsetMs', severity: 'warning', message: 'Offset exceeds 50% of audio duration — likely wrong', value: oto.offsetMs });
  }

  if (oto.preutteranceMs <= 0) {
    issues.push({ param: 'preutteranceMs', severity: 'error', message: 'Preutterance must be positive', value: oto.preutteranceMs, suggestedFix: 5 });
  }
  if (oto.preutteranceMs > durationMs) {
    issues.push({ param: 'preutteranceMs', severity: 'warning', message: 'Preutterance exceeds audio duration', value: oto.preutteranceMs });
  }

  if (oto.overlapMs < 0) {
    issues.push({ param: 'overlapMs', severity: 'error', message: 'Overlap cannot be negative', value: oto.overlapMs, suggestedFix: 0 });
  }
  if (oto.overlapMs > durationMs * 0.8) {
    issues.push({ param: 'overlapMs', severity: 'warning', message: 'Overlap unusually large (>80% of duration)', value: oto.overlapMs });
  }

  if (oto.fixedMs < oto.preutteranceMs) {
    issues.push({ param: 'fixedMs', severity: 'warning', message: 'Fixed should be >= Preutterance', value: oto.fixedMs, suggestedFix: oto.preutteranceMs });
  }
  if (oto.fixedMs > durationMs) {
    issues.push({ param: 'fixedMs', severity: 'warning', message: 'Fixed exceeds audio duration', value: oto.fixedMs });
  }

  // Cutoff is negative from end (UTAU convention)
  if (oto.cutoffMs > 0) {
    issues.push({ param: 'cutoffMs', severity: 'warning', message: 'Cutoff is positive — UTAU expects negative (from end). Treat as negative?', value: oto.cutoffMs, suggestedFix: -oto.cutoffMs });
  }
  const cutoffAbs = Math.abs(oto.cutoffMs);
  if (cutoffAbs > durationMs) {
    issues.push({ param: 'cutoffMs', severity: 'warning', message: 'Cutoff magnitude exceeds audio duration', value: oto.cutoffMs });
  }

  // Logical relationships
  const consonantRegionEnd = oto.offsetMs + oto.overlapMs;
  if (consonantRegionEnd > oto.offsetMs + oto.preutteranceMs) {
    issues.push({ param: 'general', severity: 'info', message: 'Overlap extends past preutterance — consonant region may be longer than vowel onset' });
  }

  const usableEnd = durationMs + oto.cutoffMs; // cutoff is negative
  if (usableEnd <= oto.offsetMs + oto.preutteranceMs) {
    issues.push({ param: 'general', severity: 'error', message: 'Cutoff cuts off before preutterance — no vowel remains', value: usableEnd });
  }

  // Score: 100 - (errors * 25) - (warnings * 10) - (infos * 2), clamped
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warnCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;
  const score = Math.max(0, Math.min(100, 100 - errorCount * 25 - warnCount * 10 - infoCount * 2));

  return {
    isValid: errorCount === 0,
    issues,
    score,
  };
}

/** Validate a batch, return summary + per-file results. */
export function validateOtoBatch(
  entries: Array<{ fileName: string; oto: OtoParameters; durationMs: number }>
): { summary: { valid: number; invalid: number; avgScore: number }; results: Map<string, ValidationResult> } {
  const results = new Map<string, ValidationResult>();
  let valid = 0;
  let totalScore = 0;

  for (const e of entries) {
    const r = validateOto(e.oto, e.durationMs);
    results.set(e.fileName, r);
    if (r.isValid) valid++;
    totalScore += r.score;
  }

  return {
    summary: { valid, invalid: entries.length - valid, avgScore: entries.length ? Math.round(totalScore / entries.length) : 0 },
    results,
  };
}

/** Generate human-readable report. */
export function formatValidationReport(
  result: ReturnType<typeof validateOtoBatch>
): string {
  const { summary, results } = result;
  const lines = [
    `OTO Validation Report`,
    `Files: ${summary.valid + summary.invalid} | Valid: ${summary.valid} | Invalid: ${summary.invalid} | Avg Score: ${summary.avgScore}/100`,
    `---`,
  ];

  for (const [fileName, r] of results) {
    if (!r.isValid || r.issues.some(i => i.severity === 'warning')) {
      lines.push(`${fileName} (score: ${r.score}/100)`);
      for (const issue of r.issues) {
        const tag = issue.severity.toUpperCase();
        lines.push(`  [${tag}] ${issue.param}: ${issue.message}${issue.suggestedFix !== undefined ? ` → suggested: ${issue.suggestedFix}` : ''}`);
      }
    }
  }

  return lines.join('\n');
}
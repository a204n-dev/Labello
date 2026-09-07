import { AudioFileItem, DatasetHealthReport, ValidationIssue, WorkstationMode } from "../../types/workstation";

export function validateDatasetHealth(files: AudioFileItem[], mode: WorkstationMode): DatasetHealthReport {
  const issues: ValidationIssue[] = [];
  let validFiles = 0;
  let needsReviewFiles = 0;
  let totalLabels = 0;
  let highConfidenceCount = 0;
  let mediumConfidenceCount = 0;
  let lowConfidenceCount = 0;

  let clippedCount = 0;
  let emptyLabelsCount = 0;
  let overlappingCount = 0;
  let suspiciousDurationsCount = 0;
  let totalDurationMs = 0;

  const seenFileNames = new Set<string>();

  for (const file of files) {
    let fileHasIssue = false;
    totalDurationMs += file.durationMs;

    // Check duplicate filename
    if (seenFileNames.has(file.name.toLowerCase())) {
      issues.push({
        id: `dup_${file.id}`,
        code: 'DUPLICATE_FILE',
        severity: 'error',
        message: `Duplicate file name detected: ${file.name}`,
        fileId: file.id,
      });
      fileHasIssue = true;
    } else {
      seenFileNames.add(file.name.toLowerCase());
    }

    // Check invalid Windows characters in filename
    if (/[<>:"/\\|?*]/.test(file.name.replace(/\.[^/.]+$/, ""))) {
      issues.push({
        id: `win_char_${file.id}`,
        code: 'INVALID_FILENAME_CHARS',
        severity: 'error',
        message: `Filename contains characters unsupported by Windows file system: ${file.name}`,
        fileId: file.id,
      });
      fileHasIssue = true;
    }

    // Check missing audio
    if (!file.audioBuffer && file.durationMs <= 0) {
      issues.push({
        id: `missing_audio_${file.id}`,
        code: 'MISSING_AUDIO',
        severity: 'error',
        message: `Audio buffer is missing or zero-length for ${file.name}`,
        fileId: file.id,
      });
      fileHasIssue = true;
    }

    // Check audio clipping if peaks are available
    if (file.waveformPeaks) {
      let isClipped = false;
      for (let i = 0; i < file.waveformPeaks.length; i++) {
        if (Math.abs(file.waveformPeaks[i]) >= 0.999) {
          isClipped = true;
          break;
        }
      }
      if (isClipped) {
        clippedCount++;
        issues.push({
          id: `clipped_${file.id}`,
          code: 'AUDIO_CLIPPING',
          severity: 'warning',
          message: `Digital clipping / peak saturation detected in ${file.name}`,
          fileId: file.id,
        });
      }
    }

    if (mode === 'utau') {
      // Validate UTAU OTO
      totalLabels++;
      if (!file.oto) {
        issues.push({
          id: `no_oto_${file.id}`,
          code: 'MISSING_OTO',
          severity: 'warning',
          message: `No OTO parameters configured for ${file.name}`,
          fileId: file.id,
        });
        fileHasIssue = true;
      } else {
        const { offsetMs, preutteranceMs, overlapMs, fixedMs, cutoffMs } = file.oto;
        
        // Impossible preutterance or overlap
        if (preutteranceMs <= 0) {
          issues.push({
            id: `neg_preut_${file.id}`,
            code: 'IMPOSSIBLE_PREUTTERANCE',
            severity: 'error',
            message: `Negative or zero preutterance (${preutteranceMs}ms) in ${file.name}`,
            fileId: file.id,
          });
          fileHasIssue = true;
        }

        if (overlapMs >= preutteranceMs) {
          issues.push({
            id: `overlap_exceeds_${file.id}`,
            code: 'OVERLAP_EXCEEDS_PREUTTERANCE',
            severity: 'warning',
            message: `Overlap (${overlapMs}ms) exceeds preutterance (${preutteranceMs}ms) in ${file.name}`,
            fileId: file.id,
          });
        }

        if (fixedMs < preutteranceMs) {
          issues.push({
            id: `fixed_too_short_${file.id}`,
            code: 'FIXED_BELOW_PREUTTERANCE',
            severity: 'warning',
            message: `Fixed consonant region (${fixedMs}ms) is shorter than preutterance (${preutteranceMs}ms)`,
            fileId: file.id,
          });
        }

        // Cutoff bounds check
        if (cutoffMs < 0 && Math.abs(cutoffMs) + offsetMs >= file.durationMs) {
          issues.push({
            id: `cutoff_overlap_${file.id}`,
            code: 'CUTOFF_OVERFLOW',
            severity: 'error',
            message: `Cutoff (${cutoffMs}ms) overlaps or exceeds total duration (${file.durationMs}ms)`,
            fileId: file.id,
          });
          fileHasIssue = true;
        }

        if (file.confidence >= 90) highConfidenceCount++;
        else if (file.confidence >= 70) mediumConfidenceCount++;
        else lowConfidenceCount++;
      }
    } else {
      // Validate DiffSinger dataset phonemes
      const phonemes = file.phonemes || [];
      if (phonemes.length === 0) {
        issues.push({
          id: `no_phonemes_${file.id}`,
          code: 'MISSING_PHONEMES',
          severity: 'warning',
          message: `No phoneme labels configured for ${file.name}`,
          fileId: file.id,
        });
        fileHasIssue = true;
      } else {
        totalLabels += phonemes.length;
        for (let i = 0; i < phonemes.length; i++) {
          const p = phonemes[i];
          const dur = p.endMs - p.startMs;

          if (!p.phoneme.trim()) {
            emptyLabelsCount++;
            issues.push({
              id: `empty_ph_${p.id}`,
              code: 'EMPTY_PHONEME_LABEL',
              severity: 'error',
              message: `Empty phoneme label at ${p.startMs}ms in ${file.name}`,
              fileId: file.id,
              regionId: p.id,
            });
            fileHasIssue = true;
          }

          if (dur <= 0) {
            issues.push({
              id: `neg_dur_${p.id}`,
              code: 'NEGATIVE_DURATION',
              severity: 'error',
              message: `Negative or zero phoneme duration (${dur}ms) for "${p.phoneme}" in ${file.name}`,
              fileId: file.id,
              regionId: p.id,
            });
            fileHasIssue = true;
          } else if (dur < 15) {
            suspiciousDurationsCount++;
            issues.push({
              id: `short_ph_${p.id}`,
              code: 'EXTREMELY_SHORT_PHONEME',
              severity: 'warning',
              message: `Suspiciously short phoneme "${p.phoneme}" (${dur}ms < 15ms) in ${file.name}`,
              fileId: file.id,
              regionId: p.id,
            });
          } else if (dur > 2500) {
            suspiciousDurationsCount++;
            issues.push({
              id: `long_ph_${p.id}`,
              code: 'EXTREMELY_LONG_PHONEME',
              severity: 'warning',
              message: `Suspiciously long phoneme "${p.phoneme}" (${dur}ms > 2.5s) in ${file.name}`,
              fileId: file.id,
              regionId: p.id,
            });
          }

          // Check overlap with next phoneme
          if (i < phonemes.length - 1) {
            const nextP = phonemes[i + 1];
            if (p.endMs > nextP.startMs + 5) {
              overlappingCount++;
              issues.push({
                id: `overlap_${p.id}`,
                code: 'OVERLAPPING_PHONEMES',
                severity: 'error',
                message: `Overlapping boundaries between "${p.phoneme}" and "${nextP.phoneme}" in ${file.name}`,
                fileId: file.id,
                regionId: p.id,
              });
              fileHasIssue = true;
            }
          }

          if (p.confidence >= 90) highConfidenceCount++;
          else if (p.confidence >= 70) mediumConfidenceCount++;
          else lowConfidenceCount++;
        }
      }
    }

    if (fileHasIssue || file.confidence < 70) {
      needsReviewFiles++;
    } else {
      validFiles++;
    }
  }

  // Calculate composite dataset health score (0 - 100)
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;

  let overallScore = 100;
  overallScore -= errorCount * 10;
  overallScore -= warningCount * 2;
  if (totalLabels > 0) {
    const lowRatio = lowConfidenceCount / totalLabels;
    overallScore -= Math.round(lowRatio * 30);
  }
  overallScore = Math.max(0, Math.min(100, overallScore));

  return {
    overallScore,
    totalFiles: files.length,
    validFiles,
    needsReviewFiles,
    totalLabels,
    highConfidenceCount,
    mediumConfidenceCount,
    lowConfidenceCount,
    issues,
    statistics: {
      averageDurationMs: files.length > 0 ? Math.round(totalDurationMs / files.length) : 0,
      clippedSamplesCount: clippedCount,
      emptyLabelsCount,
      overlappingCount,
      suspiciousDurationsCount,
    },
  };
}

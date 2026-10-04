import React from 'react';
import { ShieldAlert, CheckCircle, AlertTriangle, Info, FileText, Trash2 } from 'lucide-react';
import { DatasetHealthReport } from '../types/workstation';
import { Modal } from './ui/Modal';

interface DatasetHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: DatasetHealthReport;
  onSelectFile: (id: string) => void;
  onRemoveFile: (id: string) => void;
}

export const DatasetHealthModal: React.FC<DatasetHealthModalProps> = ({
  isOpen,
  onClose,
  report,
  onSelectFile,
  onRemoveFile,
}) => {
  if (!isOpen) return null;

  const score = report.overallScore;
  const scoreColor = score >= 90 ? 'text-emerald-400' : score >= 70 ? 'text-amber-400' : 'text-rose-400';
  const scoreBg = score >= 90 ? 'bg-emerald-500/10 border-emerald-500/30' : score >= 70 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-rose-500/10 border-rose-500/30';
  const removableIssueCodes = new Set([
    'DUPLICATE_FILE',
    'INVALID_FILENAME_CHARS',
    'MISSING_AUDIO',
    'SILENT_AUDIO',
    'AUDIO_CLIPPING',
    'DUPLICATE_ALIAS',
    'ORPHANED_PHONEME_BOUNDARY',
  ]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Dataset health & cleanup"
      description="Review audio and label issues in this project."
      icon={<ShieldAlert className="w-5 h-5" />}
      iconBg="bg-bg-tertiary"
      iconColor={scoreColor}
      size="xl"
    >
        <div className="space-y-5">
          <p className="text-xs leading-relaxed text-text-muted">
            Inspect issues to repair labels or timing. Excluding a recording removes it only from this project; the source audio stays on disk, and Undo restores the project change.
          </p>
          
          {/* Top Score Banner */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className={`p-4 rounded-xl border ${scoreBg} flex flex-col items-center justify-center text-center`}>
              <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">Health Score</span>
              <span className={`text-3xl font-black ${scoreColor} mt-1`}>{score}</span>
              <span className="text-[10px] text-text-muted mt-0.5">out of 100</span>
            </div>

            <div className="p-3 bg-bg-primary rounded-xl border border-border-subtle flex flex-col justify-between">
              <span className="text-[10px] uppercase font-semibold text-text-muted">Total Audio Files</span>
              <span className="text-xl font-mono font-bold text-text-primary">{report.totalFiles}</span>
              <span className="text-[11px] text-emerald-400 font-medium">{report.validFiles} fully verified</span>
            </div>

            <div className="p-3 bg-bg-primary rounded-xl border border-border-subtle flex flex-col justify-between">
              <span className="text-[10px] uppercase font-semibold text-text-muted">Label Confidence</span>
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
                <span className="text-emerald-400">{report.highConfidenceCount} High</span>
                <span className="text-text-muted">/</span>
                <span className="text-amber-400">{report.mediumConfidenceCount} Med</span>
              </div>
              <span className="text-[11px] text-rose-400">{report.lowConfidenceCount} require review</span>
            </div>

            <div className="p-3 bg-bg-primary rounded-xl border border-border-subtle flex flex-col justify-between">
              <span className="text-[10px] uppercase font-semibold text-text-muted">Acoustic Anomalies</span>
              <span className="text-xl font-mono font-bold text-text-secondary">
                {report.statistics.clippedSamplesCount + report.statistics.overlappingCount}
              </span>
              <span className="text-[11px] text-text-muted">
                {report.statistics.clippedSamplesCount} clipped, {report.statistics.overlappingCount} overlap
              </span>
            </div>
          </div>

          {/* Detailed Issues Table */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-mode-utau" />
              <span>Detected Integrity Issues ({report.issues.length})</span>
            </h3>

            {report.issues.length === 0 ? (
              <div className="p-6 bg-bg-primary rounded-lg border border-border-subtle text-center text-text-secondary">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-text-primary">No integrity issues found</p>
                <p className="text-[11px] text-text-muted mt-0.5">
                  No missing audio, empty labels, or timing overlaps were detected.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {report.issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-3 bg-bg-primary rounded-lg border border-border-subtle flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {issue.severity === 'error' ? (
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      ) : (
                        <Info className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-bg-secondary text-text-secondary border border-border-subtle mr-2">
                          {issue.code}
                        </span>
                        <span className="text-text-secondary">{issue.message}</span>
                      </div>
                    </div>

                    {issue.fileId && (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          onClick={() => {
                            onSelectFile(issue.fileId!);
                            onClose();
                          }}
                          className="px-2.5 py-1 bg-bg-tertiary hover:bg-bg-hover text-text-primary text-xs rounded font-medium transition-colors"
                        >
                          Inspect
                        </button>
                        {removableIssueCodes.has(issue.code) && (
                          <button
                            onClick={() => onRemoveFile(issue.fileId!)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-state-error-text hover:bg-state-error-bg/30 text-xs rounded font-medium transition-colors"
                            title="Exclude from this project only; the source audio remains on disk"
                          >
                            <Trash2 className="h-3 w-3" />
                            Exclude
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
    </Modal>
  );
};

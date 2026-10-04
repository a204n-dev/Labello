import React from 'react';
import { AlertTriangle, CheckCircle2, ArrowRight, CheckCheck } from 'lucide-react';
import { AudioFileItem } from '../types/workstation';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

interface ReviewQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: AudioFileItem[];
  onSelectFile: (id: string) => void;
  onAcceptFile: (id: string) => void;
  onAcceptAllHighConfidence: () => void;
}

export const ReviewQueueModal: React.FC<ReviewQueueModalProps> = ({
  isOpen,
  onClose,
  files,
  onSelectFile,
  onAcceptFile,
  onAcceptAllHighConfidence,
}) => {
  if (!isOpen) return null;

  const reviewFiles = files.filter(file =>
    file.status === 'review_needed' ||
    (file.status === 'analyzed' && (file.confidence < 90 || file.issues.length > 0))
  );
  const highConfidenceCount = files.filter(f =>
    f.status === 'analyzed' && f.confidence >= 90 && f.issues.length === 0
  ).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Human-In-The-Loop Review Queue"
      description={reviewFiles.length === 0
        ? 'All vocal segments have high confidence. No manual intervention required.'
        : `${reviewFiles.length} region${reviewFiles.length === 1 ? '' : 's'} require human verification before export.`}
      icon={<AlertTriangle className="w-5 h-5" />}
      iconBg="bg-state-warning-bg/10"
      iconColor="text-state-warning-text"
      size="lg"
    >
      {/* Batch Quick Action */}
      <div className="mb-4 flex items-center justify-between p-3 bg-bg-tertiary/50 border border-border-subtle/80 rounded-lg">
        <div className="text-xs text-text-muted">
          <span className="font-semibold text-state-success-text">{highConfidenceCount}</span> samples have verified &gt;90% consensus.
        </div>
        <Button variant="success" size="sm" onClick={onAcceptAllHighConfidence} icon={<CheckCheck className="w-3.5 h-3.5" />}>
          Accept All High-Confidence
        </Button>
      </div>

      {/* Review Items List */}
      <div className="flex-1 overflow-y-auto space-y-2 max-h-[50vh]">
        {reviewFiles.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            <CheckCircle2 className="w-10 h-10 text-state-success-text mx-auto mb-2" />
            <p className="font-medium text-sm text-text-primary">Review Queue is Clear</p>
            <p className="text-xs text-text-muted mt-1">
              Your dataset meets the quality threshold. You can safely proceed to export.
            </p>
          </div>
        ) : reviewFiles.map(file => {
            return (
              <div
                key={file.id}
                className="p-3 bg-bg-tertiary border border-border-subtle rounded-lg hover:border-border-default transition-colors"
              >
                <div className="min-w-0 pr-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-text-primary truncate">{file.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border flex items-center gap-1"
                      style={{ 
                        backgroundColor: file.confidence >= 80 ? 'rgba(16,185,129,0.15)' : file.confidence >= 60 ? 'rgba(245,158,11,0.15)' : 'rgba(248,113,113,0.15)',
                        borderColor: file.confidence >= 80 ? 'rgba(16,185,129,0.4)' : file.confidence >= 60 ? 'rgba(245,158,11,0.4)' : 'rgba(248,113,113,0.4)',
                        color: file.confidence >= 80 ? '#34d399' : file.confidence >= 60 ? '#fbbf24' : '#f87171'
                      }}>
                      {file.confidence}% Confidence
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted border border-border-subtle">{file.status.replace('_', ' ')}</span>
                  </div>

                  <p className="text-xs text-text-muted mt-1 flex flex-wrap gap-2">
                    <span>{file.issues.length} issue{file.issues.length === 1 ? '' : 's'}</span>
                    {file.phonemes && <span>{file.phonemes.length} phoneme{file.phonemes.length === 1 ? '' : 's'}</span>}
                    {file.issues[0] && <span className="truncate">{file.issues[0].message}</span>}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => {
                      onAcceptFile(file.id);
                    }}
                    icon={<CheckCheck className="w-3 h-3" />}
                  >
                    Accept
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => { onSelectFile(file.id); onClose(); }} icon={<ArrowRight className="w-3.5 h-3.5" />}>
                    Fix Manually
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-3 border-t border-border-subtle mt-4">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </Modal>
  );
};
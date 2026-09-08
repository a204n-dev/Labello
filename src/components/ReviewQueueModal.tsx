import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle2, ArrowRight, CheckCheck, RotateCcw, Settings } from 'lucide-react';
import { AudioFileItem } from '../types/workstation';
import { reviewQueue, ReviewQueueItem } from '../services/workflow/reviewQueue';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

interface ReviewQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: AudioFileItem[];
  onSelectFile: (id: string) => void;
  onAcceptAllHighConfidence: () => void;
}

export const ReviewQueueModal: React.FC<ReviewQueueModalProps> = ({
  isOpen,
  onClose,
  files,
  onSelectFile,
  onAcceptAllHighConfidence,
}) => {
  if (!isOpen) return null;

  const [queueItems, setQueueItems] = useState<ReviewQueueItem[]>([]);
  const [stats, setStats] = useState(reviewQueue.getStats());

  useEffect(() => {
    const unsubscribe = reviewQueue.subscribe(() => {
      setQueueItems(reviewQueue.getPending());
      setStats(reviewQueue.getStats());
    });
    setQueueItems(reviewQueue.getPending());
    setStats(reviewQueue.getStats());
    return unsubscribe;
  }, []);

  const reviewFiles = queueItems;
  const highConfidenceCount = files.filter(f => f.confidence >= 90).length;

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
          <span className="font-semibold text-state-success-text">{highConfidenceCount}</span> samples have verified >90% consensus.
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
        ) : (
          reviewFiles.map((item) => {
            const file = files.find(f => f.id === item.fileId);
            const auto = item.autoResult;
            const cv = auto.cvAnalysis;
            return (
              <div
                key={item.fileId}
                className="p-3 bg-bg-tertiary border border-border-subtle rounded-lg hover:border-border-default transition-colors"
              >
                <div className="min-w-0 pr-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-text-primary truncate">{item.fileName}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border flex items-center gap-1"
                      style={{ 
                        backgroundColor: auto.confidence.overall >= 80 ? 'rgba(16,185,129,0.15)' : auto.confidence.overall >= 60 ? 'rgba(245,158,11,0.15)' : 'rgba(248,113,113,0.15)',
                        borderColor: auto.confidence.overall >= 80 ? 'rgba(16,185,129,0.4)' : auto.confidence.overall >= 60 ? 'rgba(245,158,11,0.4)' : 'rgba(248,113,113,0.4)',
                        color: auto.confidence.overall >= 80 ? '#34d399' : auto.confidence.overall >= 60 ? '#fbbf24' : '#f87171'
                      }}>
                      {auto.confidence.overall}% Overall
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted border border-border-subtle">
                      {cv?.consonantType || '?'} ({cv?.consonantConfidence || 0}%)
                    </span>
                  </div>

                  <p className="text-xs text-text-muted mt-1 flex flex-wrap gap-2">
                    <span>SNR: {cv?.snrDb?.toFixed(1) || '?'} dB</span>
                    <span>C→V: {cv?.confidence?.vowelOnset || '?'}%</span>
                    <span>V.End: {cv?.confidence?.vowelEnd || '?'}%</span>
                    <span>Val: {auto.validation?.score || '?'}%</span>
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => {
                      reviewQueue.accept(item.fileId);
                      onSelectFile(item.fileId);
                      onClose();
                    }}
                    icon={<CheckCheck className="w-3 h-3" />}
                  >
                    Accept
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => { onSelectFile(item.fileId); onClose(); }} icon={<ArrowRight className="w-3.5 h-3.5" />}>
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
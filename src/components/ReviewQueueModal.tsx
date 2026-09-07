import React from 'react';
import { X, AlertTriangle, CheckCircle2, ArrowRight, CheckCheck } from 'lucide-react';
import { AudioFileItem } from '../types/workstation';

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

  const reviewFiles = files.filter(f => f.confidence < 70 || f.issues.length > 0);
  const highConfidenceCount = files.filter(f => f.confidence >= 90).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-slate-200">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Human-In-The-Loop Review Queue</h2>
              <p className="text-xs text-slate-400">
                {reviewFiles.length === 0
                  ? 'All vocal segments have high confidence. No manual intervention required.'
                  : `${reviewFiles.length} region${reviewFiles.length === 1 ? '' : 's'} require human verification before export.`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Batch Quick Action */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800/60 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            <span className="font-semibold text-emerald-400">{highConfidenceCount}</span> samples have verified &gt;90% consensus.
          </div>
          <button
            id="accept-high-conf-btn"
            onClick={onAcceptAllHighConfidence}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-md text-xs font-medium transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Accept All High-Confidence</span>
          </button>
        </div>

        {/* Review Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {reviewFiles.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <p className="font-medium text-sm text-slate-200">Review Queue is Clear</p>
              <p className="text-xs text-slate-500 mt-1">
                Your dataset meets the quality threshold. You can safely proceed to export.
              </p>
            </div>
          ) : (
            reviewFiles.map((file) => (
              <div
                key={file.id}
                className="p-3 bg-slate-950 rounded-lg border border-slate-800 hover:border-slate-700 flex items-center justify-between transition-colors"
              >
                <div className="min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-white">{file.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/60">
                      {file.confidence}% Confidence
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mt-1">
                    {file.issues.length > 0 
                      ? file.issues[0].message
                      : 'Multi-engine boundary delta exceeds tolerance window. Plosive vs vowel onset spread.'}
                  </p>
                </div>

                <button
                  onClick={() => {
                    onSelectFile(file.id);
                    onClose();
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-semibold shrink-0 transition-colors shadow-sm"
                >
                  <span>Inspect & Fix</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

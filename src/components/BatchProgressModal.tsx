import React from 'react';
import { Sparkles, Pause, Play, X, CheckCircle2 } from 'lucide-react';

interface BatchProgressModalProps {
  isOpen: boolean;
  isAnalyzing: boolean;
  isCancellationRequested: boolean;
  total: number;
  current: number;
  currentFileName: string;
  currentStage: string;
  isPaused: boolean;
  onTogglePause: () => void;
  onCancel: () => void;
}

export const BatchProgressModal: React.FC<BatchProgressModalProps> = ({
  isOpen,
  isAnalyzing,
  isCancellationRequested,
  total,
  current,
  currentFileName,
  currentStage,
  isPaused,
  onTogglePause,
  onCancel,
}) => {
  if (!isOpen) return null;

  const percent = total > 0 ? Math.round((current / total) * 100) : 0;
  const isComplete = !isAnalyzing;
  const isCancelling = isAnalyzing && isCancellationRequested;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden p-5 text-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Sparkles className={`w-5 h-5 ${!isComplete && !isPaused ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {isComplete
                  ? isCancellationRequested ? 'Batch cancelled' : 'Estimates ready'
                  : isCancelling ? 'Cancelling analysis' : 'Batch analysis'}
              </h3>
              <p className="text-xs text-slate-400" role="status">
                {isComplete
                  ? isCancellationRequested
                    ? 'Stopped after the current sample. Review any estimates already generated.'
                    : 'Review these single-engine acoustic estimates before export.'
                  : isCancelling
                    ? 'Finishing the current sample before stopping.'
                    : `Processing sample ${current} of ${total}`}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 truncate max-w-[240px] font-semibold">{currentFileName}</span>
            <span className="text-blue-400 font-bold">{percent}%</span>
          </div>
          <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-blue-500 transition-all duration-300 rounded-full"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Stage Status */}
        <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 text-xs font-mono flex items-center justify-between">
          <span className="text-slate-400">Stage:</span>
          <span className="text-slate-200 font-semibold truncate max-w-[260px]">{currentStage}</span>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-1">
          {!isComplete && !isCancelling && (
            <button
              onClick={onTogglePause}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-medium transition-colors"
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{isPaused ? 'Resume' : 'Pause'}</span>
            </button>
          )}
          <button
            onClick={onCancel}
            disabled={isCancelling}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              isComplete
                ? 'bg-blue-500 hover:bg-blue-400 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-60 disabled:pointer-events-none'
            }`}
          >
            {isComplete ? 'Done' : isCancelling ? 'Cancelling…' : 'Cancel batch'}
          </button>
        </div>
      </div>
    </div>
  );
};

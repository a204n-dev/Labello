import React from 'react';
import { X, ShieldAlert, CheckCircle, AlertTriangle, Info, FileText } from 'lucide-react';
import { DatasetHealthReport } from '../types/workstation';

interface DatasetHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: DatasetHealthReport;
  onSelectFile: (id: string) => void;
}

export const DatasetHealthModal: React.FC<DatasetHealthModalProps> = ({
  isOpen,
  onClose,
  report,
  onSelectFile,
}) => {
  if (!isOpen) return null;

  const score = report.overallScore;
  const scoreColor = score >= 90 ? 'text-emerald-400' : score >= 70 ? 'text-amber-400' : 'text-rose-400';
  const scoreBg = score >= 90 ? 'bg-emerald-500/10 border-emerald-500/30' : score >= 70 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-rose-500/10 border-rose-500/30';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-slate-200">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg border ${scoreBg} ${scoreColor}`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Dataset Quality & Health Checker</h2>
              <p className="text-xs text-slate-400">
                Automated acoustic and structural integrity audit for UTAU & DiffSinger training datasets.
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

        {/* Content Overview */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          
          {/* Top Score Banner */}
          <div className="grid grid-cols-4 gap-3">
            <div className={`p-4 rounded-xl border ${scoreBg} flex flex-col items-center justify-center text-center col-span-1`}>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Health Score</span>
              <span className={`text-3xl font-black ${scoreColor} mt-1`}>{score}</span>
              <span className="text-[10px] text-slate-400 mt-0.5">out of 100</span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-semibold text-slate-500">Total Audio Files</span>
              <span className="text-xl font-mono font-bold text-white">{report.totalFiles}</span>
              <span className="text-[11px] text-emerald-400 font-medium">{report.validFiles} fully verified</span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-semibold text-slate-500">Label Confidence</span>
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
                <span className="text-emerald-400">{report.highConfidenceCount} High</span>
                <span className="text-slate-600">/</span>
                <span className="text-amber-400">{report.mediumConfidenceCount} Med</span>
              </div>
              <span className="text-[11px] text-rose-400">{report.lowConfidenceCount} require review</span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-semibold text-slate-500">Acoustic Anomalies</span>
              <span className="text-xl font-mono font-bold text-slate-300">
                {report.statistics.clippedSamplesCount + report.statistics.overlappingCount}
              </span>
              <span className="text-[11px] text-slate-400">
                {report.statistics.clippedSamplesCount} clipped, {report.statistics.overlappingCount} overlap
              </span>
            </div>
          </div>

          {/* Detailed Issues Table */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>Detected Integrity Issues ({report.issues.length})</span>
            </h3>

            {report.issues.length === 0 ? (
              <div className="p-6 bg-slate-950 rounded-lg border border-slate-800 text-center text-slate-400">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-white">Zero Critical Defects Found</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  No missing audio, empty labels, or timing overlaps were detected.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {report.issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {issue.severity === 'error' ? (
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      ) : (
                        <Info className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 mr-2">
                          {issue.code}
                        </span>
                        <span className="text-slate-300">{issue.message}</span>
                      </div>
                    </div>

                    {issue.fileId && (
                      <button
                        onClick={() => {
                          onSelectFile(issue.fileId!);
                          onClose();
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded font-medium shrink-0 transition-colors"
                      >
                        Inspect
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
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

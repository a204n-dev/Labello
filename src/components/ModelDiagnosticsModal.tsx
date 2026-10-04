import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Cpu, Lock, Wrench, X } from 'lucide-react';
import { HardwareInfo } from '../types/workstation';

interface ModelDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const engineStatuses = [
  {
    name: 'UTAU OTO timing estimator',
    detail: 'Built-in local signal analysis. Produces initial timing estimates for manual review.',
    available: true,
  },
  {
    name: 'SOFA singing voice aligner',
    detail: 'Model and runtime are not bundled or configured in this build.',
    available: false,
  },
  {
    name: 'Whisper transcription',
    detail: 'Model and runtime are not bundled or configured in this build.',
    available: false,
  },
  {
    name: 'Montreal Forced Aligner',
    detail: 'Model and runtime are not bundled or configured in this build.',
    available: false,
  },
];

export const ModelDiagnosticsModal: React.FC<ModelDiagnosticsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [hardware, setHardware] = useState<HardwareInfo | null>(null);
  const [loadingHw, setLoadingHw] = useState(true);
  const [hardwareError, setHardwareError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoadingHw(true);
    setHardwareError(null);
    const loadHardware = window.labelloDesktop
      ? window.labelloDesktop.getHardwareInfo()
      : fetch('/api/hardware').then(async response => {
          if (!response.ok) throw new Error(`Hardware query failed (${response.status}).`);
          return response.json() as Promise<HardwareInfo>;
        });
    loadHardware
      .then(setHardware)
      .catch(err => setHardwareError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoadingHw(false));
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="engine-status-title"
        className="flex max-h-[min(88vh,820px)] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-800 bg-slate-950 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300" />
            <div className="min-w-0">
              <h2 id="engine-status-title" className="text-sm font-semibold text-white">Engine status</h2>
              <p className="mt-1 max-w-xl text-xs leading-5 text-slate-400">
                Availability in this build. Unavailable adapters do not run analysis.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close engine status"
            className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-4">
          <section aria-labelledby="hardware-title">
            <h3 id="hardware-title" className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Cpu className="h-4 w-4 text-indigo-300" />
              System
            </h3>
            {loadingHw ? (
              <p className="mt-3 text-xs text-slate-400" role="status">Reading system information...</p>
            ) : hardware ? (
              <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-3">
                <div>
                  <dt className="text-[11px] text-slate-400">Platform</dt>
                  <dd className="mt-0.5 text-sm font-medium text-slate-100">{hardware.platform} · {hardware.arch}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-slate-400">Processor</dt>
                  <dd className="mt-0.5 truncate text-sm font-medium text-slate-100" title={hardware.cpuModel}>{hardware.cpuCores} cores</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-slate-400">Memory</dt>
                  <dd className="mt-0.5 text-sm font-medium text-slate-100">{hardware.totalMemoryGb} GB</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-3 text-xs text-rose-300" role="alert">{hardwareError || 'System information is unavailable.'}</p>
            )}
          </section>

          <section aria-labelledby="engines-title">
            <h3 id="engines-title" className="text-xs font-semibold text-slate-300">Analysis engines</h3>
            <ul className="mt-2 divide-y divide-slate-800 border-y border-slate-800">
              {engineStatuses.map(engine => (
                <li key={engine.name} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <h4 className="text-sm font-medium text-slate-100">{engine.name}</h4>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{engine.detail}</p>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1.5 pt-0.5 text-xs font-medium ${engine.available ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {engine.available
                      ? <CheckCircle2 className="h-3.5 w-3.5" />
                      : <AlertCircle className="h-3.5 w-3.5" />}
                    {engine.available ? 'Available' : 'Not bundled'}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <p className="flex items-start gap-2 text-xs leading-5 text-slate-400">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
            Audio analysis currently runs locally. The built-in estimator suggests signal timing only; review each oto entry before using it in a voicebank.
          </p>
        </div>

        <footer className="flex shrink-0 justify-end border-t border-slate-800 bg-slate-950 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-md bg-indigo-500 px-3 text-xs font-semibold text-white transition-colors hover:bg-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
          >
            Close
          </button>
        </footer>
      </section>
    </div>
  );
};

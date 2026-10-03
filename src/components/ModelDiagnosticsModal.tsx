import React, { useState, useEffect } from 'react';
import { X, Cpu, HardDrive, CheckCircle2, AlertCircle, Wrench, ShieldCheck, Lock } from 'lucide-react';
import { HardwareInfo, ProjectSettings } from '../types/workstation';

interface ModelDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ProjectSettings;
  onUpdateSettings: (newSettings: Partial<ProjectSettings>) => void;
}

export const ModelDiagnosticsModal: React.FC<ModelDiagnosticsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  const [hardware, setHardware] = useState<HardwareInfo | null>(null);
  const [loadingHw, setLoadingHw] = useState<boolean>(true);
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
      .then(data => setHardware(data))
      .catch(err => setHardwareError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoadingHw(false));
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-slate-200">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Engine Diagnostics & Hardware Manager</h2>
              <p className="text-xs text-slate-400">
                Configure local offline processing engines, Windows platform acceleration, and automation aggressiveness.
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

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          
          {/* Hardware Awareness Banner */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-indigo-400" />
                <span>Detected Host Environment</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-semibold">
                {hardware?.platform || 'Checking'}
              </span>
            </div>

            {loadingHw ? (
              <div className="text-xs text-slate-500 py-2">Probing hardware specifications...</div>
            ) : hardware ? (
              <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-1">
                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">CPU Platform</div>
                  <div className="text-slate-200 font-bold truncate mt-0.5" title={hardware.cpuModel}>{hardware.cpuCores} Cores ({hardware.arch})</div>
                </div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">System Memory</div>
                  <div className="text-slate-200 font-bold mt-0.5">{hardware.totalMemoryGb} GB RAM</div>
                </div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">Recommended Workers</div>
                  <div className="text-indigo-400 font-bold mt-0.5">{hardware.recommendedWorkers} Threads</div>
                </div>
              </div>
            ) : <div className="text-xs text-rose-300 py-2">{hardwareError || 'Hardware information is unavailable.'}</div>}
          </div>

          {/* Model Status Matrix */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Integrated Analysis Engines
            </h3>
            <div className="space-y-1.5 text-xs">
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-200">SOFA (Singing Voice Forced Aligner)</div>
                  <div className="text-[11px] text-slate-400">Adapter not connected — no model is currently executed.</div>
                </div>
              <span className="flex items-center gap-1 text-amber-300 font-mono text-[11px] font-bold">
                <AlertCircle className="w-3.5 h-3.5" /> Unavailable
                </span>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-200">Whisper Phonetic ASR</div>
                  <div className="text-[11px] text-slate-400">Adapter not connected — no model is currently executed.</div>
                </div>
                <span className="flex items-center gap-1 text-amber-300 font-mono text-[11px] font-bold">
                <AlertCircle className="w-3.5 h-3.5" /> Unavailable
                </span>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-200">Montreal Forced Aligner (MFA)</div>
                  <div className="text-[11px] text-slate-400">Adapter not connected — no model is currently executed.</div>
                </div>
                <span className="flex items-center gap-1 text-amber-300 font-mono text-[11px] font-bold">
                <AlertCircle className="w-3.5 h-3.5" /> Unavailable
                </span>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-200">Acoustic DSP Engine (Zero-Crossing & Formants)</div>
                  <div className="text-[11px] text-slate-400">Web Audio API sub-millisecond spectral transient analyzer</div>
                </div>
                <span className="flex items-center gap-1 text-emerald-400 font-mono text-[11px] font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Built-in (Local)
                </span>
              </div>
            </div>
          </div>

          {/* Privacy & Processing Mode Settings */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Privacy & Processing Mode</span>
              </span>
              <span className="text-[10px] text-slate-500">Local-first privacy</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                id="mode-local-only-btn"
                onClick={() => onUpdateSettings({ processingMode: 'local_only' })}
                className={`p-2 rounded-lg border text-left transition-all ${
                  settings.processingMode === 'local_only'
                    ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold">Local Only</div>
                <div className="text-[10px] text-slate-400 mt-0.5">100% offline, zero network traffic.</div>
              </button>

              <button
                id="mode-prefer-local-btn"
                onClick={() => onUpdateSettings({ processingMode: 'prefer_local' })}
                className={`p-2 rounded-lg border text-left transition-all ${
                  settings.processingMode === 'prefer_local'
                    ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold">Prefer Local</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Recommended default setting.</div>
              </button>

              <button
                id="mode-online-fallback-btn"
                onClick={() => onUpdateSettings({ processingMode: 'online_fallback' })}
                className={`p-2 rounded-lg border text-left transition-all ${
                  settings.processingMode === 'online_fallback'
                    ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold">Online Fallback</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Not connected in this build.</div>
              </button>
            </div>
          </div>

          {/* Automation Aggressiveness & Workers */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Automation Aggressiveness
              </label>
              <select
                id="automation-level-select"
                value={settings.automationLevel}
                onChange={(e) => onUpdateSettings({ automationLevel: e.target.value as any })}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-md px-2.5 py-1.5 outline-none focus:border-indigo-500"
              >
                <option value="conservative">Conservative (Only accept &gt;95% confidence)</option>
                <option value="balanced">Balanced (Accept &gt;90%, flag questionable)</option>
                <option value="aggressive">Aggressive (Auto-resolve &gt;75% confidence)</option>
              </select>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Parallel Worker Threads
              </label>
              <select
                id="worker-count-select"
                value={settings.workerCount}
                onChange={(e) => onUpdateSettings({ workerCount: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-md px-2.5 py-1.5 outline-none focus:border-indigo-500"
              >
                <option value={2}>2 Threads (Low Memory)</option>
                <option value={4}>4 Threads (Balanced)</option>
                <option value={8}>8 Threads (High Performance)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-md transition-colors"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { 
  AudioWaveform, 
  Settings2, 
  Download, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Sliders,
  FolderOpen,
  Save,
  RotateCcw,
  RotateCw,
  Eye
} from 'lucide-react';
import { WorkstationMode, VoicebankProfileId } from '../types/workstation';
import { VOICEBANK_PROFILES } from '../services/oto/otoProfiles';

interface HeaderProps {
  mode: WorkstationMode;
  onModeChange: (mode: WorkstationMode) => void;
  profileId: VoicebankProfileId;
  onProfileChange: (profileId: VoicebankProfileId) => void;
  reviewCount: number;
  healthScore: number;
  isAnalyzing: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onBatchAnalyze: () => void;
  onOpenReviewQueue: () => void;
  onOpenHealth: () => void;
  onOpenDiagnostics: () => void;
  onOpenExport: () => void;
  onSaveProject: () => void;
  onLoadProject: () => void;
  enableSpectrogram: boolean;
  onToggleSpectrogram: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  onModeChange,
  profileId,
  onProfileChange,
  reviewCount,
  healthScore,
  isAnalyzing,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onBatchAnalyze,
  onOpenReviewQueue,
  onOpenHealth,
  onOpenDiagnostics,
  onOpenExport,
  onSaveProject,
  onLoadProject,
  enableSpectrogram,
  onToggleSpectrogram,
}) => {
  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between select-none text-slate-200">
      {/* Left: Brand & Mode Selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/30">
            <AudioWaveform className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white">VLabeler Next</span>
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                Workstation
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-none">Auto-OTO & DiffSinger Studio</p>
          </div>
        </div>

        <div className="h-5 w-[1px] bg-slate-800 mx-1" />

        {/* Mode Toggle Pills */}
        <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex items-center gap-1">
          <button
            id="mode-utau-btn"
            onClick={() => onModeChange('utau')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              mode === 'utau'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            UTAU Auto-OTO
          </button>
          <button
            id="mode-diffsinger-btn"
            onClick={() => onModeChange('diffsinger')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              mode === 'diffsinger'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            DiffSinger Dataset
          </button>
        </div>

        {/* Voicebank Profile (in UTAU mode) */}
        {mode === 'utau' && (
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <span className="text-slate-500 font-medium">Profile:</span>
            <select
              id="voicebank-profile-select"
              value={profileId}
              onChange={(e) => onProfileChange(e.target.value as VoicebankProfileId)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-md px-2 py-1 outline-none focus:border-indigo-500 transition-colors"
            >
              {VOICEBANK_PROFILES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Middle: Undo/Redo & View Toggles */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-md p-0.5">
          <button
            id="undo-btn"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1.5 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none rounded hover:bg-slate-800"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            id="redo-btn"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="p-1.5 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none rounded hover:bg-slate-800"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          id="toggle-spectrogram-btn"
          onClick={onToggleSpectrogram}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border transition-all ${
            enableSpectrogram
              ? 'bg-amber-950/40 text-amber-300 border-amber-700/60'
              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
          title="Toggle FFT Spectrogram Overlay"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Spectrogram</span>
        </button>

        {/* Review Queue Pill */}
        <button
          id="review-queue-btn"
          onClick={onOpenReviewQueue}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border transition-all ${
            reviewCount > 0
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
              : 'bg-slate-950 text-emerald-400 border-slate-800 hover:bg-slate-900'
          }`}
        >
          {reviewCount > 0 ? (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span>Review Queue</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              reviewCount > 0 ? 'bg-amber-500 text-slate-950' : 'bg-emerald-950 text-emerald-300'
            }`}
          >
            {reviewCount}
          </span>
        </button>

        {/* Dataset Health Score */}
        <button
          id="dataset-health-btn"
          onClick={onOpenHealth}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-900 transition-colors"
        >
          <Sliders className="w-3.5 h-3.5 text-indigo-400" />
          <span>Health</span>
          <span
            className={`font-semibold ${
              healthScore >= 90
                ? 'text-emerald-400'
                : healthScore >= 70
                ? 'text-amber-400'
                : 'text-rose-400'
            }`}
          >
            {healthScore}/100
          </span>
        </button>
      </div>

      {/* Right: Actions (Analyze, Save/Load, Diagnostics, Export) */}
      <div className="flex items-center gap-2">
        <button
          id="batch-analyze-btn"
          onClick={onBatchAnalyze}
          disabled={isAnalyzing}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-all shadow-sm shadow-indigo-600/20 disabled:opacity-50"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
          <span>{isAnalyzing ? 'Analyzing...' : 'Auto-Analyze All'}</span>
        </button>

        <div className="h-5 w-[1px] bg-slate-800 mx-1" />

        <button
          id="load-project-btn"
          onClick={onLoadProject}
          title="Open Workspace (.vbp)"
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
        >
          <FolderOpen className="w-4 h-4" />
        </button>

        <button
          id="save-project-btn"
          onClick={onSaveProject}
          title="Save Workspace (.vbp)"
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
        >
          <Save className="w-4 h-4" />
        </button>

        <button
          id="diagnostics-btn"
          onClick={onOpenDiagnostics}
          title="Hardware & Engine Diagnostics"
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
        >
          <Settings2 className="w-4 h-4" />
        </button>

        <button
          id="export-btn"
          onClick={onOpenExport}
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium px-3 py-1.5 rounded-md border border-slate-700 transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};

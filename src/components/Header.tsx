import React, { useState } from 'react';
import {
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
  Eye,
  Package,
  Menu,
  ChevronDown,
  HelpCircle,
  Keyboard,
  FileText,
  Layout,
  PanelRight,
  Settings,
} from 'lucide-react';
import { WorkstationMode, VoicebankProfileId } from '../types/workstation';
import { VOICEBANK_PROFILES } from '../services/oto/otoProfiles';
import { Dropdown } from './ui/Dropdown';

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
  onOpenReleases: () => void;
  onSaveProject: () => void;
  onLoadProject: () => void;
  onOpenAudio?: () => void;
  onOpenAudioFolder?: () => void;
  onImportOto?: () => void;
  onOpenReclistMatch?: () => void;
  enableSpectrogram: boolean;
  onToggleSpectrogram: () => void;
  onToggleSidebar?: () => void;
  onToggleProperties?: () => void;
  sidebarOpen?: boolean;
  propertiesOpen?: boolean;
}

const SHORTCUTS = [
  { key: 'Space', desc: 'Play / Pause' },
  { key: 'A', desc: 'Accept / Verify' },
  { key: 'Tab', desc: 'Next Review Item' },
  { key: 'Ctrl+Z', desc: 'Undo' },
  { key: 'Ctrl+Y', desc: 'Redo' },
  { key: '←/→', desc: 'Seek ±10ms' },
  { key: 'Shift+←/→', desc: 'Seek ±100ms' },
  { key: 'Home/End', desc: 'Start / End' },
  { key: 'Ctrl+Wheel', desc: 'Zoom' },
  { key: 'B', desc: 'Toggle Sidebar' },
  { key: 'P', desc: 'Toggle Properties' },
  { key: '?', desc: 'Show Shortcuts' },
];

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
  onOpenReleases,
  onSaveProject,
  onLoadProject,
  onOpenAudio,
  onOpenAudioFolder,
  onImportOto,
  onOpenReclistMatch,
  enableSpectrogram,
  onToggleSpectrogram,
  onToggleSidebar,
  onToggleProperties,
  sidebarOpen = true,
  propertiesOpen = true,
}) => {
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === '?' && e.shiftKey) {
      e.preventDefault();
      setShortcutsOpen(!shortcutsOpen);
    }
    if (e.key === 'Escape') {
      setFileMenuOpen(false);
      setViewMenuOpen(false);
      setShortcutsOpen(false);
    }
  };

  React.useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcutsOpen]);

  return (
    <>
      <header className="h-[var(--header-height)] bg-bg-secondary border-b border-border-subtle px-4 flex items-center justify-between select-none text-text-primary" onKeyDown={handleKeyDown}>
        {/* Left: Brand, Mode, Profile */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex items-center gap-2.5 shrink-0">
            <img src="/labello-icon.png" alt="" className="w-8 h-8 rounded-lg object-cover border border-border-subtle" />
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-text-primary">Labello</span>
                <a href="https://github.com/sdercolin/vlabeler" target="_blank" rel="noreferrer" className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-accent-bg text-accent-text border border-accent-border">
                  vLabeler + LabelMakr
                </a>
              </div>
              <p className="text-xs text-text-muted leading-none">Vocal dataset workstation</p>
            </div>
          </div>

          <div className="h-5 w-px bg-border-subtle mx-1 hidden sm:block" />

          {/* Mode Toggle */}
          <div className="bg-bg-tertiary p-1 rounded-lg border border-border-subtle flex items-center gap-1 shrink-0">
            <button onClick={() => onModeChange('utau')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${mode === 'utau' ? 'bg-mode-utau text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>UTAU Auto-OTO</button>
            <button onClick={() => onModeChange('diffsinger')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${mode === 'diffsinger' ? 'bg-mode-diffsinger text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>DiffSinger Dataset</button>
          </div>

          {/* Voicebank Profile (UTAU mode) */}
          {mode === 'utau' && (
            <div className="flex items-center gap-2 text-xs text-text-secondary shrink-0">
              <span className="text-text-muted font-medium">Profile:</span>
              <select value={profileId} onChange={(e) => onProfileChange(e.target.value as VoicebankProfileId)} className="bg-bg-tertiary border border-border-subtle text-text-primary text-xs rounded-md px-2 py-1 outline-none focus:border-border-focus transition-colors min-w-[160px]">
                {VOICEBANK_PROFILES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Center: Undo/Redo, View Toggles, Status */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Undo/Redo */}
          <div className="flex items-center bg-bg-tertiary border border-border-subtle rounded-lg p-1">
            <button onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" className="p-1.5 text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:pointer-events-none rounded transition-colors"><RotateCcw className="w-4 h-4" /></button>
            <button onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)" className="p-1.5 text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:pointer-events-none rounded transition-colors"><RotateCw className="w-4 h-4" /></button>
          </div>

          <div className="w-px h-5 bg-border-subtle mx-1" />

          {/* Spectrogram Toggle */}
          <button onClick={onToggleSpectrogram} className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition-all ${enableSpectrogram ? 'bg-state-info-bg text-state-info-text border-state-info-border' : 'bg-bg-tertiary text-text-secondary border-border-subtle hover:text-text-primary'}`} title="Toggle FFT Spectrogram (S)">
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Spectrogram</span>
          </button>

          {/* Review Queue */}
          <button onClick={onOpenReviewQueue} className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition-all ${reviewCount > 0 ? 'bg-state-warning-bg/20 text-state-warning-text border-state-warning-border/50 hover:bg-state-warning-bg/30' : 'bg-bg-tertiary text-state-success-text border-border-subtle hover:bg-bg-hover'}`}>
            {reviewCount > 0 ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Review Queue</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${reviewCount > 0 ? 'bg-state-warning-text text-bg-primary' : 'bg-state-success-bg text-state-success-text'}`}>{reviewCount}</span>
          </button>

          {/* Dataset Health */}
          <button onClick={onOpenHealth} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg bg-bg-tertiary border border-border-subtle text-text-secondary hover:bg-bg-hover transition-colors">
            <Sliders className="w-3.5 h-3.5 text-mode-utau" />
            <span className="hidden sm:inline">Health</span>
            <span className={`font-semibold ${healthScore >= 90 ? 'text-state-success-text' : healthScore >= 70 ? 'text-state-warning-text' : 'text-state-error-text'}`}>{healthScore}/100</span>
          </button>
        </div>

        {/* Right: Actions, File Menu, View Menu, Help */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Primary Action */}
          <button onClick={onBatchAnalyze} disabled={isAnalyzing} className="flex items-center gap-1.5 bg-mode-utau hover:bg-mode-utau/90 active:bg-mode-utau text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all shadow-sm shadow-mode-utau/20 disabled:opacity-50">
            <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'Analyzing...' : 'Auto-Analyze All'}</span>
          </button>

          <div className="h-5 w-px bg-border-subtle mx-1 hidden sm:block" />

          {/* File Menu */}
          <Dropdown
            trigger={<Menu className="w-4 h-4" />}
            align="right"
            items={[
              { label: 'Add Audio Files…', onClick: () => onOpenAudio?.(), icon: <FolderOpen className="w-3.5 h-3.5" />, shortcut: 'Ctrl+O' },
              { label: 'Open Audio Folder…', onClick: () => onOpenAudioFolder?.(), icon: <FolderOpen className="w-3.5 h-3.5" />, dividerAfter: true },
              { label: 'Import Base OTO (oto.ini)…', onClick: () => onImportOto?.(), icon: <FolderOpen className="w-3.5 h-3.5" />, dividerAfter: true },
              { label: 'Reclist Match Report…', onClick: () => onOpenReclistMatch?.(), icon: <FileText className="w-3.5 h-3.5" /> },
              { dividerAfter: true },
              { label: 'Open Project (.vbp)…', onClick: onLoadProject, icon: <FolderOpen className="w-3.5 h-3.5" /> },
              { label: 'Save Project (.vbp)', onClick: onSaveProject, icon: <Save className="w-3.5 h-3.5" />, shortcut: 'Ctrl+S' },
            ]}
          >
            <Menu className="w-4 h-4" />
          </Dropdown>

          {/* View Menu */}
          <Dropdown
            trigger={<Eye className="w-4 h-4" />}
            align="right"
            width="w-52"
            items={[
              { label: 'Toggle Sidebar', onClick: () => onToggleSidebar?.(), shortcut: 'B', icon: <Layout className="w-3.5 h-3.5" /> },
              { label: 'Toggle Properties', onClick: () => onToggleProperties?.(), shortcut: 'P', icon: <Settings className="w-3.5 h-3.5" />, dividerAfter: true },
              { label: 'Spectrogram Overlay', onClick: onToggleSpectrogram, icon: <Eye className="w-3.5 h-3.5" /> },
            ]}
          >
            <Eye className="w-4 h-4" />
          </Dropdown>

          {/* Help / Shortcuts */}
          <button onClick={() => setShortcutsOpen(!shortcutsOpen)} className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors" title="Keyboard Shortcuts (Shift+?)">
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Secondary Actions */}
          <div className="flex items-center gap-1">
            <button onClick={onLoadProject} title="Open Workspace (.vbp)" className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors"><FolderOpen className="w-4 h-4" /></button>
            <button onClick={onSaveProject} title="Save Workspace (.vbp) (Ctrl+S)" className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors"><Save className="w-4 h-4" /></button>
            <button onClick={onOpenDiagnostics} title="Hardware & Engine Diagnostics" className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors"><Settings2 className="w-4 h-4" /></button>
          </div>

          <div className="h-5 w-px bg-border-subtle mx-1" />

          {/* Export & Releases */}
          <button onClick={onOpenExport} className="flex items-center gap-1.5 bg-bg-tertiary hover:bg-bg-hover text-text-primary text-xs font-medium px-3 py-1.5 rounded-lg border border-border-subtle transition-all"><Download className="w-3.5 h-3.5" /><span>Export</span></button>
          <button onClick={onOpenReleases} className="flex items-center gap-1.5 bg-accent-bg/80 hover:bg-accent-bg text-accent-text text-xs font-semibold px-3 py-1.5 rounded-lg border border-accent-border/60 transition-all shadow-xs" title="About Labello and releases"><Package className="w-3.5 h-3.5" /><span>About</span></button>
        </div>
      </header>

      {/* Shortcuts Overlay */}
      {shortcutsOpen && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShortcutsOpen(false)}>
          <div className="w-full max-w-md bg-bg-secondary border border-border-default rounded-xl shadow-xl p-6 text-text-primary" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm">Keyboard Shortcuts</h3>
              <button onClick={() => setShortcutsOpen(false)} className="p-1 text-text-secondary hover:text-text-primary rounded-lg hover:bg-bg-tertiary"><Keyboard className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs max-h-64 overflow-auto">
              {SHORTCUTS.map(({ key, desc }) => (
                <div key={key} className="flex items-center gap-2 py-1">
                  <kbd className="px-2 py-0.5 bg-bg-tertiary border border-border-subtle rounded text-text-secondary font-mono">{key}</kbd>
                  <span className="text-text-secondary">{desc}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-text-muted mt-4 text-center">Press <kbd className="px-1.5 py-0.5 bg-bg-tertiary border border-border-subtle rounded">Shift+?</kbd> or <kbd className="px-1.5 py-0.5 bg-bg-tertiary border border-border-subtle rounded">Esc</kbd> to close</p>
          </div>
        </div>
      )}
    </>
  );
};
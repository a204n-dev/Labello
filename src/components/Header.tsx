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
  X,
} from 'lucide-react';
import { WorkstationMode, VoicebankProfileId } from '../types/workstation';
import { JAPANESE_VOICEBANK_PROFILES, VOICEBANK_PROFILES } from '../services/oto/otoProfiles';
import { Dropdown } from './ui/Dropdown';

interface HeaderProps {
  mode: WorkstationMode;
  projectName: string;
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
  onNewProject: () => void;
  onCloseProject: () => void;
  onOpenAudio?: () => void;
  onOpenAudioFolder?: () => void;
  onImportLabels?: () => void;
  onImportOto?: () => void;
  onPackageVoicebank?: () => void;
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
  projectName,
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
  onNewProject,
  onCloseProject,
  onOpenAudio,
  onOpenAudioFolder,
  onImportLabels,
  onImportOto,
  onPackageVoicebank,
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
  const modeAccent = mode === 'utau' ? 'text-mode-utau' : 'text-mode-diffsinger';
  const primaryActionAccent = mode === 'utau'
    ? 'bg-mode-utau hover:brightness-110 active:brightness-95'
    : 'bg-mode-diffsinger hover:brightness-110 active:brightness-95';

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
      <header className="relative z-20 min-h-[var(--header-height)] bg-bg-secondary border-b border-border-subtle px-3 py-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 2xl:px-4 select-none text-text-primary" onKeyDown={handleKeyDown}>
        {/* Left: Brand, project context, and UTAU format */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex items-center gap-2.5 shrink-0">
            <img src="/labello-icon.png" alt="" className="w-7 h-7 rounded-md object-cover border border-border-subtle" />
            <div className="hidden sm:block font-semibold text-[13px] tracking-tight text-text-primary">
              Labello
            </div>
          </div>

          <div className="h-5 w-px bg-border-subtle mx-1 hidden sm:block" />

          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 rounded-md border border-border-subtle bg-bg-tertiary px-2 py-1 text-[11px] font-medium text-text-secondary">
              {mode === 'utau' ? 'UTAU Voice Bank Maker' : 'Vocal dataset'}
            </span>
            <span className="max-w-40 truncate text-xs text-text-muted" title={projectName}>{projectName}</span>
          </div>

          {/* Voicebank Profile (UTAU mode) */}
          {mode === 'utau' && (
            <div className="flex items-center gap-2 text-xs text-text-secondary shrink-0">
              <label htmlFor="voicebank-format" className="text-text-muted font-medium">Format:</label>
              <select id="voicebank-format" aria-label="Japanese voicebank format" value={profileId} onChange={(e) => onProfileChange(e.target.value as VoicebankProfileId)} className="bg-bg-tertiary border border-border-subtle text-text-primary text-xs rounded-md px-2 py-1 outline-none focus:border-border-focus transition-colors min-w-[160px]">
                {JAPANESE_VOICEBANK_PROFILES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                {!JAPANESE_VOICEBANK_PROFILES.some(profile => profile.id === profileId) && (
                  <option value={profileId} disabled>{VOICEBANK_PROFILES.find(profile => profile.id === profileId)?.name || 'Legacy profile'}</option>
                )}
              </select>
            </div>
          )}
        </div>

        {/* Center: Undo/Redo, View Toggles, Status */}
        <div className="order-3 flex w-full min-w-0 flex-wrap items-center justify-start gap-1.5 border-t border-border-subtle pt-1.5">
          {/* Undo/Redo */}
          <div className="flex items-center bg-bg-tertiary border border-border-subtle rounded-md p-0.5">
            <button onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" className="min-h-7 min-w-7 rounded text-text-secondary hover:bg-bg-hover hover:text-text-primary disabled:opacity-30 disabled:pointer-events-none transition-colors"><RotateCcw className="mx-auto h-4 w-4" /></button>
            <button onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)" className="min-h-7 min-w-7 rounded text-text-secondary hover:bg-bg-hover hover:text-text-primary disabled:opacity-30 disabled:pointer-events-none transition-colors"><RotateCw className="mx-auto h-4 w-4" /></button>
          </div>

          <div className="w-px h-5 bg-border-subtle mx-1" />

          {/* Spectrogram Toggle */}
          <button onClick={onToggleSpectrogram} aria-pressed={enableSpectrogram} className={`flex min-h-8 items-center gap-1.5 px-2.5 text-xs rounded-md border transition-colors ${enableSpectrogram ? 'bg-accent-bg/50 text-accent-text border-accent-border' : 'bg-bg-tertiary text-text-secondary border-border-subtle hover:bg-bg-hover hover:text-text-primary'}`} title="Toggle FFT Spectrogram (S)">
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Spectrogram</span>
          </button>

          {/* Review Queue */}
          <button onClick={onOpenReviewQueue} className={`flex min-h-8 items-center gap-1.5 px-2.5 text-xs rounded-md border transition-colors ${reviewCount > 0 ? 'bg-state-warning-bg/20 text-state-warning-text border-state-warning-border/50 hover:bg-state-warning-bg/30' : 'bg-bg-tertiary text-text-secondary border-border-subtle hover:bg-bg-hover'}`}>
            {reviewCount > 0 ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Review Queue</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${reviewCount > 0 ? 'bg-state-warning-text text-bg-primary' : 'bg-state-success-bg text-state-success-text'}`}>{reviewCount}</span>
          </button>

          {/* Dataset Health */}
          <button onClick={onOpenHealth} className="flex min-h-8 items-center gap-1.5 px-2.5 text-xs rounded-md bg-bg-tertiary border border-border-subtle text-text-secondary hover:bg-bg-hover transition-colors">
            <Sliders className={`w-3.5 h-3.5 ${modeAccent}`} />
            <span className="hidden sm:inline">Health & Cleanup</span>
            <span className={`font-semibold ${healthScore >= 90 ? 'text-state-success-text' : healthScore >= 70 ? 'text-state-warning-text' : 'text-state-error-text'}`}>{healthScore}/100</span>
          </button>
        </div>

        {/* Right: Actions, File Menu, View Menu, Help */}
        <div className="order-2 ml-auto flex min-w-0 flex-wrap items-center justify-end gap-1.5">
          {/* Primary Action */}
          <button onClick={onBatchAnalyze} disabled={isAnalyzing} className={`flex min-h-8 items-center gap-1.5 text-text-inverse text-xs font-semibold px-3 rounded-md transition-colors disabled:opacity-50 ${primaryActionAccent}`}>
            <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'Analyzing...' : mode === 'utau' ? 'Estimate OTO All' : 'Estimate Labels'}</span>
          </button>

          <div className="h-5 w-px bg-border-subtle mx-1 hidden sm:block" />

          {/* File Menu */}
          <Dropdown
            trigger={<Menu className="w-4 h-4" />}
            align="right"
            items={[
              { label: 'Add Audio Files…', onClick: () => onOpenAudio?.(), icon: <FolderOpen className="w-3.5 h-3.5" />, shortcut: 'Ctrl+O' },
              { label: 'Open Audio Folder…', onClick: () => onOpenAudioFolder?.(), icon: <FolderOpen className="w-3.5 h-3.5" />, dividerAfter: mode === 'utau' },
              ...(mode === 'diffsinger' ? [
                { label: 'Import Phoneme Labels…', onClick: () => onImportLabels?.(), icon: <FileText className="w-3.5 h-3.5" />, dividerAfter: true },
              ] : []),
              ...(mode === 'utau' ? [
                { label: 'Import Base OTO (oto.ini)…', onClick: () => onImportOto?.(), icon: <FolderOpen className="w-3.5 h-3.5" />, dividerAfter: true },
                { label: 'Reclist Match Report…', onClick: () => onOpenReclistMatch?.(), icon: <FileText className="w-3.5 h-3.5" /> },
                { label: 'Package Voicebank…', onClick: () => onPackageVoicebank?.(), icon: <Package className="w-3.5 h-3.5" />, dividerAfter: true },
              ] : []),
              { dividerAfter: true },
              { label: 'New Project…', onClick: onNewProject, icon: <FileText className="w-3.5 h-3.5" /> },
              { label: 'Close Project…', onClick: onCloseProject, icon: <X className="w-3.5 h-3.5" /> },
              { label: 'Open Project (.labello; legacy .vbp)…', onClick: onLoadProject, icon: <FolderOpen className="w-3.5 h-3.5" /> },
              { label: 'Save Project (.labello)', onClick: onSaveProject, icon: <Save className="w-3.5 h-3.5" />, shortcut: 'Ctrl+S' },
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
          <button onClick={() => setShortcutsOpen(!shortcutsOpen)} aria-label="Keyboard shortcuts" className="min-h-8 min-w-8 text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-md transition-colors" title="Keyboard Shortcuts (Shift+?)">
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Secondary Actions */}
          <div className="flex items-center gap-1">
            <button onClick={onOpenDiagnostics} title="Engine availability and system information" aria-label="Engine availability and system information" className="min-h-8 min-w-8 text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-md transition-colors"><Settings2 className="mx-auto h-4 w-4" /></button>
          </div>

          <div className="h-5 w-px bg-border-subtle mx-1" />

          {/* Export & Releases */}
          <button onClick={onOpenExport} className="flex min-h-8 items-center gap-1.5 bg-bg-tertiary hover:bg-bg-hover text-text-primary text-xs font-medium px-3 rounded-md border border-border-default transition-colors"><Download className="w-3.5 h-3.5" /><span>Export</span></button>
          <button onClick={onOpenReleases} className="flex min-h-8 items-center gap-1.5 bg-bg-tertiary hover:bg-bg-hover text-text-primary text-xs font-medium px-3 rounded-md border border-border-default transition-colors" title="About Labello and releases"><Package className="w-3.5 h-3.5" /><span>About</span></button>
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
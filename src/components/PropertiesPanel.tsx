import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Check,
  RefreshCw,
  AlertTriangle,
  Info,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
  Filter,
  MoreVertical,
  Copy,
} from 'lucide-react';
import { AudioFileItem, OtoParameters, VoicebankProfile, WorkstationMode } from '../types/workstation';
import { validateOto } from '../services/oto/otoValidator';

interface PropertiesPanelProps {
  activeFile: AudioFileItem | null;
  mode: WorkstationMode;
  profile: VoicebankProfile;
  selectedPhonemeId: string | null;
  onUpdateOto: (oto: OtoParameters) => void;
  onUpdateAlias: (alias: string) => void;
  onUpdateLyrics: (lyrics: string) => void;
  onUpdatePhonemeText: (phonemeId: string, text: string) => void;
  onAcceptFileOrRegion: () => void;
  onReanalyzeCurrent: () => void;
  isOpen: boolean;
  onToggle: () => void;
  width: number;
  onWidthChange: (width: number) => void;
  defaultWidth: number;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  activeFile,
  mode,
  profile,
  selectedPhonemeId,
  onUpdateOto,
  onUpdateAlias,
  onUpdateLyrics,
  onUpdatePhonemeText,
  onAcceptFileOrRegion,
  onReanalyzeCurrent,
  isOpen,
  onToggle,
  width,
  onWidthChange,
  defaultWidth,
}) => {
  const [resizing, setResizing] = useState(false);
  const startWidthRef = useRef(0);
  const startXRef = useRef(0);

  const oto = activeFile?.oto;
  const otoValidation = oto && activeFile ? validateOto(oto, activeFile.durationMs) : null;

  const handleOtoChange = useCallback((key: keyof OtoParameters, value: number) => {
    if (!oto) return;
    onUpdateOto({ ...oto, [key]: value });
  }, [oto, onUpdateOto]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing(true);
    startWidthRef.current = width;
    startXRef.current = e.clientX;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    if (!resizing) return;
    const move = (e: MouseEvent) => {
      const delta = startXRef.current - e.clientX; // reversed for right panel
      const newWidth = Math.max(240, Math.min(480, startWidthRef.current + delta));
      onWidthChange(newWidth);
    };
    const up = () => {
      setResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [resizing, onWidthChange]);

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed right-0 top-[var(--header-height)] z-30 w-10 h-12 bg-bg-secondary border-l border-border-subtle flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
        title="Show Properties (P)"
        aria-label="Show Properties"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
    );
  }

  if (!activeFile) {
    return (
      <aside className="bg-bg-secondary border-l border-border-subtle flex flex-col select-none text-text-secondary overflow-hidden" style={{ width: `${width}px`, minWidth: '240px', maxWidth: '480px' }}>
        <div className="flex items-center justify-between p-3 border-b border-border-subtle/80">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Acoustic Properties</span>
          <button onClick={onToggle} className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors" title="Hide Properties (P)">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4 text-xs text-text-muted">
          Select a sample to inspect acoustic properties.
        </div>
      </aside>
    );
  }

  const selectedPhoneme = activeFile.phonemes?.find(p => p.id === selectedPhonemeId) || activeFile.phonemes?.[0];
  const isHigh = activeFile.confidence >= 90;
  const isMedium = activeFile.confidence >= 70 && activeFile.confidence < 90;

  return (
    <aside className="bg-bg-secondary border-l border-border-subtle flex flex-row shrink-0 select-none text-text-secondary overflow-hidden" style={{ width: `${width}px`, minWidth: '240px', maxWidth: '480px' }}>
      {/* Resize Handle */}
      <div
        className="w-1 h-full shrink-0 cursor-col-resize hover:bg-border-focus/50 transition-colors flex items-center justify-center"
        onMouseDown={handleResizeStart}
        title="Drag to resize"
        role="separator"
        aria-label="Resize properties panel"
      >
        <div className="w-px h-8 bg-border-subtle hover:bg-border-focus transition-colors" />
      </div>

      {/* Panel Content */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Panel Header */}
        <div className="p-3 border-b border-border-subtle/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Acoustic Properties</span>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
              isHigh ? 'bg-state-success-bg text-state-success-text border-state-success-border' :
              isMedium ? 'bg-state-warning-bg text-state-warning-text border-state-warning-border' :
              'bg-state-error-bg text-state-error-text border-state-error-border'
            }`}>
              {activeFile.confidence}% {isHigh ? 'High' : isMedium ? 'Moderate' : 'Needs Review'}
            </span>
          </div>
          <button onClick={onToggle} className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors" title="Hide Properties (P)">
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* File Info */}
          <div className="space-y-3 border-b border-border-subtle/80 pb-3">
            <div>
              <label className="text-[10px] uppercase font-semibold text-text-muted">File Name</label>
              <div className="font-mono text-xs text-text-primary mt-0.5 truncate" title={activeFile.name}>{activeFile.name}</div>
            </div>

            {/* Audio metadata */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] font-mono bg-bg-tertiary/50 border border-border-subtle/60 rounded-lg p-2">
              <span className="text-text-muted">Duration</span><span className="text-text-primary text-right">{(activeFile.durationMs / 1000).toFixed(3)}s</span>
              <span className="text-text-muted">Sample Rate</span><span className="text-text-primary text-right">{activeFile.sampleRate} Hz</span>
              <span className="text-text-muted">Channels</span><span className="text-text-primary text-right">{activeFile.channels === 1 ? '1 (mono)' : `${activeFile.channels} (stereo)`}</span>
              <span className="text-text-muted">Samples</span><span className="text-text-primary text-right">{Math.round((activeFile.durationMs / 1000) * activeFile.sampleRate).toLocaleString()}</span>
              <span className="text-text-muted">Size</span><span className="text-text-primary text-right">{(activeFile.sizeBytes / 1024).toFixed(1)} KB</span>
              <span className="text-text-muted">Status</span><span className="text-text-primary text-right">{activeFile.status}</span>
            </div>

            {mode === 'utau' ? (
              <div>
                <label className="text-[10px] uppercase font-semibold text-text-muted">UTAU Alias</label>
                <input id="alias-input" type="text" value={activeFile.alias || ''} onChange={(e) => onUpdateAlias(e.target.value)} placeholder="e.g. ka, - ka, a ka" className="w-full mt-1 bg-bg-tertiary border border-border-subtle rounded-lg px-2 py-1 text-xs font-mono text-text-primary focus:outline-none focus:border-border-focus transition-colors" />
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label htmlFor="lyrics-input" className="text-[10px] uppercase font-semibold text-text-muted">Expected phoneme sequence</label>
                  <textarea
                    id="lyrics-input"
                    value={activeFile.lyrics || ''}
                    onChange={(e) => onUpdateLyrics(e.target.value)}
                    placeholder="Enter phonemes separated by spaces, e.g. a i sh i t e r u"
                    rows={3}
                    className="w-full mt-1 resize-y bg-bg-tertiary border border-border-subtle rounded-lg px-2 py-1.5 text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus transition-colors"
                  />
                  <p className="mt-1 text-[10px] text-text-muted">Edit the transcript first, then re-analyze to create a fresh timing estimate.</p>
                </div>
                <div>
                  <label htmlFor="phoneme-input" className="text-[10px] uppercase font-semibold text-text-muted">Selected Phoneme</label>
                  <input id="phoneme-input" type="text" value={selectedPhoneme?.phoneme || ''} onChange={(e) => selectedPhoneme && onUpdatePhonemeText(selectedPhoneme.id, e.target.value)} className="w-full mt-1 bg-bg-tertiary border border-border-subtle rounded-lg px-2 py-1 text-xs font-mono text-text-primary focus:outline-none focus:border-border-focus transition-colors" />
                </div>
              </div>
            )}
          </div>

          {/* OTO Parameters */}
          {mode === 'utau' && oto && (
            <div className="space-y-3 border-b border-border-subtle/80 pb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-secondary flex items-center gap-1">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-mode-utau" />
                  <span>OTO Parameters</span>
                </span>
                <span className="text-[10px] text-text-muted" title={profile.description}>Japanese {profile.recordingStyle} · ms</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-blue-400 font-medium">Offset</label>
                  <input id="oto-offset-input" type="number" value={oto.offsetMs} onChange={(e) => handleOtoChange('offsetMs', Number(e.target.value))} className="w-full mt-0.5 bg-bg-tertiary border border-border-subtle rounded-lg px-2 py-1 font-mono text-xs focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div>
                  <label className="text-[10px] text-emerald-400 font-medium">Overlap</label>
                  <input id="oto-overlap-input" type="number" value={oto.overlapMs} onChange={(e) => handleOtoChange('overlapMs', Number(e.target.value))} className="w-full mt-0.5 bg-bg-tertiary border border-border-subtle rounded-lg px-2 py-1 font-mono text-xs focus:outline-none focus:border-emerald-500 transition-colors" />
                </div>
                <div>
                  <label className="text-[10px] text-rose-400 font-medium">Preutterance</label>
                  <input id="oto-preut-input" type="number" value={oto.preutteranceMs} onChange={(e) => handleOtoChange('preutteranceMs', Number(e.target.value))} className="w-full mt-0.5 bg-bg-tertiary border border-border-subtle rounded-lg px-2 py-1 font-mono text-xs focus:outline-none focus:border-rose-500 font-semibold transition-colors" />
                </div>
                <div>
                  <label className="text-[10px] text-pink-400 font-medium">Fixed (Consonant)</label>
                  <input id="oto-fixed-input" type="number" value={oto.fixedMs} onChange={(e) => handleOtoChange('fixedMs', Number(e.target.value))} className="w-full mt-0.5 bg-bg-tertiary border border-border-subtle rounded-lg px-2 py-1 font-mono text-xs focus:outline-none focus:border-pink-500 transition-colors" />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-indigo-400 font-medium">Cutoff (Negative from end)</label>
                <input id="oto-cutoff-input" type="number" value={oto.cutoffMs} onChange={(e) => handleOtoChange('cutoffMs', Number(e.target.value))} className="w-full mt-0.5 bg-bg-tertiary border border-border-subtle rounded-lg px-2 py-1 font-mono text-xs focus:outline-none focus:border-indigo-500 transition-colors" />
              </div>

              {otoValidation && otoValidation.issues.length > 0 && (
                <div className="space-y-1" role="status" aria-label="OTO timing validation">
                  {otoValidation.issues.map((issue, index) => (
                    <p key={`${issue.param}-${index}`} className={`text-[10px] ${issue.severity === 'error' ? 'text-state-error-text' : issue.severity === 'warning' ? 'text-state-warning-text' : 'text-text-muted'}`}>
                      {issue.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DiffSinger Phoneme Details */}
          {mode === 'diffsinger' && selectedPhoneme && (
            <div className="space-y-2 text-xs border-b border-border-subtle/80 pb-3">
              <div className="flex items-center justify-between text-text-muted"><span>Duration:</span><span className="font-mono text-text-primary">{selectedPhoneme.endMs - selectedPhoneme.startMs}ms</span></div>
              <div className="flex items-center justify-between text-text-muted"><span>Range:</span><span className="font-mono text-text-primary">{selectedPhoneme.startMs}ms - {selectedPhoneme.endMs}ms</span></div>
              <div className="flex items-center justify-between text-text-muted"><span>Pitch Note (F0):</span><span className="font-mono text-mode-utau">{selectedPhoneme.pitchNote || 'Unvoiced'}</span></div>
            </div>
          )}

          {/* Engine availability */}
          <div className="space-y-2 border-b border-border-subtle/80 pb-3">
            <span className="text-xs font-semibold text-text-secondary flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-mode-utau" />
              <span>Analysis status</span>
            </span>
            <div className="space-y-1.5 text-[10px]">
              <div className="flex items-center justify-between bg-bg-tertiary/50 px-2 py-1.5 rounded-lg border border-border-subtle/60">
                <span className="text-text-muted">Local acoustic DSP</span>
                <span className="text-state-success-text font-semibold">Available</span>
              </div>
              {['SOFA', 'Whisper', 'MFA'].map(engine => (
                <div key={engine} className="flex items-center justify-between bg-bg-tertiary/50 px-2 py-1.5 rounded-lg border border-border-subtle/60">
                  <span className="text-text-muted">{engine} adapter</span>
                  <span className="text-text-muted">Not connected</span>
                </div>
              ))}
            </div>
          </div>

          {/* Verification Diagnostic */}
          <div className="space-y-1.5 border-b border-border-subtle/80 pb-3">
            <div className="text-[10px] font-semibold text-text-muted flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-mode-utau" />
              <span>Verification Diagnostic</span>
            </div>
            <p className="text-[10px] text-text-secondary leading-relaxed bg-bg-tertiary/50 p-2 rounded-lg border border-border-subtle/60">
              {activeFile.confidence >= 70
                ? 'Review the proposed boundaries and confirm they match the audio before export.'
                : 'These boundaries are DSP-generated starting estimates only. SOFA, Whisper, and MFA are not connected; inspect and correct labels before export.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-auto space-y-2 pt-2 border-t border-border-subtle/80">
            <button id="accept-region-btn" onClick={onAcceptFileOrRegion} className="w-full flex items-center justify-center gap-1.5 bg-state-success-text/10 hover:bg-state-success-text/20 text-state-success-text font-semibold text-xs py-2 rounded-lg border border-state-success-border/30 transition-all">
              <Check className="w-3.5 h-3.5" />
              <span>Accept as Verified (A)</span>
            </button>
            <button id="reanalyze-single-btn" onClick={onReanalyzeCurrent} className="w-full flex items-center justify-center gap-1.5 bg-bg-tertiary hover:bg-bg-hover text-text-secondary text-xs py-1.5 rounded-lg border border-border-subtle transition-colors">
              <RefreshCw className="w-3.5 h-3.5 text-text-muted" />
              <span>Re-Analyze Sample</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
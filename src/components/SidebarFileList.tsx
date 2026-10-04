import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  FileAudio,
  Upload,
  Search,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Music,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Filter,
  MoreVertical,
} from 'lucide-react';
import { AudioFileItem, WorkstationMode } from '../types/workstation';

interface SidebarFileListProps {
  files: AudioFileItem[];
  activeFileId: string | null;
  mode: WorkstationMode;
  onSelectFile: (id: string) => void;
  onAddFiles: (newFiles: File[]) => void;
  onRequestAddFiles?: () => void;
  onLoadDemoVoicebank: () => void;
  onLoadDemoSingingPhrase: () => void;
  onDeleteFile: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  width: number;
  onWidthChange: (width: number) => void;
  defaultWidth: number;
}

export const SidebarFileList: React.FC<SidebarFileListProps> = ({
  files,
  activeFileId,
  mode,
  onSelectFile,
  onAddFiles,
  onRequestAddFiles,
  onLoadDemoVoicebank,
  onLoadDemoSingingPhrase,
  onDeleteFile,
  isOpen,
  onToggle,
  width,
  onWidthChange,
  defaultWidth,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const startWidthRef = useRef(0);
  const startXRef = useRef(0);

  const filteredFiles = files.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.alias && f.alias.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (f.lyrics && f.lyrics.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = (Array.from(e.dataTransfer.files) as File[]).filter(f => {
        const n = f.name.toLowerCase();
        return f.type.startsWith('audio/') ||
          n.endsWith('.wav') || n.endsWith('.mp3') || n.endsWith('.flac') ||
          n.endsWith('.ogg') || n.endsWith('.oga') || n.endsWith('.m4a');
      });
      if (droppedFiles.length > 0) onAddFiles(droppedFiles);
    }
  }, [onAddFiles]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) onAddFiles(Array.from(e.target.files));
  }, [onAddFiles]);

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
      const delta = e.clientX - startXRef.current;
      const newWidth = Math.max(200, Math.min(480, startWidthRef.current + delta));
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
        className="fixed left-0 top-[var(--header-height)] z-30 w-10 h-12 bg-bg-secondary border-r border-border-subtle flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
        title="Show File List (B)"
        aria-label="Show File List"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    );
  }

  return (
    <aside
      className="bg-bg-secondary border-r border-border-subtle flex flex-row shrink-0 select-none text-text-secondary transition-all duration-200"
      style={{ width: `${width}px`, minWidth: '200px', maxWidth: '480px' }}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {/* Resize Handle */}
      <div
        className="w-1 h-full cursor-col-resize hover:bg-border-focus/50 transition-colors flex items-center justify-center"
        onMouseDown={handleResizeStart}
        title="Drag to resize"
        role="separator"
        aria-label="Resize sidebar"
      >
        <div className="w-px h-8 bg-border-subtle hover:bg-border-focus transition-colors" />
      </div>

      {/* Sidebar Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-3 border-b border-border-subtle/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              {mode === 'utau' ? 'Voicebank Samples' : 'Vocal Dataset Samples'}
            </span>
            <span className="text-[10px] font-mono text-text-muted">{files.length} {files.length === 1 ? 'file' : 'files'}</span>
          </div>
          <button onClick={onToggle} className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors" title="Hide File List (B)">
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-2 border-b border-border-subtle/80">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              id="file-search-input"
              type="text"
              placeholder="Filter files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-bg-tertiary border border-border-subtle rounded-lg pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-border-focus transition-colors"
            />
          </div>
        </div>

        {/* Preset Generators & Import */}
        <div className="p-2 border-b border-border-subtle/80 flex flex-col gap-1.5 bg-bg-primary/50">
          {mode === 'utau' ? (
            <button onClick={onLoadDemoVoicebank} className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs bg-bg-tertiary hover:bg-bg-hover text-text-primary border border-border-subtle/60 transition-colors font-medium">
              <FileSpreadsheet className="w-3.5 h-3.5 text-mode-utau" />
              <span>Load Japanese CV Samples</span>
            </button>
          ) : (
            <button onClick={onLoadDemoSingingPhrase} className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs bg-bg-tertiary hover:bg-bg-hover text-text-primary border border-border-subtle/60 transition-colors font-medium">
              <Music className="w-3.5 h-3.5 text-mode-diffsinger" />
              <span>Load Singing Melody Phrase</span>
            </button>
          )}

          <div className="flex gap-1.5">
            <input type="file" multiple accept="audio/*,.wav,.flac,.mp3,.ogg,.oga,.m4a" ref={fileInputRef} onChange={handleFileInputChange} className="hidden" />
            <button onClick={() => onRequestAddFiles ? onRequestAddFiles() : fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[11px] bg-bg-tertiary hover:bg-bg-hover border border-border-subtle text-text-secondary rounded-lg transition-colors">
              <Upload className="w-3 h-3 text-text-muted" />
              <span>Import Audio</span>
            </button>
            <button className="p-1 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors" title="More options">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drag & Drop Overlay Hint */}
        {isDragging && (
          <div className="m-2 p-4 border-2 border-dashed border-mode-utau/80 rounded-lg bg-mode-utau/10 text-center flex flex-col items-center justify-center gap-1 text-mode-utau text-xs">
            <Upload className="w-6 h-6 animate-bounce" />
            <span>Drop audio files here</span>
          </div>
        )}

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
          {filteredFiles.length === 0 ? (
            <div className="text-center py-10 text-xs text-text-muted px-4">
              <FileAudio className="w-8 h-8 mx-auto mb-2 text-border-subtle" />
              <p>No audio files found.</p>
              <p className="text-[10px] text-text-muted mt-1">Import files or load demo samples above.</p>
            </div>
          ) : (
            filteredFiles.map((file) => {
              const isActive = file.id === activeFileId;
              const isHigh = file.confidence >= 90;
              const isMedium = file.confidence >= 70 && file.confidence < 90;

              return (
                <div
                  key={file.id}
                  id={`file-item-${file.id}`}
                  onClick={() => onSelectFile(file.id)}
                  className={`group flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-all border ${
                    isActive
                      ? 'bg-mode-utau/10 border-mode-utau/30 text-text-primary'
                      : 'border-transparent hover:bg-bg-tertiary text-text-secondary'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileAudio className={`w-4 h-4 shrink-0 ${isActive ? 'text-mode-utau' : 'text-text-muted'}`} />
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate leading-tight">{file.name}</div>
                      <div className="text-[10px] text-text-muted flex items-center gap-1.5 mt-0.5">
                        <span>{(file.durationMs / 1000).toFixed(2)}s</span>
                        {file.alias && (
                          <>
                            <span>•</span>
                            <span className="text-text-muted font-mono">[{file.alias}]</span>
                          </>
                        )}
                        {file.lyrics && (
                          <>
                            <span>•</span>
                            <span className="text-text-muted truncate max-w-[80px]">"{file.lyrics}"</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {file.status === 'analyzed' || file.status === 'verified' ? (
                      <span title={`Confidence: ${file.confidence}%`} className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold border ${
                        isHigh ? 'bg-state-success-bg text-state-success-text border-state-success-border' :
                        isMedium ? 'bg-state-warning-bg text-state-warning-text border-state-warning-border' :
                        'bg-state-error-bg text-state-error-text border-state-error-border'
                      }`}>
                        {file.confidence}%
                      </span>
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-border-default" title="Unprocessed" />
                    )}

                    <button
                      id={`delete-file-${file.id}`}
                      onClick={(e) => { e.stopPropagation(); onDeleteFile(file.id); }}
                      title="Remove file"
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-state-error-text rounded-lg transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Status */}
        <div className="p-2 border-t border-border-subtle/80 text-[10px] text-text-muted flex items-center justify-between bg-bg-primary/50">
          <span>UTF-8 / Shift-JIS</span>
          <span>CRLF</span>
        </div>
      </div>
    </aside>
  );
};
import React, { useRef, useState } from 'react';
import { 
  FileAudio, 
  Upload, 
  Search, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  Music,
  FileSpreadsheet
} from 'lucide-react';
import { AudioFileItem, WorkstationMode } from '../types/workstation';

interface SidebarFileListProps {
  files: AudioFileItem[];
  activeFileId: string | null;
  mode: WorkstationMode;
  onSelectFile: (id: string) => void;
  onAddFiles: (newFiles: File[]) => void;
  onLoadDemoVoicebank: () => void;
  onLoadDemoSingingPhrase: () => void;
  onDeleteFile: (id: string) => void;
}

export const SidebarFileList: React.FC<SidebarFileListProps> = ({
  files,
  activeFileId,
  mode,
  onSelectFile,
  onAddFiles,
  onLoadDemoVoicebank,
  onLoadDemoSingingPhrase,
  onDeleteFile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.alias && f.alias.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (f.lyrics && f.lyrics.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = (Array.from(e.dataTransfer.files) as File[]).filter(f => 
        f.type.startsWith('audio/') || f.name.endsWith('.wav') || f.name.endsWith('.mp3')
      );
      if (droppedFiles.length > 0) {
        onAddFiles(droppedFiles);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(Array.from(e.target.files));
    }
  };

  return (
    <aside 
      className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col h-[calc(100vh-3.5rem)] select-none text-slate-300"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {/* Top Header / Explorer Title */}
      <div className="p-3 border-b border-slate-800/80">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {mode === 'utau' ? 'Voicebank Samples' : 'Dataset Audio Files'}
          </span>
          <span className="text-[11px] font-mono text-slate-500">
            {files.length} {files.length === 1 ? 'file' : 'files'}
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
          <input
            id="file-search-input"
            type="text"
            placeholder="Filter files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-md pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Preset Generators & Import */}
      <div className="p-2 border-b border-slate-800/80 flex flex-col gap-1.5 bg-slate-900/30">
        {mode === 'utau' ? (
          <button
            id="load-demo-vb-btn"
            onClick={onLoadDemoVoicebank}
            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition-colors font-medium"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
            <span>Load Japanese CV Samples</span>
          </button>
        ) : (
          <button
            id="load-demo-singing-btn"
            onClick={onLoadDemoSingingPhrase}
            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition-colors font-medium"
          >
            <Music className="w-3.5 h-3.5 text-indigo-400" />
            <span>Load Singing Melody Phrase</span>
          </button>
        )}

        <div className="flex gap-1.5">
          <input
            type="file"
            multiple
            accept="audio/*,.wav,.mp3,.ogg,.flac"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            className="hidden"
          />
          <button
            id="import-files-btn"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[11px] bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded transition-colors"
          >
            <Upload className="w-3 h-3 text-slate-400" />
            <span>Import Audio</span>
          </button>
        </div>
      </div>

      {/* Drag & Drop Overlay Hint */}
      {isDragging && (
        <div className="m-2 p-4 border-2 border-dashed border-indigo-500/80 rounded-lg bg-indigo-950/20 text-center flex flex-col items-center justify-center gap-1 text-indigo-300 text-xs">
          <Upload className="w-6 h-6 animate-bounce" />
          <span>Drop WAV files here</span>
        </div>
      )}

      {/* Scrollable File List */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {filteredFiles.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-500 px-4">
            <FileAudio className="w-8 h-8 mx-auto mb-2 text-slate-700" />
            <p>No audio files found.</p>
            <p className="text-[11px] text-slate-600 mt-1">Import WAV files or click the sample button above.</p>
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
                className={`group flex items-center justify-between px-2.5 py-2 rounded-md cursor-pointer transition-all border ${
                  isActive
                    ? 'bg-indigo-950/40 border-indigo-500/50 text-white'
                    : 'border-transparent hover:bg-slate-900 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileAudio className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate leading-tight">
                      {file.name}
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span>{(file.durationMs / 1000).toFixed(2)}s</span>
                      {file.alias && (
                        <>
                          <span>•</span>
                          <span className="text-slate-400 font-mono">[{file.alias}]</span>
                        </>
                      )}
                      {file.lyrics && (
                        <>
                          <span>•</span>
                          <span className="text-slate-400 truncate max-w-[80px]">"{file.lyrics}"</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Indicator & Delete */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {file.status === 'analyzed' || file.status === 'verified' ? (
                    <span
                      title={`Confidence: ${file.confidence}%`}
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold border ${
                        isHigh
                          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                          : isMedium
                          ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                          : 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                      }`}
                    >
                      {file.confidence}%
                    </span>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-700" title="Unprocessed" />
                  )}

                  <button
                    id={`delete-file-${file.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFile(file.id);
                    }}
                    title="Remove file"
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 rounded transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Status Info */}
      <div className="p-2 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between bg-slate-950">
        <span>Encoding: UTF-8 / Shift-JIS</span>
        <span>Windows CRLF</span>
      </div>
    </aside>
  );
};

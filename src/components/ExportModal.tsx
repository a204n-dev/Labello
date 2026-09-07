import React, { useState } from 'react';
import { X, Download, Copy, Check, FileCode, Sliders } from 'lucide-react';
import { AudioFileItem, WorkstationMode, LineEnding, TextEncoding } from '../types/workstation';
import { generateOtoIniContent, createOtoIniBlob } from '../services/oto/otoExporter';
import { exportDiffSingerJson, exportLabText, exportTextGrid } from '../services/diffsinger/diffsingerExporter';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: AudioFileItem[];
  mode: WorkstationMode;
  activeFile: AudioFileItem | null;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  files,
  mode,
  activeFile,
}) => {
  const [lineEnding, setLineEnding] = useState<LineEnding>('CRLF');
  const [encoding, setEncoding] = useState<TextEncoding>('Shift-JIS');
  const [includeComments, setIncludeComments] = useState<boolean>(true);
  const [diffSingerFormat, setDiffSingerFormat] = useState<'ds_json' | 'lab' | 'textgrid'>('ds_json');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  // Generate output preview
  let outputText = '';
  let downloadFileName = '';

  if (mode === 'utau') {
    outputText = generateOtoIniContent(files, { lineEnding, encoding, includeComments });
    downloadFileName = 'oto.ini';
  } else {
    if (diffSingerFormat === 'ds_json') {
      outputText = exportDiffSingerJson(files);
      downloadFileName = 'dataset.ds';
    } else if (diffSingerFormat === 'lab') {
      const target = activeFile || files[0];
      outputText = target ? exportLabText(target, lineEnding) : '';
      downloadFileName = target ? `${target.name.replace(/\.[^/.]+$/, "")}.lab` : 'sample.lab';
    } else {
      const target = activeFile || files[0];
      outputText = target ? exportTextGrid(target) : '';
      downloadFileName = target ? `${target.name.replace(/\.[^/.]+$/, "")}.TextGrid` : 'sample.TextGrid';
    }
  }

  const handleDownload = () => {
    const blob = mode === 'utau'
      ? createOtoIniBlob(outputText, encoding)
      : new Blob([outputText], { type: 'text/plain;charset=utf-8' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] text-slate-200">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                Export {mode === 'utau' ? 'UTAU Voicebank OTO.INI' : 'DiffSinger Dataset Labels'}
              </h2>
              <p className="text-xs text-slate-400">
                Native Windows compatibility with CRLF line endings and configurable text encodings.
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

        {/* Configuration Row */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center gap-4 text-xs">
          {mode === 'utau' ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Encoding:</span>
                <select
                  id="encoding-select"
                  value={encoding}
                  onChange={(e) => setEncoding(e.target.value as TextEncoding)}
                  className="bg-slate-900 border border-slate-800 text-slate-200 rounded px-2 py-1 outline-none focus:border-indigo-500"
                >
                  <option value="Shift-JIS">Shift-JIS (Windows UTAU Native)</option>
                  <option value="UTF-8-BOM">UTF-8 with BOM (OpenUtau / Windows)</option>
                  <option value="UTF-8">UTF-8 Standard</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Line Endings:</span>
                <select
                  id="line-ending-select"
                  value={lineEnding}
                  onChange={(e) => setLineEnding(e.target.value as LineEnding)}
                  className="bg-slate-900 border border-slate-800 text-slate-200 rounded px-2 py-1 outline-none focus:border-indigo-500"
                >
                  <option value="CRLF">CRLF (\r\n - Windows Standard)</option>
                  <option value="LF">LF (\n - Unix)</option>
                </select>
              </div>

              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeComments}
                  onChange={(e) => setIncludeComments(e.target.checked)}
                  className="rounded border-slate-800 text-indigo-600 focus:ring-0"
                />
                <span>Include header comments</span>
              </label>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Format:</span>
              <select
                id="diffsinger-format-select"
                value={diffSingerFormat}
                onChange={(e) => setDiffSingerFormat(e.target.value as any)}
                className="bg-slate-900 border border-slate-800 text-slate-200 rounded px-2 py-1 outline-none focus:border-indigo-500"
              >
                <option value="ds_json">DiffSinger Dataset (.ds JSON)</option>
                <option value="lab">HTS / Phoneme Duration (.lab)</option>
                <option value="textgrid">Praat Interval Tier (.TextGrid)</option>
              </select>
            </div>
          )}
        </div>

        {/* Live Output Preview */}
        <div className="p-4 flex-1 flex flex-col min-h-0 bg-slate-950">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
              <FileCode className="w-3.5 h-3.5 text-indigo-400" />
              <span>{downloadFileName}</span>
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded hover:bg-slate-800 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>

          <pre className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-300 overflow-auto whitespace-pre leading-relaxed selection:bg-indigo-600">
            {outputText || '# No configured labels available to export.'}
          </pre>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {files.length} sample{files.length === 1 ? '' : 's'} included in export
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-md transition-colors"
            >
              Close
            </button>
            <button
              id="confirm-download-btn"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold rounded-md shadow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download {downloadFileName}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

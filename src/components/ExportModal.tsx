import React, { useState } from 'react';
import { X, Download, Copy, Check, FileCode, Sliders, ChevronDown } from 'lucide-react';
import { AudioFileItem, WorkstationMode, LineEnding, TextEncoding } from '../types/workstation';
import { generateOtoIniContent, createOtoIniBlob } from '../services/oto/otoExporter';
import { exportDiffSingerJson, exportLabText, exportTextGrid } from '../services/diffsinger/diffsingerExporter';
import { 
  generateVLabelerOtoProfile, 
  generateVLabelerDiffSingerProfile, 
  exportVLabelerProjectDescriptor 
} from '../services/vlabeler/vlabelerCompat';
import { Modal } from './ui/Modal';
import { Select } from './ui/Select';
import { Button } from './ui/Button';

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
  const [utauFormat, setUtauFormat] = useState<'oto_ini' | 'vlabeler_labeler' | 'vlabeler_project'>('oto_ini');
  const [diffSingerFormat, setDiffSingerFormat] = useState<'ds_json' | 'lab' | 'textgrid' | 'vlabeler_labeler' | 'vlabeler_project'>('ds_json');
  const [copied, setCopied] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Generate output preview
  let outputText = '';
  let downloadFileName = '';

  if (mode === 'utau') {
    if (utauFormat === 'oto_ini') {
      outputText = generateOtoIniContent(files, { lineEnding, encoding, includeComments });
      downloadFileName = 'oto.ini';
    } else if (utauFormat === 'vlabeler_labeler') {
      outputText = generateVLabelerOtoProfile();
      downloadFileName = 'oto.labeler.json';
    } else {
      outputText = exportVLabelerProjectDescriptor(files, 'utau');
      downloadFileName = 'vlabeler_project.json';
    }
  } else {
    if (diffSingerFormat === 'ds_json') {
      outputText = exportDiffSingerJson(files);
      downloadFileName = 'dataset.ds';
    } else if (diffSingerFormat === 'lab') {
      const target = activeFile || files[0];
      outputText = target ? exportLabText(target, lineEnding) : '';
      downloadFileName = target ? `${target.name.replace(/\.[^/.]+$/, "")}.lab` : 'sample.lab';
    } else if (diffSingerFormat === 'textgrid') {
      const target = activeFile || files[0];
      outputText = target ? exportTextGrid(target) : '';
      downloadFileName = target ? `${target.name.replace(/\.[^/.]+$/, "")}.TextGrid` : 'sample.TextGrid';
    } else if (diffSingerFormat === 'vlabeler_labeler') {
      outputText = generateVLabelerDiffSingerProfile();
      downloadFileName = 'diffsinger.labeler.json';
    } else {
      outputText = exportVLabelerProjectDescriptor(files, 'diffsinger');
      downloadFileName = 'vlabeler_project.json';
    }
  }

  const handleDownload = async () => {
    setExportError(null);
    if (window.labelloDesktop) {
      try {
        await window.labelloDesktop.saveExport(
          downloadFileName,
          outputText,
          mode === 'utau' && utauFormat === 'oto_ini' ? encoding : 'UTF-8'
        );
      } catch (err) {
        setExportError(err instanceof Error ? err.message : String(err));
      }
      return;
    }
    if (mode === 'utau' && utauFormat === 'oto_ini' && encoding === 'Shift-JIS') {
      setExportError('Shift-JIS output is available in the native desktop application. Choose UTF-8 or open the desktop app.');
      return;
    }
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

  const utauFormatOptions = [
    { value: 'oto_ini', label: 'Standard UTAU oto.ini' },
    { value: 'vlabeler_labeler', label: 'vLabeler Profile (oto.labeler.json)' },
    { value: 'vlabeler_project', label: 'vLabeler Project Descriptor (.json)' },
  ];

  const diffSingerFormatOptions = [
    { value: 'ds_json', label: 'DiffSinger Dataset (.ds JSON)' },
    { value: 'lab', label: 'HTS / Phoneme Duration (.lab)' },
    { value: 'textgrid', label: 'Praat Interval Tier (.TextGrid)' },
    { value: 'vlabeler_labeler', label: 'vLabeler Profile (diffsinger.labeler.json)' },
    { value: 'vlabeler_project', label: 'vLabeler Project Descriptor (.json)' },
  ];

  const encodingOptions = [
    { value: 'Shift-JIS', label: 'Shift-JIS (Windows UTAU Native)' },
    { value: 'UTF-8-BOM', label: 'UTF-8 with BOM (OpenUtau / Windows)' },
    { value: 'UTF-8', label: 'UTF-8 Standard' },
  ];

  const lineEndingOptions = [
    { value: 'CRLF', label: 'CRLF (\\r\\n - Windows Standard)' },
    { value: 'LF', label: 'LF (\\n - Unix)' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Export ${mode === 'utau' ? 'UTAU Voicebank OTO.INI' : 'DiffSinger Dataset Labels'}`}
      description="Native Windows compatibility with CRLF line endings and configurable text encodings."
      icon={<Download className="w-5 h-5" />}
      size="xl"
    >
      {/* Configuration Row */}
      <div className="flex flex-wrap items-center gap-4 text-xs mb-4 p-4 bg-bg-tertiary/50 border border-border-subtle/80 rounded-lg">
        {mode === 'utau' ? (
          <>
            <Select
              label="Format"
              value={utauFormat}
              onChange={(e) => setUtauFormat(e.target.value as any)}
              options={utauFormatOptions}
              placeholder="Select format"
              className="min-w-[200px]"
            />

            {utauFormat === 'oto_ini' && (
              <>
                <Select
                  label="Encoding"
                  value={encoding}
                  onChange={(e) => setEncoding(e.target.value as TextEncoding)}
                  options={encodingOptions}
                  placeholder="Select encoding"
                  className="min-w-[240px]"
                />

                <Select
                  label="Line Endings"
                  value={lineEnding}
                  onChange={(e) => setLineEnding(e.target.value as LineEnding)}
                  options={lineEndingOptions}
                  placeholder="Select line ending"
                  className="min-w-[220px]"
                />

                <label className="flex items-center gap-1.5 text-text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeComments}
                    onChange={(e) => setIncludeComments(e.target.checked)}
                    className="rounded border-border-subtle text-mode-utau focus:ring-0 w-3.5 h-3.5"
                  />
                  <span className="text-text-secondary">Include header comments</span>
                </label>
              </>
            )}
          </>
        ) : (
          <Select
            label="Format"
            value={diffSingerFormat}
            onChange={(e) => setDiffSingerFormat(e.target.value as any)}
            options={diffSingerFormatOptions}
            placeholder="Select format"
            className="min-w-[240px]"
          />
        )}
      </div>

      {/* Live Output Preview */}
      <div className="flex-1 flex flex-col min-h-0">
        {exportError && <div role="alert" className="mb-2 rounded-lg border border-state-error-border bg-state-error-bg px-3 py-2 text-xs text-state-error-text">{exportError}</div>}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-text-muted flex items-center gap-1">
            <FileCode className="w-3.5 h-3.5 text-mode-utau" />
            <span>{downloadFileName}</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            icon={copied ? <Check className="w-3.5 h-3.5 text-state-success-text" /> : <Copy className="w-3.5 h-3.5" />}
          >
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>

        <pre className="flex-1 bg-bg-tertiary border border-border-subtle rounded-lg p-3 text-xs font-mono text-text-secondary overflow-auto whitespace-pre leading-relaxed selection:bg-mode-utau/30">
          {outputText || '# No configured labels available to export.'}
        </pre>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border-subtle mt-4">
        <span className="text-xs text-text-muted">
          {files.length} sample{files.length === 1 ? '' : 's'} included in export
        </span>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="md" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" size="md" onClick={handleDownload} icon={<Download className="w-3.5 h-3.5" />}>
            Download {downloadFileName}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
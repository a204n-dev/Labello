/**
 * Phase 4 — Reclist Match Report Modal.
 * Shows comprehensive matching results between WAV files, reclist, and base OTO.
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Download, FileText, AlertCircle, CheckCircle, Search, ChevronDown, Filter, Copy } from 'lucide-react';
import { AudioFileItem, ParsedOtoEntry } from '../types/workstation';
import { parseReclist, matchAll, formatMatchReport, exportMatchCsv, ReclistEntry, MatchResult } from '../services/reclist/reclistParser';
import { Modal } from './ui/Modal';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface ReclistMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: AudioFileItem[];
  otoEntries: ParsedOtoEntry[];
  onSaveMatches?: (matches: MatchResult[]) => void;
}

export const ReclistMatchModal: React.FC<ReclistMatchModalProps> = ({
  isOpen,
  onClose,
  files,
  otoEntries,
  onSaveMatches,
}) => {
  const [step, setStep] = useState<'load' | 'review'>('load');
  const [reclistEntries, setReclistEntries] = useState<ReclistEntry[]>([]);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const [fuzzyThreshold, setFuzzyThreshold] = useState(75);
  const [filterMatch, setFilterMatch] = useState<string>('all');
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setErrors([]);
    setWarnings([]);
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const result = parseReclist(buf);
      if (result.errors.length > 0) {
        setErrors(result.errors);
        return;
      }
      setWarnings(result.warnings);
      setReclistEntries(result.entries);
      setStep('review');
    } catch (err) {
      setErrors([`Failed to read file: ${err instanceof Error ? err.message : String(err)}`]);
    }
  };

  const runMatching = () => {
    const results = matchAll(files, reclistEntries, otoEntries, {
      prefix,
      suffix,
      fuzzyThreshold,
    });
    setMatches(results);
  };

  useEffect(() => {
    if (step === 'review' && matches.length === 0 && reclistEntries.length > 0) {
      runMatching();
    }
  }, [step, reclistEntries, files, otoEntries, prefix, suffix, fuzzyThreshold]);

  const filteredMatches = matches.filter(m => {
    if (filterMatch !== 'all' && m.match !== filterMatch) return false;
    if (search) {
      const s = search.toLowerCase();
      return m.fileName.toLowerCase().includes(s) || m.alias.toLowerCase().includes(s);
    }
    return true;
  });

  const handleDownloadReport = () => {
    const report = formatMatchReport(matches);
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'match-report.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = () => {
    const csv = exportMatchCsv(matches);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'match-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyReport = () => {
    navigator.clipboard.writeText(formatMatchReport(matches));
  };

  if (!isOpen) return null;

  if (step === 'load') {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Reclist Match Report"
        icon={<FileText className="w-5 h-5" />}
        size="md"
      >
        <div className="space-y-4">
          <div
            className="text-center py-8 border-2 border-dashed border-border-default rounded-lg hover:border-border-focus hover:bg-bg-tertiary/50 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-border-focus', 'bg-bg-tertiary/50'); }}
            onDragLeave={e => e.currentTarget.classList.remove('border-border-focus', 'bg-bg-tertiary/50')}
            onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('border-border-focus', 'bg-bg-tertiary/50'); if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]); }}>
            <input ref={fileInputRef} type="file" accept=".txt,.lst,.reclist" className="hidden" onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
            <FileText className="w-12 h-12 mx-auto mb-3 text-text-muted" />
            <p className="text-sm font-medium text-text-primary">Drop reclist.txt here or click to select</p>
            <p className="text-xs text-text-muted mt-1">UTF-8 / Shift-JIS auto-detected</p>
          </div>

          {errors.length > 0 && (
            <div className="bg-state-error-bg border border-state-error-border rounded-lg p-3 text-state-error-text text-sm space-y-1">
              {errors.map((e, i) => <div key={i} className="flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{e}</div>)}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs">
            <Input label="Filename Prefix (e.g. singer_)" value={prefix} onChange={e => setPrefix(e.target.value)} placeholder="optional" />
            <Input label="Filename Suffix (e.g. _mono)" value={suffix} onChange={e => setSuffix(e.target.value)} placeholder="optional" />
            <label className="text-xs font-medium text-text-muted block mb-1">Fuzzy Threshold</label>
            <input type="range" min={50} max={95} value={fuzzyThreshold} onChange={e => setFuzzyThreshold(Number(e.target.value))} className="accent-mode-utau w-full" />
            <div className="text-right text-xs text-text-muted">{fuzzyThreshold}%</div>
          </div>

          <div className="pt-2 flex gap-2">
            <Button onClick={runMatching} disabled={reclistEntries.length === 0} className="flex-1">
              Generate Match Report
            </Button>
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // Step 2: Review matches
  const counts = {
    exact: matches.filter(m => m.match === 'exact').length,
    fuzzy: matches.filter(m => m.match === 'fuzzy').length,
    missing_wav: matches.filter(m => m.match === 'missing_wav').length,
    missing_reclist: matches.filter(m => m.match === 'missing_reclist').length,
    missing_oto: matches.filter(m => m.match === 'missing_oto').length,
    duplicate: matches.filter(m => m.match === 'duplicate').length,
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Match Results"
      description={`${matches.length} entries — ${files.length} WAVs, ${reclistEntries.length} reclist entries, ${otoEntries.length} OTO entries`}
      icon={<CheckCircle className="w-5 h-5" />}
      iconBg="bg-state-success-bg/10"
      iconColor="text-state-success-text"
      size="xl"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleCopyReport} icon={<Copy className="w-3.5 h-3.5" />}>
            Copy
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDownloadReport} icon={<Download className="w-3.5 h-3.5" />}>
            TXT
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDownloadCsv} icon={<FileText className="w-3.5 h-3.5" />}>
            CSV
          </Button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <span className="px-2 py-0.5 bg-state-success-bg text-state-success-text border border-state-success-border rounded">✓ Exact: {counts.exact}</span>
        <span className="px-2 py-0.5 bg-state-warning-bg text-state-warning-text border border-state-warning-border rounded">~ Fuzzy: {counts.fuzzy}</span>
        <span className="px-2 py-0.5 bg-state-error-bg text-state-error-text border border-state-error-border rounded">✗ No WAV: {counts.missing_wav}</span>
        <span className="px-2 py-0.5 bg-state-error-bg text-state-error-text border border-state-error-border rounded">✗ No Reclist: {counts.missing_reclist}</span>
        <span className="px-2 py-0.5 bg-state-error-bg text-state-error-text border border-state-error-border rounded">✗ No OTO: {counts.missing_oto}</span>
        <span className="px-2 py-0.5 bg-state-warning-bg text-state-warning-text border border-state-warning-border rounded">⚠ Dup: {counts.duplicate}</span>
      </div>

      {/* Filter/Search */}
      <div className="mb-4 flex flex-wrap gap-2 items-center text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          <input
            type="text"
            placeholder="Search file/alias..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-bg-tertiary border border-border-subtle text-text-primary rounded-lg pl-8 pr-3 py-1.5 outline-none focus:border-border-focus transition-colors"
          />
        </div>
        <Select
          value={filterMatch}
          onChange={e => setFilterMatch(e.target.value)}
          options={[
            { value: 'all', label: 'All' },
            { value: 'exact', label: 'Exact' },
            { value: 'fuzzy', label: 'Fuzzy' },
            { value: 'missing_wav', label: 'Missing WAV' },
            { value: 'missing_reclist', label: 'Missing Reclist' },
            { value: 'missing_oto', label: 'Missing OTO' },
            { value: 'duplicate', label: 'Duplicate' },
          ]}
          placeholder="Filter by match type"
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs font-mono border-collapse">
          <thead className="sticky top-0 bg-bg-tertiary">
            <tr className="text-text-muted border-b border-border-subtle">
              <th className="text-left py-2 px-2">File</th>
              <th className="text-left py-2 px-2">Alias</th>
              <th className="text-center py-2 px-2">Match</th>
              <th className="text-right py-2 px-2">Conf</th>
              <th className="text-left py-2 px-2">Issues</th>
              <th className="text-center py-2 px-2">WAV</th>
              <th className="text-center py-2 px-2">Reclist</th>
              <th className="text-center py-2 px-2">OTO</th>
            </tr>
          </thead>
          <tbody>
            {filteredMatches.map((m, i) => (
              <tr key={i} className={`border-b border-border-subtle/50 hover:bg-bg-tertiary/50 ${m.match === 'exact' ? 'bg-state-success-bg/20' : m.match.startsWith('missing') ? 'bg-state-error-bg/20' : m.match === 'duplicate' ? 'bg-state-warning-bg/20' : ''}`}>
                <td className="py-1.5 px-2 truncate max-w-[200px] text-text-secondary">{m.fileName}</td>
                <td className="py-1.5 px-2 text-text-primary">{m.alias}</td>
                <td className="py-1.5 px-2 text-center">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    m.match === 'exact' ? 'bg-state-success-bg text-state-success-text border border-state-success-border' :
                    m.match === 'fuzzy' ? 'bg-state-warning-bg text-state-warning-text border border-state-warning-border' :
                    m.match.startsWith('missing') ? 'bg-state-error-bg text-state-error-text border border-state-error-border' :
                    'bg-state-warning-bg text-state-warning-text border border-state-warning-border'
                  }`}>
                    {m.match}
                  </span>
                </td>
                <td className="py-1.5 px-2 text-right">
                  <span className={m.confidence >= 80 ? 'text-state-success-text' : m.confidence >= 60 ? 'text-state-warning-text' : 'text-state-error-text'}>
                    {m.confidence}%
                  </span>
                </td>
                <td className="py-1.5 px-2 text-text-muted">{m.issues.join('; ') || '—'}</td>
                <td className="py-1.5 px-2 text-center">{m.audioFile ? <CheckCircle className="w-3.5 h-3.5 text-state-success-text mx-auto" /> : <span className="text-state-error-text">✗</span>}</td>
                <td className="py-1.5 px-2 text-center">{m.reclistEntry ? <CheckCircle className="w-3.5 h-3.5 text-state-success-text mx-auto" /> : <span className="text-state-error-text">✗</span>}</td>
                <td className="py-1.5 px-2 text-center">{m.otoEntry ? <CheckCircle className="w-3.5 h-3.5 text-state-success-text mx-auto" /> : <span className="text-state-error-text">✗</span>}</td>
              </tr>
            ))}
            {filteredMatches.length === 0 && (
              <tr><td colSpan={8} className="py-8 text-center text-text-muted">No matches found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border-subtle mt-4">
        <Button variant="secondary" onClick={() => setStep('load')}>
          Back
        </Button>
        {onSaveMatches && (
          <Button variant="success" onClick={() => { onSaveMatches(matches); onClose(); }} icon={<CheckCircle className="w-3.5 h-3.5" />}>
            Save & Use for OTO Update
          </Button>
        )}
      </div>
    </Modal>
  );
};
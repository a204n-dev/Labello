/**
 * Phase 4 — Reclist Match Report Modal.
 * Shows comprehensive matching results between WAV files, reclist, and base OTO.
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Download, FileText, AlertCircle, CheckCircle, Search, ChevronDown, Filter, Copy } from 'lucide-react';
import { AudioFileItem, ParsedOtoEntry } from '../types/workstation';
import { parseReclist, matchAll, formatMatchReport, exportMatchCsv, ReclistEntry, MatchResult } from '../services/reclist/reclistParser';

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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden text-slate-200">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <FileText className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-bold text-white">Reclist Match Report</h2>
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"><X className="w-4 h-4" /></button>
          </div>

          <div className="p-5 space-y-4">
            <div className="text-center py-6 border-2 border-dashed border-slate-700 rounded-lg"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-indigo-500', 'bg-indigo-950/30'); }}
              onDragLeave={e => e.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-950/30')}
              onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-950/30'); if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]); }}>
              <input ref={fileInputRef} type="file" accept=".txt,.lst,.reclist" className="hidden" onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
              <FileText className="w-10 h-10 mx-auto mb-2 text-slate-500" />
              <p className="text-sm font-medium">Drop reclist.txt here or click to select</p>
              <p className="text-xs text-slate-500 mt-1">UTF-8 / Shift-JIS auto-detected</p>
            </div>

            {errors.length > 0 && (
              <div className="bg-rose-950/60 border border-rose-800/60 rounded p-3 text-rose-200 text-sm space-y-1">
                {errors.map((e, i) => <div key={i} className="flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{e}</div>)}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="font-medium text-slate-400">Filename Prefix (e.g. singer_)</label>
              <input value={prefix} onChange={e => setPrefix(e.target.value)} className="bg-slate-900 border border-slate-800 text-slate-200 rounded px-2 py-1" placeholder="optional" />
              <label className="font-medium text-slate-400">Filename Suffix (e.g. _mono)</label>
              <input value={suffix} onChange={e => setSuffix(e.target.value)} className="bg-slate-900 border border-slate-800 text-slate-200 rounded px-2 py-1" placeholder="optional" />
              <label className="font-medium text-slate-400">Fuzzy Threshold</label>
              <input type="range" min={50} max={95} value={fuzzyThreshold} onChange={e => setFuzzyThreshold(Number(e.target.value))} className="accent-indigo-500 w-full" />
            </div>

            <div className="pt-2 flex gap-2">
              <button onClick={runMatching} disabled={reclistEntries.length === 0} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded">
                Generate Match Report
              </button>
              <button onClick={onClose} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] text-slate-200">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Match Results</h2>
              <p className="text-xs text-slate-400">{matches.length} entries — {files.length} WAVs, {reclistEntries.length} reclist, {otoEntries.length} OTO</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleCopyReport} className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 rounded text-slate-300"><Copy className="w-3.5 h-3.5 mr-1" />Copy</button>
            <button onClick={handleDownloadReport} className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 rounded text-slate-300"><Download className="w-3.5 h-3.5 mr-1" />TXT</button>
            <button onClick={handleDownloadCsv} className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 rounded text-slate-300"><FileText className="w-3.5 h-3.5 mr-1" />CSV</button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Summary bar */}
        <div className="px-4 py-2 border-b border-slate-800 bg-slate-950/50 flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-0.5 bg-emerald-950/50 text-emerald-300 rounded">✓ Exact: {counts.exact}</span>
          <span className="px-2 py-0.5 bg-amber-950/50 text-amber-300 rounded">~ Fuzzy: {counts.fuzzy}</span>
          <span className="px-2 py-0.5 bg-rose-950/50 text-rose-300 rounded">✗ No WAV: {counts.missing_wav}</span>
          <span className="px-2 py-0.5 bg-rose-950/50 text-rose-300 rounded">✗ No Reclist: {counts.missing_reclist}</span>
          <span className="px-2 py-0.5 bg-rose-950/50 text-rose-300 rounded">✗ No OTO: {counts.missing_oto}</span>
          <span className="px-2 py-0.5 bg-amber-950/50 text-amber-300 rounded">⚠ Dup: {counts.duplicate}</span>
        </div>

        {/* Filter/Search */}
        <div className="px-4 py-2 border-b border-slate-800 bg-slate-950/50 flex flex-wrap gap-2 items-center text-xs">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search file/alias..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded pl-8 pr-3 py-1.5 outline-none focus:border-indigo-500"
            />
          </div>
          <select
            value={filterMatch}
            onChange={e => setFilterMatch(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-200 rounded px-2 py-1.5 outline-none focus:border-indigo-500"
          >
            <option value="all">All</option>
            <option value="exact">Exact</option>
            <option value="fuzzy">Fuzzy</option>
            <option value="missing_wav">Missing WAV</option>
            <option value="missing_reclist">Missing Reclist</option>
            <option value="missing_oto">Missing OTO</option>
            <option value="duplicate">Duplicate</option>
          </select>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-4">
          <table className="w-full text-xs font-mono border-collapse">
            <thead className="sticky top-0 bg-slate-950">
              <tr className="text-slate-500 border-b border-slate-800">
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
                <tr key={i} className={`border-b border-slate-800/50 hover:bg-slate-900/50 ${m.match === 'exact' ? 'bg-emerald-950/20' : m.match.startsWith('missing') ? 'bg-rose-950/20' : m.match === 'duplicate' ? 'bg-amber-950/20' : ''}`}>
                  <td className="py-1.5 px-2 truncate max-w-[200px] text-slate-300">{m.fileName}</td>
                  <td className="py-1.5 px-2 text-white">{m.alias}</td>
                  <td className="py-1.5 px-2 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      m.match === 'exact' ? 'bg-emerald-950/60 text-emerald-300' :
                      m.match === 'fuzzy' ? 'bg-amber-950/60 text-amber-300' :
                      m.match.startsWith('missing') ? 'bg-rose-950/60 text-rose-300' :
                      'bg-amber-950/60 text-amber-300'
                    }`}>
                      {m.match}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-right">
                    <span className={m.confidence >= 80 ? 'text-emerald-400' : m.confidence >= 60 ? 'text-amber-400' : 'text-rose-400'}>
                      {m.confidence}%
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-slate-500">{m.issues.join('; ') || '—'}</td>
                  <td className="py-1.5 px-2 text-center">{m.audioFile ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mx-auto" /> : <span className="text-rose-400">✗</span>}</td>
                  <td className="py-1.5 px-2 text-center">{m.reclistEntry ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mx-auto" /> : <span className="text-rose-400">✗</span>}</td>
                  <td className="py-1.5 px-2 text-center">{m.otoEntry ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mx-auto" /> : <span className="text-rose-400">✗</span>}</td>
                </tr>
              ))}
              {filteredMatches.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-slate-500">No matches found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <button onClick={() => setStep('load')} className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded">
            Back
          </button>
          {onSaveMatches && (
            <button
              onClick={() => { onSaveMatches(matches); onClose(); }}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded shadow-sm"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Save & Use for OTO Update</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
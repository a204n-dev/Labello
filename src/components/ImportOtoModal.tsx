/**
 * Phase 3 — Import Base OTO Modal.
 * Load existing oto.ini for Update/Hybrid modes.
 */

import React, { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, HelpCircle, Sliders } from 'lucide-react';
import { OtoParameters, ParsedOtoEntry } from '../../types/workstation';
import { parseOtoIni, ParsedOtoEntry as ParsedEntry } from '../../services/oto/otoParser';
import { compareBatch, formatComparisonTable, OtoComparisonResult } from '../../services/oto/otoUpdater';
import { matchReimportedFile } from '../../services/audio/projectStore';
import { AudioFileItem } from '../../types/workstation';

interface ImportOtoModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: AudioFileItem[];
  onImported: (comparisons: OtoComparisonResult[]) => void;
}

export const ImportOtoModal: React.FC<ImportOtoModalProps> = ({
  isOpen,
  onClose,
  files,
  onImported,
}) => {
  const [step, setStep] = useState<'file' | 'review'>('file');
  const [baseEntries, setBaseEntries] = useState<ParsedEntry[]>([]);
  const [comparisons, setComparisons] = useState<OtoComparisonResult[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [encoding, setEncoding] = useState<'UTF-8' | 'Shift-JIS' | 'UTF-8-BOM'>('Shift-JIS');
  const [mode, setMode] = useState<'update' | 'hybrid'>('hybrid');
  const [hybridThreshold, setHybridThreshold] = useState(75);
  const [acceptedParams, setAcceptedParams] = useState<Record<string, Set<keyof OtoParameters>>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setErrors([]);
    setWarnings([]);
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const result = parseOtoIni(buf);
      if (result.errors.length > 0) {
        setErrors(result.errors);
        return;
      }
      setWarnings(result.warnings);
      setBaseEntries(result.entries);
      setStep('review');
    } catch (err) {
      setErrors([`Failed to read file: ${err instanceof Error ? err.message : String(err)}`]);
    }
  };

  const handleGenerateComparisons = () => {
    // Build generated OTO map from current files (they should have been analyzed)
    const generatedMap = new Map<string, OtoParameters>();
    const durations = new Map<string, number>();
    const aliasMap = new Map<string, string>();

    for (const f of files) {
      if (f.oto) {
        generatedMap.set(f.name, f.oto);
        durations.set(f.name, f.durationMs);
        aliasMap.set(f.name, f.alias || f.name.replace(/\.[^/.]+$/, ''));
      }
    }

    if (generatedMap.size === 0) {
      setErrors(['No analyzed OTO data found. Run Auto-Analyze first.']);
      return;
    }

    const cmps = compareBatch(baseEntries, generatedMap, aliasMap, durations);
    setComparisons(cmps);
    // Initialize accepted params from high-confidence changes
    const initialAccepted: Record<string, Set<keyof OtoParameters>> = {};
    for (const c of cmps) {
      initialAccepted[c.fileName] = new Set(
        c.changes.filter(ch => ch.confidence >= hybridThreshold).map(ch => ch.param)
      );
    }
    setAcceptedParams(initialAccepted);
  };

  const toggleParamAccept = (fileName: string, param: keyof OtoParameters) => {
    const next = { ...acceptedParams };
    if (!next[fileName]) next[fileName] = new Set();
    if (next[fileName].has(param)) next[fileName].delete(param);
    else next[fileName].add(param);
    setAcceptedParams(next);
  };

  const handleApply = () => {
    const finalComparisons = comparisons.map(c => {
      const accepted = acceptedParams[c.fileName] || new Set();
      return { ...c, mergedOto: c.mergedOto }; // mergedOto computed in onImported
    });
    onImported(finalComparisons);
    onClose();
    setStep('file');
    setBaseEntries([]);
    setComparisons([]);
    setAcceptedParams({});
  };

  if (!isOpen) return null;

  if (step === 'file') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden text-slate-200">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Upload className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-bold text-white">Import Base OTO</h2>
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div className="text-center py-6 border-2 border-dashed border-slate-700 rounded-lg"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-indigo-500', 'bg-indigo-950/30'); }}
              onDragLeave={e => e.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-950/30')}
              onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-950/30'); if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]); }}>
              <input ref={fileInputRef} type="file" accept=".ini,.oto,.txt" className="hidden" onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
              <FileText className="w-10 h-10 mx-auto mb-2 text-slate-500" />
              <p className="text-sm font-medium">Drop oto.ini here or click to select</p>
              <p className="text-xs text-slate-500 mt-1">Shift-JIS / UTF-8 / UTF-8-BOM auto-detected</p>
            </div>

            {errors.length > 0 && (
              <div className="bg-rose-950/60 border border-rose-800/60 rounded p-3 text-rose-200 text-sm space-y-1">
                {errors.map((e, i) => <div key={i} className="flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{e}</div>)}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-medium text-slate-400">Base OTO Encoding</label>
              <select value={encoding} onChange={e => setEncoding(e.target.value as any)} className="bg-slate-900 border border-slate-800 text-slate-200 rounded px-2 py-1">
                <option value="Shift-JIS">Shift-JIS (Windows UTAU)</option>
                <option value="UTF-8">UTF-8</option>
                <option value="UTF-8-BOM">UTF-8 with BOM</option>
              </select>
              <label className="text-xs font-medium text-slate-400">Mode</label>
              <select value={mode} onChange={e => setMode(e.target.value as any)} className="bg-slate-900 border border-slate-800 text-slate-200 rounded px-2 py-1">
                <option value="hybrid">Hybrid (smart merge)</option>
                <option value="update">Update (replace all)</option>
              </select>
              {mode === 'hybrid' && (
                <>
                  <label className="text-xs font-medium text-slate-400">Hybrid Confidence Threshold</label>
                  <input type="range" min={50} max={95} value={hybridThreshold} onChange={e => setHybridThreshold(Number(e.target.value))} className="accent-indigo-500 w-full" />
                </>
              )}
            </div>

            <div className="pt-2 flex gap-2">
              <button onClick={handleGenerateComparisons} disabled={baseEntries.length === 0} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded">
                Next: Review Changes
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

  // Step 2: Review comparisons
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] text-slate-200">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Review OTO Changes</h2>
              <p className="text-xs text-slate-400">{comparisons.length} files compared — {mode} mode</p>
            </div>
          </div>
          <button onClick={() => setStep('file')} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {warnings.length > 0 && (
          <div className="px-5 py-2 border-b border-slate-800 bg-amber-950/30 text-amber-200 text-xs space-y-0.5">
            {warnings.map((w, i) => <div key={i} className="flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{w}</div>)}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {comparisons.map(c => (
            <div key={c.fileName} className="bg-slate-950 border border-slate-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-sm text-white">{c.fileName}</span>
                <span className="text-xs text-slate-400">{c.alias}</span>
              </div>
              <table className="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800">
                    <th className="text-left py-1">Param</th>
                    <th className="text-right py-1">Base</th>
                    <th className="text-right py-1">Generated</th>
                    <th className="text-right py-1">Δ</th>
                    <th className="text-right py-1">Conf</th>
                    <th className="text-left py-1">Accept</th>
                  </tr>
                </thead>
                <tbody>
                  {c.changes.map(ch => {
                    const isAccepted = acceptedParams[c.fileName]?.has(ch.param) ?? ch.confidence >= hybridThreshold;
                    return (
                      <tr key={ch.param} className={`border-b border-slate-800/50 ${isAccepted ? 'bg-emerald-950/30' : ''}`}>
                        <td className="py-1.5 text-slate-300">{ch.param}</td>
                        <td className="py-1.5 text-right text-slate-400">{ch.oldValue}</td>
                        <td className="py-1.5 text-right text-white">{ch.newValue}</td>
                        <td className="py-1.5 text-right">{ch.delta >= 0 ? '+' : ''}{ch.delta}</td>
                        <td className="py-1.5 text-right">
                          <span className={ch.confidence >= 80 ? 'text-emerald-400' : ch.confidence >= 60 ? 'text-amber-400' : 'text-rose-400'}>
                            {ch.confidence}%
                          </span>
                        </td>
                        <td className="py-1.5">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isAccepted}
                              onChange={() => toggleParamAccept(c.fileName, ch.param)}
                              className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                            />
                            <span className={isAccepted ? 'text-emerald-300' : 'text-slate-500'}>{isAccepted ? 'Accept' : 'Reject'}</span>
                          </label>
                        </td>
                      </tr>
                    );
                  })}
                  {c.changes.length === 0 && (
                    <tr><td colSpan={6} className="py-3 text-center text-slate-500">No changes</td></tr>
                  )}
                </tbody>
              </table>
              <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
                <span>Validation: </span>
                <span className={c.validation.isValid ? 'text-emerald-400' : 'text-rose-400'}>
                  {c.validation.isValid ? 'Valid' : 'Issues'} ({c.validation.score}/100)
                </span>
                {!c.validation.isValid && (
                  <span className="ml-auto">{c.validation.issues.filter(i => i.severity === 'error').length} errors, {c.validation.issues.filter(i => i.severity === 'warning').length} warnings</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <button onClick={() => setStep('file')} className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded">
            Back
          </button>
          <div className="flex items-center gap-2">
            <button onClick={handleApply} className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded shadow-sm">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Apply Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
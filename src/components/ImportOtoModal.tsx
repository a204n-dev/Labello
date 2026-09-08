/**
 * Phase 3 — Import Base OTO Modal.
 * Load existing oto.ini for Update/Hybrid modes.
 */

import React, { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, HelpCircle, Sliders, ChevronDown } from 'lucide-react';
import { OtoParameters, ParsedOtoEntry, AudioFileItem } from '../types/workstation';
import { parseOtoIni, ParsedOtoEntry as ParsedEntry } from '../services/oto/otoParser';
import { compareBatch, formatComparisonTable, OtoComparisonResult } from '../services/oto/otoUpdater';
import { matchReimportedFile } from '../services/audio/projectStore';
import { Modal } from './ui/Modal';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

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
      return { ...c, mergedOto: c.mergedOto };
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
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Import Base OTO"
        icon={<Upload className="w-5 h-5" />}
        size="md"
      >
        <div className="space-y-4">
          <div
            className="text-center py-8 border-2 border-dashed border-border-default rounded-lg hover:border-border-focus hover:bg-bg-tertiary/50 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-border-focus', 'bg-bg-tertiary/50'); }}
            onDragLeave={e => e.currentTarget.classList.remove('border-border-focus', 'bg-bg-tertiary/50')}
            onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('border-border-focus', 'bg-bg-tertiary/50'); if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]); }}>
            <input ref={fileInputRef} type="file" accept=".ini,.oto,.txt" className="hidden" onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
            <FileText className="w-12 h-12 mx-auto mb-3 text-text-muted" />
            <p className="text-sm font-medium text-text-primary">Drop oto.ini here or click to select</p>
            <p className="text-xs text-text-muted mt-1">Shift-JIS / UTF-8 / UTF-8-BOM auto-detected</p>
          </div>

          {errors.length > 0 && (
            <div className="bg-state-error-bg border border-state-error-border rounded-lg p-3 text-state-error-text text-sm space-y-1">
              {errors.map((e, i) => <div key={i} className="flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{e}</div>)}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Base OTO Encoding"
              value={encoding}
              onChange={e => setEncoding(e.target.value as any)}
              options={[
                { value: 'Shift-JIS', label: 'Shift-JIS (Windows UTAU)' },
                { value: 'UTF-8', label: 'UTF-8' },
                { value: 'UTF-8-BOM', label: 'UTF-8 with BOM' },
              ]}
              placeholder="Select encoding"
            />

            <Select
              label="Mode"
              value={mode}
              onChange={e => setMode(e.target.value as any)}
              options={[
                { value: 'hybrid', label: 'Hybrid (smart merge)' },
                { value: 'update', label: 'Update (replace all)' },
              ]}
              placeholder="Select mode"
            />

            {mode === 'hybrid' && (
              <>
                <label className="text-xs font-medium text-text-muted block mb-1">Hybrid Confidence Threshold</label>
                <input type="range" min={50} max={95} value={hybridThreshold} onChange={e => setHybridThreshold(Number(e.target.value))} className="accent-mode-utau w-full" />
                <div className="text-right text-xs text-text-muted">{hybridThreshold}%</div>
              </>
            )}
          </div>

          <div className="pt-2 flex gap-2">
            <Button onClick={handleGenerateComparisons} disabled={baseEntries.length === 0} className="flex-1">
              Next: Review Changes
            </Button>
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Review OTO Changes"
      description={`${comparisons.length} files compared — ${mode} mode`}
      icon={<Sliders className="w-5 h-5" />}
      iconBg="bg-state-warning-bg/10"
      iconColor="text-state-warning-text"
      size="xl"
    >
      {warnings.length > 0 && (
        <div className="mb-4 px-4 py-2 bg-state-warning-bg border border-state-warning-border rounded-lg text-state-warning-text text-xs space-y-0.5">
          {warnings.map((w, i) => <div key={i} className="flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{w}</div>)}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-4">
        {comparisons.map(c => (
          <div key={c.fileName} className="bg-bg-tertiary border border-border-subtle rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-sm text-text-primary">{c.fileName}</span>
              <span className="text-xs text-text-muted">{c.alias}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr className="text-text-muted border-b border-border-subtle">
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
                      <tr key={ch.param} className={`border-b border-border-subtle/50 ${isAccepted ? 'bg-state-success-bg/20' : ''}`}>
                        <td className="py-1.5 text-text-secondary">{ch.param}</td>
                        <td className="py-1.5 text-right text-text-muted">{ch.oldValue}</td>
                        <td className="py-1.5 text-right text-text-primary">{ch.newValue}</td>
                        <td className="py-1.5 text-right">{ch.delta >= 0 ? '+' : ''}{ch.delta}</td>
                        <td className="py-1.5 text-right">
                          <span className={ch.confidence >= 80 ? 'text-state-success-text' : ch.confidence >= 60 ? 'text-state-warning-text' : 'text-state-error-text'}>
                            {ch.confidence}%
                          </span>
                        </td>
                        <td className="py-1.5">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isAccepted}
                              onChange={() => toggleParamAccept(c.fileName, ch.param)}
                              className="rounded border-border-subtle text-mode-utau focus:ring-0 w-3.5 h-3.5"
                            />
                            <span className={isAccepted ? 'text-state-success-text' : 'text-text-muted'}>{isAccepted ? 'Accept' : 'Reject'}</span>
                          </label>
                        </td>
                      </tr>
                    );
                  })}
                  {c.changes.length === 0 && (
                    <tr><td colSpan={6} className="py-3 text-center text-text-muted">No changes</td></tr>
                  )}
                </tbody>
              </table>
              <div className="mt-2 flex items-center gap-2 text-[11px] text-text-muted">
                <span>Validation: </span>
                <span className={c.validation.isValid ? 'text-state-success-text' : 'text-state-error-text'}>
                  {c.validation.isValid ? 'Valid' : 'Issues'} ({c.validation.score}/100)
                </span>
                {!c.validation.isValid && (
                  <span className="ml-auto">{c.validation.issues.filter(i => i.severity === 'error').length} errors, {c.validation.issues.filter(i => i.severity === 'warning').length} warnings</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
        <Button variant="secondary" onClick={() => setStep('file')}>
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="success" onClick={handleApply} icon={<CheckCircle className="w-3.5 h-3.5" />}>
            Apply Changes
          </Button>
        </div>
      </div>
    </Modal>
  );
};
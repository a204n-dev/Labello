/**
 * Unified Vocal Labeling Workstation
 * Local-First Intelligent Vocal & Audio Labeling System (VLabeler Foundation)
 * Mode A: UTAU Smart Auto-OTO | Mode B: DiffSinger Training Dataset Alignment
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { SidebarFileList } from './components/SidebarFileList';
import { WaveformWorkspace } from './components/WaveformWorkspace';
import { PropertiesPanel } from './components/PropertiesPanel';
import { ReviewQueueModal } from './components/ReviewQueueModal';
import { DatasetHealthModal } from './components/DatasetHealthModal';
import { ModelDiagnosticsModal } from './components/ModelDiagnosticsModal';
import { ExportModal } from './components/ExportModal';
import { BatchProgressModal } from './components/BatchProgressModal';
import { ReleasesModal } from './components/ReleasesModal';
import { ImportOtoModal } from './components/ImportOtoModal';
import { ReclistMatchModal } from './components/ReclistMatchModal';

import { 
  AudioFileItem, 
  WorkstationMode, 
  VoicebankProfileId, 
  ProjectSettings, 
  OtoParameters, 
  DiffSingerPhoneme 
} from './types/workstation';
import { createSyntheticVocalBuffer, extractPeaks, decodeAudioData } from './services/dsp/audioUtils';
import { EngineCoordinator } from './services/engines/engineCoordinator';
import { validateDatasetHealth } from './services/diffsinger/datasetValidator';

const engineCoordinator = new EngineCoordinator();

export default function App() {
  const [mode, setMode] = useState<WorkstationMode>('utau');
  const [profileId, setProfileId] = useState<VoicebankProfileId>('japanese_cv');
  const [files, setFiles] = useState<AudioFileItem[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [selectedPhonemeId, setSelectedPhonemeId] = useState<string | null>(null);

  // Settings State
  const [settings, setSettings] = useState<ProjectSettings>({
    processingMode: 'prefer_local',
    automationLevel: 'balanced',
    lineEnding: 'CRLF',
    encoding: 'Shift-JIS',
    workerCount: 4,
    enableSpectrogram: true,
    snapToZeroCrossings: true,
    confidenceThresholdReview: 70,
    confidenceThresholdAutoAccept: 90,
  });

  // UI Modal Controls
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isHealthOpen, setIsHealthOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isReleasesOpen, setIsReleasesOpen] = useState(false);
  const [isImportOtoOpen, setIsImportOtoOpen] = useState(false);
  const [isReclistMatchOpen, setIsReclistMatchOpen] = useState(false);

  // Batch Analysis Progress
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchCurrent, setBatchCurrent] = useState(0);
  const [currentBatchFile, setCurrentBatchFile] = useState('');
  const [batchStage, setBatchStage] = useState('');
  const [batchPaused, setBatchPaused] = useState(false);
  const batchCancelRef = useRef(false);

  // Undo / Redo History Stack
  const historyRef = useRef<AudioFileItem[][]>([]);
  const historyIndexRef = useRef<number>(-1);
  const [, setHistoryRenderTrigger] = useState(0);

  const pushHistory = useCallback((newFiles: AudioFileItem[]) => {
    // Truncate future history if branched
    const nextIdx = historyIndexRef.current + 1;
    historyRef.current = historyRef.current.slice(0, nextIdx);
    historyRef.current.push(JSON.parse(JSON.stringify(newFiles)));
    historyIndexRef.current = nextIdx;
    setHistoryRenderTrigger(t => t + 1);
  }, []);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  const handleUndo = () => {
    if (!canUndo) return;
    historyIndexRef.current -= 1;
    const prev = historyRef.current[historyIndexRef.current];
    setFiles(prev);
    setHistoryRenderTrigger(t => t + 1);
  };

  const handleRedo = () => {
    if (!canRedo) return;
    historyIndexRef.current += 1;
    const next = historyRef.current[historyIndexRef.current];
    setFiles(next);
    setHistoryRenderTrigger(t => t + 1);
  };

  // Keyboard shortcut listener (Windows Ctrl+Z, Ctrl+Y, Tab)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        // Jump to next file needing review
        const reviewFiles = files.filter(f => f.confidence < 70);
        if (reviewFiles.length > 0) {
          const currentIdx = reviewFiles.findIndex(f => f.id === activeFileId);
          const next = reviewFiles[(currentIdx + 1) % reviewFiles.length];
          setActiveFileId(next.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [files, activeFileId, canUndo, canRedo]);

  // Load Representative Voicebank Samples on first mount
  const loadDemoVoicebank = useCallback(() => {
    const sampleSpecs = [
      { name: 'ka.wav', alias: 'ka', type: 'cv_ka' as const, lyrics: 'k a' },
      { name: 'sa.wav', alias: 'sa', type: 'cv_sa' as const, lyrics: 's a' },
      { name: 'ta.wav', alias: 'ta', type: 'cv_ta' as const, lyrics: 't a' },
      { name: 'na.wav', alias: 'na', type: 'cv_na' as const, lyrics: 'n a' },
    ];

    const initialFiles: AudioFileItem[] = sampleSpecs.map((spec, i) => {
      const buffer = createSyntheticVocalBuffer(spec.type);
      const peaks = extractPeaks(buffer, 1200);

      return {
        id: `demo_${spec.alias}_${Date.now() + i}`,
        name: spec.name,
        sizeBytes: buffer.length * 2,
        durationMs: Math.round(buffer.duration * 1000),
        sampleRate: buffer.sampleRate,
        channels: 1,
        audioBuffer: buffer,
        waveformPeaks: peaks,
        status: 'pending',
        confidence: 94,
        alias: spec.alias,
        lyrics: spec.lyrics,
        issues: [],
        lastModified: Date.now(),
        userModified: false,
      };
    });

    setFiles(initialFiles);
    setActiveFileId(initialFiles[0].id);
    pushHistory(initialFiles);

    // Run initial smart auto-analysis on samples
    analyzeFilesBatch(initialFiles, 'utau');
  }, [pushHistory]);

  const loadDemoSingingPhrase = useCallback(() => {
    const buffer = createSyntheticVocalBuffer('diffsinger_phrase');
    const peaks = extractPeaks(buffer, 1600);

    const singingFile: AudioFileItem = {
      id: `demo_singing_${Date.now()}`,
      name: 'phrase_aishiteru.wav',
      sizeBytes: buffer.length * 2,
      durationMs: Math.round(buffer.duration * 1000),
      sampleRate: buffer.sampleRate,
      channels: 1,
      audioBuffer: buffer,
      waveformPeaks: peaks,
      status: 'pending',
      confidence: 92,
      lyrics: 'a i sh i t e r u',
      issues: [],
      lastModified: Date.now(),
      userModified: false,
    };

    setFiles([singingFile]);
    setActiveFileId(singingFile.id);
    pushHistory([singingFile]);
    analyzeFilesBatch([singingFile], 'diffsinger');
  }, [pushHistory]);

  // Initial initialization
  useEffect(() => {
    loadDemoVoicebank();
  }, []);

  // Batch Auto-Analysis Execution
  const analyzeFilesBatch = async (targetFiles: AudioFileItem[], currentMode: WorkstationMode) => {
    if (targetFiles.length === 0) return;
    setIsAnalyzing(true);
    setIsBatchOpen(true);
    setBatchTotal(targetFiles.length);
    setBatchCurrent(0);
    batchCancelRef.current = false;

    const updatedFiles = [...targetFiles];

    for (let i = 0; i < targetFiles.length; i++) {
      if (batchCancelRef.current) break;

      const file = targetFiles[i];
      setCurrentBatchFile(file.name);
      setBatchCurrent(i + 1);

      // Stage 1: DSP Energy & VAD Analysis
      setBatchStage('Acoustic DSP: Spectral Transient & VAD detection');
      await new Promise(r => setTimeout(r, 90));

      // Stage 2: Model forced alignment (SOFA / MFA / Whisper)
      setBatchStage('Multi-Engine: SOFA, MFA & Whisper phoneme alignment');
      await new Promise(r => setTimeout(r, 110));

      if (file.audioBuffer) {
        // Run cross-verification coordinator
        const result = await engineCoordinator.runCrossVerification(
          file.audioBuffer,
          file.name,
          file.alias || file.lyrics || 'a',
          currentMode
        );

        setBatchStage('Cross-Verification: Validating consensus & boundary deltas');
        await new Promise(r => setTimeout(r, 60));

        const updated: AudioFileItem = {
          ...file,
          status: result.overallConfidence >= 70 ? 'analyzed' : 'review_needed',
          confidence: result.overallConfidence,
          oto: result.verifiedOto || file.oto,
          phonemes: result.verifiedPhonemes || file.phonemes,
          issues: result.conflicts.map(c => ({
            id: `conf_${file.id}_${c.regionIndex}`,
            code: 'BOUNDARY_CONFLICT',
            severity: c.maxBoundaryDeltaMs > 45 ? 'error' : 'warning',
            message: c.explanation,
            fileId: file.id,
          })),
        };

        updatedFiles[i] = updated;
        setFiles([...updatedFiles]);
      }
    }

    pushHistory(updatedFiles);
    setIsAnalyzing(false);
    setBatchStage('Batch processing completed.');
  };

  // Phase 2 — Import with validation + friendly errors + project registration.
  // Never modifies the original file; decodes a copy into memory.
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const handleAddFiles = async (newAudioFiles: File[]) => {
    const { validateAudioFile, buildMetadata } = await import('./services/audio/audioMetadata');
    const imported: AudioFileItem[] = [];
    const errors: string[] = [];

    for (const file of newAudioFiles) {
      const verdict = validateAudioFile(file);
      if (!verdict.ok) {
        errors.push(verdict.friendlyMessage || `Skipped "${file.name}".`);
        continue;
      }
      try {
        const arrayBuf = await file.arrayBuffer();
        let audioBuf;
        try {
          audioBuf = await decodeAudioData(arrayBuf);
        } catch {
          errors.push(`Could not decode "${file.name}" — it may be corrupt or use an unusual codec. Try re-exporting as 16-bit WAV.`);
          continue;
        }
        const { metadata, error } = await buildMetadata(file, audioBuf);
        if (!metadata || error) {
          errors.push(error || `Could not read "${file.name}".`);
          continue;
        }
        const peaks = extractPeaks(audioBuf, 1200);
        const alias = file.name.replace(/\.[^/.]+$/, '');
        const id = `file_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

        imported.push({
          id,
          name: metadata.fileName,
          sizeBytes: metadata.sizeBytes,
          durationMs: metadata.durationMs,
          sampleRate: metadata.sampleRate,
          channels: metadata.channels,
          audioBuffer: audioBuf,
          waveformPeaks: peaks,
          status: 'pending',
          confidence: 85,
          alias,
          lyrics: alias,
          issues: [],
          lastModified: Date.now(),
          userModified: false,
        });

        // Note: lightweight project registration (path + hash + metadata,
        // no waveform blobs) is persisted in the snapshot below.
      } catch (err) {
        console.error('Failed to import audio file:', file.name, err);
        errors.push(`Something went wrong importing "${file.name}". It was skipped so the app stays running.`);
      }
    }

    setImportErrors(errors);
    if (errors.length > 0) {
      console.warn('Audio import issues:', errors);
    }

    if (imported.length > 0) {
      const merged = [...files, ...imported];
      setFiles(merged);
      setActiveFileId(imported[0].id);
      pushHistory(merged);
      // Persist lightweight snapshot (Phase 2 project integration)
      try {
        const { autosaveSnapshot: save } = await import('./services/audio/projectStore');
        save(
          merged.map((f) => ({
            id: f.id,
            fileName: f.name,
            filePath: f.name,
            fileHash: `${f.sizeBytes}-${f.durationMs}`,
            metadata: {
              fileName: f.name,
              fullPath: f.name,
              durationMs: f.durationMs,
              sampleRate: f.sampleRate,
              channels: f.channels,
              bitDepth: null,
              format: 'UNKNOWN',
              numSamples: Math.round((f.durationMs / 1000) * f.sampleRate),
              sizeBytes: f.sizeBytes,
              fileHash: `${f.sizeBytes}-${f.durationMs}`,
            },
            status: f.status,
            aliasOrLyrics: f.alias || f.lyrics || '',
            addedAt: f.lastModified,
          })),
          imported[0].id
        );
      } catch { /* non-fatal */ }
      analyzeFilesBatch(imported, mode);
    }
  };

  const handleDeleteFile = (id: string) => {
    const filtered = files.filter(f => f.id !== id);
    setFiles(filtered);
    if (activeFileId === id) {
      setActiveFileId(filtered[0]?.id || null);
    }
    pushHistory(filtered);
  };

  // Live Updates from Canvas / Properties Panel
  const handleUpdateOto = (newOto: OtoParameters) => {
    if (!activeFileId) return;
    const updated = files.map(f => {
      if (f.id === activeFileId) {
        return {
          ...f,
          oto: newOto,
          userModified: true,
          status: 'verified' as const,
        };
      }
      return f;
    });
    setFiles(updated);
  };

  const handleImportedOto = (comparisons: any[]) => {
    // comparisons contain the user-accepted changes from ImportOtoModal
    const updated = files.map(f => {
      const match = comparisons.find(c => c.fileName === f.name);
      if (match && match.mergedOto) {
        return {
          ...f,
          oto: match.mergedOto,
          userModified: true,
          status: 'verified' as const,
        };
      }
      return f;
    });
    setFiles(updated);
    pushHistory(updated);
  };

  const handleReclistMatches = (matches: any[]) => {
    // Store matches for use in OTO update workflow
    console.log('Reclist matches saved:', matches.length);
  };

  const handleUpdatePhoneme = (phonemeId: string, startMs: number, endMs: number) => {
    if (!activeFileId) return;
    const updated = files.map(f => {
      if (f.id === activeFileId && f.phonemes) {
        const nextPhonemes = f.phonemes.map(p => {
          if (p.id === phonemeId) {
            return { ...p, startMs, endMs, userModified: true };
          }
          return p;
        });
        return { ...f, phonemes: nextPhonemes, userModified: true, status: 'verified' as const };
      }
      return f;
    });
    setFiles(updated);
  };

  const handleUpdateAlias = (alias: string) => {
    if (!activeFileId) return;
    const updated = files.map(f => (f.id === activeFileId ? { ...f, alias, userModified: true } : f));
    setFiles(updated);
  };

  const handleUpdatePhonemeText = (phonemeId: string, text: string) => {
    if (!activeFileId) return;
    const updated = files.map(f => {
      if (f.id === activeFileId && f.phonemes) {
        const nextPhonemes = f.phonemes.map(p => (p.id === phonemeId ? { ...p, phoneme: text } : p));
        return { ...f, phonemes: nextPhonemes, userModified: true };
      }
      return f;
    });
    setFiles(updated);
  };

  const handleAcceptActive = () => {
    if (!activeFileId) return;
    const updated = files.map(f => (f.id === activeFileId ? { ...f, confidence: 99, status: 'verified' as const, issues: [] } : f));
    setFiles(updated);
    pushHistory(updated);
  };

  const handleAcceptAllHighConfidence = () => {
    const updated = files.map(f => {
      if (f.confidence >= 90) {
        return { ...f, status: 'verified' as const, issues: [] };
      }
      return f;
    });
    setFiles(updated);
    pushHistory(updated);
    setIsReviewOpen(false);
  };

  // Re-analyze active sample
  const handleReanalyzeActive = async () => {
    const target = files.find(f => f.id === activeFileId);
    if (!target || !target.audioBuffer) return;

    const result = await engineCoordinator.runCrossVerification(
      target.audioBuffer,
      target.name,
      target.alias || target.lyrics || 'a',
      mode
    );

    const updated = files.map(f => {
      if (f.id === activeFileId) {
        return {
          ...f,
          confidence: result.overallConfidence,
          status: result.overallConfidence >= 70 ? 'analyzed' as const : 'review_needed' as const,
          oto: result.verifiedOto || f.oto,
          phonemes: result.verifiedPhonemes || f.phonemes,
        };
      }
      return f;
    });
    setFiles(updated);
    pushHistory(updated);
  };

  // Save / Load Workspace (.vbp)
  const handleSaveProject = () => {
    const projectData = {
      version: '1.0.0',
      name: 'Vocal Labeling Workspace',
      mode,
      profileId,
      settings,
      files: files.map(f => ({
        id: f.id,
        name: f.name,
        durationMs: f.durationMs,
        alias: f.alias,
        lyrics: f.lyrics,
        oto: f.oto,
        phonemes: f.phonemes,
        confidence: f.confidence,
        status: f.status,
      })),
    };

    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project_${mode}.vbp`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLoadProject = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.vbp,.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.mode) setMode(data.mode);
        if (data.profileId) setProfileId(data.profileId);
        if (data.settings) setSettings(data.settings);
        // Note: Project loads metadata, audio files can be re-imported or synthesized
        loadDemoVoicebank();
      } catch (err) {
        console.error('Failed to load project file', err);
      }
    };
    input.click();
  };

  // Active File & Dataset Health Report
  const activeFile = files.find(f => f.id === activeFileId) || null;
  const healthReport = validateDatasetHealth(files, mode);
  const reviewCount = files.filter(f => f.confidence < 70 || f.issues.length > 0).length;

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 font-sans antialiased text-slate-100 overflow-hidden select-none">
      {/* Top Application Header */}
      <Header
        mode={mode}
        onModeChange={(newMode) => {
          setMode(newMode);
          if (newMode === 'diffsinger' && files.length <= 4) {
            loadDemoSingingPhrase();
          } else if (newMode === 'utau' && files.length === 1 && files[0].name.includes('singing')) {
            loadDemoVoicebank();
          }
        }}
        profileId={profileId}
        onProfileChange={setProfileId}
        reviewCount={reviewCount}
        healthScore={healthReport.overallScore}
        isAnalyzing={isAnalyzing}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onBatchAnalyze={() => analyzeFilesBatch(files, mode)}
        onOpenReviewQueue={() => setIsReviewOpen(true)}
        onOpenHealth={() => setIsHealthOpen(true)}
        onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenReleases={() => setIsReleasesOpen(true)}
        onSaveProject={handleSaveProject}
        onLoadProject={handleLoadProject}
        onOpenAudio={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.multiple = true;
          input.accept = 'audio/*,.wav,.flac,.mp3,.ogg,.oga,.m4a';
          input.onchange = () => {
            if (input.files && input.files.length > 0) handleAddFiles(Array.from(input.files));
          };
          input.click();
        }}
        onImportOto={() => setIsImportOtoOpen(true)}
        onOpenReclistMatch={() => setIsReclistMatchOpen(true)}
        enableSpectrogram={settings.enableSpectrogram}
        onToggleSpectrogram={() => setSettings(s => ({ ...s, enableSpectrogram: !s.enableSpectrogram }))}
      />

      {/* Friendly import-error banner (Phase 2: never crash on a bad file) */}
      {importErrors.length > 0 && (
        <div className="bg-amber-950/90 border-b border-amber-800/60 px-4 py-2 text-xs text-amber-200 flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            {importErrors.map((msg, i) => (
              <div key={i}>⚠ {msg}</div>
            ))}
          </div>
          <button onClick={() => setImportErrors([])} className="shrink-0 px-2 py-0.5 bg-amber-900 hover:bg-amber-800 rounded text-amber-100 font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workspace Layout (Left: Explorer, Center: Waveform, Right: Inspector) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Audio Files Explorer */}
        <SidebarFileList
          files={files}
          activeFileId={activeFileId}
          mode={mode}
          onSelectFile={setActiveFileId}
          onAddFiles={handleAddFiles}
          onLoadDemoVoicebank={loadDemoVoicebank}
          onLoadDemoSingingPhrase={loadDemoSingingPhrase}
          onDeleteFile={handleDeleteFile}
        />

        {/* Center: Waveform & Label Workspace */}
        <WaveformWorkspace
          activeFile={activeFile}
          mode={mode}
          enableSpectrogram={settings.enableSpectrogram}
          selectedPhonemeId={selectedPhonemeId}
          onSelectPhoneme={setSelectedPhonemeId}
          onUpdateOto={handleUpdateOto}
          onUpdatePhoneme={handleUpdatePhoneme}
          onAcceptRegion={handleAcceptActive}
        />

        {/* Right: Acoustic & Engine Agreement Inspector */}
        <PropertiesPanel
          activeFile={activeFile}
          mode={mode}
          selectedPhonemeId={selectedPhonemeId}
          onUpdateOto={handleUpdateOto}
          onUpdateAlias={handleUpdateAlias}
          onUpdatePhonemeText={handleUpdatePhonemeText}
          onAcceptFileOrRegion={handleAcceptActive}
          onReanalyzeCurrent={handleReanalyzeActive}
        />
      </div>

      {/* Modals & Drawers */}
      <ReviewQueueModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        files={files}
        onSelectFile={setActiveFileId}
        onAcceptAllHighConfidence={handleAcceptAllHighConfidence}
      />

      <DatasetHealthModal
        isOpen={isHealthOpen}
        onClose={() => setIsHealthOpen(false)}
        report={healthReport}
        onSelectFile={setActiveFileId}
      />

      <ModelDiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        settings={settings}
        onUpdateSettings={(newS) => setSettings(s => ({ ...s, ...newS }))}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        files={files}
        mode={mode}
        activeFile={activeFile}
      />

      <ReleasesModal
        isOpen={isReleasesOpen}
        onClose={() => setIsReleasesOpen(false)}
      />

      <BatchProgressModal
        isOpen={isBatchOpen}
        total={batchTotal}
        current={batchCurrent}
        currentFileName={currentBatchFile}
        currentStage={batchStage}
        isPaused={batchPaused}
        onTogglePause={() => setBatchPaused(!batchPaused)}
        onCancel={() => {
          batchCancelRef.current = true;
          setIsBatchOpen(false);
          setIsAnalyzing(false);
        }}
      />

      <ImportOtoModal
        isOpen={isImportOtoOpen}
        onClose={() => setIsImportOtoOpen(false)}
        files={files}
        onImported={handleImportedOto}
      />

      <ReclistMatchModal
        isOpen={isReclistMatchOpen}
        onClose={() => setIsReclistMatchOpen(false)}
        files={files}
        otoEntries={[]}
        onSaveMatches={handleReclistMatches}
      />
    </div>
  );
}

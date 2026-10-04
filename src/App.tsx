/**
 * Unified Vocal Labeling Workstation
 * Local-First Intelligent Vocal & Audio Labeling System (VLabeler Foundation)
 * UTAU voicebank authoring and vocal-dataset labeling workflows
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
import { NewProjectModal } from './components/NewProjectModal';
import { VoicebankPackageModal } from './components/VoicebankPackageModal';
import { CloseProjectModal } from './components/CloseProjectModal';

import { 
  AudioFileItem, 
  WorkstationMode, 
  VoicebankProfileId, 
  ProjectSettings, 
  OtoParameters, 
  DiffSingerPhoneme,
  ParsedOtoEntry,
  VoicebankMetadata,
} from './types/workstation';
import { createSyntheticVocalBuffer, extractPeaks, decodeAudioData } from './services/dsp/audioUtils';
import { EngineCoordinator } from './services/engines/engineCoordinator';
import { validateDatasetHealth } from './services/diffsinger/datasetValidator';
import { getProfileById } from './services/oto/otoProfiles';
import { parseOtoIni } from './services/oto/otoParser';
import { applyBaseOtoEntries } from './services/oto/baseOtoImport';
import { romajiToHiragana } from './services/oto/japaneseKana';
import { generateOtoIniContent } from './services/oto/otoExporter';
import { importDatasetLabelFiles, type DatasetLabelFormat } from './services/diffsinger/datasetLabelFormats';
import type { OtoComparisonResult } from './services/oto/otoUpdater';
import type { MatchResult } from './services/reclist/reclistParser';
interface AudioImportCandidate {
  name: string;
  file?: File;
  sourceToken?: string;
}

interface SavedProjectFile extends Omit<AudioFileItem, 'audioBuffer' | 'waveformPeaks' | 'sourceToken'> {
  audioPath?: string | null;
}

interface LabelloProject {
  format: 'labello-project';
  version: 2;
  name: string;
  mode: WorkstationMode;
  profileId: VoicebankProfileId;
  settings: ProjectSettings;
  voicebankMetadata?: VoicebankMetadata;
  files: SavedProjectFile[];
}

const engineCoordinator = new EngineCoordinator();

function createDefaultProjectSettings(): ProjectSettings {
  return {
    processingMode: 'prefer_local',
    automationLevel: 'balanced',
    lineEnding: 'CRLF',
    encoding: 'Shift-JIS',
    workerCount: 4,
    enableSpectrogram: true,
    snapToZeroCrossings: true,
    confidenceThresholdReview: 70,
    confidenceThresholdAutoAccept: 90,
  };
}

export default function App() {
  const [mode, setMode] = useState<WorkstationMode>('utau');
  const [profileId, setProfileId] = useState<VoicebankProfileId>('japanese_cv');
  const [files, setFiles] = useState<AudioFileItem[]>([]);
  const [projectName, setProjectName] = useState('Vocal Labeling Workspace');
  const [voicebankMetadata, setVoicebankMetadata] = useState<VoicebankMetadata>({
    characterName: 'Japanese Voicebank',
    author: '',
    version: '1.0',
    readme: '',
  });
  const [projectReady, setProjectReady] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [pendingCloseAction, setPendingCloseAction] = useState<'exit' | 'close-project' | 'new-project' | 'open-project' | null>(null);
  const [isSavingBeforeClose, setIsSavingBeforeClose] = useState(false);
  const [closeSaveError, setCloseSaveError] = useState<string | null>(null);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [selectedPhonemeId, setSelectedPhonemeId] = useState<string | null>(null);

  // Settings State
  const [settings, setSettings] = useState<ProjectSettings>(createDefaultProjectSettings);

  // UI Modal Controls
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isHealthOpen, setIsHealthOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isReleasesOpen, setIsReleasesOpen] = useState(false);
  const [isImportOtoOpen, setIsImportOtoOpen] = useState(false);
  const [isReclistMatchOpen, setIsReclistMatchOpen] = useState(false);
  const [isVoicebankPackageOpen, setIsVoicebankPackageOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<DesktopUpdateStatus>({ status: 'idle' });
  const [deferredUpdateVersion, setDeferredUpdateVersion] = useState<string | null>(null);
  const [updatePreferenceLoaded, setUpdatePreferenceLoaded] = useState(false);

  // Panel State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [propertiesOpen, setPropertiesOpen] = useState(true);
  const [propertiesWidth, setPropertiesWidth] = useState(320);

  // Batch Analysis Progress
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchCurrent, setBatchCurrent] = useState(0);
  const [currentBatchFile, setCurrentBatchFile] = useState('');
  const [batchStage, setBatchStage] = useState('');
  const [batchPaused, setBatchPaused] = useState(false);
  const [batchCancellationRequested, setBatchCancellationRequested] = useState(false);
  const batchCancelRef = useRef(false);
  const batchPauseRef = useRef(false);

  // Undo / Redo History Stack
  const historyRef = useRef<AudioFileItem[][]>([]);
  const historyIndexRef = useRef<number>(-1);
  const historyTimerRef = useRef<number | null>(null);
  const pendingHistoryRef = useRef<AudioFileItem[] | null>(null);
  const [, setHistoryRenderTrigger] = useState(0);

  useEffect(() => {
    if (!window.labelloDesktop) {
      setUpdatePreferenceLoaded(true);
      return;
    }
    let isCurrent = true;
    const unsubscribe = window.labelloDesktop.onUpdateStatus(setUpdateStatus);
    window.labelloDesktop.getDeferredUpdateVersion()
      .then(version => {
        if (isCurrent) {
          setDeferredUpdateVersion(version);
          setUpdatePreferenceLoaded(true);
        }
      })
      .catch(error => {
        console.error('Could not load update preference:', error);
        if (isCurrent) {
          setUpdateStatus({
            status: 'error',
            message: `Could not load update preference: ${error instanceof Error ? error.message : String(error)}`,
          });
          setUpdatePreferenceLoaded(true);
        }
      });
    return () => {
      isCurrent = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!window.labelloDesktop) return;
    window.labelloDesktop.setProjectOpen(projectReady).catch(error => {
      console.error('Could not update the desktop project-open state:', error);
    });
  }, [projectReady]);

  useEffect(() => {
    if (!window.labelloDesktop) return;
    return window.labelloDesktop.onCloseRequested(() => setPendingCloseAction('exit'));
  }, []);

  const pushHistory = useCallback((newFiles: AudioFileItem[]) => {
    // Truncate future history if branched
    const nextIdx = historyIndexRef.current + 1;
    historyRef.current = historyRef.current.slice(0, nextIdx);
    historyRef.current.push(newFiles.map(file => ({
      ...file,
      oto: file.oto ? { ...file.oto } : undefined,
      phonemes: file.phonemes?.map(phoneme => ({ ...phoneme, engineVotes: phoneme.engineVotes ? { ...phoneme.engineVotes } : undefined })),
      issues: file.issues.map(issue => ({ ...issue })),
    })));
    if (historyRef.current.length > 100) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
    setHistoryRenderTrigger(t => t + 1);
  }, []);

  const scheduleHistory = useCallback((nextFiles: AudioFileItem[]) => {
    pendingHistoryRef.current = nextFiles;
    if (historyTimerRef.current !== null) window.clearTimeout(historyTimerRef.current);
    historyTimerRef.current = window.setTimeout(() => {
      historyTimerRef.current = null;
      const pending = pendingHistoryRef.current;
      pendingHistoryRef.current = null;
      if (pending) pushHistory(pending);
    }, 250);
  }, [pushHistory]);

  const flushPendingHistory = () => {
    if (historyTimerRef.current !== null) {
      window.clearTimeout(historyTimerRef.current);
      historyTimerRef.current = null;
    }
    const pending = pendingHistoryRef.current;
    pendingHistoryRef.current = null;
    if (pending) pushHistory(pending);
  };

  const commitHistory = (nextFiles: AudioFileItem[]) => {
    if (historyTimerRef.current !== null) window.clearTimeout(historyTimerRef.current);
    historyTimerRef.current = null;
    pendingHistoryRef.current = null;
    pushHistory(nextFiles);
  };

  const replaceHistory = (nextFiles: AudioFileItem[]) => {
    if (historyTimerRef.current !== null) window.clearTimeout(historyTimerRef.current);
    historyTimerRef.current = null;
    pendingHistoryRef.current = null;
    historyRef.current = [];
    historyIndexRef.current = -1;
    pushHistory(nextFiles);
  };

  const handleCreateProject = async (
    projectMode: WorkstationMode,
    name: string,
    selectedProfileId: VoicebankProfileId = 'japanese_cv',
    selectedAudioFiles: File[] = [],
    baseOtoFile: File | null = null,
  ) => {
    setMode(projectMode);
    setProfileId(selectedProfileId);
    setFiles([]);
    setSettings(createDefaultProjectSettings());
    setActiveFileId(null);
    setSelectedPhonemeId(null);
    setProjectName(name);
    setVoicebankMetadata({
      characterName: name,
      author: '',
      version: '1.0',
      readme: '',
    });
    setImportErrors([]);
    setSidebarOpen(true);
    setPropertiesOpen(true);
    replaceHistory([]);
    setProjectReady(true);
    setIsNewProjectOpen(false);
    if (selectedAudioFiles.length > 0) {
      await handleImportAudio(
        selectedAudioFiles.map(file => ({ name: file.name, file })),
        {
          mode: projectMode,
          profileId: selectedProfileId,
          replaceExisting: true,
          baseOtoFile,
        }
      );
    }
  };

  const handleNewProject = () => {
    if (projectReady) setPendingCloseAction('new-project');
    else setIsNewProjectOpen(true);
  };

  const handleCloseProject = () => {
    if (projectReady) setPendingCloseAction('close-project');
  };

  const handleOpenAnotherProject = () => {
    setIsNewProjectOpen(false);
    if (projectReady) setPendingCloseAction('open-project');
    else void handleLoadProject();
  };

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  const handleUndo = () => {
    flushPendingHistory();
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const prev = historyRef.current[historyIndexRef.current];
    setFiles(prev);
    setHistoryRenderTrigger(t => t + 1);
  };

  const handleRedo = () => {
    flushPendingHistory();
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
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
    replaceHistory(initialFiles);

    // Run initial smart auto-analysis on samples
    analyzeFilesBatch(initialFiles, 'utau', initialFiles);
  }, [replaceHistory]);

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
    replaceHistory([singingFile]);
    analyzeFilesBatch([singingFile], 'diffsinger', [singingFile]);
  }, [replaceHistory]);

  // Batch Auto-Analysis Execution
  const analyzeFilesBatch = async (
    targetFiles: AudioFileItem[],
    currentMode: WorkstationMode,
    allFiles: AudioFileItem[] = files,
    currentProfileId: VoicebankProfileId = profileId
  ) => {
    if (targetFiles.length === 0) return;
    setIsAnalyzing(true);
    setIsBatchOpen(true);
    setBatchTotal(targetFiles.length);
    setBatchCurrent(0);
    batchCancelRef.current = false;
    setBatchCancellationRequested(false);
    batchPauseRef.current = false;
    setBatchPaused(false);

    const updatedFiles = [...allFiles];

    for (let i = 0; i < targetFiles.length; i++) {
      if (batchCancelRef.current) break;
      while (batchPauseRef.current && !batchCancelRef.current) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (batchCancelRef.current) break;

      const file = targetFiles[i];
      const fileIndex = updatedFiles.findIndex(item => item.id === file.id);
      if (fileIndex < 0) continue;
      setCurrentBatchFile(file.name);
      setBatchCurrent(i + 1);

      // Stage 1: DSP Energy & VAD Analysis
      setBatchStage('Local acoustic analysis');

      if (file.audioBuffer) {
      if (currentMode === 'diffsinger' && !file.lyrics?.trim()) {
        const needsLyrics: AudioFileItem = {
          ...file,
          status: 'review_needed',
          confidence: 0,
          issues: [{
            id: `missing_transcript_${file.id}`,
            code: 'MISSING_PHONEME_SEQUENCE',
            severity: 'warning',
            message: 'Enter the expected phoneme sequence before generating timing estimates.',
            fileId: file.id,
          }],
        };
        updatedFiles[fileIndex] = needsLyrics;
        setFiles([...updatedFiles]);
        continue;
      }
      // Run cross-verification coordinator
        const result = await engineCoordinator.runCrossVerification(
          file.audioBuffer,
          file.name,
          file.alias || file.lyrics || 'a',
          currentMode,
          { profileId: currentProfileId }
        );

        setBatchStage('Saving estimate for manual review');

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

        updatedFiles[fileIndex] = updated;
        setFiles([...updatedFiles]);
      }
    }

    commitHistory(updatedFiles);
    setIsAnalyzing(false);
    setBatchPaused(false);
    batchPauseRef.current = false;
    setBatchStage(batchCancelRef.current ? 'Batch processing cancelled.' : 'Batch processing completed.');
  };

  // Phase 2 — Import with validation + friendly errors + project registration.
  // Never modifies the original file; decodes a copy into memory.
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const handleImportAudio = async (
    candidates: AudioImportCandidate[],
    setup?: {
      mode: WorkstationMode;
      profileId: VoicebankProfileId;
      replaceExisting?: boolean;
      baseOtoFile?: File | null;
    }
  ) => {
    const { validateAudioFile, buildMetadata } = await import('./services/audio/audioMetadata');
    const imported: AudioFileItem[] = [];
    const errors: string[] = [];
    const importMode = setup?.mode || mode;
    const importProfileId = setup?.profileId || profileId;

    for (const candidate of candidates) {
      let file = candidate.file;
      if (!candidate.sourceToken && file && window.labelloDesktop) {
        try {
          candidate.sourceToken = (await window.labelloDesktop.registerAudioFile(file)).token;
        } catch (err) {
          errors.push(`Audio for "${candidate.name}" can be edited, but will not be embedded in a saved project: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      if (!file && candidate.sourceToken && window.labelloDesktop) {
        try {
          const bytes = await window.labelloDesktop.readAudioFile(candidate.sourceToken);
          const arrayBuffer = new ArrayBuffer(bytes.byteLength);
          new Uint8Array(arrayBuffer).set(bytes);
          file = new File([arrayBuffer], candidate.name);
        } catch (err) {
          errors.push(`Could not read "${candidate.name}": ${err instanceof Error ? err.message : String(err)}`);
          continue;
        }
      }
      if (!file) {
        errors.push(`Could not open "${candidate.name}".`);
        continue;
      }
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
        const fileStem = file.name.replace(/\.[^/.]+$/, '').split(/[\\/]/).pop() || file.name;
        const alias = importMode === 'utau' && getProfileById(importProfileId).language === 'Japanese'
          ? romajiToHiragana(fileStem)
          : fileStem;
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
          lyrics: importMode === 'diffsinger' ? '' : alias,
          issues: [],
          lastModified: Date.now(),
          userModified: false,
          sourceToken: candidate.sourceToken,
        });

        // Note: lightweight project registration (path + hash + metadata,
        // no waveform blobs) is persisted in the snapshot below.
      } catch (err) {
        console.error('Failed to import audio file:', file.name, err);
        errors.push(`Something went wrong importing "${file.name}". It was skipped so the app stays running.`);
      }
    }

    let importedBaseOtoCount = 0;
    let unmatchedBaseOtoCount = 0;
    const filesWithBaseOto = new Set<string>();
    if (setup?.baseOtoFile && imported.length > 0) {
      try {
        const parsed = parseOtoIni(new Uint8Array(await setup.baseOtoFile.arrayBuffer()));
        if (parsed.errors.length > 0) {
          errors.push(...parsed.errors.map(error => `Base oto.ini: ${error}`));
        } else {
          errors.push(...parsed.warnings.map(warning => `Base oto.ini: ${warning}`));
          const result = applyBaseOtoEntries(imported, parsed.entries);
          imported.splice(0, imported.length, ...result.files);
          result.appliedFileIds.forEach(id => filesWithBaseOto.add(id));
          importedBaseOtoCount = result.appliedCount;
          unmatchedBaseOtoCount = result.unmatchedEntries.length;
          result.ambiguousFiles.forEach(fileName => {
            errors.push(`Base oto.ini has multiple entries for "${fileName}"; its existing alias and timing were left unchanged.`);
          });
          if (unmatchedBaseOtoCount > 0) {
            errors.push(`${unmatchedBaseOtoCount} base oto.ini entr${unmatchedBaseOtoCount === 1 ? 'y' : 'ies'} did not match an imported audio filename and were skipped.`);
          }
        }
      } catch (error) {
        errors.push(`Could not read base oto.ini: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    setImportErrors(errors);
    if (errors.length > 0) {
      console.warn('Audio import issues:', errors);
    }

    if (imported.length > 0) {
      const existingFiles = setup?.replaceExisting ? [] : files;
      const merged = [...existingFiles, ...imported];
      setFiles(merged);
      setActiveFileId(imported[0].id);
      commitHistory(merged);
      if (setup?.baseOtoFile) {
        setImportNotice(
          `Imported ${imported.length} recording${imported.length === 1 ? '' : 's'} and applied ${importedBaseOtoCount} matching base oto.ini entr${importedBaseOtoCount === 1 ? 'y' : 'ies'}.${unmatchedBaseOtoCount > 0 ? ` ${unmatchedBaseOtoCount} unmatched entr${unmatchedBaseOtoCount === 1 ? 'y was' : 'ies were'} skipped.` : ''}`
        );
      }
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
      const filesToAnalyze = imported.filter(file => !filesWithBaseOto.has(file.id));
      if (filesToAnalyze.length > 0) {
        void analyzeFilesBatch(filesToAnalyze, importMode, merged, importProfileId);
      }
    }
  };

  const handleAddFiles = (newAudioFiles: File[]) => {
    void handleImportAudio(newAudioFiles.map(file => ({ name: file.name, file })));
  };

  const handleOpenAudio = async (folder = false) => {
    if (!window.labelloDesktop) {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = 'audio/*,.wav,.flac,.mp3,.ogg,.oga,.m4a,.aac';
      input.onchange = () => {
        if (input.files?.length) handleAddFiles(Array.from(input.files));
      };
      input.click();
      return;
    }

    try {
      const selected = folder
        ? await window.labelloDesktop.openAudioFolder()
        : await window.labelloDesktop.openAudioFiles();
      await handleImportAudio(selected.map(file => ({ name: file.name, sourceToken: file.token })));
    } catch (err) {
      setImportErrors([`Could not open audio: ${err instanceof Error ? err.message : String(err)}`]);
    }
  };

  const handleImportLabels = async () => {
    if (mode !== 'diffsinger') {
      setImportErrors(['Phoneme label import is available in the vocal-dataset workflow.']);
      return;
    }
    let selectedLabels: Array<{ name: string; text: string; format: DatasetLabelFormat }> = [];
    try {
      if (window.labelloDesktop) {
        const selected = await window.labelloDesktop.openLabelFiles();
        for (const label of selected) {
          const bytes = await window.labelloDesktop.readAudioFile(label.token);
          const contents = new TextDecoder('utf-8').decode(bytes);
          const extension = label.name.split('.').pop()?.toLowerCase();
          const format: DatasetLabelFormat | null = extension === 'lab'
            ? 'lab'
            : extension === 'textgrid'
              ? 'textgrid'
              : extension === 'txt'
                ? 'audacity'
                : null;
          if (!format) {
            setImportErrors([`"${label.name}" is not a supported phoneme-label format yet. Import .lab, Audacity .txt, or Praat .TextGrid files.`]);
            return;
          }
          selectedLabels.push({ name: label.name, text: contents, format });
        }
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = '.lab,.txt,.textgrid';
        const filesToRead = await new Promise<File[]>((resolve, reject) => {
          input.onchange = () => resolve(Array.from(input.files || []));
          input.onerror = () => reject(new Error('The label files could not be selected.'));
          input.click();
        });
        selectedLabels = await Promise.all(filesToRead.map(async label => {
          const extension = label.name.split('.').pop()?.toLowerCase();
          const format: DatasetLabelFormat | null = extension === 'lab'
            ? 'lab'
            : extension === 'textgrid'
              ? 'textgrid'
              : extension === 'txt'
                ? 'audacity'
                : null;
          if (!format) throw new Error(`"${label.name}" is not a supported phoneme-label format.`);
          return { name: label.name, text: await label.text(), format };
        }));
      }

      if (selectedLabels.length === 0) return;
      const result = importDatasetLabelFiles(files, selectedLabels);
      if (result.importedNames.length > 0) {
        setFiles(result.files);
        commitHistory(result.files);
        setActiveFileId(result.files.find(file => file.name === result.importedNames[0])?.id || activeFileId);
      }
      const messages = [
        ...(result.unmatchedLabelFiles.length
          ? [`No audio recording matched: ${result.unmatchedLabelFiles.join(', ')}.`]
          : []),
      ];
      setImportErrors(messages);
      setImportNotice(result.importedNames.length
        ? `Imported labels for ${result.importedNames.length} recording${result.importedNames.length === 1 ? '' : 's'}. Imported timings remain marked for review.`
        : null);
    } catch (error) {
      setImportNotice(null);
      setImportErrors([`Could not import labels: ${error instanceof Error ? error.message : String(error)}`]);
    }
  };

  const handleDeleteFile = (id: string) => {
    const filtered = files.filter(f => f.id !== id);
    setFiles(filtered);
    if (activeFileId === id) {
      setActiveFileId(filtered[0]?.id || null);
    }
    commitHistory(filtered);
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
          status: 'review_needed' as const,
        };
      }
      return f;
    });
    setFiles(updated);
    scheduleHistory(updated);
  };

  const handleImportedOto = (comparisons: OtoComparisonResult[]) => {
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
    scheduleHistory(updated);
  };

  const handleReclistMatches = (matches: MatchResult[]) => {
    const matchesByFileId = new Map(
      matches.filter(match => match.audioFile && match.reclistEntry)
        .map(match => [match.audioFile!.id, match.reclistEntry!])
    );
    const updated = files.map(file => {
      const entry = matchesByFileId.get(file.id);
      return entry ? {
        ...file,
        alias: entry.alias,
        lyrics: entry.phoneme,
        userModified: true,
        status: 'pending' as const,
      } : file;
    });
    setFiles(updated);
    commitHistory(updated);
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
    commitHistory(updated);
  };

  const handleUpdateAlias = (alias: string) => {
    if (!activeFileId) return;
    const updated = files.map(f => (f.id === activeFileId ? { ...f, alias, userModified: true, status: 'review_needed' as const } : f));
    setFiles(updated);
    scheduleHistory(updated);
  };

  const handleUpdatePhonemeText = (phonemeId: string, text: string) => {
    if (!activeFileId) return;
    const updated = files.map(f => {
      if (f.id === activeFileId && f.phonemes) {
        const nextPhonemes = f.phonemes.map(p => (p.id === phonemeId ? { ...p, phoneme: text, userModified: true } : p));
        return { ...f, phonemes: nextPhonemes, userModified: true, status: 'verified' as const };
      }
      return f;
    });
    setFiles(updated);
    scheduleHistory(updated);
  };

  const handleUpdateLyrics = (lyrics: string) => {
    if (!activeFileId) return;
    const updated = files.map(file => file.id === activeFileId
      ? { ...file, lyrics, phonemes: [], confidence: 0, status: 'pending' as const, issues: [], userModified: true }
      : file
    );
    setFiles(updated);
    scheduleHistory(updated);
  };

  const handleUpdateFileNotes = (fileId: string, updates: Pick<AudioFileItem, 'starred' | 'done' | 'tag' | 'note'>) => {
    const updated = files.map(file => file.id === fileId
      ? { ...file, ...updates, lastModified: Date.now() }
      : file
    );
    setFiles(updated);
    scheduleHistory(updated);
  };

  const handleUpdateActiveFileNotes = (updates: Pick<AudioFileItem, 'tag' | 'note'>) => {
    if (activeFileId) handleUpdateFileNotes(activeFileId, updates);
  };

  const handleAcceptActive = () => {
    if (!activeFileId) return;
    const updated = files.map(f => (f.id === activeFileId ? { ...f, confidence: 99, status: 'verified' as const, issues: [] } : f));
    setFiles(updated);
    commitHistory(updated);
  };

  const handlePackageVoicebank = async (
    metadata: VoicebankMetadata,
    imageToken?: string,
    imageName?: string
  ) => {
    if (!window.labelloDesktop) {
      throw new Error('Voicebank packaging is available in the native desktop app.');
    }
    try {
      const packageFiles = files.filter((file): file is AudioFileItem & { oto: OtoParameters; sourceToken: string } =>
        Boolean(file.oto && file.sourceToken && file.status === 'verified' && /\.wav$/i.test(file.name))
      );
      const content = generateOtoIniContent(packageFiles, {
        lineEnding: settings.lineEnding,
        encoding: settings.encoding,
        includeComments: false,
      });
      const result = await window.labelloDesktop.packageVoicebank({
        name: metadata.characterName,
        author: metadata.author,
        version: metadata.version,
        readme: metadata.readme,
        otoContent: content,
        encoding: settings.encoding,
        audioFiles: packageFiles.map(file => ({ name: file.name, token: file.sourceToken })),
        imageToken,
        imageName,
      });
      if (!result) return;
      setVoicebankMetadata(metadata);
      setImportErrors([]);
      setIsVoicebankPackageOpen(false);
    } catch (error) {
      throw new Error(`Could not package voicebank: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleAcceptFile = (fileId: string) => {
    const updated = files.map(f => (f.id === fileId ? { ...f, confidence: 99, status: 'verified' as const, issues: [] } : f));
    setFiles(updated);
    commitHistory(updated);
  };

  const handleAcceptAllHighConfidence = () => {
    const updated = files.map(f => {
      if (f.status === 'analyzed' && f.confidence >= 90 && f.issues.length === 0) {
        return { ...f, status: 'verified' as const, issues: [] };
      }
      return f;
    });
    setFiles(updated);
    commitHistory(updated);
    setIsReviewOpen(false);
  };

  // Re-analyze active sample
  const handleReanalyzeActive = async () => {
    const target = files.find(f => f.id === activeFileId);
    if (!target || !target.audioBuffer) return;
    if (mode === 'diffsinger' && !target.lyrics?.trim()) {
      setImportErrors(['Enter the expected phoneme sequence before generating timing estimates.']);
      return;
    }

    const result = await engineCoordinator.runCrossVerification(
      target.audioBuffer,
      target.name,
      target.alias || target.lyrics || 'a',
    mode,
    { profileId }
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
    commitHistory(updated);
  };

  // Save / Load Labello projects; .vbp remains openable for legacy projects.
  const handleSaveProject = async (): Promise<boolean> => {
    const projectData: LabelloProject = {
      format: 'labello-project',
      version: 2,
      name: projectName,
      mode,
      profileId,
      settings,
      voicebankMetadata,
      files: files.map(({ audioBuffer: _audioBuffer, waveformPeaks: _waveformPeaks, sourceToken: _sourceToken, ...file }) => file),
    };

    try {
      if (window.labelloDesktop) {
        const saved = await window.labelloDesktop.saveProject(
          projectData,
          files.map(file => ({ id: file.id, token: file.sourceToken }))
        );
        if (!saved) return false;
        const name = saved.filePath.split(/[\\/]/).pop()?.replace(/\.(?:labello|vbp)$/i, '');
        if (name) setProjectName(name);
        setImportErrors(saved.missingAudio.length > 0
          ? [`Audio for ${saved.missingAudio.length} file(s) could not be embedded; those labels will need their audio re-imported when reopening the project.`]
          : []);
        return true;
      }
      const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project_${mode}.labello`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (err) {
      setImportErrors([`Could not save project: ${err instanceof Error ? err.message : String(err)}`]);
      return false;
    }
  };

  const finishCloseAction = async (action: NonNullable<typeof pendingCloseAction>) => {
    setPendingCloseAction(null);
    setCloseSaveError(null);
    if (action === 'exit') {
      await window.labelloDesktop?.respondToCloseRequest(true);
      return;
    }
    if (action === 'new-project') {
      setIsNewProjectOpen(true);
      return;
    }
    if (action === 'open-project') {
      await handleLoadProject();
      return;
    }

    setProjectReady(false);
    setFiles([]);
    setMode('utau');
    setProfileId('japanese_cv');
    setProjectName('Vocal Labeling Workspace');
    setVoicebankMetadata({ characterName: 'Japanese Voicebank', author: '', version: '1.0', readme: '' });
    setActiveFileId(null);
    setSelectedPhonemeId(null);
    setImportErrors([]);
    replaceHistory([]);
  };

  const handleCloseChoice = async (choice: 'save' | 'discard' | 'cancel') => {
    const action = pendingCloseAction;
    if (!action) return;
    if (choice === 'cancel') {
      setPendingCloseAction(null);
      setCloseSaveError(null);
      if (action === 'exit') await window.labelloDesktop?.respondToCloseRequest(false);
      return;
    }
    if (choice === 'save') {
      setCloseSaveError(null);
      setIsSavingBeforeClose(true);
      const saved = await handleSaveProject();
      setIsSavingBeforeClose(false);
      if (!saved) {
        setCloseSaveError('The project was not saved. Try again, choose Don’t Save, or cancel and continue editing.');
        return;
      }
    }
    await finishCloseAction(action);
  };

  const restoreProject = async (project: LabelloProject, audioTokens: Record<string, string> = {}, missingAudio: string[] = []) => {
    if (!Array.isArray(project.files)) throw new Error('The selected file does not contain a valid project file list.');
    const restored: AudioFileItem[] = [];
    const missingAudioSet = new Set(missingAudio);
    const errors: string[] = missingAudio.map(name => `Audio for "${name}" was not found beside the project.`);

    for (const savedFile of project.files) {
      if (!savedFile || typeof savedFile.id !== 'string' || typeof savedFile.name !== 'string') continue;
      let audioBuffer: AudioBuffer | undefined;
      let waveformPeaks: Float32Array | undefined;
      const sourceToken = audioTokens[savedFile.id];
      if (sourceToken && window.labelloDesktop) {
        try {
          const bytes = await window.labelloDesktop.readAudioFile(sourceToken);
          const buffer = new ArrayBuffer(bytes.byteLength);
          new Uint8Array(buffer).set(bytes);
          audioBuffer = await decodeAudioData(buffer);
          waveformPeaks = extractPeaks(audioBuffer, 1200);
        } catch (err) {
          errors.push(`Could not restore audio for "${savedFile.name}": ${err instanceof Error ? err.message : String(err)}`);
        }
      } else if (!missingAudioSet.has(savedFile.name)) {
        errors.push(`Audio for "${savedFile.name}" is not embedded in this project. Re-import the source audio to edit it.`);
      }
      restored.push({
        ...savedFile,
        audioBuffer,
        waveformPeaks,
        sourceToken,
        issues: Array.isArray(savedFile.issues) ? savedFile.issues : [],
        lastModified: Number.isFinite(savedFile.lastModified) ? savedFile.lastModified : Date.now(),
      });
    }

    setFiles(restored);
    setActiveFileId(restored[0]?.id || null);
    setSelectedPhonemeId(null);
    setProjectName(project.name || 'Vocal Labeling Workspace');
    if (project.voicebankMetadata) {
      setVoicebankMetadata(current => ({ ...current, ...project.voicebankMetadata }));
    }
    if (project.mode === 'utau' || project.mode === 'diffsinger') setMode(project.mode);
    if (project.profileId) setProfileId(project.profileId);
    if (project.settings) setSettings(current => ({ ...current, ...project.settings }));
    replaceHistory(restored);
    setImportErrors(errors);
    setProjectReady(true);
    setIsNewProjectOpen(false);
  };

  const handleLoadProject = async () => {
    if (window.labelloDesktop) {
      try {
        const result = await window.labelloDesktop.openProject();
        if (result) await restoreProject(result.project as unknown as LabelloProject, result.audioTokens, result.missingAudio);
      } catch (err) {
        setImportErrors([`Could not open project: ${err instanceof Error ? err.message : String(err)}`]);
      }
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.labello,.vbp,.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text) as LabelloProject;
        await restoreProject(data, {}, data.files?.filter(file => file.audioPath).map(file => file.name) || []);
      } catch (err) {
        setImportErrors([`Could not open project: ${err instanceof Error ? err.message : String(err)}`]);
      }
    };
    input.click();
  };

  const handleCheckForUpdates = async () => {
    if (!window.labelloDesktop) {
      setUpdateStatus({ status: 'manual', message: 'Updates are available from the GitHub releases page.' });
      return;
    }
    try {
      await window.labelloDesktop.checkForUpdates();
    } catch (error) {
      setUpdateStatus({ status: 'error', message: error instanceof Error ? error.message : String(error) });
    }
  };

  const handleDownloadUpdate = async () => {
    if (!window.labelloDesktop) return;
    try {
      await window.labelloDesktop.downloadUpdate();
    } catch (error) {
      setUpdateStatus({ status: 'error', message: error instanceof Error ? error.message : String(error) });
    }
  };

  const handleInstallUpdate = async () => {
    if (!window.labelloDesktop) return;
    try {
      await window.labelloDesktop.installUpdate();
    } catch (error) {
      setUpdateStatus({ status: 'error', message: error instanceof Error ? error.message : String(error) });
    }
  };

  const handleOpenGitHubReleases = async () => {
    if (!window.labelloDesktop) {
      window.open('https://github.com/a204n-dev/Labello/releases/latest', '_blank', 'noopener,noreferrer');
      return;
    }
    try {
      await window.labelloDesktop.openReleasesPage();
    } catch (error) {
      setUpdateStatus({ status: 'error', message: error instanceof Error ? error.message : String(error) });
    }
  };

  const handleDeferUpdate = async () => {
    const version = updateStatus.version;
    if (!version || !window.labelloDesktop) return;
    try {
      await window.labelloDesktop.deferUpdate(version);
      setDeferredUpdateVersion(version);
    } catch (error) {
      setUpdateStatus({ status: 'error', message: `Could not save update preference: ${error instanceof Error ? error.message : String(error)}` });
    }
  };

  useEffect(() => {
    const handleProjectShortcut = (event: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((event.target as HTMLElement).tagName)) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void handleSaveProject();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        void handleOpenAudio();
      }
    };
    window.addEventListener('keydown', handleProjectShortcut);
    return () => window.removeEventListener('keydown', handleProjectShortcut);
  });

  // Active File & Dataset Health Report
  const activeFile = files.find(f => f.id === activeFileId) || null;
  const activeProfile = getProfileById(profileId);
  const healthReport = validateDatasetHealth(files, mode);
  const reviewCount = files.filter(file =>
    file.status === 'review_needed' ||
    (file.status === 'analyzed' && (file.confidence < 90 || file.issues.length > 0))
  ).length;
  const updateAvailable = updatePreferenceLoaded &&
    (updateStatus.status === 'available' || updateStatus.status === 'downloaded') &&
    !!updateStatus.version &&
    updateStatus.version !== deferredUpdateVersion;

  return (
    <div data-color-mode="dark" data-dark-theme="dark" className="flex h-screen w-screen min-w-0 flex-col overflow-hidden bg-slate-950 font-sans antialiased text-slate-100 select-none">
      {projectReady ? (
        <>
          <Header
        mode={mode}
        projectName={projectName}
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
        onLoadProject={handleOpenAnotherProject}
        onNewProject={handleNewProject}
        onCloseProject={handleCloseProject}
        onOpenAudio={() => { void handleOpenAudio(); }}
        onOpenAudioFolder={() => { void handleOpenAudio(true); }}
        onImportLabels={() => { void handleImportLabels(); }}
        onImportOto={() => setIsImportOtoOpen(true)}
        onPackageVoicebank={() => setIsVoicebankPackageOpen(true)}
        onOpenReclistMatch={() => setIsReclistMatchOpen(true)}
        enableSpectrogram={settings.enableSpectrogram}
        onToggleSpectrogram={() => setSettings(s => ({ ...s, enableSpectrogram: !s.enableSpectrogram }))}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onToggleProperties={() => setPropertiesOpen(!propertiesOpen)}
        sidebarOpen={sidebarOpen}
        propertiesOpen={propertiesOpen}
      />

      {updateAvailable && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 border-b border-state-info-border/60 bg-state-info-bg/40 px-4 py-2 text-xs text-state-info-text">
          <span>
            {updateStatus.status === 'downloaded'
              ? `Labello ${updateStatus.version} is downloaded and ready to install.`
              : `Labello ${updateStatus.version} is available on GitHub.`}
          </span>
          <div className="flex items-center gap-2">
            {updateStatus.status === 'downloaded' ? (
              <button onClick={() => { void handleInstallUpdate(); }} className="rounded-md bg-state-info-bg px-2.5 py-1 font-semibold text-white hover:bg-state-info-bg/80">
                Restart to install
              </button>
            ) : (
              <button onClick={() => setIsReleasesOpen(true)} className="rounded-md bg-state-info-bg px-2.5 py-1 font-semibold text-white hover:bg-state-info-bg/80">
                Review update
              </button>
            )}
            <button onClick={() => { void handleDeferUpdate(); }} className="rounded-md px-2.5 py-1 font-medium text-state-info-text hover:bg-state-info-bg/50">
              Later
            </button>
          </div>
        </div>
      )}

      {/* Friendly import-error banner (Phase 2: never crash on a bad file) */}
      {importErrors.length > 0 && (
        <div role="alert" className="bg-state-warning-bg border-b border-state-warning-border px-4 py-2 text-xs text-state-warning-text flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            {importErrors.map((msg, i) => (
              <div key={i}>⚠ {msg}</div>
            ))}
          </div>
          <button onClick={() => setImportErrors([])} className="shrink-0 rounded px-2 py-0.5 font-semibold hover:bg-state-warning-bg/60">
            Dismiss
          </button>
        </div>
      )}
      {importNotice && (
        <div role="status" className="flex items-center justify-between gap-3 border-b border-state-success-border/60 bg-state-success-bg/25 px-4 py-2 text-xs text-state-success-text">
          <span>{importNotice}</span>
          <button onClick={() => setImportNotice(null)} className="shrink-0 rounded px-2 py-0.5 font-semibold hover:bg-state-success-bg/50">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workspace Layout (Left: Explorer, Center: Waveform, Right: Inspector) */}
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden relative">
        {/* Left: Audio Files Explorer */}
        {sidebarOpen && (
          <SidebarFileList
            files={files}
            activeFileId={activeFileId}
            mode={mode}
            onSelectFile={setActiveFileId}
            onAddFiles={handleAddFiles}
            onRequestAddFiles={() => { void handleOpenAudio(); }}
            onLoadDemoVoicebank={loadDemoVoicebank}
            onLoadDemoSingingPhrase={loadDemoSingingPhrase}
            onDeleteFile={handleDeleteFile}
            onUpdateFileNotes={handleUpdateFileNotes}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(false)}
            width={sidebarWidth}
            onWidthChange={setSidebarWidth}
            defaultWidth={256}
          />
        )}

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
          onOpenAudio={() => { void handleOpenAudio(); }}
          onOpenAudioFolder={() => { void handleOpenAudio(true); }}
        />

        {/* Right: Acoustic & Engine Agreement Inspector */}
        {propertiesOpen && (
          <PropertiesPanel
            activeFile={activeFile}
            mode={mode}
            profile={activeProfile}
            selectedPhonemeId={selectedPhonemeId}
            onUpdateOto={handleUpdateOto}
            onUpdateAlias={handleUpdateAlias}
            onUpdateLyrics={handleUpdateLyrics}
            onUpdateFileNotes={handleUpdateActiveFileNotes}
            onUpdatePhonemeText={handleUpdatePhonemeText}
            onAcceptFileOrRegion={handleAcceptActive}
            onReanalyzeCurrent={handleReanalyzeActive}
            isOpen={propertiesOpen}
            onToggle={() => setPropertiesOpen(false)}
            width={propertiesWidth}
            onWidthChange={setPropertiesWidth}
            defaultWidth={320}
          />
        )}
      </div>
        </>
      ) : (
        <main className="flex flex-1 items-center justify-center px-6 text-center">
          <div className="max-w-md space-y-3">
            <img src="/labello-icon.png" alt="" className="mx-auto h-14 w-14 rounded-xl border border-border-subtle object-cover" />
            <h1 className="text-lg font-semibold text-text-primary">Start with one focused workflow</h1>
            <p className="text-sm leading-6 text-text-secondary">Choose a project type to open the matching labeling workspace.</p>
          </div>
        </main>
      )}

      {/* Modals & Drawers */}
      <NewProjectModal
        isOpen={!projectReady || isNewProjectOpen}
        isInitial={!projectReady}
        initialMode={mode}
        onClose={() => setIsNewProjectOpen(false)}
        onCreate={handleCreateProject}
        onOpenExisting={handleOpenAnotherProject}
      />

      <ReviewQueueModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        files={files}
        onSelectFile={setActiveFileId}
        onAcceptFile={handleAcceptFile}
        onAcceptAllHighConfidence={handleAcceptAllHighConfidence}
      />

      <DatasetHealthModal
        isOpen={isHealthOpen}
        onClose={() => setIsHealthOpen(false)}
        report={healthReport}
        onSelectFile={setActiveFileId}
        onRemoveFile={handleDeleteFile}
      />

      <ModelDiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
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
        updateStatus={updateStatus}
        onCheckForUpdates={() => { void handleCheckForUpdates(); }}
        onDownloadUpdate={() => { void handleDownloadUpdate(); }}
        onInstallUpdate={() => { void handleInstallUpdate(); }}
        onOpenGitHubReleases={() => { void handleOpenGitHubReleases(); }}
        onLater={() => { void handleDeferUpdate(); }}
      />

      <BatchProgressModal
        isOpen={isBatchOpen}
        isAnalyzing={isAnalyzing}
        isCancellationRequested={batchCancellationRequested}
        total={batchTotal}
        current={batchCurrent}
        currentFileName={currentBatchFile}
        currentStage={batchStage}
        isPaused={batchPaused}
        onTogglePause={() => {
          const paused = !batchPaused;
          batchPauseRef.current = paused;
          setBatchPaused(paused);
        }}
        onCancel={() => {
          if (isAnalyzing) {
            batchCancelRef.current = true;
            batchPauseRef.current = false;
            setBatchPaused(false);
            setBatchCancellationRequested(true);
            setBatchStage('Cancelling after the current sample.');
            return;
          }
          setIsBatchOpen(false);
          setBatchCancellationRequested(false);
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
        otoEntries={files.flatMap((file, index) => file.oto ? [{
          fileName: file.name,
          alias: file.alias || file.name.replace(/\.[^/.]+$/, ''),
          oto: file.oto,
          rawLine: '',
          lineNumber: index + 1,
        } satisfies ParsedOtoEntry] : [])}
        onSaveMatches={handleReclistMatches}
      />

      <VoicebankPackageModal
        isOpen={isVoicebankPackageOpen}
        onClose={() => setIsVoicebankPackageOpen(false)}
        metadata={voicebankMetadata}
        files={files}
        onMetadataChange={setVoicebankMetadata}
        onPackage={handlePackageVoicebank}
      />

      <CloseProjectModal
        isOpen={pendingCloseAction !== null}
        action={pendingCloseAction || 'exit'}
        isSaving={isSavingBeforeClose}
        error={closeSaveError}
        onSave={() => { void handleCloseChoice('save'); }}
        onDiscard={() => { void handleCloseChoice('discard'); }}
        onCancel={() => { void handleCloseChoice('cancel'); }}
      />
    </div>
  );
}

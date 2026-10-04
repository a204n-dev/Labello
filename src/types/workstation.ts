export type WorkstationMode = 'utau' | 'diffsinger';

export type VoicebankProfileId = 
  | 'japanese_cv' 
  | 'japanese_vcv' 
  | 'japanese_cvvc' 
  | 'english_arpasing' 
  | 'custom';

export interface VoicebankProfile {
  id: VoicebankProfileId;
  name: string;
  description: string;
  language: string;
  recordingStyle: 'CV' | 'VCV' | 'CVVC' | 'ARPAsing' | 'Other';
  sampleStructure: string;
  defaultOverlapRatio: number;
  expectedPhonemes: string[];
}

export interface OtoParameters {
  offsetMs: number;
  overlapMs: number;
  preutteranceMs: number;
  fixedMs: number;
  cutoffMs: number; // In UTAU: negative value means cutoff from sample end, positive from offset
}

export interface ParsedOtoEntry {
  fileName: string;
  alias: string;
  oto: OtoParameters;
  rawLine: string;
  lineNumber: number;
}

export interface DiffSingerPhoneme {
  id: string;
  phoneme: string;
  word?: string;
  startMs: number;
  endMs: number;
  pitchNote?: string;
  f0Hz?: number;
  isVoiced?: boolean;
  confidence: number;
  engineVotes?: Record<string, { phoneme: string; confidence: number; boundaryDeltaMs?: number }>;
  userModified?: boolean;
  status: 'high_confidence' | 'moderate' | 'needs_review' | 'conflict';
}

export interface EngineResultSummary {
  engineId: string;
  engineName: string;
  confidence: number;
  timestamp: string;
  suggestedPhoneme?: string;
  detectedBoundaries?: { startMs: number; endMs: number }[];
  details?: string;
}

export interface ValidationIssue {
  id: string;
  code: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  regionId?: string;
  fileId?: string;
  timestampMs?: number;
}

export interface AudioFileItem {
  id: string;
  name: string;
  sizeBytes: number;
  durationMs: number;
  sampleRate: number;
  channels: number;
  audioBuffer?: AudioBuffer;
  waveformPeaks?: Float32Array; // Min-max interleaved peaks for canvas
  sourceToken?: string;
  status: 'pending' | 'analyzing' | 'analyzed' | 'review_needed' | 'verified';
  confidence: number; // 0 - 100
  oto?: OtoParameters; // For UTAU
  alias?: string;      // UTAU alias name (e.g. "ka", "- ka", "a ka")
  phonemes?: DiffSingerPhoneme[]; // For DiffSinger
  lyrics?: string;     // Transcription or lyric text
  engineResults?: Record<string, EngineResultSummary>;
  starred?: boolean;
  done?: boolean;
  tag?: string;
  note?: string;
  issues: ValidationIssue[];
  lastModified: number;
  userModified: boolean;
}

export interface VoicebankMetadata {
  characterName: string;
  author: string;
  version: string;
  readme: string;
}

export type ProcessingMode = 'local_only' | 'prefer_local' | 'online_fallback';
export type AutomationLevel = 'conservative' | 'balanced' | 'aggressive';
export type LineEnding = 'CRLF' | 'LF';
export type TextEncoding = 'Shift-JIS' | 'UTF-8' | 'UTF-8-BOM';

export interface ProjectSettings {
  processingMode: ProcessingMode;
  automationLevel: AutomationLevel;
  lineEnding: LineEnding;
  encoding: TextEncoding;
  workerCount: number;
  enableSpectrogram: boolean;
  snapToZeroCrossings: boolean;
  confidenceThresholdReview: number; // e.g. 70
  confidenceThresholdAutoAccept: number; // e.g. 90
}

export interface ProjectState {
  id: string;
  name: string;
  mode: WorkstationMode;
  profileId: VoicebankProfileId;
  files: AudioFileItem[];
  activeFileId: string | null;
  selectedPhonemeId: string | null;
  settings: ProjectSettings;
  createdAt: string;
  updatedAt: string;
}

export interface EngineStatus {
  id: string;
  name: string;
  version: string;
  type: 'local_dsp' | 'local_model' | 'local_tool' | 'online_fallback';
  isInstalled: boolean;
  isAvailable: boolean;
  pathOrEndpoint?: string;
  description: string;
  confidenceWeight: number; // e.g. 0.9 for SOFA, 0.8 for Whisper, 0.7 for DSP
}

export interface DatasetHealthReport {
  overallScore: number; // 0 - 100
  totalFiles: number;
  validFiles: number;
  needsReviewFiles: number;
  totalLabels: number;
  highConfidenceCount: number;
  mediumConfidenceCount: number;
  lowConfidenceCount: number;
  issues: ValidationIssue[];
  statistics: {
    averageDurationMs: number;
    clippedSamplesCount: number;
    emptyLabelsCount: number;
    overlappingCount: number;
    suspiciousDurationsCount: number;
  };
}

export interface HardwareInfo {
  platform: string;
  arch: string;
  cpuModel: string;
  cpuCores: number;
  totalMemoryGb: string;
  freeMemoryGb: string;
  recommendedWorkers: number;
  hasGpuHint: boolean;
  windowsCompatible: boolean;
}

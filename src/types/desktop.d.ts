interface DesktopAudioFile {
  token: string;
  name: string;
}

interface DesktopProjectResult {
  project: {
    version?: string;
    name?: string;
    mode?: 'utau' | 'diffsinger';
    profileId?: string;
    settings?: Record<string, unknown>;
    files: Array<Record<string, unknown> & { id: string; name: string }>;
  };
  audioTokens: Record<string, string>;
  missingAudio: string[];
}

interface DesktopUpdateStatus {
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'not-available' | 'manual' | 'error';
  version?: string;
  percent?: number;
  message?: string;
}

interface DesktopVoicebankPackageRequest {
  name: string;
  author: string;
  version: string;
  readme: string;
  otoContent: string;
  encoding: 'Shift-JIS' | 'UTF-8' | 'UTF-8-BOM';
  audioFiles: Array<{ name: string; token: string }>;
  imageToken?: string;
  imageName?: string;
}

interface LabelloDesktopApi {
  openAudioFiles(): Promise<DesktopAudioFile[]>;
  openAudioFolder(): Promise<DesktopAudioFile[]>;
  openLabelFiles(): Promise<DesktopAudioFile[]>;
  registerAudioFile(file: File): Promise<DesktopAudioFile>;
  registerLocalFile(file: File): Promise<DesktopAudioFile>;
  readAudioFile(token: string): Promise<Uint8Array>;
  getHardwareInfo(): Promise<{
    platform: string;
    arch: string;
    cpuModel: string;
    cpuCores: number;
    totalMemoryGb: string;
    freeMemoryGb: string;
    recommendedWorkers: number;
    hasGpuHint: boolean;
    windowsCompatible: boolean;
  }>;
  saveExport(fileName: string, contents: string, encoding: 'Shift-JIS' | 'UTF-8' | 'UTF-8-BOM'): Promise<{ filePath: string } | null>;
  saveProject(project: object, assets: Array<{ id: string; token?: string }>): Promise<{ filePath: string; missingAudio: string[] } | null>;
  openProject(): Promise<DesktopProjectResult | null>;
  packageVoicebank(request: DesktopVoicebankPackageRequest): Promise<{ folderPath: string } | null>;
  setProjectOpen(isOpen: boolean): Promise<void>;
  respondToCloseRequest(shouldClose: boolean): Promise<void>;
  onCloseRequested(callback: () => void): () => void;
  checkForUpdates(): Promise<void>;
  downloadUpdate(): Promise<void>;
  installUpdate(): Promise<void>;
  openReleasesPage(): Promise<void>;
  getDeferredUpdateVersion(): Promise<string | null>;
  deferUpdate(version: string): Promise<void>;
  onUpdateStatus(callback: (status: DesktopUpdateStatus) => void): () => void;
}

interface Window {
  labelloDesktop?: LabelloDesktopApi;
}

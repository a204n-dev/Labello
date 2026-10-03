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

interface LabelloDesktopApi {
  openAudioFiles(): Promise<DesktopAudioFile[]>;
  openAudioFolder(): Promise<DesktopAudioFile[]>;
  registerAudioFile(file: File): Promise<DesktopAudioFile>;
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
}

interface Window {
  labelloDesktop?: LabelloDesktopApi;
}

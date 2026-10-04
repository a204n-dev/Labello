import React, { useEffect, useRef, useState } from 'react';
import {
  AudioLines,
  Check,
  ChevronLeft,
  ChevronRight,
  FileAudio2,
  FileText,
  FolderOpen,
  Languages,
  Mic2,
  Music2,
  Upload,
  X,
} from 'lucide-react';
import { VoicebankProfileId, WorkstationMode } from '../types/workstation';
import { VOICEBANK_PROFILES, getProfileById } from '../services/oto/otoProfiles';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

type VoicebankLanguage = 'Japanese' | 'English' | 'Chinese' | 'Other';

interface NewProjectModalProps {
  isOpen: boolean;
  isInitial: boolean;
  initialMode: WorkstationMode;
  onClose: () => void;
  onCreate: (
    mode: WorkstationMode,
    name: string,
    profileId?: VoicebankProfileId,
    audioFiles?: File[],
    baseOtoFile?: File | null,
  ) => void;
  onOpenExisting: () => void;
}

const projectOptions: Array<{
  mode: WorkstationMode;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    mode: 'utau',
    title: 'UTAU Voice Bank Maker',
    subtitle: 'Author and package a voicebank',
    description: 'Choose a language and reclist format, add recordings, and optionally bring in an existing oto.ini.',
    icon: <Mic2 className="h-5 w-5" />,
  },
  {
    mode: 'diffsinger',
    title: 'Vocal dataset labeling',
    subtitle: 'NNSVS · ENUNU · DiffSinger',
    description: 'Create phoneme labels and review timing estimates for singing datasets.',
    icon: <AudioLines className="h-5 w-5" />,
  },
];

const languages: VoicebankLanguage[] = ['Japanese', 'English', 'Chinese', 'Other'];

function getProfilesForLanguage(language: VoicebankLanguage) {
  if (language === 'Other') return [getProfileById('custom')];
  return VOICEBANK_PROFILES.filter(profile => profile.language === language);
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  isInitial,
  initialMode,
  onClose,
  onCreate,
  onOpenExisting,
}) => {
  const [mode, setMode] = useState<WorkstationMode>(initialMode);
  const [name, setName] = useState('');
  const [setupStep, setSetupStep] = useState(0);
  const [language, setLanguage] = useState<VoicebankLanguage>('Japanese');
  const [profileId, setProfileId] = useState<VoicebankProfileId>('japanese_cv');
  const [audioFiles, setAudioFiles] = useState<File[]>([]);
  const [baseOtoFile, setBaseOtoFile] = useState<File | null>(null);
  const [isAudioDragOver, setIsAudioDragOver] = useState(false);
  const [isOtoDragOver, setIsOtoDragOver] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const otoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setMode(initialMode);
    setName(initialMode === 'utau' ? 'Japanese Voicebank' : 'Vocal Dataset');
    setSetupStep(0);
    setLanguage('Japanese');
    setProfileId('japanese_cv');
    setAudioFiles([]);
    setBaseOtoFile(null);
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const selectedProfile = getProfileById(profileId);
  const languageProfiles = getProfilesForLanguage(language);
  const isVoicebankSetup = mode === 'utau' && setupStep > 0;

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    const projectName = name.trim();
    if (!projectName) return;
    if (mode === 'utau') {
      onCreate(mode, projectName, profileId, audioFiles, baseOtoFile);
    } else {
      onCreate(mode, projectName);
    }
  };

  const appendAudioFiles = (incoming: FileList | File[]) => {
    const accepted = Array.from(incoming).filter(file =>
      /\.(wav|flac|mp3|ogg|oga|m4a|aac)$/i.test(file.name)
    );
    setAudioFiles(current => {
      const known = new Set(current.map(file => `${file.name.toLowerCase()}:${file.size}:${file.lastModified}`));
      return [...current, ...accepted.filter(file => {
        const key = `${file.name.toLowerCase()}:${file.size}:${file.lastModified}`;
        if (known.has(key)) return false;
        known.add(key);
        return true;
      })];
    });
  };

  const chooseLanguage = (nextLanguage: VoicebankLanguage) => {
    const nextProfiles = getProfilesForLanguage(nextLanguage);
    setLanguage(nextLanguage);
    setProfileId(nextProfiles[0]?.id || 'custom');
    if (nextLanguage === 'Japanese') setName('Japanese Voicebank');
    else if (nextLanguage === 'English') setName('English Voicebank');
    else if (nextLanguage === 'Chinese') setName('Chinese Voicebank');
    else setName('Custom Voicebank');
  };

  const beginVoicebankSetup = () => {
    if (mode === 'utau') {
      setSetupStep(1);
      return;
    }
    onCreate(mode, name.trim());
  };

  const renderWorkflowChoice = () => (
    <>
      <fieldset>
        <legend className="mb-2 text-xs font-semibold text-text-secondary">Project workflow</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {projectOptions.map(option => {
            const selected = mode === option.mode;
            return (
              <button
                key={option.mode}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setMode(option.mode);
                  setName(option.mode === 'utau' ? 'Japanese Voicebank' : 'Vocal Dataset');
                  setSetupStep(0);
                }}
                className={`min-h-36 rounded-md border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
                  selected
                    ? option.mode === 'utau'
                      ? 'border-mode-utau bg-mode-utau/10 text-text-primary'
                      : 'border-mode-diffsinger bg-mode-diffsinger/10 text-text-primary'
                    : 'border-border-subtle bg-bg-primary text-text-secondary hover:border-border-default hover:bg-bg-tertiary'
                }`}
              >
                <span className={`inline-flex h-9 w-9 items-center justify-center rounded-md ${
                  selected
                    ? option.mode === 'utau'
                      ? 'bg-mode-utau/15 text-mode-utau'
                      : 'bg-mode-diffsinger/15 text-mode-diffsinger'
                    : 'bg-bg-tertiary text-text-muted'
                }`}>
                  {option.icon}
                </span>
                <span className="mt-3 block text-sm font-semibold">{option.title}</span>
                <span className="mt-1 block text-[11px] font-medium text-text-muted">{option.subtitle}</span>
                <span className="mt-2 block text-xs leading-5 text-text-secondary">{option.description}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {mode === 'diffsinger' && (
        <>
          <div>
            <label htmlFor="new-project-name" className="mb-1.5 block text-xs font-semibold text-text-secondary">
              Project name
            </label>
            <input
              id="new-project-name"
              autoFocus
              value={name}
              onChange={event => setName(event.target.value)}
              maxLength={120}
              required
              placeholder="Name this project"
              className="min-h-8 w-full rounded-md border border-border-default bg-bg-primary px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none"
            />
          </div>
          <p className="flex items-start gap-2 text-xs leading-5 text-text-muted">
            <Languages className="mt-0.5 h-4 w-4 shrink-0 text-mode-diffsinger" />
            This is the shared vocal-dataset workspace. Dedicated NNSVS, ENUNU, and learned alignment engines are not connected yet.
          </p>
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-4">
        <Button type="button" variant="ghost" onClick={onOpenExisting} icon={<FolderOpen className="h-4 w-4" />}>
          Open existing project
        </Button>
        {mode === 'utau' ? (
          <Button type="button" onClick={beginVoicebankSetup} icon={<ChevronRight className="h-4 w-4" />} iconPosition="right">
            Configure voicebank
          </Button>
        ) : (
          <Button type="submit" disabled={!name.trim()} icon={<FileAudio2 className="h-4 w-4" />}>
            Create project
          </Button>
        )}
      </div>
    </>
  );

  const renderLanguageStep = () => (
    <section aria-labelledby="voicebank-language-heading">
      <h3 id="voicebank-language-heading" className="text-sm font-semibold">Which language is this voicebank for?</h3>
      <p className="mt-1 text-xs text-text-muted">This sets language-aware filename and alias defaults where supported.</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {languages.map(option => {
          const selected = language === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => chooseLanguage(option)}
              className={`flex min-h-11 items-center justify-between rounded-md border px-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
                selected
                  ? 'border-mode-utau bg-mode-utau/10 text-text-primary'
                  : 'border-border-default bg-bg-primary text-text-secondary hover:bg-bg-hover'
              }`}
            >
              {option}
              {selected && <Check className="h-4 w-4 text-mode-utau" />}
            </button>
          );
        })}
      </div>
    </section>
  );

  const renderFormatStep = () => (
    <section aria-labelledby="voicebank-format-heading">
      <h3 id="voicebank-format-heading" className="text-sm font-semibold">Which reclist format are you using?</h3>
      <p className="mt-1 text-xs text-text-muted">{language} format profiles set timing defaults; they do not identify phonemes in audio.</p>
      <div className="mt-4 space-y-2">
        {languageProfiles.map(profile => {
          const selected = profileId === profile.id;
          return (
            <button
              key={profile.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setProfileId(profile.id)}
              className={`flex w-full items-start justify-between gap-3 rounded-md border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
                selected
                  ? 'border-mode-utau bg-mode-utau/10'
                  : 'border-border-default bg-bg-primary hover:bg-bg-hover'
              }`}
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium text-text-primary">{profile.name}</span>
                <span className="mt-1 block text-xs leading-5 text-text-muted">{profile.description}</span>
              </span>
              {selected && <Check className="mt-0.5 h-4 w-4 shrink-0 text-mode-utau" />}
            </button>
          );
        })}
      </div>
    </section>
  );

  const renderAudioStep = () => (
    <section aria-labelledby="voicebank-audio-heading">
      <h3 id="voicebank-audio-heading" className="text-sm font-semibold">Add your voice recordings</h3>
      <p className="mt-1 text-xs text-text-muted">Select or drop the audio files for this {selectedProfile.name} voicebank.</p>
      <input
        ref={audioInputRef}
        type="file"
        accept=".wav,.flac,.mp3,.ogg,.oga,.m4a,.aac"
        multiple
        className="sr-only"
        onChange={event => {
          if (event.target.files) appendAudioFiles(event.target.files);
          event.target.value = '';
        }}
      />
      <div
        role="button"
        tabIndex={0}
        aria-label="Choose or drop voice recordings"
        onClick={() => audioInputRef.current?.click()}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            audioInputRef.current?.click();
          }
        }}
        onDragOver={event => { event.preventDefault(); setIsAudioDragOver(true); }}
        onDragLeave={() => setIsAudioDragOver(false)}
        onDrop={event => {
          event.preventDefault();
          setIsAudioDragOver(false);
          appendAudioFiles(event.dataTransfer.files);
        }}
        className={`mt-4 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-4 py-5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
          isAudioDragOver ? 'border-border-focus bg-bg-hover' : 'border-border-default bg-bg-primary hover:bg-bg-hover'
        }`}
      >
        <Upload className="h-5 w-5 text-mode-utau" />
        <span className="mt-2 text-sm font-medium text-text-primary">Drop audio files here or browse</span>
        <span className="mt-1 text-xs text-text-muted">WAV, FLAC, MP3, OGG, M4A, AAC</span>
      </div>
      {audioFiles.length > 0 && (
        <div className="mt-3 max-h-36 overflow-y-auto rounded-md border border-border-subtle" aria-label={`${audioFiles.length} selected audio files`}>
          {audioFiles.map((file, index) => (
            <div key={`${file.name}:${file.size}:${file.lastModified}`} className="flex min-h-8 items-center gap-2 border-b border-border-subtle px-2.5 last:border-b-0">
              <Music2 className="h-3.5 w-3.5 shrink-0 text-text-muted" />
              <span className="min-w-0 flex-1 truncate text-xs text-text-primary">{file.name}</span>
              <span className="text-[11px] text-text-muted">{formatBytes(file.size)}</span>
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={() => setAudioFiles(current => current.filter((_, itemIndex) => itemIndex !== index))}
                className="rounded p-1 text-text-muted hover:bg-bg-hover hover:text-text-primary"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      {audioFiles.length === 0 && <p className="mt-2 text-xs text-state-warning-text">Add at least one recording to continue.</p>}
    </section>
  );

  const renderOtoStep = () => (
    <section aria-labelledby="voicebank-oto-heading">
      <h3 id="voicebank-oto-heading" className="text-sm font-semibold">Bring an existing oto.ini?</h3>
      <p className="mt-1 text-xs leading-5 text-text-muted">
        Optional. Labello matches entries to the recordings by filename and uses the existing aliases and timing values as your starting point.
      </p>
      <input
        ref={otoInputRef}
        type="file"
        accept=".ini,.oto,.txt"
        className="sr-only"
        onChange={event => {
          setBaseOtoFile(event.target.files?.[0] || null);
          event.target.value = '';
        }}
      />
      <div
        role="button"
        tabIndex={0}
        aria-label="Choose or drop an existing oto.ini file"
        onClick={() => otoInputRef.current?.click()}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            otoInputRef.current?.click();
          }
        }}
        onDragOver={event => { event.preventDefault(); setIsOtoDragOver(true); }}
        onDragLeave={() => setIsOtoDragOver(false)}
        onDrop={event => {
          event.preventDefault();
          setIsOtoDragOver(false);
          const file = Array.from<File>(event.dataTransfer.files).find(candidate => /\.(ini|oto|txt)$/i.test(candidate.name));
          if (file) setBaseOtoFile(file);
        }}
        className={`mt-4 flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-4 py-4 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
          isOtoDragOver ? 'border-border-focus bg-bg-hover' : 'border-border-default bg-bg-primary hover:bg-bg-hover'
        }`}
      >
        <FileText className="h-5 w-5 text-mode-utau" />
        <span className="mt-2 text-sm font-medium text-text-primary">Drop oto.ini here or browse</span>
        <span className="mt-1 text-xs text-text-muted">Shift-JIS, UTF-8, and UTF-16 encodings are detected</span>
      </div>

      {baseOtoFile ? (
        <div className="mt-3 flex min-h-9 items-center gap-2 rounded-md border border-border-default bg-bg-tertiary px-3">
          <FileText className="h-4 w-4 shrink-0 text-text-muted" />
          <span className="min-w-0 flex-1 truncate text-xs text-text-primary">{baseOtoFile.name}</span>
          <button type="button" onClick={() => setBaseOtoFile(null)} className="rounded px-2 py-1 text-xs text-text-secondary hover:bg-bg-hover">
            Remove
          </button>
        </div>
      ) : (
        <p className="mt-2 text-xs text-text-muted">No base oto selected. You can add one later from the File menu.</p>
      )}

      <div className="mt-4">
        <label htmlFor="new-project-name" className="mb-1.5 block text-xs font-semibold text-text-secondary">Voicebank project name</label>
        <input
          id="new-project-name"
          value={name}
          onChange={event => setName(event.target.value)}
          maxLength={120}
          required
          placeholder="Name this voicebank"
          className="min-h-8 w-full rounded-md border border-border-default bg-bg-primary px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none"
        />
      </div>
    </section>
  );

  const stepTitles = ['Choose language', 'Choose format', 'Add recordings', 'Base oto.ini'];
  const title = isVoicebankSetup
    ? `UTAU Voice Bank Maker · ${stepTitles[setupStep - 1]}`
    : isInitial ? 'Create a Labello project' : 'New project';
  const description = isVoicebankSetup
    ? `Question ${setupStep} of 4`
    : 'Choose a workflow. The UTAU maker will guide you through its setup.';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      icon={isVoicebankSetup ? <Mic2 className="h-5 w-5" /> : <FileAudio2 className="h-5 w-5" />}
      size="lg"
      showCloseButton={!isInitial || isVoicebankSetup}
    >
      <form onSubmit={handleCreate} className="space-y-5">
        {!isVoicebankSetup && renderWorkflowChoice()}
        {setupStep === 1 && renderLanguageStep()}
        {setupStep === 2 && renderFormatStep()}
        {setupStep === 3 && renderAudioStep()}
        {setupStep === 4 && renderOtoStep()}

        {isVoicebankSetup && (
          <div className="flex items-center justify-between gap-3 border-t border-border-subtle pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSetupStep(step => Math.max(0, step - 1))}
              icon={<ChevronLeft className="h-4 w-4" />}
            >
              Back
            </Button>
            {setupStep < 4 ? (
              <Button
                type="button"
                onClick={() => setSetupStep(step => Math.min(4, step + 1))}
                disabled={setupStep === 3 && audioFiles.length === 0}
                icon={<ChevronRight className="h-4 w-4" />}
                iconPosition="right"
              >
                Continue
              </Button>
            ) : (
              <Button type="submit" disabled={!name.trim()} icon={<Check className="h-4 w-4" />}>
                {baseOtoFile ? 'Create voicebank project' : 'Skip oto.ini and create'}
              </Button>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
};

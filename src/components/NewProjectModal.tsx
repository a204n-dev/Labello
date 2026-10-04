import React, { useEffect, useState } from 'react';
import { AudioLines, FileAudio2, FolderOpen, Languages, Mic2 } from 'lucide-react';
import { WorkstationMode } from '../types/workstation';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

interface NewProjectModalProps {
  isOpen: boolean;
  isInitial: boolean;
  initialMode: WorkstationMode;
  onClose: () => void;
  onCreate: (mode: WorkstationMode, name: string) => void;
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
    title: 'UTAU Auto-OTO',
    subtitle: 'Japanese voicebank timing',
    description: 'Prepare a voicebank using Japanese CV, CVVC, or VCV recordings.',
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

  useEffect(() => {
    if (!isOpen) return;
    setMode(initialMode);
    setName(initialMode === 'utau' ? 'Japanese Voicebank' : 'Vocal Dataset');
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    const projectName = name.trim();
    if (!projectName) return;
    onCreate(mode, projectName);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isInitial ? 'Create a Labello project' : 'New project'}
      description="Choose one workflow for this project. Its tools stay focused on that task."
      icon={<FileAudio2 className="h-5 w-5" />}
      size="lg"
      showCloseButton={!isInitial}
    >
      <form onSubmit={handleCreate} className="space-y-6">
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
                  }}
                  className={`min-h-36 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
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
            className="w-full rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none"
          />
        </div>

        {mode === 'diffsinger' && (
          <p className="flex items-start gap-2 text-xs leading-5 text-text-muted">
            <Languages className="mt-0.5 h-4 w-4 shrink-0 text-mode-diffsinger" />
            This is the shared vocal-dataset workspace. Dedicated NNSVS, ENUNU, and learned alignment engines are not connected yet.
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onOpenExisting}
            icon={<FolderOpen className="h-4 w-4" />}
          >
            Open existing project
          </Button>
          <Button type="submit" disabled={!name.trim()} icon={<FileAudio2 className="h-4 w-4" />}>
            Create project
          </Button>
        </div>
      </form>
    </Modal>
  );
};

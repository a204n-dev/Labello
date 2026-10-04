import React from 'react';
import { AlertCircle, Save, X } from 'lucide-react';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

interface CloseProjectModalProps {
  isOpen: boolean;
  action: 'exit' | 'close-project' | 'new-project' | 'open-project';
  isSaving: boolean;
  error: string | null;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

const actionCopy = {
  exit: {
    title: 'Save before closing Labello?',
    description: 'Your project is not saved automatically. Save it before quitting, discard this session, or cancel and return to the project.',
  },
  'close-project': {
    title: 'Save before closing this project?',
    description: 'Save the project before returning to the workflow chooser, discard this session, or cancel and keep editing.',
  },
  'new-project': {
    title: 'Save before starting a new project?',
    description: 'Save the current project before replacing it, discard this session, or cancel and keep editing.',
  },
  'open-project': {
    title: 'Save before opening another project?',
    description: 'Save the current project before opening another one, discard this session, or cancel and keep editing.',
  },
};

export const CloseProjectModal: React.FC<CloseProjectModalProps> = ({
  isOpen,
  action,
  isSaving,
  error,
  onSave,
  onDiscard,
  onCancel,
}) => {
  const copy = actionCopy[action];

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSaving ? () => {} : onCancel}
      title={copy.title}
      description={copy.description}
      icon={<AlertCircle className="h-5 w-5" />}
      size="md"
      showCloseButton={!isSaving}
    >
      {error && <p role="alert" className="mb-4 rounded-lg border border-state-error-border bg-state-error-bg px-3 py-2 text-xs text-state-error-text">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={isSaving} icon={<X className="h-4 w-4" />}>Cancel</Button>
        <Button variant="secondary" onClick={onDiscard} disabled={isSaving}>Don’t Save</Button>
        <Button variant="primary" onClick={onSave} disabled={isSaving} icon={<Save className="h-4 w-4" />}>
          {isSaving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </Modal>
  );
};

import React, { useEffect, useMemo, useState } from 'react';
import { Archive, ImagePlus, Package, X } from 'lucide-react';
import { AudioFileItem, VoicebankMetadata } from '../types/workstation';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

interface VoicebankPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: VoicebankMetadata;
  files: AudioFileItem[];
  onMetadataChange: (metadata: VoicebankMetadata) => void;
  onPackage: (metadata: VoicebankMetadata, imageToken?: string, imageName?: string) => Promise<void>;
}

const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.bmp', '.gif', '.webp']);

export const VoicebankPackageModal: React.FC<VoicebankPackageModalProps> = ({
  isOpen,
  onClose,
  metadata,
  files,
  onMetadataChange,
  onPackage,
}) => {
  const [image, setImage] = useState<{ token: string; name: string; previewUrl: string } | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isPackaging, setIsPackaging] = useState(false);
  const [packageError, setPackageError] = useState<string | null>(null);
  const includedFiles = useMemo(() => files.filter(file => file.oto && file.sourceToken && file.status === 'verified' && /\.wav$/i.test(file.name)), [files]);
  const unreviewedCount = files.filter(file => file.oto && file.status !== 'verified').length;
  const unavailableCount = files.filter(file => file.oto && file.status === 'verified' && !file.sourceToken).length;
  const unsupportedCount = files.filter(file => file.oto && file.sourceToken && file.status === 'verified' && !/\.wav$/i.test(file.name)).length;

  useEffect(() => () => {
    if (image) URL.revokeObjectURL(image.previewUrl);
  }, [image]);

  useEffect(() => {
    if (isOpen) setPackageError(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const update = (key: keyof VoicebankMetadata, value: string) => {
    onMetadataChange({ ...metadata, [key]: value });
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setImageError(null);
    if (!file) return;

    const extension = file.name.match(/\.[^.]+$/)?.[0].toLowerCase() || '';
    if (!imageExtensions.has(extension)) {
      setImageError('Choose a PNG, JPEG, BMP, GIF, or WebP image.');
      return;
    }
    if (!window.labelloDesktop) {
      setImageError('Choose the portrait from the native desktop app to include it in the package.');
      return;
    }
    try {
      const registered = await window.labelloDesktop.registerLocalFile(file);
      if (image) URL.revokeObjectURL(image.previewUrl);
      setImage({
        token: registered.token,
        name: file.name,
        previewUrl: URL.createObjectURL(file),
      });
    } catch (error) {
      setImageError(`Could not add portrait: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handlePackage = async () => {
    setIsPackaging(true);
    setPackageError(null);
    try {
      await onPackage(metadata, image?.token, image?.name);
    } catch (error) {
      setPackageError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsPackaging(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Package UTAU voicebank"
      description="Create a ready-to-open voicebank folder with reviewed oto timings, recordings, and character files."
      icon={<Package className="h-5 w-5" />}
      size="lg"
    >
      <div className="space-y-5">
        {packageError && <p role="alert" className="rounded-lg border border-state-error-border bg-state-error-bg px-3 py-2 text-xs text-state-error-text">{packageError}</p>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <div>
              <label htmlFor="voicebank-character-name" className="mb-1 block text-xs font-semibold text-text-secondary">Character name</label>
              <input id="voicebank-character-name" value={metadata.characterName} onChange={event => update('characterName', event.target.value)} maxLength={120} className="w-full rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none" />
            </div>
            <div>
              <label htmlFor="voicebank-author" className="mb-1 block text-xs font-semibold text-text-secondary">Voice provider / author</label>
              <input id="voicebank-author" value={metadata.author} onChange={event => update('author', event.target.value)} maxLength={120} className="w-full rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none" />
            </div>
            <div>
              <label htmlFor="voicebank-version" className="mb-1 block text-xs font-semibold text-text-secondary">Version</label>
              <input id="voicebank-version" value={metadata.version} onChange={event => update('version', event.target.value)} maxLength={40} className="w-full rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none" />
            </div>
          </div>

          <div>
            <span className="mb-1 block text-xs font-semibold text-text-secondary">Character portrait</span>
            <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-default bg-bg-tertiary/50 p-3 text-center text-xs text-text-secondary transition-colors hover:border-border-focus hover:bg-bg-tertiary focus-within:outline-none focus-within:ring-2 focus-within:ring-border-focus">
              {image ? (
                <img src={image.previewUrl} alt={`Selected portrait: ${image.name}`} className="max-h-24 max-w-full rounded object-contain" />
              ) : (
                <ImagePlus className="h-6 w-6 text-text-muted" />
              )}
              <span className="max-w-full truncate">{image?.name || 'Choose an image (optional)'}</span>
              <input type="file" accept="image/png,image/jpeg,image/bmp,image/gif,image/webp" onChange={event => { void handleImageChange(event); }} className="sr-only" />
            </label>
            {imageError && <p role="alert" className="mt-1 text-xs text-state-error-text">{imageError}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="voicebank-readme" className="mb-1 block text-xs font-semibold text-text-secondary">README</label>
          <textarea
            id="voicebank-readme"
            value={metadata.readme}
            onChange={event => update('readme', event.target.value)}
            placeholder={`About ${metadata.characterName || 'this voicebank'}\n\nRecording format: Japanese CV / CVVC / VCV\nCredits and usage notes...`}
            rows={4}
            className="w-full resize-y rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-xs leading-5 text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-4">
          <div className="text-xs text-text-secondary">
            <span className="inline-flex items-center gap-1.5 font-medium text-text-primary"><Archive className="h-3.5 w-3.5" />{includedFiles.length} recording{includedFiles.length === 1 ? '' : 's'} with OTO settings</span>
            {unreviewedCount > 0 && <p className="mt-1 text-state-warning-text">{unreviewedCount} sample{unreviewedCount === 1 ? ' needs' : 's need'} review and confirmation before packaging.</p>}
            {unavailableCount > 0 && <p className="mt-1 text-state-warning-text">{unavailableCount} confirmed sample{unavailableCount === 1 ? '' : 's'} have no available source audio.</p>}
            {unsupportedCount > 0 && <p className="mt-1 text-state-warning-text">{unsupportedCount} verified non-WAV recording{unsupportedCount === 1 ? ' is' : 's are'} skipped; UTAU voicebanks require WAV samples.</p>}
            {includedFiles.length === 0 && unreviewedCount === 0 && unavailableCount === 0 && unsupportedCount === 0 && <p className="mt-1 text-state-warning-text">Estimate OTO settings, refine the labels, and accept at least one sample as verified.</p>}
            <p className="mt-1 text-text-muted">Only verified WAV recordings are included.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose} icon={<X className="h-4 w-4" />}>Cancel</Button>
            <Button variant="primary" onClick={() => { void handlePackage(); }} disabled={!metadata.characterName.trim() || includedFiles.length === 0 || isPackaging} icon={<Package className="h-4 w-4" />}>
              {isPackaging ? 'Packaging…' : 'Build voicebank folder'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

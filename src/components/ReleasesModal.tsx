import React, { useState } from 'react';
import { Check, Clock3, Copy, Download, ExternalLink, Laptop, Package, RefreshCw, ShieldCheck, Terminal } from 'lucide-react';
import { Modal } from './ui/Modal';

interface ReleasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateStatus: DesktopUpdateStatus;
  onCheckForUpdates: () => void;
  onDownloadUpdate: () => void;
  onInstallUpdate: () => void;
  onOpenGitHubReleases: () => void;
  onLater: () => void;
}

const buildCommands = 'npm ci\nnpm run dist:win';
const releaseCommands = 'git tag -a v1.0.1 -m "Labello desktop release"\ngit push origin v1.0.1';

export const ReleasesModal: React.FC<ReleasesModalProps> = ({
  isOpen,
  onClose,
  updateStatus,
  onCheckForUpdates,
  onDownloadUpdate,
  onInstallUpdate,
  onOpenGitHubReleases,
  onLater,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const copyBuildCommand = async () => {
    await navigator.clipboard.writeText(buildCommands);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const updateMessage = (() => {
    switch (updateStatus.status) {
      case 'checking':
        return 'Checking GitHub releases…';
      case 'available':
        return `Labello ${updateStatus.version} is available. It will download only after you choose Download update.`;
      case 'downloading':
        return `Downloading update${updateStatus.version ? ` ${updateStatus.version}` : ''}…`;
      case 'downloaded':
        return `Labello ${updateStatus.version} is downloaded. Restart when you are ready to install it.`;
      case 'not-available':
        return 'You are using the latest available version.';
      case 'manual':
        return updateStatus.message || 'This portable or development build updates from the GitHub releases page.';
      case 'error':
        return updateStatus.message || 'Could not check GitHub releases.';
      default:
        return 'Check GitHub releases for a newer desktop version. Updates download and install only when you choose.';
    }
  })();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="About Labello"
      description="Native audio-dataset labeling and UTAU voicebank authoring"
      icon={<Package className="h-5 w-5" />}
      size="lg"
    >
        <div className="space-y-5 text-xs">
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 rounded-md border border-blue-500/20 bg-blue-500/10 p-2 text-blue-300">
                  <RefreshCw className={`h-4 w-4 ${updateStatus.status === 'checking' ? 'animate-spin' : ''}`} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-text-primary">Updates from GitHub</h3>
                  <p className={`mt-1 leading-relaxed ${updateStatus.status === 'error' ? 'text-state-error-text' : 'text-slate-300'}`} role="status">
                    {updateMessage}
                  </p>
                </div>
              </div>
              {(updateStatus.status === 'idle' || updateStatus.status === 'not-available' || updateStatus.status === 'error') && (
                <button onClick={onCheckForUpdates} className="shrink-0 rounded-md bg-slate-800 px-3 py-1.5 font-semibold text-slate-200 hover:bg-slate-700">
                  Check now
                </button>
              )}
            </div>

            {updateStatus.status === 'downloading' && (
              <div className="mt-3" role="progressbar" aria-label="Downloading update" aria-valuemin={0} aria-valuemax={100} aria-valuenow={updateStatus.percent || 0}>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-blue-400 transition-[width]" style={{ width: `${Math.max(0, Math.min(100, updateStatus.percent || 0))}%` }} />
                </div>
                <p className="mt-1 text-right text-[10px] text-slate-400">{Math.max(0, Math.min(100, updateStatus.percent || 0))}%</p>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {updateStatus.status === 'available' && (
                <>
                  <button onClick={onDownloadUpdate} className="inline-flex min-h-8 items-center gap-1.5 rounded-md bg-blue-500 px-3 py-1.5 font-semibold text-white hover:bg-blue-400">
                    <Download className="h-3.5 w-3.5" /> Download update
                  </button>
                  <button onClick={onLater} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold text-slate-300 hover:bg-slate-800">
                    <Clock3 className="h-3.5 w-3.5" /> Later
                  </button>
                </>
              )}
              {updateStatus.status === 'downloaded' && (
                <>
                  <button onClick={onInstallUpdate} className="inline-flex min-h-8 items-center gap-1.5 rounded-md bg-blue-500 px-3 py-1.5 font-semibold text-white hover:bg-blue-400">
                    <RefreshCw className="h-3.5 w-3.5" /> Restart and install
                  </button>
                  <button onClick={onLater} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold text-slate-300 hover:bg-slate-800">
                    <Clock3 className="h-3.5 w-3.5" /> Later
                  </button>
                </>
              )}
              {(updateStatus.status === 'manual' || updateStatus.status === 'error') && (
                <button onClick={onOpenGitHubReleases} className="inline-flex min-h-8 items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold text-blue-300 hover:bg-slate-800">
                  <ExternalLink className="h-3.5 w-3.5" /> Open GitHub releases
                </button>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <Laptop className="mt-0.5 h-4 w-4 shrink-0 text-state-success-text" />
            <div>
              <h3 className="font-semibold text-text-primary">Windows desktop builds</h3>
              <p className="mt-1 leading-relaxed text-text-secondary">The Windows release workflow produces an installer and a portable Electron executable. Labello opens in its own window; it does not launch a browser.</p>
              <a href="https://github.com/a204n-dev/Labello/releases" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 font-semibold text-state-success-text hover:text-text-primary">
                <span>View releases</span><ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="mb-2 flex items-center gap-2 font-bold uppercase tracking-wider text-slate-400">
              <Terminal className="h-3.5 w-3.5 text-blue-400" />
              <span>Build for Windows</span>
            </div>
            <pre className="overflow-x-auto rounded-md border border-slate-800 bg-slate-900 p-3 font-mono text-[11px] text-blue-200">{buildCommands}</pre>
            <button onClick={copyBuildCommand} className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-1.5 font-semibold text-slate-200 hover:bg-slate-700">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied' : 'Copy build command'}</span>
            </button>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="mb-2 flex items-center gap-2 font-bold uppercase tracking-wider text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
              <span>Analysis availability</span>
            </div>
            <p className="leading-relaxed text-slate-400">Local acoustic DSP is available. SOFA, Whisper, MFA, and cloud verification are not yet connected; generated labels are estimates and should be reviewed.</p>
          </div>

          <details className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
            <summary className="cursor-pointer font-semibold text-slate-300">Create a release from a version tag</summary>
            <pre className="mt-3 overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 font-mono text-[11px] text-slate-300">{releaseCommands}</pre>
          </details>
        </div>
    </Modal>
  );
};

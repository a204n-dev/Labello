import React, { useState } from 'react';
import { Check, Copy, ExternalLink, Laptop, Package, ShieldCheck, Terminal, X } from 'lucide-react';

interface ReleasesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const buildCommands = 'npm ci\nnpm run dist:win';
const releaseCommands = 'git tag -a v1.0.1 -m "Labello desktop release"\ngit push origin v1.0.1';

export const ReleasesModal: React.FC<ReleasesModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const copyBuildCommand = async () => {
    await navigator.clipboard.writeText(buildCommands);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <section className="w-full max-w-2xl overflow-hidden rounded-xl border border-slate-800 bg-slate-900 text-slate-200 shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-2 text-indigo-400"><Package className="h-5 w-5" /></div>
            <div>
              <h2 className="text-sm font-bold text-white">Labello desktop app</h2>
              <p className="text-xs text-slate-400">Native file workflows with a dedicated desktop window</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-4 w-4" /></button>
        </header>

        <div className="space-y-5 p-5 text-xs">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <Laptop className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <div>
              <h3 className="font-semibold text-emerald-200">Windows desktop builds</h3>
              <p className="mt-1 leading-relaxed text-emerald-100/75">The Windows release workflow produces an installer and a portable Electron executable. Labello opens in its own window; it does not launch a browser.</p>
              <a href="https://github.com/a204n-dev/Labello/releases" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 font-semibold text-emerald-300 hover:text-white">
                <span>View releases</span><ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="mb-2 flex items-center gap-2 font-bold uppercase tracking-wider text-slate-400">
              <Terminal className="h-3.5 w-3.5 text-indigo-400" />
              <span>Build for Windows</span>
            </div>
            <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 font-mono text-[11px] text-indigo-200">{buildCommands}</pre>
            <button onClick={copyBuildCommand} className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-1.5 font-semibold text-slate-200 hover:bg-slate-700">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied' : 'Copy build command'}</span>
            </button>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="mb-2 flex items-center gap-2 font-bold uppercase tracking-wider text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
              <span>Analysis availability</span>
            </div>
            <p className="leading-relaxed text-slate-400">Local acoustic DSP is available. SOFA, Whisper, MFA, and cloud verification are not yet connected; generated labels are estimates and should be reviewed.</p>
          </div>

          <details className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
            <summary className="cursor-pointer font-semibold text-slate-300">Create a release from a version tag</summary>
            <pre className="mt-3 overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 font-mono text-[11px] text-slate-300">{releaseCommands}</pre>
          </details>
        </div>
      </section>
    </div>
  );
};

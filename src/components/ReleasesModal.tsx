import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Package, 
  ExternalLink, 
  ShieldCheck, 
  Terminal, 
  Check, 
  Copy, 
  AlertCircle,
  FileCode2,
  FolderArchive,
  Laptop
} from 'lucide-react';

interface ReleasesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReleasesModal: React.FC<ReleasesModalProps> = ({ isOpen, onClose }) => {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const gitReleaseCommands = `git tag -a v1.0.0 -m "Release v1.0.0: Windows Desktop Installer"
git push origin v1.0.0`;

  const localBuildCommands = `npm install
npm run dist:win`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-200">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">Windows .exe Releases & Installation</h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                  v1.0.0 Ready
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official Windows 64-bit installer, portable executable, and automated GitHub Actions release pipeline.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5 text-xs">
          
          {/* Release Assets Cards */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Laptop className="w-3.5 h-3.5 text-indigo-400" />
              <span>Windows Release Executables (GitHub Releases)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Installer .exe Card */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-emerald-400" />
                      <span>Windows Setup (.exe)</span>
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      NSIS Installer
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Full installer with desktop icon, Start Menu shortcuts, file associations (`.vbp`, `.oto`), and clean uninstaller.
                  </p>
                  <div className="font-mono text-[10px] text-slate-500 truncate pt-1">
                    Artifact: VLabeler-Next-Setup-1.0.0-x64.exe
                  </div>
                </div>

                <a
                  href="https://github.com/releases"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold rounded-md shadow-sm transition-colors text-center"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Setup.exe</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              </div>

              {/* Portable .exe Card */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white flex items-center gap-1.5">
                      <FolderArchive className="w-4 h-4 text-indigo-400" />
                      <span>Portable Edition (.exe)</span>
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      Zero-Install
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Single self-contained `.exe` file. Carry on a USB flash drive and run instantly without administrator privileges.
                  </p>
                  <div className="font-mono text-[10px] text-slate-500 truncate pt-1">
                    Artifact: VLabeler-Next-Portable-1.0.0-x64.exe
                  </div>
                </div>

                <a
                  href="https://github.com/releases"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 font-semibold rounded-md border border-slate-700 transition-colors text-center"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>Download Portable .exe</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              </div>
            </div>
          </div>

          {/* Windows SmartScreen Notice */}
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-amber-300">Windows SmartScreen Note</span>
              <p className="text-[11px] text-amber-200/80 leading-relaxed">
                Because open-source community builds are self-signed, Windows Defender SmartScreen may display: 
                <span className="font-mono bg-amber-950/60 px-1 py-0.5 rounded mx-1 text-amber-200">"Windows protected your PC"</span>.
                Click <strong>"More info"</strong> and then <strong>"Run anyway"</strong> to install.
              </p>
            </div>
          </div>

          {/* How GitHub Actions Automatically Builds the .exe */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 text-xs">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                <span>How to Trigger an Automated GitHub Release</span>
              </span>
              <span className="text-[10px] font-mono text-indigo-400">CI/CD: .github/workflows/release.yml</span>
            </div>

            <p className="text-slate-400 text-[11px] leading-relaxed">
              Whenever you push your repository to GitHub, you can generate a new Windows release with attached `.exe` installers in two ways:
            </p>

            <div className="space-y-2">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-slate-300 font-semibold text-[11px]">Method A: Create and Push a Version Tag</span>
                  <button
                    onClick={() => copyToClipboard(gitReleaseCommands, 'tag')}
                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded hover:bg-slate-800 transition-colors"
                  >
                    {copiedCmd === 'tag' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCmd === 'tag' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="font-mono text-[11px] text-indigo-300 whitespace-pre overflow-x-auto">
                  {gitReleaseCommands}
                </pre>
              </div>

              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 text-[11px]">
                <strong className="text-slate-200">Method B: Manual GitHub Actions Dispatch</strong>
                <p className="mt-0.5">
                  Navigate to the <strong>Actions</strong> tab in your GitHub repository, select <strong>"Build and Release Windows Executables"</strong>, and click <strong>"Run workflow"</strong>. The workflow will automatically compile the Windows `.exe` and create the release with download assets.
                </p>
              </div>
            </div>
          </div>

          {/* Building Locally on Windows */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 text-xs">
                <FileCode2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Build the .exe Locally on Windows</span>
              </span>
              <button
                onClick={() => copyToClipboard(localBuildCommands, 'local')}
                className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded hover:bg-slate-800 transition-colors"
              >
                {copiedCmd === 'local' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCmd === 'local' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-900 border border-slate-800 rounded-lg font-mono text-[11px] text-emerald-300 whitespace-pre overflow-x-auto">
              {localBuildCommands}
            </pre>
            <p className="text-[11px] text-slate-400">
              Output executables are placed in the <code className="text-slate-300 bg-slate-900 px-1 py-0.5 rounded font-mono">./release/</code> folder.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-slate-500 text-[11px] flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>SHA-256 Checksums published with every release</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-md transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

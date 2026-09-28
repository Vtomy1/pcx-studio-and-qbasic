import React from 'react';
import { Terminal, Download, FileCode, Cpu, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  onDownloadPcx: () => void;
  onDownloadBas: () => void;
  onOpenSpecsModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onDownloadPcx,
  onDownloadBas,
  onOpenSpecsModal,
}) => {
  return (
    <header className="border-b border-zinc-800 bg-[#0e1420]/90 backdrop-blur-md sticky top-0 z-40 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 flex items-center justify-center shadow-lg shadow-amber-500/20 border border-amber-400/30">
            <Terminal className="w-5 h-5 text-zinc-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white font-mono flex items-center gap-1.5">
                PCX<span className="text-amber-400">STUDIO</span>
                <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60 font-sans">
                  v3.0 ZSoft
                </span>
              </h1>
            </div>
            <p className="text-xs text-zinc-400 flex items-center gap-2 font-mono">
              <span>1-bit</span>•<span>2-bit CGA</span>•<span>4-bit EGA</span>•<span>8-bit VGA</span>•<span>24-bit Truecolor</span>
            </p>
          </div>
        </div>

        {/* Badges / Tech highlights */}
        <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-zinc-400 bg-zinc-900/80 px-3 py-1.5 rounded-md border border-zinc-800">
          <span className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" /> Spec Compliant RLE
          </span>
          <span className="text-zinc-600">|</span>
          <span className="text-amber-300">QuickBASIC 4.5 / 1.1 / QB64</span>
          <span className="text-zinc-600">|</span>
          <span className="text-cyan-400">Even BytesPerLine Enforced</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSpecsModal}
            className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
            title="View PCX File Format Specification"
          >
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">PCX Spec</span>
          </button>

          <button
            onClick={onDownloadPcx}
            className="flex items-center gap-1.5 text-xs font-mono px-3.5 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold transition-all shadow-md shadow-amber-500/20 active:scale-95"
            title="Download binary .PCX file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export .PCX</span>
          </button>

          <button
            onClick={onDownloadBas}
            className="flex items-center gap-1.5 text-xs font-mono px-3.5 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-all shadow-md shadow-cyan-600/20 active:scale-95"
            title="Download QBasic .BAS source code"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Export .BAS</span>
          </button>
        </div>
      </div>
    </header>
  );
};

import React from 'react';
import { X, BookOpen, Layers, Terminal, AlertTriangle, ShieldCheck } from 'lucide-react';

interface SpecsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SpecsModal: React.FC<SpecsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#121824] border border-zinc-700 rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-sm">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-[#0e1420]">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base text-zinc-100 font-mono">
              ZSoft PCX & QBasic Technical Specification
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-zinc-300 font-sans leading-relaxed">
          {/* Section 1: PCX File Architecture */}
          <div>
            <h4 className="text-amber-400 font-bold font-mono text-sm flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4" /> 1. PCX File Structure Anatomy
            </h4>
            <p className="text-xs text-zinc-400 mb-3">
              The PCX format (originally created for PC Paintbrush) consists of three contiguous blocks:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 font-mono text-xs">
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                <span className="text-cyan-400 font-bold block mb-1">1. Header (128 Bytes)</span>
                <span className="text-zinc-400 text-[11px]">
                  Fixed-size block containing version, dimensions, bit depth, planes, scanline byte pitch, and 16-color colormap.
                </span>
              </div>
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                <span className="text-amber-400 font-bold block mb-1">2. RLE Scanline Data</span>
                <span className="text-zinc-400 text-[11px]">
                  Variable-length compressed pixel bytes. In planar modes (4-bit EGA / 24-bit), planes are sequenced line-by-line.
                </span>
              </div>
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                <span className="text-emerald-400 font-bold block mb-1">3. VGA Palette (769 Bytes)</span>
                <span className="text-zinc-400 text-[11px]">
                  For 8-bit files only: begins with marker <code>0x0C</code> (12) followed by 768 bytes (256 × 3 RGB values 0..255).
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Run-Length Encoding Algorithm */}
          <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800">
            <h4 className="text-amber-400 font-bold font-mono text-sm flex items-center gap-2 mb-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> 2. RLE Compression Rules
            </h4>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-zinc-300">
              <li>
                <strong>Run Flag:</strong> If the two highest bits of a byte are set (<code>byte &gt;= 0xC0</code> or <code>192 dec</code>), it represents a run length count: <code>count = byte &amp; 0x3F</code> (1 to 63 bytes). The immediately following byte is the repeated pixel value.
              </li>
              <li>
                <strong>Single Byte Rule:</strong> Any literal byte with value &gt;= 192 (even if it does not repeat) <em>must</em> be encoded as a run of 1 (e.g. <code>0xC1 [value]</code>).
              </li>
              <li>
                <strong>Even Scanline Rule:</strong> The <code>BytesPerLine</code> header field <em>must always be an even number</em>. Odd-width scanlines must be padded with a trailing dummy byte.
              </li>
            </ul>
          </div>

          {/* Section 3: Color Depth Breakdown */}
          <div>
            <h4 className="text-cyan-400 font-bold font-mono text-sm mb-2">
              3. Color Depths & Hardware Bitplane Mapping
            </h4>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded bg-zinc-900/40 border border-zinc-800">
                <span className="font-bold text-zinc-200">1-Bit Monochrome (SCREEN 11 / 2):</span> 1 bit/pixel, 1 plane. 8 pixels packed per byte (MSB leftmost).
              </div>
              <div className="p-2.5 rounded bg-zinc-900/40 border border-zinc-800">
                <span className="font-bold text-zinc-200">2-Bit CGA (SCREEN 1):</span> 2 bits/pixel, 1 plane. 4 pixels packed per byte. Uses hardware palettes (0 or 1, High/Low intensity).
              </div>
              <div className="p-2.5 rounded bg-zinc-900/40 border border-zinc-800">
                <span className="font-bold text-zinc-200">4-Bit EGA (SCREEN 7 / 12):</span> 1 bit/pixel, <strong>4 planar bitplanes</strong> (Blue, Green, Red, Intensity). Each scanline contains Plane 0, then Plane 1, Plane 2, Plane 3.
              </div>
              <div className="p-2.5 rounded bg-zinc-900/40 border border-zinc-800">
                <span className="font-bold text-zinc-200">8-Bit VGA (SCREEN 13):</span> 8 bits/pixel, 1 plane chunky. 320x200 bytes match the &amp;HA000 framebuffer 1:1. Full 256 colors from 262,144 color palette.
              </div>
              <div className="p-2.5 rounded bg-zinc-900/40 border border-zinc-800">
                <span className="font-bold text-zinc-200">24-Bit Truecolor:</span> 8 bits/pixel, 3 planes (Red, Green, Blue). Up to 16.7 million colors.
              </div>
            </div>
          </div>

          {/* Section 4: QBasic Hardware Programming Notes */}
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <h4 className="text-amber-300 font-bold font-mono text-sm flex items-center gap-2 mb-1.5">
              <Terminal className="w-4 h-4" /> 4. QBasic VGA Hardware Access
            </h4>
            <p className="text-xs text-zinc-300 mb-2">
              In MS-DOS, the VGA DAC (Digital-to-Analog Converter) takes 6-bit color components (0 to 63) instead of standard 8-bit (0 to 255):
            </p>
            <div className="bg-zinc-950 p-2.5 rounded font-mono text-xs text-amber-200">
              <code>OUT &amp;H3C8, 0 ' Select palette register index 0</code><br />
              <code>OUT &amp;H3C9, r% \ 4 ' Write 6-bit Red component (0..63)</code><br />
              <code>OUT &amp;H3C9, g% \ 4 ' Write 6-bit Green component</code><br />
              <code>OUT &amp;H3C9, b% \ 4 ' Write 6-bit Blue component</code>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-[#0e1420] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono text-xs transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};

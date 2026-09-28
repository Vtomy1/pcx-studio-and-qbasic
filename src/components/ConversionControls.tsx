import React from 'react';
import { ColorDepth, DitherAlgorithm, PaletteChoice } from '../types/pcx';
import { Palette, Wand2, Monitor, Layers } from 'lucide-react';

interface ConversionControlsProps {
  depth: ColorDepth;
  onDepthChange: (depth: ColorDepth) => void;
  paletteChoice: PaletteChoice;
  onPaletteChoiceChange: (choice: PaletteChoice) => void;
  dither: DitherAlgorithm;
  onDitherChange: (dither: DitherAlgorithm) => void;
  ditherStrength: number;
  onDitherStrengthChange: (val: number) => void;
  serpentine: boolean;
  onSerpentineChange: (val: boolean) => void;
}

const DEPTH_OPTIONS: { depth: ColorDepth; label: string; desc: string; screen: string }[] = [
  { depth: '1-bit', label: '1-Bit Mono', desc: '2 colors (1 plane)', screen: 'SCREEN 11 / 2' },
  { depth: '2-bit', label: '2-Bit CGA', desc: '4 colors (1 plane)', screen: 'SCREEN 1' },
  { depth: '4-bit', label: '4-Bit EGA', desc: '16 colors (4 planes)', screen: 'SCREEN 7 / 12' },
  { depth: '8-bit', label: '8-Bit VGA', desc: '256 colors + 768b DAC', screen: 'SCREEN 13' },
  { depth: '24-bit', label: '24-Bit RGB', desc: 'Truecolor (3 planes)', screen: 'Truecolor PCX' },
];

const DITHER_OPTIONS: { id: DitherAlgorithm; label: string; desc: string }[] = [
  { id: 'floyd-steinberg', label: 'Floyd-Steinberg', desc: 'Standard 4-way error diffusion' },
  { id: 'atkinson', label: 'Atkinson', desc: 'High-contrast classic 6-neighbor' },
  { id: 'bayer-4x4', label: 'Bayer 4×4', desc: 'Retro ordered crosshatch pattern' },
  { id: 'bayer-8x8', label: 'Bayer 8×8', desc: 'Fine-grain ordered dot matrix' },
  { id: 'bayer-2x2', label: 'Bayer 2×2', desc: 'Coarse 4-level ordered pattern' },
  { id: 'sierra', label: 'Sierra 2-Row', desc: 'Smooth horizontal error spread' },
  { id: 'burkes', label: 'Burkes', desc: 'Clean 7-neighbor diffusion' },
  { id: 'none', label: 'None (Threshold)', desc: 'Nearest exact palette match' },
];

export const ConversionControls: React.FC<ConversionControlsProps> = ({
  depth,
  onDepthChange,
  paletteChoice,
  onPaletteChoiceChange,
  dither,
  onDitherChange,
  ditherStrength,
  onDitherStrengthChange,
  serpentine,
  onSerpentineChange,
}) => {
  // Determine relevant palettes based on depth
  const getPaletteOptions = (): { id: PaletteChoice; label: string }[] => {
    switch (depth) {
      case '1-bit':
        return [
          { id: 'mono-white', label: 'Monochrome (White on Black)' },
          { id: 'mono-green', label: 'P1 Green Phosphor CRT' },
          { id: 'mono-amber', label: 'P3 Amber Phosphor CRT' },
        ];
      case '2-bit':
        return [
          { id: 'cga-1-high', label: 'CGA 1 High (Black, Cyan, Magenta, White)' },
          { id: 'cga-1-low', label: 'CGA 1 Low (Black, Dark Cyan, Dark Magenta, Gray)' },
          { id: 'cga-0-high', label: 'CGA 0 High (Black, Light Green, Light Red, Yellow)' },
          { id: 'cga-0-low', label: 'CGA 0 Low (Black, Green, Red, Brown)' },
        ];
      case '4-bit':
        return [
          { id: 'ega-16', label: 'Standard 16-Color EGA / VGA Palette' },
          { id: 'adaptive', label: 'Adaptive 16-Color (Median-Cut Optimized)' },
        ];
      case '8-bit':
        return [
          { id: 'adaptive', label: 'Adaptive 256-Color (Optimal Palette + DAC)' },
          { id: 'vga-default', label: 'Standard BIOS VGA 256 Palette (EGA + Ramps)' },
        ];
      case '24-bit':
        return [{ id: 'adaptive', label: '24-Bit Direct RGB (No Palette Table)' }];
    }
  };

  return (
    <div className="bg-[#121824] rounded-xl border border-zinc-800 p-4 space-y-5 text-sm">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
        <h2 className="font-semibold text-zinc-100 flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-400" />
          <span>Format & Dithering Engine</span>
        </h2>
        <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 font-mono text-cyan-400">
          PCX v3.0 RLE
        </span>
      </div>

      {/* Color Depth Selector */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-zinc-400 flex items-center justify-between">
          <span>Target Color Depth</span>
          <span className="text-[11px] font-mono text-zinc-500">Bits / Pixel</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {DEPTH_OPTIONS.map((opt) => {
            const isSelected = depth === opt.depth;
            return (
              <button
                key={opt.depth}
                type="button"
                onClick={() => onDepthChange(opt.depth)}
                className={`text-left p-2.5 rounded-lg border transition-all ${
                  isSelected
                    ? 'border-amber-400 bg-amber-500/10 text-white shadow-sm shadow-amber-500/10'
                    : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 text-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold font-mono text-xs">{opt.label}</span>
                  <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-zinc-800 text-amber-300">
                    {opt.screen}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 mt-1 truncate">
                  {opt.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Palette Choice */}
      {depth !== '24-bit' && (
        <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
          <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-amber-400" />
            <span>Hardware Palette Mapping</span>
          </label>
          <select
            value={paletteChoice}
            onChange={(e) => onPaletteChoiceChange(e.target.value as PaletteChoice)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-400"
          >
            {getPaletteOptions().map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Dithering Algorithm */}
      {depth !== '24-bit' && (
        <div className="space-y-2 pt-2 border-t border-zinc-800/80">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
              <Wand2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Dithering Algorithm</span>
            </label>
            <span className="text-[10px] text-zinc-500 font-mono">
              Matrix / Diffusion
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {DITHER_OPTIONS.map((opt) => {
              const active = dither === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onDitherChange(opt.id)}
                  className={`text-left p-2 rounded border text-xs transition-all ${
                    active
                      ? 'border-amber-400 bg-amber-500/10 text-amber-300 font-medium'
                      : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 text-zinc-400'
                  }`}
                >
                  <div className="font-semibold text-[11px] truncate">{opt.label}</div>
                  <div className="text-[9px] text-zinc-500 truncate mt-0.5">{opt.desc}</div>
                </button>
              );
            })}
          </div>

          {/* Dither Strength Slider (only when dither != 'none') */}
          {dither !== 'none' && (
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs text-zinc-400 font-mono">
                <span>Dither Intensity</span>
                <span className="text-amber-400">{Math.round(ditherStrength * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(ditherStrength * 100)}
                onChange={(e) => onDitherStrengthChange(parseInt(e.target.value) / 100)}
                className="w-full accent-amber-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
              />

              {/* Serpentine Scan Toggle */}
              {dither !== 'bayer-2x2' && dither !== 'bayer-4x4' && dither !== 'bayer-8x8' && (
                <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={serpentine}
                    onChange={(e) => onSerpentineChange(e.target.checked)}
                    className="rounded border-zinc-700 text-amber-500 focus:ring-amber-400 bg-zinc-900"
                  />
                  <span>Serpentine scanning (alternates row direction to reduce worm artifacts)</span>
                </label>
              )}
            </div>
          )}
        </div>
      )}

      {/* Screen Mode Suggestion Banner */}
      <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800/90 text-xs text-zinc-400 flex items-start gap-2.5">
        <Monitor className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
        <div>
          <span className="font-semibold text-zinc-200">
            {depth === '8-bit' && 'Target: SCREEN 13 (VGA 320×200 256 colors)'}
            {depth === '4-bit' && 'Target: SCREEN 12 / SCREEN 7 (EGA/VGA 16 colors)'}
            {depth === '2-bit' && 'Target: SCREEN 1 (CGA 320×200 4 colors)'}
            {depth === '1-bit' && 'Target: SCREEN 11 / SCREEN 2 (Monochrome 2 colors)'}
            {depth === '24-bit' && 'Target: 24-bit Truecolor PCX file (16.7M colors, 3 planes)'}
          </span>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            {depth === '8-bit' && 'Header specifies 8 BPP, 1 plane. Palette appended as 0x0C + 768 bytes.'}
            {depth === '4-bit' && 'Header specifies 1 BPP, 4 planes (EGA bitplanes). 16 colors stored in header colormap.'}
            {depth === '2-bit' && 'Header specifies 2 BPP, 1 plane. 4 CGA colors stored in header colormap.'}
            {depth === '1-bit' && 'Header specifies 1 BPP, 1 plane. 2 colors stored in header colormap.'}
            {depth === '24-bit' && 'Header specifies 8 BPP, 3 planes (Red, Green, Blue). No color table needed.'}
          </p>
        </div>
      </div>
    </div>
  );
};

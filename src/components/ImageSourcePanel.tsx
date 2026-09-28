import React, { useRef } from 'react';
import { Upload, Sliders, Image as ImageIcon, Sparkles, RefreshCw, Scissors } from 'lucide-react';
import { SAMPLE_PRESETS, SamplePreset } from '../utils/sampleImages';

interface ImageSourcePanelProps {
  width: number;
  height: number;
  onDimensionChange: (w: number, h: number) => void;
  maintainAspect: boolean;
  onMaintainAspectChange: (val: boolean) => void;
  brightness: number;
  contrast: number;
  saturation: number;
  onAdjustmentChange: (brightness: number, contrast: number, saturation: number) => void;
  onImageLoaded: (img: HTMLImageElement, filename?: string) => void;
  onPresetSelect: (preset: SamplePreset) => void;
  selectedPresetId?: string;
  sourceFilename: string;
}

const RESOLUTION_PRESETS = [
  { label: '320 × 200 (Mode 13h / CGA)', w: 320, h: 200, tag: 'Standard DOS' },
  { label: '640 × 480 (Mode 12h / 11)', w: 640, h: 480, tag: 'Hi-Res VGA' },
  { label: '640 × 350 (Mode 9 EGA)', w: 640, h: 350, tag: 'EGA Hi-Res' },
  { label: '640 × 200 (Mode 2 CGA)', w: 640, h: 200, tag: 'CGA Mono' },
  { label: '320 × 240 (Mode X Square)', w: 320, h: 240, tag: 'Mode X' },
  { label: '160 × 100 (CGA Low-Res)', w: 160, h: 100, tag: 'Tweak 16c' },
];

export const ImageSourcePanel: React.FC<ImageSourcePanelProps> = ({
  width,
  height,
  onDimensionChange,
  maintainAspect,
  onMaintainAspectChange,
  brightness,
  contrast,
  saturation,
  onAdjustmentChange,
  onImageLoaded,
  onPresetSelect,
  selectedPresetId,
  sourceFilename,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        onImageLoaded(img, file.name);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        onImageLoaded(img, file.name);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-[#121824] rounded-xl border border-zinc-800 p-4 space-y-5 text-sm">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
        <h2 className="font-semibold text-zinc-100 flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-amber-400" />
          <span>Source & Canvas Setup</span>
        </h2>
        <span className="text-xs text-zinc-400 font-mono truncate max-w-[140px]">
          {sourceFilename}
        </span>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="group relative cursor-pointer border-2 border-dashed border-zinc-700 hover:border-amber-400/80 bg-zinc-900/50 hover:bg-zinc-900 rounded-lg p-3.5 text-center transition-all"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pcx"
          onChange={handleFileChange}
          className="hidden"
        />
        <Upload className="w-6 h-6 text-zinc-400 group-hover:text-amber-400 mx-auto mb-1.5 transition-colors" />
        <p className="text-xs font-medium text-zinc-200">
          Upload Image or drop here
        </p>
        <p className="text-[11px] text-zinc-500 mt-0.5">
          PNG, JPG, WebP, BMP, or existing .PCX (or Paste Ctrl+V)
        </p>
      </div>

      {/* Built-in Retro Sample Presets */}
      <div>
        <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Or Choose Retro Test Card / Scene</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {SAMPLE_PRESETS.map((p) => {
            const isSelected = selectedPresetId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onPresetSelect(p)}
                className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                  isSelected
                    ? 'border-amber-400 bg-amber-500/10 text-amber-300'
                    : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 text-zinc-300'
                }`}
              >
                <div className="font-semibold truncate">{p.name}</div>
                <div className="text-[10px] text-zinc-500 truncate mt-0.5">
                  {p.category}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Target Resolution & Screen Preset */}
      <div className="space-y-2 pt-2 border-t border-zinc-800/80">
        <label className="text-xs font-semibold text-zinc-400 flex items-center justify-between">
          <span>Target PCX Resolution</span>
          <span className="font-mono text-amber-400">
            {width} × {height} px
          </span>
        </label>

        <div className="grid grid-cols-2 gap-1.5">
          {RESOLUTION_PRESETS.map((res) => {
            const active = width === res.w && height === res.h;
            return (
              <button
                key={res.label}
                type="button"
                onClick={() => onDimensionChange(res.w, res.h)}
                className={`text-left px-2.5 py-1.5 rounded border text-[11px] font-mono transition-all flex items-center justify-between ${
                  active
                    ? 'border-cyan-500 bg-cyan-950/40 text-cyan-300 font-bold'
                    : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 text-zinc-400'
                }`}
              >
                <span>{res.w}×{res.h}</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-400">
                  {res.tag}
                </span>
              </button>
            );
          })}
        </div>

        {/* Custom Width / Height Inputs */}
        <div className="flex items-center gap-2 pt-1 font-mono text-xs">
          <div className="flex-1">
            <span className="text-[10px] text-zinc-500 block mb-0.5">W (px)</span>
            <input
              type="number"
              min={16}
              max={1280}
              step={2}
              value={width}
              onChange={(e) => onDimensionChange(Math.max(16, parseInt(e.target.value) || 320), height)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-zinc-200 focus:outline-none focus:border-amber-400"
            />
          </div>
          <span className="text-zinc-600 mt-4">×</span>
          <div className="flex-1">
            <span className="text-[10px] text-zinc-500 block mb-0.5">H (px)</span>
            <input
              type="number"
              min={16}
              max={1024}
              value={height}
              onChange={(e) => onDimensionChange(width, Math.max(16, parseInt(e.target.value) || 200))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-zinc-200 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={maintainAspect}
            onChange={(e) => onMaintainAspectChange(e.target.checked)}
            className="rounded border-zinc-700 text-amber-500 focus:ring-amber-400 bg-zinc-900"
          />
          <Scissors className="w-3.5 h-3.5 text-zinc-400" />
          <span>Fit & letterbox to maintain aspect ratio</span>
        </label>
      </div>

      {/* Preprocessing Adjustments */}
      <div className="space-y-3 pt-2 border-t border-zinc-800/80">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Tone Pre-Processing</span>
          </label>
          <button
            type="button"
            onClick={() => onAdjustmentChange(0, 0, 0)}
            className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
            title="Reset tone adjustments"
          >
            <RefreshCw className="w-3 h-3" /> Reset
          </button>
        </div>

        {/* Brightness */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-zinc-400 font-mono">
            <span>Brightness</span>
            <span className={brightness !== 0 ? 'text-amber-400' : ''}>{brightness > 0 ? `+${brightness}` : brightness}</span>
          </div>
          <input
            type="range"
            min={-100}
            max={100}
            value={brightness}
            onChange={(e) => onAdjustmentChange(parseInt(e.target.value), contrast, saturation)}
            className="w-full accent-amber-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Contrast */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-zinc-400 font-mono">
            <span>Contrast</span>
            <span className={contrast !== 0 ? 'text-amber-400' : ''}>{contrast > 0 ? `+${contrast}` : contrast}</span>
          </div>
          <input
            type="range"
            min={-100}
            max={100}
            value={contrast}
            onChange={(e) => onAdjustmentChange(brightness, parseInt(e.target.value), saturation)}
            className="w-full accent-amber-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Saturation */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-zinc-400 font-mono">
            <span>Saturation</span>
            <span className={saturation !== 0 ? 'text-amber-400' : ''}>{saturation > 0 ? `+${saturation}` : saturation}</span>
          </div>
          <input
            type="range"
            min={-100}
            max={100}
            value={saturation}
            onChange={(e) => onAdjustmentChange(brightness, contrast, parseInt(e.target.value))}
            className="w-full accent-amber-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};

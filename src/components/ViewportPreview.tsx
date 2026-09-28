import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RGB, ColorDepth } from '../types/pcx';
import { ZoomIn, ZoomOut, Maximize2, Tv, Eye, SplitSquareHorizontal } from 'lucide-react';

interface ViewportPreviewProps {
  convertedCanvas: HTMLCanvasElement | null;
  originalCanvas: HTMLCanvasElement | null;
  width: number;
  height: number;
  depth: ColorDepth;
  palette: RGB[];
  indexedPixels?: Uint8Array;
}

export const ViewportPreview: React.FC<ViewportPreviewProps> = ({
  convertedCanvas,
  originalCanvas,
  width,
  height,
  depth,
  palette,
  indexedPixels,
}) => {
  const [zoom, setZoom] = useState<number>(2); // 1, 2, 4, 8, or -1 for fit
  const [crtEffect, setCrtEffect] = useState<boolean>(true);
  const [crtAspect43, setCrtAspect43] = useState<boolean>(true); // 320x200 -> 4:3 display aspect ratio
  const [viewMode, setViewMode] = useState<'pcx' | 'split' | 'sideBySide'>('pcx');
  const [splitPos, setSplitPos] = useState<number>(50); // percentage 0..100
  const [hoveredPixel, setHoveredPixel] = useState<{
    x: number;
    y: number;
    index?: number;
    rgb: RGB;
    hex: string;
    dac: { r: number; g: number; b: number };
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Redraw preview canvas
  const renderComposite = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !convertedCanvas) return;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    if (viewMode === 'pcx' || !originalCanvas) {
      ctx.drawImage(convertedCanvas, 0, 0);
    } else if (viewMode === 'split') {
      // Draw original on left, PCX on right
      const splitX = Math.round((splitPos / 100) * width);
      ctx.drawImage(originalCanvas, 0, 0);

      // Clip and draw PCX on right portion
      ctx.save();
      ctx.beginPath();
      ctx.rect(splitX, 0, width - splitX, height);
      ctx.clip();
      ctx.drawImage(convertedCanvas, 0, 0);
      ctx.restore();

      // Divider line
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(splitX - 1, 0, 2, height);
    } else if (viewMode === 'sideBySide') {
      // Draw PCX
      ctx.drawImage(convertedCanvas, 0, 0);
    }
  }, [convertedCanvas, originalCanvas, width, height, viewMode, splitPos]);

  useEffect(() => {
    renderComposite();
  }, [renderComposite]);

  // Handle pixel inspector on mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    if (x >= 0 && x < width && y >= 0 && y < height) {
      const pIdx = y * width + x;
      let colIdx: number | undefined;
      let rgb: RGB = { r: 0, g: 0, b: 0 };

      if (indexedPixels && indexedPixels[pIdx] !== undefined) {
        colIdx = indexedPixels[pIdx];
        rgb = palette[colIdx] || { r: 0, g: 0, b: 0 };
      } else {
        // Read directly from canvas
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const pixel = ctx.getImageData(x, y, 1, 1).data;
          rgb = { r: pixel[0], g: pixel[1], b: pixel[2] };
        }
      }

      const hex = `#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`.toUpperCase();
      const dac = {
        r: Math.floor(rgb.r / 4),
        g: Math.floor(rgb.g / 4),
        b: Math.floor(rgb.b / 4),
      };

      setHoveredPixel({ x, y, index: colIdx, rgb, hex, dac });
    } else {
      setHoveredPixel(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredPixel(null);
  };

  // Calculate display style for 4:3 CRT aspect ratio stretch if enabled
  const getCanvasStyle = () => {
    const baseStyle: React.CSSProperties = {
      imageRendering: 'pixelated',
    };

    if (zoom === -1) {
      // Fit
      baseStyle.maxWidth = '100%';
      baseStyle.maxHeight = '500px';
      baseStyle.width = 'auto';
      baseStyle.height = 'auto';
    } else {
      let displayW = width * zoom;
      let displayH = height * zoom;

      // If 320x200 and CRT 4:3 is enabled, height scales by 1.2 (200 * 1.2 = 240, yielding 4:3)
      if (crtAspect43 && width === 320 && height === 200) {
        displayH = Math.round(displayH * 1.2);
      }

      baseStyle.width = `${displayW}px`;
      baseStyle.height = `${displayH}px`;
    }

    return baseStyle;
  };

  return (
    <div className="bg-[#121824] rounded-xl border border-zinc-800 p-4 space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
        {/* View Mode */}
        <div className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-lg border border-zinc-800 text-xs">
          <button
            type="button"
            onClick={() => setViewMode('pcx')}
            className={`px-2.5 py-1 rounded font-mono transition-all flex items-center gap-1.5 ${
              viewMode === 'pcx'
                ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>PCX Output</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`px-2.5 py-1 rounded font-mono transition-all flex items-center gap-1.5 ${
              viewMode === 'split'
                ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <SplitSquareHorizontal className="w-3.5 h-3.5" />
            <span>Split Slider</span>
          </button>
        </div>

        {/* Viewport Controls: CRT shader, 4:3 CRT aspect, Zoom */}
        <div className="flex items-center gap-2 text-xs">
          {/* 4:3 Aspect Ratio (non-square pixel) */}
          <button
            type="button"
            onClick={() => setCrtAspect43(!crtAspect43)}
            className={`px-2 py-1 rounded font-mono border transition-all ${
              crtAspect43
                ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300 font-semibold'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300'
            }`}
            title="Simulate classic DOS CRT 4:3 monitor stretch (1.2 non-square pixels)"
          >
            4:3 CRT Stretch
          </button>

          {/* CRT Shader Effect */}
          <button
            type="button"
            onClick={() => setCrtEffect(!crtEffect)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-mono border transition-all ${
              crtEffect
                ? 'bg-amber-500/10 border-amber-400 text-amber-300 font-semibold'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>CRT Scanlines</span>
          </button>

          {/* Zoom Buttons */}
          <div className="flex items-center bg-zinc-900 rounded-lg border border-zinc-800 p-0.5">
            <button
              type="button"
              onClick={() => setZoom(Math.max(1, zoom === -1 ? 2 : zoom / 2))}
              className="p-1 hover:text-amber-400 text-zinc-400"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 font-mono text-[11px] text-zinc-300 min-w-[36px] text-center">
              {zoom === -1 ? 'Fit' : `${zoom}x`}
            </span>
            <button
              type="button"
              onClick={() => setZoom(Math.min(8, zoom === -1 ? 2 : zoom * 2))}
              className="p-1 hover:text-amber-400 text-zinc-400"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(zoom === -1 ? 2 : -1)}
              className="p-1 hover:text-amber-400 text-zinc-400 ml-0.5 border-l border-zinc-800"
              title="Fit to Screen"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Viewport Frame */}
      <div
        ref={containerRef}
        className="relative min-h-[340px] max-h-[540px] bg-[#070a0f] rounded-lg border border-zinc-900 overflow-auto flex items-center justify-center p-4 select-none shadow-inner"
      >
        {/* CRT Scanline Overlay */}
        <div
          className={`relative inline-block transition-all ${
            crtEffect
              ? 'shadow-[0_0_35px_rgba(0,255,200,0.06),0_0_15px_rgba(255,180,0,0.05)] rounded-md overflow-hidden'
              : ''
          }`}
        >
          <canvas
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={getCanvasStyle()}
            className="cursor-crosshair block"
          />

          {/* CRT Scanlines CSS overlay */}
          {crtEffect && (
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-black/25 to-transparent bg-[length:100%_4px] opacity-70 mix-blend-overlay"
              style={{
                boxShadow: 'inset 0 0 40px rgba(0,0,0,0.85), inset 0 0 10px rgba(0,0,0,0.95)',
              }}
            />
          )}

          {/* CRT Curved Bezel glow */}
          {crtEffect && (
            <div className="pointer-events-none absolute inset-0 border border-zinc-700/30 rounded-md" />
          )}
        </div>

        {/* Split slider control on hover */}
        {viewMode === 'split' && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-zinc-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-zinc-700 flex items-center gap-2 text-xs font-mono text-zinc-300">
            <span>Original</span>
            <input
              type="range"
              min={0}
              max={100}
              value={splitPos}
              onChange={(e) => setSplitPos(parseInt(e.target.value))}
              className="w-32 accent-amber-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
            />
            <span>PCX Dithered</span>
          </div>
        )}
      </div>

      {/* Live Hover Pixel & Palette Inspector */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-zinc-900/90 rounded-lg p-2.5 border border-zinc-800/90 font-mono">
        {hoveredPixel ? (
          <div className="flex flex-wrap items-center gap-3">
            {/* Color Swatch Preview */}
            <div
              className="w-5 h-5 rounded border border-zinc-600 shadow-sm shrink-0"
              style={{ backgroundColor: hoveredPixel.hex }}
            />
            <div className="flex items-center gap-2 text-zinc-300">
              <span className="text-zinc-500">X:</span>
              <span className="text-amber-400 font-bold">{hoveredPixel.x}</span>
              <span className="text-zinc-500">Y:</span>
              <span className="text-amber-400 font-bold">{hoveredPixel.y}</span>
            </div>

            {hoveredPixel.index !== undefined && (
              <div className="text-cyan-400">
                <span className="text-zinc-500">Index:</span> #{hoveredPixel.index}{' '}
                <span className="text-zinc-400 font-sans">
                  (COLOR {hoveredPixel.index})
                </span>
              </div>
            )}

            <div className="text-zinc-300">
              <span className="text-zinc-500">Hex:</span> {hoveredPixel.hex}
            </div>

            {/* VGA DAC 6-bit ports (&H3C8/&H3C9) */}
            <div className="text-emerald-400">
              <span className="text-zinc-500">VGA DAC (0..63):</span> [
              {hoveredPixel.dac.r}, {hoveredPixel.dac.g}, {hoveredPixel.dac.b}]
            </div>
          </div>
        ) : (
          <div className="text-zinc-500 flex items-center gap-2">
            <span>Hover cursor over image to inspect pixel coordinates, palette index & VGA DAC values</span>
          </div>
        )}

        <div className="text-zinc-400 text-[11px]">
          {width} × {height} • {depth}
        </div>
      </div>

      {/* Color Palette Swatches Bar */}
      {palette.length > 0 && depth !== '24-bit' && (
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between items-center text-[11px] text-zinc-400 font-mono">
            <span>Active Color Palette ({palette.length} colors)</span>
            <span className="text-zinc-500">Click swatch to inspect</span>
          </div>
          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-1.5 bg-zinc-950/60 rounded-md border border-zinc-800/80">
            {palette.map((c, i) => {
              const hex = `#${c.r.toString(16).padStart(2, '0')}${c.g.toString(16).padStart(2, '0')}${c.b.toString(16).padStart(2, '0')}`.toUpperCase();
              return (
                <div
                  key={i}
                  title={`Index #${i}: RGB(${c.r}, ${c.g}, ${c.b}) | VGA DAC: ${Math.floor(c.r / 4)}, ${Math.floor(c.g / 4)}, ${Math.floor(c.b / 4)} | ${hex}`}
                  className="w-3.5 h-3.5 rounded-xs border border-zinc-800/80 cursor-pointer hover:scale-125 hover:z-10 hover:border-white transition-transform"
                  style={{ backgroundColor: hex }}
                  onClick={() =>
                    setHoveredPixel({
                      x: 0,
                      y: 0,
                      index: i,
                      rgb: c,
                      hex,
                      dac: {
                        r: Math.floor(c.r / 4),
                        g: Math.floor(c.g / 4),
                        b: Math.floor(c.b / 4),
                      },
                    })
                  }
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

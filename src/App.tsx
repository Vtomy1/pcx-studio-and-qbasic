import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ColorDepth, DitherAlgorithm, PaletteChoice, ConversionResult, RGB } from './types/pcx';
import { SAMPLE_PRESETS, SamplePreset } from './utils/sampleImages';
import { applyImageAdjustments, quantizeAndDither } from './utils/dithering';
import { getPaletteForChoice, generateAdaptivePalette } from './utils/palettes';
import { encodePcx } from './utils/pcxEncoder';
import { decodePcx } from './utils/pcxDecoder';
import { generateQBasicCode, CodeSnippets } from './utils/qbasicGenerator';

import { Header } from './components/Header';
import { ImageSourcePanel } from './components/ImageSourcePanel';
import { ConversionControls } from './components/ConversionControls';
import { ViewportPreview } from './components/ViewportPreview';
import { PcxHeaderInspector } from './components/PcxHeaderInspector';
import { QBasicCodeViewer } from './components/QBasicCodeViewer';
import { SpecsModal } from './components/SpecsModal';

export default function App() {
  // Source Image State
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('demomake-sunset');
  const [sourceFilename, setSourceFilename] = useState<string>('sunset.pcx');

  // Conversion Options
  const [depth, setDepth] = useState<ColorDepth>('8-bit');
  const [width, setWidth] = useState<number>(320);
  const [height, setHeight] = useState<number>(200);
  const [maintainAspect, setMaintainAspect] = useState<boolean>(true);
  const [paletteChoice, setPaletteChoice] = useState<PaletteChoice>('adaptive');
  const [dither, setDither] = useState<DitherAlgorithm>('floyd-steinberg');
  const [ditherStrength, setDitherStrength] = useState<number>(1.0);
  const [serpentine, setSerpentine] = useState<boolean>(true);

  // Tone adjustments
  const [brightness, setBrightness] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(0);
  const [saturation, setSaturation] = useState<number>(0);

  // Computed results
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [codeSnippets, setCodeSnippets] = useState<CodeSnippets | null>(null);
  const [isSpecsOpen, setIsSpecsOpen] = useState<boolean>(false);

  // Offscreen canvases
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const convertedCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize with sample preset on mount
  useEffect(() => {
    loadPreset(SAMPLE_PRESETS[0]);
  }, []);

  // Global clipboard paste listener (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              const img = new Image();
              img.onload = () => {
                setSourceImage(img);
                setSelectedPresetId('');
                setSourceFilename('pasted_image.pcx');
              };
              img.src = ev.target?.result as string;
            };
            reader.readAsDataURL(blob);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Load a built-in procedural retro preset
  const loadPreset = (preset: SamplePreset) => {
    const canvas = document.createElement('canvas');
    canvas.width = preset.width;
    canvas.height = preset.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    preset.generator(ctx, preset.width, preset.height);

    const img = new Image();
    img.onload = () => {
      setSourceImage(img);
      setSelectedPresetId(preset.id);
      setSourceFilename(`${preset.id.replace(/-/g, '_')}.pcx`);
      setWidth(preset.width);
      setHeight(preset.height);
    };
    img.src = canvas.toDataURL();
  };

  // Handle user uploaded image or existing PCX file
  const handleImageLoaded = (img: HTMLImageElement, filename?: string) => {
    setSourceImage(img);
    setSelectedPresetId('');
    if (filename) {
      const baseName = filename.substring(0, filename.lastIndexOf('.')) || filename;
      setSourceFilename(`${baseName.replace(/\s+/g, '_')}.pcx`);
    } else {
      setSourceFilename('custom_image.pcx');
    }
  };

  // Recalculate PCX conversion pipeline
  const processImage = useCallback(() => {
    if (!sourceImage) return;

    // 1. Render source image to intermediate canvas at target dimensions
    const origCanvas = document.createElement('canvas');
    origCanvas.width = width;
    origCanvas.height = height;
    const origCtx = origCanvas.getContext('2d');
    if (!origCtx) return;

    origCtx.imageSmoothingEnabled = false;
    origCtx.fillStyle = '#000000';
    origCtx.fillRect(0, 0, width, height);

    if (maintainAspect) {
      const scale = Math.min(width / sourceImage.naturalWidth, height / sourceImage.naturalHeight);
      const drawW = Math.round(sourceImage.naturalWidth * scale);
      const drawH = Math.round(sourceImage.naturalHeight * scale);
      const drawX = Math.round((width - drawW) / 2);
      const drawY = Math.round((height - drawH) / 2);
      origCtx.drawImage(sourceImage, drawX, drawY, drawW, drawH);
    } else {
      origCtx.drawImage(sourceImage, 0, 0, width, height);
    }

    originalCanvasRef.current = origCanvas;

    const rawImageData = origCtx.getImageData(0, 0, width, height);
    // 2. Apply Tone adjustments (Brightness, Contrast, Saturation)
    const adjustedRgba = applyImageAdjustments(
      rawImageData.data,
      brightness,
      contrast,
      saturation
    );

    // 3. Determine Palette
    let activePalette: RGB[];
    if (depth === '24-bit') {
      activePalette = [];
    } else if (paletteChoice === 'adaptive') {
      const maxColors = depth === '8-bit' ? 256 : depth === '4-bit' ? 16 : depth === '2-bit' ? 4 : 2;
      activePalette = generateAdaptivePalette(adjustedRgba, maxColors);
    } else {
      activePalette = getPaletteForChoice(paletteChoice);
    }

    // 4. Quantize & Dither
    let indexedPixels: Uint8Array | undefined;
    let finalRgba: Uint8ClampedArray;

    if (depth === '24-bit') {
      finalRgba = adjustedRgba;
    } else {
      const dithered = quantizeAndDither(
        adjustedRgba,
        width,
        height,
        activePalette,
        dither,
        ditherStrength,
        serpentine
      );
      indexedPixels = dithered.indexed;
      finalRgba = dithered.outRgba;
    }

    // 5. Encode to standard ZSoft PCX format
    const pcxResult = encodePcx(
      depth,
      width,
      height,
      activePalette,
      indexedPixels,
      finalRgba
    );

    // 6. Decode back using built-in decoder to verify 100% compliance
    const validated = decodePcx(pcxResult.pcxData);
    if (!validated.valid) {
      console.error('PCX Validation Error:', validated.errorMessage);
    }

    // 7. Render final dithered image onto convertedCanvas
    const convCanvas = document.createElement('canvas');
    convCanvas.width = width;
    convCanvas.height = height;
    const convCtx = convCanvas.getContext('2d');
    if (convCtx) {
      const imgData = convCtx.createImageData(width, height);
      imgData.data.set(finalRgba);
      convCtx.putImageData(imgData, 0, 0);
    }
    convertedCanvasRef.current = convCanvas;

    // 8. Generate QBasic Code Snippets
    const baseName = sourceFilename.replace(/\.pcx$/i, '');
    const snippets = generateQBasicCode(
      baseName,
      depth,
      width,
      height,
      pcxResult.header,
      activePalette,
      pcxResult.pcxData
    );

    setConversionResult({
      pcxData: pcxResult.pcxData,
      header: pcxResult.header,
      palette: activePalette,
      width,
      height,
      indexedPixels,
      rgbPixels: finalRgba,
      rleStats: pcxResult.rleStats,
    });

    setCodeSnippets(snippets);
  }, [
    sourceImage,
    depth,
    width,
    height,
    maintainAspect,
    paletteChoice,
    dither,
    ditherStrength,
    serpentine,
    brightness,
    contrast,
    saturation,
    sourceFilename,
  ]);

  useEffect(() => {
    processImage();
  }, [processImage]);

  // Adjust default palette choice when depth changes
  const handleDepthChange = (newDepth: ColorDepth) => {
    setDepth(newDepth);
    if (newDepth === '1-bit') {
      setPaletteChoice('mono-white');
    } else if (newDepth === '2-bit') {
      setPaletteChoice('cga-1-high');
    } else if (newDepth === '4-bit') {
      setPaletteChoice('ega-16');
    } else if (newDepth === '8-bit') {
      setPaletteChoice('adaptive');
    } else {
      setPaletteChoice('adaptive');
    }
  };

  // Download binary .PCX file
  const handleDownloadPcx = () => {
    if (!conversionResult) return;
    const blob = new Blob([conversionResult.pcxData.buffer as ArrayBuffer], {
      type: 'image/x-pcx',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = sourceFilename.toLowerCase().endsWith('.pcx')
      ? sourceFilename
      : `${sourceFilename}.pcx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download QBasic .BAS code
  const handleDownloadBas = (codeText?: string, subName?: string) => {
    const code = codeText || (codeSnippets ? codeSnippets.loaderUniversal : '');
    const baseName = sourceFilename.replace(/\.pcx$/i, '');
    const suffix = subName ? `_${subName}` : '';
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${baseName}${suffix}.BAS`.toUpperCase();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0a0d14] text-zinc-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Top Header */}
      <Header
        onDownloadPcx={handleDownloadPcx}
        onDownloadBas={() => handleDownloadBas()}
        onOpenSpecsModal={() => setIsSpecsOpen(true)}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Top Grid: Controls on left, Viewport on right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Image Source & Conversion Controls */}
          <div className="lg:col-span-5 space-y-5">
            <ImageSourcePanel
              width={width}
              height={height}
              onDimensionChange={(w, h) => {
                setWidth(w);
                setHeight(h);
              }}
              maintainAspect={maintainAspect}
              onMaintainAspectChange={setMaintainAspect}
              brightness={brightness}
              contrast={contrast}
              saturation={saturation}
              onAdjustmentChange={(b, c, s) => {
                setBrightness(b);
                setContrast(c);
                setSaturation(s);
              }}
              onImageLoaded={handleImageLoaded}
              onPresetSelect={loadPreset}
              selectedPresetId={selectedPresetId}
              sourceFilename={sourceFilename}
            />

            <ConversionControls
              depth={depth}
              onDepthChange={handleDepthChange}
              paletteChoice={paletteChoice}
              onPaletteChoiceChange={setPaletteChoice}
              dither={dither}
              onDitherChange={setDither}
              ditherStrength={ditherStrength}
              onDitherStrengthChange={setDitherStrength}
              serpentine={serpentine}
              onSerpentineChange={setSerpentine}
            />
          </div>

          {/* Right Column: Viewport Preview */}
          <div className="lg:col-span-7">
            <ViewportPreview
              convertedCanvas={convertedCanvasRef.current}
              originalCanvas={originalCanvasRef.current}
              width={width}
              height={height}
              depth={depth}
              palette={conversionResult?.palette || []}
              indexedPixels={conversionResult?.indexedPixels}
            />
          </div>
        </div>

        {/* Lower Section: PCX Header Inspector & QBasic Code Generator */}
        {conversionResult && (
          <div className="space-y-6 pt-2">
            <PcxHeaderInspector
              header={conversionResult.header}
              pcxData={conversionResult.pcxData}
              depth={depth}
              rleStats={conversionResult.rleStats}
            />

            {codeSnippets && (
              <QBasicCodeViewer
                snippets={codeSnippets}
                filename={sourceFilename.replace(/\.pcx$/i, '')}
                onDownloadBas={handleDownloadBas}
                onDownloadPcx={handleDownloadPcx}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 bg-[#090c13] px-4 py-4 text-xs font-mono text-zinc-500 text-center">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <span>PCX Studio • Standard 1-bit, 2-bit, 4-bit, 8-bit, 24-bit ZSoft PCX File Engine</span>
          <span>QuickBASIC 4.5 • QBasic 1.1 • QB64 • MS-DOS Video DAC 0..63 Compatible</span>
        </div>
      </footer>

      {/* Specs Guide Modal */}
      <SpecsModal isOpen={isSpecsOpen} onClose={() => setIsSpecsOpen(false)} />
    </div>
  );
}

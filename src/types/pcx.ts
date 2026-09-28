export type ColorDepth = '1-bit' | '2-bit' | '4-bit' | '8-bit' | '24-bit';

export type ScreenMode = 
  | 'SCREEN 13' // 320x200 256-color VGA
  | 'SCREEN 12' // 640x480 16-color VGA
  | 'SCREEN 7'  // 320x200 16-color EGA
  | 'SCREEN 9'  // 640x350 16-color EGA
  | 'SCREEN 1'  // 320x200 4-color CGA
  | 'SCREEN 11' // 640x480 2-color Mono
  | 'SCREEN 2'  // 640x200 2-color Mono
  | 'CUSTOM';

export type DitherAlgorithm = 
  | 'none'
  | 'floyd-steinberg'
  | 'atkinson'
  | 'bayer-2x2'
  | 'bayer-4x4'
  | 'bayer-8x8'
  | 'sierra'
  | 'burkes';

export type PaletteChoice = 
  | 'vga-default'
  | 'adaptive'
  | 'ega-16'
  | 'cga-0-high'
  | 'cga-0-low'
  | 'cga-1-high'
  | 'cga-1-low'
  | 'mono-white'
  | 'mono-green'
  | 'mono-amber';

export interface RGB {
  r: number; // 0..255
  g: number;
  b: number;
}

export interface PcxHeader {
  manufacturer: number;      // 0x0A (10)
  version: number;           // 0, 2, 3, 4, 5 (usually 5 for VGA 256c / 24-bit)
  encoding: number;          // 1 = PCX RLE
  bitsPerPixel: number;      // 1, 2, 4, 8
  xmin: number;              // Window X min (usually 0)
  ymin: number;              // Window Y min (usually 0)
  xmax: number;              // Window X max (width - 1)
  ymax: number;              // Window Y max (height - 1)
  hdpi: number;              // Horizontal DPI (usually 72 or 300)
  vdpi: number;              // Vertical DPI
  colormap: number[];        // 48 bytes (16 RGB triplets)
  reserved: number;          // 0
  nPlanes: number;           // 1, 3, or 4
  bytesPerLine: number;      // Must be EVEN number
  paletteInfo: number;       // 1 = color/BW, 2 = grayscale
  hScreenSize: number;       // Horizontal screen size
  vScreenSize: number;       // Vertical screen size
  filler: number[];          // 54 bytes reserved/zeros
}

export interface PcxConversionOptions {
  depth: ColorDepth;
  width: number;
  height: number;
  paletteChoice: PaletteChoice;
  dither: DitherAlgorithm;
  ditherStrength: number; // 0..1
  serpentine: boolean;
  brightness: number;    // -100..100
  contrast: number;      // -100..100
  saturation: number;    // -100..100
  maintainAspect: boolean;
  pixelRatio43: boolean; // non-square CRT pixels simulation
}

export interface ConversionResult {
  pcxData: Uint8Array;
  header: PcxHeader;
  palette: RGB[];
  width: number;
  height: number;
  indexedPixels?: Uint8Array; // for 1-8 bit
  rgbPixels: Uint8ClampedArray; // for canvas rendering (RGBA)
  rleStats: {
    rawBytes: number;
    pcxBytes: number;
    compressionRatio: number;
    runsCount: number;
  };
}

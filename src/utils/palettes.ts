import { RGB, PaletteChoice } from '../types/pcx';

// Standard 16-color EGA / VGA palette
export const EGA_PALETTE: RGB[] = [
  { r: 0, g: 0, b: 0 },       // 0: Black
  { r: 0, g: 0, b: 170 },     // 1: Blue
  { r: 0, g: 170, b: 0 },     // 2: Green
  { r: 0, g: 170, b: 170 },   // 3: Cyan
  { r: 170, g: 0, b: 0 },     // 4: Red
  { r: 170, g: 0, b: 170 },   // 5: Magenta
  { r: 170, g: 85, b: 0 },    // 6: Brown
  { r: 170, g: 170, b: 170 }, // 7: Light Gray
  { r: 85, g: 85, b: 85 },    // 8: Dark Gray
  { r: 85, g: 85, b: 255 },   // 9: Light Blue
  { r: 85, g: 255, b: 85 },   // 10: Light Green
  { r: 85, g: 255, b: 255 },  // 11: Light Cyan
  { r: 255, g: 85, b: 85 },   // 12: Light Red
  { r: 255, g: 85, b: 255 },  // 13: Light Magenta
  { r: 255, g: 255, b: 85 },  // 14: Yellow
  { r: 255, g: 255, b: 255 }, // 15: Bright White
];

// CGA Palettes
export const CGA_PALETTE_0_LOW: RGB[] = [
  { r: 0, g: 0, b: 0 },     // 0: Black
  { r: 0, g: 170, b: 0 },   // 1: Green
  { r: 170, g: 0, b: 0 },   // 2: Red
  { r: 170, g: 85, b: 0 },  // 3: Brown
];

export const CGA_PALETTE_0_HIGH: RGB[] = [
  { r: 0, g: 0, b: 0 },     // 0: Black
  { r: 85, g: 255, b: 85 }, // 1: Light Green
  { r: 255, g: 85, b: 85 }, // 2: Light Red
  { r: 255, g: 255, b: 85 },// 3: Yellow
];

export const CGA_PALETTE_1_LOW: RGB[] = [
  { r: 0, g: 0, b: 0 },     // 0: Black
  { r: 0, g: 170, b: 170 }, // 1: Cyan
  { r: 170, g: 0, b: 170 }, // 2: Magenta
  { r: 170, g: 170, b: 170 }, // 3: Light Gray
];

export const CGA_PALETTE_1_HIGH: RGB[] = [
  { r: 0, g: 0, b: 0 },     // 0: Black
  { r: 85, g: 255, b: 255 }, // 1: Light Cyan
  { r: 255, g: 85, b: 255 }, // 2: Light Magenta
  { r: 255, g: 255, b: 255 }, // 3: Bright White
];

// Monochrome Palettes
export const MONO_WHITE: RGB[] = [
  { r: 0, g: 0, b: 0 },
  { r: 255, g: 255, b: 255 },
];

export const MONO_GREEN: RGB[] = [
  { r: 10, g: 20, b: 10 },
  { r: 50, g: 255, b: 50 }, // P1 phosphor
];

export const MONO_AMBER: RGB[] = [
  { r: 20, g: 10, b: 0 },
  { r: 255, g: 176, b: 0 }, // P3 amber phosphor
];

// Standard VGA 256-color palette (BIOS Default)
export function getStandardVGAPalette(): RGB[] {
  const palette: RGB[] = new Array(256);

  // 0..15: Standard EGA colors
  for (let i = 0; i < 16; i++) {
    palette[i] = { ...EGA_PALETTE[i] };
  }

  // 16..31: 16 shades of gray (linear ramp from near-black to near-white)
  for (let i = 0; i < 16; i++) {
    const val = Math.round((i / 15) * 255);
    palette[16 + i] = { r: val, g: val, b: val };
  }

  // 32..247: Color cube / hue ramps (216 colors: 3 groups of saturation/intensity across 72 hues/ramps)
  let idx = 32;
  const intensities = [255, 170, 110];
  const saturationLevels = [
    [1, 0, 0], [1, 0.5, 0], [1, 1, 0], [0.5, 1, 0],
    [0, 1, 0], [0, 1, 0.5], [0, 1, 1], [0, 0.5, 1],
    [0, 0, 1], [0.5, 0, 1], [1, 0, 1], [1, 0, 0.5]
  ];

  for (const intensity of intensities) {
    for (const [rMult, gMult, bMult] of saturationLevels) {
      for (const lightness of [0.4, 0.7, 1.0, 0.2, 0.5, 0.8]) {
        if (idx < 248) {
          palette[idx++] = {
            r: Math.min(255, Math.round(intensity * rMult * lightness)),
            g: Math.min(255, Math.round(intensity * gMult * lightness)),
            b: Math.min(255, Math.round(intensity * bMult * lightness)),
          };
        }
      }
    }
  }

  // 248..255: fill remainder with dark shades
  while (idx < 256) {
    const val = (idx - 248) * 8;
    palette[idx++] = { r: val, g: val, b: val };
  }

  return palette;
}

// Median Cut color quantizer for high quality adaptive palettes
export function generateAdaptivePalette(rgbaPixels: Uint8ClampedArray, maxColors: number): RGB[] {
  // Sample pixels to build pixel list
  const pixels: RGB[] = [];
  const step = Math.max(1, Math.floor((rgbaPixels.length / 4) / 50000)); // Sample up to 50k pixels
  for (let i = 0; i < rgbaPixels.length; i += 4 * step) {
    const a = rgbaPixels[i + 3];
    if (a > 64) {
      pixels.push({
        r: rgbaPixels[i],
        g: rgbaPixels[i + 1],
        b: rgbaPixels[i + 2],
      });
    }
  }

  if (pixels.length === 0) {
    return Array.from({ length: maxColors }, () => ({ r: 0, g: 0, b: 0 }));
  }

  // Median Cut Boxes
  interface Box {
    pixels: RGB[];
    rMin: number; rMax: number;
    gMin: number; gMax: number;
    bMin: number; bMax: number;
  }

  function getBounds(boxPixels: RGB[]): Box {
    let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0;
    for (const p of boxPixels) {
      if (p.r < rMin) rMin = p.r;
      if (p.r > rMax) rMax = p.r;
      if (p.g < gMin) gMin = p.g;
      if (p.g > gMax) gMax = p.g;
      if (p.b < bMin) bMin = p.b;
      if (p.b > bMax) bMax = p.b;
    }
    return { pixels: boxPixels, rMin, rMax, gMin, gMax, bMin, bMax };
  }

  let boxes: Box[] = [getBounds(pixels)];

  while (boxes.length < maxColors) {
    // Find box with largest range in any dimension
    let bestIdx = -1;
    let maxRange = -1;
    let bestAxis: 'r' | 'g' | 'b' = 'r';

    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (b.pixels.length <= 1) continue;
      const rRange = b.rMax - b.rMin;
      const gRange = b.gMax - b.gMin;
      const bRange = b.bMax - b.bMin;
      const range = Math.max(rRange, gRange, bRange);

      if (range > maxRange) {
        maxRange = range;
        bestIdx = i;
        if (rRange >= gRange && rRange >= bRange) bestAxis = 'r';
        else if (gRange >= rRange && gRange >= bRange) bestAxis = 'g';
        else bestAxis = 'b';
      }
    }

    if (bestIdx === -1 || maxRange <= 0) break;

    const targetBox = boxes.splice(bestIdx, 1)[0];
    targetBox.pixels.sort((a, b) => a[bestAxis] - b[bestAxis]);

    const mid = Math.floor(targetBox.pixels.length / 2);
    const leftPixels = targetBox.pixels.slice(0, mid);
    const rightPixels = targetBox.pixels.slice(mid);

    if (leftPixels.length > 0) boxes.push(getBounds(leftPixels));
    if (rightPixels.length > 0) boxes.push(getBounds(rightPixels));
  }

  // Calculate average color for each box
  const palette: RGB[] = boxes.map((box) => {
    let rSum = 0, gSum = 0, bSum = 0;
    for (const p of box.pixels) {
      rSum += p.r;
      gSum += p.g;
      bSum += p.b;
    }
    const count = box.pixels.length || 1;
    return {
      r: Math.round(rSum / count),
      g: Math.round(gSum / count),
      b: Math.round(bSum / count),
    };
  });

  // Pad to maxColors if needed
  while (palette.length < maxColors) {
    palette.push({ r: 0, g: 0, b: 0 });
  }

  return palette.slice(0, maxColors);
}

export function getPaletteForChoice(choice: PaletteChoice, customAdaptivePalette?: RGB[]): RGB[] {
  switch (choice) {
    case 'vga-default':
      return getStandardVGAPalette();
    case 'adaptive':
      return customAdaptivePalette || getStandardVGAPalette();
    case 'ega-16':
      return EGA_PALETTE;
    case 'cga-0-high':
      return CGA_PALETTE_0_HIGH;
    case 'cga-0-low':
      return CGA_PALETTE_0_LOW;
    case 'cga-1-high':
      return CGA_PALETTE_1_HIGH;
    case 'cga-1-low':
      return CGA_PALETTE_1_LOW;
    case 'mono-white':
      return MONO_WHITE;
    case 'mono-green':
      return MONO_GREEN;
    case 'mono-amber':
      return MONO_AMBER;
    default:
      return getStandardVGAPalette();
  }
}

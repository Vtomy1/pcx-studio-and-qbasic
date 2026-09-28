import { RGB, DitherAlgorithm } from '../types/pcx';

// Perceptual color distance
export function colorDistanceSq(c1: RGB, c2: RGB): number {
  const rmean = (c1.r + c2.r) / 2;
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  // Redmean color difference metric
  return (
    (((512 + rmean) * dr * dr) >> 8) +
    (4 * dg * dg) +
    (((767 - rmean) * db * db) >> 8)
  );
}

// Find closest palette index
export function findNearestColorIndex(color: RGB, palette: RGB[]): number {
  let bestIdx = 0;
  let bestDist = Infinity;

  for (let i = 0; i < palette.length; i++) {
    const dist = colorDistanceSq(color, palette[i]);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }

  return bestIdx;
}

// Bayer matrices for ordered dithering
const BAYER_2X2 = [
  [0, 2],
  [3, 1],
];

const BAYER_4X4 = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5],
];

const BAYER_8X8 = [
  [ 0, 32,  8, 40,  2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44,  4, 36, 14, 46,  6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [ 3, 35, 11, 43,  1, 33,  9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47,  7, 39, 13, 45,  5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

// Apply image pre-processing (contrast, brightness, saturation)
export function applyImageAdjustments(
  rgba: Uint8ClampedArray,
  brightness: number, // -100..100
  contrast: number,   // -100..100
  saturation: number  // -100..100
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(rgba.length);
  const bFactor = (brightness / 100) * 255;
  const cFactor = (contrast === 100) ? 50 : Math.tan(((contrast + 100) / 200) * (Math.PI / 2));
  const sFactor = (saturation + 100) / 100;

  for (let i = 0; i < rgba.length; i += 4) {
    let r = rgba[i];
    let g = rgba[i + 1];
    let b = rgba[i + 2];
    const a = rgba[i + 3];

    // Brightness
    r += bFactor;
    g += bFactor;
    b += bFactor;

    // Contrast
    r = ((r / 255 - 0.5) * cFactor + 0.5) * 255;
    g = ((g / 255 - 0.5) * cFactor + 0.5) * 255;
    b = ((b / 255 - 0.5) * cFactor + 0.5) * 255;

    // Saturation
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    r = gray + (r - gray) * sFactor;
    g = gray + (g - gray) * sFactor;
    b = gray + (b - gray) * sFactor;

    result[i] = Math.min(255, Math.max(0, Math.round(r)));
    result[i + 1] = Math.min(255, Math.max(0, Math.round(g)));
    result[i + 2] = Math.min(255, Math.max(0, Math.round(b)));
    result[i + 3] = a;
  }

  return result;
}

// Quantize and Dither an image to a given palette
export function quantizeAndDither(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  palette: RGB[],
  algorithm: DitherAlgorithm,
  ditherStrength: number = 1.0,
  serpentine: boolean = true
): { indexed: Uint8Array; outRgba: Uint8ClampedArray } {
  const numPixels = width * height;
  const indexed = new Uint8Array(numPixels);
  const outRgba = new Uint8ClampedArray(numPixels * 4);

  // If algorithm is 'none', simply find nearest color for all pixels
  if (algorithm === 'none') {
    for (let i = 0; i < numPixels; i++) {
      const pIdx = i * 4;
      const c: RGB = { r: rgba[pIdx], g: rgba[pIdx + 1], b: rgba[pIdx + 2] };
      const nearestIdx = findNearestColorIndex(c, palette);
      indexed[i] = nearestIdx;
      const matched = palette[nearestIdx];
      outRgba[pIdx] = matched.r;
      outRgba[pIdx + 1] = matched.g;
      outRgba[pIdx + 2] = matched.b;
      outRgba[pIdx + 3] = 255;
    }
    return { indexed, outRgba };
  }

  // Handle Ordered Dithering (Bayer 2x2, 4x4, 8x8)
  if (algorithm.startsWith('bayer-')) {
    let matrix: number[][];
    let matrixSize: number;

    if (algorithm === 'bayer-2x2') {
      matrix = BAYER_2X2;
      matrixSize = 2;
    } else if (algorithm === 'bayer-4x4') {
      matrix = BAYER_4X4;
      matrixSize = 4;
    } else {
      matrix = BAYER_8X8;
      matrixSize = 8;
    }

    const maxVal = matrixSize * matrixSize;
    // Scale adjustment based on palette size: smaller palettes need larger threshold spread
    const spread = (255 / Math.min(palette.length, 16)) * ditherStrength * 0.75;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const pIdx = i * 4;

        // Threshold offset normalized around 0 (-0.5 to +0.5)
        const bayerVal = (matrix[y % matrixSize][x % matrixSize] / maxVal) - 0.5;
        const offset = bayerVal * spread;

        const c: RGB = {
          r: Math.min(255, Math.max(0, rgba[pIdx] + offset)),
          g: Math.min(255, Math.max(0, rgba[pIdx + 1] + offset)),
          b: Math.min(255, Math.max(0, rgba[pIdx + 2] + offset)),
        };

        const nearestIdx = findNearestColorIndex(c, palette);
        indexed[i] = nearestIdx;
        const matched = palette[nearestIdx];
        outRgba[pIdx] = matched.r;
        outRgba[pIdx + 1] = matched.g;
        outRgba[pIdx + 2] = matched.b;
        outRgba[pIdx + 3] = 255;
      }
    }

    return { indexed, outRgba };
  }

  // Error diffusion algorithms (Floyd-Steinberg, Atkinson, Sierra, Burkes)
  // Work with floating point RGB buffers to accumulate error
  const rBuf = new Float32Array(numPixels);
  const gBuf = new Float32Array(numPixels);
  const bBuf = new Float32Array(numPixels);

  for (let i = 0; i < numPixels; i++) {
    rBuf[i] = rgba[i * 4];
    gBuf[i] = rgba[i * 4 + 1];
    bBuf[i] = rgba[i * 4 + 2];
  }

  // Error distribution coefficients: [dx, dy, weight]
  let kernel: [number, number, number][];
  let divisor: number;

  if (algorithm === 'atkinson') {
    // Atkinson preserves high-frequency retro contrast (spreads 3/4 of error, drops 1/4)
    kernel = [
      [1, 0, 1], [2, 0, 1],
      [-1, 1, 1], [0, 1, 1], [1, 1, 1],
      [0, 2, 1]
    ];
    divisor = 8;
  } else if (algorithm === 'sierra') {
    // Sierra 2-row
    kernel = [
      [1, 0, 4], [2, 0, 3],
      [-2, 1, 1], [-1, 1, 2], [0, 1, 3], [1, 1, 2], [2, 1, 1]
    ];
    divisor = 16;
  } else if (algorithm === 'burkes') {
    // Burkes
    kernel = [
      [1, 0, 8], [2, 0, 4],
      [-2, 1, 2], [-1, 1, 4], [0, 1, 8], [1, 1, 4], [2, 1, 2]
    ];
    divisor = 32;
  } else {
    // Floyd-Steinberg default
    kernel = [
      [1, 0, 7],
      [-1, 1, 3], [0, 1, 5], [1, 1, 1]
    ];
    divisor = 16;
  }

  for (let y = 0; y < height; y++) {
    const isReverse = serpentine && (y % 2 === 1);
    const startX = isReverse ? width - 1 : 0;
    const endX = isReverse ? -1 : width;
    const stepX = isReverse ? -1 : 1;

    for (let x = startX; x !== endX; x += stepX) {
      const idx = y * width + x;
      const curR = Math.min(255, Math.max(0, rBuf[idx]));
      const curG = Math.min(255, Math.max(0, gBuf[idx]));
      const curB = Math.min(255, Math.max(0, bBuf[idx]));

      const curColor: RGB = { r: curR, g: curG, b: curB };
      const nearestIdx = findNearestColorIndex(curColor, palette);
      indexed[idx] = nearestIdx;

      const chosen = palette[nearestIdx];
      const pIdx = idx * 4;
      outRgba[pIdx] = chosen.r;
      outRgba[pIdx + 1] = chosen.g;
      outRgba[pIdx + 2] = chosen.b;
      outRgba[pIdx + 3] = 255;

      const errR = (curR - chosen.r) * ditherStrength;
      const errG = (curG - chosen.g) * ditherStrength;
      const errB = (curB - chosen.b) * ditherStrength;

      // Distribute error
      for (let k = 0; k < kernel.length; k++) {
        const [kdx, kdy, weight] = kernel[k];
        const nx = isReverse ? x - kdx : x + kdx;
        const ny = y + kdy;

        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIdx = ny * width + nx;
          const factor = weight / divisor;
          rBuf[nIdx] += errR * factor;
          gBuf[nIdx] += errG * factor;
          bBuf[nIdx] += errB * factor;
        }
      }
    }
  }

  return { indexed, outRgba };
}

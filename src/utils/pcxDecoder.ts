import { PcxHeader, RGB } from '../types/pcx';

export interface DecodedPcx {
  header: PcxHeader;
  width: number;
  height: number;
  depth: '1-bit' | '2-bit' | '4-bit' | '8-bit' | '24-bit' | 'unknown';
  palette: RGB[];
  rgbaPixels: Uint8ClampedArray;
  indexedPixels?: Uint8Array;
  valid: boolean;
  errorMessage?: string;
}

export function parsePcxHeader(buffer: Uint8Array): PcxHeader {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  const colormap: number[] = [];
  for (let i = 0; i < 48; i++) {
    colormap.push(buffer[16 + i]);
  }

  const filler: number[] = [];
  for (let i = 0; i < 54; i++) {
    filler.push(buffer[74 + i]);
  }

  return {
    manufacturer: buffer[0],
    version: buffer[1],
    encoding: buffer[2],
    bitsPerPixel: buffer[3],
    xmin: view.getUint16(4, true),
    ymin: view.getUint16(6, true),
    xmax: view.getUint16(8, true),
    ymax: view.getUint16(10, true),
    hdpi: view.getUint16(12, true),
    vdpi: view.getUint16(14, true),
    colormap,
    reserved: buffer[64],
    nPlanes: buffer[65],
    bytesPerLine: view.getUint16(66, true),
    paletteInfo: view.getUint16(68, true),
    hScreenSize: view.getUint16(70, true),
    vScreenSize: view.getUint16(72, true),
    filler,
  };
}

export function decodePcx(buffer: Uint8Array): DecodedPcx {
  if (buffer.length < 128) {
    return {
      header: {} as any,
      width: 0,
      height: 0,
      depth: 'unknown',
      palette: [],
      rgbaPixels: new Uint8ClampedArray(0),
      valid: false,
      errorMessage: 'File is smaller than minimum 128-byte PCX header',
    };
  }

  const header = parsePcxHeader(buffer);

  if (header.manufacturer !== 0x0a) {
    return {
      header,
      width: 0,
      height: 0,
      depth: 'unknown',
      palette: [],
      rgbaPixels: new Uint8ClampedArray(0),
      valid: false,
      errorMessage: `Invalid manufacturer byte: 0x${header.manufacturer.toString(16).padStart(2, '0')}. Expected 0x0A (ZSoft PCX).`,
    };
  }

  const width = header.xmax - header.xmin + 1;
  const height = header.ymax - header.ymin + 1;

  if (width <= 0 || height <= 0 || width > 8192 || height > 8192) {
    return {
      header,
      width,
      height,
      depth: 'unknown',
      palette: [],
      rgbaPixels: new Uint8ClampedArray(0),
      valid: false,
      errorMessage: `Invalid dimensions: ${width}x${height}`,
    };
  }

  // Determine color depth
  let depth: DecodedPcx['depth'] = 'unknown';
  if (header.bitsPerPixel === 8 && header.nPlanes === 1) depth = '8-bit';
  else if (header.bitsPerPixel === 8 && header.nPlanes === 3) depth = '24-bit';
  else if (header.bitsPerPixel === 1 && header.nPlanes === 4) depth = '4-bit';
  else if (header.bitsPerPixel === 4 && header.nPlanes === 1) depth = '4-bit';
  else if (header.bitsPerPixel === 2 && header.nPlanes === 1) depth = '2-bit';
  else if (header.bitsPerPixel === 1 && header.nPlanes === 1) depth = '1-bit';

  // Extract palette
  const palette: RGB[] = [];
  if (depth === '8-bit') {
    // Check for 256-color palette at the end
    // Look backwards from end of file for 0x0C marker + 768 bytes
    if (buffer.length >= 769 && buffer[buffer.length - 769] === 0x0c) {
      const palOffset = buffer.length - 768;
      for (let i = 0; i < 256; i++) {
        palette.push({
          r: buffer[palOffset + i * 3],
          g: buffer[palOffset + i * 3 + 1],
          b: buffer[palOffset + i * 3 + 2],
        });
      }
    } else {
      // Default to 16 colormap entries
      for (let i = 0; i < 16; i++) {
        palette.push({
          r: header.colormap[i * 3],
          g: header.colormap[i * 3 + 1],
          b: header.colormap[i * 3 + 2],
        });
      }
      while (palette.length < 256) {
        palette.push({ r: 0, g: 0, b: 0 });
      }
    }
  } else {
    // 1-bit, 2-bit, 4-bit palette comes from header colormap (16 colors)
    const numColors = 1 << (header.bitsPerPixel * header.nPlanes);
    const count = Math.min(16, numColors);
    for (let i = 0; i < count; i++) {
      palette.push({
        r: header.colormap[i * 3],
        g: header.colormap[i * 3 + 1],
        b: header.colormap[i * 3 + 2],
      });
    }
  }

  // Decompress RLE data scanline by scanline
  const scanlineBytesTotal = header.nPlanes * header.bytesPerLine;
  const decodedScanlines: Uint8Array[] = [];

  let bufPtr = 128;
  const dataEnd = (depth === '8-bit' && buffer[buffer.length - 769] === 0x0c)
    ? buffer.length - 769
    : buffer.length;

  for (let y = 0; y < height; y++) {
    const scanline = new Uint8Array(scanlineBytesTotal);
    let bytesFilled = 0;

    while (bytesFilled < scanlineBytesTotal && bufPtr < dataEnd) {
      const b = buffer[bufPtr++];
      if ((b & 0xc0) === 0xc0) {
        const count = b & 0x3f;
        const val = (bufPtr < dataEnd) ? buffer[bufPtr++] : 0;
        for (let k = 0; k < count && bytesFilled < scanlineBytesTotal; k++) {
          scanline[bytesFilled++] = val;
        }
      } else {
        scanline[bytesFilled++] = b;
      }
    }

    decodedScanlines.push(scanline);
  }

  const rgbaPixels = new Uint8ClampedArray(width * height * 4);
  const indexedPixels = depth !== '24-bit' ? new Uint8Array(width * height) : undefined;

  for (let y = 0; y < height; y++) {
    const scanline = decodedScanlines[y];
    const rowOffset = y * width;

    if (depth === '8-bit') {
      for (let x = 0; x < width; x++) {
        const colorIdx = scanline[x];
        const outIdx = (rowOffset + x) * 4;
        if (indexedPixels) indexedPixels[rowOffset + x] = colorIdx;
        const c = palette[colorIdx] || { r: 0, g: 0, b: 0 };
        rgbaPixels[outIdx] = c.r;
        rgbaPixels[outIdx + 1] = c.g;
        rgbaPixels[outIdx + 2] = c.b;
        rgbaPixels[outIdx + 3] = 255;
      }
    } else if (depth === '24-bit') {
      const rPlaneOffset = 0;
      const gPlaneOffset = header.bytesPerLine;
      const bPlaneOffset = header.bytesPerLine * 2;

      for (let x = 0; x < width; x++) {
        const outIdx = (rowOffset + x) * 4;
        rgbaPixels[outIdx] = scanline[rPlaneOffset + x];
        rgbaPixels[outIdx + 1] = scanline[gPlaneOffset + x];
        rgbaPixels[outIdx + 2] = scanline[bPlaneOffset + x];
        rgbaPixels[outIdx + 3] = 255;
      }
    } else if (depth === '4-bit') {
      // 4 planes of 1 bit each
      for (let x = 0; x < width; x++) {
        const byteIdx = Math.floor(x / 8);
        const bitPos = 7 - (x % 8);
        let colorIdx = 0;

        for (let plane = 0; plane < 4; plane++) {
          const planeOffset = plane * header.bytesPerLine;
          const planeByte = scanline[planeOffset + byteIdx] || 0;
          const bitVal = (planeByte >> bitPos) & 1;
          colorIdx |= (bitVal << plane);
        }

        if (indexedPixels) indexedPixels[rowOffset + x] = colorIdx;
        const outIdx = (rowOffset + x) * 4;
        const c = palette[colorIdx] || { r: 0, g: 0, b: 0 };
        rgbaPixels[outIdx] = c.r;
        rgbaPixels[outIdx + 1] = c.g;
        rgbaPixels[outIdx + 2] = c.b;
        rgbaPixels[outIdx + 3] = 255;
      }
    } else if (depth === '2-bit') {
      for (let x = 0; x < width; x++) {
        const byteIdx = Math.floor(x / 4);
        const shift = (3 - (x % 4)) * 2;
        const colorIdx = (scanline[byteIdx] >> shift) & 0x03;

        if (indexedPixels) indexedPixels[rowOffset + x] = colorIdx;
        const outIdx = (rowOffset + x) * 4;
        const c = palette[colorIdx] || { r: 0, g: 0, b: 0 };
        rgbaPixels[outIdx] = c.r;
        rgbaPixels[outIdx + 1] = c.g;
        rgbaPixels[outIdx + 2] = c.b;
        rgbaPixels[outIdx + 3] = 255;
      }
    } else if (depth === '1-bit') {
      for (let x = 0; x < width; x++) {
        const byteIdx = Math.floor(x / 8);
        const bitPos = 7 - (x % 8);
        const colorIdx = (scanline[byteIdx] >> bitPos) & 1;

        if (indexedPixels) indexedPixels[rowOffset + x] = colorIdx;
        const outIdx = (rowOffset + x) * 4;
        const c = palette[colorIdx] || { r: 0, g: 0, b: 0 };
        rgbaPixels[outIdx] = c.r;
        rgbaPixels[outIdx + 1] = c.g;
        rgbaPixels[outIdx + 2] = c.b;
        rgbaPixels[outIdx + 3] = 255;
      }
    }
  }

  return {
    header,
    width,
    height,
    depth,
    palette,
    rgbaPixels,
    indexedPixels,
    valid: true,
  };
}

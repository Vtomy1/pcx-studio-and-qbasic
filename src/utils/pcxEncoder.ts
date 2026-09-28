import { ColorDepth, PcxHeader, RGB, ConversionResult } from '../types/pcx';

// Helper to encode a byte buffer into PCX RLE stream
export function rleCompress(data: Uint8Array): Uint8Array {
  const output: number[] = [];
  let i = 0;
  const len = data.length;

  while (i < len) {
    let runLength = 1;
    const currentByte = data[i];

    while (
      i + runLength < len &&
      data[i + runLength] === currentByte &&
      runLength < 63
    ) {
      runLength++;
    }

    if (runLength > 1 || (currentByte >= 0xc0)) {
      output.push(0xc0 | runLength);
      output.push(currentByte);
    } else {
      output.push(currentByte);
    }

    i += runLength;
  }

  return new Uint8Array(output);
}

export function createPcxHeader(
  depth: ColorDepth,
  width: number,
  height: number,
  palette: RGB[]
): { header: PcxHeader; bytesPerLine: number; nPlanes: number; bitsPerPixel: number } {
  let bitsPerPixel = 8;
  let nPlanes = 1;
  let bytesPerLine = width;

  switch (depth) {
    case '1-bit': {
      bitsPerPixel = 1;
      nPlanes = 1;
      const rawBytes = Math.ceil(width / 8);
      bytesPerLine = rawBytes % 2 === 0 ? rawBytes : rawBytes + 1;
      break;
    }
    case '2-bit': {
      bitsPerPixel = 2;
      nPlanes = 1;
      const rawBytes = Math.ceil(width / 4);
      bytesPerLine = rawBytes % 2 === 0 ? rawBytes : rawBytes + 1;
      break;
    }
    case '4-bit': {
      // Standard EGA 16-color PCX: 4 planes of 1 bit each
      bitsPerPixel = 1;
      nPlanes = 4;
      const rawBytes = Math.ceil(width / 8);
      bytesPerLine = rawBytes % 2 === 0 ? rawBytes : rawBytes + 1;
      break;
    }
    case '8-bit': {
      bitsPerPixel = 8;
      nPlanes = 1;
      bytesPerLine = width % 2 === 0 ? width : width + 1;
      break;
    }
    case '24-bit': {
      bitsPerPixel = 8;
      nPlanes = 3;
      bytesPerLine = width % 2 === 0 ? width : width + 1;
      break;
    }
  }

  // 16-color 48-byte colormap (RGB triplets)
  const colormap = new Array(48).fill(0);
  const colormapColors = palette.slice(0, 16);
  for (let i = 0; i < colormapColors.length; i++) {
    colormap[i * 3] = colormapColors[i].r;
    colormap[i * 3 + 1] = colormapColors[i].g;
    colormap[i * 3 + 2] = colormapColors[i].b;
  }

  const header: PcxHeader = {
    manufacturer: 0x0a, // ZSoft .PCX
    version: 5,         // Version 3.0 (universal PCX with 256 palette support)
    encoding: 1,        // 1 = PCX run-length encoding
    bitsPerPixel,
    xmin: 0,
    ymin: 0,
    xmax: width - 1,
    ymax: height - 1,
    hdpi: 300,
    vdpi: 300,
    colormap,
    reserved: 0,
    nPlanes,
    bytesPerLine,
    paletteInfo: 1,     // 1 = Color / BW
    hScreenSize: width,
    vScreenSize: height,
    filler: new Array(54).fill(0),
  };

  return { header, bytesPerLine, nPlanes, bitsPerPixel };
}

export function writeHeaderToBuffer(header: PcxHeader): Uint8Array {
  const buffer = new Uint8Array(128);
  const view = new DataView(buffer.buffer);

  buffer[0] = header.manufacturer;
  buffer[1] = header.version;
  buffer[2] = header.encoding;
  buffer[3] = header.bitsPerPixel;

  view.setUint16(4, header.xmin, true);
  view.setUint16(6, header.ymin, true);
  view.setUint16(8, header.xmax, true);
  view.setUint16(10, header.ymax, true);
  view.setUint16(12, header.hdpi, true);
  view.setUint16(14, header.vdpi, true);

  for (let i = 0; i < 48; i++) {
    buffer[16 + i] = header.colormap[i] || 0;
  }

  buffer[64] = header.reserved;
  buffer[65] = header.nPlanes;
  view.setUint16(66, header.bytesPerLine, true);
  view.setUint16(68, header.paletteInfo, true);
  view.setUint16(70, header.hScreenSize, true);
  view.setUint16(72, header.vScreenSize, true);

  // 74..127 are left as 0

  return buffer;
}

export function encodePcx(
  depth: ColorDepth,
  width: number,
  height: number,
  palette: RGB[],
  indexedPixels?: Uint8Array,
  rgbaPixels?: Uint8ClampedArray
): { pcxData: Uint8Array; header: PcxHeader; rleStats: ConversionResult['rleStats'] } {
  const { header, bytesPerLine, nPlanes, bitsPerPixel } = createPcxHeader(
    depth,
    width,
    height,
    palette
  );

  const headerBytes = writeHeaderToBuffer(header);

  // Build uncompressed scanline data according to planes and bits
  let totalRawScanlinesLength = 0;
  const scanlinesRawData: Uint8Array[] = [];

  if (depth === '8-bit' && indexedPixels) {
    // 8-bit chunky (1 plane)
    for (let y = 0; y < height; y++) {
      const line = new Uint8Array(bytesPerLine);
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        line[x] = indexedPixels[rowOffset + x];
      }
      scanlinesRawData.push(line);
      totalRawScanlinesLength += bytesPerLine;
    }
  } else if (depth === '1-bit' && indexedPixels) {
    // 1-bit monochrome (1 plane, 1 bpp)
    for (let y = 0; y < height; y++) {
      const line = new Uint8Array(bytesPerLine);
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const bitVal = indexedPixels[rowOffset + x] & 1;
        const byteIdx = Math.floor(x / 8);
        const bitPos = 7 - (x % 8);
        if (bitVal) {
          line[byteIdx] |= (1 << bitPos);
        }
      }
      scanlinesRawData.push(line);
      totalRawScanlinesLength += bytesPerLine;
    }
  } else if (depth === '2-bit' && indexedPixels) {
    // 2-bit CGA (1 plane, 2 bpp)
    for (let y = 0; y < height; y++) {
      const line = new Uint8Array(bytesPerLine);
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const colorIdx = indexedPixels[rowOffset + x] & 0x03;
        const byteIdx = Math.floor(x / 4);
        const shift = (3 - (x % 4)) * 2;
        line[byteIdx] |= (colorIdx << shift);
      }
      scanlinesRawData.push(line);
      totalRawScanlinesLength += bytesPerLine;
    }
  } else if (depth === '4-bit' && indexedPixels) {
    // 4-bit EGA (4 planes of 1 bit each)
    // Order: Plane 0 (Bit 0), Plane 1 (Bit 1), Plane 2 (Bit 2), Plane 3 (Bit 3)
    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let plane = 0; plane < 4; plane++) {
        const planeLine = new Uint8Array(bytesPerLine);
        for (let x = 0; x < width; x++) {
          const colorIdx = indexedPixels[rowOffset + x] & 0x0f;
          const bitVal = (colorIdx >> plane) & 1;
          if (bitVal) {
            const byteIdx = Math.floor(x / 8);
            const bitPos = 7 - (x % 8);
            planeLine[byteIdx] |= (1 << bitPos);
          }
        }
        scanlinesRawData.push(planeLine);
        totalRawScanlinesLength += bytesPerLine;
      }
    }
  } else if (depth === '24-bit' && rgbaPixels) {
    // 24-bit Truecolor (3 planes: Red, Green, Blue)
    for (let y = 0; y < height; y++) {
      const redLine = new Uint8Array(bytesPerLine);
      const greenLine = new Uint8Array(bytesPerLine);
      const blueLine = new Uint8Array(bytesPerLine);
      const rowOffset = y * width * 4;

      for (let x = 0; x < width; x++) {
        const pIdx = rowOffset + x * 4;
        redLine[x] = rgbaPixels[pIdx];
        greenLine[x] = rgbaPixels[pIdx + 1];
        blueLine[x] = rgbaPixels[pIdx + 2];
      }

      scanlinesRawData.push(redLine);
      scanlinesRawData.push(greenLine);
      scanlinesRawData.push(blueLine);
      totalRawScanlinesLength += bytesPerLine * 3;
    }
  }

  // RLE compress all scanlines
  // In PCX, each scanline (or plane per scanline) can be compressed sequentially
  const compressedChunks: Uint8Array[] = [];
  let totalCompressedScanlineBytes = 0;
  let runsCount = 0;

  for (const rawLine of scanlinesRawData) {
    const comp = rleCompress(rawLine);
    compressedChunks.push(comp);
    totalCompressedScanlineBytes += comp.length;
    // count runs in comp
    for (let i = 0; i < comp.length; i++) {
      if ((comp[i] & 0xc0) === 0xc0) {
        runsCount++;
        i++; // skip data byte
      } else {
        runsCount++;
      }
    }
  }

  // Build final PCX file
  // Header: 128 bytes
  // Compressed image data
  // If 8-bit: 1 byte marker (0x0C) + 768 bytes palette
  let finalSize = 128 + totalCompressedScanlineBytes;
  const hasVgaPalette = (depth === '8-bit');
  if (hasVgaPalette) {
    finalSize += 1 + 768;
  }

  const pcxFile = new Uint8Array(finalSize);
  pcxFile.set(headerBytes, 0);

  let offset = 128;
  for (const chunk of compressedChunks) {
    pcxFile.set(chunk, offset);
    offset += chunk.length;
  }

  if (hasVgaPalette) {
    pcxFile[offset++] = 0x0c; // 256-color palette marker
    for (let i = 0; i < 256; i++) {
      const color = palette[i] || { r: 0, g: 0, b: 0 };
      pcxFile[offset++] = color.r;
      pcxFile[offset++] = color.g;
      pcxFile[offset++] = color.b;
    }
  }

  const rawBytes = 128 + totalRawScanlinesLength + (hasVgaPalette ? 769 : 0);
  const pcxBytes = pcxFile.length;
  const compressionRatio = rawBytes > 0 ? (1 - pcxBytes / rawBytes) * 100 : 0;

  return {
    pcxData: pcxFile,
    header,
    rleStats: {
      rawBytes,
      pcxBytes,
      compressionRatio: Math.max(0, Math.round(compressionRatio * 10) / 10),
      runsCount,
    },
  };
}

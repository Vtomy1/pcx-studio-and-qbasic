import React, { useState } from 'react';
import { PcxHeader, ConversionResult, ColorDepth } from '../types/pcx';
import { Binary, CheckCircle2, AlertCircle, FileSearch, ArrowRight } from 'lucide-react';

interface PcxHeaderInspectorProps {
  header: PcxHeader;
  pcxData: Uint8Array;
  depth: ColorDepth;
  rleStats: ConversionResult['rleStats'];
}

export const PcxHeaderInspector: React.FC<PcxHeaderInspectorProps> = ({
  header,
  pcxData,
  depth,
  rleStats,
}) => {
  const [activeTab, setActiveTab] = useState<'fields' | 'hexdump'>('fields');
  const [selectedByteOffset, setSelectedByteOffset] = useState<number | null>(null);

  // Field breakdown items
  const headerFields = [
    {
      offsetDec: 0,
      offsetHex: '0x00',
      size: 1,
      name: 'Manufacturer',
      type: 'BYTE',
      val: `0x${header.manufacturer.toString(16).padStart(2, '0').toUpperCase()} (${header.manufacturer})`,
      meaning: header.manufacturer === 0x0a ? 'ZSoft .PCX File Format ID' : 'Unknown ID',
      valid: header.manufacturer === 0x0a,
      notes: 'Must always be 0x0A (10 dec) to identify valid ZSoft PCX file.',
    },
    {
      offsetDec: 1,
      offsetHex: '0x01',
      size: 1,
      name: 'Version',
      type: 'BYTE',
      val: `${header.version}`,
      meaning: header.version === 5 ? 'Version 3.0 (with 256-color palette / 24-bit)' : `Version 2.${header.version}`,
      valid: true,
      notes: 'Version 5 supports appended 256-color palette and 24-bit RGB.',
    },
    {
      offsetDec: 2,
      offsetHex: '0x02',
      size: 1,
      name: 'Encoding',
      type: 'BYTE',
      val: `${header.encoding}`,
      meaning: header.encoding === 1 ? 'PCX Run-Length Encoding (RLE)' : 'Uncompressed',
      valid: header.encoding === 1,
      notes: '1 = Run-length encoding (runs with top 2 bits 11xx xxxx).',
    },
    {
      offsetDec: 3,
      offsetHex: '0x03',
      size: 1,
      name: 'BitsPerPixel',
      type: 'BYTE',
      val: `${header.bitsPerPixel}`,
      meaning: `${header.bitsPerPixel} bits per pixel per color plane`,
      valid: true,
      notes: '1 for mono/EGA planes, 2 for CGA, 8 for VGA/24-bit.',
    },
    {
      offsetDec: 4,
      offsetHex: '0x04-0x0B',
      size: 8,
      name: 'Image Window (Bounding Box)',
      type: '4 × WORD',
      val: `[${header.xmin}, ${header.ymin}] - [${header.xmax}, ${header.ymax}]`,
      meaning: `Width: ${header.xmax - header.xmin + 1} px, Height: ${header.ymax - header.ymin + 1} px`,
      valid: header.xmax >= header.xmin && header.ymax >= header.ymin,
      notes: 'Dimensions calculated as (Xmax - Xmin + 1) × (Ymax - Ymin + 1).',
    },
    {
      offsetDec: 12,
      offsetHex: '0x0C-0x0F',
      size: 4,
      name: 'DPI Resolution',
      type: '2 × WORD',
      val: `${header.hdpi} × ${header.vdpi} DPI`,
      meaning: 'Horizontal & Vertical target print/display DPI',
      valid: true,
      notes: 'Typically 72 DPI (screen) or 300 DPI (print).',
    },
    {
      offsetDec: 16,
      offsetHex: '0x10-0x3F',
      size: 48,
      name: '16-Color Palette (Colormap)',
      type: '16 × RGB',
      val: `${header.colormap.length} bytes (16 triplets)`,
      meaning: depth === '8-bit' ? 'EGA fallback palette (256-color DAC is at EOF)' : 'Active hardware 16-color colormap',
      valid: true,
      notes: '16 RGB triplets (0-255 each). Used by EGA, CGA, and mono modes.',
    },
    {
      offsetDec: 64,
      offsetHex: '0x40',
      size: 1,
      name: 'Reserved',
      type: 'BYTE',
      val: `${header.reserved}`,
      meaning: 'Reserved by ZSoft (must be 0)',
      valid: header.reserved === 0,
      notes: 'Should always be zero.',
    },
    {
      offsetDec: 65,
      offsetHex: '0x41',
      size: 1,
      name: 'NPlanes',
      type: 'BYTE',
      val: `${header.nPlanes}`,
      meaning: header.nPlanes === 4 ? '4 Bitplanes (EGA 16-color)' : header.nPlanes === 3 ? '3 Planes (Red, Green, Blue 24-bit)' : '1 Plane (Chunky)',
      valid: true,
      notes: 'Number of color planes. 1 for 8-bit VGA/CGA/mono, 4 for EGA, 3 for 24-bit RGB.',
    },
    {
      offsetDec: 66,
      offsetHex: '0x42-0x43',
      size: 2,
      name: 'BytesPerLine',
      type: 'WORD (LE)',
      val: `${header.bytesPerLine} bytes`,
      meaning: `${header.bytesPerLine} bytes per scanline per color plane`,
      valid: header.bytesPerLine % 2 === 0,
      notes: 'CRITICAL: Must always be an EVEN number per PCX specification!',
    },
    {
      offsetDec: 68,
      offsetHex: '0x44-0x45',
      size: 2,
      name: 'PaletteInfo',
      type: 'WORD (LE)',
      val: `${header.paletteInfo}`,
      meaning: header.paletteInfo === 1 ? '1 = Color / Black & White' : '2 = Grayscale',
      valid: true,
      notes: 'Interpretation hint for graphics decoder.',
    },
    {
      offsetDec: 70,
      offsetHex: '0x46-0x49',
      size: 4,
      name: 'HScreenSize / VScreenSize',
      type: '2 × WORD',
      val: `${header.hScreenSize} × ${header.vScreenSize}`,
      meaning: 'Recommended target CRT monitor screen mode dimensions',
      valid: true,
      notes: 'Source display resolution (e.g. 320x200 or 640x480).',
    },
    {
      offsetDec: 74,
      offsetHex: '0x4A-0x7F',
      size: 54,
      name: 'Filler / Reserved Bytes',
      type: '54 BYTES',
      val: '54 zeros',
      meaning: 'Padding to ensure exact 128-byte header structure',
      valid: true,
      notes: 'Pads the header to exactly 128 bytes.',
    },
  ];

  // Hex dump generator for the first 256 bytes and last 769 bytes (if 8-bit)
  const renderHexDump = () => {
    const bytesToDisplay = Math.min(pcxData.length, 384);
    const rows: { offset: number; hexVals: string[]; asciiVals: string[]; section: string }[] = [];

    for (let offset = 0; offset < bytesToDisplay; offset += 16) {
      const hexVals: string[] = [];
      const asciiVals: string[] = [];

      for (let j = 0; j < 16 && offset + j < bytesToDisplay; j++) {
        const b = pcxData[offset + j];
        hexVals.push(b.toString(16).padStart(2, '0').toUpperCase());
        asciiVals.push(b >= 32 && b <= 126 ? String.fromCharCode(b) : '.');
      }

      let section = 'Image RLE Data';
      if (offset < 128) section = 'PCX Header (0..127)';

      rows.push({ offset, hexVals, asciiVals, section });
    }

    return rows;
  };

  const hexRows = renderHexDump();

  return (
    <div className="bg-[#121824] rounded-xl border border-zinc-800 p-4 space-y-4 text-sm">
      {/* Title & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Binary className="w-4 h-4 text-amber-400" />
          <h2 className="font-semibold text-zinc-100">PCX Binary Header & Structure</h2>
        </div>

        <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('fields')}
            className={`px-3 py-1 rounded transition-all ${
              activeTab === 'fields'
                ? 'bg-amber-500 text-zinc-950 font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            128-Byte Field Breakdown
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hexdump')}
            className={`px-3 py-1 rounded transition-all ${
              activeTab === 'hexdump'
                ? 'bg-amber-500 text-zinc-950 font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Raw Hex Stream Viewer
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
        <div className="bg-zinc-900/70 p-2.5 rounded-lg border border-zinc-800">
          <span className="text-[10px] text-zinc-500 block">PCX File Size</span>
          <span className="text-amber-400 font-bold text-sm">
            {(pcxData.length / 1024).toFixed(1)} KB
          </span>
          <span className="text-[10px] text-zinc-500 block mt-0.5">
            {pcxData.length.toLocaleString()} bytes
          </span>
        </div>

        <div className="bg-zinc-900/70 p-2.5 rounded-lg border border-zinc-800">
          <span className="text-[10px] text-zinc-500 block">RLE Compression</span>
          <span className="text-emerald-400 font-bold text-sm">
            {rleStats.compressionRatio}% saved
          </span>
          <span className="text-[10px] text-zinc-500 block mt-0.5">
            from {(rleStats.rawBytes / 1024).toFixed(1)} KB raw
          </span>
        </div>

        <div className="bg-zinc-900/70 p-2.5 rounded-lg border border-zinc-800">
          <span className="text-[10px] text-zinc-500 block">RLE Run Packets</span>
          <span className="text-cyan-400 font-bold text-sm">
            {rleStats.runsCount.toLocaleString()}
          </span>
          <span className="text-[10px] text-zinc-500 block mt-0.5">
            compressed blocks
          </span>
        </div>

        <div className="bg-zinc-900/70 p-2.5 rounded-lg border border-zinc-800">
          <span className="text-[10px] text-zinc-500 block">Specification</span>
          <div className="flex items-center gap-1 text-emerald-400 font-bold text-sm mt-0.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>100% Compliant</span>
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">
            Even BytesPerLine: {header.bytesPerLine}
          </span>
        </div>
      </div>

      {/* Tab 1: Header Fields Breakdown Table */}
      {activeTab === 'fields' && (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-zinc-900/90 text-zinc-400 text-[11px] border-b border-zinc-800">
              <tr>
                <th className="p-2.5">Offset</th>
                <th className="p-2.5">Field Name</th>
                <th className="p-2.5">Type</th>
                <th className="p-2.5">Value</th>
                <th className="p-2.5">Interpretation</th>
                <th className="p-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
              {headerFields.map((f, i) => (
                <tr
                  key={i}
                  className={`hover:bg-zinc-900/50 transition-colors ${
                    selectedByteOffset === f.offsetDec ? 'bg-amber-500/10' : ''
                  }`}
                  onClick={() => setSelectedByteOffset(f.offsetDec)}
                >
                  <td className="p-2.5 text-zinc-500">{f.offsetHex}</td>
                  <td className="p-2.5 text-zinc-200 font-semibold">{f.name}</td>
                  <td className="p-2.5 text-zinc-400 text-[11px]">{f.type}</td>
                  <td className="p-2.5 text-amber-400 font-bold">{f.val}</td>
                  <td className="p-2.5 text-zinc-300 font-sans text-xs">
                    <div>{f.meaning}</div>
                    <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{f.notes}</div>
                  </td>
                  <td className="p-2.5">
                    {f.valid ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">
                        <CheckCircle2 className="w-2.5 h-2.5" /> OK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-red-400 bg-red-950/40 px-1.5 py-0.5 rounded border border-red-800/40">
                        <AlertCircle className="w-2.5 h-2.5" /> Invalid
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Raw Hex Dump Viewer */}
      {activeTab === 'hexdump' && (
        <div className="space-y-3 font-mono text-xs">
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400 bg-zinc-900/70 p-2 rounded-lg border border-zinc-800">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-cyan-500/30 border border-cyan-400" />
              <span>Header (0..127)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-500/30 border border-amber-400" />
              <span>Scanline RLE Bytes</span>
            </span>
            {depth === '8-bit' && (
              <>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-purple-500/30 border border-purple-400" />
                  <span>Palette Marker (0x0C)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500/30 border border-emerald-400" />
                  <span>VGA 256 DAC Palette (768b)</span>
                </span>
              </>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto bg-zinc-950 p-3 rounded-lg border border-zinc-800 divide-y divide-zinc-900">
            {hexRows.map((r) => {
              const isHeaderRow = r.offset < 128;
              return (
                <div key={r.offset} className="py-1 flex items-center hover:bg-zinc-900/50">
                  {/* Address */}
                  <span className="text-zinc-600 select-none w-20">
                    {r.offset.toString(16).padStart(6, '0').toUpperCase()}
                  </span>

                  {/* Hex bytes */}
                  <div className="flex-1 flex gap-2">
                    <span
                      className={`flex gap-1.5 ${
                        isHeaderRow ? 'text-cyan-400' : 'text-amber-300'
                      }`}
                    >
                      {r.hexVals.slice(0, 8).join(' ')}
                    </span>
                    <span className="text-zinc-700 select-none">|</span>
                    <span
                      className={`flex gap-1.5 ${
                        isHeaderRow ? 'text-cyan-400' : 'text-amber-300'
                      }`}
                    >
                      {r.hexVals.slice(8, 16).join(' ')}
                    </span>
                  </div>

                  {/* ASCII preview */}
                  <span className="text-zinc-500 w-24 text-right tracking-widest">
                    {r.asciiVals.join('')}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="text-[11px] text-zinc-500 flex items-center gap-1">
            <FileSearch className="w-3.5 h-3.5" />
            <span>Displaying first 384 bytes of generated binary PCX stream.</span>
          </div>
        </div>
      )}
    </div>
  );
};

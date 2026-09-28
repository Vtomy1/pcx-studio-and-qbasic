import { ColorDepth, PcxHeader, RGB } from '../types/pcx';

export interface CodeSnippets {
  loaderUniversal: string;
  loaderFastMem: string;
  saverCode: string;
  dataStatementRunner: string;
  typeDefinition: string;
  qb64Modern: string;
}

export function generateQBasicCode(
  filename: string,
  depth: ColorDepth,
  width: number,
  height: number,
  header: PcxHeader,
  palette: RGB[],
  rawPcxData?: Uint8Array
): CodeSnippets {
  const safeFilename = filename.toLowerCase().endsWith('.pcx') ? filename : `${filename}.pcx`;

  // 1. QBasic Type Definition
  const typeDefinition = `' ==============================================================
' QBASIC / QUICKBASIC PCX HEADER DATA STRUCTURE (128 BYTES)
' Complies with ZSoft PCX File Format Technical Specification
' ==============================================================
TYPE PCXHeader
    Manufacturer AS STRING * 1  ' &H0A = ZSoft .PCX
    Version      AS STRING * 1  ' 0=v2.5, 2=v2.8 w/pal, 3=v2.8, 5=v3.0
    Encoding     AS STRING * 1  ' 1 = PCX Run-Length Encoding
    BitsPerPixel AS STRING * 1  ' 1, 2, 4, or 8 bits per pixel per plane
    XMin         AS INTEGER     ' Window X minimum (usually 0)
    YMin         AS INTEGER     ' Window Y minimum (usually 0)
    XMax         AS INTEGER     ' Window X maximum (Width - 1)
    YMax         AS INTEGER     ' Window Y maximum (Height - 1)
    HDpi         AS INTEGER     ' Horizontal DPI resolution
    VDpi         AS INTEGER     ' Vertical DPI resolution
    Colormap     AS STRING * 48 ' 16 RGB triplets (0-255) for 16 colors
    Reserved     AS STRING * 1  ' Set to 0
    NPlanes      AS STRING * 1  ' Number of color planes (1, 3, or 4)
    BytesPerLine AS INTEGER     ' Scanline byte count (MUST BE EVEN!)
    PaletteInfo  AS INTEGER     ' 1 = Color/BW, 2 = Grayscale
    HScreenSize  AS INTEGER     ' Target display width (e.g. 320, 640)
    VScreenSize  AS INTEGER     ' Target display height (e.g. 200, 480)
    Filler       AS STRING * 54 ' Padding zeros
END TYPE
`;

  // Determine screen mode recommendation
  let screenMode = 13;
  let screenComment = 'VGA 320x200 256 colors';
  if (depth === '4-bit') {
    screenMode = (height > 200 || width > 320) ? 12 : 7;
    screenComment = (screenMode === 12) ? 'VGA 640x480 16 colors' : 'EGA 320x200 16 colors';
  } else if (depth === '2-bit') {
    screenMode = 1;
    screenComment = 'CGA 320x200 4 colors';
  } else if (depth === '1-bit') {
    screenMode = (height > 200 || width > 320) ? 11 : 2;
    screenComment = (screenMode === 11) ? 'VGA 640x480 2 colors' : 'CGA 640x200 2 colors';
  } else if (depth === '24-bit') {
    screenMode = 13;
    screenComment = 'VGA 320x200 (24-bit downsampled or converted)';
  }

  // 2. Universal Loader
  let loaderUniversal = `' ==============================================================
' UNIVERSAL QBASIC PCX LOADER (${depth.toUpperCase()})
' Compatible with QBasic 1.1, QuickBASIC 4.5, 7.1 PDS, and QB64
' Target File: "${safeFilename}" (${width}x${height})
' ==============================================================
DEFINT A-Z
DECLARE SUB LoadPCX (FileName$)

SCREEN ${screenMode}  ' ${screenComment}
CLS

LoadPCX "${safeFilename}"

PRINT "Press any key to exit..."
WHILE INKEY$ = "": WEND
SCREEN 0: WIDTH 80: CLS
END

SUB LoadPCX (FileName$)
    DIM Head AS PCXHeader
    DIM FileNum AS INTEGER
    DIM Char AS STRING * 1
    
    FileNum = FREEFILE
    OPEN FileName$ FOR BINARY AS #FileNum
    IF LOF(FileNum) < 128 THEN
        PRINT "Error: File is not a valid PCX file!": CLOSE #FileNum: EXIT SUB
    END IF
    
    GET #FileNum, 1, Head
    IF ASC(Head.Manufacturer) <> 10 THEN
        PRINT "Error: Invalid PCX header ID": CLOSE #FileNum: EXIT SUB
    END IF
    
    imgW = Head.XMax - Head.XMin + 1
    imgH = Head.YMax - Head.YMin + 1
    bpp = ASC(Head.BitsPerPixel)
    planes = ASC(Head.NPlanes)
    bytesLine = Head.BytesPerLine
`;

  if (depth === '8-bit') {
    loaderUniversal += `
    ' --- LOAD VGA 256-COLOR PALETTE (at end of file) ---
    SEEK #FileNum, LOF(FileNum) - 768
    GET #FileNum, , Char
    IF ASC(Char) = 12 THEN
        ' Pal marker &H0C found! Read 768 RGB bytes and send to VGA DAC
        OUT &H3C8, 0  ' Start at palette index 0
        FOR i = 0 TO 255
            GET #FileNum, , Char: r% = ASC(Char) \\ 4
            GET #FileNum, , Char: g% = ASC(Char) \\ 4
            GET #FileNum, , Char: b% = ASC(Char) \\ 4
            OUT &H3C9, r%
            OUT &H3C9, g%
            OUT &H3C9, b%
        NEXT i
    END IF

    ' --- DECODE RUN-LENGTH ENCODED SCANLINES ---
    SEEK #FileNum, 129  ' Seek right after 128-byte header
    y = 0
    WHILE y < imgH AND NOT EOF(FileNum)
        x = 0
        WHILE x < bytesLine AND NOT EOF(FileNum)
            GET #FileNum, , Char
            b% = ASC(Char)
            IF (b% AND &HC0) = &HC0 THEN
                count% = b% AND &H3F
                GET #FileNum, , Char
                col% = ASC(Char)
                FOR k = 1 TO count%
                    IF x < imgW THEN PSET (x, y), col%
                    x = x + 1
                NEXT k
            ELSE
                IF x < imgW THEN PSET (x, y), b%
                x = x + 1
            END IF
        WEND
        y = y + 1
    WEND
`;
  } else if (depth === '4-bit') {
    loaderUniversal += `
    ' --- SET 16-COLOR PALETTE FROM PCX COLORMAP (Bytes 16..63) ---
    FOR i = 0 TO 15
        r% = ASC(MID$(Head.Colormap, i * 3 + 1, 1)) \\ 4
        g% = ASC(MID$(Head.Colormap, i * 3 + 2, 1)) \\ 4
        b% = ASC(MID$(Head.Colormap, i * 3 + 3, 1)) \\ 4
        OUT &H3C8, i: OUT &H3C9, r%: OUT &H3C9, g%: OUT &H3C9, b%
    NEXT i

    ' --- DECODE 4 PLANES PER SCANLINE ---
    SEEK #FileNum, 129
    DIM ScanBuf(0 TO 3, 0 TO 1023) AS INTEGER

    FOR y = 0 TO imgH - 1
        FOR p = 0 TO planes - 1
            x = 0
            WHILE x < bytesLine AND NOT EOF(FileNum)
                GET #FileNum, , Char
                b% = ASC(Char)
                IF (b% AND &HC0) = &HC0 THEN
                    count% = b% AND &H3F
                    GET #FileNum, , Char
                    v% = ASC(Char)
                    FOR k = 1 TO count%
                        ScanBuf(p, x) = v%
                        x = x + 1
                    NEXT k
                ELSE
                    ScanBuf(p, x) = b%
                    x = x + 1
                END IF
            WEND
        NEXT p

        ' Unpack 4 bitplanes into 16-color pixels
        FOR px = 0 TO imgW - 1
            byteIdx = px \\ 8
            bitPos = 7 - (px MOD 8)
            col% = 0
            FOR p = 0 TO planes - 1
                IF (ScanBuf(p, byteIdx) AND (2 ^ bitPos)) <> 0 THEN
                    col% = col% OR (2 ^ p)
                END IF
            NEXT p
            PSET (px, y), col%
        NEXT px
    NEXT y
`;
  } else if (depth === '2-bit') {
    loaderUniversal += `
    ' --- SET CGA 4-COLOR PALETTE ---
    COLOR 0, 1  ' Background 0, Cyan/Magenta/White palette

    SEEK #FileNum, 129
    FOR y = 0 TO imgH - 1
        x = 0
        WHILE x < bytesLine AND NOT EOF(FileNum)
            GET #FileNum, , Char
            b% = ASC(Char)
            IF (b% AND &HC0) = &HC0 THEN
                count% = b% AND &H3F
                GET #FileNum, , Char
                val% = ASC(Char)
                FOR k = 1 TO count%
                    GOSUB DrawCGAByte
                    x = x + 1
                NEXT k
            ELSE
                val% = b%
                GOSUB DrawCGAByte
                x = x + 1
            END IF
        WEND
    NEXT y
    CLOSE #FileNum
    EXIT SUB

DrawCGAByte:
    ' Each byte contains 4 pixels (2 bits each: 7-6, 5-4, 3-2, 1-0)
    FOR pix = 0 TO 3
        px = x * 4 + pix
        shift% = (3 - pix) * 2
        col% = (val% \\ (2 ^ shift%)) AND 3
        IF px < imgW THEN PSET (px, y), col%
    NEXT pix
    RETURN
`;
  } else if (depth === '1-bit') {
    loaderUniversal += `
    ' --- DECODE 1-BIT MONOCHROME SCANLINES ---
    SEEK #FileNum, 129
    FOR y = 0 TO imgH - 1
        x = 0
        WHILE x < bytesLine AND NOT EOF(FileNum)
            GET #FileNum, , Char
            b% = ASC(Char)
            IF (b% AND &HC0) = &HC0 THEN
                count% = b% AND &H3F
                GET #FileNum, , Char
                val% = ASC(Char)
                FOR k = 1 TO count%
                    GOSUB DrawMonoByte
                    x = x + 1
                NEXT k
            ELSE
                val% = b%
                GOSUB DrawMonoByte
                x = x + 1
            END IF
        WEND
    NEXT y
    CLOSE #FileNum
    EXIT SUB

DrawMonoByte:
    ' 8 pixels per byte (bit 7 to bit 0)
    FOR pix = 0 TO 7
        px = x * 8 + pix
        bit% = (val% \\ (2 ^ (7 - pix))) AND 1
        IF px < imgW THEN PSET (px, y), bit%
    NEXT pix
    RETURN
`;
  } else {
    // 24-bit Truecolor
    loaderUniversal += `
    ' --- DECODE 24-BIT TRUECOLOR (R, G, B Planes) ---
    SEEK #FileNum, 129
    DIM RBuf(0 TO 1023) AS INTEGER
    DIM GBuf(0 TO 1023) AS INTEGER
    DIM BBuf(0 TO 1023) AS INTEGER

    FOR y = 0 TO imgH - 1
        ' Read Red, Green, and Blue planes
        FOR p = 0 TO 2
            x = 0
            WHILE x < bytesLine AND NOT EOF(FileNum)
                GET #FileNum, , Char
                b% = ASC(Char)
                IF (b% AND &HC0) = &HC0 THEN
                    count% = b% AND &H3F
                    GET #FileNum, , Char
                    v% = ASC(Char)
                    FOR k = 1 TO count%
                        IF p = 0 THEN RBuf(x) = v%
                        IF p = 1 THEN GBuf(x) = v%
                        IF p = 2 THEN BBuf(x) = v%
                        x = x + 1
                    NEXT k
                ELSE
                    IF p = 0 THEN RBuf(x) = b%
                    IF p = 1 THEN GBuf(x) = b%
                    IF p = 2 THEN BBuf(x) = b%
                    x = x + 1
                END IF
            WEND
        NEXT p

        ' Map 24-bit RGB into nearest 256-color or greyscale on SCREEN 13
        FOR px = 0 TO imgW - 1
            lum% = (RBuf(px) * 30 + GBuf(px) * 59 + BBuf(px) * 11) \\ 100
            col% = 16 + (lum% * 15 \\ 255)  ' 16-shade grey ramp
            PSET (px, y), col%
        NEXT px
    NEXT y
`;
  }

  loaderUniversal += `
    CLOSE #FileNum
END SUB
`;

  // 3. High-Speed Direct Memory Loader (DEF SEG = &HA000 / POKE)
  let loaderFastMem = `' ==============================================================
' HIGH-SPEED DIRECT VIDEO MEMORY PCX LOADER (BLAZING FAST)
' Bypasses slow PSET by writing directly to &HA000 video segment
' ==============================================================
DEFINT A-Z
DECLARE SUB FastLoadPCX (FileName$)

SCREEN 13  ' 320x200x256 VGA
FastLoadPCX "${safeFilename}"

WHILE INKEY$ = "": WEND
SCREEN 0: WIDTH 80: CLS
END

SUB FastLoadPCX (FileName$)
    DIM FileNum AS INTEGER
    DIM Char AS STRING * 1
    
    FileNum = FREEFILE
    OPEN FileName$ FOR BINARY AS #FileNum
    IF LOF(FileNum) < 128 THEN CLOSE #FileNum: EXIT SUB

    ' Load 256-color palette directly into VGA DAC registers
    SEEK #FileNum, LOF(FileNum) - 768
    GET #FileNum, , Char
    IF ASC(Char) = 12 THEN
        OUT &H3C8, 0
        FOR i = 0 TO 255
            GET #FileNum, , Char: r% = ASC(Char) \\ 4
            GET #FileNum, , Char: g% = ASC(Char) \\ 4
            GET #FileNum, , Char: b% = ASC(Char) \\ 4
            OUT &H3C9, r%: OUT &H3C9, g%: OUT &H3C9, b%
        NEXT i
    END IF

    ' Direct Video Memory Blit to &HA000 (VGA 320x200 framebuffer)
    DEF SEG = &HA000
    SEEK #FileNum, 129
    vidOffset& = 0
    maxOffset& = 64000  ' 320 * 200 = 64,000 bytes

    WHILE vidOffset& < maxOffset& AND NOT EOF(FileNum)
        GET #FileNum, , Char
        b% = ASC(Char)
        IF (b% AND &HC0) = &HC0 THEN
            count% = b% AND &H3F
            GET #FileNum, , Char
            col% = ASC(Char)
            FOR k = 1 TO count%
                IF vidOffset& < maxOffset& THEN POKE vidOffset&, col%
                vidOffset& = vidOffset& + 1
            NEXT k
        ELSE
            IF vidOffset& < maxOffset& THEN POKE vidOffset&, b%
            vidOffset& = vidOffset& + 1
        END IF
    WEND

    DEF SEG  ' Reset segment back to default DGROUP
    CLOSE #FileNum
END SUB
`;

  // 4. Complete Screen-to-PCX Saver in QBasic
  let saverCode = `' ==============================================================
' COMPLETE QBASIC PCX SCREEN SAVER ROUTINE
' Captures the current DOS screen and saves to standard .PCX file
' Includes full PCX Header construction & RLE Compression engine
' ==============================================================
DEFINT A-Z
DECLARE SUB SaveScreenPCX (FileName$, Width%, Height%, ScreenMode%)

' Demonstration: Draw sample graphics and save to PCX
SCREEN ${screenMode}
CLS
FOR i = 0 TO 15
    LINE (i * 20, 0)-(i * 20 + 19, 199), i, BF
NEXT i
CIRCLE (160, 100), 60, 15
PAINT (160, 100), 14, 15

PRINT "Saving screen to ${safeFilename}..."
SaveScreenPCX "${safeFilename}", ${width}, ${height}, ${screenMode}
PRINT "Done! Press any key."
WHILE INKEY$ = "": WEND
SCREEN 0: WIDTH 80: CLS
END

SUB SaveScreenPCX (FileName$, Width%, Height%, ScreenMode%)
    DIM FileNum AS INTEGER
    DIM Head AS PCXHeader
    DIM LineBuf(0 TO 1023) AS INTEGER
    
    FileNum = FREEFILE
    OPEN FileName$ FOR OUTPUT AS #FileNum: CLOSE #FileNum  ' Erase existing
    OPEN FileName$ FOR BINARY AS #FileNum

    ' --- CONSTRUCT 128-BYTE PCX HEADER ---
    Head.Manufacturer = CHR$(10)      ' &H0A ZSoft PCX
    Head.Version      = CHR$(5)       ' Version 3.0
    Head.Encoding     = CHR$(1)       ' 1 = RLE Compressed
    
    IF ScreenMode% = 13 THEN
        Head.BitsPerPixel = CHR$(8)   ' 8 bits per pixel
        Head.NPlanes      = CHR$(1)   ' 1 plane
        BytesLine%        = Width%
    ELSEIF ScreenMode% = 12 OR ScreenMode% = 7 THEN
        Head.BitsPerPixel = CHR$(1)   ' 1 bit per pixel
        Head.NPlanes      = CHR$(4)   ' 4 EGA planes
        BytesLine%        = (Width% + 7) \\ 8
    ELSEIF ScreenMode% = 1 THEN
        Head.BitsPerPixel = CHR$(2)   ' 2 bits per pixel
        Head.NPlanes      = CHR$(1)   ' 1 CGA plane
        BytesLine%        = (Width% + 3) \\ 4
    ELSE
        Head.BitsPerPixel = CHR$(1)   ' 1-bit Mono
        Head.NPlanes      = CHR$(1)
        BytesLine%        = (Width% + 7) \\ 8
    END IF

    ' Ensure BytesPerLine is EVEN (Strict PCX standard!)
    IF (BytesLine% MOD 2) <> 0 THEN BytesLine% = BytesLine% + 1
    Head.BytesPerLine = BytesLine%
    
    Head.XMin = 0
    Head.YMin = 0
    Head.XMax = Width% - 1
    Head.YMax = Height% - 1
    Head.HDpi = 300
    Head.VDpi = 300
    Head.PaletteInfo = 1
    Head.HScreenSize = Width%
    Head.VScreenSize = Height%
    Head.Colormap = STRING$(48, 0)
    Head.Filler = STRING$(54, 0)

    ' Write 128-byte header to file
    PUT #FileNum, 1, Head

    ' --- ENCODE AND COMPRESS SCANLINES ---
    FOR y = 0 TO Height% - 1
        ' Read scanline pixels from screen
        FOR x = 0 TO Width% - 1
            LineBuf(x) = POINT(x, y)
        NEXT x
        ' Pad remaining scanline bytes with zero if BytesPerLine > Width%
        FOR x = Width% TO BytesLine% - 1
            LineBuf(x) = 0
        NEXT x

        ' RLE Compressor: pack repeat runs up to 63 bytes
        x = 0
        WHILE x < BytesLine%
            curVal% = LineBuf(x)
            runLen% = 1
            WHILE (x + runLen% < BytesLine%) AND (LineBuf(x + runLen%) = curVal%) AND (runLen% < 63)
                runLen% = runLen% + 1
            WEND

            IF runLen% > 1 OR (curVal% >= &HC0) THEN
                flagByte% = &HC0 OR runLen%
                PUT #FileNum, , CHR$(flagByte%)
                PUT #FileNum, , CHR$(curVal%)
            ELSE
                PUT #FileNum, , CHR$(curVal%)
            END IF
            x = x + runLen%
        WEND
    NEXT y

    ' --- IF SCREEN 13 (VGA): SAVE 256-COLOR PALETTE ---
    IF ScreenMode% = 13 THEN
        PUT #FileNum, , CHR$(12)  ' &H0C Palette Marker
        OUT &H3C7, 0               ' Read palette starting at index 0
        FOR i = 0 TO 255
            r% = INP(&H3C9) * 4
            g% = INP(&H3C9) * 4
            b% = INP(&H3C9) * 4
            PUT #FileNum, , CHR$(r%)
            PUT #FileNum, , CHR$(g%)
            PUT #FileNum, , CHR$(b%)
        NEXT i
    END IF

    CLOSE #FileNum
END SUB
`;

  // 5. Embedded DATA Statements generator (First 1KB of PCX data represented as DATA lines)
  let dataStatementRunner = `' ==============================================================
' STANDALONE EMBEDDED DATA SCRIPT
' Zero disk files required! Run this directly inside QBasic 1.1!
' Reads embedded hex/byte DATA statements into video memory.
' ==============================================================
DEFINT A-Z
SCREEN ${screenMode}
CLS

RESTORE ImageData
READ TotalBytes&
PRINT "Decoding image ("; TotalBytes&; " bytes)..."

DEF SEG = &HA000
vid& = 0
WHILE vid& < 64000 AND TotalBytes& > 0
    READ b%
    TotalBytes& = TotalBytes& - 1
    IF (b% AND &HC0) = &HC0 THEN
        count% = b% AND &H3F
        READ v%: TotalBytes& = TotalBytes& - 1
        FOR k = 1 TO count%
            IF vid& < 64000 THEN POKE vid&, v%
            vid& = vid& + 1
        NEXT k
    ELSE
        IF vid& < 64000 THEN POKE vid&, b%
        vid& = vid& + 1
    END IF
WEND
DEF SEG

WHILE INKEY$ = "": WEND
SCREEN 0: END

ImageData:
`;

  // Generate sample DATA statements from rawPcxData if provided
  if (rawPcxData && rawPcxData.length > 128) {
    const dataSlice = rawPcxData.slice(128, Math.min(rawPcxData.length, 128 + 600));
    dataStatementRunner += `DATA ${dataSlice.length}\n`;
    for (let i = 0; i < dataSlice.length; i += 16) {
      const chunk: number[] = [];
      for (let j = 0; j < 16 && i + j < dataSlice.length; j++) {
        chunk.push(dataSlice[i + j]);
      }
      dataStatementRunner += `DATA ${chunk.join(',')}\n`;
    }
    if (dataSlice.length < rawPcxData.length - 128) {
      dataStatementRunner += `' ... (${rawPcxData.length - 128 - dataSlice.length} more bytes truncated for preview) ...\n`;
    }
  } else {
    dataStatementRunner += `DATA 16\nDATA 195,15,195,14,195,13,195,12,195,11,195,10,195,9,195,8\n`;
  }

  // 6. Modern QB64 / FreeBasic snippet
  const qb64Modern = `' ==============================================================
' MODERN QB64 / FREEBASIC HIGH-PERFORMANCE LOADER
' Uses hardware surfaces and 32-bit accelerated routines
' ==============================================================
$CHECKING:OFF
_TITLE "Modern QB64 PCX Viewer - ${safeFilename}"

img& = _LOADIMAGE("${safeFilename}", 32)
IF img& < -1 THEN
    SCREEN _NEWIMAGE(_WIDTH(img&), _HEIGHT(img&), 32)
    _PUTIMAGE (0, 0), img&
    _FREEIMAGE img&
ELSE
    PRINT "Could not load image: ${safeFilename}"
END IF

DO: _LIMIT 60: LOOP UNTIL _KEYHIT = 27
SYSTEM
`;

  return {
    loaderUniversal,
    loaderFastMem,
    saverCode,
    dataStatementRunner,
    typeDefinition,
    qb64Modern,
  };
}

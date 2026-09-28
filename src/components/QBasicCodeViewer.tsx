import React, { useState } from 'react';
import { CodeSnippets } from '../utils/qbasicGenerator';
import { Copy, Check, Download, Code2, Sparkles, Terminal, FileCode } from 'lucide-react';

interface QBasicCodeViewerProps {
  snippets: CodeSnippets;
  filename: string;
  onDownloadBas: (code: string, subName: string) => void;
  onDownloadPcx: () => void;
}

export const QBasicCodeViewer: React.FC<QBasicCodeViewerProps> = ({
  snippets,
  filename,
  onDownloadBas,
  onDownloadPcx,
}) => {
  const [activeTab, setActiveTab] = useState<keyof CodeSnippets>('loaderUniversal');
  const [copied, setCopied] = useState<boolean>(false);

  const tabs: { key: keyof CodeSnippets; label: string; desc: string; icon: string }[] = [
    { key: 'loaderUniversal', label: 'Universal Loader', desc: 'QBasic 1.1 / QuickBASIC 4.5 Binary File Reader', icon: '💾' },
    { key: 'loaderFastMem', label: 'Fast Memory Loader', desc: 'DEF SEG = &HA000 / Direct Video Blit', icon: '⚡' },
    { key: 'saverCode', label: 'PCX Screen Saver', desc: 'Full RLE Compressor & Screen Capture Engine', icon: '📸' },
    { key: 'dataStatementRunner', label: 'Embedded DATA Script', desc: 'Self-contained code with zero disk files needed', icon: '📦' },
    { key: 'typeDefinition', label: 'PCX Header TYPE', desc: 'QuickBASIC TYPE structure declaration', icon: '📐' },
    { key: 'qb64Modern', label: 'Modern QB64 / FreeBASIC', desc: 'Hardware-accelerated 32-bit loader', icon: '🚀' },
  ];

  const currentCode = snippets[activeTab];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Syntax highlighting for QBasic / QuickBASIC
  const renderHighlightedCode = (code: string) => {
    const lines = code.split('\n');

    return lines.map((line, lineIndex) => {
      // Check if line is a comment
      const trimmed = line.trimStart();
      if (trimmed.startsWith("'") || trimmed.toUpperCase().startsWith('REM ')) {
        return (
          <div key={`line-${lineIndex}`} className="table-row">
            <span className="table-cell pr-4 text-zinc-600 select-none text-right font-mono text-[11px] w-10">
              {lineIndex + 1}
            </span>
            <span className="table-cell font-mono whitespace-pre text-zinc-500 italic">
              {line}
            </span>
          </div>
        );
      }

      // Tokenize line words, strings, comments
      const parts: React.ReactNode[] = [];
      let i = 0;
      let curToken = '';
      let partKey = 0;

      while (i < line.length) {
        // String literal
        if (line[i] === '"') {
          if (curToken) {
            parts.push(highlightWord(curToken, `token-${partKey++}`));
            curToken = '';
          }
          let str = '"';
          i++;
          while (i < line.length && line[i] !== '"') {
            str += line[i];
            i++;
          }
          if (i < line.length) {
            str += '"';
            i++;
          }
          parts.push(<span key={`str-${partKey++}`} className="text-emerald-400">{str}</span>);
          continue;
        }

        // Inline comment
        if (line[i] === "'") {
          if (curToken) {
            parts.push(highlightWord(curToken, `token-${partKey++}`));
            curToken = '';
          }
          const comment = line.substring(i);
          parts.push(<span key={`comm-${partKey++}`} className="text-zinc-500 italic">{comment}</span>);
          break;
        }

        // Delimiters
        if (/[\s,()=+\-*/\\<>&]/.test(line[i])) {
          if (curToken) {
            parts.push(highlightWord(curToken, `token-${partKey++}`));
            curToken = '';
          }
          parts.push(<span key={`delim-${partKey++}`} className="text-zinc-400">{line[i]}</span>);
          i++;
          continue;
        }

        curToken += line[i];
        i++;
      }

      if (curToken) {
        parts.push(highlightWord(curToken, `token-${partKey++}`));
      }

      return (
        <div key={`line-${lineIndex}`} className="table-row">
          <span className="table-cell pr-4 text-zinc-600 select-none text-right font-mono text-[11px] w-10">
            {lineIndex + 1}
          </span>
          <span className="table-cell font-mono whitespace-pre">{parts}</span>
        </div>
      );
    });
  };

  const highlightWord = (word: string, key: string) => {
    const upper = word.toUpperCase();
    const keywords = [
      'SCREEN', 'CLS', 'DEF SEG', 'POKE', 'PEEK', 'OUT', 'INP', 'GET', 'PUT',
      'OPEN', 'CLOSE', 'FOR', 'TO', 'STEP', 'NEXT', 'WHILE', 'WEND', 'IF', 'THEN',
      'ELSE', 'ELSEIF', 'END', 'SUB', 'FUNCTION', 'DECLARE', 'DIM', 'AS', 'TYPE',
      'SEEK', 'LOF', 'EOF', 'FREEFILE', 'BINARY', 'OUTPUT', 'INPUT', 'RESTORE',
      'READ', 'DATA', 'PRINT', 'COLOR', 'PALETTE', 'PSET', 'LINE', 'CIRCLE',
      'PAINT', 'GOSUB', 'RETURN', 'EXIT', 'INTEGER', 'LONG', 'STRING', 'SINGLE',
      'DOUBLE', 'DEFINT', 'WIDTH', 'CHR$', 'ASC', 'MID$', 'LEFT$', 'RIGHT$',
      'LEN', 'STR$', 'VAL', 'INKEY$', 'AND', 'OR', 'XOR', 'NOT', 'MOD'
    ];

    if (keywords.includes(upper)) {
      return <span key={key} className="text-amber-400 font-semibold">{word}</span>;
    }

    if (/^[0-9]+$/.test(word) || upper.startsWith('&H')) {
      return <span key={key} className="text-cyan-400">{word}</span>;
    }

    return <span key={key} className="text-zinc-200">{word}</span>;
  };

  return (
    <div className="bg-[#121824] rounded-xl border border-zinc-800 p-4 space-y-4 text-sm">
      {/* Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-cyan-400" />
          <h2 className="font-semibold text-zinc-100 font-mono">QBasic / QuickBASIC Code Generator</h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono border transition-all ${
              copied
                ? 'bg-emerald-500 text-zinc-950 border-emerald-400 font-bold'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Code'}</span>
          </button>

          <button
            type="button"
            onClick={() => onDownloadBas(currentCode, activeTab)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-all border border-cyan-500 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .BAS</span>
          </button>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
        {tabs.map((t) => {
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`text-left p-2 rounded-lg border transition-all ${
                isActive
                  ? 'border-amber-400 bg-amber-500/10 text-white'
                  : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 text-zinc-400'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <span>{t.icon}</span>
                <span className="truncate">{t.label}</span>
              </div>
              <div className="text-[10px] text-zinc-500 truncate mt-0.5">{t.desc}</div>
            </button>
          );
        })}
      </div>

      {/* Code Editor Window (QBasic Blue Screen / IDE Style) */}
      <div className="relative rounded-lg border border-zinc-800 bg-[#000080]/90 shadow-2xl overflow-hidden font-mono text-xs">
        {/* DOS Header title bar */}
        <div className="bg-[#00aaaa] text-zinc-950 px-3 py-1 font-bold flex items-center justify-between text-[11px] select-none">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5" />
            <span>MS-DOS QBASIC 1.1 / QuickBASIC 4.5 - [{filename}.BAS]</span>
          </div>
          <span className="text-[10px] bg-zinc-900/20 px-1.5 py-0.5 rounded">
            Shift+F5: RUN
          </span>
        </div>

        {/* Code Content */}
        <div className="p-4 max-h-[460px] overflow-auto select-text table w-full">
          {renderHighlightedCode(currentCode)}
        </div>

        {/* Status bar */}
        <div className="bg-[#00aaaa] text-zinc-950 px-3 py-0.5 text-[10px] flex items-center justify-between font-mono font-medium">
          <span>&lt;Shift+F5=Run&gt; &lt;F6=Window&gt; &lt;F1=Help&gt;</span>
          <span>Line 1, Col 1</span>
        </div>
      </div>
    </div>
  );
};

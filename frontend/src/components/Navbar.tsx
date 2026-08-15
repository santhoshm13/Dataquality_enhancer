import React, { useState } from 'react';
import { UploadCloud, Download, Sparkles, RefreshCw, FileSpreadsheet, ChevronDown } from 'lucide-react';

interface NavbarProps {
  onOpenUpload: () => void;
  onExport: (format: 'csv' | 'excel') => void;
  onRunBatchEnrichment: () => void;
  isEnriching: boolean;
  healthStatus: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenUpload,
  onExport,
  onRunBatchEnrichment,
  isEnriching,
  healthStatus
}) => {
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-slate-800/80 px-6 py-3.5 shadow-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 p-0.5 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                AI Product Enrichment Platform
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider text-indigo-400 bg-indigo-950/80 border border-indigo-800/60 rounded-full uppercase">
                B2B Enterprise
              </span>
            </div>
            <p className="text-xs text-slate-400">CSV & Excel Ingestion · 252-Column Delivery Format Export</p>
          </div>
        </div>

        {/* Action Controls & Health */}
        <div className="flex items-center gap-4">
          
          {/* API Health Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
            <span className={`w-2 h-2 rounded-full ${healthStatus ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-amber-400 shadow-sm shadow-amber-400'}`}></span>
            <span className="text-slate-300 font-medium">{healthStatus ? 'Backend Connected' : 'Connecting...'}</span>
            <span className="text-slate-500">|</span>
            <span className="text-indigo-400 font-mono">PostgreSQL</span>
          </div>

          {/* Batch Enrich Button */}
          <button
            onClick={onRunBatchEnrichment}
            disabled={isEnriching}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-sm shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isEnriching ? 'animate-spin' : ''}`} />
            {isEnriching ? 'Enriching Pipeline...' : 'Run Pipeline'}
          </button>

          {/* Upload File Button */}
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-sm border border-slate-700 transition-all cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-indigo-400" />
            Upload File
          </button>

          {/* Export Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 font-medium text-sm border border-emerald-800/80 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Export Delivery Format
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>

            {exportDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl z-50 py-1 overflow-hidden">
                <button
                  onClick={() => {
                    onExport('csv');
                    setExportDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-200 hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  Export CSV (252 Cols)
                </button>
                <button
                  onClick={() => {
                    onExport('excel');
                    setExportDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-200 hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  Export Excel (.xlsx) (252 Cols)
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};

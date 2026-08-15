import React, { useState } from 'react';
import { UploadCloud, Download, Sparkles, RefreshCw, FileSpreadsheet, ChevronDown, Activity } from 'lucide-react';

interface NavbarProps {
  datasets: any[];
  selectedDatasetId: number | null;
  onSelectDataset: (id: number) => void;
  onOpenUpload: () => void;
  onExport: (format: 'csv' | 'excel') => void;
  onRunBatchEnrichment: () => void;
  isEnriching: boolean;
  healthStatus: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  datasets,
  selectedDatasetId,
  onSelectDataset,
  onOpenUpload,
  onExport,
  onRunBatchEnrichment,
  isEnriching,
  healthStatus
}) => {
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [datasetDropdownOpen, setDatasetDropdownOpen] = useState(false);
  
  const selectedDataset = datasets.find(d => d.id === selectedDatasetId);

  return (
    <div className="pt-4 px-6 z-40 sticky top-0">
      <header className="glass-panel rounded-2xl px-5 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-xl blur-md opacity-60 animate-pulse"></div>
              <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 p-[1px] flex items-center justify-center">
                <div className="w-full h-full bg-[#030712] rounded-[11px] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[17px] font-bold bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent tracking-tight">
                  AI Product Enrichment Platform
                </h1>
                <span className="px-2 py-0.5 text-[9px] font-bold tracking-widest text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-full uppercase shadow-inner">
                  B2B
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">CSV & Excel Ingestion · 252-Col Export</p>
            </div>
          </div>

          {/* Action Controls & Health */}
          <div className="flex items-center gap-3">
            
            {/* API Health Status */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/50 border border-slate-800/50 text-xs backdrop-blur-sm mr-2">
              <div className="relative flex h-2 w-2">
                {healthStatus && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${healthStatus ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              </div>
              <span className="text-slate-300 font-medium">{healthStatus ? 'Online' : 'Connecting...'}</span>
            </div>

            {/* Dataset Selector */}
            <div className="relative">
              <button
                onClick={() => setDatasetDropdownOpen(!datasetDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-medium text-sm border border-slate-700/60 transition-all cursor-pointer min-w-[180px] justify-between shadow-sm hover:shadow-md"
              >
                <div className="truncate text-left flex-1 max-w-[140px]">
                  {selectedDataset ? selectedDataset.name : 'No Dataset Selected'}
                </div>
                <ChevronDown className={`w-3.5 h-3.5 opacity-70 shrink-0 transition-transform ${datasetDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {datasetDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl bg-[#0b1120] border border-slate-800 shadow-2xl shadow-black/50 z-50 py-1 max-h-64 overflow-y-auto animate-slide-in">
                  {datasets.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-slate-500 flex items-center justify-center">No datasets uploaded</div>
                  ) : (
                    datasets.map(d => (
                      <button
                        key={d.id}
                        onClick={() => {
                          onSelectDataset(d.id);
                          setDatasetDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-medium flex justify-between items-center transition-colors cursor-pointer ${selectedDatasetId === d.id ? 'bg-indigo-500/10 text-indigo-300' : 'text-slate-300 hover:bg-slate-800/80'}`}
                      >
                        <span className="truncate max-w-[160px]">{d.name}</span>
                        <span className="text-slate-500 shrink-0 text-[10px] bg-slate-900 px-1.5 py-0.5 rounded">{d.total_rows} rows</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Batch Enrich Button */}
            <div className="btn-glow rounded-xl">
              <button
                onClick={onRunBatchEnrichment}
                disabled={isEnriching}
                className="relative flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm transition-all disabled:opacity-50 cursor-pointer border border-white/10"
              >
                {isEnriching ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Activity className="w-4 h-4" />
                )}
                {isEnriching ? 'Enriching...' : 'Run Pipeline'}
              </button>
            </div>

            {/* Upload File Button */}
            <button
              onClick={onOpenUpload}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 font-medium text-sm border border-slate-700/50 transition-all cursor-pointer hover:shadow-lg"
            >
              <UploadCloud className="w-4 h-4 text-indigo-400" />
              Upload
            </button>

            {/* Export Dropdown Menu */}
            <div className="relative">
              <button
                onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 font-medium text-sm border border-emerald-800/50 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Export
                <ChevronDown className={`w-3.5 h-3.5 opacity-70 transition-transform ${exportDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {exportDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl bg-[#0b1120] border border-emerald-900/50 shadow-2xl shadow-emerald-900/20 z-50 py-1 overflow-hidden animate-slide-in">
                  <button
                    onClick={() => {
                      onExport('csv');
                      setExportDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-200 hover:bg-emerald-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    Export CSV (252 Cols)
                  </button>
                  <button
                    onClick={() => {
                      onExport('excel');
                      setExportDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-200 hover:bg-emerald-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    Export Excel (252 Cols)
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </header>
    </div>
  );
};

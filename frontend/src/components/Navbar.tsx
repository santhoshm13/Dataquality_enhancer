import React, { useState, useEffect } from 'react';
import { UploadCloud, Download, RefreshCw, FileSpreadsheet, ChevronDown, Activity, Layers, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NavbarProps {
  activePage: 'intro' | 'working';
  onChangePage: (page: 'intro' | 'working') => void;
  datasets: any[];
  selectedDatasetId: number | null;
  onSelectDataset: (id: number) => void;
  onOpenUpload: () => void;
  onExport: (format: 'csv' | 'excel') => void;
  onRunBatchEnrichment: () => void;
  isEnriching: boolean;
  enrichmentProgress?: {
    status: string;
    total: number;
    processed: number;
    percent: number;
  } | null;
  healthStatus: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePage,
  onChangePage,
  datasets,
  selectedDatasetId,
  onSelectDataset,
  onOpenUpload,
  onExport,
  onRunBatchEnrichment,
  isEnriching,
  enrichmentProgress,
  healthStatus
}) => {
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [datasetDropdownOpen, setDatasetDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const selectedDataset = datasets.find(d => d.id === selectedDatasetId);

  return (
    <header 
      className={`sticky top-0 z-50 transition-all duration-200 border-b ${
        isScrolled 
          ? 'bg-black/95 backdrop-blur-xl border-emerald-500/30 shadow-lg py-3' 
          : 'bg-black/85 backdrop-blur-md border-emerald-500/20 py-3.5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand Logo & Switcher */}
        <div className="flex items-center gap-6 flex-wrap justify-center sm:justify-start">
          <div 
            onClick={() => onChangePage('working')} 
            className="flex items-center gap-3 cursor-pointer group"
          >
            {/* Cognivue Pure Emblem Icon */}
            <div className="w-10 h-10 rounded-xl bg-black/70 border border-emerald-500/40 flex items-center justify-center p-1 group-hover:border-emerald-400/80 transition-all shadow-[0_0_12px_rgba(16,185,129,0.35)] overflow-hidden">
              <img 
                src="/cognivue-icon.png" 
                alt="Cognivue Emblem" 
                className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-extrabold text-white tracking-tight font-heading">Cognivue</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide">
                Product Data Intelligence
              </p>
            </div>
          </div>

          {/* Segmented Page Switcher: Working First, Details Second */}
          <div className="inline-flex p-1 rounded-xl bg-[#0D0D0D] border border-emerald-500/30 text-xs shadow-inner">
            <button
              onClick={() => onChangePage('working')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activePage === 'working'
                  ? 'bg-emerald-500/20 text-emerald-300 shadow-sm font-semibold border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-slate-400" />
              <span>Operations Studio</span>
            </button>

            <button
              onClick={() => onChangePage('intro')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activePage === 'intro'
                  ? 'bg-emerald-500/20 text-emerald-300 shadow-sm font-semibold border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>System Overview & Details</span>
            </button>
          </div>
        </div>

        {/* Right Nav Options */}
        <div className="flex items-center gap-3 flex-wrap justify-center">
          
          {/* API Health Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0D0D0D] border border-emerald-500/30 text-xs font-mono shadow-[0_0_8px_rgba(16,185,129,0.15)]">
            <div className="relative flex h-2 w-2">
              <span className={`relative inline-flex rounded-full h-2 w-2 ${healthStatus ? 'bg-emerald-400' : 'bg-rose-500'}`}></span>
            </div>
            <span className="text-slate-200 font-medium">{healthStatus ? 'API Online' : 'Connecting...'}</span>
          </div>

          {/* Operational Controls (Working Page) */}
          {activePage === 'working' && (
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Dataset Selector */}
              <div className="relative">
                <button
                  onClick={() => setDatasetDropdownOpen(!datasetDropdownOpen)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0D0D0D] hover:bg-[#1A1A1A] text-slate-200 font-mono text-xs border border-emerald-500/30 transition-all cursor-pointer min-w-[150px] justify-between shadow-sm"
                >
                  <div className="truncate text-left flex-1 max-w-[120px] font-semibold text-white">
                    {selectedDataset ? selectedDataset.name : 'Select Dataset'}
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${datasetDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {datasetDropdownOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-64 rounded-xl bg-[#0A0A0A] border border-emerald-500/40 shadow-2xl z-50 py-1.5 max-h-64 overflow-y-auto font-mono backdrop-blur-xl"
                    >
                      {datasets.length === 0 ? (
                        <div className="px-4 py-3 text-xs text-slate-400 flex items-center justify-center">No datasets uploaded</div>
                      ) : (
                        datasets.map(d => (
                          <button
                            key={d.id}
                            onClick={() => {
                              onSelectDataset(d.id);
                              setDatasetDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-xs flex justify-between items-center transition-colors cursor-pointer ${
                              selectedDatasetId === d.id ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-slate-300 hover:bg-white/5'
                            }`}
                          >
                            <span className="truncate max-w-[150px]">{d.name}</span>
                            <span className="text-slate-400 shrink-0 text-[10px] bg-black/80 px-2 py-0.5 rounded border border-emerald-500/20 font-medium">{d.total_rows} rows</span>
                          </button>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Batch Enrich Button */}
              <button
                onClick={onRunBatchEnrichment}
                disabled={isEnriching || datasets.length === 0}
                className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEnriching ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Activity className="w-3.5 h-3.5" />
                )}
                {isEnriching ? (
                  enrichmentProgress ? (
                    <span>Enriching {enrichmentProgress.processed}/{enrichmentProgress.total}</span>
                  ) : (
                    <span>Processing...</span>
                  )
                ) : (
                  'Run Pipeline'
                )}
              </button>

              {/* Upload File Button */}
              <button
                onClick={onOpenUpload}
                className="btn-secondary flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer"
              >
                <UploadCloud className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Upload</span>
              </button>

              {/* Export Dropdown Menu */}
              <div className="relative">
                <button
                  onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                  className="btn-secondary flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-300" />
                  <span className="hidden sm:inline">Export</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${exportDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {exportDropdownOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-52 rounded-xl bg-[#0A0A0A] border border-emerald-500/40 shadow-2xl z-50 py-1.5 overflow-hidden font-mono backdrop-blur-xl"
                    >
                      <button
                        onClick={() => {
                          onExport('csv');
                          setExportDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs text-slate-200 hover:bg-emerald-500/10 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-400" />
                        Export CSV (252 Cols)
                      </button>
                      <button
                        onClick={() => {
                          onExport('excel');
                          setExportDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs text-slate-200 hover:bg-emerald-500/10 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                        Export Excel (252 Cols)
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

        </div>
      </div>
    </header>
  );
};

export default Navbar;

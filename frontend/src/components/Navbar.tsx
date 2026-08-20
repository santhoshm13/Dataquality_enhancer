import React, { useState, useEffect } from 'react';
import { UploadCloud, Download, RefreshCw, FileSpreadsheet, ChevronDown, Activity, Database, Sparkles, Layers, Terminal, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { hoverScale } from '../lib/animations';

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
      className={`sticky top-0 z-50 transition-all duration-300 border-b ${
        isScrolled 
          ? 'bg-slate-950/80 backdrop-blur-2xl border-white/10 shadow-2xl py-3' 
          : 'bg-slate-950/50 backdrop-blur-xl border-white/5 py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand Logo & Switcher */}
        <div className="flex items-center gap-5 sm:gap-6 flex-wrap justify-center sm:justify-start">
          <div 
            onClick={() => onChangePage('intro')} 
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-pink-500 to-cyan-400 p-0.5 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#030712] rounded-[14px] flex items-center justify-center">
                <Database className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-extrabold font-heading tracking-tight leading-tight flex items-center gap-1.5">
                <span className="text-white">Aura</span>
                <span className="text-gradient-aurora">Intelligence</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-widest flex items-center gap-1">
                <span>Product Data Quality</span>
                <Sparkles className="w-3 h-3 text-pink-400 inline" />
              </p>
            </div>
          </div>

          {/* Segmented Page Switcher (Intro vs Working) */}
          <div className="inline-flex p-1 rounded-2xl bg-black/60 border border-white/10 font-mono text-xs shadow-inner">
            <button
              onClick={() => onChangePage('intro')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activePage === 'intro'
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Overview & Intro</span>
            </button>

            <button
              onClick={() => onChangePage('working')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activePage === 'working'
                  ? 'bg-gradient-to-r from-indigo-600 to-pink-600 text-white shadow-md shadow-pink-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Working Studio</span>
            </button>
          </div>
        </div>

        {/* Right Nav Options (Conditional based on active page) */}
        <div className="flex items-center gap-3 flex-wrap justify-center">
          
          {/* API Health Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono">
            <div className="relative flex h-2 w-2">
              {healthStatus && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${healthStatus ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
            </div>
            <span className="text-slate-300 font-bold">{healthStatus ? 'API Online' : 'Connecting...'}</span>
          </div>

          {/* =========================================================================
              IF ON INTRO PAGE: Clean "Open Studio" CTA only
             ========================================================================= */}
          {activePage === 'intro' && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onChangePage('working')}
              className="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white font-mono font-bold text-xs cursor-pointer shadow-lg"
            >
              <span>Launch Working Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>
          )}

          {/* =========================================================================
              IF ON WORKING PAGE ONLY: Operational Controls (Dataset, Run, Upload, Export)
             ========================================================================= */}
          {activePage === 'working' && (
            <motion.div 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 flex-wrap"
            >
              {/* Dataset Selector */}
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setDatasetDropdownOpen(!datasetDropdownOpen)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 font-mono text-xs border border-white/10 transition-all cursor-pointer min-w-[160px] justify-between shadow-md"
                >
                  <div className="truncate text-left flex-1 max-w-[120px] font-bold text-cyan-300">
                    {selectedDataset ? selectedDataset.name : 'Select Dataset'}
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 opacity-70 shrink-0 transition-transform ${datasetDropdownOpen ? 'rotate-180' : ''}`} />
                </motion.button>

                <AnimatePresence>
                  {datasetDropdownOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#0a0e1a] border border-white/15 shadow-2xl z-50 py-1.5 max-h-64 overflow-y-auto font-mono backdrop-blur-xl"
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
                            className={`w-full text-left px-4 py-2.5 text-xs font-semibold flex justify-between items-center transition-colors cursor-pointer ${
                              selectedDatasetId === d.id ? 'bg-indigo-500/20 text-indigo-300 font-bold' : 'text-slate-300 hover:bg-white/5'
                            }`}
                          >
                            <span className="truncate max-w-[150px]">{d.name}</span>
                            <span className="text-cyan-400 shrink-0 text-[10px] bg-black/60 px-2 py-0.5 rounded-md border border-white/10">{d.total_rows} rows</span>
                          </button>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Batch Enrich Button */}
              <motion.button
                whileHover={!isEnriching ? hoverScale.hover : {}}
                whileTap={!isEnriching ? { scale: 0.98 } : {}}
                onClick={onRunBatchEnrichment}
                disabled={isEnriching || datasets.length === 0}
                className="btn-primary relative flex items-center gap-2 px-4 py-2 rounded-xl text-white font-bold text-xs font-mono cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {isEnriching ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
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
              </motion.button>

              {/* Upload File Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onOpenUpload}
                className="btn-secondary flex items-center gap-2 px-3.5 py-2 rounded-xl text-slate-100 font-mono font-bold text-xs cursor-pointer"
              >
                <UploadCloud className="w-4 h-4 text-cyan-400" />
                <span className="hidden sm:inline">Upload</span>
              </motion.button>

              {/* Export Dropdown Menu */}
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                  className="btn-secondary flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-slate-100 font-mono font-bold text-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-pink-400" />
                  <span className="hidden sm:inline">Export</span>
                  <ChevronDown className={`w-3.5 h-3.5 opacity-70 transition-transform ${exportDropdownOpen ? 'rotate-180' : ''}`} />
                </motion.button>

                <AnimatePresence>
                  {exportDropdownOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-52 rounded-2xl bg-[#0a0e1a] border border-white/15 shadow-2xl z-50 py-1.5 overflow-hidden font-mono backdrop-blur-xl"
                    >
                      <button
                        onClick={() => {
                          onExport('csv');
                          setExportDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/5 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-cyan-400" />
                        Export CSV (252 Cols)
                      </button>
                      <button
                        onClick={() => {
                          onExport('excel');
                          setExportDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/5 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                        Export Excel (252 Cols)
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

        </div>
      </div>
    </header>
  );
};

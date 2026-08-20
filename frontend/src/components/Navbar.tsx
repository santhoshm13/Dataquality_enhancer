import React, { useState, useEffect } from 'react';
import { UploadCloud, Download, RefreshCw, FileSpreadsheet, ChevronDown, Activity, Database, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { hoverScale } from '../lib/animations';

interface NavbarProps {
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
  onBackToHome?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  datasets,
  selectedDatasetId,
  onSelectDataset,
  onOpenUpload,
  onExport,
  onRunBatchEnrichment,
  isEnriching,
  enrichmentProgress,
  healthStatus,
  onBackToHome
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
          ? 'bg-slate-900/80 backdrop-blur-xl border-slate-700/50 shadow-sm py-3' 
          : 'bg-slate-900 border-slate-800 py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand Logo & Back */}
        <div className="flex items-center gap-4">
          {onBackToHome && (
            <button 
              onClick={onBackToHome}
              className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Back to Landing Page"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500 p-2 rounded-lg text-white shadow-sm shadow-indigo-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight leading-tight flex items-center gap-1">
                Data<span className="text-indigo-400">Enhancer</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Industrial Data Pipeline</p>
            </div>
          </div>
        </div>

        {/* Action Controls & Health */}
        <div className="flex items-center gap-3">
          
          {/* API Health Status */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs mr-2">
            <div className="relative flex h-2 w-2">
              {healthStatus && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${healthStatus ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
            </div>
            <span className="text-slate-300 font-medium">{healthStatus ? 'API Online' : 'Connecting...'}</span>
          </div>

          {/* Dataset Selector */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setDatasetDropdownOpen(!datasetDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm border border-slate-700 transition-colors cursor-pointer min-w-[180px] justify-between"
            >
              <div className="truncate text-left flex-1 max-w-[140px]">
                {selectedDataset ? selectedDataset.name : 'No Dataset Selected'}
              </div>
              <ChevronDown className={`w-3.5 h-3.5 opacity-70 shrink-0 transition-transform ${datasetDropdownOpen ? 'rotate-180' : ''}`} />
            </motion.button>

            <AnimatePresence>
              {datasetDropdownOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-800 border border-slate-700 shadow-xl z-50 py-1 max-h-64 overflow-y-auto"
                >
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
                        className={`w-full text-left px-4 py-2.5 text-xs font-medium flex justify-between items-center transition-colors cursor-pointer ${selectedDatasetId === d.id ? 'bg-indigo-500/10 text-indigo-300' : 'text-slate-300 hover:bg-slate-700/80'}`}
                      >
                        <span className="truncate max-w-[160px]">{d.name}</span>
                        <span className="text-slate-500 shrink-0 text-[10px] bg-slate-900 px-1.5 py-0.5 rounded">{d.total_rows} rows</span>
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
            className="relative flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:bg-slate-800 disabled:text-slate-500 cursor-pointer border border-transparent disabled:border-slate-700"
          >
            {isEnriching ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Activity className="w-4 h-4" />
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
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-200 hover:text-white font-medium text-sm border border-slate-700 transition-colors cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">Upload</span>
          </motion.button>

          {/* Export Dropdown Menu */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm border border-slate-700 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
              <ChevronDown className={`w-3.5 h-3.5 opacity-70 transition-transform ${exportDropdownOpen ? 'rotate-180' : ''}`} />
            </motion.button>

            <AnimatePresence>
              {exportDropdownOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-48 rounded-xl bg-slate-800 border border-slate-700 shadow-xl z-50 py-1 overflow-hidden"
                >
                  <button
                    onClick={() => {
                      onExport('csv');
                      setExportDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-200 hover:bg-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    Export CSV (252 Cols)
                  </button>
                  <button
                    onClick={() => {
                      onExport('excel');
                      setExportDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-200 hover:bg-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
                    Export Excel (252 Cols)
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </header>
  );
};

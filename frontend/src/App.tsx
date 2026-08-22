import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { TransformationShowcase } from './components/TransformationShowcase';
import { PipelineFlow } from './components/PipelineFlow';
import { StatsOverview } from './components/StatsOverview';
import { ProductTable } from './components/ProductTable';
import { UploadModal } from './components/UploadModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { EvaluationPanel } from './components/EvaluationPanel';
import { ReviewPanel } from './components/ReviewPanel';
import { Chatbot } from './components/Chatbot';
import { AnimatedBackground } from './components/AnimatedBackground';
import { ArrowRight, Terminal, Database, Play, Download, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { scrollZoomBox } from './lib/animations';

import { apiFetch, apiUrl } from './lib/api';

export const App: React.FC = () => {
  const [activePage, setActivePage] = useState<'intro' | 'working'>('intro');

  const [stats, setStats] = useState<{
    total_products: number;
    processed: number;
    high_confidence: number;
    medium_confidence: number;
    needs_review: number;
    total_attributes_extracted?: number;
    lov_pass_rate?: number | null;
  }>({
    total_products: 0,
    processed: 0,
    high_confidence: 0,
    medium_confidence: 0,
    needs_review: 0,
    total_attributes_extracted: 0,
    lov_pass_rate: null
  });

  const [products, setProducts] = useState<any[]>([]);
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [datasets, setDatasets] = useState<any[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);

  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isEnriching, setIsEnriching] = useState<boolean>(false);
  const [enrichmentProgress, setEnrichmentProgress] = useState<{
    status: string;
    total: number;
    processed: number;
    percent: number;
  } | null>(null);

  const [healthStatus, setHealthStatus] = useState<boolean | null>(null); // null = checking
  const [backendUnreachable, setBackendUnreachable] = useState<boolean>(false);
  const [evaluationData, setEvaluationData] = useState<any | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [approvingSuggestion, setApprovingSuggestion] = useState<string | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);

  const checkHealth = async () => {
    try {
      await apiFetch('/health');
      setHealthStatus(true);
      setBackendUnreachable(false);
    } catch {
      setHealthStatus(false);
      setBackendUnreachable(true);
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      // Build query string manually so apiFetch gets a clean relative path
      const qs = selectedDatasetId ? `?dataset_id=${selectedDatasetId}` : '';
      const res = await apiFetch(`/dashboard/stats${qs}`);
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error('Failed to fetch stats', e);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchDatasets = async () => {
    try {
      const res = await apiFetch('/datasets');
      const data = await res.json();
      setDatasets(data);
      if (data.length > 0 && !selectedDatasetId) {
        setSelectedDatasetId(data[data.length - 1].id);
      }
    } catch (e) {
      console.error('Failed to fetch datasets', e);
    }
  };

  const fetchEvaluation = async () => {
    try {
      const res = await apiFetch('/evaluation');
      const data = await res.json();
      setEvaluationData(data);
    } catch (e) {
      console.error('Failed to fetch evaluation', e);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const res = await apiFetch('/suggestions?threshold=2');
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch { /* non-critical */ }
  };

  const approveSuggestion = async (s: any) => {
    const key = `${s.category}::${s.field_name}::${s.suggested_value}`;
    setApprovingSuggestion(key);
    try {
      await apiFetch('/suggestions/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: s.category, field_name: s.field_name, suggested_value: s.suggested_value })
      });
      setSuggestions(prev => prev.filter(x =>
        !(x.category === s.category && x.field_name === s.field_name && x.suggested_value === s.suggested_value)
      ));
    } catch (e) { console.error(e); }
    setApprovingSuggestion(null);
  };

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (selectedDatasetId) params.set('dataset_id', String(selectedDatasetId));
      const res = await apiFetch(`/products?${params.toString()}`);
      const data = await res.json();
      setProducts(data.items || []);
      setTotalProducts(data.total || 0);
    } catch (e) {
      console.error('Failed to fetch products', e);
    }
  };

  useEffect(() => {
    checkHealth();
    fetchDatasets();
    fetchEvaluation();
    fetchSuggestions();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchStats();
    fetchProducts();
  }, [page, statusFilter, searchQuery, selectedDatasetId]);

  const handleSelectProduct = async (id: number) => {
    try {
      const res = await apiFetch(`/products/${id}`);
      const fullProduct = await res.json();
      setSelectedProduct(fullProduct);
    } catch (e) {
      console.error('Failed to fetch product details', e);
    }
  };

  const handleEnrichSingle = async (id: number) => {
    try {
      await apiFetch(`/products/${id}/enrich`, { method: 'POST' });
      fetchProducts();
      fetchStats();
      if (selectedProduct && selectedProduct.id === id) handleSelectProduct(id);
    } catch (e) {
      console.error('Failed to single enrich', e);
    }
  };

  const handleRunBatchEnrichment = async () => {
    setIsEnriching(true);
    try {
      await apiFetch(
        apiUrl('/pipeline/run', { dataset_id: selectedDatasetId }),
        { method: 'POST' }
      );
      pollEnrichmentStatus();
      setActivePage('working');
    } catch (e) {
      console.error('Failed to start batch enrichment', e);
      setIsEnriching(false);
    }
  };

  const pollEnrichmentStatus = () => {
    const interval = setInterval(async () => {
      try {
        const res = await apiFetch('/pipeline/status');
        const data = await res.json();
        // pipeline/status returns: total_rows, processed_rows, status (PENDING/RUNNING/COMPLETED/IDLE)
        const total = data.total_rows || 1;
        const processed = data.processed_rows || 0;
        const percent = Math.round((processed / total) * 100);
        const statusUpper = (data.status || '').toUpperCase();
        const isDone = statusUpper === 'COMPLETED' || statusUpper === 'IDLE' || percent >= 100;

        setEnrichmentProgress({
          status: isDone ? 'Completed' : 'Processing',
          total,
          processed,
          percent: isDone ? 100 : percent
        });

        if (isDone) {
          clearInterval(interval);
          setIsEnriching(false);
          fetchProducts();
          fetchStats();
          fetchEvaluation();
        }
      } catch (e) {
        console.error('Failed polling pipeline status', e);
      }
    }, 2000);
  };

  /**
   * Fetches a file from the API and triggers a native browser download.
   * Works for CSV, Excel, JSON — any binary or text blob.
   */
  const downloadFile = async (
    url: string,
    filename: string,
    mimeType: string
  ) => {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        alert(`Download failed: ${res.status} ${res.statusText}`);
        return;
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(new Blob([blob], { type: mimeType }));
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error('Download error:', err);
      alert('Download failed. Make sure the backend is running.');
    }
  };

  const handleExport = async (format: 'csv' | 'excel') => {
    const isExcel = format === 'excel';
    const ext = isExcel ? 'xlsx' : 'csv';
    const mime = isExcel
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'text/csv;charset=utf-8';
    const date = new Date().toISOString().slice(0, 10);
    await downloadFile(
      apiUrl('/export', { format, dataset_id: selectedDatasetId }),
      `Enriched_Delivery_Format_${date}.${ext}`,
      mime
    );
  };


  const highConfRate = stats.total_products > 0
    ? Math.round((stats.high_confidence / stats.total_products) * 100)
    : 98.5;

  return (
    <div className="min-h-screen text-slate-100 flex flex-col relative selection:bg-indigo-500 selection:text-white bg-transparent overflow-x-hidden">
      
      {/* Dynamic Animated Cybernetic Background */}
      <AnimatedBackground />

      {/* Full Website Ambient Atmospheric Shade Overlay */}
      <div className="website-shade-overlay" />

      {/* Modern Navigation Header with Multi-Page Toggle */}
      <Navbar
        activePage={activePage}
        onChangePage={setActivePage}
        datasets={datasets}
        selectedDatasetId={selectedDatasetId}
        onSelectDataset={setSelectedDatasetId}
        onOpenUpload={() => setIsUploadOpen(true)}
        onExport={handleExport}
        onRunBatchEnrichment={handleRunBatchEnrichment}
        isEnriching={isEnriching}
        enrichmentProgress={enrichmentProgress}
        healthStatus={healthStatus !== false}
      />

      {/* Backend Unreachable Banner */}
      {backendUnreachable && (
        <div className="sticky top-0 z-50 bg-rose-600/95 backdrop-blur-sm text-white text-sm font-mono font-bold px-4 py-3 flex items-center justify-center gap-3 shadow-lg border-b border-rose-400">
          <span className="animate-pulse">⚠</span>
          <span>Backend not reachable — check <code className="bg-rose-800/50 px-1 rounded">VITE_API_URL</code> or ensure the backend server is running.</span>
          <button onClick={checkHealth} className="ml-4 px-3 py-1 rounded-lg bg-rose-800/60 hover:bg-rose-800 text-xs font-bold transition-colors cursor-pointer">Retry</button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        
        <AnimatePresence mode="wait">
          
          {/* =========================================================================
              PAGE 1: INTRO & ARCHITECTURE OVERVIEW
             ========================================================================= */}
          {activePage === 'intro' && (
            <motion.div
              key="intro-page"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              {/* Hero Section */}
              <HeroSection
                onRunBatch={() => {
                  handleRunBatchEnrichment();
                }}
                onOpenUpload={() => {
                  setIsUploadOpen(true);
                }}
                isEnriching={isEnriching}
                totalProducts={stats.total_products}
                highConfidenceRate={highConfRate}
              />

              {/* Interactive Before vs After Transformation Showcase */}
              <TransformationShowcase />

              {/* 5-Stage Concurrent Architecture Flow */}
              <PipelineFlow />

              {/* CTA Box to Enter Working Studio */}
              <motion.div 
                variants={scrollZoomBox}
                className="frame-3d p-8 sm:p-10 rounded-3xl text-center relative overflow-hidden shadow-2xl my-12"
              >
                <div className="max-w-2xl mx-auto space-y-4">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-mono text-xs font-bold">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>OPERATIONAL WORKBENCH</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
                    Ready to enrich & inspect catalog items?
                  </h3>

                  <p className="text-slate-200 text-sm">
                    Switch to the working studio to explore the 252-column schema, review queue, and precision benchmarks.
                  </p>

                  <div className="pt-2 flex items-center justify-center gap-4 flex-wrap">
                    <button
                      onClick={() => setActivePage('working')}
                      className="btn-primary inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl text-white font-bold text-sm shadow-xl cursor-pointer"
                    >
                      <Terminal className="w-4 h-4" />
                      <span>Open Working Studio</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => setIsUploadOpen(true)}
                      className="btn-secondary inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-slate-100 font-bold text-sm cursor-pointer"
                    >
                      <Database className="w-4 h-4 text-cyan-400" />
                      <span>Ingest New Dataset</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* =========================================================================
              PAGE 2: WORKING STUDIO & CATALOG OPERATIONS
             ========================================================================= */}
          {activePage === 'working' && (
            <motion.div
              key="working-page"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="space-y-8"
            >
              {/* Working Studio Header Banner */}
              <div className="frame-3d p-6 sm:p-7 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
                <div>
                  <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                    <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase bg-pink-500/20 text-pink-300 border border-pink-500/40">
                      Live Operations Studio
                    </span>
                    <span className="text-xs font-mono text-cyan-300 bg-cyan-500/15 px-3 py-1 rounded-full border border-cyan-500/30 font-bold">
                      {totalProducts} Items Ingested
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-white font-heading tracking-tight">
                    Catalog Quality & Intelligence Workspace
                  </h2>
                  <p className="text-xs text-slate-300 font-mono mt-0.5">
                    Execute real-time enrichments, inspect 252-column schema attributes, and review flagged items.
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => setActivePage('intro')}
                    className="btn-secondary px-4 py-2 rounded-xl text-xs font-mono text-slate-200 hover:text-white font-bold cursor-pointer"
                  >
                    ← Back to Overview
                  </button>

                  <button
                    onClick={handleRunBatchEnrichment}
                    disabled={isEnriching}
                    className="btn-primary inline-flex items-center gap-2 px-5 py-2 rounded-xl text-white font-bold text-xs font-mono cursor-pointer shadow-lg disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Batch Pipeline</span>
                  </button>
                </div>
              </div>

              {/* Executive KPI Stats Overview */}
              <div>
                <StatsOverview stats={stats} isLoading={statsLoading} />
              </div>

              {/* Ground Truth Precision Benchmark Panel */}
              <div>
                <EvaluationPanel evaluation={evaluationData} onRefresh={fetchEvaluation} />
              </div>

              {/* Dedicated "Needs Human Review" Queue */}
              <div>
                <ReviewPanel
                  datasetId={selectedDatasetId}
                  onReEnrich={handleEnrichSingle}
                />
              </div>

              {/* Active-Learning LOV Suggestion Cards (hidden when empty) */}
              {suggestions.length > 0 && (
                <div className="frame-3d rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-xl bg-violet-500/15 border border-violet-500/30">
                      <Brain className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Active-Learning: Suggested LOV Additions</h3>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Reviewers have corrected these values {suggestions.length > 0 ? `${suggestions[0]?.occurrence_count}+` : ''} times — approve to add to master LOV
                      </p>
                    </div>
                    <button
                      onClick={fetchSuggestions}
                      className="ml-auto text-[11px] text-slate-500 hover:text-slate-300 cursor-pointer transition-colors"
                    >Refresh</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {suggestions.map(s => {
                      const key = `${s.category}::${s.field_name}::${s.suggested_value}`;
                      const isApproving = approvingSuggestion === key;
                      return (
                        <div key={key} className="bg-black/40 border border-violet-500/20 rounded-xl p-4 flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-[10px] text-violet-400 font-mono uppercase tracking-wider">{s.category}</p>
                              <p className="text-slate-300 font-bold text-sm mt-0.5">{s.field_name}</p>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-violet-500/20 text-violet-300 border border-violet-500/30 font-bold whitespace-nowrap">
                              {s.occurrence_count}x
                            </span>
                          </div>
                          <p className="text-indigo-300 font-mono text-sm font-bold bg-indigo-950/40 rounded-lg px-3 py-1.5">
                            &quot;{s.suggested_value}&quot;
                          </p>
                          <button
                            onClick={() => approveSuggestion(s)}
                            disabled={isApproving}
                            className="w-full py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
                          >
                            {isApproving ? 'Approving…' : '✓ Approve & Add to LOV'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Interactive Product Intelligence Explorer */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white font-heading tracking-tight">
                      Product Intelligence Catalog
                    </h3>
                    <p className="text-xs text-slate-300 font-mono mt-0.5">
                      Explore enriched attributes, provenance grounding, and validation audit logs.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const date = new Date().toISOString().slice(0, 10);
                      downloadFile(
                        apiUrl('/export/audit', { format: 'csv', dataset_id: selectedDatasetId }),
                        `Audit_Trail_${date}.csv`,
                        'text/csv;charset=utf-8'
                      );
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold cursor-pointer transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Audit Trail
                  </button>
                </div>

                <ProductTable
                  products={products}
                  total={totalProducts}
                  page={page}
                  limit={limit}
                  statusFilter={statusFilter}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onStatusFilterChange={setStatusFilter}
                  onPageChange={setPage}
                  onSelectProduct={handleSelectProduct}
                  onEnrichSingle={handleEnrichSingle}
                />
              </div>

            </motion.div>
          )}

        </AnimatePresence>

      </main>

      {/* Upload File Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={() => {
          fetchDatasets();
          fetchProducts();
          fetchStats();
          fetchEvaluation();
          setActivePage('working');
        }}
      />

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onRunEnrichment={handleEnrichSingle}
        />
      )}

      {/* Interactive AI Copilot / Chatbot */}
      <Chatbot />

      {/* Footer */}
      <footer className="py-12 text-center text-xs text-slate-500 border-t border-white/10 mt-16 backdrop-blur-xl relative z-10 bg-black/70 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="text-slate-200 font-bold">Autonomous Product Intelligence Platform</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">Unihacks 2026</span>
          </div>
          <p className="font-mono text-[11px] text-slate-400">
            Multi-Format Ingestion (CSV, XLSX, XLS) • 252-Column Enterprise Export
          </p>
        </div>
      </footer>

    </div>
  );
};

export default App;

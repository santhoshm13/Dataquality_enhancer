import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { TransformationShowcase } from './components/TransformationShowcase';
import { PipelineFlow } from './components/PipelineFlow';
import { StatsOverview } from './components/StatsOverview';
import { ProductTable } from './components/ProductTable';
import { UploadModal } from './components/UploadModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { ReviewPanel } from './components/ReviewPanel';
import { Chatbot } from './components/Chatbot';
import { AnimatedBackground } from './components/AnimatedBackground';
import { Play, Download, Brain, UploadCloud, RefreshCw, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch, apiUrl } from './lib/api';

export const App: React.FC = () => {
  // Intro/Landing page with Get Started comes first
  const [activePage, setActivePage] = useState<'working' | 'intro'>('intro');

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
  const [limit] = useState<number>(200);
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

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [approvingSuggestion, setApprovingSuggestion] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const res = await apiFetch(apiUrl('/dashboard/stats', { dataset_id: selectedDatasetId }));
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error("Failed to fetch stats", e);
    }
  };

  const fetchDatasets = async () => {
    try {
      const res = await apiFetch('/datasets');
      const data = await res.json();
      setDatasets(data);
      if (data.length > 0) {
        const latestId = data[data.length - 1].id;
        setSelectedDatasetId(latestId);
        return latestId;  // return so callers can use the new ID immediately
      }
      return null;
    } catch (e) {
      console.error("Failed to fetch datasets", e);
      return null;
    }
  };

  const fetchSuggestions = async () => {
    try {
      const res = await apiFetch(apiUrl('/suggestions', { threshold: 2 }));
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
      const res = await apiFetch(
        apiUrl('/products', {
          page,
          limit,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          search: searchQuery.trim() || undefined,
          dataset_id: selectedDatasetId
        })
      );
      const data = await res.json();
      setProducts(data.items || []);
      setTotalProducts(data.total || 0);
    } catch (e) {
      console.error("Failed to fetch products", e);
    }
  };

  // Startup: load everything immediately
  useEffect(() => {
    fetchDatasets();
    fetchProducts();
    fetchStats();
    fetchSuggestions();
    // Auto-refresh products every 3s on the working page so the table
    // stays live without needing to manually click
    const refreshInterval = setInterval(() => {
      fetchProducts();
      fetchStats();
    }, 3000);
    return () => {
      clearInterval(refreshInterval);
    };
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
      console.error("Failed to fetch product details", e);
    }
  };

  const handleEnrichSingle = async (id: number) => {
    try {
      await apiFetch(`/products/${id}/enrich`, { method: 'POST' });
      fetchProducts();
      fetchStats();
      if (selectedProduct && selectedProduct.id === id) {
        handleSelectProduct(id);
      }
    } catch (e) {
      console.error("Failed to single enrich", e);
    }
  };

  const handleRunBatchEnrichment = async () => {
    if (datasets.length === 0 || totalProducts === 0) {
      setIsUploadOpen(true);
      return;
    }
    setIsEnriching(true);
    try {
      const activeDsId = selectedDatasetId || (datasets.length > 0 ? datasets[datasets.length - 1].id : undefined);
      await apiFetch(
        apiUrl('/pipeline/run', { dataset_id: activeDsId, concurrency: 8 }),
        { method: 'POST' }
      );
      pollEnrichmentStatus();
      setActivePage('working');
    } catch (e) {
      console.error("Failed to start batch enrichment", e);
      setIsEnriching(false);
      setEnrichmentProgress(null);
    }
  };

  const pollEnrichmentStatus = () => {
    const interval = setInterval(async () => {
      try {
        const res = await apiFetch('/pipeline/status');
        const data = await res.json();
        const total = data.total_rows || 0;
        const processed = data.processed_rows || 0;
        const percent = total > 0 ? Math.round((processed / total) * 100) : 100;
        const statusUpper = (data.status || '').toUpperCase();
        const isDone = statusUpper === 'COMPLETED' || statusUpper === 'IDLE' || statusUpper === 'FAILED' || (processed >= total && total > 0) || total === 0;

        if (statusUpper === 'IDLE' || total === 0) {
          clearInterval(interval);
          setIsEnriching(false);
          setEnrichmentProgress(null);
          return;
        }

        setEnrichmentProgress({
          status: isDone ? 'Completed' : 'Processing',
          total,
          processed,
          percent: isDone ? 100 : percent
        });

        // ── Live streaming: refresh the product table on every tick
        // so rows appear one-by-one as they are enriched
        fetchProducts();
        fetchStats();

        if (isDone) {
          clearInterval(interval);
          setIsEnriching(false);
          fetchProducts();
          fetchStats();
        }
      } catch (e) {
        console.error("Failed polling pipeline status", e);
        clearInterval(interval);
        setIsEnriching(false);
        setEnrichmentProgress(null);
      }
    }, 1500);  // 1.5s tick for snappy live updates
  };

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

  const selectedDataset = datasets.find(d => d.id === selectedDatasetId);

  return (
    <div className="min-h-screen text-slate-100 flex flex-col relative selection:bg-emerald-500/20 selection:text-white bg-[#000000] overflow-x-hidden">
      
      {/* Pitch Black Ambient Background */}
      <AnimatedBackground />

      {/* Modern Navigation Header */}
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
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        
        <AnimatePresence mode="wait">
          
          {/* =========================================================================
              PAGE 1: SYSTEM OVERVIEW & ARCHITECTURE
             ========================================================================= */}
          {activePage === 'intro' && (
            <motion.div
              key="intro-page"
              initial={{ opacity: 0, scale: 0.98, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -16 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              {/* Hero Section */}
              <HeroSection
                totalProducts={stats.total_products}
                highConfidenceRate={highConfRate}
                onGetStarted={() => setActivePage('working')}
              />

              {/* Transformation Showcase */}
              <TransformationShowcase />

              {/* Pipeline Architecture Flow */}
              <PipelineFlow />
            </motion.div>
          )}

          {/* =========================================================================
              PAGE 2: OPERATIONS STUDIO & CATALOG WORKSPACE
             ========================================================================= */}
          {activePage === 'working' && (
            <motion.div
              key="working-page"
              initial={{ opacity: 0, scale: 0.98, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -16 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-7"
            >
              {/* Header Title */}
              <div className="text-center max-w-3xl mx-auto pt-2 pb-1">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-400 mb-3 font-mono shadow-[0_0_12px_rgba(16,185,129,0.15)]">
                  <Layers className="w-3.5 h-3.5" />
                  <span>OPERATIONAL WORKSPACE & BATCH ENGINE</span>
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white font-heading tracking-tight">
                  Catalog Quality & Intelligence Hub
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-2xl mx-auto">
                  Upload catalog datasets, run AI manufacturer grounding, and export standardized 252-column delivery files.
                </p>
              </div>

              {/* =========================================================================
                  PROMINENT CENTERED 3-PILLAR COMMAND HUB: UPLOAD -> EXECUTE -> OUTPUT/EXPORT
                 ========================================================================= */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-6xl mx-auto w-full">
                
                {/* 1. UPLOAD DATASET (Extra Large, Centered) */}
                <div className="enterprise-card p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden shadow-xl bg-[#0A0A0A] border border-emerald-500/30 hover:border-emerald-400/60 transition-all group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                  
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        Step 1: Input
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white font-heading mb-1.5">
                      Upload Catalog File
                    </h3>
                    
                    <p className="text-xs text-slate-300 leading-relaxed mb-4">
                      Ingest legacy product sheets in <strong>CSV, XLSX, or XLS</strong> with MPN & description.
                    </p>

                    {/* Dataset Quick Info */}
                    <div className="p-3 rounded-xl bg-black/80 border border-white/10 font-mono text-xs mb-5 space-y-1.5">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Active:</span>
                        <strong className="text-white truncate max-w-[130px]">{selectedDataset ? selectedDataset.name : 'No file selected'}</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span>Loaded:</span>
                        <span className="text-emerald-400 font-semibold">{totalProducts} Rows</span>
                      </div>
                    </div>
                  </div>

                  {/* Big Upload Button */}
                  <button
                    onClick={() => setIsUploadOpen(true)}
                    className="w-full flex items-center justify-center gap-2.5 py-4 px-4 rounded-xl text-sm font-extrabold cursor-pointer text-black bg-white hover:bg-slate-200 active:scale-[0.98] transition-all shadow-md"
                  >
                    <UploadCloud className="w-5 h-5 text-black" />
                    <span>Upload New Dataset</span>
                  </button>
                </div>

                {/* 2. RUN BATCH PIPELINE (Extra Large, Centered) */}
                <div className="enterprise-card p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden shadow-xl bg-[#0A0A0A] border border-emerald-500/30 hover:border-emerald-400/60 transition-all group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                        {isEnriching ? (
                          <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                        ) : (
                          <Play className="w-6 h-6 fill-current" />
                        )}
                      </div>
                      <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        Step 2: Enrich
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white font-heading mb-1.5">
                      Execute Pipeline
                    </h3>
                    
                    <p className="text-xs text-slate-300 leading-relaxed mb-4">
                      Run grounding search, taxonomy classification & 30,000+ LOV checks.
                    </p>

                    {/* Progress / Status Box */}
                    <div className="p-3 rounded-xl bg-black/80 border border-white/10 font-mono text-xs mb-5 min-h-[58px] flex flex-col justify-center">
                      {isEnriching && enrichmentProgress ? (
                        <div className="space-y-2">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              Enriching...
                            </span>
                            <span className="text-white font-bold">{enrichmentProgress.percent}% ({enrichmentProgress.processed}/{enrichmentProgress.total})</span>
                          </div>
                          <div className="w-full h-2 bg-black/90 rounded-full overflow-hidden border border-white/10">
                            <div 
                              className="bg-emerald-500 h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                              style={{ width: `${enrichmentProgress.percent}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-slate-400 text-xs">
                          <span>Status:</span>
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            Ready ({totalProducts} Rows)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Big Execute Button */}
                  <button
                    onClick={handleRunBatchEnrichment}
                    disabled={isEnriching}
                    className="w-full flex items-center justify-center gap-2.5 py-4 px-4 rounded-xl text-sm font-extrabold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-black bg-white hover:bg-slate-200 active:scale-[0.98] transition-all shadow-md"
                  >
                    {isEnriching ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin text-black" />
                        <span>Processing Catalog...</span>
                      </>
                    ) : datasets.length === 0 || totalProducts === 0 ? (
                      <>
                        <UploadCloud className="w-5 h-5 text-black" />
                        <span>Upload Dataset First</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 fill-black text-black" />
                        <span>Run Batch Enrichment</span>
                      </>
                    )}
                  </button>
                </div>

                {/* 3. OUTPUT & EXPORT DELIVERY FILE (Extra Large, Centered) */}
                <div className="enterprise-card p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden shadow-xl bg-[#0A0A0A] border border-emerald-500/30 hover:border-emerald-400/60 transition-all group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                        <Download className="w-6 h-6" />
                      </div>
                      <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        Step 3: Delivery
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white font-heading mb-1.5">
                      Export Delivery Output
                    </h3>
                    
                    <p className="text-xs text-slate-300 leading-relaxed mb-4">
                      Download complete <strong>252-column</strong> standardized delivery schema in 1-click.
                    </p>

                    {/* Output Info */}
                    <div className="p-3 rounded-xl bg-black/80 border border-white/10 font-mono text-xs mb-5 space-y-1.5">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Schema:</span>
                        <span className="text-white font-semibold">252 Headers</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span>High Confidence:</span>
                        <span className="text-emerald-400 font-semibold">{highConfRate}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Big Export Buttons (CSV & Excel in White & Black) */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => handleExport('csv')}
                      disabled={datasets.length === 0}
                      className="flex items-center justify-center gap-2 py-4 px-3 rounded-xl text-xs sm:text-sm font-extrabold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-black bg-white hover:bg-slate-200 active:scale-[0.98] transition-all shadow-md"
                      title="Export standard CSV with all 252 delivery columns"
                    >
                      <Download className="w-4 h-4 text-black shrink-0" />
                      <span>Export CSV</span>
                    </button>

                    <button
                      onClick={() => handleExport('excel')}
                      disabled={datasets.length === 0}
                      className="flex items-center justify-center gap-2 py-4 px-3 rounded-xl text-xs sm:text-sm font-extrabold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-black bg-white hover:bg-slate-200 active:scale-[0.98] transition-all shadow-md"
                      title="Export standard Excel .xlsx with all 252 delivery columns"
                    >
                      <Download className="w-4 h-4 text-black shrink-0" />
                      <span>Export Excel</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Executive KPI Stats Overview */}
              <div>
                <StatsOverview stats={stats} />
              </div>

              {/* Needs Human Review Queue */}
              <div>
                <ReviewPanel
                  datasetId={selectedDatasetId}
                  onReEnrich={handleEnrichSingle}
                />
              </div>

              {/* Active-Learning LOV Suggestions */}
              {suggestions.length > 0 && (
                <div className="enterprise-card rounded-2xl p-5 bg-[#0A0A0A]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-white/5 border border-emerald-500/20">
                      <Brain className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Active-Learning: Suggested LOV Additions</h3>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        High-frequency reviewer corrections eligible for master LOV promotion
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
                        <div key={key} className="bg-black/60 border border-white/10 rounded-xl p-3.5 flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">{s.category}</p>
                              <p className="text-slate-200 font-bold text-xs mt-0.5">{s.field_name}</p>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] bg-white/5 text-slate-300 border border-white/10 font-bold whitespace-nowrap font-mono">
                              {s.occurrence_count}x
                            </span>
                          </div>
                          <p className="text-emerald-400 font-mono text-xs font-bold bg-black/80 rounded-lg px-3 py-1.5 border border-white/5">
                            &quot;{s.suggested_value}&quot;
                          </p>
                          <button
                            onClick={() => approveSuggestion(s)}
                            disabled={isApproving}
                            className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
                          >
                            {isApproving ? 'Approving…' : 'Approve & Add to LOV'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Product Intelligence Explorer */}
              <div>
                <div className="mb-3.5">
                  <h3 className="text-lg font-bold text-white font-heading tracking-tight">
                    Product Intelligence Catalog
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Explore enriched attributes, provenance grounding, and validation audit logs.
                  </p>
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

              {/* =========================================================================
                  BIG CENTERED EXPORT AUDIT TRAIL AT THE BOTTOM OF PAGE
                 ========================================================================= */}
              <div className="flex flex-col items-center justify-center pt-4 pb-4">
                <button
                  onClick={() => {
                    const url = new URL(apiUrl('/export/audit', { format: 'csv', dataset_id: selectedDatasetId }));
                    const date = new Date().toISOString().slice(0, 10);
                    downloadFile(url.toString(), `Audit_Trail_${date}.csv`, 'text/csv;charset=utf-8');
                  }}
                  className="btn-secondary flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-sm font-bold font-mono tracking-wide text-white cursor-pointer shadow-xl transition-all group border border-emerald-500/30 hover:border-emerald-500/60"
                >
                  <Download className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span>Export Audit Trail (CSV)</span>
                </button>
                <p className="text-[11px] font-mono text-slate-400 mt-2.5 text-center">
                  Download timestamped field-level lineage, extraction rationale, and validation logs for {totalProducts} items
                </p>
              </div>

            </motion.div>
          )}

        </AnimatePresence>

      </main>

      {/* Upload File Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={async () => {
          setIsUploadOpen(false);  // auto-close modal
          // fetchDatasets returns the new dataset ID immediately
          const newDatasetId = await fetchDatasets();
          // Fetch products for the NEW dataset right away (no race condition)
          if (newDatasetId) {
            try {
              const res = await apiFetch(
                apiUrl('/products', { page: 1, limit: 200, dataset_id: newDatasetId })
              );
              const data = await res.json();
              setProducts(data.items || []);
              setTotalProducts(data.total || 0);
            } catch (_) { /* fallback to normal fetch */ }
          }
          fetchStats();
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

      {/* Interactive AI Assistant */}
      <Chatbot />

      {/* Formal Footer */}
      <footer className="py-8 text-center text-xs text-slate-500 border-t border-emerald-500/10 mt-12 backdrop-blur-md relative z-10 bg-black">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span className="text-slate-200 font-bold">Cognivue</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">Autonomous Product Intelligence Platform</span>
          </div>
          <p className="font-mono text-[11px] text-slate-400">
            Multi-Format Ingestion (CSV, XLSX, XLS) • 252-Column Standardized Export
          </p>
        </div>
      </footer>

    </div>
  );
};

export default App;

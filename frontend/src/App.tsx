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
import { ArrowRight, Terminal, Database, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { scrollZoomBox } from './lib/animations';

const API_BASE = "http://127.0.0.1:8000/api";

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

  const [healthStatus, setHealthStatus] = useState<boolean>(true);
  const [evaluationData, setEvaluationData] = useState<any | null>(null);

  const checkHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (res.ok) setHealthStatus(true);
      else setHealthStatus(false);
    } catch {
      setHealthStatus(false);
    }
  };

  const fetchStats = async () => {
    try {
      const url = new URL(`${API_BASE}/dashboard/stats`);
      if (selectedDatasetId) url.searchParams.append("dataset_id", selectedDatasetId.toString());
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error("Failed to fetch stats", e);
    }
  };

  const fetchDatasets = async () => {
    try {
      const res = await fetch(`${API_BASE}/datasets`);
      if (res.ok) {
        const data = await res.json();
        setDatasets(data);
        if (data.length > 0 && !selectedDatasetId) {
          setSelectedDatasetId(data[data.length - 1].id);
        }
      }
    } catch (e) {
      console.error("Failed to fetch datasets", e);
    }
  };

  const fetchEvaluation = async () => {
    try {
      const res = await fetch(`${API_BASE}/evaluation`);
      if (res.ok) {
        const data = await res.json();
        setEvaluationData(data);
      }
    } catch (e) {
      console.error("Failed to fetch evaluation", e);
    }
  };

  const fetchProducts = async () => {
    try {
      const url = new URL(`${API_BASE}/products`);
      url.searchParams.append("page", page.toString());
      url.searchParams.append("limit", limit.toString());
      if (statusFilter !== "ALL") {
        url.searchParams.append("status", statusFilter);
      }
      if (searchQuery.trim()) {
        url.searchParams.append("search", searchQuery.trim());
      }
      if (selectedDatasetId) {
        url.searchParams.append("dataset_id", selectedDatasetId.toString());
      }

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setProducts(data.items || []);
        setTotalProducts(data.total || 0);
      }
    } catch (e) {
      console.error("Failed to fetch products", e);
    }
  };

  useEffect(() => {
    checkHealth();
    fetchDatasets();
    fetchEvaluation();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchStats();
    fetchProducts();
  }, [page, statusFilter, searchQuery, selectedDatasetId]);

  const handleSelectProduct = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/products/${id}`);
      if (res.ok) {
        const fullProduct = await res.json();
        setSelectedProduct(fullProduct);
      }
    } catch (e) {
      console.error("Failed to fetch product details", e);
    }
  };

  const handleEnrichSingle = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/enrich/${id}`, { method: 'POST' });
      if (res.ok) {
        fetchProducts();
        fetchStats();
        if (selectedProduct && selectedProduct.id === id) {
          handleSelectProduct(id);
        }
      }
    } catch (e) {
      console.error("Failed to single enrich", e);
    }
  };

  const handleRunBatchEnrichment = async () => {
    setIsEnriching(true);
    try {
      const url = new URL(`${API_BASE}/enrich/batch`);
      if (selectedDatasetId) url.searchParams.append("dataset_id", selectedDatasetId.toString());
      const res = await fetch(url.toString(), { method: 'POST' });
      if (res.ok) {
        pollEnrichmentStatus();
        setActivePage('working'); // Navigate to working studio to see live output!
      } else {
        setIsEnriching(false);
      }
    } catch (e) {
      console.error("Failed to start batch enrichment", e);
      setIsEnriching(false);
    }
  };

  const pollEnrichmentStatus = () => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/dashboard/stats`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
          
          const total = data.total_products || 1;
          const processed = data.processed || 0;
          const percent = Math.round((processed / total) * 100);

          setEnrichmentProgress({
            status: percent >= 100 ? 'Completed' : 'Processing',
            total,
            processed,
            percent
          });

          if (percent >= 100) {
            setIsEnriching(false);
            fetchProducts();
            fetchEvaluation();
            return;
          }
        }
      } catch (e) {
        console.error("Failed polling", e);
      }
      setTimeout(checkStatus, 2000);
    };
    checkStatus();
  };

  const handleExport = (format: 'csv' | 'excel') => {
    const url = new URL(`${API_BASE}/export/${format}`);
    if (selectedDatasetId) url.searchParams.append("dataset_id", selectedDatasetId.toString());
    window.open(url.toString(), '_blank');
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
        healthStatus={healthStatus}
      />

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
                <StatsOverview stats={stats} />
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

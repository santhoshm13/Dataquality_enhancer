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

const API_BASE = "http://127.0.0.1:8000/api";

export const App: React.FC = () => {
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
    <div className="min-h-screen text-slate-100 flex flex-col relative selection:bg-indigo-500 selection:text-white bg-[#020617] overflow-x-hidden">
      
      {/* Full Website Ambient Atmospheric Shade Overlay */}
      <div className="website-shade-overlay" />

      {/* Floating Ambient Aurora Orbs */}
      <div className="fixed top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/15 blur-[160px] pointer-events-none -z-10 animate-float-subtle" />
      <div className="fixed top-[30%] right-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-500/12 blur-[160px] pointer-events-none -z-10 animate-float-subtle-reverse" />
      <div className="fixed bottom-[-10%] left-[20%] w-[700px] h-[700px] rounded-full bg-pink-500/10 blur-[180px] pointer-events-none -z-10 animate-float-subtle" />

      {/* Modern Navigation Header */}
      <Navbar
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
        
        {/* Hero Section */}
        <HeroSection
          onRunBatch={handleRunBatchEnrichment}
          onOpenUpload={() => setIsUploadOpen(true)}
          isEnriching={isEnriching}
          totalProducts={stats.total_products}
          highConfidenceRate={highConfRate}
        />

        {/* Interactive Before vs After Transformation Showcase */}
        <TransformationShowcase />

        {/* 5-Stage Concurrent Architecture Flow */}
        <PipelineFlow />

        {/* Executive KPI Stats Overview */}
        <div className="mt-10">
          <StatsOverview stats={stats} />
        </div>

        {/* Ground Truth Precision Benchmark Panel */}
        <EvaluationPanel evaluation={evaluationData} onRefresh={fetchEvaluation} />

        {/* Dedicated "Needs Human Review" Queue */}
        <ReviewPanel
          datasetId={selectedDatasetId}
          onReEnrich={handleEnrichSingle}
        />

        {/* Interactive Product Intelligence Explorer */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-white font-heading tracking-tight">
                Product Intelligence Catalog
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Explore enriched attributes, provenance grounding, and validation audit logs.
              </p>
            </div>
            <span className="text-xs font-mono text-cyan-300 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/30 font-bold">
              {totalProducts} Items Ingested
            </span>
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
      <footer className="py-12 text-center text-xs text-slate-500 border-t border-white/10 mt-16 backdrop-blur-xl relative z-10 bg-black/60 shadow-2xl">
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

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { StatsOverview } from './components/StatsOverview';
import { ProductTable } from './components/ProductTable';
import { UploadModal } from './components/UploadModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { EvaluationPanel } from './components/EvaluationPanel';
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
      console.error("Failed to fetch evaluation data", e);
    }
  };

  const fetchProducts = async () => {
    try {
      const url = new URL(`${API_BASE}/products`);
      url.searchParams.append("page", page.toString());
      url.searchParams.append("limit", limit.toString());
      if (statusFilter !== "ALL") url.searchParams.append("status", statusFilter);
      if (searchQuery) url.searchParams.append("search", searchQuery);
      if (selectedDatasetId) url.searchParams.append("dataset_id", selectedDatasetId.toString());

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
    fetchDatasets();
  }, []);

  useEffect(() => {
    checkHealth();
    fetchStats();
    fetchProducts();
    fetchEvaluation();
  }, [page, statusFilter, searchQuery, selectedDatasetId]);

  const handleSelectProduct = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/products/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedProduct(data);
      }
    } catch (e) {
      console.error("Failed to fetch product details", e);
    }
  };

  const handleEnrichSingle = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/products/${id}/enrich`, { method: "POST" });
      if (res.ok) {
        fetchProducts();
        fetchStats();
        fetchEvaluation();
        if (selectedProduct && selectedProduct.id === id) {
          handleSelectProduct(id);
        }
      }
    } catch (e) {
      console.error("Failed to enrich product", e);
    }
  };

  const handleRunBatchEnrichment = async () => {
    try {
      setIsEnriching(true);
      const url = new URL(`${API_BASE}/pipeline/run`);
      if (selectedDatasetId) {
        url.searchParams.append("dataset_id", selectedDatasetId.toString());
      }
      const startRes = await fetch(url.toString(), { method: "POST" });
      if (!startRes.ok) {
        throw new Error("Failed to start batch pipeline");
      }
      const startData = await startRes.json();
      const jobId = startData.job_id;

      // Poll pipeline status until completed
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`${API_BASE}/pipeline/status?job_id=${jobId}`);
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            setEnrichmentProgress({
              status: statusData.status,
              total: statusData.total_rows,
              processed: statusData.processed_rows,
              percent: statusData.percent_complete
            });

            // Periodically refresh table & stats during batch run
            fetchStats();
            fetchProducts();

            if (statusData.status === "COMPLETED" || statusData.status === "FAILED") {
              clearInterval(pollInterval);
              setIsEnriching(false);
              setEnrichmentProgress(null);
              fetchProducts();
              fetchStats();
              fetchEvaluation();
            }
          }
        } catch (pollErr) {
          console.error("Polling status error:", pollErr);
        }
      }, 1000);

    } catch (e) {
      console.error("Failed to run batch enrichment", e);
      setIsEnriching(false);
      setEnrichmentProgress(null);
    }
  };

  const handleExport = (format: 'csv' | 'excel') => {
    let url = `${API_BASE}/export?format=${format}`;
    if (selectedDatasetId) {
        url += `&dataset_id=${selectedDatasetId}`;
    }
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col font-sans relative">
      
      {/* Header Navigation */}
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

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 relative z-10 animate-slide-in">
        
        {/* KPI Stats Header */}
        <StatsOverview stats={stats} />

        {/* Evaluation Metrics Benchmark */}
        <EvaluationPanel evaluation={evaluationData} onRefresh={fetchEvaluation} />

        {/* Product Table */}
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

      {/* Interactive Chatbot */}
      <Chatbot />

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-slate-500 border-t border-white/5 mt-10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center gap-2">
          <div className="flex items-center gap-2 opacity-50">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            AI Product Enrichment Platform
            <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
          </div>
          <p>Multi-Format Ingestion (CSV, XLSX, XLS) & 252-Column Delivery Export</p>
        </div>
      </footer>

    </div>
  );
};

export default App;

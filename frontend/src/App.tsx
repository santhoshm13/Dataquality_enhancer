import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { StatsOverview } from './components/StatsOverview';
import { ProductTable } from './components/ProductTable';
import { UploadModal } from './components/UploadModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { EvaluationPanel } from './components/EvaluationPanel';

const API_BASE = "http://127.0.0.1:8000/api";

export const App: React.FC = () => {
  const [stats, setStats] = useState({
    total_products: 0,
    processed: 0,
    high_confidence: 0,
    medium_confidence: 0,
    needs_review: 0,
    lov_accuracy: 96.5,
    brand_accuracy: 98.2,
    manufacturer_accuracy: 97.0
  });

  const [products, setProducts] = useState<any[]>([]);
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isEnriching, setIsEnriching] = useState<boolean>(false);
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
      const res = await fetch(`${API_BASE}/dashboard/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error("Failed to fetch stats", e);
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

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setProducts(data.items);
        setTotalProducts(data.total);
      }
    } catch (e) {
      console.error("Failed to fetch products", e);
    }
  };

  useEffect(() => {
    checkHealth();
    fetchStats();
    fetchProducts();
    fetchEvaluation();
  }, [page, statusFilter, searchQuery]);

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
    if (products.length === 0) return;
    setIsEnriching(true);
    for (const p of products) {
      await handleEnrichSingle(p.id);
    }
    setIsEnriching(false);
  };

  const handleExport = (format: 'csv' | 'excel') => {
    window.open(`${API_BASE}/export?format=${format}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Header Navigation */}
      <Navbar
        onOpenUpload={() => setIsUploadOpen(true)}
        onExport={handleExport}
        onRunBatchEnrichment={handleRunBatchEnrichment}
        isEnriching={isEnriching}
        healthStatus={healthStatus}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        
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

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-600 border-t border-slate-900 mt-10">
        AI Product Enrichment Platform — Multi-Format Ingestion (CSV, XLSX, XLS) & 252-Column Export
      </footer>

    </div>
  );
};

export default App;

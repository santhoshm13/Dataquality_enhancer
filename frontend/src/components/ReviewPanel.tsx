import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, Search, Globe, Cpu, Sparkles, Filter, ShieldAlert, CheckCircle2, Play } from 'lucide-react';

const API_BASE = "http://127.0.0.1:8000/api";

interface ReviewProduct {
  id: number;
  mfg_part_num: string;
  raw_description: string;
  manufacturer?: string;
  brand?: string;
  category?: string;
  review_status?: string;
  review_reason?: string;
  status: string;
  confidence_score: number;
  found?: boolean;
}

interface ReviewPanelProps {
  datasetId: number | null;
  onReEnrich: (id: number) => void;
}

const REVIEW_CATEGORIES = [
  { key: "all", label: "All Items", icon: Filter },
  { key: "url_lookup", label: "URL Search Miss", icon: Search },
  { key: "url_validation", label: "URL Invalid / Trap", icon: Globe },
  { key: "scrape", label: "Scrape Failed", icon: Cpu },
  { key: "spec_extraction", label: "Spec Extraction", icon: Sparkles },
  { key: "exception", label: "Exception", icon: AlertTriangle },
];

export const ReviewPanel: React.FC<ReviewPanelProps> = ({ datasetId, onReEnrich }) => {
  const [products, setProducts] = useState<ReviewProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [activeCategory, setActiveCategory] = useState("all");
  const [loading, setLoading] = useState(false);
  const limit = 10;

  const fetchReviewProducts = async () => {
    setLoading(true);
    try {
      const url = new URL(`${API_BASE}/products`);
      url.searchParams.append("page", page.toString());
      url.searchParams.append("limit", limit.toString());
      url.searchParams.append("review_status", "NEEDS_HUMAN_REVIEW");
      if (datasetId) url.searchParams.append("dataset_id", datasetId.toString());

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        let items = data.items || [];

        // Client-side filter by review category
        if (activeCategory !== "all") {
          items = items.filter((p: ReviewProduct) => {
            const reason = (p.review_reason || "").toLowerCase();
            if (activeCategory === "url_lookup") return reason.includes("url lookup");
            if (activeCategory === "url_validation") return reason.includes("url validation");
            if (activeCategory === "scrape") return reason.includes("scrape");
            if (activeCategory === "spec_extraction") return reason.includes("spec extraction");
            if (activeCategory === "exception") return reason.includes("exception");
            return true;
          });
        }

        setProducts(items);
        setTotal(data.total || 0);
      }
    } catch (e) {
      console.error("Failed to fetch review products", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviewProducts();
  }, [page, datasetId, activeCategory]);

  const totalPages = Math.ceil(total / limit) || 1;

  const getReasonBadge = (reason: string) => {
    const r = reason.toLowerCase();
    if (r.includes("url lookup")) return { label: "URL Search Miss", color: "bg-red-500/10 text-red-400 border-red-500/30" };
    if (r.includes("url validation")) return { label: "URL Trap / 404", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" };
    if (r.includes("scrape")) return { label: "Scrape Failed", color: "bg-purple-500/10 text-purple-400 border-purple-500/30" };
    if (r.includes("spec extraction")) return { label: "Spec Extraction", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" };
    if (r.includes("exception")) return { label: "Pipeline Exception", color: "bg-rose-500/10 text-rose-400 border-rose-500/30" };
    return { label: "Needs Audit", color: "bg-slate-800 text-slate-300 border-slate-700" };
  };

  if (total === 0 && !loading) {
    return (
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-emerald-500/20 text-center mb-10 bg-emerald-950/10">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-3">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-emerald-300 font-bold text-base font-heading">Zero Review Exceptions Pending</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 font-mono">
          All catalog products in this dataset passed automated LOV validation & confidence checks.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel p-6 rounded-2xl border border-rose-500/20 mb-10 shadow-2xl bg-rose-950/[0.04]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-rose-600/20">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white font-heading tracking-tight flex items-center gap-2">
              Needs Human Review Queue
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {total} Items
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Deterministic fallbacks flagged for catalog manager validation.
            </p>
          </div>
        </div>

        <button
          onClick={fetchReviewProducts}
          className="btn-secondary flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono text-slate-300 hover:text-white cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 mb-4 flex-wrap font-mono text-xs">
        {REVIEW_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => { setActiveCategory(cat.key); setPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                isActive
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 font-bold shadow-sm'
                  : 'bg-black/30 border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Structured Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 font-mono text-xs">
          <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading review exceptions...
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-black/40 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/5">
                <tr>
                  <th className="p-3.5 pl-4">Part Number (MPN)</th>
                  <th className="p-3.5">Preserved Manufacturer</th>
                  <th className="p-3.5">Raw Description</th>
                  <th className="p-3.5">Review Reason & Stage</th>
                  <th className="p-3.5 text-center">Confidence</th>
                  <th className="p-3.5 pr-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03] bg-black/20">
                {products.map((p) => {
                  const badge = getReasonBadge(p.review_reason || "");
                  return (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5 pl-4 font-bold text-slate-200">
                        {p.mfg_part_num}
                      </td>
                      <td className="p-3.5 text-slate-300">
                        {p.manufacturer || "—"}
                      </td>
                      <td className="p-3.5 text-slate-400 max-w-xs truncate" title={p.raw_description}>
                        {p.raw_description}
                      </td>
                      <td className="p-3.5">
                        <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${badge.color}`}>
                          {badge.label}
                        </span>
                        <div className="text-[11px] text-slate-500 mt-1 truncate max-w-xs" title={p.review_reason}>
                          {p.review_reason || "Automated check mismatch"}
                        </div>
                      </td>
                      <td className="p-3.5 text-center font-bold text-rose-400">
                        {Math.round((p.confidence_score || 0) * 100)}%
                      </td>
                      <td className="p-3.5 pr-4 text-right">
                        <button
                          onClick={() => onReEnrich(p.id)}
                          className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white font-bold text-xs cursor-pointer shadow-md"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Re-enrich</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-xs font-mono text-slate-400">
              <span>Showing {products.length} of {total} review items</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 cursor-pointer"
                >
                  Prev
                </button>
                <span className="px-2 font-bold text-slate-300">Page {page} / {totalPages}</span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
};

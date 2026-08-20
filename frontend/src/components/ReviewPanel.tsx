import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, Search, Globe, Cpu, Sparkles, Filter, ShieldAlert, CheckCircle2, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { scrollZoomSection, scrollZoomBox, hoverScale } from '../lib/animations';

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
    if (r.includes("url lookup")) return { label: "URL Search Miss", color: "bg-red-500/20 text-red-300 border-red-500/40" };
    if (r.includes("url validation")) return { label: "URL Trap / 404", color: "bg-amber-500/20 text-amber-300 border-amber-500/40" };
    if (r.includes("scrape")) return { label: "Scrape Failed", color: "bg-purple-500/20 text-purple-300 border-purple-500/40" };
    if (r.includes("spec extraction")) return { label: "Spec Extraction", color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" };
    if (r.includes("exception")) return { label: "Pipeline Exception", color: "bg-rose-500/20 text-rose-300 border-rose-500/40" };
    return { label: "Needs Audit", color: "bg-slate-800 text-slate-300 border-slate-700" };
  };

  if (total === 0 && !loading) {
    return (
      <motion.div 
        variants={scrollZoomSection}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.2 }}
        className="frame-3d p-6 sm:p-8 rounded-3xl border-l-4 border-emerald-500 text-center mb-12 bg-emerald-950/10 shadow-2xl"
      >
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-3 shadow-lg shadow-emerald-500/20">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h3 className="text-emerald-300 font-extrabold text-lg font-heading">Zero Review Exceptions Pending</h3>
        <p className="text-xs text-slate-300 max-w-md mx-auto mt-1 font-mono">
          All catalog products in this dataset passed automated LOV validation & confidence checks.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      variants={scrollZoomSection}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount: 0.2 }}
      className="frame-3d p-6 sm:p-8 rounded-3xl border-l-4 border-rose-500 mb-14 shadow-2xl bg-rose-950/[0.06]"
    >
      
      {/* Header with Colourful Text */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 via-pink-600 to-amber-500 flex items-center justify-center text-white shadow-xl shadow-rose-600/30 border border-white/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-white font-heading tracking-tight flex items-center gap-2.5">
              <span className="text-gradient-amber-rose">Needs Human Review Queue</span>
              <span className="px-3 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                {total} Items
              </span>
            </h3>
            <p className="text-xs text-slate-300 font-mono mt-0.5">
              Deterministic fallbacks flagged for catalog manager validation.
            </p>
          </div>
        </div>

        <button
          onClick={fetchReviewProducts}
          className="btn-secondary flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-mono text-slate-200 hover:text-white cursor-pointer self-start sm:self-auto shadow-md"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-pink-400' : 'text-slate-400'}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 mb-5 flex-wrap font-mono text-xs">
        {REVIEW_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => { setActiveCategory(cat.key); setPage(1); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-rose-600 to-pink-600 border-rose-500/50 text-white font-bold shadow-lg shadow-rose-600/40 scale-105'
                  : 'bg-black/50 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Structured Table with 3D Beveled Box */}
      {loading ? (
        <div className="text-center py-14 text-slate-400 font-mono text-xs">
          <div className="w-8 h-8 border-2 border-pink-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading review exceptions...
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-white/10 shadow-inner bg-black/40">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-black/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                <tr>
                  <th className="p-4 pl-5">Part Number (MPN)</th>
                  <th className="p-4">Preserved Manufacturer</th>
                  <th className="p-4">Raw Description</th>
                  <th className="p-4">Review Reason & Stage</th>
                  <th className="p-4 text-center">Confidence</th>
                  <th className="p-4 pr-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] bg-black/20">
                {products.map((p) => {
                  const badge = getReasonBadge(p.review_reason || "");
                  return (
                    <motion.tr 
                      variants={scrollZoomBox}
                      whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.04)", scale: 1.005 }}
                      key={p.id} 
                      className="transition-all"
                    >
                      <td className="p-4 pl-5 font-extrabold text-white">
                        <span className="px-2.5 py-1 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30 inline-block font-mono shadow-sm">
                          {p.mfg_part_num}
                        </span>
                      </td>
                      <td className="p-4 text-slate-200 font-medium">
                        {p.manufacturer || "—"}
                      </td>
                      <td className="p-4 text-slate-300 max-w-xs truncate font-sans text-xs" title={p.raw_description}>
                        {p.raw_description}
                      </td>
                      <td className="p-4">
                        <span className={`inline-block px-3 py-1 rounded-xl text-[10px] font-bold border ${badge.color} shadow-sm`}>
                          {badge.label}
                        </span>
                        <div className="text-[11px] text-slate-400 mt-1 truncate max-w-xs" title={p.review_reason}>
                          {p.review_reason || "Automated check mismatch"}
                        </div>
                      </td>
                      <td className="p-4 text-center font-black text-rose-400 text-sm">
                        {Math.round((p.confidence_score || 0) * 100)}%
                      </td>
                      <td className="p-4 pr-5 text-right">
                        <motion.button
                          whileHover={hoverScale.hover}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onReEnrich(p.id)}
                          className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-bold text-xs cursor-pointer shadow-lg"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Re-enrich</span>
                        </motion.button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-5 text-xs font-mono text-slate-300">
              <span>Showing <strong className="text-pink-300">{products.length}</strong> of <strong className="text-white">{total}</strong> items</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-30 cursor-pointer"
                >
                  Prev
                </button>
                <span className="px-3 py-1 font-bold text-slate-200 bg-white/5 rounded-xl border border-white/10">Page {page} / {totalPages}</span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-30 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

    </motion.div>
  );
};

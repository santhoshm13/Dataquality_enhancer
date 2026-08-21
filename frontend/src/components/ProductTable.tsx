import React from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, Eye, Play, ExternalLink, AlertCircle, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { scrollZoomSection, scrollZoomBox } from '../lib/animations';

interface Product {
  id: number;
  mfg_part_num: string;
  raw_description: string;
  brand?: string;
  manufacturer?: string;
  category?: string;
  confidence_score: number;
  status: string;
  source_url?: string;
  source_type?: string;
  grounding_sources?: string[];
  found?: boolean;
}

interface ProductTableProps {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  statusFilter: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onStatusFilterChange: (s: string) => void;
  onPageChange: (p: number) => void;
  onSelectProduct: (id: number) => void;
  onEnrichSingle: (id: number) => void;
}

export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  total,
  page,
  limit,
  statusFilter,
  searchQuery,
  onSearchChange,
  onStatusFilterChange,
  onPageChange,
  onSelectProduct,
  onEnrichSingle
}) => {
  const totalPages = Math.ceil(total / limit) || 1;

  const getStatusBadge = (status: string, conf: number) => {
    const s = status ? status.toUpperCase() : 'RAW';
    const confPct = Math.round(conf * 100);
    switch (s) {
      case 'PROCESSED':
      case 'ENRICHED':
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            HIGH {confPct}%
          </span>
        );
      case 'MEDIUM_CONFIDENCE':
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            MED {confPct}%
          </span>
        );
      case 'NEEDS_REVIEW':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            REVIEW {confPct}%
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            RAW INGEST
          </span>
        );
    }
  };

  const formatHostname = (urlStr: string) => {
    try {
      const u = new URL(urlStr.startsWith('http') ? urlStr : `https://${urlStr}`);
      return u.hostname.replace(/^www\./, '');
    } catch {
      return urlStr.length > 25 ? urlStr.substring(0, 22) + '...' : urlStr;
    }
  };

  return (
    <motion.div 
      variants={scrollZoomSection}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount: 0.15 }}
      className="frame-3d rounded-3xl overflow-hidden shadow-2xl mb-14"
    >
      
      {/* Search & Filter Header with 3D Bevel Line */}
      <div className="p-5 sm:p-6 border-b border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-black/40">
        
        {/* Search Input with Gradient Focus */}
        <div className="relative w-full sm:w-96 group">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-300 transition-colors" />
          <input
            type="text"
            placeholder="Search MPN, description, manufacturer..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-black/70 border border-white/15 rounded-2xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-mono shadow-inner"
          />
        </div>

        {/* Filter & Total Counter */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2 text-xs text-slate-200 font-mono">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-bold">Filter Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="bg-black/80 border border-white/15 text-white text-xs font-bold rounded-xl px-3.5 py-2 focus:outline-none focus:border-indigo-400 cursor-pointer transition-colors shadow-inner"
            >
              <option value="ALL">All Statuses</option>
              <option value="RAW">Raw Ingest</option>
              <option value="HIGH">High Confidence</option>
              <option value="MEDIUM">Medium Confidence</option>
              <option value="NEEDS_REVIEW">Needs Review</option>
            </select>
          </div>
        </div>

      </div>

      {/* Product Table */}
      <div className="overflow-x-auto min-h-[360px]">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="bg-black/70 text-slate-200 font-extrabold uppercase tracking-wider text-[10px] border-b border-white/10">
              <th className="p-4 pl-6">Part Number (MPN)</th>
              <th className="p-4">Raw Description</th>
              <th className="p-4">Canonical Brand</th>
              <th className="p-4">Manufacturer</th>
              <th className="p-4">Taxonomy Category</th>
              <th className="p-4">Source Provenance</th>
              <th className="p-4 text-center">Confidence</th>
              <th className="p-4 pr-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06] bg-black/40">
            {products.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-16 text-center">
                  <div className="inline-flex flex-col items-center justify-center text-slate-400 font-sans">
                    <Search className="w-10 h-10 mb-3 opacity-40 text-cyan-400" />
                    <p className="text-sm font-bold text-slate-200">No catalog products match</p>
                    <p className="text-xs text-slate-400 mt-1 font-mono">Upload a dataset or clear filters to view items.</p>
                  </div>
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <motion.tr 
                  variants={scrollZoomBox}
                  whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.06)", scale: 1.003 }}
                  key={p.id} 
                  className="transition-all group"
                >
                  <td className="p-4 pl-6 text-white font-extrabold text-xs">
                    <span className="px-2.5 py-1 rounded-xl bg-indigo-500/20 text-indigo-200 border border-indigo-500/40 inline-block font-mono shadow-sm font-bold">
                      {p.mfg_part_num}
                    </span>
                  </td>
                  <td className="p-4 text-slate-100 max-w-xs truncate font-sans text-xs font-medium" title={p.raw_description}>
                    {p.raw_description}
                  </td>
                  <td className="p-4 font-bold text-white">
                    {p.brand ? (
                      <span className="text-cyan-300 font-bold drop-shadow-sm">{p.brand}</span>
                    ) : '—'}
                  </td>
                  <td className="p-4 text-slate-200 font-medium">{p.manufacturer || '—'}</td>
                  <td className="p-4 text-cyan-200 font-semibold text-[11px] max-w-[170px] truncate">{p.category || '—'}</td>
                  
                  {/* Source Provenance Column */}
                  <td className="p-4 max-w-[200px]">
                    {p.source_url ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          p.source_type === 'fallback' 
                            ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40' 
                            : 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                        }`}>
                          {p.source_type === 'fallback' ? 'distributor' : 'manufacturer'}
                        </span>
                        <a
                          href={p.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-slate-200 hover:text-white transition-colors text-[11px] font-mono truncate max-w-[120px] font-medium"
                          title={`Verified Grounding: ${p.source_url}`}
                        >
                          <span className="truncate">{formatHostname(p.source_url)}</span>
                          <ExternalLink className="w-3 h-3 shrink-0 text-cyan-400 opacity-90" />
                        </a>
                      </div>
                    ) : p.found === false ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] text-amber-300 bg-amber-500/20 border border-amber-500/30 font-mono font-semibold">
                        <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                        No URL found
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px] font-mono italic">Pending enrichment</span>
                    )}
                  </td>

                  <td className="p-4 text-center">{getStatusBadge(p.status, p.confidence_score)}</td>
                  <td className="p-4 pr-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                      <motion.button
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onEnrichSingle(p.id)}
                        className="p-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-200 border border-indigo-500/40 transition-all cursor-pointer shadow-md"
                        title="Run AI Enrichment"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onSelectProduct(p.id)}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer shadow-md"
                        title="Inspect Full 252-Column Record"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          const base = (window as any).__API_BASE__ || 'http://localhost:8000/api';
                          window.open(`${base}/export/audit/${p.id}`, '_blank');
                        }}
                        className="p-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-all cursor-pointer shadow-md"
                        title="Export Audit Trail JSON"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 sm:p-5 border-t border-white/10 bg-black/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-200 font-mono">
        <div>
          Showing <span className="text-cyan-300 font-bold">{products.length > 0 ? (page - 1) * limit + 1 : 0}</span> to <span className="text-cyan-300 font-bold">{Math.min(page * limit, total)}</span> of <span className="text-white font-bold">{total}</span> items
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 disabled:opacity-30 transition-colors cursor-pointer text-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3.5 py-1.5 text-white font-bold bg-white/10 border border-white/15 rounded-xl shadow-inner">
            Page {page} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 disabled:opacity-30 transition-colors cursor-pointer text-white"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </motion.div>
  );
};

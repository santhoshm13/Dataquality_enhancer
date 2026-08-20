import React from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, Eye, Play, ExternalLink, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { staggerContainer, slideUpFade } from '../lib/animations';

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
    switch (s) {
      case 'PROCESSED':
      case 'ENRICHED':
        return (
          <span className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            ENRICHED ({Math.round(conf * 100)}%)
          </span>
        );
      case 'MEDIUM_CONFIDENCE':
        return (
          <span className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide bg-amber-500/10 text-amber-400 border border-amber-500/20">
            MEDIUM CONF ({Math.round(conf * 100)}%)
          </span>
        );
      case 'NEEDS_REVIEW':
        return (
          <span className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide bg-rose-500/10 text-rose-400 border border-rose-500/20">
            REVIEW ({Math.round(conf * 100)}%)
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide bg-slate-800 text-slate-400 border border-slate-700">
            RAW IMPORT
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
      variants={slideUpFade}
      initial="hidden"
      animate="show"
      className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg"
    >
      
      {/* Search & Filter Header */}
      <div className="p-5 border-b border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-800/50">
        
        {/* Search Input */}
        <div className="relative w-full sm:w-96 group">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
            <input
              type="text"
              placeholder="Search part number or description..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* Filter & Page Indicator */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2.5 text-xs text-slate-400 font-medium">
            <Filter className="w-4 h-4" />
            <span>Filter:</span>
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer transition-colors hover:border-slate-600"
            >
              <option value="ALL">All Statuses</option>
              <option value="RAW">Raw Import</option>
              <option value="PROCESSED">Enriched</option>
              <option value="NEEDS_REVIEW">Needs Review</option>
            </select>
          </div>
        </div>

      </div>

      {/* Product Table */}
      <div className="overflow-x-auto min-h-[300px]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-900/40 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-700">
              <th className="p-4 pl-6">Part Number</th>
              <th className="p-4">Raw Description</th>
              <th className="p-4">Matched Brand</th>
              <th className="p-4">Matched Manufacturer</th>
              <th className="p-4">Category</th>
              <th className="p-4">Source Provenance</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 pr-6 text-right">Actions</th>
            </tr>
          </thead>
          <motion.tbody 
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="divide-y divide-slate-700/50"
          >
            {products.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-12 text-center">
                  <div className="inline-flex flex-col items-center justify-center text-slate-500">
                    <Search className="w-8 h-8 mb-3 opacity-30" />
                    <p className="text-sm font-medium text-slate-400">No products found</p>
                    <p className="text-xs mt-1">Upload a dataset or adjust filters to view items.</p>
                  </div>
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <motion.tr 
                  variants={slideUpFade}
                  key={p.id} 
                  className="hover:bg-slate-700/30 transition-colors group"
                >
                  <td className="p-4 pl-6 font-mono text-slate-300 font-medium text-[11px]">{p.mfg_part_num}</td>
                  <td className="p-4 text-slate-300 max-w-xs truncate" title={p.raw_description}>
                    {p.raw_description}
                  </td>
                  <td className="p-4 text-slate-400 font-medium">{p.brand || '—'}</td>
                  <td className="p-4 text-slate-400 font-medium">{p.manufacturer || '—'}</td>
                  <td className="p-4 text-slate-400 text-[11px]">{p.category || '—'}</td>
                  
                  {/* Source Provenance Column */}
                  <td className="p-4 max-w-[200px]">
                    {p.source_url ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          p.source_type === 'fallback' 
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}>
                          {p.source_type === 'fallback' ? 'fallback' : 'manufacturer'}
                        </span>
                        <a
                          href={p.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-slate-400 hover:text-white transition-colors text-[11px] font-medium truncate max-w-[120px]"
                          title={`Source: ${p.source_url}`}
                        >
                          <span className="truncate">{formatHostname(p.source_url)}</span>
                          <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                        </a>
                      </div>
                    ) : p.found === false ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 font-medium">
                        <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                        No source
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[10px] italic">Not enriched</span>
                    )}
                  </td>

                  <td className="p-4 text-center">{getStatusBadge(p.status, p.confidence_score)}</td>
                  <td className="p-4 pr-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onEnrichSingle(p.id)}
                        className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 transition-colors cursor-pointer"
                        title="Run AI Enrichment Pipeline"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onSelectProduct(p.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                        title="View Detailed Inspection"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </motion.tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-slate-700 bg-slate-800/50 flex items-center justify-between text-xs text-slate-400 font-medium">
        <div>
          Showing <span className="text-white">{products.length > 0 ? (page - 1) * limit + 1 : 0}</span> to <span className="text-white">{Math.min(page * limit, total)}</span> of <span className="text-white">{total}</span> items
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 border border-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 text-slate-300 font-semibold bg-slate-700/50 py-1 rounded-md">Page {page} of {totalPages}</span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 border border-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </motion.div>
  );
};

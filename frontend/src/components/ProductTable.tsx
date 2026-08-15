import React from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, Eye, Play } from 'lucide-react';

interface Product {
  id: number;
  mfg_part_num: string;
  raw_description: string;
  brand?: string;
  manufacturer?: string;
  category?: string;
  confidence_score: number;
  status: string;
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
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(52,211,153,0.1)]">
            ENRICHED ({Math.round(conf * 100)}%)
          </span>
        );
      case 'MEDIUM_CONFIDENCE':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.1)]">
            MEDIUM CONF ({Math.round(conf * 100)}%)
          </span>
        );
      case 'NEEDS_REVIEW':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_10px_rgba(251,191,36,0.1)]">
            REVIEW ({Math.round(conf * 100)}%)
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide bg-slate-800 text-slate-400 border border-slate-700">
            RAW IMPORT
          </span>
        );
    }
  };

  return (
    <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
      
      {/* Search & Filter Header */}
      <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/30">
        
        {/* Search Input */}
        <div className="relative w-full sm:w-96 group">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
            <input
              type="text"
              placeholder="Search part number or description..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#030712]/80 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all backdrop-blur-md"
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
              className="bg-[#030712]/80 border border-white/10 text-slate-200 text-xs font-semibold rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer backdrop-blur-md"
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
            <tr className="bg-slate-900/50 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/5 backdrop-blur-sm">
              <th className="p-4 pl-6">Part Number</th>
              <th className="p-4">Raw Description</th>
              <th className="p-4">Matched Brand</th>
              <th className="p-4">Matched Manufacturer</th>
              <th className="p-4">Category</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 pr-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {products.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center">
                  <div className="inline-flex flex-col items-center justify-center text-slate-500">
                    <Search className="w-8 h-8 mb-3 opacity-50" />
                    <p className="text-sm font-medium text-slate-400">No products found</p>
                    <p className="text-xs mt-1">Upload a dataset or adjust filters to view items.</p>
                  </div>
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="hover:bg-indigo-500/5 transition-colors group">
                  <td className="p-4 pl-6 font-mono text-indigo-300 font-semibold text-[11px]">{p.mfg_part_num}</td>
                  <td className="p-4 text-slate-200 max-w-xs truncate" title={p.raw_description}>
                    {p.raw_description}
                  </td>
                  <td className="p-4 text-slate-300 font-medium">{p.brand || '—'}</td>
                  <td className="p-4 text-slate-300 font-medium">{p.manufacturer || '—'}</td>
                  <td className="p-4 text-slate-400 text-[11px]">{p.category || '—'}</td>
                  <td className="p-4 text-center">{getStatusBadge(p.status, p.confidence_score)}</td>
                  <td className="p-4 pr-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEnrichSingle(p.id)}
                        className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 transition-all cursor-pointer hover:scale-110"
                        title="Run AI Enrichment Pipeline"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onSelectProduct(p.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer hover:scale-110"
                        title="View Detailed Inspection"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-white/5 bg-slate-900/30 flex items-center justify-between text-xs text-slate-400 font-medium">
        <div>
          Showing <span className="text-white">{products.length > 0 ? (page - 1) * limit + 1 : 0}</span> to <span className="text-white">{Math.min(page * limit, total)}</span> of <span className="text-white">{total}</span> items
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="p-1.5 rounded-lg bg-[#030712] hover:bg-slate-800 border border-white/10 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 text-slate-300 font-semibold bg-slate-800/50 py-1 rounded-md">Page {page} of {totalPages}</span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg bg-[#030712] hover:bg-slate-800 border border-white/10 disabled:opacity-40 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};

import React from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, Eye, Play, ExternalLink, Download } from 'lucide-react';
import { apiUrl } from '../lib/api';

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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            HIGH {confPct}%
          </span>
        );
      case 'MEDIUM_CONFIDENCE':
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-white/5 text-slate-300 border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            MED {confPct}%
          </span>
        );
      case 'NEEDS_REVIEW':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-white/5 text-slate-400 border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
            REVIEW {confPct}%
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-white/5 text-slate-500 border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
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
    <div className="enterprise-card rounded-2xl overflow-hidden mb-12 border border-white/10">
      
      {/* Search & Filter Header */}
      <div className="p-4 sm:p-5 border-b border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3.5 bg-black/40">
        
        {/* Search Input */}
        <div className="relative w-full sm:w-80 group">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-white transition-colors" />
          <input
            type="text"
            placeholder="Search MPN, description, manufacturer..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-black/60 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-white/30 transition-all font-mono"
          />
        </div>

        {/* Filter & Counter */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2 text-xs text-slate-300 font-mono">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium">Filter Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="bg-[#0A0A0A] border border-white/10 text-white text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:border-white/30 cursor-pointer transition-colors"
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
      <div className="overflow-x-auto min-h-[340px]">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="bg-black/80 text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-white/10">
              <th className="p-3.5 pl-5">Part Number (MPN)</th>
              <th className="p-3.5">Raw Description</th>
              <th className="p-3.5">Canonical Brand</th>
              <th className="p-3.5">Manufacturer</th>
              <th className="p-3.5">Taxonomy Category</th>
              <th className="p-3.5">Source Provenance</th>
              <th className="p-3.5 text-center">Confidence</th>
              <th className="p-3.5 pr-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {products.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-16 text-center">
                  <div className="inline-flex flex-col items-center justify-center text-slate-400 font-sans">
                    <Search className="w-8 h-8 mb-2 opacity-40 text-slate-400" />
                    <p className="text-sm font-semibold text-slate-200">No catalog products match</p>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">Upload a dataset or adjust search filters.</p>
                  </div>
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr 
                  key={p.id} 
                  className="hover:bg-white/[0.02] transition-colors group"
                >
                  <td className="p-3.5 pl-5 text-white font-bold text-xs">
                    <span className="px-2 py-0.5 rounded bg-white/5 text-white border border-white/10 inline-block font-mono font-semibold">
                      {p.mfg_part_num}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-200 max-w-xs truncate font-sans text-xs font-normal" title={p.raw_description}>
                    {p.raw_description}
                  </td>
                  <td className="p-3.5 font-semibold text-white">
                    {p.brand ? (
                      <span className="text-slate-100">{p.brand}</span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="p-3.5 text-slate-300">{p.manufacturer || '—'}</td>
                  <td className="p-3.5 text-slate-300 text-[11px] max-w-[160px] truncate">{p.category || '—'}</td>
                  
                  {/* Source Provenance Column */}
                  <td className="p-3.5 max-w-[190px]">
                    {p.source_url ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-white/5 text-slate-300 border border-white/10">
                          {p.source_type === 'fallback' ? 'distributor' : 'mfg'}
                        </span>
                        <a
                          href={p.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-slate-300 hover:text-white transition-colors text-[11px] font-mono truncate max-w-[110px]"
                          title={`Verified Grounding: ${p.source_url}`}
                        >
                          <span className="truncate">{formatHostname(p.source_url)}</span>
                          <ExternalLink className="w-3 h-3 shrink-0 text-slate-400 opacity-80" />
                        </a>
                      </div>
                    ) : p.found === false ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-slate-400 bg-white/5 border border-white/10 font-mono font-medium">
                        No URL
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[10px] font-mono italic">Pending enrichment</span>
                    )}
                  </td>

                  <td className="p-3.5 text-center">{getStatusBadge(p.status, p.confidence_score)}</td>
                  <td className="p-3.5 pr-5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onEnrichSingle(p.id)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer"
                        title="Run AI Enrichment"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <button
                        onClick={() => onSelectProduct(p.id)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer"
                        title="Inspect Full 252-Column Record"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          window.open(apiUrl(`/export/audit/${p.id}`, { format: 'json' }), '_blank');
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer"
                        title="Export Audit Trail JSON"
                      >
                        <Download className="w-3.5 h-3.5" />
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
      <div className="p-4 border-t border-white/10 bg-black/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-300 font-mono">
        <div>
          Showing <span className="text-emerald-400 font-semibold">{products.length > 0 ? (page - 1) * limit + 1 : 0}</span> to <span className="text-emerald-400 font-semibold">{Math.min(page * limit, total)}</span> of <span className="text-white font-semibold">{total}</span> items
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-30 transition-colors cursor-pointer text-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 py-1 text-white font-semibold bg-white/5 border border-white/10 rounded-lg">
            Page {page} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-30 transition-colors cursor-pointer text-white"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};

export default ProductTable;

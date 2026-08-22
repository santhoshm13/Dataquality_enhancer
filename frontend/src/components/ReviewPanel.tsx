import React, { useState, useEffect } from 'react';
import { RefreshCw, Play, Edit3, X } from 'lucide-react';

import { apiFetch } from '../lib/api';

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
  { key: "all", label: "All Items" },
  { key: "url_lookup", label: "URL Search Miss" },
  { key: "url_validation", label: "URL Trap / 404" },
  { key: "scrape", label: "Scrape Failed" },
  { key: "spec_extraction", label: "Spec Extraction" },
  { key: "exception", label: "Exception" },
];

export const ReviewPanel: React.FC<ReviewPanelProps> = ({ datasetId, onReEnrich }) => {
  const [products, setProducts] = useState<ReviewProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [activeCategory, setActiveCategory] = useState("all");
  const [loading, setLoading] = useState(false);
  const [correcting, setCorrecting] = useState<number | null>(null);
  const [correctionField, setCorrectionField] = useState('brand');
  const [correctionValue, setCorrectionValue] = useState('');
  const [correctionSaved, setCorrectionSaved] = useState<Set<number>>(new Set());
  const limit = 10;

  const submitCorrection = async (productId: number, originalValue: string) => {
    if (!correctionValue.trim()) return;
    try {
      await apiFetch(`/products/${productId}/correct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field_name: correctionField,
          corrected_value: correctionValue.trim(),
          original_value: originalValue,
          corrected_by: 'human_reviewer'
        })
      });
      setCorrectionSaved(prev => new Set([...prev, productId]));
      setCorrecting(null);
      setCorrectionValue('');
    } catch (e) {
      console.error('Correction failed', e);
    }
  };

  const fetchReviewProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      params.set('review_status', 'NEEDS_HUMAN_REVIEW');
      if (datasetId) params.set('dataset_id', datasetId.toString());

      const res = await apiFetch(`/products?${params.toString()}`);
      const data = await res.json();
      let items = data.items || [];

      // Client-side filter by review category
      if (activeCategory !== 'all') {
        items = items.filter((p: ReviewProduct) => {
          const reason = (p.review_reason || '').toLowerCase();
          if (activeCategory === 'url_lookup') return reason.includes('url lookup');
          if (activeCategory === 'url_validation') return reason.includes('url validation');
          if (activeCategory === 'scrape') return reason.includes('scrape');
          if (activeCategory === 'spec_extraction') return reason.includes('spec extraction');
          if (activeCategory === 'exception') return reason.includes('exception');
          return true;
        });
      }

      setProducts(items);
      setTotal(data.total || 0);
    } catch (e) {
      console.error('Failed to fetch review products', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviewProducts();
  }, [page, datasetId, activeCategory]);

  const totalPages = Math.ceil(total / limit) || 1;

  if (total === 0 && !loading) {
    return (
      <div className="enterprise-card p-6 rounded-2xl border border-white/10 text-center mb-7">
        <h3 className="text-emerald-400 font-bold text-base font-heading">Zero Review Exceptions Pending</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 font-mono">
          All catalog products in this dataset passed automated validation checks.
        </p>
      </div>
    );
  }

  return (
    <div className="enterprise-card p-6 sm:p-7 rounded-2xl border border-white/10 mb-7">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-white/10 pb-3.5">
        <div>
          <h3 className="text-base font-bold text-white font-heading tracking-tight flex items-center gap-2.5">
            <span>Human-in-the-Loop Review Queue</span>
            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-white/5 text-slate-300 border border-white/10">
              {total} Items
            </span>
          </h3>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Flagged catalog records requiring review or canonical value overrides.
          </p>
        </div>

        <button
          onClick={fetchReviewProducts}
          className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-300 hover:text-white cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 mb-4 flex-wrap font-mono text-xs">
        {REVIEW_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => { setActiveCategory(cat.key); setPage(1); }}
              className={`px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                isActive
                  ? 'bg-white/15 border-white/25 text-white font-bold'
                  : 'bg-black/40 border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Structured Table */}
      {loading ? (
        <div className="text-center py-8 text-slate-400 font-mono text-xs">
          Loading review exceptions...
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/50">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-black/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                <tr>
                  <th className="p-3 pl-4">Part Number (MPN)</th>
                  <th className="p-3">Manufacturer</th>
                  <th className="p-3">Raw Description</th>
                  <th className="p-3">Review Reason</th>
                  <th className="p-3 text-center">Confidence</th>
                  <th className="p-3 pr-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3 pl-4 font-bold text-white">
                      <span className="px-2 py-0.5 rounded bg-white/5 text-white border border-white/10 inline-block font-mono text-xs">
                        {p.mfg_part_num}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300">
                      {p.manufacturer || "—"}
                    </td>
                    <td className="p-3 text-slate-300 max-w-xs truncate font-sans text-xs" title={p.raw_description}>
                      {p.raw_description}
                    </td>
                    <td className="p-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 text-slate-300 border border-white/10">
                        {p.review_reason || "Automated check mismatch"}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold text-slate-300">
                      {Math.round((p.confidence_score || 0) * 100)}%
                    </td>
                    <td className="p-3 pr-4 text-right">
                      <div className="flex flex-col items-end gap-2">
                        {correctionSaved.has(p.id) ? (
                          <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                            Saved
                          </span>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => onReEnrich(p.id)}
                                className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs cursor-pointer"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                Re-enrich
                              </button>
                              <button
                                onClick={() => { setCorrecting(correcting === p.id ? null : p.id); setCorrectionValue(''); }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-slate-300 border border-white/10 text-xs font-semibold hover:bg-white/10 cursor-pointer transition-colors"
                              >
                                <Edit3 className="w-3 h-3" />
                                Correct
                              </button>
                            </div>
                            {correcting === p.id && (
                              <div className="bg-[#0A0A0A] border border-white/20 rounded-xl p-3 w-64 space-y-2 text-xs text-left">
                                <p className="text-white font-bold text-[10px] uppercase tracking-wider">Inline Correction</p>
                                <select
                                  value={correctionField}
                                  onChange={e => setCorrectionField(e.target.value)}
                                  className="w-full bg-black/60 border border-white/15 rounded-lg px-2 py-1.5 text-slate-200 text-xs font-mono cursor-pointer"
                                >
                                  <option value="brand">Brand</option>
                                  <option value="manufacturer">Manufacturer</option>
                                  <option value="department">Department</option>
                                  <option value="class">Class</option>
                                  <option value="category">Fine Category</option>
                                  <option value="classpath">Classpath</option>
                                </select>
                                <input
                                  type="text"
                                  value={correctionValue}
                                  onChange={e => setCorrectionValue(e.target.value)}
                                  placeholder="Corrected value..."
                                  className="w-full bg-black/60 border border-white/15 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-white/40"
                                  onKeyDown={e => { if (e.key === 'Enter') submitCorrection(p.id, p.manufacturer || ''); }}
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => submitCorrection(p.id, p.manufacturer || '')}
                                    className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs cursor-pointer transition-colors"
                                  >
                                    Save Override
                                  </button>
                                  <button
                                    onClick={() => setCorrecting(null)}
                                    className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3 text-xs font-mono text-slate-400">
              <span>Showing <strong className="text-white">{products.length}</strong> of <strong className="text-white">{total}</strong> items</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-30 cursor-pointer"
                >
                  Prev
                </button>
                <span className="px-2 py-1 font-semibold text-slate-200 bg-white/5 rounded border border-white/10">Page {page} / {totalPages}</span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-30 cursor-pointer"
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

export default ReviewPanel;

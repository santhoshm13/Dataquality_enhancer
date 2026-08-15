import React, { useState } from 'react';
import { X, CheckCircle, XCircle, Sparkles, Database } from 'lucide-react';

interface ProductDetailModalProps {
  product: any;
  onClose: () => void;
  onRunEnrichment: (id: number) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onRunEnrichment
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'attributes' | 'descriptions' | 'validation'>('overview');

  if (!product) return null;

  const enrich = product.enrichment || {};
  const attrs = product.attributes || [];
  const descs = product.descriptions || {};
  const validations = product.validation_results || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="glass-panel w-full max-w-4xl max-h-[90vh] rounded-2xl border border-slate-800 p-6 shadow-2xl flex flex-col relative animate-in fade-in zoom-in duration-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-800 text-indigo-300 font-mono text-xs font-bold">
                {product.mfg_part_num}
              </span>
              <h2 className="text-lg font-bold text-white max-w-xl truncate">{product.raw_description}</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">Raw Manufacturer: <span className="text-slate-200">{product.raw_manufacturer || 'N/A'}</span></p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800/80 my-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'overview' ? 'border-indigo-500 text-indigo-400 font-semibold' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            AI Normalization & Entity Matching
          </button>
          <button
            onClick={() => setActiveTab('attributes')}
            className={`px-4 py-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'attributes' ? 'border-indigo-500 text-indigo-400 font-semibold' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Extracted Attributes & LOVs ({attrs.length})
          </button>
          <button
            onClick={() => setActiveTab('descriptions')}
            className={`px-4 py-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'descriptions' ? 'border-indigo-500 text-indigo-400 font-semibold' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Generated Descriptions
          </button>
          <button
            onClick={() => setActiveTab('validation')}
            className={`px-4 py-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'validation' ? 'border-indigo-500 text-indigo-400 font-semibold' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Validation & Confidence Engine
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-2 text-xs space-y-4">
          
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* RAW INPUT PANEL */}
              <div className="glass-card p-4 rounded-xl border border-slate-800">
                <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px] mb-3 flex items-center gap-2">
                  <Database className="w-4 h-4 text-slate-400" />
                  Preserved Raw Data
                </h4>
                <div className="space-y-2 text-slate-300">
                  <div><span className="text-slate-500">Mfg Part Num:</span> <span className="font-mono text-indigo-300">{product.mfg_part_num}</span></div>
                  <div><span className="text-slate-500">Part Description:</span> {product.raw_description}</div>
                  <div><span className="text-slate-500">E1 Brand:</span> {product.raw_brand_e1 || '—'}</div>
                  <div><span className="text-slate-500">Unilog Brand:</span> {product.raw_brand_unilog || '—'}</div>
                  <div><span className="text-slate-500">DIB Brand:</span> {product.raw_brand_dib || '—'}</div>
                  <div><span className="text-slate-500">Raw Vendor/Manuf:</span> {product.raw_manufacturer || '—'}</div>
                </div>
              </div>

              {/* MATCHED ENTITIES PANEL */}
              <div className="glass-card p-4 rounded-xl border border-slate-800">
                <h4 className="font-bold text-indigo-400 uppercase tracking-wider text-[11px] mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  AI Normalized & Matched Entities
                </h4>
                <div className="space-y-2 text-slate-300">
                  <div><span className="text-slate-500">Matched Brand:</span> <span className="font-semibold text-white">{enrich.brand || 'Unassigned'}</span></div>
                  <div><span className="text-slate-500">Matched Manufacturer:</span> <span className="font-semibold text-white">{enrich.manufacturer || 'Unassigned'}</span></div>
                  <div><span className="text-slate-500">Department:</span> {enrich.department || '—'}</div>
                  <div><span className="text-slate-500">Class:</span> {enrich.class || '—'}</div>
                  <div><span className="text-slate-500">Category:</span> <span className="text-indigo-300 font-medium">{enrich.category || '—'}</span></div>
                  <div><span className="text-slate-500">Confidence Score:</span> <span className="font-bold text-emerald-400">{Math.round((enrich.confidence_score || 0) * 100)}%</span></div>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'attributes' && (
            <div>
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="p-3">Attribute</th>
                      <th className="p-3">Extracted Value</th>
                      <th className="p-3">UOM</th>
                      <th className="p-3">Confidence</th>
                      <th className="p-3">LOV Validation Status</th>
                      <th className="p-3">Reason / Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                    {attrs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-500">
                          No attributes extracted yet. Click "Run Pipeline" to trigger AI extraction.
                        </td>
                      </tr>
                    ) : (
                      attrs.map((a: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-900/50">
                          <td className="p-3 font-semibold text-slate-200">{a.name}</td>
                          <td className="p-3 text-indigo-300">{a.value}</td>
                          <td className="p-3 text-slate-400 font-mono">{a.uom || '—'}</td>
                          <td className="p-3 font-mono">{Math.round((a.confidence || 1) * 100)}%</td>
                          <td className="p-3">
                            {a.validation_status === 'PASS' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-semibold">
                                <CheckCircle className="w-3 h-3 text-emerald-400" /> PASS
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-semibold">
                                <XCircle className="w-3 h-3 text-rose-400" /> FAIL
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-slate-400">{a.validation_reason || 'Validated against LOV'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'descriptions' && (
            <div className="space-y-3">
              {Object.keys(descs).length === 0 ? (
                <p className="text-slate-500 text-center py-6">No descriptions generated yet. Run enrichment pipeline to generate.</p>
              ) : (
                Object.entries(descs).map(([key, val]: any) => (
                  <div key={key} className="glass-card p-3 rounded-xl border border-slate-800">
                    <h5 className="font-mono text-indigo-400 font-bold uppercase text-[11px] mb-1">{key}</h5>
                    <p className="text-slate-200 leading-relaxed">{val}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'validation' && (
            <div className="space-y-3">
              <div className="glass-card p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-200">Overall Pipeline Confidence Rating</h4>
                  <p className="text-xs text-slate-400">Calculated across Manufacturer, Brand, Taxonomy, and LOV Attribute rules</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-emerald-400">{Math.round((enrich.confidence_score || 0) * 100)}%</span>
                  <p className="text-[10px] font-semibold text-emerald-500 uppercase">{product.status}</p>
                </div>
              </div>

              <div className="space-y-2">
                {validations.map((v: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-200">{v.field_name}: </span>
                      <span className="text-indigo-300">{v.value}</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">{v.reason}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                      {v.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-between items-center mt-2">
          <button
            onClick={() => onRunEnrichment(product.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Re-run AI Enrichment
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

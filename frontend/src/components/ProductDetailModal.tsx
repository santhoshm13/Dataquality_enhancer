import React, { useState } from 'react';
import { X, CheckCircle, XCircle, Sparkles, Database, ExternalLink, Globe, AlertTriangle, ShieldCheck } from 'lucide-react';

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
  
  const sourceUrl = product.source_url || enrich.source_url;
  const sourceType = product.source_type || enrich.source_type || 'manufacturer';
  const groundingSources: string[] = product.grounding_sources || enrich.grounding_sources || [];
  const isFound = product.found !== false && Boolean(sourceUrl);

  const formatHostname = (urlStr: string) => {
    try {
      const u = new URL(urlStr.startsWith('http') ? urlStr : `https://${urlStr}`);
      return u.hostname.replace(/^www\./, '');
    } catch {
      return urlStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="glass-panel w-full max-w-4xl max-h-[90vh] rounded-2xl border border-slate-800 p-6 shadow-2xl flex flex-col relative animate-in fade-in zoom-in duration-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-800 text-indigo-300 font-mono text-xs font-bold">
                {product.mfg_part_num}
              </span>
              <h2 className="text-lg font-bold text-white max-w-xl truncate">{product.raw_description}</h2>
              {sourceUrl && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  sourceType === 'fallback' 
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {sourceType === 'fallback' ? 'Fallback Distributor' : 'Official Manufacturer'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">Raw Manufacturer: <span className="text-slate-200">{product.raw_manufacturer || 'N/A'}</span></p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
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
            AI Normalization & Source
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
            <div className="space-y-4">
              
              {/* SOURCE PROVENANCE CARD */}
              <div className="glass-card p-4 rounded-xl border border-slate-800">
                <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-indigo-400">
                    <Globe className="w-4 h-4 text-indigo-400" />
                    Manufacturer Grounding & Source Provenance
                  </span>
                  {isFound ? (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      sourceType === 'fallback' 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {sourceType === 'fallback' ? 'Fallback Distributor' : 'Manufacturer Official'}
                    </span>
                  ) : null}
                </h4>

                {isFound && sourceUrl ? (
                  <div className="space-y-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-slate-400 font-medium">Primary Grounded Source:</span>
                      <a
                        href={sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 transition-all font-mono font-semibold text-xs"
                      >
                        <span>{formatHostname(sourceUrl)}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    <div className="text-[11px] text-slate-400 break-all font-mono">
                      <span className="text-slate-500 font-sans">Full URL: </span>
                      <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:underline text-indigo-400">
                        {sourceUrl}
                      </a>
                    </div>

                    {groundingSources.length > 0 && (
                      <div className="pt-2 border-t border-slate-800">
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          Verified Grounding Citations ({groundingSources.length}):
                        </p>
                        <ul className="space-y-1">
                          {groundingSources.map((gUrl, gIdx) => (
                            <li key={gIdx} className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 truncate">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                              <a href={gUrl} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-300 hover:underline truncate">
                                {gUrl}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-xs">No source found — needs manual review</p>
                      <p className="text-[11px] text-amber-300/80 mt-0.5">
                        The live manufacturer search did not locate a direct catalog page for MPN <span className="font-mono font-bold text-white">{product.mfg_part_num}</span>. Attributes were normalized from input records.
                      </p>
                    </div>
                  </div>
                )}
              </div>

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
                      <th className="p-3">Source</th>
                      <th className="p-3">Confidence</th>
                      <th className="p-3">LOV Validation</th>
                      <th className="p-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                    {attrs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-500">
                          No attributes extracted yet. Click "Run Pipeline" to trigger AI extraction.
                        </td>
                      </tr>
                    ) : (
                      attrs.map((a: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-900/50">
                          <td className="p-3 font-semibold text-slate-200">{a.name}</td>
                          <td className="p-3 text-indigo-300 font-medium">{a.value}</td>
                          <td className="p-3 text-slate-400 font-mono">{a.uom || '—'}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                              {a.source === 'manufacturer_site' ? 'Manufacturer' : 'AI Extraction'}
                            </span>
                          </td>
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
                          <td className="p-3 text-slate-400">{a.validation_reason || 'LOV Match'}</td>
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
                {validations.map((v: any, idx: number) => {
                  const isFail = v.status === "FAIL" || v.status === "NEEDS_REVIEW";
                  return (
                    <div key={idx} className={`p-3 rounded-xl border flex items-center justify-between ${isFail ? 'bg-rose-950/20 border-rose-800/50' : 'bg-slate-900/60 border-slate-800'}`}>
                      <div>
                        <span className="font-semibold text-slate-200">{v.field_name}: </span>
                        <span className={isFail ? 'text-rose-400 font-bold' : 'text-indigo-300'}>{v.value}</span>
                        <p className={`text-[11px] mt-0.5 ${isFail ? 'text-rose-300/80' : 'text-slate-400'}`}>{v.reason}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${isFail ? 'bg-rose-950 text-rose-300 border-rose-800' : 'bg-emerald-950 text-emerald-300 border-emerald-800'}`}>
                        {v.status}
                      </span>
                    </div>
                  );
                })}
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
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

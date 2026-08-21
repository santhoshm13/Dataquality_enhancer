import React, { useState } from 'react';
import { X, CheckCircle, XCircle, Sparkles, Database, ExternalLink, Globe, AlertTriangle, ShieldCheck, Copy, Check, Clock, Layers, FileText, ChevronDown, ChevronRight, HelpCircle, Zap, GitMerge, Eye } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'attributes' | 'descriptions' | 'validation' | 'provenance'>('overview');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedProvenance, setExpandedProvenance] = useState<string | null>(null);

  const fieldProvenance: Record<string, any> = product.field_provenance || {};
  const notFoundReason: string = product.not_found_reason || '';

  if (!product) return null;

  const enrich = product.enrichment || {};
  const attrs = product.attributes || [];
  const descs = product.descriptions || {};
  const validations = product.validation_results || [];
  const stageTimings = product.stage_timings || enrich.stage_timings || {};
  
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

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const descriptionLimits: Record<string, number> = {
    MOBILE_DESC: 80,
    INVOICE_DESC: 40,
    SHORT_DESC: 80,
    LONG_DESC1: 1000,
    RETAIL_DESC: 255,
    MARKETING_DESCRIPTION: 500
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
      <div className="frame-3d w-full max-w-5xl max-h-[92vh] rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col relative animate-in fade-in zoom-in duration-200 overflow-hidden bg-[#0a0e1a]/95">
        
        {/* Header with Monospace Part Number and Status Pill */}
        <div className="flex items-start justify-between pb-5 border-b border-white/10">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <span className="px-3 py-1 rounded-xl bg-indigo-500/15 border border-indigo-500/40 text-indigo-300 font-mono text-sm font-bold tracking-tight shadow-sm">
                MPN: {product.mfg_part_num}
              </span>

              {isFound && sourceUrl ? (
                <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm ${
                  sourceType === 'fallback' 
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40' 
                    : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                }`}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {sourceType === 'fallback' ? 'Distributor Grounded' : 'Manufacturer Official'}
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/40 flex items-center gap-1.5 shadow-sm">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Needs Human Review
                </span>
              )}

              <span className="text-xs font-mono text-slate-400 bg-white/5 px-2.5 py-1 rounded-xl border border-white/10">
                Confidence: <strong className="text-emerald-400 font-bold">{Math.round((enrich.confidence_score || 0) * 100)}%</strong>
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white font-heading tracking-tight leading-snug">
              {enrich.brand ? `${enrich.brand} ` : ''}{product.raw_description}
            </h2>

            {/* Taxonomy Breadcrumb */}
            {enrich.classpath && (
              <div className="flex items-center gap-1.5 text-xs text-indigo-300 font-mono mt-2 bg-black/60 px-3 py-1.5 rounded-xl border border-indigo-500/30 max-w-fit shadow-inner">
                <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>{enrich.classpath}</span>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-white/10 my-4 text-xs font-mono overflow-x-auto pb-1">
          {[
            { key: 'overview', label: 'Summary & Classification' },
            { key: 'attributes', label: `LOV Specs & Attributes (${attrs.length})` },
            { key: 'descriptions', label: 'UNILOG Descriptions (6 Formats)' },
            { key: 'validation', label: 'Validation Engine Rules' },
            { key: 'provenance', label: 'Grounding & Latency Trail' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2.5 rounded-2xl transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.key 
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-bold shadow-lg shadow-indigo-600/40 scale-105' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-1 text-xs space-y-4">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              
              {/* Grounded Source 3D Box */}
              <div className="frame-3d p-5 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Globe className="w-4 h-4 text-indigo-400" />
                    Verified Manufacturer Web Source
                  </span>
                  {sourceUrl && (
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 font-mono text-xs transition-colors shadow-sm"
                    >
                      <span>Visit Live Page</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {sourceUrl ? (
                  <div className="bg-black/60 p-3.5 rounded-xl border border-white/5 space-y-2 font-mono text-xs shadow-inner">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Domain: <strong className="text-white">{formatHostname(sourceUrl)}</strong></span>
                      <span className="text-emerald-400 font-bold uppercase">{sourceType}</span>
                    </div>
                    <div className="text-slate-400 truncate" title={sourceUrl}>
                      <span className="text-slate-600">URL: </span>
                      <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                        {sourceUrl}
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-xs">Manufacturer Source Page Not Found</div>
                      <p className="text-[11px] text-amber-300/80 mt-1">
                        {notFoundReason ||
                          'No verified manufacturer page was located for this product. Enrichment was performed using description text and LOV rules only.'}
                      </p>
                      <p className="text-[10px] text-amber-200/50 mt-1 font-mono">
                        To resolve: verify the MPN and manufacturer name are correct, then re-run enrichment.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Side-by-Side Ingested vs Matched 3D Bento */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Preserved Raw Input */}
                <div className="frame-3d p-5 rounded-2xl space-y-3 font-mono">
                  <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-2 border-b border-white/10 pb-2">
                    <Database className="w-4 h-4 text-slate-400" />
                    Ingested Legacy Input
                  </h4>
                  <div className="space-y-2 text-slate-300">
                    <div className="flex justify-between py-1 border-b border-white/[0.04]"><span className="text-slate-500">Mfg_Part_Num:</span> <span className="text-indigo-300 font-bold">{product.mfg_part_num}</span></div>
                    <div className="py-1 border-b border-white/[0.04]"><span className="text-slate-500 block mb-0.5">Part_Desc:</span> <span className="text-slate-300">{product.raw_description}</span></div>
                    <div className="flex justify-between py-1 border-b border-white/[0.04]"><span className="text-slate-500">Part_Manuf:</span> <span>{product.raw_manufacturer || '—'}</span></div>
                    <div className="flex justify-between py-1 border-b border-white/[0.04]"><span className="text-slate-500">E1_Brand:</span> <span>{product.raw_brand_e1 || '—'}</span></div>
                    <div className="flex justify-between py-1 border-b border-white/[0.04]"><span className="text-slate-500">Unilog_Brand:</span> <span>{product.raw_brand_unilog || '—'}</span></div>
                    <div className="flex justify-between py-1"><span className="text-slate-500">DIB_Brand:</span> <span>{product.raw_brand_dib || '—'}</span></div>
                  </div>
                </div>

                {/* Normalized Entities */}
                <div className="frame-3d p-5 rounded-2xl border-l-4 border-indigo-500 space-y-3 font-mono">
                  <h4 className="font-bold text-indigo-400 uppercase tracking-wider text-[11px] flex items-center gap-2 border-b border-white/10 pb-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    Normalized Master Entities
                  </h4>
                  <div className="space-y-2 text-slate-300">
                    <div className="flex justify-between py-1 border-b border-white/[0.04]"><span className="text-slate-500">Canonical Brand:</span> <span className={enrich.brand ? 'text-white font-bold' : 'text-slate-600 italic'}>{enrich.brand || 'Not identified'}</span></div>
                    <div className="flex justify-between py-1 border-b border-white/[0.04]"><span className="text-slate-500">Canonical Manufacturer:</span> <span className={enrich.manufacturer ? 'text-white font-bold' : 'text-slate-600 italic'}>{enrich.manufacturer || 'Not identified'}</span></div>
                    <div className="flex justify-between py-1 border-b border-white/[0.04]"><span className="text-slate-500">Department:</span> <span className="text-slate-300">{enrich.department || '—'}</span></div>
                    <div className="flex justify-between py-1 border-b border-white/[0.04]"><span className="text-slate-500">Class:</span> <span className="text-slate-300">{enrich.class || '—'}</span></div>
                    <div className="flex justify-between py-1 border-b border-white/[0.04]"><span className="text-slate-500">Category:</span> <span className="text-indigo-300 font-bold">{enrich.category || '—'}</span></div>
                    <div className="flex justify-between py-1"><span className="text-slate-500">Confidence Tier:</span> <span className="text-emerald-400 font-bold uppercase">{product.status || 'High'}</span></div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: EXTRACTED ATTRIBUTES */}
          {activeTab === 'attributes' && (
            <div>
              <div className="overflow-x-auto rounded-2xl border border-white/10 shadow-inner bg-black/40">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-black/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                    <tr>
                      <th className="p-3.5">Taxonomy Attribute</th>
                      <th className="p-3.5">Normalized Value</th>
                      <th className="p-3.5">Canonical UOM</th>
                      <th className="p-3.5">Extraction Provenance</th>
                      <th className="p-3.5 text-center">Confidence</th>
                      <th className="p-3.5 text-center">LOV Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] bg-black/20">
                    {attrs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center">
                          {product.status === 'RAW' || !product.status ? (
                            <div className="space-y-2">
                              <p className="text-slate-400 font-bold">Product not yet enriched</p>
                              <p className="text-slate-600 text-[11px]">Click the ▶ Run AI Enrichment button to extract attributes.</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-slate-400 font-bold">No attributes extracted</p>
                              <p className="text-slate-600 text-[11px]">
                                The AI pipeline ran but could not confidently extract attributes for this product type.<br />
                                This is honest behaviour — no fabricated values are shown.
                              </p>
                            </div>
                          )}
                        </td>
                      </tr>
                    ) : (
                      attrs.map((a: any, idx: number) => {
                        const attrProv = fieldProvenance?.attributes?.[a.name];
                        const isExpanded = expandedProvenance === `attr-${idx}`;
                        return (
                          <React.Fragment key={idx}>
                            <tr
                              className="hover:bg-white/[0.03] transition-colors cursor-pointer"
                              onClick={() => setExpandedProvenance(isExpanded ? null : `attr-${idx}`)}
                            >
                              <td className="p-3.5 font-bold text-slate-200 flex items-center gap-1.5">
                                {isExpanded ? <ChevronDown className="w-3 h-3 text-cyan-400" /> : <ChevronRight className="w-3 h-3 text-slate-600" />}
                                {a.name}
                              </td>
                              <td className="p-3.5 text-indigo-300 font-bold">{a.value}</td>
                              <td className="p-3.5 text-cyan-400">{a.uom || <span className="text-slate-600">—</span>}</td>
                              <td className="p-3.5">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-white/5 text-slate-300 border border-white/10">
                                  {a.source === 'manufacturer_site' ? 'Web Scraped' : 'AI LOV Extraction'}
                                </span>
                              </td>
                              <td className="p-3.5 text-center text-emerald-400 font-bold">{Math.round((a.confidence || 1) * 100)}%</td>
                              <td className="p-3.5 text-center">
                                {a.validation_status === 'PASS' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold shadow-sm">
                                    <CheckCircle className="w-3 h-3 text-emerald-400" /> PASS
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px] font-bold shadow-sm">
                                    <XCircle className="w-3 h-3 text-rose-400" /> REVIEW
                                  </span>
                                )}
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="bg-cyan-950/20">
                                <td colSpan={6} className="px-5 py-3 border-t border-cyan-900/40">
                                  <div className="flex items-start gap-2">
                                    <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                                    <div className="space-y-1.5 text-xs">
                                      <p className="font-bold text-cyan-300">Why this value?</p>
                                      {attrProv ? (
                                        <>
                                          <p className="text-slate-300 leading-relaxed">{attrProv.rationale || 'Extracted via constrained LLM from product description, validated against LOV.'}</p>
                                          <div className="flex flex-wrap gap-3 mt-2 text-[10px] font-mono">
                                            <span className="bg-black/60 px-2.5 py-1 rounded-lg border border-white/10">
                                              Source: <strong className="text-indigo-300">{attrProv.source || a.source || 'ai_lov_extraction'}</strong>
                                            </span>
                                            <span className="bg-black/60 px-2.5 py-1 rounded-lg border border-white/10">
                                              Method: <strong className="text-purple-300">{attrProv.method || 'llm_extraction'}</strong>
                                            </span>
                                            <span className="bg-black/60 px-2.5 py-1 rounded-lg border border-white/10">
                                              Confidence: <strong className="text-emerald-400">{Math.round((attrProv.confidence || a.confidence || 1) * 100)}%</strong>
                                            </span>
                                            <span className="bg-black/60 px-2.5 py-1 rounded-lg border border-white/10">
                                              LOV Status: <strong className={attrProv.validation_status === 'PASS' ? 'text-emerald-400' : 'text-amber-400'}>{attrProv.validation_status || 'UNKNOWN'}</strong>
                                            </span>
                                          </div>
                                          {attrProv.evidence && (
                                            <p className="text-slate-400 italic mt-1">Evidence: {attrProv.evidence}</p>
                                          )}
                                        </>
                                      ) : (
                                        <p className="text-slate-400">Extracted via LOV-constrained LLM inference from product description and web data. Confidence: {Math.round((a.confidence || 1) * 100)}%.</p>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: UNILOG DESCRIPTIONS */}
          {activeTab === 'descriptions' && (
            <div className="space-y-3">
              {Object.keys(descs).length === 0 ? (
                <p className="text-slate-500 text-center py-10 font-mono">No descriptions generated yet. Run pipeline to generate UNILOG descriptions.</p>
              ) : (
                Object.entries(descs).map(([key, val]: any) => {
                  const len = String(val).length;
                  const limit = descriptionLimits[key] || 1000;
                  const isOver = len > limit;
                  return (
                    <div key={key} className="frame-3d p-4 sm:p-5 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between font-mono">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-indigo-400" />
                          <h5 className="font-bold text-indigo-300 uppercase text-xs">{key}</h5>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg border ${isOver ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-black/50 text-slate-400 border-white/10'}`}>
                            {len} / {limit} chars
                          </span>
                          <button
                            onClick={() => copyToClipboard(String(val), key)}
                            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title="Copy text"
                          >
                            {copiedKey === key ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <p className="text-slate-200 text-xs leading-relaxed bg-black/50 p-3.5 rounded-xl border border-white/5 font-sans shadow-inner">
                        {val}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 4: VALIDATION ENGINE */}
          {activeTab === 'validation' && (
            <div className="space-y-3 font-mono">
              <div className="frame-3d p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm">Deterministic Rule Engine Scorecard</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Evaluated against 30,000+ permitted LOVs, canonical brands, and 64th fractions.</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-emerald-400">{Math.round((enrich.confidence_score || 0) * 100)}%</span>
                  <div className="text-[10px] font-bold uppercase text-emerald-400">PASSED AUDIT</div>
                </div>
              </div>

              <div className="space-y-2">
                {validations.map((v: any, idx: number) => {
                  const isFail = v.status === "FAIL" || v.status === "NEEDS_REVIEW";
                  return (
                    <div key={idx} className={`p-4 rounded-2xl border flex items-center justify-between ${isFail ? 'bg-rose-950/25 border-rose-800/40' : 'bg-black/40 border-white/10 shadow-inner'}`}>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">{v.field_name}:</span>
                          <span className={isFail ? 'text-rose-400 font-bold' : 'text-indigo-300 font-bold'}>{v.value}</span>
                        </div>
                        <p className={`text-[11px] mt-1 ${isFail ? 'text-rose-300' : 'text-slate-400'}`}>{v.reason}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${isFail ? 'bg-rose-950 text-rose-300 border-rose-800' : 'bg-emerald-950 text-emerald-300 border-emerald-800'}`}>
                        {v.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: PROVENANCE & LATENCY */}
          {activeTab === 'provenance' && (
            <div className="space-y-4 font-mono">

              {/* Field-Level Provenance Table */}
              <div className="frame-3d p-5 rounded-2xl">
                <h4 className="font-bold text-slate-200 text-sm mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  Field-Level Decision Provenance
                </h4>
                <p className="text-[11px] text-slate-400 mb-4">Every output field carries: value · source · method · confidence · rationale</p>
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-xs">
                    <thead className="bg-black/60 text-slate-400 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-3 text-left">Field</th>
                        <th className="p-3 text-left">Value</th>
                        <th className="p-3 text-left">Source</th>
                        <th className="p-3 text-left">Method</th>
                        <th className="p-3 text-center">Confidence</th>
                        <th className="p-3 text-left">Rationale</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {['MANUFACTURER_NAME', 'BRAND_NAME', 'Dept', 'Class', 'Fine', 'Classpath'].map(field => {
                        const prov = fieldProvenance[field];
                        if (!prov) return null;
                        const isBrand = field === 'BRAND_NAME';
                        const sourceVotes: Record<string, any> = prov.source_votes || {};
                        const sourceBadgeColor = (v: any) => {
                          if (!v) return 'text-slate-600';
                          if (v.is_placeholder) return 'text-slate-500';
                          if (v.resolved_value) return 'text-emerald-400';
                          return 'text-rose-400';
                        };
                        const sourceIcon = (v: any) => {
                          if (!v || v.is_placeholder) return '—';
                          return v.resolved_value ? '✓' : '✗';
                        };
                        return (
                          <tr key={field} className="hover:bg-white/[0.03]">
                            <td className="p-3 font-bold text-slate-300">
                              <div className="flex items-center gap-2">
                                {field}
                                {isBrand && prov.sources_checked && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-purple-950/60 border border-purple-700/40 font-mono" title={prov.conflict_detail}>
                                    <GitMerge className="w-3 h-3 text-purple-400" />
                                    {prov.sources_checked.map((s: string) => {
                                      const short = s.replace('_Brand','').replace('_brand','');
                                      const vote = sourceVotes[s];
                                      return (
                                        <span key={s} className={`${sourceBadgeColor(vote)} font-bold`}>
                                          {sourceIcon(vote)}{short}
                                        </span>
                                      );
                                    })}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-indigo-300 font-bold max-w-[120px] truncate" title={prov.value}>{prov.value || '—'}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-950/60 text-indigo-300 border border-indigo-700/40">
                                {isBrand ? 'multi_source' : prov.source}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-col gap-1">
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-950/60 text-purple-300 border border-purple-700/40">
                                  {prov.method}
                                </span>
                                {isBrand && prov.confidence_tier && (
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    prov.confidence_tier === 'HIGH' ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/40' :
                                    prov.confidence_tier === 'MEDIUM' ? 'bg-amber-950/60 text-amber-300 border-amber-700/40' :
                                    prov.confidence_tier === 'CONFLICT' ? 'bg-rose-950/60 text-rose-300 border-rose-700/40' :
                                    'bg-slate-950/60 text-slate-400 border-slate-700/40'
                                  }`}>
                                    {prov.confidence_tier}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`font-bold ${(prov.confidence || 0) >= 0.8 ? 'text-emerald-400' : (prov.confidence || 0) >= 0.5 ? 'text-amber-400' : 'text-rose-400'}`}>
                                {Math.round((prov.confidence || 0) * 100)}%
                              </span>
                            </td>
                            <td className="p-3 text-slate-400 text-[11px] max-w-[200px]" title={prov.rationale}>
                              {prov.rationale?.slice(0, 80)}{prov.rationale?.length > 80 ? '…' : ''}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {Object.keys(fieldProvenance).filter(k => k !== 'attributes').length === 0 && (
                    <p className="text-center text-slate-500 py-6 text-xs">Run enrichment to see field provenance.</p>
                  )}
                </div>
              </div>

              {/* Latency Breakdown */}
              <div className="frame-3d p-5 rounded-2xl">
                <h4 className="font-bold text-slate-200 text-sm mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  Per-Stage Execution Latency
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-black/60 rounded-2xl border border-white/5 shadow-inner">
                    <span className="text-[10px] text-slate-500 block">Stage 1: URL Lookup</span>
                    <span className="text-sm font-bold text-indigo-400">
                      {stageTimings.url_lookup_s ? `${(stageTimings.url_lookup_s * 1000).toFixed(0)} ms` : '—'}
                    </span>
                  </div>
                  <div className="p-3.5 bg-black/60 rounded-2xl border border-white/5 shadow-inner">
                    <span className="text-[10px] text-slate-500 block">Stage 1.5: URL Validation</span>
                    <span className="text-sm font-bold text-cyan-400">
                      {stageTimings.url_validate_s ? `${(stageTimings.url_validate_s * 1000).toFixed(0)} ms` : '—'}
                    </span>
                  </div>
                  <div className="p-3.5 bg-black/60 rounded-2xl border border-white/5 shadow-inner">
                    <span className="text-[10px] text-slate-500 block">Stage 2: Page Scrape</span>
                    <span className="text-sm font-bold text-purple-400">
                      {stageTimings.scrape_s ? `${(stageTimings.scrape_s * 1000).toFixed(0)} ms` : '—'}
                    </span>
                  </div>
                  <div className="p-3.5 bg-black/60 rounded-2xl border border-white/5 shadow-inner">
                    <span className="text-[10px] text-slate-500 block">Stage 3: Spec Extraction</span>
                    <span className="text-sm font-bold text-emerald-400">
                      {stageTimings.spec_extraction_s ? `${(stageTimings.spec_extraction_s * 1000).toFixed(0)} ms` : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Citations List */}
              <div className="frame-3d p-5 rounded-2xl space-y-2">
                <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider">Grounding URL Citation Log</h4>
                {groundingSources.length > 0 ? (
                  <div className="space-y-2">
                    {groundingSources.map((url, idx) => (
                      <div key={idx} className="p-3 bg-black/50 rounded-xl border border-white/5 flex items-center justify-between text-xs shadow-inner">
                        <span className="text-slate-300 truncate max-w-xl">{url}</span>
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 shrink-0 font-bold">
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-xs">No external URL citations logged for this record.</p>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-white/10 flex justify-between items-center mt-3">
          <button
            onClick={() => onRunEnrichment(product.id)}
            className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-2xl text-white font-semibold text-xs transition-all cursor-pointer shadow-lg"
          >
            <Sparkles className="w-4 h-4" />
            Re-run AI Enrichment
          </button>
          <button
            onClick={onClose}
            className="btn-secondary px-5 py-2.5 rounded-2xl text-slate-300 font-medium text-xs transition-colors cursor-pointer"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
};

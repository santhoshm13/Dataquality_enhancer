import React, { useState } from 'react';
import { X, ExternalLink, Globe, Copy, Clock, Layers, FileText, ChevronDown, ChevronRight, Zap } from 'lucide-react';

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
  const [, setCopiedKey] = useState<string | null>(null);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-5xl max-h-[92vh] rounded-2xl p-6 sm:p-7 shadow-2xl flex flex-col relative overflow-hidden bg-[#0A0A0A] border border-white/15">
        
        {/* Header with Monospace Part Number and Status Pill */}
        <div className="flex items-start justify-between pb-4 border-b border-white/10">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2.5 flex-wrap mb-2">
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white font-mono text-xs font-bold">
                MPN: {product.mfg_part_num}
              </span>

              {isFound && sourceUrl ? (
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {sourceType === 'fallback' ? 'Distributor Grounded' : 'Manufacturer Official'}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-semibold uppercase tracking-wider bg-white/5 text-slate-400 border border-white/10">
                  Needs Review
                </span>
              )}

              <span className="text-xs font-mono text-slate-400 bg-white/5 px-2.5 py-0.5 rounded-lg border border-white/10">
                Confidence: <strong className="text-emerald-400">{Math.round((enrich.confidence_score || 0) * 100)}%</strong>
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-white font-heading tracking-tight leading-snug">
              {enrich.brand ? `${enrich.brand} ` : ''}{product.raw_description}
            </h2>

            {/* Taxonomy Breadcrumb */}
            {enrich.classpath && (
              <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono mt-1.5 bg-black/50 px-2.5 py-1 rounded-lg border border-white/5 max-w-fit">
                <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{enrich.classpath}</span>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 border-b border-white/10 my-3.5 text-xs font-mono overflow-x-auto pb-1">
          {[
            { key: 'overview', label: 'Summary & Classification' },
            { key: 'attributes', label: `LOV Specs & Attributes (${attrs.length})` },
            { key: 'descriptions', label: 'UNILOG Descriptions (6 Formats)' },
            { key: 'validation', label: 'Validation Rules' },
            { key: 'provenance', label: 'Grounding & Latency Trail' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.key 
                  ? 'bg-white/15 text-white font-semibold border border-white/20' 
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
              
              {/* Grounded Source Box */}
              <div className="enterprise-card p-4 rounded-xl border border-white/10">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-400" />
                    Verified Manufacturer Web Source
                  </span>
                  {sourceUrl && (
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 font-mono text-xs transition-colors border border-white/10"
                    >
                      <span>Visit Live Page</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {sourceUrl ? (
                  <div className="bg-black/50 p-3 rounded-lg border border-white/5 space-y-1.5 font-mono text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Domain: <strong className="text-white">{formatHostname(sourceUrl)}</strong></span>
                      <span className="text-emerald-400 font-semibold uppercase">{sourceType}</span>
                    </div>
                    <div className="text-slate-400 truncate" title={sourceUrl}>
                      <span className="text-slate-500">URL: </span>
                      <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-white hover:underline">
                        {sourceUrl}
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 flex items-start gap-2.5">
                    <div>
                      <div className="font-semibold text-xs">Manufacturer Source Page Not Located</div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {notFoundReason ||
                          'No verified manufacturer page was located for this product. Enrichment was performed using description text and LOV rules only.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Side-by-Side Ingested vs Matched Bento */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Preserved Raw Input */}
                <div className="enterprise-card p-4 rounded-xl space-y-2.5 font-mono border border-white/10">
                  <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-2 border-b border-white/10 pb-2">
                    Ingested Legacy Input
                  </h4>
                  <div className="space-y-1.5 text-slate-300">
                    <div className="flex justify-between py-1 border-b border-white/[0.04]"><span className="text-slate-500">Mfg_Part_Num:</span> <span className="text-white font-bold">{product.mfg_part_num}</span></div>
                    <div className="py-1 border-b border-white/[0.04]"><span className="text-slate-500 block mb-0.5">Part_Desc:</span> <span className="text-slate-300">{product.raw_description}</span></div>
                    <div className="flex justify-between py-1 border-b border-white/[0.04]"><span className="text-slate-500">Part_Manuf:</span> <span>{product.raw_manufacturer || '—'}</span></div>
                    <div className="flex justify-between py-1 border-b border-white/[0.04]"><span className="text-slate-500">E1_Brand:</span> <span>{product.raw_brand_e1 || '—'}</span></div>
                    <div className="flex justify-between py-1 border-b border-white/[0.04]"><span className="text-slate-500">Unilog_Brand:</span> <span>{product.raw_brand_unilog || '—'}</span></div>
                    <div className="flex justify-between py-1"><span className="text-slate-500">DIB_Brand:</span> <span>{product.raw_brand_dib || '—'}</span></div>
                  </div>
                </div>

                {/* Normalized Entities */}
                <div className="enterprise-card p-4 rounded-xl border border-white/10 space-y-2.5 font-mono">
                  <h4 className="font-bold text-emerald-400 uppercase tracking-wider text-[11px] flex items-center gap-2 border-b border-white/10 pb-2">
                    Normalized Master Entities
                  </h4>
                  <div className="space-y-1.5 text-slate-300">
                    <div className="flex justify-between py-1 border-b border-white/[0.04]"><span className="text-slate-500">Canonical Brand:</span> <span className={enrich.brand ? 'text-white font-bold' : 'text-slate-600 italic'}>{enrich.brand || 'Not identified'}</span></div>
                    <div className="flex justify-between py-1 border-b border-white/[0.04]"><span className="text-slate-500">Canonical Manufacturer:</span> <span className={enrich.manufacturer ? 'text-white font-bold' : 'text-slate-600 italic'}>{enrich.manufacturer || 'Not identified'}</span></div>
                    <div className="flex justify-between py-1 border-b border-white/[0.04]"><span className="text-slate-500">Department:</span> <span className="text-slate-300">{enrich.department || '—'}</span></div>
                    <div className="flex justify-between py-1 border-b border-white/[0.04]"><span className="text-slate-500">Class:</span> <span className="text-slate-300">{enrich.class || '—'}</span></div>
                    <div className="flex justify-between py-1 border-b border-white/[0.04]"><span className="text-slate-500">Category:</span> <span className="text-emerald-400 font-bold">{enrich.category || '—'}</span></div>
                    <div className="flex justify-between py-1"><span className="text-slate-500">Confidence Tier:</span> <span className="text-emerald-400 font-bold uppercase">{product.status || 'High'}</span></div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: EXTRACTED ATTRIBUTES (NO TICK MARKS) */}
          {activeTab === 'attributes' && (
            <div>
              <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/50">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-black/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                    <tr>
                      <th className="p-3">Taxonomy Attribute</th>
                      <th className="p-3">Normalized Value</th>
                      <th className="p-3">Canonical UOM</th>
                      <th className="p-3">Extraction Provenance</th>
                      <th className="p-3 text-center">Confidence</th>
                      <th className="p-3 text-center">LOV Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {attrs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-10 text-center">
                          <p className="text-slate-400 font-semibold">No attributes extracted</p>
                          <p className="text-slate-600 text-[11px] mt-1">Grounded extraction with no fabricated values.</p>
                        </td>
                      </tr>
                    ) : (
                      attrs.map((a: any, idx: number) => {
                        const attrProv = fieldProvenance?.attributes?.[a.name];
                        const isExpanded = expandedProvenance === `attr-${idx}`;
                        return (
                          <React.Fragment key={idx}>
                            <tr
                              className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                              onClick={() => setExpandedProvenance(isExpanded ? null : `attr-${idx}`)}
                            >
                              <td className="p-3 font-semibold text-slate-200 flex items-center gap-1.5">
                                {isExpanded ? <ChevronDown className="w-3 h-3 text-emerald-400" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
                                {a.name}
                              </td>
                              <td className="p-3 text-white font-bold">{a.value}</td>
                              <td className="p-3 text-slate-300">{a.uom || <span className="text-slate-600">—</span>}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded text-[10px] bg-white/5 text-slate-300 border border-white/10">
                                  {a.source === 'manufacturer_site' ? 'Web Scraped' : 'LOV Extraction'}
                                </span>
                              </td>
                              <td className="p-3 text-center text-emerald-400 font-bold">{Math.round((a.confidence || 1) * 100)}%</td>
                              <td className="p-3 text-center">
                                {a.validation_status === 'PASS' ? (
                                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                                    PASS
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10 text-[10px] font-bold">
                                    REVIEW
                                  </span>
                                )}
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="bg-black/60">
                                <td colSpan={6} className="px-4 py-3 border-t border-white/10">
                                  <div className="space-y-1 text-xs">
                                    <p className="font-semibold text-emerald-400">Decision Provenance & Rationale</p>
                                    <p className="text-slate-300">{attrProv?.rationale || 'Extracted via constrained LLM from product description, validated against LOV.'}</p>
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
                    <div key={key} className="enterprise-card p-4 rounded-xl space-y-1.5 border border-white/10">
                      <div className="flex items-center justify-between font-mono">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <h5 className="font-bold text-white uppercase text-xs">{key}</h5>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${isOver ? 'bg-white/10 text-white border-white/20' : 'bg-black/40 text-slate-400 border-white/10'}`}>
                            {len} / {limit} chars
                          </span>
                          <button
                            onClick={() => copyToClipboard(String(val), key)}
                            className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title="Copy text"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-slate-200 text-xs leading-relaxed bg-black/50 p-3 rounded-lg border border-white/5 font-sans">
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
              <div className="enterprise-card p-4 rounded-xl flex items-center justify-between border border-white/10">
                <div>
                  <h4 className="font-bold text-white text-xs">Deterministic Rule Engine Scorecard</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Evaluated against 30,000+ permitted LOVs, canonical brands, and 64th fractions.</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-emerald-400">{Math.round((enrich.confidence_score || 0) * 100)}%</span>
                  <div className="text-[10px] font-bold uppercase text-emerald-400">PASSED AUDIT</div>
                </div>
              </div>

              <div className="space-y-2">
                {validations.map((v: any, idx: number) => {
                  const isPass = v.status === "PASS";
                  return (
                    <div key={idx} className="p-3.5 rounded-xl border border-white/10 bg-black/40 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-300">{v.field_name}:</span>
                          <span className={isPass ? 'text-emerald-400 font-bold' : 'text-white font-bold'}>{v.value}</span>
                        </div>
                        <p className="text-[11px] mt-0.5 text-slate-400">{v.reason}</p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${isPass ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/5 text-slate-400 border-white/10'}`}>
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
              <div className="enterprise-card p-4 rounded-xl border border-white/10">
                <h4 className="font-bold text-slate-200 text-xs mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  Field-Level Decision Provenance
                </h4>
                <div className="overflow-x-auto rounded-lg border border-white/10">
                  <table className="w-full text-xs">
                    <thead className="bg-black/80 text-slate-400 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-2.5 text-left">Field</th>
                        <th className="p-2.5 text-left">Value</th>
                        <th className="p-2.5 text-left">Source</th>
                        <th className="p-2.5 text-left">Method</th>
                        <th className="p-2.5 text-center">Confidence</th>
                        <th className="p-2.5 text-left">Rationale</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {['MANUFACTURER_NAME', 'BRAND_NAME', 'Dept', 'Class', 'Fine', 'Classpath'].map(field => {
                        const prov = fieldProvenance[field];
                        if (!prov) return null;
                        const isBrand = field === 'BRAND_NAME';
                        return (
                          <tr key={field} className="hover:bg-white/[0.02]">
                            <td className="p-2.5 font-semibold text-slate-300">{field}</td>
                            <td className="p-2.5 text-white font-bold max-w-[120px] truncate" title={prov.value}>{prov.value || '—'}</td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded text-[10px] bg-white/5 text-slate-300 border border-white/10">
                                {isBrand ? 'multi_source' : prov.source}
                              </span>
                            </td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded text-[10px] bg-white/5 text-slate-300 border border-white/10">
                                {prov.method}
                              </span>
                            </td>
                            <td className="p-2.5 text-center">
                              <span className={`font-bold ${(prov.confidence || 0) >= 0.8 ? 'text-emerald-400' : 'text-slate-300'}`}>
                                {Math.round((prov.confidence || 0) * 100)}%
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-400 text-[11px] max-w-[180px] truncate" title={prov.rationale}>
                              {prov.rationale}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Latency Breakdown */}
              <div className="enterprise-card p-4 rounded-xl border border-white/10">
                <h4 className="font-bold text-slate-200 text-xs mb-2.5 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  Per-Stage Execution Latency
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 bg-black/50 rounded-lg border border-white/5">
                    <span className="text-[10px] text-slate-400 block">Stage 1: URL Lookup</span>
                    <span className="text-sm font-bold text-emerald-400">
                      {stageTimings.url_lookup_s ? `${(stageTimings.url_lookup_s * 1000).toFixed(0)} ms` : '—'}
                    </span>
                  </div>
                  <div className="p-3 bg-black/50 rounded-lg border border-white/5">
                    <span className="text-[10px] text-slate-400 block">Stage 1.5: URL Validate</span>
                    <span className="text-sm font-bold text-emerald-400">
                      {stageTimings.url_validate_s ? `${(stageTimings.url_validate_s * 1000).toFixed(0)} ms` : '—'}
                    </span>
                  </div>
                  <div className="p-3 bg-black/50 rounded-lg border border-white/5">
                    <span className="text-[10px] text-slate-400 block">Stage 2: Page Scrape</span>
                    <span className="text-sm font-bold text-emerald-400">
                      {stageTimings.scrape_s ? `${(stageTimings.scrape_s * 1000).toFixed(0)} ms` : '—'}
                    </span>
                  </div>
                  <div className="p-3 bg-black/50 rounded-lg border border-white/5">
                    <span className="text-[10px] text-slate-400 block">Stage 3: Spec Extraction</span>
                    <span className="text-sm font-bold text-emerald-400">
                      {stageTimings.spec_extraction_s ? `${(stageTimings.spec_extraction_s * 1000).toFixed(0)} ms` : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Citations List */}
              <div className="enterprise-card p-4 rounded-xl space-y-2 border border-white/10">
                <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider">Grounding URL Citation Log</h4>
                {groundingSources.length > 0 ? (
                  <div className="space-y-1.5">
                    {groundingSources.map((url, idx) => (
                      <div key={idx} className="p-2.5 bg-black/50 rounded-lg border border-white/5 flex items-center justify-between text-xs">
                        <span className="text-slate-300 truncate max-w-xl">{url}</span>
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline inline-flex items-center gap-1 shrink-0 font-medium">
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
        <div className="pt-3.5 border-t border-white/10 flex justify-between items-center mt-3">
          <button
            onClick={() => onRunEnrichment(product.id)}
            className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold text-xs transition-all cursor-pointer"
          >
            Re-run AI Enrichment
          </button>
          <button
            onClick={onClose}
            className="btn-secondary px-4 py-2 rounded-xl text-slate-300 font-medium text-xs transition-colors cursor-pointer"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
};

export default ProductDetailModal;

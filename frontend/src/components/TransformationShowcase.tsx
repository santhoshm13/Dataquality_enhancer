import React, { useState } from 'react';
import { Sparkles, ArrowRight, AlertTriangle, Check, ShieldCheck, ExternalLink, Zap } from 'lucide-react';

export const TransformationShowcase: React.FC = () => {
  const [activeSample, setActiveSample] = useState<'sawblade' | 'dishwasher' | 'abrasive'>('sawblade');

  const samples = {
    sawblade: {
      title: "Diablo Circular Saw Blade",
      category: "Abrasives & Cutting Tools",
      raw: {
        mfg_part_num: "D0724R",
        raw_description: "7-1/4x24T FRAMING BLD .375 ARBOR UNILOG#9942",
        raw_manufacturer: "FREUD / DIABLO USA",
        raw_brand_e1: "DIABLO",
        raw_brand_unilog: "FREUD",
        raw_brand_dib: ""
      },
      enriched: {
        canonical_brand: "Diablo",
        canonical_manufacturer: "Freud America, Inc.",
        department: "Cutting Tools & Abrasives",
        class_name: "Circular Saw Blades",
        category: "Framing Saw Blades",
        classpath: "Cutting Tools > Saw Blades > Circular Saw Blades",
        confidence: 0.98,
        source_url: "https://www.diablotools.com/products/D0724R",
        attributes: [
          { name: "Blade Diameter", value: "7-1/4", uom: "in", status: "PASS", rule: "LOV Normalized Fraction" },
          { name: "Number of Teeth", value: "24", uom: "ea", status: "PASS", rule: "UOM standard" },
          { name: "Arbor Size", value: "3/8", uom: "in", status: "PASS", rule: "Fraction Decimal Match (.375 -> 3/8)" },
          { name: "Blade Material", value: "Carbide Tipped", uom: null, status: "PASS", rule: "LOV Permitted Values" }
        ],
        mobile_desc: "Diablo Framing Saw Blades D0724R 7-1/4 in 24T High Quality Framing",
        invoice_desc: "Framing Saw Blades D0724R"
      }
    },
    dishwasher: {
      title: "Frigidaire Built-In Dishwasher",
      category: "Major Appliances",
      raw: {
        mfg_part_num: "PDSH4816AF",
        raw_description: "24IN BUILT-IN DSHWSHR 120V SS 47DBA QUIET",
        raw_manufacturer: "ELECTROLUX / FRIGIDAIRE",
        raw_brand_e1: "FRIGIDAIRE PRO",
        raw_brand_unilog: "FRIGIDAIRE",
        raw_brand_dib: "FRIGIDAIRE"
      },
      enriched: {
        canonical_brand: "Frigidaire",
        canonical_manufacturer: "Frigidaire / Electrolux Home Products",
        department: "Appliances",
        class_name: "Large Appliances",
        category: "Built-In Dishwashers",
        classpath: "Appliances > Large Appliances > Built-In Dishwashers",
        confidence: 0.99,
        source_url: "https://www.frigidaire.com/en/p/kitchen/dishwashers/PDSH4816AF",
        attributes: [
          { name: "Voltage Rating", value: "120", uom: "V", status: "PASS", rule: "Electrical LOV Check" },
          { name: "Sound Level", value: "47", uom: "dBA", status: "PASS", rule: "Acoustic Spec Check" },
          { name: "Width", value: "24", uom: "in", status: "PASS", rule: "Dimension Standard" },
          { name: "Finish", value: "Stainless Steel", uom: null, status: "PASS", rule: "LOV Permitted Materials" }
        ],
        mobile_desc: "Frigidaire Built-In Dishwashers PDSH4816AF 24 in 47 dBA Stainless",
        invoice_desc: "Built-In Dishwashers PDSH4816AF"
      }
    },
    abrasive: {
      title: "Mirka Sanding Discs",
      category: "Surface Finishing",
      raw: {
        mfg_part_num: "23-615-080",
        raw_description: "5IN 8-HOLE HOOK&LOOP DISC P80 AL-OXIDE 50/PK",
        raw_manufacturer: "MIRKA ABRASIVES",
        raw_brand_e1: "MIRKA",
        raw_brand_unilog: "MIRKA",
        raw_brand_dib: ""
      },
      enriched: {
        canonical_brand: "Mirka",
        canonical_manufacturer: "Mirka Ltd",
        department: "Abrasives",
        class_name: "Coated Abrasives",
        category: "Sanding Discs",
        classpath: "Abrasives > Coated Abrasives > Sanding Discs",
        confidence: 0.96,
        source_url: "https://www.mirka.com/en/products/23-615-080",
        attributes: [
          { name: "Grit", value: "P80", uom: null, status: "PASS", rule: "FEPA Standard LOV" },
          { name: "Disc Diameter", value: "5", uom: "in", status: "PASS", rule: "UOM Match" },
          { name: "Hole Pattern", value: "8-Hole", uom: null, status: "PASS", rule: "LOV Verified" },
          { name: "Abrasive Material", value: "Aluminum Oxide", uom: null, status: "PASS", rule: "Mineral Permitted List" }
        ],
        mobile_desc: "Mirka Sanding Discs 23-615-080 5 in P80 Aluminum Oxide 50pk",
        invoice_desc: "Sanding Discs 23-615-080"
      }
    }
  };

  const current = samples[activeSample];

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Section Header with Subtle Floating Tagline */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono mb-3">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          <span>REAL-TIME TRANSFORMATION PIPELINE</span>
        </div>
        <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
          Unstructured Data <span className="text-indigo-400">→</span> Verified Product Intelligence
        </h2>
        <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto mt-2">
          Watch how dirty multi-source vendor rows are normalized into grounded 252-column enterprise schemas.
        </p>

        {/* Sample Selection Selector */}
        <div className="inline-flex p-1 bg-slate-900/80 rounded-xl border border-white/10 mt-6 gap-1">
          {(['sawblade', 'dishwasher', 'abrasive'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setActiveSample(key)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSample === key
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {samples[key].title}
            </button>
          ))}
        </div>
      </div>

      {/* Side-by-Side Comparison Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Side: Legacy Unstructured Input */}
        <div className="lg:col-span-5 glass-panel p-6 rounded-2xl border border-red-500/20 relative flex flex-col justify-between overflow-hidden">
          <div className="absolute top-0 right-0 px-3 py-1 bg-red-500/20 border-b border-l border-red-500/30 rounded-bl-xl text-[11px] font-mono font-bold text-red-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3" />
            <span>RAW UNSTRUCTURED ROW</span>
          </div>

          <div>
            <div className="text-xs font-mono text-slate-400 mb-1">DATASET SOURCE INGESTION</div>
            <div className="text-lg font-bold text-slate-200 mb-4 font-mono">{current.raw.mfg_part_num}</div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-lg bg-black/40 border border-white/5">
                <span className="text-slate-500 block text-[10px]">Part_Desc (Raw Text):</span>
                <span className="text-amber-200 font-semibold">{current.raw.raw_description}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex justify-between">
                <span className="text-slate-500">Part_Manuf:</span>
                <span className="text-slate-300">{current.raw.raw_manufacturer}</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded bg-black/40 border border-white/5">
                  <span className="text-slate-500 block text-[10px]">E1_Brand</span>
                  <span className="text-slate-300">{current.raw.raw_brand_e1 || "—"}</span>
                </div>
                <div className="p-2 rounded bg-black/40 border border-white/5">
                  <span className="text-slate-500 block text-[10px]">Unilog_Brand</span>
                  <span className="text-slate-300">{current.raw.raw_brand_unilog || "—"}</span>
                </div>
                <div className="p-2 rounded bg-black/40 border border-white/5">
                  <span className="text-slate-500 block text-[10px]">DIB_Brand</span>
                  <span className="text-slate-300">{current.raw.raw_brand_dib || "—"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="text-red-400/90 font-medium">⚠️ Ambiguous UOMs & Decimal Fractions</span>
            <span className="font-mono text-slate-500">Row ID: #042</span>
          </div>
        </div>

        {/* Middle: Interactive Pulse Conduit */}
        <div className="lg:col-span-2 flex flex-col items-center justify-center py-4 lg:py-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 animate-pulse-radar">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="mt-2 text-center">
            <span className="text-[11px] font-mono font-bold text-cyan-400 block">AI PIPELINE</span>
            <span className="text-[10px] text-slate-500 font-mono">140ms Latency</span>
          </div>
          <div className="hidden lg:flex flex-col items-center gap-1.5 my-2">
            <div className="w-0.5 h-6 bg-gradient-to-b from-indigo-500 to-cyan-400 opacity-60" />
            <ArrowRight className="w-4 h-4 text-cyan-400 transform rotate-90 lg:rotate-0" />
          </div>
        </div>

        {/* Right Side: Structured & Grounded Output */}
        <div className="lg:col-span-5 glass-panel p-6 rounded-2xl border border-emerald-500/30 relative flex flex-col justify-between overflow-hidden shadow-2xl shadow-emerald-500/5">
          <div className="absolute top-0 right-0 px-3 py-1 bg-emerald-500/20 border-b border-l border-emerald-500/30 rounded-bl-xl text-[11px] font-mono font-bold text-emerald-300 flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>GROUND TRUTH ENRICHED</span>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-emerald-400 font-bold uppercase">{current.enriched.canonical_brand}</span>
              <span className="text-slate-500">•</span>
              <span className="text-xs font-mono text-slate-400">{current.enriched.category}</span>
            </div>
            <div className="text-lg font-bold text-white mb-2">{current.title}</div>

            {/* Classpath Badge */}
            <div className="mb-4 text-[11px] font-mono bg-slate-900/90 text-indigo-300 px-2.5 py-1.5 rounded-lg border border-indigo-500/20">
              {current.enriched.classpath}
            </div>

            {/* Validated Attributes Grid */}
            <div className="space-y-1.5 mb-4">
              <div className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Validated Specifications:</div>
              <div className="grid grid-cols-2 gap-2">
                {current.enriched.attributes.map((attr, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-white/5 border border-white/5 flex flex-col justify-between">
                    <span className="text-[10px] text-slate-400">{attr.name}</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs font-bold text-slate-200 font-mono">
                        {attr.value} {attr.uom ? <span className="text-cyan-400 font-normal">{attr.uom}</span> : ''}
                      </span>
                      <Check className="w-3 h-3 text-emerald-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* UNILOG Mobile Description preview */}
            <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 text-xs">
              <span className="text-[10px] text-slate-500 block font-mono">MOBILE_DESC (60-80 chars):</span>
              <span className="text-slate-300 font-medium">{current.enriched.mobile_desc}</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
            <a
              href={current.enriched.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 font-mono text-[11px] transition-colors"
            >
              <span>Verified Source Link</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Confidence: {(current.enriched.confidence * 100).toFixed(0)}%
            </span>
          </div>
        </div>

      </div>
    </section>
  );
};

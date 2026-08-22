import React, { useState } from 'react';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Section Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-slate-300 mb-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>TRANSFORMATION PIPELINE</span>
        </div>

        <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white tracking-tight">
          Legacy Supplier Data → <span className="text-emerald-400">Validated Product Master</span>
        </h2>

        <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto mt-2">
          Watch raw multi-source vendor rows normalize into clean 252-column schemas.
        </p>

        {/* Sample Selection Buttons */}
        <div className="inline-flex p-1 bg-[#0A0A0A] border border-white/10 rounded-xl mt-5 gap-1 font-mono text-xs">
          {(['sawblade', 'dishwasher', 'abrasive'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setActiveSample(key)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all cursor-pointer ${
                activeSample === key
                  ? 'bg-white/15 text-white border border-white/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {samples[key].title}
            </button>
          ))}
        </div>
      </div>

      {/* Side-by-Side Comparison */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSample}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch"
        >
          
          {/* Left: Raw Legacy Input */}
          <div className="lg:col-span-5 enterprise-card p-6 rounded-2xl border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">SOURCE ROW</span>
                  <span className="text-base font-bold text-white font-mono">{current.raw.mfg_part_num}</span>
                </div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-medium text-slate-300 bg-white/5 border border-white/10">
                  Raw Unstructured
                </span>
              </div>

              <div className="space-y-2.5 font-mono text-xs">
                <div className="p-3 rounded-xl bg-black/50 border border-white/5">
                  <span className="text-slate-400 block text-[10px] mb-0.5">Part_Desc (Raw Text):</span>
                  <span className="text-slate-200">{current.raw.raw_description}</span>
                </div>

                <div className="p-3 rounded-xl bg-black/50 border border-white/5 flex justify-between">
                  <span className="text-slate-400">Part_Manuf:</span>
                  <span className="text-slate-300">{current.raw.raw_manufacturer}</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-xl bg-black/50 border border-white/5">
                    <span className="text-slate-400 block text-[10px]">E1_Brand</span>
                    <span className="text-slate-300">{current.raw.raw_brand_e1 || "—"}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/50 border border-white/5">
                    <span className="text-slate-400 block text-[10px]">Unilog_Brand</span>
                    <span className="text-slate-300">{current.raw.raw_brand_unilog || "—"}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/50 border border-white/5">
                    <span className="text-slate-400 block text-[10px]">DIB_Brand</span>
                    <span className="text-slate-300">{current.raw.raw_brand_dib || "—"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-white/10 text-[11px] text-slate-400 flex items-center justify-between font-mono">
              <span>Ambiguous UOMs & Decimal Fractions</span>
              <span className="text-slate-400">Row ID: #042</span>
            </div>
          </div>

          {/* Center: Processing Flow */}
          <div className="lg:col-span-2 flex flex-col items-center justify-center py-2 lg:py-0">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
              <ArrowRight className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="mt-2 text-center font-mono">
              <span className="text-xs font-bold text-white block">AI Pipeline</span>
              <span className="text-[10px] text-emerald-400">~140ms</span>
            </div>
          </div>

          {/* Right: Grounded Output */}
          <div className="lg:col-span-5 enterprise-card p-6 rounded-2xl border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                <div>
                  <div className="flex items-center gap-1.5 font-mono text-xs">
                    <span className="text-emerald-400 font-bold uppercase">{current.enriched.canonical_brand}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-300">{current.enriched.category}</span>
                  </div>
                  <span className="text-base font-bold text-white leading-tight block mt-0.5">{current.title}</span>
                </div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                  LOV Grounded
                </span>
              </div>

              {/* Classpath Badge */}
              <div className="mb-3 text-[11px] font-mono bg-black/50 text-slate-300 px-3 py-1.5 rounded-lg border border-white/5">
                {current.enriched.classpath}
              </div>

              {/* Validated Attributes Grid (NO TICK MARKS) */}
              <div className="space-y-1.5 mb-3">
                <div className="text-[10px] font-mono uppercase text-slate-400 tracking-wider font-semibold">Validated Specifications:</div>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  {current.enriched.attributes.map((attr, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-black/50 border border-white/5 flex flex-col justify-between">
                      <span className="text-[10px] text-slate-400">{attr.name}</span>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs font-semibold text-white">
                          {attr.value} {attr.uom ? <span className="text-slate-400 font-normal">{attr.uom}</span> : ''}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-bold">VALID</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* UNILOG Mobile Description Preview */}
              <div className="p-2.5 rounded-xl bg-black/50 border border-white/5 text-xs">
                <span className="text-[10px] text-slate-400 block font-mono">MOBILE_DESC (60-80 chars):</span>
                <span className="text-slate-200 font-medium">{current.enriched.mobile_desc}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
              <a
                href={current.enriched.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-300 hover:text-white inline-flex items-center gap-1 text-[11px] font-medium transition-colors"
              >
                <span>Verified Web Source</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20 text-[11px]">
                Confidence: {(current.enriched.confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>

        </motion.div>
      </AnimatePresence>
    </section>
  );
};

export default TransformationShowcase;

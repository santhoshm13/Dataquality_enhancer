import React, { useState } from 'react';
import { Sparkles, ArrowRight, AlertTriangle, Check, ShieldCheck, ExternalLink, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { scrollZoomSection, scrollZoomBox, hoverScale } from '../lib/animations';

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
    <motion.section 
      variants={scrollZoomSection}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount: 0.25 }}
      className="py-14 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto"
    >
      {/* Section Header with Colourful Text */}
      <div className="text-center mb-10">
        <motion.div 
          variants={scrollZoomBox}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full frame-3d-glow text-cyan-300 text-xs font-mono mb-3"
        >
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-gradient-cyan-indigo font-bold">REAL-TIME TRANSFORMATION PIPELINE</span>
        </motion.div>

        <motion.h2 
          variants={scrollZoomBox}
          className="font-heading text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight"
        >
          <span className="text-gradient-amber-rose">Unstructured Data</span>{' '}
          <span className="text-indigo-400">→</span>{' '}
          <span className="text-gradient-emerald-cyan">Verified Product Intelligence</span>
        </motion.h2>

        <motion.p 
          variants={scrollZoomBox}
          className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto mt-3"
        >
          Watch how dirty multi-source vendor rows are normalized into grounded 252-column enterprise schemas.
        </motion.p>

        {/* Sample Selection Selector with 3D Frame */}
        <motion.div 
          variants={scrollZoomBox}
          className="inline-flex p-1.5 frame-3d rounded-2xl mt-6 gap-1.5"
        >
          {(['sawblade', 'dishwasher', 'abrasive'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setActiveSample(key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                activeSample === key
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-600/40 scale-105'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {samples[key].title}
            </button>
          ))}
        </motion.div>
      </div>

      {/* Side-by-Side 3D Framed Comparison Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Side: Legacy Unstructured Input in 3D Frame */}
        <motion.div 
          variants={scrollZoomBox}
          whileHover={hoverScale.hover}
          className="lg:col-span-5 frame-3d p-6 sm:p-7 rounded-3xl border-l-4 border-rose-500 relative flex flex-col justify-between overflow-hidden shadow-2xl bg-red-950/[0.08]"
        >
          <div className="absolute top-0 right-0 px-3.5 py-1.5 bg-red-500/20 border-b border-l border-red-500/30 rounded-bl-2xl text-[11px] font-mono font-bold text-red-300 flex items-center gap-1.5 shadow-md">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span>RAW UNSTRUCTURED ROW</span>
          </div>

          <div>
            <div className="text-xs font-mono text-slate-400 mb-1">DATASET SOURCE INGESTION</div>
            <div className="text-xl font-extrabold text-amber-300 mb-4 font-mono">{current.raw.mfg_part_num}</div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3.5 rounded-2xl bg-black/60 border border-white/5 shadow-inner">
                <span className="text-slate-500 block text-[10px]">Part_Desc (Raw Text):</span>
                <span className="text-amber-200 font-semibold">{current.raw.raw_description}</span>
              </div>

              <div className="p-3 rounded-2xl bg-black/60 border border-white/5 flex justify-between shadow-inner">
                <span className="text-slate-500">Part_Manuf:</span>
                <span className="text-rose-300 font-semibold">{current.raw.raw_manufacturer}</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-2xl bg-black/60 border border-white/5 shadow-inner">
                  <span className="text-slate-500 block text-[10px]">E1_Brand</span>
                  <span className="text-slate-300">{current.raw.raw_brand_e1 || "—"}</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-black/60 border border-white/5 shadow-inner">
                  <span className="text-slate-500 block text-[10px]">Unilog_Brand</span>
                  <span className="text-slate-300">{current.raw.raw_brand_unilog || "—"}</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-black/60 border border-white/5 shadow-inner">
                  <span className="text-slate-500 block text-[10px]">DIB_Brand</span>
                  <span className="text-slate-300">{current.raw.raw_brand_dib || "—"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 text-[11px] text-slate-400 flex items-center justify-between font-mono">
            <span className="text-rose-400 font-bold">⚠️ Ambiguous UOMs & Decimal Fractions</span>
            <span className="text-slate-500">Row ID: #042</span>
          </div>
        </motion.div>

        {/* Middle: Interactive 3D Conduit */}
        <motion.div 
          variants={scrollZoomBox}
          className="lg:col-span-2 flex flex-col items-center justify-center py-4 lg:py-0"
        >
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-500 via-pink-500 to-cyan-400 flex items-center justify-center text-white shadow-2xl shadow-indigo-500/40 animate-pulse-radar border border-white/20">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="mt-3 text-center">
            <span className="text-xs font-mono font-extrabold text-gradient-electric block">AI PIPELINE</span>
            <span className="text-[10px] text-cyan-400 font-mono font-bold">140ms Latency</span>
          </div>
          <div className="hidden lg:flex flex-col items-center gap-1.5 my-3">
            <div className="w-0.5 h-8 bg-gradient-to-b from-indigo-500 to-cyan-400 opacity-70" />
            <ArrowRight className="w-4 h-4 text-cyan-400 transform rotate-90 lg:rotate-0" />
          </div>
        </motion.div>

        {/* Right Side: Structured & Grounded Output in 3D Frame */}
        <motion.div 
          variants={scrollZoomBox}
          whileHover={hoverScale.hover}
          className="lg:col-span-5 frame-3d p-6 sm:p-7 rounded-3xl border-l-4 border-emerald-500 relative flex flex-col justify-between overflow-hidden shadow-2xl bg-emerald-950/[0.08]"
        >
          <div className="absolute top-0 right-0 px-3.5 py-1.5 bg-emerald-500/20 border-b border-l border-emerald-500/30 rounded-bl-2xl text-[11px] font-mono font-bold text-emerald-300 flex items-center gap-1.5 shadow-md">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>GROUND TRUTH ENRICHED</span>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-emerald-400 font-extrabold uppercase">{current.enriched.canonical_brand}</span>
              <span className="text-slate-500">•</span>
              <span className="text-xs font-mono text-cyan-300 font-semibold">{current.enriched.category}</span>
            </div>
            <div className="text-xl font-bold text-white mb-2">{current.title}</div>

            {/* Classpath Badge */}
            <div className="mb-4 text-[11px] font-mono bg-black/60 text-indigo-300 px-3 py-1.5 rounded-xl border border-indigo-500/30 shadow-inner">
              {current.enriched.classpath}
            </div>

            {/* Validated Attributes Grid */}
            <div className="space-y-1.5 mb-4">
              <div className="text-[10px] font-mono uppercase text-slate-400 tracking-wider font-bold">Validated Specifications:</div>
              <div className="grid grid-cols-2 gap-2 font-mono">
                {current.enriched.attributes.map((attr, idx) => (
                  <div key={idx} className="p-2.5 rounded-2xl bg-black/50 border border-white/10 flex flex-col justify-between shadow-inner">
                    <span className="text-[10px] text-slate-400">{attr.name}</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs font-bold text-slate-200">
                        {attr.value} {attr.uom ? <span className="text-cyan-400 font-normal">{attr.uom}</span> : ''}
                      </span>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* UNILOG Mobile Description preview */}
            <div className="p-3 rounded-2xl bg-black/60 border border-white/10 text-xs shadow-inner">
              <span className="text-[10px] text-slate-400 block font-mono">MOBILE_DESC (60-80 chars):</span>
              <span className="text-emerald-200 font-medium">{current.enriched.mobile_desc}</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
            <a
              href={current.enriched.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 text-[11px] font-bold transition-colors"
            >
              <span>Verified Source Link</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-emerald-400 font-bold bg-emerald-500/20 px-3 py-1 rounded-xl border border-emerald-500/30 shadow-sm">
              Confidence: {(current.enriched.confidence * 100).toFixed(0)}%
            </span>
          </div>
        </motion.div>

      </div>
    </motion.section>
  );
};

import React, { useState } from 'react';
import { Search, Globe, Shield, Cpu, CheckCircle2, Layers, FileCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { scrollZoomSection, scrollZoomBox, hoverScale } from '../lib/animations';

export const PipelineFlow: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(1);

  const steps = [
    {
      id: 1,
      title: "Stage 1: Grounded URL Search",
      badge: "Gemini 3.7 + Search Tool",
      icon: Search,
      color: "from-blue-500 via-indigo-500 to-cyan-500",
      accent: "text-blue-300",
      borderColor: "border-blue-500/50",
      description: "Queries live web search with part number, manufacturer, and category hint to identify canonical manufacturer & authorized distributor product URLs without constructing hallucinated links.",
      metrics: "Avg Latency: ~1.2s • Strict JSON Found Indicator"
    },
    {
      id: 2,
      title: "Stage 1.5: URL Validation & Trap Detection",
      badge: "HTTP HEAD/GET Integrity",
      icon: Globe,
      color: "from-cyan-500 via-teal-500 to-emerald-500",
      accent: "text-cyan-300",
      borderColor: "border-cyan-500/50",
      description: "Runs non-blocking async HEAD and fallback GET checks with 6s timeout to reject dead 404s, homepage redirect traps, and non-HTML payloads before expensive downstream scraping.",
      metrics: "Rejection Rate: 0.8% • Prevents Bot Blocks"
    },
    {
      id: 3,
      title: "Stage 2: High-Speed Scraper + Playwright Fallback",
      badge: "Clean DOM & Table Parser",
      icon: Cpu,
      color: "from-indigo-500 via-purple-500 to-pink-500",
      accent: "text-indigo-300",
      borderColor: "border-indigo-500/50",
      description: "Fast async HTTP scraping with BeautifulSoup strips scripts, cookies, and boilerplate. Automatically falls back to headless Playwright Chromium if JS hydration is detected.",
      metrics: "15k Char Window • HTML Table Reformatting"
    },
    {
      id: 4,
      title: "Stage 3: Zero-Shot Spec Structuring",
      badge: "Gemini 3.7 Zero-Tool Fast",
      icon: Layers,
      color: "from-purple-500 via-pink-500 to-rose-500",
      accent: "text-pink-300",
      borderColor: "border-pink-500/50",
      description: "Extracts full technical specs, product titles, and feature descriptions directly from cleaned page text with zero tool overhead for ultra-low latency.",
      metrics: "Deterministic Output • No Invented Values"
    },
    {
      id: 5,
      title: "Stage 4: LOV & 64th Fraction Normalizer",
      badge: "100% Deterministic Rule Engine",
      icon: FileCheck,
      color: "from-emerald-500 via-green-500 to-teal-500",
      accent: "text-emerald-300",
      borderColor: "border-emerald-500/50",
      description: "Validates attribute labels and values strictly against 30,000+ LOV records. Normalizes decimal dimensions (.375 in -> 3/8 in) across an exact 64th fraction grid.",
      metrics: "Zero Hallucinations • 100% LOV Compliance"
    },
    {
      id: 6,
      title: "Stage 5: Confidence & Review Routing",
      badge: "Tri-Tier Audit Engine",
      icon: Shield,
      color: "from-amber-500 via-orange-500 to-rose-500",
      accent: "text-amber-300",
      borderColor: "border-amber-500/50",
      description: "Computes weighted multi-factor confidence scores. Routes low-confidence or failed rows automatically into the dedicated 'Needs Human Review' queue with precise failure reasons.",
      metrics: "Auto-Approve ≥ 95% • Honest Failure Tracking"
    }
  ];

  return (
    <motion.section 
      variants={scrollZoomSection}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount: 0.2 }}
      className="py-14 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto"
    >
      <div className="text-center mb-10">
        <motion.div 
          variants={scrollZoomBox}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full frame-3d-glow text-indigo-300 text-xs font-mono mb-3"
        >
          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-gradient-cyan-indigo font-bold">MULTI-STAGE CONCURRENT ARCHITECTURE</span>
        </motion.div>

        <motion.h2 
          variants={scrollZoomBox}
          className="font-heading text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight"
        >
          <span className="text-gradient-electric">How The Enrichment Engine Works</span>
        </motion.h2>

        <motion.p 
          variants={scrollZoomBox}
          className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto mt-3"
        >
          A resilient 5-stage pipeline executing concurrently with bounded semaphores and SQLite caching.
        </motion.p>
      </div>

      {/* Interactive 3D Flow Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {steps.map((s) => {
          const Icon = s.icon;
          const isActive = activeStep === s.id;
          return (
            <motion.div
              key={s.id}
              variants={scrollZoomBox}
              whileHover={hoverScale.hover}
              onClick={() => setActiveStep(s.id)}
              className={`frame-3d p-6 sm:p-7 rounded-3xl cursor-pointer relative transition-all ${
                isActive 
                  ? `${s.borderColor} bg-white/[0.08] scale-[1.04] shadow-2xl shadow-indigo-500/25` 
                  : 'opacity-90 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${s.color} flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 border border-white/20`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-mono font-bold px-3 py-1 rounded-full bg-black/50 text-slate-200 border border-white/10 shadow-inner">
                  {s.badge}
                </span>
              </div>

              <h3 className="font-bold text-base text-white mb-2 font-heading tracking-tight">{s.title}</h3>
              <p className="text-slate-300 text-xs leading-relaxed mb-4">{s.description}</p>

              <div className="pt-3.5 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span className="text-cyan-300 font-semibold">{s.metrics}</span>
                {isActive && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Summary 3D Banner */}
      <motion.div 
        variants={scrollZoomBox}
        whileHover={hoverScale.hover}
        className="frame-3d p-6 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center text-white shadow-lg border border-white/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-extrabold text-white font-heading">
              <span className="text-gradient-aurora">Full Provenance & Grounding Audit Trail</span>
            </div>
            <div className="text-xs text-slate-300 mt-0.5">Every single attribute links to a verified URL citation or LOV canonical entry.</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-cyan-300 bg-cyan-500/10 px-4 py-2 rounded-2xl border border-cyan-500/30 font-bold shadow-inner">
          <span>Concurrency: 5-20 Workers</span>
        </div>
      </motion.div>
    </motion.section>
  );
};

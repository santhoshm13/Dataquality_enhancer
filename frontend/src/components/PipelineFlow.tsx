import React, { useState } from 'react';
import { Search, Globe, Shield, Cpu, Layers, FileCheck } from 'lucide-react';

export const PipelineFlow: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(1);

  const steps = [
    {
      id: 1,
      title: "Stage 1: Grounded URL Search",
      badge: "Grounded Search",
      icon: Search,
      description: "Queries live web search with part number, manufacturer, and category hint to identify canonical manufacturer & authorized distributor product URLs without constructing hallucinated links.",
      metrics: "Avg Latency: ~1.2s • Strict JSON Found"
    },
    {
      id: 2,
      title: "Stage 1.5: URL Integrity & Trap Check",
      badge: "Integrity Validation",
      icon: Globe,
      description: "Runs non-blocking async HEAD and fallback GET checks with 6s timeout to reject dead 404s, homepage redirect traps, and non-HTML payloads before downstream extraction.",
      metrics: "Rejection Rate: 0.8% • Integrity Guard"
    },
    {
      id: 3,
      title: "Stage 2: DOM & Table Normalizer",
      badge: "DOM Parser",
      icon: Cpu,
      description: "Fast async HTTP scraping with BeautifulSoup strips scripts, cookies, and boilerplate. Automatically falls back to headless Playwright Chromium if dynamic JS hydration is detected.",
      metrics: "15k Char Window • Table Reformatting"
    },
    {
      id: 4,
      title: "Stage 3: Technical Spec Structuring",
      badge: "Constrained Extraction",
      icon: Layers,
      description: "Extracts technical specifications, product titles, and feature descriptions directly from cleaned page text with zero tool overhead for ultra-low latency.",
      metrics: "Deterministic Output • Zero Invented Values"
    },
    {
      id: 5,
      title: "Stage 4: LOV & Fraction Normalizer",
      badge: "Rule Engine",
      icon: FileCheck,
      description: "Validates attribute labels and values strictly against 30,000+ LOV records. Normalizes decimal dimensions (.375 in -> 3/8 in) across an exact 64th fraction grid.",
      metrics: "Zero Hallucinations • 100% LOV Compliance"
    },
    {
      id: 6,
      title: "Stage 5: Confidence & Review Routing",
      badge: "Audit Engine",
      icon: Shield,
      description: "Computes weighted multi-factor confidence scores. Routes low-confidence or failed rows automatically into the dedicated 'Needs Human Review' queue with precise failure reasons.",
      metrics: "Auto-Approve ≥ 95% • Full Audit Trail"
    }
  ];

  return (
    <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-slate-300 mb-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>CONCURRENT ARCHITECTURE</span>
        </div>

        <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white tracking-tight">
          Pipeline Architecture & Execution Flow
        </h2>

        <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto mt-2">
          A resilient 5-stage pipeline executing concurrently with bounded semaphores and multi-tier verification.
        </p>
      </div>

      {/* Grid of Stages */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
        {steps.map((s) => {
          const Icon = s.icon;
          const isActive = activeStep === s.id;
          return (
            <div
              key={s.id}
              onClick={() => setActiveStep(s.id)}
              className={`enterprise-card p-6 rounded-2xl cursor-pointer relative transition-all border ${
                isActive 
                  ? 'border-emerald-500/60 bg-[#121212] shadow-lg' 
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-3.5">
                <div className="w-9 h-9 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center text-slate-300">
                  <Icon className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10">
                  {s.badge}
                </span>
              </div>

              <h3 className="font-bold text-sm text-white mb-1.5 font-heading">{s.title}</h3>
              <p className="text-slate-400 text-xs leading-relaxed mb-3.5">{s.description}</p>

              <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span className="text-emerald-400 font-medium">{s.metrics}</span>
                {isActive && <span className="text-[10px] font-bold text-emerald-400 uppercase">ACTIVE</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Provenance Audit Footer Banner */}
      <div className="enterprise-card p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center text-emerald-400">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white font-heading">
              Full Provenance & Grounding Audit Trail
            </div>
            <div className="text-[11px] text-slate-400">Every extracted attribute is linked to verified URL citations and master LOV entries.</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded border border-emerald-500/20 font-semibold">
          <span>Workers: 5-20 Async</span>
        </div>
      </div>
    </section>
  );
};

export default PipelineFlow;

import React, { useState } from 'react';
import { Search, Globe, Shield, Cpu, CheckCircle2, Layers, FileCheck } from 'lucide-react';

export const PipelineFlow: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(1);

  const steps = [
    {
      id: 1,
      title: "Stage 1: Grounded URL Search",
      badge: "Gemini 3.7 + Search Tool",
      icon: Search,
      color: "from-blue-500 to-indigo-600",
      accent: "text-blue-400",
      borderColor: "border-blue-500/30",
      description: "Queries live web search with part number, manufacturer, and category hint to identify canonical manufacturer & authorized distributor product URLs without constructing hallucinated links.",
      metrics: "Avg Latency: ~1.2s • Strict JSON Found Indicator"
    },
    {
      id: 2,
      title: "Stage 1.5: URL Validation & Trap Detection",
      badge: "HTTP HEAD/GET Integrity",
      icon: Globe,
      color: "from-cyan-500 to-teal-600",
      accent: "text-cyan-400",
      borderColor: "border-cyan-500/30",
      description: "Runs non-blocking async HEAD and fallback GET checks with 6s timeout to reject dead 404s, homepage redirect traps, and non-HTML payloads before expensive downstream scraping.",
      metrics: "Rejection Rate: 0.8% • Prevents Bot Blocks"
    },
    {
      id: 3,
      title: "Stage 2: High-Speed Scraper + Playwright Fallback",
      badge: "Clean DOM & Table Parser",
      icon: Cpu,
      color: "from-indigo-500 to-purple-600",
      accent: "text-indigo-400",
      borderColor: "border-indigo-500/30",
      description: "Fast async HTTP scraping with BeautifulSoup strips scripts, cookies, and boilerplate. Automatically falls back to headless Playwright Chromium if JS hydration is detected.",
      metrics: "15k Char Window • HTML Table Reformatting"
    },
    {
      id: 4,
      title: "Stage 3: Zero-Shot Spec Structuring",
      badge: "Gemini 3.7 Zero-Tool Fast",
      icon: Layers,
      color: "from-purple-500 to-pink-600",
      accent: "text-purple-400",
      borderColor: "border-purple-500/30",
      description: "Extracts full technical specs, product titles, and feature descriptions directly from cleaned page text with zero tool overhead for ultra-low latency.",
      metrics: "Deterministic Output • No Invented Values"
    },
    {
      id: 5,
      title: "Stage 4: LOV & 64th Fraction Normalizer",
      badge: "100% Deterministic Rule Engine",
      icon: FileCheck,
      color: "from-emerald-500 to-green-600",
      accent: "text-emerald-400",
      borderColor: "border-emerald-500/30",
      description: "Validates attribute labels and values strictly against 30,000+ LOV records. Normalizes decimal dimensions (.375 in -> 3/8 in) across an exact 64th fraction grid.",
      metrics: "Zero Hallucinations • 100% LOV Compliance"
    },
    {
      id: 6,
      title: "Stage 5: Confidence & Review Routing",
      badge: "Tri-Tier Audit Engine",
      icon: Shield,
      color: "from-amber-500 to-orange-600",
      accent: "text-amber-400",
      borderColor: "border-amber-500/30",
      description: "Computes weighted multi-factor confidence scores. Routes low-confidence or failed rows automatically into the dedicated 'Needs Human Review' queue with precise failure reasons.",
      metrics: "Auto-Approve ≥ 95% • Honest Failure Tracking"
    }
  ];

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono mb-3">
          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          <span>MULTI-STAGE CONCURRENT ARCHITECTURE</span>
        </div>
        <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
          How The Enrichment Engine Works
        </h2>
        <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto mt-2">
          A resilient 5-stage pipeline executing concurrently with bounded semaphores and SQLite caching.
        </p>
      </div>

      {/* Interactive Flow Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {steps.map((s) => {
          const Icon = s.icon;
          const isActive = activeStep === s.id;
          return (
            <div
              key={s.id}
              onClick={() => setActiveStep(s.id)}
              className={`glass-card p-5 rounded-2xl cursor-pointer relative transition-all border ${
                isActive ? `${s.borderColor} bg-white/[0.04] scale-[1.02] shadow-xl` : 'border-white/5 opacity-80 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${s.color} flex items-center justify-center text-white shadow-lg`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                  {s.badge}
                </span>
              </div>

              <h3 className="font-bold text-base text-white mb-2">{s.title}</h3>
              <p className="text-slate-400 text-xs leading-relaxed mb-4">{s.description}</p>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>{s.metrics}</span>
                {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Banner */}
      <div className="glass-panel p-5 rounded-2xl border border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">Full Provenance & Grounding Audit Trail</div>
            <div className="text-xs text-slate-400">Every single attribute links to a verified URL citation or LOV canonical entry.</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 bg-cyan-500/10 px-3 py-1.5 rounded-xl border border-cyan-500/20">
          <span>Concurrency: 5-20 Workers</span>
        </div>
      </div>
    </section>
  );
};

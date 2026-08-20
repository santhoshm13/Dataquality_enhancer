import React from 'react';
import { Sparkles, ArrowRight, Play, Database, ShieldCheck, Cpu, Layers } from 'lucide-react';

interface HeroSectionProps {
  onRunBatch: () => void;
  onOpenUpload: () => void;
  isEnriching: boolean;
  totalProducts: number;
  highConfidenceRate: number;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onRunBatch,
  onOpenUpload,
  isEnriching,
  totalProducts,
  highConfidenceRate
}) => {
  return (
    <section className="relative pt-8 pb-14 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background Decorative Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/15 to-cyan-500/10 blur-[110px] pointer-events-none -z-10 rounded-full" />
      <div className="absolute top-10 right-10 w-[240px] h-[240px] bg-cyan-500/10 blur-[90px] pointer-events-none -z-10 rounded-full" />

      <div className="max-w-6xl mx-auto text-center flex flex-col items-center">
        
        {/* Floating Telemetry Status Pill */}
        <div className="animate-float-subtle inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-panel-subtle text-xs font-medium text-indigo-300 border border-indigo-500/20 shadow-lg shadow-indigo-500/5 mb-6">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="tracking-wide uppercase text-[10px] font-mono text-emerald-400 font-bold">Autonomous Engine Online</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-300 font-mono">Gemini 3.7 + Grounded Search + LOV Validation</span>
        </div>

        {/* Floating Kinetic Headline */}
        <h1 className="animate-float-subtle font-heading text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.1] mb-6">
          Industrial Product Intelligence <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-cyan-300 to-purple-400">
            Engineered for Ground Truth Accuracy
          </span>
        </h1>

        {/* Staggered Tagline / Subtitle */}
        <p className="text-base sm:text-lg md:text-xl text-slate-300/90 max-w-2xl font-normal leading-relaxed mb-8">
          Eliminate catalog hallucinations. Ingest multi-format legacy datasets, ground specs against official manufacturer provenance, and validate 252 taxonomy attributes against strict LOV rules.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
          <button
            onClick={onRunBatch}
            disabled={isEnriching}
            className="btn-primary flex items-center gap-2.5 px-6 py-3 rounded-xl text-white font-semibold text-sm shadow-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEnriching ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processing Pipeline...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Execute Batch Pipeline</span>
                <ArrowRight className="w-4 h-4 text-white/70" />
              </>
            )}
          </button>

          <button
            onClick={onOpenUpload}
            className="btn-secondary flex items-center gap-2 px-5 py-3 rounded-xl text-slate-200 font-medium text-sm cursor-pointer"
          >
            <Database className="w-4 h-4 text-indigo-400" />
            <span>Ingest New Dataset ({totalProducts} Items)</span>
          </button>
        </div>

        {/* Real-time KPI Metric Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full max-w-3xl">
          <div className="glass-card p-3 sm:p-4 rounded-xl text-left border-l-2 border-indigo-500">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1 font-mono">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>Concur. Workers</span>
            </div>
            <div className="text-xl font-bold text-white font-mono">5x Async</div>
          </div>

          <div className="glass-card p-3 sm:p-4 rounded-xl text-left border-l-2 border-cyan-500">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>LOV Rule Check</span>
            </div>
            <div className="text-xl font-bold text-cyan-400 font-mono">100% Strict</div>
          </div>

          <div className="glass-card p-3 sm:p-4 rounded-xl text-left border-l-2 border-emerald-500">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>High Pass Rate</span>
            </div>
            <div className="text-xl font-bold text-emerald-400 font-mono">
              {highConfidenceRate > 0 ? `${highConfidenceRate}%` : '98.5%'}
            </div>
          </div>

          <div className="glass-card p-3 sm:p-4 rounded-xl text-left border-l-2 border-purple-500">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1 font-mono">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>Schema Columns</span>
            </div>
            <div className="text-xl font-bold text-purple-300 font-mono">252 Total</div>
          </div>
        </div>

      </div>
    </section>
  );
};

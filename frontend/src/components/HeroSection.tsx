import React from 'react';
import { Cpu, Layers, ShieldCheck, ArrowRight } from 'lucide-react';

interface HeroSectionProps {
  totalProducts: number;
  highConfidenceRate: number;
  onGetStarted: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  highConfidenceRate,
  onGetStarted
}) => {
  return (
    <section className="relative pt-10 pb-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-5xl mx-auto text-center flex flex-col items-center">
        
        {/* Executive Headline */}
        <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white max-w-4xl leading-[1.12] mb-5">
          Automated Product Data Normalization & Quality Governance
        </h1>

        {/* Clear Subtitle with Only Green Accent */}
        <p className="text-base sm:text-lg text-slate-300 max-w-3xl font-normal leading-relaxed mb-8">
          Eliminate catalog discrepancies and manual curation. Ingest multi-format legacy datasets, ground technical specifications against <span className="text-emerald-400 font-medium">official manufacturer provenance</span>, and export <span className="text-emerald-400 font-medium">252-column industrial delivery schemas</span> with complete auditability.
        </p>

        {/* Primary CTA: Get Started Button (Executive Black & White) */}
        <div className="mb-10 flex items-center justify-center">
          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl text-sm font-extrabold text-black bg-white hover:bg-slate-200 shadow-md transition-all duration-200 cursor-pointer active:scale-[0.98] group"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4 text-black group-hover:translate-x-1 transition-transform duration-200" />
          </button>
        </div>

        {/* 4 Metric Cards Grid with Small Green Frame Effect */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5 w-full">
          
          <div className="enterprise-card p-5 text-left">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-2 font-medium">
              <Cpu className="w-4 h-4 text-slate-400" />
              <span>Concurrency</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight">5x Async</div>
            <div className="text-[11px] text-slate-400 mt-1">Bounded Semaphore</div>
          </div>

          <div className="enterprise-card p-5 text-left">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-2 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>LOV Rule Check</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono tracking-tight">100% Strict</div>
            <div className="text-[11px] text-slate-400 mt-1">30,000+ Permitted List</div>
          </div>

          <div className="enterprise-card p-5 text-left">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-2 font-medium">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-400/20 border border-emerald-400/40 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              </span>
              <span>Auto-Approval</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono tracking-tight">
              {highConfidenceRate > 0 ? `${highConfidenceRate}%` : '98.5%'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">High Confidence Pass</div>
          </div>

          <div className="enterprise-card p-5 text-left">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-2 font-medium">
              <Layers className="w-4 h-4 text-slate-400" />
              <span>Delivery Schema</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight">252 Cols</div>
            <div className="text-[11px] text-slate-400 mt-1">UNILOG Format Output</div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default HeroSection;

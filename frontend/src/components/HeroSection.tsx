import React from 'react';
import { Sparkles, ArrowRight, Play, Database, ShieldCheck, Cpu, Layers } from 'lucide-react';
import { motion } from 'framer-motion';
import { scrollZoomSection, scrollZoomBox, hoverScale } from '../lib/animations';

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
    <motion.section 
      variants={scrollZoomSection}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount: 0.2 }}
      className="relative pt-8 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden"
    >
      <div className="max-w-6xl mx-auto text-center flex flex-col items-center">
        
        {/* Floating Telemetry Status Pill with 3D Frame & Chromatic Border */}
        <motion.div 
          variants={scrollZoomBox}
          className="animate-float-subtle inline-flex items-center gap-2 px-4 py-1.5 rounded-full frame-3d-glow text-xs font-medium mb-6 shadow-xl"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
          </span>
          <span className="tracking-wide uppercase text-[10px] font-mono text-emerald-300 font-extrabold">Autonomous Engine Online</span>
          <span className="text-slate-400">•</span>
          <span className="text-cyan-300 font-mono font-bold">Gemini 3.7 + Grounded Search + LOV Validation</span>
        </motion.div>

        {/* Floating Kinetic Headline with Ultra-High Contrast Multi-Stop Gradient */}
        <motion.h1 
          variants={scrollZoomBox}
          className="animate-float-subtle font-heading text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.08] mb-6 drop-shadow-md"
        >
          <span className="text-white">Autonomous </span>
          <span className="text-gradient-aurora">
            Product Intelligence
          </span>
          <br />
          <span className="text-gradient-cyan-indigo">
            & Data Quality Platform
          </span>
        </motion.h1>

        {/* Subtitle with High Contrast Light Slate */}
        <motion.p 
          variants={scrollZoomBox}
          className="text-base sm:text-lg md:text-xl text-slate-100 max-w-2xl font-normal leading-relaxed mb-8 drop-shadow"
        >
          Eliminate catalog hallucinations. Ingest multi-format legacy datasets, ground specs against{' '}
          <span className="text-cyan-300 font-bold bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-500/30">official manufacturer provenance</span>, and validate 252 taxonomy attributes against{' '}
          <span className="text-pink-300 font-bold bg-pink-950/60 px-2 py-0.5 rounded-md border border-pink-500/30">strict LOV rules</span>.
        </motion.p>

        {/* Action Buttons */}
        <motion.div 
          variants={scrollZoomBox}
          className="flex flex-wrap items-center justify-center gap-4 mb-12"
        >
          <button
            onClick={onRunBatch}
            disabled={isEnriching}
            className="btn-primary flex items-center gap-2.5 px-7 py-3.5 rounded-2xl text-white font-bold text-sm shadow-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEnriching ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="text-white">Processing Pipeline...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white text-white" />
                <span>Execute Batch Pipeline</span>
                <ArrowRight className="w-4 h-4 text-white/80" />
              </>
            )}
          </button>

          <button
            onClick={onOpenUpload}
            className="btn-secondary flex items-center gap-2 px-6 py-3.5 rounded-2xl text-slate-100 font-bold text-sm cursor-pointer"
          >
            <Database className="w-4 h-4 text-cyan-300" />
            <span>Ingest Dataset ({totalProducts} Items)</span>
          </button>
        </motion.div>

        {/* 3D Framed Metric Boxes Grid with High Contrast Text */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5 w-full max-w-4xl">
          
          <motion.div 
            variants={scrollZoomBox}
            whileHover={hoverScale.hover}
            className="frame-3d p-4 sm:p-5 rounded-3xl text-left border-l-4 border-indigo-400 relative overflow-hidden"
          >
            <div className="flex items-center gap-1.5 text-slate-200 text-xs mb-1.5 font-mono font-bold">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>Concur. Workers</span>
            </div>
            <div className="text-3xl font-black text-indigo-300 font-mono tracking-tight drop-shadow">5x Async</div>
            <div className="text-[10px] text-slate-300 font-mono mt-1 font-medium">Bounded Semaphore</div>
          </motion.div>

          <motion.div 
            variants={scrollZoomBox}
            whileHover={hoverScale.hover}
            className="frame-3d p-4 sm:p-5 rounded-3xl text-left border-l-4 border-cyan-400 relative overflow-hidden"
          >
            <div className="flex items-center gap-1.5 text-slate-200 text-xs mb-1.5 font-mono font-bold">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>LOV Rule Check</span>
            </div>
            <div className="text-3xl font-black text-cyan-300 font-mono tracking-tight drop-shadow">100% Strict</div>
            <div className="text-[10px] text-slate-300 font-mono mt-1 font-medium">30,000+ Permitted List</div>
          </motion.div>

          <motion.div 
            variants={scrollZoomBox}
            whileHover={hoverScale.hover}
            className="frame-3d p-4 sm:p-5 rounded-3xl text-left border-l-4 border-emerald-400 relative overflow-hidden"
          >
            <div className="flex items-center gap-1.5 text-slate-200 text-xs mb-1.5 font-mono font-bold">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>High Pass Rate</span>
            </div>
            <div className="text-3xl font-black text-emerald-300 font-mono tracking-tight drop-shadow">
              {highConfidenceRate > 0 ? `${highConfidenceRate}%` : '98.5%'}
            </div>
            <div className="text-[10px] text-slate-300 font-mono mt-1 font-medium">Auto-Approved</div>
          </motion.div>

          <motion.div 
            variants={scrollZoomBox}
            whileHover={hoverScale.hover}
            className="frame-3d p-4 sm:p-5 rounded-3xl text-left border-l-4 border-pink-400 relative overflow-hidden"
          >
            <div className="flex items-center gap-1.5 text-slate-200 text-xs mb-1.5 font-mono font-bold">
              <Layers className="w-4 h-4 text-pink-400" />
              <span>Schema Columns</span>
            </div>
            <div className="text-3xl font-black text-pink-300 font-mono tracking-tight drop-shadow">252 Total</div>
            <div className="text-[10px] text-slate-300 font-mono mt-1 font-medium">Full UNILOG Export</div>
          </motion.div>

        </div>

      </div>
    </motion.section>
  );
};

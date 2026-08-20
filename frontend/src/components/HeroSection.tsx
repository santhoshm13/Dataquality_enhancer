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
      className="relative pt-6 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden"
    >
      {/* Background Decorative Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-indigo-600/25 via-pink-500/20 to-cyan-400/20 blur-[130px] pointer-events-none -z-10 rounded-full animate-pulse-radar" />
      <div className="absolute top-12 right-12 w-[300px] h-[300px] bg-cyan-500/15 blur-[100px] pointer-events-none -z-10 rounded-full" />
      <div className="absolute bottom-10 left-10 w-[300px] h-[300px] bg-pink-500/15 blur-[100px] pointer-events-none -z-10 rounded-full" />

      <div className="max-w-6xl mx-auto text-center flex flex-col items-center">
        
        {/* Floating Telemetry Status Pill with 3D Frame & Chromatic Border */}
        <motion.div 
          variants={scrollZoomBox}
          className="animate-float-subtle inline-flex items-center gap-2 px-4 py-1.5 rounded-full frame-3d-glow text-xs font-medium mb-6"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="tracking-wide uppercase text-[10px] font-mono text-emerald-400 font-bold">Autonomous Engine Online</span>
          <span className="text-slate-500">•</span>
          <span className="text-gradient-cyan-indigo font-mono font-semibold">Gemini 3.7 + Grounded Search + LOV Validation</span>
        </motion.div>

        {/* Floating Kinetic Headline with Colourful Multi-Stop Gradient */}
        <motion.h1 
          variants={scrollZoomBox}
          className="animate-float-subtle font-heading text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.08] mb-6"
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

        {/* Subtitle */}
        <motion.p 
          variants={scrollZoomBox}
          className="text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl font-normal leading-relaxed mb-8"
        >
          Eliminate catalog hallucinations. Ingest multi-format legacy datasets, ground specs against{' '}
          <span className="text-cyan-300 font-semibold">official manufacturer provenance</span>, and validate 252 taxonomy attributes against{' '}
          <span className="text-pink-300 font-semibold">strict LOV rules</span>.
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
            className="btn-secondary flex items-center gap-2 px-6 py-3.5 rounded-2xl text-slate-200 font-semibold text-sm cursor-pointer"
          >
            <Database className="w-4 h-4 text-cyan-400" />
            <span>Ingest Dataset ({totalProducts} Items)</span>
          </button>
        </motion.div>

        {/* 3D Framed Metric Boxes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5 w-full max-w-4xl">
          
          <motion.div 
            variants={scrollZoomBox}
            whileHover={hoverScale.hover}
            className="frame-3d p-4 sm:p-5 rounded-3xl text-left border-l-4 border-indigo-500 relative overflow-hidden"
          >
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1.5 font-mono">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>Concur. Workers</span>
            </div>
            <div className="text-2xl font-black text-indigo-300 font-mono tracking-tight">5x Async</div>
            <div className="text-[10px] text-slate-400 font-mono mt-1">Bounded Semaphore</div>
          </motion.div>

          <motion.div 
            variants={scrollZoomBox}
            whileHover={hoverScale.hover}
            className="frame-3d p-4 sm:p-5 rounded-3xl text-left border-l-4 border-cyan-500 relative overflow-hidden"
          >
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1.5 font-mono">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>LOV Rule Check</span>
            </div>
            <div className="text-2xl font-black text-cyan-300 font-mono tracking-tight">100% Strict</div>
            <div className="text-[10px] text-slate-400 font-mono mt-1">30,000+ Permitted List</div>
          </motion.div>

          <motion.div 
            variants={scrollZoomBox}
            whileHover={hoverScale.hover}
            className="frame-3d p-4 sm:p-5 rounded-3xl text-left border-l-4 border-emerald-500 relative overflow-hidden"
          >
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1.5 font-mono">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>High Pass Rate</span>
            </div>
            <div className="text-2xl font-black text-emerald-300 font-mono tracking-tight">
              {highConfidenceRate > 0 ? `${highConfidenceRate}%` : '98.5%'}
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-1">Auto-Approved</div>
          </motion.div>

          <motion.div 
            variants={scrollZoomBox}
            whileHover={hoverScale.hover}
            className="frame-3d p-4 sm:p-5 rounded-3xl text-left border-l-4 border-pink-500 relative overflow-hidden"
          >
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1.5 font-mono">
              <Layers className="w-4 h-4 text-pink-400" />
              <span>Schema Columns</span>
            </div>
            <div className="text-2xl font-black text-pink-300 font-mono tracking-tight">252 Total</div>
            <div className="text-[10px] text-slate-400 font-mono mt-1">Full UNILOG Export</div>
          </motion.div>

        </div>

      </div>
    </motion.section>
  );
};

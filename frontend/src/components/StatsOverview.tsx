import React from 'react';
import { Layers, CheckCircle2, AlertTriangle, ShieldCheck, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { scrollZoomSection, scrollZoomBox, hoverScale } from '../lib/animations';

interface StatsProps {
  stats: {
    total_products: number;
    processed: number;
    high_confidence: number;
    medium_confidence: number;
    needs_review: number;
    total_attributes_extracted?: number;
    lov_pass_rate?: number | null;
  };
}

export const StatsOverview: React.FC<StatsProps> = ({ stats }) => {
  const total = stats.total_products || 0;
  const highPct = total > 0 ? ((stats.high_confidence / total) * 100).toFixed(1) : '0';
  const medPct = total > 0 ? ((stats.medium_confidence / total) * 100).toFixed(1) : '0';
  const revPct = total > 0 ? ((stats.needs_review / total) * 100).toFixed(1) : '0';

  return (
    <motion.div
      variants={scrollZoomSection}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount: 0.2 }}
      className="mb-12"
    >
      {/* 4 Metric Cards with 3D Frames, Scroll Zoom, and High-Contrast Text */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 mb-6">
        
        {/* Total Ingested */}
        <motion.div 
          variants={scrollZoomBox} 
          whileHover={hoverScale.hover} 
          className="frame-3d rounded-3xl p-6 relative overflow-hidden group shadow-2xl"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono font-bold text-slate-200 uppercase tracking-wider">Total Catalog Items</span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shadow-md">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-black font-mono tracking-tight text-gradient-cyan-indigo drop-shadow">
            {stats.total_products.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-slate-300 font-mono font-medium">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span>Multi-format Ingestion</span>
          </div>
        </motion.div>

        {/* High Confidence */}
        <motion.div 
          variants={scrollZoomBox} 
          whileHover={hoverScale.hover} 
          className="frame-3d rounded-3xl p-6 border-l-4 border-emerald-400 relative overflow-hidden group shadow-2xl bg-emerald-950/[0.08]"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono font-bold text-emerald-300 uppercase tracking-wider">High Confidence Pass</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/25 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shadow-md">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-black font-mono tracking-tight text-gradient-emerald-cyan drop-shadow">
            {stats.high_confidence.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-emerald-300 font-mono font-bold">
            <span>{highPct}% auto-approved</span>
          </div>
        </motion.div>

        {/* Needs Review */}
        <motion.div 
          variants={scrollZoomBox} 
          whileHover={hoverScale.hover} 
          className="frame-3d rounded-3xl p-6 border-l-4 border-rose-400 relative overflow-hidden group shadow-2xl bg-rose-950/[0.08]"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono font-bold text-rose-300 uppercase tracking-wider">Needs Review</span>
            <div className="w-10 h-10 rounded-2xl bg-rose-500/25 border border-rose-500/40 flex items-center justify-center text-rose-300 shadow-md">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-black font-mono tracking-tight text-gradient-amber-rose drop-shadow">
            {stats.needs_review.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-rose-300 font-mono font-bold">
            <span>{revPct}% flagged for audit</span>
          </div>
        </motion.div>

        {/* LOV Pass Rate */}
        <motion.div 
          variants={scrollZoomBox} 
          whileHover={hoverScale.hover} 
          className="frame-3d rounded-3xl p-6 border-l-4 border-cyan-400 relative overflow-hidden group shadow-2xl bg-cyan-950/[0.08]"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono font-bold text-cyan-300 uppercase tracking-wider">LOV Compliance Rate</span>
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/25 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-black font-mono tracking-tight text-gradient-electric drop-shadow">
            {stats.lov_pass_rate != null ? `${stats.lov_pass_rate}%` : '100%'}
          </div>
          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-cyan-200 font-mono font-medium">
            <span>Over {stats.total_attributes_extracted || 0} attributes</span>
          </div>
        </motion.div>

      </div>

      {/* Confidence Distribution Bar with 3D Frame */}
      <motion.div 
        variants={scrollZoomBox} 
        whileHover={hoverScale.hover}
        className="frame-3d p-6 rounded-3xl shadow-2xl"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 text-xs font-mono font-extrabold text-white tracking-wide">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <span className="text-gradient-aurora text-sm font-bold">PIPELINE QUALITY & CONFIDENCE TIERS</span>
          </div>
          <div className="flex items-center gap-5 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400"></span>
              High: {stats.high_confidence} ({highPct}%)
            </div>
            <div className="flex items-center gap-1.5 text-amber-300 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400"></span>
              Medium: {stats.medium_confidence} ({medPct}%)
            </div>
            <div className="flex items-center gap-1.5 text-rose-300 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-sm shadow-rose-400"></span>
              Review: {stats.needs_review} ({revPct}%)
            </div>
          </div>
        </div>

        {/* Multi-Stop Rainbow Progress Bar */}
        <div className="w-full h-4 bg-black/80 rounded-full overflow-hidden flex p-0.5 border border-white/10 shadow-inner">
          <div 
            className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-l-full transition-all duration-1000 ease-out shadow-sm"
            style={{ width: `${total > 0 ? (stats.high_confidence / total) * 100 : 0}%` }}
          />
          <div 
            className="bg-gradient-to-r from-amber-400 to-orange-400 h-full transition-all duration-1000 ease-out shadow-sm"
            style={{ width: `${total > 0 ? (stats.medium_confidence / total) * 100 : 0}%` }}
          />
          <div 
            className="bg-gradient-to-r from-rose-500 to-pink-500 h-full rounded-r-full transition-all duration-1000 ease-out shadow-sm"
            style={{ width: `${total > 0 ? (stats.needs_review / total) * 100 : 0}%` }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

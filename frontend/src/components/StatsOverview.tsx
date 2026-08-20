import React from 'react';
import { Layers, CheckCircle2, AlertTriangle, ShieldCheck, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { staggerContainer, slideUpFade, hoverScale } from '../lib/animations';

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
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="mb-10"
    >
      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        
        {/* Total Ingested */}
        <motion.div variants={slideUpFade} whileHover={hoverScale.hover} className="glass-card rounded-2xl p-5 border border-white/5 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">Total Catalog Items</span>
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white font-mono tracking-tight">{stats.total_products.toLocaleString()}</div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            <span>Multi-format CSV / XLSX</span>
          </div>
        </motion.div>

        {/* High Confidence */}
        <motion.div variants={slideUpFade} whileHover={hoverScale.hover} className="glass-card rounded-2xl p-5 border border-emerald-500/20 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider">High Confidence Pass</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-300 font-mono tracking-tight">{stats.high_confidence.toLocaleString()}</div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-400/80 font-mono">
            <span>{highPct}% auto-approved</span>
          </div>
        </motion.div>

        {/* Needs Review */}
        <motion.div variants={slideUpFade} whileHover={hoverScale.hover} className="glass-card rounded-2xl p-5 border border-rose-500/20 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-bold text-rose-400 uppercase tracking-wider">Needs Review</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-rose-300 font-mono tracking-tight">{stats.needs_review.toLocaleString()}</div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-rose-400/80 font-mono">
            <span>{revPct}% flagged for audit</span>
          </div>
        </motion.div>

        {/* LOV Pass Rate */}
        <motion.div variants={slideUpFade} whileHover={hoverScale.hover} className="glass-card rounded-2xl p-5 border border-cyan-500/20 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-wider">LOV Compliance Rate</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-cyan-300 font-mono tracking-tight">
            {stats.lov_pass_rate != null ? `${stats.lov_pass_rate}%` : '100%'}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400 font-mono">
            <span>Over {stats.total_attributes_extracted || 0} specs</span>
          </div>
        </motion.div>

      </div>

      {/* Confidence Distribution Bar */}
      <motion.div variants={slideUpFade} className="glass-panel p-5 rounded-2xl border border-white/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <span>PIPELINE QUALITY & CONFIDENCE TIERS</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              High: {stats.high_confidence} ({highPct}%)
            </div>
            <div className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Medium: {stats.medium_confidence} ({medPct}%)
            </div>
            <div className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              Review: {stats.needs_review} ({revPct}%)
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden flex p-0.5 border border-white/5">
          <div 
            className="bg-emerald-500 h-full rounded-l-full transition-all duration-1000 ease-out"
            style={{ width: `${total > 0 ? (stats.high_confidence / total) * 100 : 0}%` }}
          />
          <div 
            className="bg-amber-400 h-full transition-all duration-1000 ease-out"
            style={{ width: `${total > 0 ? (stats.medium_confidence / total) * 100 : 0}%` }}
          />
          <div 
            className="bg-rose-500 h-full rounded-r-full transition-all duration-1000 ease-out"
            style={{ width: `${total > 0 ? (stats.needs_review / total) * 100 : 0}%` }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

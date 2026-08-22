import React from 'react';
import { Layers, ShieldCheck, TrendingUp } from 'lucide-react';

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
  isLoading?: boolean;
}

/** Reusable animated shimmer skeleton block */
const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse rounded-lg bg-slate-700/50 ${className}`} />
);

export const StatsOverview: React.FC<StatsProps> = ({ stats, isLoading = false }) => {
  const total = stats.total_products || 0;
  const highPct = total > 0 ? ((stats.high_confidence / total) * 100).toFixed(1) : '0';
  const medPct = total > 0 ? ((stats.medium_confidence / total) * 100).toFixed(1) : '0';
  const revPct = total > 0 ? ((stats.needs_review / total) * 100).toFixed(1) : '0';

  if (isLoading) {
    return (
      <div className="mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="frame-3d rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-10 w-10 rounded-2xl" />
              </div>
              <Skeleton className="h-10 w-24 mb-2" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
        <div className="frame-3d p-6 rounded-3xl shadow-2xl">
          <Skeleton className="h-4 w-full rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-4">
        
        {/* Total Ingested */}
        <div className="enterprise-card p-5 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">Total Catalog Items</span>
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono tracking-tight text-white">
            {stats.total_products.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400 font-mono">
            <span>Multi-format Catalog Input</span>
          </div>
        </div>

        {/* High Confidence */}
        <div className="enterprise-card p-5 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">High Confidence Pass</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono tracking-tight text-emerald-400">
            {stats.high_confidence.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-400 font-mono font-medium">
            <span>{highPct}% auto-approved</span>
          </div>
        </div>

        {/* Needs Review */}
        <div className="enterprise-card p-5 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">Needs Review</span>
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
              <span className="text-xs font-mono font-bold">!</span>
            </div>
          </div>
          <div className="text-3xl font-bold font-mono tracking-tight text-white">
            {stats.needs_review.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400 font-mono font-medium">
            <span>{revPct}% flagged for audit</span>
          </div>
        </div>

        {/* LOV Pass Rate */}
        <div className="enterprise-card p-5 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">LOV Compliance Rate</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono tracking-tight text-emerald-400">
            {stats.lov_pass_rate != null ? `${stats.lov_pass_rate}%` : 'N/A'}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400 font-mono">
            <span>Over {stats.total_attributes_extracted || 0} attributes</span>
          </div>
        </div>

      </div>

      {/* Confidence Distribution Bar */}
      <div className="enterprise-card p-4 rounded-xl border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-slate-300">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>CONFIDENCE DISTRIBUTION</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              High: {stats.high_confidence} ({highPct}%)
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-slate-500"></span>
              Medium: {stats.medium_confidence} ({medPct}%)
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-slate-700"></span>
              Review: {stats.needs_review} ({revPct}%)
            </div>
          </div>
        </div>

        {/* Clean Progress Track */}
        <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden flex border border-white/5">
          <div 
            className="bg-emerald-500 h-full rounded-l-full transition-all duration-700 ease-out"
            style={{ width: `${total > 0 ? (stats.high_confidence / total) * 100 : 0}%` }}
          />
          <div 
            className="bg-slate-500 h-full transition-all duration-700 ease-out"
            style={{ width: `${total > 0 ? (stats.medium_confidence / total) * 100 : 0}%` }}
          />
          <div 
            className="bg-slate-700 h-full rounded-r-full transition-all duration-700 ease-out"
            style={{ width: `${total > 0 ? (stats.needs_review / total) * 100 : 0}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default StatsOverview;

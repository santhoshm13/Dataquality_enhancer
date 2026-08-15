import React from 'react';
import { Layers, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface StatsProps {
  stats: {
    total_products: number;
    processed: number;
    high_confidence: number;
    medium_confidence: number;
    needs_review: number;
    total_attributes_extracted?: number;
    lov_pass_rate?: number;
  };
}

export const StatsOverview: React.FC<StatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      
      {/* Total Products */}
      <div className="glass-card p-6 rounded-2xl flex items-center justify-between group relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="relative z-10">
          <p className="text-[10px] font-bold text-indigo-200/70 uppercase tracking-widest mb-1">Total Ingested</p>
          <h3 className="text-3xl font-black text-white tracking-tight">{stats.total_products.toLocaleString()}</h3>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">Via CSV/Excel upload</p>
        </div>
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)] group-hover:scale-110 transition-transform duration-300">
          <Layers className="w-7 h-7" />
        </div>
      </div>

      {/* Processed & High Confidence */}
      <div className="glass-card p-6 rounded-2xl flex items-center justify-between group relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="relative z-10">
          <p className="text-[10px] font-bold text-emerald-200/70 uppercase tracking-widest mb-1">High Conf.</p>
          <h3 className="text-3xl font-black text-emerald-400 tracking-tight">{stats.high_confidence.toLocaleString()}</h3>
          <p className="text-[11px] text-emerald-500/70 mt-1 font-medium">≥ 85% Confidence</p>
        </div>
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.2)] group-hover:scale-110 transition-transform duration-300">
          <CheckCircle2 className="w-7 h-7" />
        </div>
      </div>

      {/* Needs Review */}
      <div className="glass-card p-6 rounded-2xl flex items-center justify-between group relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="relative z-10">
          <p className="text-[10px] font-bold text-amber-200/70 uppercase tracking-widest mb-1">Needs Review</p>
          <h3 className="text-3xl font-black text-amber-400 tracking-tight">{stats.needs_review.toLocaleString()}</h3>
          <p className="text-[11px] text-amber-500/70 mt-1 font-medium">LOV / Fuzzy alerts</p>
        </div>
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.2)] group-hover:scale-110 transition-transform duration-300">
          <AlertTriangle className="w-7 h-7" />
        </div>
      </div>

      {/* LOV Pass Rate */}
      <div className="glass-card p-6 rounded-2xl flex items-center justify-between group relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="relative z-10">
          <p className="text-[10px] font-bold text-purple-200/70 uppercase tracking-widest mb-1">LOV Pass Rate</p>
          <h3 className="text-3xl font-black text-purple-400 tracking-tight">{stats.lov_pass_rate || 0}%</h3>
          <p className="text-[11px] text-purple-500/70 mt-1 font-medium">Over {stats.total_attributes_extracted || 0} attrs</p>
        </div>
        <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)] group-hover:scale-110 transition-transform duration-300">
          <ShieldCheck className="w-7 h-7" />
        </div>
      </div>

    </div>
  );
};

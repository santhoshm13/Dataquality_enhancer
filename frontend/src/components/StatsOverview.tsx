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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      
      {/* Total Products */}
      <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Ingested Products</p>
          <h3 className="text-2xl font-bold text-white mt-1">{stats.total_products.toLocaleString()}</h3>
          <p className="text-xs text-slate-500 mt-1">Ingested via CSV/Excel upload</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-indigo-950/80 border border-indigo-800/50 flex items-center justify-center text-indigo-400">
          <Layers className="w-6 h-6" />
        </div>
      </div>

      {/* Processed & High Confidence */}
      <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Enriched (High Conf.)</p>
          <h3 className="text-2xl font-bold text-emerald-300 mt-1">{stats.high_confidence.toLocaleString()}</h3>
          <p className="text-xs text-emerald-500/80 mt-1">≥ 85% Confidence score</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-emerald-950/80 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
          <CheckCircle2 className="w-6 h-6" />
        </div>
      </div>

      {/* Needs Review */}
      <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-amber-400 uppercase tracking-wider">Needs Human Review</p>
          <h3 className="text-2xl font-bold text-amber-300 mt-1">{stats.needs_review.toLocaleString()}</h3>
          <p className="text-xs text-amber-500/80 mt-1">LOV / Fuzzy match alerts</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-amber-950/80 border border-amber-800/50 flex items-center justify-center text-amber-400">
          <AlertTriangle className="w-6 h-6" />
        </div>
      </div>

      {/* LOV Pass Rate */}
      <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-purple-400 uppercase tracking-wider">LOV Validation Pass Rate</p>
          <h3 className="text-2xl font-bold text-purple-300 mt-1">{stats.lov_pass_rate || 0}%</h3>
          <p className="text-xs text-purple-500/80 mt-1">Calculated over {stats.total_attributes_extracted || 0} attrs</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-purple-950/80 border border-purple-800/50 flex items-center justify-center text-purple-400">
          <ShieldCheck className="w-6 h-6" />
        </div>
      </div>

    </div>
  );
};

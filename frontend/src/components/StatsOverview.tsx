import React from 'react';
import { Layers, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
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
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Total Products */}
        <motion.div variants={slideUpFade} whileHover={hoverScale.hover} className="bg-slate-800 rounded-xl p-6 border border-slate-700 flex items-center justify-between group transition-colors">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Total Ingested</p>
            <h3 className="text-3xl font-bold text-white">{stats.total_products.toLocaleString()}</h3>
            <p className="text-xs text-slate-500 mt-2 font-medium">Via CSV/Excel upload</p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300">
            <Layers className="w-6 h-6" />
          </div>
        </motion.div>

        {/* Processed & High Confidence */}
        <motion.div variants={slideUpFade} whileHover={hoverScale.hover} className="bg-slate-800 rounded-xl p-6 border border-slate-700 flex items-center justify-between group transition-colors">
          <div>
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">High Conf.</p>
            <h3 className="text-3xl font-bold text-white">{stats.high_confidence.toLocaleString()}</h3>
            <p className="text-xs text-slate-500 mt-2 font-medium">≥ 85% Confidence</p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-emerald-950/30 border border-emerald-900/50 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </motion.div>

        {/* Needs Review */}
        <motion.div variants={slideUpFade} whileHover={hoverScale.hover} className="bg-slate-800 rounded-xl p-6 border border-slate-700 flex items-center justify-between group transition-colors">
          <div>
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">Needs Review</p>
            <h3 className="text-3xl font-bold text-white">{stats.needs_review.toLocaleString()}</h3>
            <p className="text-xs text-slate-500 mt-2 font-medium">LOV / Fuzzy alerts</p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-amber-950/30 border border-amber-900/50 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </motion.div>

        {/* LOV Pass Rate */}
        <motion.div variants={slideUpFade} whileHover={hoverScale.hover} className="bg-slate-800 rounded-xl p-6 border border-slate-700 flex items-center justify-between group transition-colors">
          <div>
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">LOV Pass Rate</p>
            <h3 className={`font-bold text-white ${stats.lov_pass_rate != null ? 'text-3xl' : 'text-lg text-slate-400'}`}>
              {stats.lov_pass_rate != null ? `${stats.lov_pass_rate}%` : 'Not evaluated'}
            </h3>
            <p className="text-xs text-slate-500 mt-2 font-medium">Over {stats.total_attributes_extracted || 0} attrs</p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-indigo-950/30 border border-indigo-900/50 flex items-center justify-center text-indigo-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </motion.div>

      </div>

      {/* Confidence Chart */}
      <motion.div variants={slideUpFade} className="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white tracking-tight mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-slate-400" />
              Pipeline Confidence Distribution
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Distribution of products across confidence tiers (High: &gt;85%, Medium: 70-85%, Needs Review: &lt;70% or Validation Failed).
            </p>
            
            {/* Horizontal Stacked Bar */}
            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden flex shadow-inner">
              <div 
                className="bg-emerald-500 h-full transition-all duration-1000 ease-out"
                style={{ width: `${stats.total_products > 0 ? (stats.high_confidence / stats.total_products) * 100 : 0}%` }}
                title={`High Confidence: ${stats.high_confidence}`}
              ></div>
              <div 
                className="bg-amber-400 h-full transition-all duration-1000 ease-out"
                style={{ width: `${stats.total_products > 0 ? (stats.medium_confidence / stats.total_products) * 100 : 0}%` }}
                title={`Medium Confidence: ${stats.medium_confidence}`}
              ></div>
              <div 
                className="bg-rose-500 h-full transition-all duration-1000 ease-out"
                style={{ width: `${stats.total_products > 0 ? (stats.needs_review / stats.total_products) * 100 : 0}%` }}
                title={`Needs Review: ${stats.needs_review}`}
              ></div>
            </div>
            
            <div className="flex items-center gap-6 mt-4 text-xs font-medium">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>
                High ({stats.high_confidence})
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 rounded bg-amber-400"></span>
                Medium ({stats.medium_confidence})
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 rounded bg-rose-500"></span>
                Review ({stats.needs_review})
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

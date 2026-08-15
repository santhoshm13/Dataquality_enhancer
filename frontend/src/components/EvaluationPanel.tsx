import React from 'react';
import { Award, BarChart2, AlertCircle } from 'lucide-react';

interface EvaluationData {
  status: string;
  message?: string;
  total_ground_truth_rows: number;
  evaluated_rows: number;
  overall_field_exact_match_pct: number;
  manufacturer_accuracy: number;
  brand_accuracy: number;
  department_accuracy: number;
  class_accuracy: number;
  fine_category_accuracy: number;
  attribute_accuracy: number;
  lov_compliance: number;
  uom_compliance: number;
  desc_character_compliance: number;
  row_completeness: number;
  details?: {
    total_comparisons: number;
    exact_matches: number;
    normalized_matches: number;
    mismatches: number;
    missing_predictions: number;
    missing_ground_truth: number;
  };
}

interface EvaluationPanelProps {
  evaluation: EvaluationData | null;
  onRefresh: () => void;
}

export const EvaluationPanel: React.FC<EvaluationPanelProps> = ({ evaluation, onRefresh }) => {
  if (!evaluation) return null;

  const isNoPredictions = evaluation.status === 'no_predictions' || evaluation.evaluated_rows === 0;

  return (
    <div className="glass-panel p-6 rounded-2xl border border-white/5 mb-8 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none"></div>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-lg font-bold text-white tracking-tight">Ground Truth Benchmark</h3>
              <span className={`px-2.5 py-1 rounded-md text-[9px] uppercase tracking-widest font-bold ${evaluation.total_ground_truth_rows > 0 ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                {evaluation.total_ground_truth_rows > 0 ? `${evaluation.total_ground_truth_rows} GT Rows Loaded` : 'Awaiting GT Data'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Live Evaluation against <span className="text-indigo-300 font-mono bg-indigo-500/10 px-1 py-0.5 rounded">Unilog-Sample_200_Items-Input-vs-Output.xlsx</span>
            </p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-xs font-semibold border border-slate-700/50 transition-all cursor-pointer hover:shadow-lg"
        >
          <BarChart2 className="w-4 h-4 text-purple-400" />
          Re-evaluate
        </button>
      </div>

      {isNoPredictions ? (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <span className="font-medium">{evaluation.message || "Upload the 200-item input dataset and run enrichment to evaluate accuracy."}</span>
          </div>
          <span className="font-mono text-slate-400 font-semibold bg-[#030712] px-2 py-1 rounded-lg">Evaluated: {evaluation.evaluated_rows}/{evaluation.total_ground_truth_rows}</span>
        </div>
      ) : (
        <>
          {/* Detailed Accuracy Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6 relative z-10">
            
            <div className="bg-[#030712]/60 p-4 rounded-xl border border-white/5 hover:border-emerald-500/30 transition-colors group">
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1">Field Match</p>
              <p className="text-2xl font-black text-emerald-400 group-hover:scale-110 origin-left transition-transform">{evaluation.overall_field_exact_match_pct}%</p>
              <p className="text-[10px] text-slate-500 mt-1 font-medium">Exact match 252 cols</p>
            </div>

            <div className="bg-[#030712]/60 p-4 rounded-xl border border-white/5 hover:border-indigo-500/30 transition-colors group">
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1">Manufacturer</p>
              <p className="text-2xl font-black text-indigo-400 group-hover:scale-110 origin-left transition-transform">{evaluation.manufacturer_accuracy}%</p>
              <p className="text-[10px] text-slate-500 mt-1 font-medium">Canonical match</p>
            </div>

            <div className="bg-[#030712]/60 p-4 rounded-xl border border-white/5 hover:border-purple-500/30 transition-colors group">
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1">Brand</p>
              <p className="text-2xl font-black text-purple-400 group-hover:scale-110 origin-left transition-transform">{evaluation.brand_accuracy}%</p>
              <p className="text-[10px] text-slate-500 mt-1 font-medium">Canonical match</p>
            </div>

            <div className="bg-[#030712]/60 p-4 rounded-xl border border-white/5 hover:border-pink-500/30 transition-colors group">
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1">Category / Fine</p>
              <p className="text-2xl font-black text-pink-400 group-hover:scale-110 origin-left transition-transform">{evaluation.fine_category_accuracy}%</p>
              <p className="text-[10px] text-slate-500 mt-1 font-medium">Taxonomy match</p>
            </div>

            <div className="bg-[#030712]/60 p-4 rounded-xl border border-white/5 hover:border-teal-500/30 transition-colors group">
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1">Attributes</p>
              <p className="text-2xl font-black text-teal-400 group-hover:scale-110 origin-left transition-transform">{evaluation.attribute_accuracy}%</p>
              <p className="text-[10px] text-slate-500 mt-1 font-medium">Key-Value match</p>
            </div>

            <div className="bg-[#030712]/60 p-4 rounded-xl border border-white/5 hover:border-amber-500/30 transition-colors group">
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1">LOV Compliance</p>
              <p className="text-2xl font-black text-amber-400 group-hover:scale-110 origin-left transition-transform">{evaluation.lov_compliance}%</p>
              <p className="text-[10px] text-slate-500 mt-1 font-medium">Master LOV pass</p>
            </div>

          </div>

          {/* Evaluation Details Footer */}
          {evaluation.details && (
            <div className="p-4 rounded-xl bg-slate-900/30 border border-white/5 flex flex-wrap items-center justify-between text-[11px] font-medium text-slate-400 gap-3 relative z-10 backdrop-blur-md">
              <div className="flex items-center gap-6">
                <span className="flex items-center gap-1.5">Matched Rows: <strong className="text-white text-xs">{evaluation.evaluated_rows} / {evaluation.total_ground_truth_rows}</strong></span>
                <span className="flex items-center gap-1.5">Total Checks: <strong className="text-indigo-300 text-xs">{evaluation.details.total_comparisons.toLocaleString()}</strong></span>
                <span className="flex items-center gap-1.5">Exact Matches: <strong className="text-emerald-400 text-xs">{evaluation.details.exact_matches.toLocaleString()}</strong></span>
                <span className="flex items-center gap-1.5">Mismatches: <strong className="text-rose-400 text-xs">{evaluation.details.mismatches.toLocaleString()}</strong></span>
              </div>
              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Matched by Mfg_Part_Num
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
};

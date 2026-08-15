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
    <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 mb-6 shadow-xl">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-800/60 flex items-center justify-center text-purple-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">200-Item Ground Truth Evaluation Benchmark</h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${evaluation.total_ground_truth_rows > 0 ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                {evaluation.total_ground_truth_rows > 0 ? `Official Workbook (${evaluation.total_ground_truth_rows} GT Rows Loaded)` : 'Awaiting Official 200-Item Workbook'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Calculated live against <span className="text-indigo-300 font-mono">Unilog-Sample_200_Items-Input-vs-Output.xlsx</span> (Read-Only)
            </p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all cursor-pointer"
        >
          <BarChart2 className="w-3.5 h-3.5 text-purple-400" />
          Re-evaluate Benchmark
        </button>
      </div>

      {isNoPredictions ? (
        <div className="p-4 rounded-xl bg-slate-900/80 border border-amber-800/50 text-amber-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{evaluation.message || "Loaded 200 ground-truth rows. Upload the 200-item input dataset and run enrichment to evaluate accuracy."}</span>
          </div>
          <span className="font-mono text-slate-400">Evaluated: {evaluation.evaluated_rows}/{evaluation.total_ground_truth_rows}</span>
        </div>
      ) : (
        <>
          {/* Detailed Accuracy Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
            
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Field Match (252 Cols)</p>
              <p className="text-xl font-bold text-emerald-400 mt-0.5">{evaluation.overall_field_exact_match_pct}%</p>
              <p className="text-[9px] text-slate-500">Exact field match</p>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Manufacturer Match</p>
              <p className="text-xl font-bold text-indigo-400 mt-0.5">{evaluation.manufacturer_accuracy}%</p>
              <p className="text-[9px] text-slate-500">Canonical match</p>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Brand Match</p>
              <p className="text-xl font-bold text-purple-400 mt-0.5">{evaluation.brand_accuracy}%</p>
              <p className="text-[9px] text-slate-500">Canonical match</p>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Category / Fine</p>
              <p className="text-xl font-bold text-pink-400 mt-0.5">{evaluation.fine_category_accuracy}%</p>
              <p className="text-[9px] text-slate-500">Taxonomy match</p>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Semantic Attributes</p>
              <p className="text-xl font-bold text-teal-400 mt-0.5">{evaluation.attribute_accuracy}%</p>
              <p className="text-[9px] text-slate-500">Key-Value match</p>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <p className="text-[10px] text-slate-400 font-semibold uppercase">LOV Compliance</p>
              <p className="text-xl font-bold text-amber-400 mt-0.5">{evaluation.lov_compliance}%</p>
              <p className="text-[9px] text-slate-500">Master LOV pass</p>
            </div>

          </div>

          {/* Evaluation Details Footer */}
          {evaluation.details && (
            <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
              <div className="flex items-center gap-4">
                <span>Matched Rows: <strong className="text-white">{evaluation.evaluated_rows} / {evaluation.total_ground_truth_rows}</strong></span>
                <span>Total Field Checks: <strong className="text-indigo-300">{evaluation.details.total_comparisons.toLocaleString()}</strong></span>
                <span>Exact Field Matches: <strong className="text-emerald-400">{evaluation.details.exact_matches.toLocaleString()}</strong></span>
                <span>Mismatches: <strong className="text-rose-400">{evaluation.details.mismatches.toLocaleString()}</strong></span>
              </div>
              <div className="text-[11px] text-slate-500">
                Evaluation matched by Mfg_Part_Num · No static numbers used
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
};

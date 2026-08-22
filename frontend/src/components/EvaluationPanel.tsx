import React, { useState } from 'react';
import { Award, BarChart2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface EvaluationData {
  status: string;
  message?: string;
  total_ground_truth_rows: number;
  evaluated_rows: number;
  overall_field_exact_match_pct: number | null;
  manufacturer_accuracy: number | null;
  brand_accuracy: number | null;
  department_accuracy: number | null;
  class_accuracy: number | null;
  fine_category_accuracy: number | null;
  attribute_accuracy: number | null;
  lov_compliance: number | null;
  uom_compliance: number | null;
  desc_character_compliance: number | null;
  row_completeness: number | null;
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
  onRunEvaluation?: () => Promise<void>;
}

export const EvaluationPanel: React.FC<EvaluationPanelProps> = ({ evaluation, onRefresh, onRunEvaluation }) => {
  const [running, setRunning] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const handleRunEval = async () => {
    setRunning(true);
    try {
      if (onRunEvaluation) {
        await onRunEvaluation();
      } else {
        onRefresh();
      }
    } finally {
      setRunning(false);
    }
  };

  if (!evaluation) return null;

  const isNoPredictions = evaluation.status === 'no_predictions' || evaluation.evaluated_rows === 0;

  const formatVal = (val: number | null | undefined): string => {
    if (val === null || val === undefined) return "N/A";
    return `${val}%`;
  };

  return (
    <div className="enterprise-card p-6 sm:p-7 rounded-2xl mb-7 border border-white/10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 mb-1 flex-wrap">
              <h3 className="text-lg font-bold font-heading text-white tracking-tight">
                Ground Truth Benchmark Scorecard
              </h3>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-semibold ${
                evaluation.total_ground_truth_rows > 0 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : 'bg-white/5 text-slate-400 border border-white/10'
              }`}>
                {evaluation.total_ground_truth_rows > 0 ? `${evaluation.total_ground_truth_rows} Ground Truth Rows Loaded` : 'Awaiting GT Data'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Evaluated against reference standard <span className="text-white font-semibold">Unilog-Sample_200_Items.xlsx</span>
            </p>
          </div>
        </div>

        <button
          onClick={handleRunEval}
          disabled={running}
          className="btn-secondary flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer self-start md:self-auto disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <BarChart2 className={`w-3.5 h-3.5 text-emerald-400 ${running ? 'animate-spin' : ''}`} />
          <span>{running ? 'Evaluating…' : 'Re-evaluate Precision'}</span>
        </button>
      </div>

      {isNoPredictions ? (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{evaluation.message || "Upload the 200-item input dataset and run enrichment to evaluate precision against ground truth."}</span>
          </div>
          <span className="font-mono text-white font-semibold bg-black/60 px-3 py-1 rounded-lg border border-white/10 text-[11px]">
            Evaluated: {evaluation.evaluated_rows}/{evaluation.total_ground_truth_rows}
          </span>
        </div>
      ) : (
        <>
          {/* Detailed Accuracy Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mb-5 font-mono">
            
            <div className="p-4 rounded-xl bg-black/50 border border-white/5 text-left">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Field Match</p>
              <p className="font-bold text-2xl text-emerald-400">
                {formatVal(evaluation.overall_field_exact_match_pct)}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">252 Schema Cols</p>
            </div>

            <div className="p-4 rounded-xl bg-black/50 border border-white/5 text-left">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Manufacturer</p>
              <p className="font-bold text-2xl text-white">
                {formatVal(evaluation.manufacturer_accuracy)}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">Canonical Match</p>
            </div>

            <div className="p-4 rounded-xl bg-black/50 border border-white/5 text-left">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Brand Name</p>
              <p className="font-bold text-2xl text-white">
                {formatVal(evaluation.brand_accuracy)}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">Multi-Source Brand</p>
            </div>

            <div className="p-4 rounded-xl bg-black/50 border border-white/5 text-left">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Fine Category</p>
              <p className="font-bold text-2xl text-white">
                {formatVal(evaluation.fine_category_accuracy)}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">Taxonomy Path</p>
            </div>

            <div className="p-4 rounded-xl bg-black/50 border border-white/5 text-left">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Attributes</p>
              <p className="font-bold text-2xl text-emerald-400">
                {formatVal(evaluation.attribute_accuracy)}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">Key-Value Pairs</p>
            </div>

            <div className="p-4 rounded-xl bg-black/50 border border-white/5 text-left">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">LOV Compliance</p>
              <p className="font-bold text-2xl text-emerald-400">
                {formatVal(evaluation.lov_compliance)}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">Master Permitted List</p>
            </div>

          </div>

          {/* Evaluation Details Summary Bar */}
          <div className="p-3.5 rounded-xl bg-black/50 border border-white/5 flex flex-wrap items-center justify-between text-xs font-mono text-slate-300 gap-3">
            <div className="flex items-center gap-5 flex-wrap">
              <span>Evaluated: <strong className="text-white font-bold">{evaluation.evaluated_rows} / {evaluation.total_ground_truth_rows}</strong></span>
              <span>Comparisons: <strong className="text-slate-200">{evaluation.details?.total_comparisons?.toLocaleString() || '0'}</strong></span>
              <span>Exact Matches: <strong className="text-emerald-400 font-bold">{evaluation.details?.exact_matches?.toLocaleString() || '0'}</strong></span>
              <span>Mismatches: <strong className="text-slate-400 font-bold">{evaluation.details?.mismatches?.toLocaleString() || '0'}</strong></span>
            </div>
            <button
              onClick={() => setShowBreakdown(b => !b)}
              className="text-[11px] px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1.5 font-medium"
            >
              <span>{showBreakdown ? 'Hide Breakdown' : 'Field Breakdown'}</span>
              {showBreakdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
            </button>
          </div>

          {/* Per-field accuracy breakdown */}
          {showBreakdown && (
            <div className="mt-3 rounded-xl border border-white/10 overflow-hidden bg-black/60">
              <div className="p-3 bg-black/80 border-b border-white/5 text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Field Accuracy Breakdown vs Ground Truth (200 Rows)
              </div>
              <table className="w-full text-xs font-mono">
                <thead className="bg-black/90 text-slate-400 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3 text-left">Field Group</th>
                    <th className="p-3 text-center">Accuracy</th>
                    <th className="p-3 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {[
                    { label: 'Brand Name', value: evaluation.brand_accuracy, note: 'Canonical brand vs GT BRAND_NAME' },
                    { label: 'Manufacturer', value: evaluation.manufacturer_accuracy, note: 'Canonical mfg vs GT MANUFACTURER_NAME' },
                    { label: 'Fine Category', value: evaluation.fine_category_accuracy, note: 'Dept / Class / Fine taxonomy path' },
                    { label: 'Attributes', value: evaluation.attribute_accuracy, note: 'Label + Value key-value match' },
                    { label: 'LOV Compliance', value: evaluation.lov_compliance, note: 'Values in permitted master list' },
                    { label: 'UOM Compliance', value: evaluation.uom_compliance, note: 'Canonical unit of measure' },
                    { label: 'Desc Char Limits', value: evaluation.desc_character_compliance, note: 'All 6 desc formats within limits' },
                    { label: 'Row Completeness', value: evaluation.row_completeness, note: 'Non-empty required delivery fields' },
                    { label: 'Overall (252 cols)', value: evaluation.overall_field_exact_match_pct, note: 'Exact match across all schema columns' },
                  ].map(row => {
                    const val = row.value;
                    const color = val !== null && val >= 75 ? 'text-emerald-400' : 'text-slate-300';
                    return (
                      <tr key={row.label} className="hover:bg-white/[0.02]">
                        <td className="p-3 font-semibold text-slate-200">{row.label}</td>
                        <td className={`p-3 text-center font-bold text-sm ${color}`}>
                          {val !== null && val !== undefined ? `${val}%` : 'N/A'}
                        </td>
                        <td className="p-3 text-slate-400">{row.note}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

    </div>
  );
};

export default EvaluationPanel;

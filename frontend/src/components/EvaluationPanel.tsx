import React from 'react';
import { Award, BarChart2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { scrollZoomSection, scrollZoomBox, hoverScale } from '../lib/animations';

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
  const [running, setRunning] = React.useState(false);
  const [showBreakdown, setShowBreakdown] = React.useState(false);

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
    if (val === null || val === undefined) return "Not evaluated";
    return `${val}%`;
  };

  return (
    <motion.div 
      variants={scrollZoomSection}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount: 0.2 }}
      className="frame-3d p-6 sm:p-8 rounded-3xl mb-10 shadow-2xl relative overflow-hidden bg-purple-950/[0.08]"
    >
      <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/15 blur-[100px] rounded-full pointer-events-none -z-10"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none -z-10"></div>
      
      {/* Header with High-Contrast Text */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-500 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-purple-600/30 border border-white/20">
            <Award className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1.5 flex-wrap">
              <h3 className="text-xl sm:text-2xl font-extrabold font-heading text-white tracking-tight drop-shadow">
                <span className="text-gradient-aurora">Ground Truth Benchmark</span>
              </h3>
              <span className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest font-extrabold ${
                evaluation.total_ground_truth_rows > 0 
                  ? 'bg-purple-500/25 text-purple-200 border border-purple-500/50 shadow-sm' 
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}>
                {evaluation.total_ground_truth_rows > 0 ? `${evaluation.total_ground_truth_rows} GT Rows Loaded` : 'Awaiting GT Data'}
              </span>
            </div>
            <p className="text-xs text-slate-200 font-mono">
              Live Precision Benchmark against <span className="text-cyan-300 bg-cyan-950/70 px-2 py-0.5 rounded-md border border-cyan-500/30 font-bold">Unilog-Sample_200_Items.xlsx</span>
            </p>
          </div>
        </div>

        <button
          onClick={handleRunEval}
          disabled={running}
          className="btn-secondary flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-mono font-bold text-white cursor-pointer shadow-lg self-start md:self-auto disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <BarChart2 className={`w-4 h-4 text-purple-300 ${running ? 'animate-spin' : ''}`} />
          <span>{running ? 'Running…' : 'Re-evaluate Precision'}</span>
        </button>
      </div>

      {isNoPredictions ? (
        <motion.div 
          variants={scrollZoomBox}
          className="p-5 rounded-2xl bg-amber-950/50 border border-amber-500/40 text-amber-200 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 backdrop-blur-sm shadow-md"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-300 shrink-0" />
            <span className="font-semibold">{evaluation.message || "Upload the 200-item input dataset and run enrichment to evaluate accuracy."}</span>
          </div>
          <span className="font-mono text-white font-extrabold bg-black/70 px-3.5 py-1.5 rounded-xl border border-white/10">
            Evaluated: {evaluation.evaluated_rows}/{evaluation.total_ground_truth_rows}
          </span>
        </motion.div>
      ) : (
        <>
          {/* Detailed Accuracy Metrics Grid in 3D Frames */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5 mb-6 relative z-10 font-mono">
            
            <motion.div 
              variants={scrollZoomBox} 
              whileHover={hoverScale.hover} 
              className="frame-3d p-4 sm:p-5 rounded-2xl hover:border-emerald-500/50 transition-all text-left bg-black/60 shadow-lg"
            >
              <p className="text-[10px] text-slate-200 font-extrabold uppercase tracking-wider mb-1">Field Match</p>
              <p className="font-black text-3xl text-gradient-emerald-cyan drop-shadow">
                {formatVal(evaluation.overall_field_exact_match_pct)}
              </p>
              <p className="text-[10px] text-slate-300 mt-1 font-medium">252 Schema Cols</p>
            </motion.div>

            <motion.div 
              variants={scrollZoomBox} 
              whileHover={hoverScale.hover} 
              className="frame-3d p-4 sm:p-5 rounded-2xl hover:border-indigo-500/50 transition-all text-left bg-black/60 shadow-lg"
            >
              <p className="text-[10px] text-slate-200 font-extrabold uppercase tracking-wider mb-1">Manufacturer</p>
              <p className="font-black text-3xl text-gradient-cyan-indigo drop-shadow">
                {formatVal(evaluation.manufacturer_accuracy)}
              </p>
              <p className="text-[10px] text-slate-300 mt-1 font-medium">Canonical Match</p>
            </motion.div>

            <motion.div 
              variants={scrollZoomBox} 
              whileHover={hoverScale.hover} 
              className="frame-3d p-4 sm:p-5 rounded-2xl hover:border-purple-500/50 transition-all text-left bg-black/60 shadow-lg"
            >
              <p className="text-[10px] text-slate-200 font-extrabold uppercase tracking-wider mb-1">Brand</p>
              <p className="font-black text-3xl text-gradient-aurora drop-shadow">
                {formatVal(evaluation.brand_accuracy)}
              </p>
              <p className="text-[10px] text-slate-300 mt-1 font-medium">Multi-Source Brand</p>
            </motion.div>

            <motion.div 
              variants={scrollZoomBox} 
              whileHover={hoverScale.hover} 
              className="frame-3d p-4 sm:p-5 rounded-2xl hover:border-pink-500/50 transition-all text-left bg-black/60 shadow-lg"
            >
              <p className="text-[10px] text-slate-200 font-extrabold uppercase tracking-wider mb-1">Category / Fine</p>
              <p className="font-black text-3xl text-gradient-amber-rose drop-shadow">
                {formatVal(evaluation.fine_category_accuracy)}
              </p>
              <p className="text-[10px] text-slate-300 mt-1 font-medium">Taxonomy Path</p>
            </motion.div>

            <motion.div 
              variants={scrollZoomBox} 
              whileHover={hoverScale.hover} 
              className="frame-3d p-4 sm:p-5 rounded-2xl hover:border-teal-500/50 transition-all text-left bg-black/60 shadow-lg"
            >
              <p className="text-[10px] text-slate-200 font-extrabold uppercase tracking-wider mb-1">Attributes</p>
              <p className="font-black text-3xl text-gradient-electric drop-shadow">
                {formatVal(evaluation.attribute_accuracy)}
              </p>
              <p className="text-[10px] text-slate-300 mt-1 font-medium">Key-Value Pairs</p>
            </motion.div>

            <motion.div 
              variants={scrollZoomBox} 
              whileHover={hoverScale.hover} 
              className="frame-3d p-4 sm:p-5 rounded-2xl hover:border-amber-500/50 transition-all text-left bg-black/60 shadow-lg"
            >
              <p className="text-[10px] text-slate-200 font-extrabold uppercase tracking-wider mb-1">LOV Compliance</p>
              <p className="font-black text-3xl text-gradient-emerald-cyan drop-shadow">
                {formatVal(evaluation.lov_compliance)}
              </p>
              <p className="text-[10px] text-slate-300 mt-1 font-medium">Master LOV Pass</p>
            </motion.div>

          </div>

          {/* Evaluation Details Footer */}
          {evaluation.details && (
            <motion.div 
              variants={scrollZoomBox}
              className="p-4 rounded-2xl bg-black/70 border border-white/15 flex flex-wrap items-center justify-between text-xs font-mono text-slate-200 gap-3 relative z-10 shadow-inner"
            >
              <div className="flex items-center gap-6 flex-wrap font-medium">
                <span>Matched: <strong className="text-white font-bold">{evaluation.evaluated_rows} / {evaluation.total_ground_truth_rows}</strong></span>
                <span>Comparisons: <strong className="text-indigo-300 font-bold">{evaluation.details.total_comparisons.toLocaleString()}</strong></span>
                <span>Exact Matches: <strong className="text-emerald-400 font-bold">{evaluation.details.exact_matches.toLocaleString()}</strong></span>
                <span>Mismatches: <strong className="text-rose-400 font-bold">{evaluation.details.mismatches.toLocaleString()}</strong></span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-[11px] text-cyan-300 flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Deterministic Ground Truth Precision</span>
                </div>
                <button
                  onClick={() => setShowBreakdown(b => !b)}
                  className="text-[10px] px-3 py-1 rounded-xl bg-white/5 border border-white/15 text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer font-bold"
                >
                  {showBreakdown ? 'Hide Breakdown ▲' : 'Field Breakdown ▼'}
                </button>
              </div>
            </motion.div>
          )}

          {/* Per-field accuracy breakdown */}
          {showBreakdown && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 rounded-2xl border border-white/10 overflow-hidden bg-black/60 relative z-10"
            >
              <div className="p-3 bg-black/40 border-b border-white/10 text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider">
                Field Accuracy vs Ground Truth (200-Row Dataset)
              </div>
              <table className="w-full text-xs font-mono">
                <thead className="bg-black/50 text-slate-500 uppercase text-[10px] tracking-wider">
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
                    { label: 'LOV Compliance', value: evaluation.lov_compliance, note: 'Values in permitted LOV list' },
                    { label: 'UOM Compliance', value: evaluation.uom_compliance, note: 'Canonical unit of measure' },
                    { label: 'Desc Char Limit', value: evaluation.desc_character_compliance, note: 'All 6 desc formats within limits' },
                    { label: 'Row Completeness', value: evaluation.row_completeness, note: 'Non-empty required fields' },
                    { label: 'Overall (252 cols)', value: evaluation.overall_field_exact_match_pct, note: 'Exact match across all schema columns' },
                  ].map(row => {
                    const val = row.value;
                    const color = val === null ? 'text-slate-500' : val >= 80 ? 'text-emerald-400' : val >= 50 ? 'text-amber-400' : 'text-rose-400';
                    return (
                      <tr key={row.label} className="hover:bg-white/[0.02]">
                        <td className="p-3 font-bold text-slate-200">{row.label}</td>
                        <td className={`p-3 text-center font-black text-base ${color}`}>
                          {val !== null && val !== undefined ? `${val}%` : 'N/A'}
                        </td>
                        <td className="p-3 text-slate-500">{row.note}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </motion.div>
          )}
        </>
      )}

    </motion.div>
  );
};

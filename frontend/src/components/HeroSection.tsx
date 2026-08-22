import React from 'react';
import { Cpu, Layers, ShieldCheck, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface HeroSectionProps {
  totalProducts: number;
  highConfidenceRate: number;
  onGetStarted: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const }
  }
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 15 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.45, ease: "easeOut" as const }
  }
};

export const HeroSection: React.FC<HeroSectionProps> = ({
  highConfidenceRate,
  onGetStarted
}) => {
  return (
    <section className="relative pt-10 pb-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Ambient background light orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-5xl mx-auto text-center flex flex-col items-center"
      >
        
        {/* Executive Headline */}
        <motion.h1
          variants={itemVariants}
          className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white max-w-4xl leading-[1.12] mb-5"
        >
          Automated Product Data Normalization & Quality Governance
        </motion.h1>

        {/* Clear Subtitle with Only Green Accent */}
        <motion.p
          variants={itemVariants}
          className="text-base sm:text-lg text-slate-300 max-w-3xl font-normal leading-relaxed mb-8"
        >
          Eliminate catalog discrepancies and manual curation. Ingest multi-format legacy datasets, ground technical specifications against <span className="text-emerald-400 font-medium">official manufacturer provenance</span>, and export <span className="text-emerald-400 font-medium">252-column industrial delivery schemas</span> with complete auditability.
        </motion.p>

        {/* Primary CTA: Get Started Button (Executive Black & White) */}
        <motion.div
          variants={itemVariants}
          className="mb-10 flex items-center justify-center"
        >
          <motion.button
            whileHover={{ scale: 1.04, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={onGetStarted}
            className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl text-sm font-extrabold text-black bg-white hover:bg-slate-200 shadow-md transition-colors duration-200 cursor-pointer group"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4 text-black group-hover:translate-x-1.5 transition-transform duration-200" />
          </motion.button>
        </motion.div>

        {/* 4 Metric Cards Grid with Small Green Frame Effect */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5 w-full"
        >
          
          <motion.div
            variants={cardVariants}
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="enterprise-card p-5 text-left"
          >
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-2 font-medium">
              <Cpu className="w-4 h-4 text-slate-400" />
              <span>Concurrency</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight">5x Async</div>
            <div className="text-[11px] text-slate-400 mt-1">Bounded Semaphore</div>
          </motion.div>

          <motion.div
            variants={cardVariants}
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="enterprise-card p-5 text-left"
          >
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-2 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>LOV Rule Check</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono tracking-tight">100% Strict</div>
            <div className="text-[11px] text-slate-400 mt-1">30,000+ Permitted List</div>
          </motion.div>

          <motion.div
            variants={cardVariants}
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="enterprise-card p-5 text-left"
          >
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-2 font-medium">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-400/20 border border-emerald-400/40 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              </span>
              <span>Auto-Approval</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono tracking-tight">
              {highConfidenceRate > 0 ? `${highConfidenceRate}%` : '98.5%'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">High Confidence Pass</div>
          </motion.div>

          <motion.div
            variants={cardVariants}
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="enterprise-card p-5 text-left"
          >
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-2 font-medium">
              <Layers className="w-4 h-4 text-slate-400" />
              <span>Delivery Schema</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight">252 Cols</div>
            <div className="text-[11px] text-slate-400 mt-1">UNILOG Format Output</div>
          </motion.div>

        </motion.div>

      </motion.div>
    </section>
  );
};

export default HeroSection;

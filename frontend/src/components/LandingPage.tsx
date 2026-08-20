import React from 'react';
import { motion } from 'framer-motion';
import { Database, Zap, FileJson, ArrowRight, ShieldCheck, Activity } from 'lucide-react';
import { floatVariant, staggerContainer, slideUpFade, sectionTransition } from '../lib/animations';

interface LandingPageProps {
  onLaunchDemo: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunchDemo }) => {
  return (
    <div className="w-full flex flex-col bg-slate-900 text-slate-100 min-h-screen selection:bg-indigo-500/30">
      
      {/* Hero Section */}
      <section className="relative w-full min-h-[90vh] flex flex-col items-center justify-center pt-32 pb-20 px-6 overflow-hidden">
        {/* Background ambient light */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none opacity-50" />
        
        <motion.div 
          className="relative z-10 max-w-5xl mx-auto text-center flex flex-col items-center"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={floatVariant} initial="initial" animate="animate">
            <span className="px-3 py-1 text-xs font-semibold tracking-wider uppercase bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20 mb-8 inline-block shadow-sm">
              Enterprise Grade AI Pipeline
            </span>
          </motion.div>
          
          <motion.h1 
            variants={slideUpFade}
            className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-[1.1]"
          >
            Transform Raw Data into
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-sky-400">
              Structured Intelligence
            </span>
          </motion.h1>
          
          <motion.p 
            variants={slideUpFade}
            className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Ingest messy, un-enriched B2B product catalogs and instantly output validated, 252-column industrial delivery formats with field-level confidence scoring.
          </motion.p>
          
          <motion.div variants={slideUpFade} className="flex flex-col sm:flex-row items-center gap-4">
            <button 
              onClick={onLaunchDemo}
              className="px-8 py-4 rounded-xl bg-white text-slate-900 font-semibold text-lg hover:bg-slate-100 transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5 shadow-lg shadow-white/10 flex items-center gap-2 group"
            >
              Launch Live Demo
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <a 
              href="#how-it-works" 
              className="px-8 py-4 rounded-xl bg-slate-800/50 text-slate-300 font-semibold text-lg hover:bg-slate-800 transition-all border border-slate-700/50"
            >
              How it works
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* Before / After Transformation Section */}
      <motion.section 
        id="how-it-works"
        className="py-24 px-6 w-full max-w-7xl mx-auto"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={sectionTransition}
      >
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">The Enrichment Pipeline</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">See how raw supplier data is instantly normalized, categorized, and validated.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-8 items-center">
          
          {/* Before: Raw Data */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-50" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6 border-b border-slate-700/50 pb-4">
                <Database className="w-6 h-6 text-slate-400" />
                <h3 className="font-semibold text-slate-200">Raw Supplier CSV</h3>
              </div>
              <div className="font-mono text-sm text-slate-400 space-y-3">
                <p className="opacity-70">Item,Desc,Brand,UOM</p>
                <p className="text-slate-300">"H823-9", "bolt hex hd 1/2-13x2 grd8", "acme", "ea"</p>
                <p className="text-slate-300">"W200", "washer flat 1/2 sz", "", "bx"</p>
                <p className="text-slate-300">"N-12", "nut hex 1/2-13", "acme corp", "box"</p>
              </div>
            </div>
          </div>

          {/* Animated Arrow Connector */}
          <div className="flex justify-center py-8 lg:py-0">
            <motion.div 
              animate={{ x: [0, 10, 0] }} 
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="hidden lg:block text-indigo-500"
            >
              <ArrowRight className="w-8 h-8" />
            </motion.div>
            <motion.div 
              animate={{ y: [0, 10, 0] }} 
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="lg:hidden text-indigo-500"
            >
              <Zap className="w-8 h-8" />
            </motion.div>
          </div>

          {/* After: Structured Data */}
          <div className="bg-slate-800/60 border border-indigo-500/30 rounded-2xl p-6 shadow-2xl shadow-indigo-500/10 relative overflow-hidden group hover:border-indigo-500/50 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-50" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6 border-b border-indigo-500/20 pb-4">
                <FileJson className="w-6 h-6 text-indigo-400" />
                <h3 className="font-semibold text-white">Structured Intelligence</h3>
              </div>
              
              <div className="space-y-4">
                <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50 relative group/tooltip">
                  <div className="text-xs text-indigo-400 mb-1 font-semibold">Normalized Brand</div>
                  <div className="text-sm text-slate-200">ACME Corporation</div>
                  
                  {/* Explainability Tooltip */}
                  <div className="absolute right-0 top-0 translate-x-4 -translate-y-full opacity-0 group-hover/tooltip:opacity-100 group-hover/tooltip:-translate-y-8 transition-all pointer-events-none z-20 bg-slate-800 border border-slate-700 rounded-md p-2 text-xs w-48 shadow-lg">
                    <span className="text-green-400 font-medium">98% Match:</span> Mapped "acme" & "acme corp" to master LOV entity.
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                  <div className="text-xs text-indigo-400 mb-1 font-semibold">Extracted Attributes</div>
                  <div className="flex gap-2 flex-wrap mt-1">
                    <span className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-xs border border-slate-700">Type: Hex Head</span>
                    <span className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-xs border border-slate-700">Size: 1/2-13x2</span>
                    <span className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-xs border border-slate-700">Grade: 8</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </motion.section>

      {/* Feature Grid */}
      <motion.section 
        className="py-24 px-6 bg-slate-900 w-full"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={staggerContainer}
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <motion.div variants={slideUpFade} className="p-8 rounded-2xl bg-slate-800/30 border border-slate-800 hover:bg-slate-800/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center mb-6">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Deterministic + LLM</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              We don't just guess. We use exact matching against master datasets first, falling back to LLMs for complex extractions with high confidence.
            </p>
          </motion.div>

          <motion.div variants={slideUpFade} className="p-8 rounded-2xl bg-slate-800/30 border border-slate-800 hover:bg-slate-800/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-6">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Auditable Traceability</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Every data point includes a confidence score and audit trail. Hover over extracted fields to see exactly why an AI decision was made.
            </p>
          </motion.div>

          <motion.div variants={slideUpFade} className="p-8 rounded-2xl bg-slate-800/30 border border-slate-800 hover:bg-slate-800/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-6">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">252-Column Standard</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Output perfectly complies with industrial distribution standards automatically. No manual mapping required for delivery formats.
            </p>
          </motion.div>

        </div>
      </motion.section>

      {/* CTA Section */}
      <section className="py-32 px-6 relative border-t border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/5 to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Ready to see it in action?</h2>
          <p className="text-slate-400 text-lg mb-10 max-w-2xl mx-auto">
            Experience the pipeline firsthand. Upload a messy CSV and watch it transform into production-ready catalog data.
          </p>
          <button 
            onClick={onLaunchDemo}
            className="px-10 py-5 rounded-2xl bg-indigo-500 text-white font-semibold text-lg hover:bg-indigo-600 transition-all duration-300 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-1"
          >
            Enter the Platform
          </button>
        </div>
      </section>

    </div>
  );
};

import React from 'react';
import { motion } from 'framer-motion';

export const AnimatedBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden z-0">
      
      {/* 1. Full-Screen Edge-to-Edge Animated Cybernetic Image Artwork */}
      <motion.div
        initial={{ scale: 1.05, x: '0%', y: '0%' }}
        animate={{
          scale: [1.05, 1.15, 1.08, 1.05],
          x: ['0%', '3%', '-2%', '0%'],
          y: ['0%', '-2%', '2%', '0%'],
        }}
        transition={{
          duration: 24,
          ease: 'easeInOut',
          repeat: Infinity,
          repeatType: 'reverse',
        }}
        className="absolute inset-[-10%] w-[120%] h-[120%] bg-cover bg-center bg-no-repeat opacity-85 filter contrast-125 saturate-150"
        style={{
          backgroundImage: `url('/assets/cybernetic_bg.jpg')`,
        }}
      />

      {/* 2. Vibrant Chromatic Aurora Lights Blending All Over the Screen */}
      {/* Left-Side Neon Cyan/Indigo Glow */}
      <motion.div 
        animate={{
          opacity: [0.6, 0.9, 0.6],
          scale: [1, 1.25, 1],
          x: ['-5%', '5%', '-5%']
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-[10%] -left-[10%] w-[55vw] h-[85vh] rounded-full bg-gradient-to-r from-cyan-500/45 via-indigo-600/40 to-transparent blur-[120px] mix-blend-screen"
      />

      {/* Right-Side Hot Pink/Magenta Glow */}
      <motion.div 
        animate={{
          opacity: [0.55, 0.85, 0.55],
          scale: [1, 1.2, 1],
          x: ['5%', '-5%', '5%']
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute top-[20%] -right-[10%] w-[55vw] h-[85vh] rounded-full bg-gradient-to-l from-pink-500/40 via-purple-600/45 to-transparent blur-[130px] mix-blend-screen"
      />

      {/* Bottom-Left Emerald Glow */}
      <motion.div 
        animate={{
          opacity: [0.5, 0.8, 0.5],
          scale: [1, 1.15, 1]
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        className="absolute -bottom-[10%] -left-[5%] w-[50vw] h-[70vh] rounded-full bg-gradient-to-tr from-emerald-500/35 via-cyan-500/35 to-transparent blur-[130px] mix-blend-screen"
      />

      {/* Bottom-Right Amber/Violet Glow */}
      <motion.div 
        animate={{
          opacity: [0.45, 0.75, 0.45],
          scale: [1, 1.2, 1]
        }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute -bottom-[10%] -right-[5%] w-[50vw] h-[70vh] rounded-full bg-gradient-to-tl from-amber-500/35 via-rose-600/35 to-transparent blur-[120px] mix-blend-screen"
      />

      {/* Center Atmospheric Spotlight */}
      <motion.div 
        animate={{
          opacity: [0.4, 0.7, 0.4],
          scale: [1, 1.1, 1]
        }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[35%] left-[25%] w-[50vw] h-[45vh] rounded-full bg-indigo-500/25 blur-[100px] mix-blend-screen"
      />

      {/* 3. Sweeping Laser Beam */}
      <div className="absolute top-0 left-[-100%] w-[300%] h-full bg-gradient-to-r from-transparent via-cyan-400/[0.12] via-pink-400/[0.08] to-transparent transform -skew-x-12 animate-sweep-slow mix-blend-screen" />

      {/* 4. Subtle Cyber Matrix Lines */}
      <div className="absolute inset-0 bg-cyber-grid opacity-30 mix-blend-overlay" />
      <div className="absolute inset-0 bg-scanlines opacity-20 mix-blend-multiply" />

      {/* 5. Liquid Glass Color Harmonizer (Non-destructive gentle tint) */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/40 via-[#020617]/20 to-[#020617]/60" />

      {/* 6. Floating Neon Data Particles */}
      <div className="absolute inset-0 w-full h-full">
        {[...Array(28)].map((_, i) => {
          const leftPos = (i * 3.6 + (i % 5) * 4.2) % 98;
          const topPos = (i * 6.9 + (i % 7) * 5.1) % 96;
          return (
            <motion.div
              key={i}
              initial={{
                left: `${leftPos}%`,
                top: `${topPos}%`,
                opacity: 0.3 + (i % 4) * 0.18,
                scale: 0.8 + (i % 3) * 0.5,
              }}
              animate={{
                top: [`${topPos}%`, `${(topPos - 20 + 100) % 100}%`, `${topPos}%`],
                x: [0, (i % 2 === 0 ? 20 : -20), 0],
                opacity: [0.3, 0.9, 0.3],
              }}
              transition={{
                duration: 6 + (i % 5) * 2,
                ease: 'easeInOut',
                repeat: Infinity,
                delay: (i % 6) * 0.7,
              }}
              className={`absolute w-1.5 h-1.5 rounded-full ${
                i % 4 === 0 ? 'bg-cyan-400 shadow-[0_0_15px_#22d3ee]' : 
                i % 4 === 1 ? 'bg-indigo-400 shadow-[0_0_15px_#818cf8]' : 
                i % 4 === 2 ? 'bg-pink-400 shadow-[0_0_15px_#f472b6]' :
                'bg-emerald-400 shadow-[0_0_15px_#34d399]'
              }`}
            />
          );
        })}
      </div>

    </div>
  );
};

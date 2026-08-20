import React from 'react';
import { motion } from 'framer-motion';

export const AnimatedBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden z-0 bg-[#020617]">
      
      {/* 1. Full-Screen Edge-to-Edge Animated Cybernetic Image Artwork (Subtle Dark Mode) */}
      <motion.div
        initial={{ scale: 1.05, x: '0%', y: '0%' }}
        animate={{
          scale: [1.05, 1.12, 1.07, 1.05],
          x: ['0%', '2%', '-1.5%', '0%'],
          y: ['0%', '-1.5%', '1.5%', '0%'],
        }}
        transition={{
          duration: 28,
          ease: 'easeInOut',
          repeat: Infinity,
          repeatType: 'reverse',
        }}
        className="absolute inset-[-10%] w-[120%] h-[120%] bg-cover bg-center bg-no-repeat opacity-25 filter brightness-50 contrast-130 saturate-125"
        style={{
          backgroundImage: `url('/assets/cybernetic_bg.jpg')`,
        }}
      />

      {/* 2. Soft Ambient Aurora Lights (Calibrated for High Text Contrast) */}
      {/* Left-Side Cyan/Indigo Glow */}
      <motion.div 
        animate={{
          opacity: [0.25, 0.45, 0.25],
          scale: [1, 1.18, 1],
          x: ['-4%', '3%', '-4%']
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-[10%] -left-[10%] w-[50vw] h-[80vh] rounded-full bg-gradient-to-r from-cyan-500/25 via-indigo-600/20 to-transparent blur-[140px] mix-blend-screen"
      />

      {/* Right-Side Magenta/Violet Glow */}
      <motion.div 
        animate={{
          opacity: [0.22, 0.4, 0.22],
          scale: [1, 1.15, 1],
          x: ['4%', '-3%', '4%']
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute top-[20%] -right-[10%] w-[50vw] h-[80vh] rounded-full bg-gradient-to-l from-pink-500/20 via-purple-600/25 to-transparent blur-[150px] mix-blend-screen"
      />

      {/* Bottom-Left Emerald Glow */}
      <motion.div 
        animate={{
          opacity: [0.2, 0.38, 0.2],
          scale: [1, 1.12, 1]
        }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        className="absolute -bottom-[10%] -left-[5%] w-[45vw] h-[65vh] rounded-full bg-gradient-to-tr from-emerald-500/18 via-cyan-500/18 to-transparent blur-[140px] mix-blend-screen"
      />

      {/* Bottom-Right Amber Glow */}
      <motion.div 
        animate={{
          opacity: [0.18, 0.35, 0.18],
          scale: [1, 1.15, 1]
        }}
        transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute -bottom-[10%] -right-[5%] w-[45vw] h-[65vh] rounded-full bg-gradient-to-tl from-amber-500/18 via-rose-600/18 to-transparent blur-[130px] mix-blend-screen"
      />

      {/* 3. Sweeping Subtle Laser Beam */}
      <div className="absolute top-0 left-[-100%] w-[300%] h-full bg-gradient-to-r from-transparent via-cyan-400/[0.04] to-transparent transform -skew-x-12 animate-sweep-slow mix-blend-screen" />

      {/* 4. Subtle Cyber Matrix Lines & Scanlines */}
      <div className="absolute inset-0 bg-cyber-grid opacity-15 mix-blend-overlay" />
      <div className="absolute inset-0 bg-scanlines opacity-10 mix-blend-multiply" />

      {/* 5. Deep High-Contrast Dark Scrim (Ensures 100% Text Readability) */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/80 via-[#020617]/65 to-[#020617]/90" />

      {/* 6. Floating Neon Data Particles */}
      <div className="absolute inset-0 w-full h-full">
        {[...Array(20)].map((_, i) => {
          const leftPos = (i * 4.8 + (i % 5) * 3.7) % 98;
          const topPos = (i * 7.4 + (i % 7) * 4.9) % 96;
          return (
            <motion.div
              key={i}
              initial={{
                left: `${leftPos}%`,
                top: `${topPos}%`,
                opacity: 0.2 + (i % 4) * 0.12,
                scale: 0.7 + (i % 3) * 0.4,
              }}
              animate={{
                top: [`${topPos}%`, `${(topPos - 18 + 100) % 100}%`, `${topPos}%`],
                x: [0, (i % 2 === 0 ? 15 : -15), 0],
                opacity: [0.2, 0.65, 0.2],
              }}
              transition={{
                duration: 7 + (i % 5) * 2,
                ease: 'easeInOut',
                repeat: Infinity,
                delay: (i % 6) * 0.7,
              }}
              className={`absolute w-1 h-1 rounded-full ${
                i % 4 === 0 ? 'bg-cyan-400 shadow-[0_0_10px_#22d3ee]' : 
                i % 4 === 1 ? 'bg-indigo-400 shadow-[0_0_10px_#818cf8]' : 
                i % 4 === 2 ? 'bg-pink-400 shadow-[0_0_10px_#f472b6]' :
                'bg-emerald-400 shadow-[0_0_10px_#34d399]'
              }`}
            />
          );
        })}
      </div>

    </div>
  );
};

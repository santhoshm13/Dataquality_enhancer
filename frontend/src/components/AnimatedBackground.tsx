import React from 'react';
import { motion } from 'framer-motion';

export const AnimatedBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 w-screen h-screen pointer-events-none overflow-hidden -z-20">
      
      {/* 1. Full-Screen Edge-to-Edge Animated Cybernetic Texture */}
      <motion.div
        initial={{ scale: 1.02, x: '0%', y: '0%' }}
        animate={{
          scale: [1.02, 1.08, 1.03, 1.02],
          x: ['0%', '2%', '-1.5%', '0%'],
          y: ['0%', '-2%', '1%', '0%'],
        }}
        transition={{
          duration: 28,
          ease: 'easeInOut',
          repeat: Infinity,
          repeatType: 'reverse',
        }}
        className="absolute inset-[-5%] w-[110%] h-[110%] bg-cover bg-center bg-no-repeat opacity-40 mix-blend-screen filter contrast-125 saturate-150"
        style={{
          backgroundImage: `url('/assets/cybernetic_bg.jpg')`,
        }}
      />

      {/* 2. Side-Bleeding Ambient Aurora Lighting (Mingles Across Left & Right Sides) */}
      {/* Left-Side Aurora Bloom */}
      <motion.div 
        animate={{
          opacity: [0.45, 0.75, 0.45],
          scale: [1, 1.15, 1],
          x: ['0%', '-5%', '0%']
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-[10%] -left-[15%] w-[70vw] md:w-[45vw] h-[80vh] rounded-full bg-gradient-to-r from-cyan-500/30 via-indigo-600/35 to-transparent blur-[140px] mix-blend-screen"
      />

      {/* Right-Side Aurora Bloom */}
      <motion.div 
        animate={{
          opacity: [0.4, 0.7, 0.4],
          scale: [1, 1.2, 1],
          x: ['0%', '5%', '0%']
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute top-[25%] -right-[15%] w-[75vw] md:w-[50vw] h-[85vh] rounded-full bg-gradient-to-l from-pink-500/28 via-purple-600/35 to-transparent blur-[150px] mix-blend-screen"
      />

      {/* Far Bottom-Left Emerald Bloom */}
      <motion.div 
        animate={{
          opacity: [0.35, 0.65, 0.35],
          scale: [1, 1.15, 1]
        }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        className="absolute -bottom-[15%] -left-[10%] w-[65vw] md:w-[40vw] h-[70vh] rounded-full bg-gradient-to-tr from-emerald-500/25 via-cyan-600/25 to-transparent blur-[140px] mix-blend-screen"
      />

      {/* Far Bottom-Right Gold/Amber Bloom */}
      <motion.div 
        animate={{
          opacity: [0.3, 0.6, 0.3],
          scale: [1, 1.18, 1]
        }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute -bottom-[10%] -right-[10%] w-[60vw] md:w-[40vw] h-[65vh] rounded-full bg-gradient-to-tl from-amber-500/25 via-rose-600/25 to-transparent blur-[130px] mix-blend-screen"
      />

      {/* Top Center Violet/Indigo Spotlight */}
      <motion.div 
        animate={{
          opacity: [0.5, 0.8, 0.5],
          scale: [1, 1.1, 1]
        }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-[20%] left-[20%] w-[60vw] h-[55vh] rounded-full bg-gradient-to-b from-indigo-500/30 via-purple-500/20 to-transparent blur-[130px] mix-blend-screen"
      />

      {/* 3. Edge-to-Edge Cybernetic Grid Mesh with Colorful Glow */}
      <div className="absolute inset-0 bg-cyber-grid opacity-25 mix-blend-overlay" />

      {/* 4. Full-Width CRT Scanline Phosphor Overlay */}
      <div className="absolute inset-0 bg-scanlines opacity-15" />

      {/* 5. Sweeping Diagonal Light Laser Across Full Screen Width */}
      <div className="absolute top-0 left-[-100%] w-[300%] h-full bg-gradient-to-r from-transparent via-cyan-400/[0.07] via-pink-400/[0.05] to-transparent transform -skew-x-12 animate-sweep-slow mix-blend-screen" />

      {/* 6. Edge-to-Edge Chromatic Ambient Tint (Blends Full Body Edge to Edge) */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-950/25 via-transparent to-purple-950/25" />
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/20 via-transparent to-[#020617]/70" />

      {/* 7. Floating Luminous Cyber Particles (Edge to Edge 100vw) */}
      <div className="absolute inset-0 w-full h-full">
        {[...Array(24)].map((_, i) => {
          // Spread positions completely from 0% to 100% of viewport width
          const leftPos = (i * 4.2 + (i % 7) * 2.5) % 98;
          const topPos = (i * 7.8 + (i % 5) * 6.3) % 96;
          return (
            <motion.div
              key={i}
              initial={{
                left: `${leftPos}%`,
                top: `${topPos}%`,
                opacity: 0.25 + (i % 4) * 0.15,
                scale: 0.8 + (i % 3) * 0.4,
              }}
              animate={{
                top: [`${topPos}%`, `${(topPos - 18 + 100) % 100}%`, `${topPos}%`],
                x: [0, (i % 2 === 0 ? 15 : -15), 0],
                opacity: [0.2, 0.75, 0.2],
              }}
              transition={{
                duration: 7 + (i % 5) * 2,
                ease: 'easeInOut',
                repeat: Infinity,
                delay: (i % 6) * 0.8,
              }}
              className={`absolute w-1.5 h-1.5 rounded-full ${
                i % 4 === 0 ? 'bg-cyan-400 shadow-[0_0_12px_#22d3ee]' : 
                i % 4 === 1 ? 'bg-indigo-400 shadow-[0_0_12px_#818cf8]' : 
                i % 4 === 2 ? 'bg-pink-400 shadow-[0_0_12px_#f472b6]' :
                'bg-emerald-400 shadow-[0_0_12px_#34d399]'
              }`}
            />
          );
        })}
      </div>

    </div>
  );
};

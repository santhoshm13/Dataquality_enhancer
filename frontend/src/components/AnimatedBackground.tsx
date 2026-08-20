import React from 'react';
import { motion } from 'framer-motion';

export const AnimatedBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-20">
      
      {/* 1. Animated Image Background (Ken Burns Cybernetic Motion) */}
      <motion.div
        initial={{ scale: 1.02, x: '-1%', y: '-1%' }}
        animate={{
          scale: [1.02, 1.1, 1.04, 1.02],
          x: ['-1%', '1.5%', '-0.5%', '-1%'],
          y: ['-1%', '-1.5%', '1%', '-1%'],
        }}
        transition={{
          duration: 32,
          ease: 'easeInOut',
          repeat: Infinity,
          repeatType: 'reverse',
        }}
        className="absolute inset-[-40px] bg-cover bg-center bg-no-repeat opacity-35 filter brightness-90 contrast-125"
        style={{
          backgroundImage: `url('/assets/cybernetic_bg.jpg')`,
        }}
      />

      {/* 2. Cybernetic Scanline Sweep Effect */}
      <div className="absolute inset-0 bg-scanlines opacity-20" />
      
      {/* 3. Subtle Cybernetic Grid Mesh Overlay */}
      <div className="absolute inset-0 bg-cyber-grid opacity-15" />

      {/* 4. Sweeping Laser / Light Beam */}
      <div className="absolute top-0 left-[-100%] w-[200%] h-full bg-gradient-to-r from-transparent via-cyan-500/[0.04] to-transparent transform -skew-x-12 animate-sweep-slow" />

      {/* 5. Deep Atmospheric Dark Vignette & Color Gradients */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/70 via-[#020617]/50 to-[#020617]/95" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(2,6,23,0.85)_100%)]" />

      {/* 6. Floating Cyber Data Particles */}
      <div className="absolute inset-0">
        {[...Array(16)].map((_, i) => (
          <motion.div
            key={i}
            initial={{
              x: `${(i * 6.25 + 3) % 100}%`,
              y: `${(i * 13 + 10) % 100}%`,
              opacity: 0.2 + (i % 5) * 0.12,
              scale: 0.8 + (i % 3) * 0.4,
            }}
            animate={{
              y: [`${(i * 13 + 10) % 100}%`, `${((i * 13 + 10) % 100) - 25}%`, `${(i * 13 + 10) % 100}%`],
              opacity: [0.15, 0.6, 0.15],
            }}
            transition={{
              duration: 8 + (i % 6) * 2.5,
              ease: 'easeInOut',
              repeat: Infinity,
              delay: (i % 4) * 1.2,
            }}
            className={`absolute w-1.5 h-1.5 rounded-full ${
              i % 3 === 0 ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]' : 
              i % 3 === 1 ? 'bg-indigo-400 shadow-[0_0_8px_#818cf8]' : 
              'bg-pink-400 shadow-[0_0_8px_#f472b6]'
            }`}
          />
        ))}
      </div>

    </div>
  );
};

import React from 'react';

export const AnimatedBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden z-0 bg-[#000000]">
      {/* Top Subtle Ambient Light (Subdued Green) */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[350px] bg-emerald-500/[0.025] rounded-full blur-[160px] pointer-events-none" 
      />

      {/* Crisp Architectural Enterprise Grid */}
      <div className="absolute inset-0 bg-enterprise-grid pointer-events-none opacity-50" />

      {/* Deep Pure Black Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/80 to-[#000000] pointer-events-none" />
    </div>
  );
};

export default AnimatedBackground;

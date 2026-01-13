
import React, { useEffect } from 'react';

const CRTOverlay: React.FC = () => {
  return (
    <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden h-full w-full mix-blend-overlay opacity-30">
      {/* Scanline moving bar - Slower and subtler */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(255,255,255,0.03)] to-transparent animate-scanline h-[100vh] w-full" />
      
      {/* Static scanlines - Very fine */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_3px,3px_100%] pointer-events-none" />
      
      {/* Vignette - Softer */}
      <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_60%,rgba(0,0,0,0.4)_150%)]" />
    </div>
  );
};

export default CRTOverlay;

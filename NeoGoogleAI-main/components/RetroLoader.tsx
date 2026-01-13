
import React from 'react';

interface RetroLoaderProps {
  text?: string;
  size?: 'sm' | 'lg';
  className?: string;
}

const RetroLoader: React.FC<RetroLoaderProps> = ({ text, size = 'sm', className = '' }) => {
  const dim = size === 'lg' ? 'w-16 h-16' : 'w-4 h-4';
  const gap = size === 'lg' ? 'gap-1' : 'gap-0.5';
  
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Pixel Spinner: 4 squares rotating in steps */}
      <div className={`relative ${dim} grid grid-cols-2 ${gap} animate-[spin_0.8s_steps(4)_infinite]`}>
          <div className="bg-current opacity-100 shadow-[0_0_10px_currentColor]"></div>
          <div className="bg-current opacity-20"></div>
          <div className="bg-current opacity-20"></div>
          <div className="bg-current opacity-100 shadow-[0_0_10px_currentColor]"></div>
      </div>
      
      {/* Text with blinking cursor */}
      {text && (
        <span className={`font-pixel tracking-widest animate-pulse ${size === 'lg' ? 'text-2xl mt-6' : 'text-[10px] ml-2'}`}>
          {text}
          <span className="animate-[ping_1s_steps(2)_infinite] inline-block ml-1 opacity-75">_</span>
        </span>
      )}
    </div>
  );
};

export default RetroLoader;

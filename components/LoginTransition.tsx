import React from 'react';

const LoginTransition: React.FC = () => (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center text-green-500 font-pixel">
      <div className="space-y-4 text-center p-4">
        <div className="text-3xl md:text-5xl animate-pulse font-bold tracking-widest text-shadow-glow">
            ACCESS GRANTED
        </div>
        <div className="font-mono text-xs md:text-sm opacity-80 flex flex-col gap-1">
            <span className="animate-[fade_0.5s_ease-in-out_infinite]">DECRYPTING USER DATA...</span>
            <span className="text-[10px] opacity-60">KEY: RSA-4096-VERIFIED</span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-64 h-3 border-2 border-green-900 p-0.5 mx-auto rounded relative overflow-hidden bg-green-900/20">
           <div 
             className="h-full bg-green-500 animate-[width_2.5s_cubic-bezier(0.4,0,0.2,1)_forwards]" 
             style={{width: '0%', boxShadow: '0 0 10px #22c55e'}}
           ></div>
        </div>

        <div className="font-mono text-[10px] opacity-50 mt-4 animate-pulse">
           ESTABLISHING SECURE CONNECTION TO MATRIX...
        </div>
      </div>
      <style>{`
        @keyframes width {
          0% { width: 5%; }
          30% { width: 45%; }
          60% { width: 55%; }
          80% { width: 90%; }
          100% { width: 100%; }
        }
        .text-shadow-glow {
            text-shadow: 0 0 10px #22c55e, 0 0 20px #22c55e;
        }
      `}</style>
    </div>
);

export default LoginTransition;
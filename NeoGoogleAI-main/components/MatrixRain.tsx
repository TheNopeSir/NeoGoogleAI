
import React, { useEffect, useRef } from 'react';

interface MatrixRainProps {
  theme: 'dark' | 'light';
}

const MatrixRain: React.FC<MatrixRainProps> = ({ theme }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Disable rain in light mode for visual comfort
    if (theme === 'light') {
        const canvas = canvasRef.current;
        if (canvas) {
             const ctx = canvas.getContext('2d');
             if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const columns = Math.floor(width / 20);
    const drops: number[] = new Array(columns).fill(1);
    
    // Katakana and latin characters
    const chars = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    const draw = () => {
      // Very transparent black for trail effect (softer than before)
      ctx.fillStyle = 'rgba(9, 9, 11, 0.1)'; 
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#22c55e'; // Tailwind green-500 equivalent
      ctx.font = '15px monospace';

      for (let i = 0; i < drops.length; i++) {
        const text = chars.charAt(Math.floor(Math.random() * chars.length));
        ctx.fillText(text, i * 20, drops[i] * 20);

        if (drops[i] * 20 > height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const intervalId = setInterval(draw, 50); // Slower framerate for comfort

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('resize', handleResize);
    };
  }, [theme]);

  return (
    <canvas 
      ref={canvasRef} 
      className={`fixed top-0 left-0 w-full h-full -z-10 transition-opacity duration-500 pointer-events-none ${theme === 'light' ? 'opacity-0' : 'opacity-15'}`}
    />
  );
};

export default MatrixRain;

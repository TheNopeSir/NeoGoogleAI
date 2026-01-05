
import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Volume2, VolumeX, Activity, Radio } from 'lucide-react';

interface CyberRadioProps {
    theme: 'dark' | 'light' | 'xp' | 'winamp';
}

const CyberRadio: React.FC<CyberRadioProps> = ({ theme }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(0.3);
    const [isMuted, setIsMuted] = useState(false);
    const [frequency, setFrequency] = useState(88.5);
    
    // Audio Context Refs
    const audioCtxRef = useRef<AudioContext | null>(null);
    const masterGainRef = useRef<GainNode | null>(null);
    const oscillatorsRef = useRef<OscillatorNode[]>([]);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>();

    const isWinamp = theme === 'winamp';
    const isXP = theme === 'xp';

    // Initialize Audio Engine
    const initAudio = () => {
        if (audioCtxRef.current) return;

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;

        const masterGain = ctx.createGain();
        masterGain.gain.value = volume;
        masterGain.connect(ctx.destination);
        masterGainRef.current = masterGain;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64; // Low res for retro look
        masterGain.connect(analyser);
        analyserRef.current = analyser;
    };

    const startDrone = () => {
        if (!audioCtxRef.current) initAudio();
        const ctx = audioCtxRef.current!;
        const master = masterGainRef.current!;

        if (ctx.state === 'suspended') ctx.resume();

        // Create 3 oscillators for a "Sci-Fi Drone" sound
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const osc3 = ctx.createOscillator(); // Sub-bass
        const lfo = ctx.createOscillator(); // LFO for movement

        const lfoGain = ctx.createGain();
        
        osc1.type = 'sawtooth';
        osc1.frequency.value = 110; // A2
        
        osc2.type = 'sine';
        osc2.frequency.value = 112; // Slight detune for beating effect

        osc3.type = 'triangle';
        osc3.frequency.value = 55; // A1 (Sub)

        lfo.frequency.value = 0.1; // Slow modulation
        lfoGain.gain.value = 500; // Filter modulation depth

        // Filter
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;
        filter.Q.value = 1;

        // Connections
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        osc1.connect(filter);
        osc2.connect(filter);
        osc3.connect(master); // Sub bypasses filter slightly or connects to it
        filter.connect(master);

        // Start
        const now = ctx.currentTime;
        osc1.start(now);
        osc2.start(now);
        osc3.start(now);
        lfo.start(now);

        oscillatorsRef.current = [osc1, osc2, osc3, lfo];
        setIsPlaying(true);
        drawVisualizer();
    };

    const stopDrone = () => {
        oscillatorsRef.current.forEach(osc => {
            try {
                osc.stop();
                osc.disconnect();
            } catch(e) {}
        });
        oscillatorsRef.current = [];
        setIsPlaying(false);
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };

    const togglePlay = () => {
        if (isPlaying) stopDrone();
        else startDrone();
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setVolume(val);
        if (masterGainRef.current) {
            masterGainRef.current.gain.setTargetAtTime(isMuted ? 0 : val, audioCtxRef.current!.currentTime, 0.1);
        }
    };

    const drawVisualizer = () => {
        if (!canvasRef.current || !analyserRef.current) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            if (!isPlaying) return;
            animationRef.current = requestAnimationFrame(draw);
            analyserRef.current!.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Background fill
            ctx.fillStyle = isWinamp ? '#000' : 'rgba(0,0,0,0.2)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2;

                if (isWinamp) {
                    ctx.fillStyle = `rgb(0, ${barHeight + 100}, 0)`; // Green bars
                } else if (isXP) {
                    ctx.fillStyle = `rgb(${barHeight + 50}, ${barHeight + 50}, 255)`; // Blue bars
                } else {
                    ctx.fillStyle = `rgb(74, 222, 128)`; // Tailwind green-400
                }

                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                x += barWidth + 1;
            }
        };
        draw();
    };

    // Cleanup
    useEffect(() => {
        return () => {
            stopDrone();
            if (audioCtxRef.current) audioCtxRef.current.close();
        };
    }, []);

    // Change frequency animation
    useEffect(() => {
        if (!isPlaying) return;
        const interval = setInterval(() => {
            setFrequency(prev => +(prev + (Math.random() - 0.5) * 0.1).toFixed(1));
        }, 1000);
        return () => clearInterval(interval);
    }, [isPlaying]);

    return (
        <div className={`fixed bottom-20 right-4 z-40 transition-all duration-300 w-64 ${isWinamp ? 'bg-[#292929] border-t-2 border-l-2 border-r-2 border-b-2 border-t-[#505050] border-l-[#505050] border-r-[#101010] border-b-[#101010] shadow-xl' : isXP ? 'bg-[#ECE9D8] border-2 border-[#0058EE] rounded-t-lg shadow-lg' : theme === 'dark' ? 'bg-black/90 border border-green-500/30 rounded-xl backdrop-blur-md shadow-[0_0_20px_rgba(74,222,128,0.1)]' : 'bg-white border border-gray-200 rounded-xl shadow-xl'}`}>
            
            {/* Header */}
            {isWinamp ? (
                <div className="h-4 bg-gradient-to-r from-wa-blue-light to-wa-blue-dark flex items-center justify-between px-1 cursor-default select-none mb-1">
                    <span className="text-white font-winamp text-[10px] tracking-widest uppercase">CYBER_DECK // {frequency} FM</span>
                    <div className="flex gap-0.5">
                        <div className="w-2 h-2 bg-[#DCDCDC] border border-t-white border-l-white border-r-[#505050] border-b-[#505050]"></div>
                        <div onClick={togglePlay} className="w-2 h-2 bg-[#D64434] border border-t-white border-l-white border-r-[#505050] border-b-[#505050] cursor-pointer"></div>
                    </div>
                </div>
            ) : isXP ? (
                <div className="h-6 bg-gradient-to-r from-[#0058EE] to-[#3F8CF3] rounded-t-[4px] flex items-center justify-between px-2">
                    <span className="text-white font-bold text-[10px] italic">Windows Media Player</span>
                    <div className="w-3 h-3 bg-[#D64434] rounded-[2px] border border-white/30 shadow-inner"></div>
                </div>
            ) : (
                <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-pixel text-green-500 animate-pulse">
                        <Activity size={12} /> NEURAL_RADIO
                    </div>
                    <div className="text-[9px] font-mono opacity-50">{frequency} MHz</div>
                </div>
            )}

            {/* Visualizer & Controls */}
            <div className="p-3">
                <div className={`relative h-12 w-full mb-3 overflow-hidden ${isWinamp ? 'bg-black border border-[#505050]' : 'bg-black/20 rounded'}`}>
                    <canvas ref={canvasRef} width={256} height={64} className="w-full h-full" />
                    {!isPlaying && (
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono opacity-50 pointer-events-none">
                            OFFLINE
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between gap-3">
                    <button 
                        onClick={togglePlay}
                        className={`p-2 rounded-full transition-all ${isWinamp ? 'border border-[#505050] hover:bg-[#505050]' : isXP ? 'bg-gradient-to-b from-white to-[#ECE9D8] border border-gray-400 hover:bg-white' : isPlaying ? 'bg-green-500 text-black shadow-[0_0_10px_#4ade80]' : 'bg-white/10 hover:bg-white/20'}`}
                    >
                        {isPlaying ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                    </button>

                    <div className="flex-1 flex items-center gap-2">
                        <button onClick={() => setIsMuted(!isMuted)} className="opacity-50 hover:opacity-100">
                            {isMuted || volume === 0 ? <VolumeX size={12} /> : <Volume2 size={12} />}
                        </button>
                        <input 
                            type="range" 
                            min="0" 
                            max="1" 
                            step="0.05" 
                            value={volume} 
                            onChange={handleVolumeChange}
                            className={`w-full h-1 appearance-none rounded-lg cursor-pointer ${isWinamp ? 'bg-[#505050]' : 'bg-white/20'}`} 
                        />
                    </div>
                </div>
                
                {isPlaying && (
                    <div className="mt-2 text-[8px] font-mono opacity-50 text-center scrolling-text overflow-hidden whitespace-nowrap">
                        GENERATING PROCEDURAL SOUNDSCAPE /// BIOME: INDUSTRIAL_SECTOR /// 
                    </div>
                )}
            </div>
        </div>
    );
};

export default CyberRadio;

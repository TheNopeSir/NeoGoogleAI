
import React from 'react';
import { Trophy, ArrowLeft, Lock, CheckCircle2 } from 'lucide-react';
import { BADGE_CONFIG } from '../constants';
import { AchievementProgress } from '../types';

interface HallOfFameProps {
  theme: 'dark' | 'light' | 'xp' | 'winamp';
  achievements: AchievementProgress[];
  onBack: () => void;
}

const HallOfFame: React.FC<HallOfFameProps> = ({ theme, achievements, onBack }) => {
  const isWinamp = theme === 'winamp';
  
  return (
    <div className={`max-w-4xl mx-auto animate-in fade-in pb-20 px-4 ${isWinamp ? 'font-mono text-gray-300' : ''}`}>
        <button onClick={onBack} className={`flex items-center gap-2 mb-8 hover:underline opacity-70 font-pixel text-xs ${isWinamp ? 'text-[#00ff00]' : ''}`}>
             <ArrowLeft size={16} /> НАЗАД
        </button>

        <div className="text-center mb-12">
            <h1 className={`text-3xl md:text-5xl font-pixel font-black mb-4 flex items-center justify-center gap-4 ${isWinamp ? 'text-[#00ff00]' : ''}`}>
                <Trophy size={40} className="text-yellow-500" /> ЗАЛ СЛАВЫ
            </h1>
            <p className="font-mono text-sm opacity-60 uppercase tracking-widest">Прогресс синхронизации нейронных узлов.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(BADGE_CONFIG).map(([id, config]) => {
                const progress = achievements.find(a => a.id === id) || { current: 0, target: config.target, unlocked: false };
                const percent = Math.min(100, (progress.current / config.target) * 100);
                
                return (
                    <div 
                        key={id}
                        className={`relative p-6 rounded-3xl border-2 transition-all group ${
                            isWinamp 
                             ? (progress.unlocked ? 'bg-[#191919] border-[#00ff00]' : 'bg-[#191919] border-[#505050] opacity-50')
                             : (progress.unlocked 
                                 ? 'bg-dark-surface border-green-500/50 shadow-[0_0_20px_rgba(74,222,128,0.2)]'
                                 : 'bg-black/40 border-white/5 opacity-60 grayscale hover:grayscale-0 hover:opacity-100'
                               )
                        }`}
                    >
                        <div className="flex items-start gap-4 mb-6">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${progress.unlocked ? config.color : 'bg-white/10'} text-black shadow-lg`}>
                                 <config.icon size={28} className={progress.unlocked ? 'text-black' : 'text-white/30'} />
                            </div>
                            <div className="flex-1">
                                <h3 className={`font-pixel text-sm font-black mb-1 flex items-center gap-2 ${isWinamp && progress.unlocked ? 'text-[#00ff00]' : ''}`}>
                                    {config.label}
                                    {progress.unlocked && <CheckCircle2 size={14} className="text-green-400" />}
                                </h3>
                                <p className="font-mono text-[10px] opacity-60 leading-relaxed uppercase">{config.desc}</p>
                            </div>
                        </div>

                        {/* Individual Progress Bar */}
                        <div className="space-y-2">
                            <div className="flex justify-between font-mono text-[9px] font-bold">
                                <span>ПРОГРЕСС: {progress.current} / {config.target}</span>
                                <span>{Math.round(percent)}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-1000 ${progress.unlocked ? 'bg-green-500 shadow-[0_0_10px_#4ade80]' : 'bg-white/20'}`}
                                    style={{ width: `${percent}%` }}
                                />
                            </div>
                        </div>
                        
                        {!progress.unlocked && (
                            <div className="absolute top-4 right-4"><Lock size={14} className="opacity-20" /></div>
                        )}
                    </div>
                );
            })}
        </div>
    </div>
  );
};

export default HallOfFame;

import React from 'react';
import { Trophy, ArrowLeft, Lock, CheckCircle2 } from 'lucide-react';
import { BADGE_CONFIG } from '../constants';
import { AchievementProgress } from '../types';
import MatrixIcon from './MatrixIcon';
import XI from './XI';

interface HallOfFameProps {
  theme: 'dark' | 'light' | 'xp' | 'winamp';
  achievements: AchievementProgress[];
  username?: string;
  onBack: () => void;
}

const TIER_UNLOCKED_STYLES: Record<string, string> = {
  EPIC:     'bg-dark-surface border-orange-500/60 shadow-[0_0_30px_rgba(249,115,22,0.35)]',
  RARE:     'bg-dark-surface border-purple-500/60 shadow-[0_0_25px_rgba(168,85,247,0.3)]',
  UNCOMMON: 'bg-dark-surface border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.25)]',
  COMMON:   'bg-dark-surface border-green-500/50 shadow-[0_0_20px_rgba(74,222,128,0.2)]',
};
const TIER_BAR_COLORS: Record<string, string> = {
  EPIC:     'bg-orange-500 shadow-[0_0_8px_#f97316]',
  RARE:     'bg-purple-500 shadow-[0_0_8px_#a855f7]',
  UNCOMMON: 'bg-blue-500 shadow-[0_0_8px_#3b82f6]',
  COMMON:   'bg-green-500 shadow-[0_0_10px_#4ade80]',
};

const HallOfFame: React.FC<HallOfFameProps> = ({ theme, achievements, username, onBack }) => {
  const isWinamp = theme === 'winamp';
  const isXp = theme === 'xp';
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  return (
    <div className={`max-w-4xl mx-auto animate-in fade-in pb-20 px-4 ${isWinamp ? 'font-mono text-gray-300' : ''}`}>
        <button onClick={onBack} className={`flex items-center gap-2 mb-8 hover:underline opacity-70 font-pixel text-xs ${isWinamp ? 'text-[#00ff00]' : ''}`}>
             <XI icon={ArrowLeft} size={16} /> НАЗАД
        </button>

        <div className="text-center mb-12">
            <h1 className={`text-3xl md:text-5xl font-pixel font-black mb-4 flex items-center justify-center gap-4 ${isWinamp ? 'text-[#00ff00]' : ''}`}>
                <MatrixIcon icon={Trophy} size={40} color="#fbbf24" glow={2} theme={theme} /> ЗАЛ СЛАВЫ
            </h1>
            {username && (
                <p className="font-mono text-xs opacity-40 mb-1 tracking-widest">@{username}</p>
            )}
            <p className="font-mono text-sm opacity-60 uppercase tracking-widest">Прогресс синхронизации нейронных узлов.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(BADGE_CONFIG).map(([id, config]) => {
                const progress = achievements.find(a => a.id === id) || { current: 0, target: config.target, unlocked: false };
                // Cap display: never show current > target
                const displayCurrent = Math.min(progress.current, config.target);
                const percent = Math.min(100, (displayCurrent / config.target) * 100);
                const isExpanded = expandedId === id;
                const hint = (config as any).hint as string | undefined;

                return (
                    <div
                        key={id}
                        onClick={() => hint && setExpandedId(isExpanded ? null : id)}
                        className={`relative p-6 rounded-3xl border-2 transition-all group ${hint ? 'cursor-pointer' : ''} ${
                            isWinamp
                             ? (progress.unlocked ? 'bg-[#191919] border-[#00ff00]' : 'bg-[#191919] border-[#505050] opacity-50')
                             : isXp
                             ? (progress.unlocked
                                 ? 'bg-white border-xp-blue shadow-md shadow-xp-blue/20'
                                 : 'bg-xp-surface border-xp-navy/20 opacity-60 grayscale hover:grayscale-0 hover:opacity-100'
                               )
                             : (progress.unlocked
                                 ? (TIER_UNLOCKED_STYLES[(config as any).tier] ?? TIER_UNLOCKED_STYLES.COMMON)
                                 : 'bg-black/40 border-white/5 opacity-60 grayscale hover:grayscale-0 hover:opacity-100'
                               )
                        }`}
                    >
                        <div className="flex items-start gap-4 mb-6">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${progress.unlocked ? config.color : isXp ? 'bg-xp-navy/10' : 'bg-white/10'} text-black shadow-lg`}>
                                 {progress.unlocked
                                     ? <MatrixIcon icon={config.icon} size={28} color="#000000" glow={0} theme={theme} />
                                     : <config.icon size={28} className={isXp ? 'text-xp-navy/30' : 'text-white/30'} />
                                 }
                            </div>
                            <div className="flex-1">
                                <h3 className={`font-pixel text-sm font-black mb-1 flex items-center gap-2 ${isWinamp && progress.unlocked ? 'text-[#00ff00]' : ''}`}>
                                    {config.label}
                                    {progress.unlocked && <MatrixIcon icon={CheckCircle2} size={14} color="#4ade80" glow={1} theme={theme} />}
                                </h3>
                                <p className="font-mono text-[10px] opacity-60 leading-relaxed uppercase">{config.desc}</p>
                            </div>
                            {hint && (
                                <div className={`text-[10px] opacity-30 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▾</div>
                            )}
                        </div>

                        {/* Individual Progress Bar */}
                        <div className="space-y-2">
                            <div className="flex justify-between font-mono text-[9px] font-bold">
                                <span>ПРОГРЕСС: {displayCurrent} / {config.target}</span>
                                <span>{Math.round(percent)}%</span>
                            </div>
                            <div className={`w-full h-1.5 rounded-full overflow-hidden ${isXp ? 'bg-xp-navy/10' : 'bg-white/5'}`}>
                                <div
                                    className={`h-full transition-all duration-1000 ${
                                        progress.unlocked
                                            ? (isXp ? 'bg-xp-blue' : (TIER_BAR_COLORS[(config as any).tier] ?? TIER_BAR_COLORS.COMMON))
                                            : (isXp ? 'bg-xp-navy/30' : 'bg-white/20')
                                    }`}
                                    style={{ width: `${percent}%` }}
                                />
                            </div>
                        </div>

                        {/* Expandable hint */}
                        {isExpanded && hint && (
                            <div className={`mt-4 pt-4 border-t ${
                                isWinamp ? 'border-[#00ff00]/20' : isXp ? 'border-xp-navy/20' : 'border-white/10'
                            } animate-in fade-in slide-in-from-top-1 duration-200`}>
                                <p className={`font-mono text-[10px] leading-relaxed ${
                                    isWinamp ? 'text-[#00ff00]/70' : 'opacity-60'
                                }`}>
                                    {hint}
                                </p>
                            </div>
                        )}

                        {!progress.unlocked && (
                            <div className="absolute top-4 right-4"><XI icon={Lock} size={14} className="opacity-20" /></div>
                        )}
                    </div>
                );
            })}
        </div>
    </div>
  );
};

export default HallOfFame;
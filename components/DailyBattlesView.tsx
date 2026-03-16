import React, { useState, useEffect, useCallback } from 'react';
import { Swords, Trophy, Clock, Lock, ChevronRight, RefreshCw, Zap } from 'lucide-react';
import { Exhibit, ArtifactBattle, DailyBracket } from '../types';
import { getArtifactTier, TIER_CONFIG, DefaultCategory } from '../constants';
import { getDailyBracket, castBattleVote, getBattleHistory } from '../services/storageService';
import { getFirstImageUrl } from '../utils/imageUtils';

interface DailyBattlesViewProps {
    theme: 'dark' | 'light' | 'xp' | 'winamp';
    exhibits: Exhibit[];
    currentUser: string;
    onExhibitClick: (item: Exhibit) => void;
}

const CATEGORIES = Object.values(DefaultCategory);

function formatCountdown(endTime: string): string {
    const diff = new Date(endTime).getTime() - Date.now();
    if (diff <= 0) return '00:00:00';
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1_000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getTodayVotesKey(): string {
    return `battles_votes_${new Date().toISOString().slice(0, 10)}`;
}

function loadLocalVotes(): Record<string, string> {
    try { return JSON.parse(localStorage.getItem(getTodayVotesKey()) || '{}'); } catch { return {}; }
}

function saveLocalVote(battleId: string, exhibitId: string) {
    const votes = loadLocalVotes();
    votes[battleId] = exhibitId;
    localStorage.setItem(getTodayVotesKey(), JSON.stringify(votes));
}

const DailyBattlesView: React.FC<DailyBattlesViewProps> = ({ theme, exhibits, currentUser, onExhibitClick }) => {
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [bracket, setBracket] = useState<DailyBracket | null>(null);
    const [history, setHistory] = useState<DailyBracket[]>([]);
    const [loading, setLoading] = useState(false);
    const [voting, setVoting] = useState<Record<string, boolean>>({});
    const [localVotes, setLocalVotes] = useState<Record<string, string>>(loadLocalVotes());
    const [countdown, setCountdown] = useState('');
    const [notEnough, setNotEnough] = useState(false);

    const isWinamp = theme === 'winamp';
    const isDark = theme === 'dark';

    // Auto-pick first category with enough exhibits
    useEffect(() => {
        if (!selectedCategory) {
            const cat = CATEGORIES.find(c => exhibits.filter(e => !e.isDraft && e.category === c).length >= 4);
            if (cat) setSelectedCategory(cat);
        }
    }, [exhibits, selectedCategory]);

    const fetchBracket = useCallback(async (cat: string) => {
        if (!cat) return;
        setLoading(true);
        setNotEnough(false);
        try {
            const result = await getDailyBracket(cat);
            if (result.reason === 'not_enough_artifacts') {
                setNotEnough(true);
                setBracket(null);
            } else {
                setBracket(result.bracket);
            }
            const hist = await getBattleHistory(cat, 5);
            setHistory(hist);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (selectedCategory) fetchBracket(selectedCategory);
    }, [selectedCategory, fetchBracket]);

    // Countdown tick every second
    useEffect(() => {
        const interval = setInterval(() => {
            if (!bracket) return;
            const activeBattle = bracket.battles.find(b => b.status === 'ACTIVE');
            if (activeBattle) setCountdown(formatCountdown(activeBattle.endTime));
        }, 1000);
        return () => clearInterval(interval);
    }, [bracket]);

    // Auto-refresh every 30s to pick up phase transitions
    useEffect(() => {
        const interval = setInterval(() => {
            if (selectedCategory) fetchBracket(selectedCategory);
        }, 30_000);
        return () => clearInterval(interval);
    }, [selectedCategory, fetchBracket]);

    const handleVote = async (battle: ArtifactBattle, exhibitId: string) => {
        if (!currentUser || voting[battle.id]) return;
        if (localVotes[battle.id]) return;
        if (battle.status !== 'ACTIVE') return;
        if (new Date(battle.endTime).getTime() <= Date.now()) return;

        setVoting(v => ({ ...v, [battle.id]: true }));
        try {
            const updatedBattle = await castBattleVote(battle.bracketId, battle.id, exhibitId, currentUser);
            if (updatedBattle) {
                saveLocalVote(battle.id, exhibitId);
                setLocalVotes(loadLocalVotes());
                // Refresh bracket
                fetchBracket(selectedCategory);
            }
        } finally {
            setVoting(v => ({ ...v, [battle.id]: false }));
        }
    };

    const getExhibit = (id: string | null | undefined): Exhibit | undefined =>
        id ? exhibits.find(e => e.id === id) : undefined;

    const renderArtifactCard = (
        battle: ArtifactBattle,
        participantId: string | null | undefined,
        voteKey: 'votes1' | 'votes2',
        isWinner: boolean,
        isPending: boolean
    ) => {
        const artifact = getExhibit(participantId);
        const tier = artifact ? getArtifactTier(artifact) : null;
        const tierCfg = tier ? TIER_CONFIG[tier] : null;
        const votes = battle[voteKey].length;
        const totalVotes = battle.votes1.length + battle.votes2.length;
        const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 50;
        const myVote = localVotes[battle.id];
        const iVotedThis = myVote === participantId;
        const hasVoted = !!myVote;
        const canVote = !hasVoted && battle.status === 'ACTIVE' && !isPending && !!currentUser;
        const imgUrl = artifact ? getFirstImageUrl(artifact.imageUrls, 'thumbnail') : '';

        const cardBg = isWinamp
            ? 'bg-[#1a1a1a] border-[#505050]'
            : isDark
            ? 'bg-white/5 border-white/10'
            : 'bg-gray-50 border-gray-200';

        return (
            <div className={`flex-1 flex flex-col border rounded-xl overflow-hidden transition-all ${cardBg} ${iVotedThis ? 'ring-2 ring-green-500' : ''} ${isWinner ? 'ring-2 ring-yellow-400' : ''}`}>
                {/* Image */}
                <div
                    className="relative aspect-square overflow-hidden cursor-pointer"
                    onClick={() => artifact && onExhibitClick(artifact)}
                >
                    {imgUrl ? (
                        <img src={imgUrl} alt={artifact?.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                    ) : (
                        <div className="w-full h-full bg-white/5 flex items-center justify-center">
                            <Swords size={32} className="opacity-20" />
                        </div>
                    )}
                    {isPending && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <Lock size={24} className="text-gray-400" />
                        </div>
                    )}
                    {isWinner && (
                        <div className="absolute top-2 left-2">
                            <Trophy size={20} className="text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.9)]" />
                        </div>
                    )}
                    {tierCfg && (
                        <div className={`absolute bottom-2 right-2 text-[8px] font-pixel px-1.5 py-0.5 rounded ${tierCfg.badge}`}>
                            {tierCfg.name}
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="p-2 flex flex-col gap-1.5 flex-1">
                    <div className="font-pixel text-[9px] leading-tight truncate opacity-80">
                        {artifact?.title || (isPending ? '???' : '—')}
                    </div>
                    <div className="text-[8px] font-mono opacity-40 truncate">@{artifact?.owner || '???'}</div>

                    {/* Vote bar (shown after voting or completed) */}
                    {(hasVoted || battle.status === 'COMPLETED') && !isPending && (
                        <div className="mt-1">
                            <div className="flex justify-between text-[8px] font-mono opacity-60 mb-0.5">
                                <span>{votes} голос.</span>
                                <span>{pct}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-green-500 transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Vote button */}
                    {canVote && (
                        <button
                            onClick={() => participantId && handleVote(battle, participantId)}
                            disabled={voting[battle.id]}
                            className="mt-auto w-full py-1.5 rounded-lg bg-green-500 text-black font-pixel text-[9px] hover:bg-green-400 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {voting[battle.id] ? '...' : '▲ ГОЛОСОВАТЬ'}
                        </button>
                    )}
                    {hasVoted && iVotedThis && !isPending && (
                        <div className="mt-auto text-center text-[8px] font-pixel text-green-500 opacity-80">✓ ВАШ ВЫБОР</div>
                    )}
                </div>
            </div>
        );
    };

    const renderBattle = (battle: ArtifactBattle, label: string) => {
        const isPending = battle.status === 'PENDING';
        const isCompleted = battle.status === 'COMPLETED';
        const isFinal = battle.round === 2;
        const timeLeft = !isPending && !isCompleted ? formatCountdown(battle.endTime) : null;

        const bgClass = isWinamp
            ? 'bg-[#292929] border-[#505050]'
            : isDark
            ? 'bg-white/3 border-white/5'
            : 'bg-gray-100 border-gray-200';

        return (
            <div key={battle.id} className={`border rounded-2xl p-3 mb-4 ${bgClass}`}>
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Swords size={14} className={isFinal ? 'text-yellow-400' : 'text-green-500'} />
                        <span className={`font-pixel text-[10px] ${isFinal ? 'text-yellow-400' : 'text-green-500'}`}>{label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {isPending && (
                            <div className="flex items-center gap-1 text-[9px] font-mono opacity-40">
                                <Lock size={10} /> ЖДЁТ ПОЛУФИНАЛА
                            </div>
                        )}
                        {timeLeft && (
                            <div className="flex items-center gap-1 text-[9px] font-mono text-orange-400">
                                <Clock size={10} /> {timeLeft}
                            </div>
                        )}
                        {isCompleted && (
                            <div className="flex items-center gap-1 text-[9px] font-mono text-yellow-500">
                                <Trophy size={10} /> ЗАВЕРШЕНО
                            </div>
                        )}
                    </div>
                </div>

                {/* VS cards */}
                <div className="flex items-stretch gap-3">
                    {renderArtifactCard(battle, battle.participant1, 'votes1', battle.winner === battle.participant1, isPending)}
                    <div className="flex items-center">
                        <div className="font-pixel text-sm opacity-40">VS</div>
                    </div>
                    {renderArtifactCard(battle, battle.participant2, 'votes2', battle.winner === battle.participant2, isPending)}
                </div>

                {/* Total votes */}
                {!isPending && (battle.votes1.length + battle.votes2.length) > 0 && (
                    <div className="mt-2 text-center text-[8px] font-mono opacity-30">
                        Всего голосов: {battle.votes1.length + battle.votes2.length}
                    </div>
                )}
            </div>
        );
    };

    const renderHistoryCard = (b: DailyBracket) => {
        const champion = getExhibit(b.winner);
        const imgUrl = champion ? getFirstImageUrl(champion.imageUrls, 'thumbnail') : '';
        return (
            <div
                key={b.id}
                className={`flex-shrink-0 w-28 rounded-xl overflow-hidden border cursor-pointer hover:scale-105 transition-transform ${isWinamp ? 'bg-[#1a1a1a] border-[#505050]' : 'bg-white/5 border-white/10'}`}
                onClick={() => champion && onExhibitClick(champion)}
            >
                {imgUrl ? (
                    <img src={imgUrl} alt={champion?.title} className="w-full aspect-square object-cover" />
                ) : (
                    <div className="w-full aspect-square bg-white/5 flex items-center justify-center">
                        <Trophy size={20} className="opacity-20" />
                    </div>
                )}
                <div className="p-1.5">
                    <div className="text-[7px] font-mono opacity-30">{b.date}</div>
                    <div className="text-[8px] font-pixel truncate opacity-70">{champion?.title || '???'}</div>
                    <div className="text-[7px] font-pixel text-yellow-500">🏆 ЧЕМПИОН</div>
                </div>
            </div>
        );
    };

    const sf1 = bracket?.battles.find(b => b.round === 1 && b.slotIndex === 0);
    const sf2 = bracket?.battles.find(b => b.round === 1 && b.slotIndex === 1);
    const final = bracket?.battles.find(b => b.round === 2);

    const containerClass = isWinamp
        ? 'text-[#00ff00] font-mono'
        : isDark
        ? 'text-gray-200'
        : 'text-gray-800';

    return (
        <div className={`${containerClass} animate-in fade-in duration-300`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Swords size={18} className="text-orange-400" />
                    <h2 className="font-pixel text-sm tracking-widest">БИТВЫ ДНЯ</h2>
                </div>
                <div className="flex items-center gap-2 text-[9px] font-mono opacity-40">
                    <Clock size={12} />
                    {new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </div>
            </div>

            {/* Category pills */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 custom-scrollbar">
                {CATEGORIES.map(cat => {
                    const count = exhibits.filter(e => !e.isDraft && e.category === cat).length;
                    const enough = count >= 4;
                    return (
                        <button
                            key={cat}
                            onClick={() => { if (enough) setSelectedCategory(cat); }}
                            disabled={!enough}
                            className={`flex-shrink-0 px-3 py-1.5 rounded-lg font-pixel text-[9px] transition-all ${
                                selectedCategory === cat
                                    ? 'bg-orange-500 text-black'
                                    : enough
                                    ? isWinamp
                                        ? 'border border-[#505050] hover:border-[#00ff00]'
                                        : 'border border-white/10 hover:border-orange-500/50 hover:bg-orange-500/10'
                                    : 'opacity-25 cursor-not-allowed border border-dashed border-white/10'
                            }`}
                        >
                            {cat}
                            {!enough && <span className="ml-1 opacity-50">({count}/4)</span>}
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-16 gap-2 opacity-40">
                    <RefreshCw size={16} className="animate-spin" />
                    <span className="font-pixel text-xs">ЗАГРУЗКА ТУРНИРА...</span>
                </div>
            ) : notEnough ? (
                <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
                    <Swords size={32} className="mx-auto mb-3 opacity-20" />
                    <div className="font-pixel text-xs opacity-40">НЕДОСТАТОЧНО АРТЕФАКТОВ</div>
                    <div className="text-[10px] font-mono opacity-30 mt-1">Нужно минимум 4 объекта в категории</div>
                </div>
            ) : !bracket ? (
                <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
                    <Zap size={32} className="mx-auto mb-3 opacity-20" />
                    <div className="font-pixel text-xs opacity-40">ВЫБЕРИТЕ КАТЕГОРИЮ</div>
                </div>
            ) : (
                <>
                    {/* Champion banner */}
                    {bracket.winner && (
                        <div className={`mb-4 p-3 rounded-2xl border flex items-center gap-3 ${isWinamp ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
                            <Trophy size={24} className="text-yellow-400 flex-shrink-0" />
                            <div>
                                <div className="font-pixel text-[9px] text-yellow-500">🏆 ЧЕМПИОН ДНЯ</div>
                                <div className="font-pixel text-xs font-bold">{getExhibit(bracket.winner)?.title || '???'}</div>
                            </div>
                            <button
                                onClick={() => { const e = getExhibit(bracket.winner); if (e) onExhibitClick(e); }}
                                className="ml-auto text-yellow-400 hover:text-yellow-300 transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}

                    {/* Semi-finals */}
                    <div className="text-[9px] font-pixel opacity-40 mb-2 tracking-widest flex items-center gap-2">
                        <span>ПОЛУФИНАЛЫ</span>
                        {sf1?.status === 'ACTIVE' && <span className="text-orange-400">· {countdown}</span>}
                    </div>
                    {sf1 && renderBattle(sf1, 'ПОЛУФИНАЛ 1')}
                    {sf2 && renderBattle(sf2, 'ПОЛУФИНАЛ 2')}

                    {/* Separator */}
                    <div className="flex items-center gap-3 my-4 opacity-20">
                        <div className="flex-1 h-px bg-current" />
                        <Swords size={14} />
                        <div className="flex-1 h-px bg-current" />
                    </div>

                    {/* Final */}
                    <div className="text-[9px] font-pixel opacity-40 mb-2 tracking-widest flex items-center gap-2">
                        <span>ФИНАЛ</span>
                        {final?.status === 'ACTIVE' && <span className="text-yellow-400">· {formatCountdown(final.endTime)}</span>}
                        {final?.status === 'PENDING' && sf1?.status === 'ACTIVE' && (
                            <span className="text-gray-500">· откроется через {formatCountdown(sf1.endTime)}</span>
                        )}
                    </div>
                    {final && renderBattle(final, '⚔ ФИНАЛ')}

                    {/* Refresh button */}
                    <div className="text-center mt-2 mb-6">
                        <button
                            onClick={() => fetchBracket(selectedCategory)}
                            className="flex items-center gap-1.5 mx-auto text-[9px] font-mono opacity-30 hover:opacity-70 transition-opacity"
                        >
                            <RefreshCw size={10} /> ОБНОВИТЬ
                        </button>
                    </div>
                </>
            )}

            {/* History */}
            {history.length > 0 && (
                <div className="mt-4">
                    <div className="text-[9px] font-pixel opacity-40 mb-3 tracking-widest flex items-center gap-2">
                        <Trophy size={10} className="text-yellow-500" /> ИСТОРИЯ ПОБЕД
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                        {history.map(renderHistoryCard)}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DailyBattlesView;

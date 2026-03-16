import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Swords, Trophy, Clock, Lock, ChevronRight, RefreshCw, Zap, ChevronDown } from 'lucide-react';
import { Exhibit, ArtifactBattle, DailyBracket } from '../types';
import { getArtifactTier, TIER_CONFIG, CATEGORY_SUBCATEGORIES } from '../constants';
import { getDailyBracket, castBattleVote, getBattleHistory } from '../services/storageService';
import { getFirstImageUrl } from '../utils/imageUtils';

interface DailyBattlesViewProps {
    theme: 'dark' | 'light' | 'xp' | 'winamp';
    exhibits: Exhibit[];
    currentUser: string;
    onExhibitClick: (item: Exhibit) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** All subcategories flattened with their parent category */
const ALL_SUBCATEGORIES: { sub: string; parent: string }[] = Object.entries(CATEGORY_SUBCATEGORIES).flatMap(
    ([parent, subs]) => subs.map(sub => ({ sub, parent }))
);

function formatCountdown(endTime: string): string {
    const diff = new Date(endTime).getTime() - Date.now();
    if (diff <= 0) return '00:00:00';
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1_000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getVotesKey(bracketId: string): string {
    return `battles_votes_${bracketId}`;
}
function loadLocalVotes(bracketId: string): Record<string, string> {
    try { return JSON.parse(localStorage.getItem(getVotesKey(bracketId)) || '{}'); } catch { return {}; }
}
function saveLocalVote(bracketId: string, battleId: string, exhibitId: string) {
    const votes = loadLocalVotes(bracketId);
    votes[battleId] = exhibitId;
    localStorage.setItem(getVotesKey(bracketId), JSON.stringify(votes));
}

/** Smart merge: update bracket state only where vote counts/status actually changed */
function mergeBracket(prev: DailyBracket | null, next: DailyBracket | null): DailyBracket | null {
    if (!prev || !next) return next;
    if (prev.id !== next.id) return next; // Different bracket, replace fully
    const changed =
        next.status !== prev.status ||
        next.winner !== prev.winner ||
        next.battles.some(nb => {
            const ob = prev.battles.find(b => b.id === nb.id);
            return !ob
                || nb.votes1.length !== ob.votes1.length
                || nb.votes2.length !== ob.votes2.length
                || nb.status !== ob.status
                || nb.winner !== ob.winner
                || nb.participant1 !== ob.participant1
                || nb.participant2 !== ob.participant2;
        });
    return changed ? next : prev;
}

// ── Component ─────────────────────────────────────────────────────────────────

const DailyBattlesView: React.FC<DailyBattlesViewProps> = ({ theme, exhibits, currentUser, onExhibitClick }) => {
    const [selectedSub, setSelectedSub] = useState<string>('');
    const [bracket, setBracket] = useState<DailyBracket | null>(null);
    const [history, setHistory] = useState<DailyBracket[]>([]);
    const [firstLoad, setFirstLoad] = useState(true);   // show spinner only on first load
    const [voting, setVoting] = useState<Record<string, boolean>>({});
    const [localVotes, setLocalVotes] = useState<Record<string, string>>({});
    const [notEnough, setNotEnough] = useState(false);
    const [expandedParent, setExpandedParent] = useState<string | null>(null);

    // Countdown stored in a ref-driven state to avoid re-rendering battle cards
    const [tickKey, setTickKey] = useState(0); // tick every second
    const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const isWinamp = theme === 'winamp';
    const isDark = theme === 'dark';

    // ── Subcategory counts ────────────────────────────────────────────────────

    const subCounts = useMemo(() => {
        const map: Record<string, number> = {};
        ALL_SUBCATEGORIES.forEach(({ sub }) => {
            map[sub] = exhibits.filter(e => !e.isDraft && e.subcategory === sub).length;
        });
        return map;
    }, [exhibits]);

    // Auto-pick first subcategory with enough exhibits
    useEffect(() => {
        if (!selectedSub) {
            const found = ALL_SUBCATEGORIES.find(({ sub }) => (subCounts[sub] ?? 0) >= 4);
            if (found) {
                setSelectedSub(found.sub);
                setExpandedParent(found.parent);
            }
        }
    }, [subCounts, selectedSub]);

    // Update localVotes when bracket changes
    useEffect(() => {
        if (bracket) setLocalVotes(loadLocalVotes(bracket.id));
    }, [bracket?.id]);

    // ── Fetch ─────────────────────────────────────────────────────────────────

    const fetchBracket = useCallback(async (sub: string, silent = false) => {
        if (!sub) return;
        if (!silent) setFirstLoad(true);
        setNotEnough(false);
        try {
            const result = await getDailyBracket(sub);
            if (result.reason === 'not_enough_artifacts') {
                setNotEnough(true);
                setBracket(null);
            } else {
                // Silent merge: only update state if data actually changed
                setBracket(prev => mergeBracket(prev, result.bracket));
            }
            if (!silent) {
                const hist = await getBattleHistory(sub, 5);
                setHistory(hist);
            }
        } finally {
            if (!silent) setFirstLoad(false);
        }
    }, []);

    // Load on subcategory change
    useEffect(() => {
        if (selectedSub) fetchBracket(selectedSub, false);
    }, [selectedSub, fetchBracket]);

    // Background refresh every 30s — silent, no spinner
    useEffect(() => {
        const interval = setInterval(() => {
            if (selectedSub) fetchBracket(selectedSub, true);
        }, 30_000);
        return () => clearInterval(interval);
    }, [selectedSub, fetchBracket]);

    // ── Countdown tick (only updates a counter, battle cards don't re-render) ─

    useEffect(() => {
        tickRef.current = setInterval(() => setTickKey(k => k + 1), 1000);
        return () => { if (tickRef.current) clearInterval(tickRef.current); };
    }, []);

    // ── Vote ──────────────────────────────────────────────────────────────────

    const handleVote = async (battle: ArtifactBattle, exhibitId: string, voteKey: 'votes1' | 'votes2') => {
        if (!currentUser || voting[battle.id]) return;
        if (localVotes[battle.id]) return;
        if (battle.status !== 'ACTIVE') return;
        if (new Date(battle.endTime).getTime() <= Date.now()) return;
        if (!bracket) return;

        // Optimistic update: add vote immediately in local state — smooth, no flash
        const newVote = { [battle.id]: exhibitId };
        setLocalVotes(prev => ({ ...prev, ...newVote }));
        setBracket(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                battles: prev.battles.map(b => {
                    if (b.id !== battle.id) return b;
                    return {
                        ...b,
                        votes1: voteKey === 'votes1' ? [...b.votes1, currentUser] : b.votes1,
                        votes2: voteKey === 'votes2' ? [...b.votes2, currentUser] : b.votes2,
                    };
                }),
            };
        });

        setVoting(v => ({ ...v, [battle.id]: true }));
        try {
            const updatedBattle = await castBattleVote(battle.bracketId, battle.id, exhibitId, currentUser);
            if (updatedBattle) {
                saveLocalVote(bracket.id, battle.id, exhibitId);
                // Silent refresh to get server-confirmed counts
                fetchBracket(selectedSub, true);
            } else {
                // Vote failed — roll back optimistic update
                setLocalVotes(loadLocalVotes(bracket.id));
                fetchBracket(selectedSub, true);
            }
        } finally {
            setVoting(v => ({ ...v, [battle.id]: false }));
        }
    };

    // ── Helpers ───────────────────────────────────────────────────────────────

    const getExhibit = (id: string | null | undefined): Exhibit | undefined =>
        id ? exhibits.find(e => e.id === id) : undefined;

    // ── Artifact card (memoised to prevent re-renders from countdown ticks) ───

    const ArtifactCard = useCallback(({
        battle, participantId, voteKey, isWinner, isPending,
    }: {
        battle: ArtifactBattle;
        participantId: string | null | undefined;
        voteKey: 'votes1' | 'votes2';
        isWinner: boolean;
        isPending: boolean;
    }) => {
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
            : isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200';

        return (
            <div className={`flex-1 flex flex-col border rounded-xl overflow-hidden ${cardBg} ${iVotedThis ? 'ring-2 ring-green-500' : ''} ${isWinner ? 'ring-2 ring-yellow-400' : ''}`}>
                {/* Image */}
                <div className="relative aspect-square overflow-hidden cursor-pointer" onClick={() => artifact && onExhibitClick(artifact)}>
                    {imgUrl
                        ? <img src={imgUrl} alt={artifact?.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                        : <div className="w-full h-full bg-white/5 flex items-center justify-center"><Swords size={32} className="opacity-20" /></div>
                    }
                    {isPending && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Lock size={24} className="text-gray-400" /></div>}
                    {isWinner && <div className="absolute top-2 left-2"><Trophy size={20} className="text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.9)]" /></div>}
                    {tierCfg && <div className={`absolute bottom-2 right-2 text-[8px] font-pixel px-1.5 py-0.5 rounded ${tierCfg.badge}`}>{tierCfg.name}</div>}
                </div>

                {/* Info */}
                <div className="p-2 flex flex-col gap-1.5 flex-1">
                    <div className="font-pixel text-[9px] leading-tight truncate opacity-80">{artifact?.title || (isPending ? '???' : '—')}</div>
                    <div className="text-[8px] font-mono opacity-40 truncate">@{artifact?.owner || '???'}</div>

                    {/* Vote bar — smooth CSS transition, no jump */}
                    {(hasVoted || battle.status === 'COMPLETED') && !isPending && (
                        <div className="mt-1">
                            <div className="flex justify-between text-[8px] font-mono opacity-60 mb-0.5">
                                <span>{votes} гол.</span>
                                <span>{pct}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-green-500"
                                    style={{ width: `${pct}%`, transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Vote button */}
                    {canVote && (
                        <button
                            onClick={() => participantId && handleVote(battle, participantId, voteKey)}
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [localVotes, voting, exhibits, currentUser, isWinamp, isDark]);

    // ── Battle block ──────────────────────────────────────────────────────────

    const renderBattle = (battle: ArtifactBattle, label: string) => {
        const isPending = battle.status === 'PENDING';
        const isCompleted = battle.status === 'COMPLETED';
        const isFinal = battle.round === 2;
        // Countdown rendered from tickKey — only the text re-renders, not the cards
        const timeLeft = !isPending && !isCompleted ? formatCountdown(battle.endTime) : null;

        const bgClass = isWinamp
            ? 'bg-[#292929] border-[#505050]'
            : isDark ? 'bg-white/3 border-white/5' : 'bg-gray-100 border-gray-200';

        return (
            <div key={battle.id} className={`border rounded-2xl p-3 mb-4 ${bgClass}`}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Swords size={14} className={isFinal ? 'text-yellow-400' : 'text-green-500'} />
                        <span className={`font-pixel text-[10px] ${isFinal ? 'text-yellow-400' : 'text-green-500'}`}>{label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {isPending && <div className="flex items-center gap-1 text-[9px] font-mono opacity-40"><Lock size={10} /> ЖДЁТ ПОЛУФИНАЛА</div>}
                        {timeLeft && (
                            <div className="flex items-center gap-1 text-[9px] font-mono text-orange-400">
                                <Clock size={10} />
                                {/* tickKey causes only this span to re-render */}
                                <span key={tickKey}>{timeLeft}</span>
                            </div>
                        )}
                        {isCompleted && <div className="flex items-center gap-1 text-[9px] font-mono text-yellow-500"><Trophy size={10} /> ЗАВЕРШЕНО</div>}
                    </div>
                </div>

                <div className="flex items-stretch gap-3">
                    <ArtifactCard battle={battle} participantId={battle.participant1} voteKey="votes1" isWinner={battle.winner === battle.participant1} isPending={isPending} />
                    <div className="flex items-center"><div className="font-pixel text-sm opacity-40">VS</div></div>
                    <ArtifactCard battle={battle} participantId={battle.participant2} voteKey="votes2" isWinner={battle.winner === battle.participant2} isPending={isPending} />
                </div>

                {!isPending && (battle.votes1.length + battle.votes2.length) > 0 && (
                    <div className="mt-2 text-center text-[8px] font-mono opacity-30">
                        Всего голосов: {battle.votes1.length + battle.votes2.length}
                    </div>
                )}
            </div>
        );
    };

    // ── History card ──────────────────────────────────────────────────────────

    const renderHistoryCard = (b: DailyBracket) => {
        const champion = getExhibit(b.winner);
        const imgUrl = champion ? getFirstImageUrl(champion.imageUrls, 'thumbnail') : '';
        return (
            <div
                key={b.id}
                className={`flex-shrink-0 w-24 rounded-xl overflow-hidden border cursor-pointer hover:scale-105 transition-transform ${isWinamp ? 'bg-[#1a1a1a] border-[#505050]' : 'bg-white/5 border-white/10'}`}
                onClick={() => champion && onExhibitClick(champion)}
            >
                {imgUrl
                    ? <img src={imgUrl} alt={champion?.title} className="w-full aspect-square object-cover" />
                    : <div className="w-full aspect-square bg-white/5 flex items-center justify-center"><Trophy size={20} className="opacity-20" /></div>
                }
                <div className="p-1.5">
                    <div className="text-[7px] font-mono opacity-30">{b.date}</div>
                    <div className="text-[8px] font-pixel truncate opacity-70">{champion?.title || '???'}</div>
                    <div className="text-[7px] font-pixel text-yellow-500">🏆 ЧЕМ.</div>
                </div>
            </div>
        );
    };

    const sf1 = bracket?.battles.find(b => b.round === 1 && b.slotIndex === 0);
    const sf2 = bracket?.battles.find(b => b.round === 1 && b.slotIndex === 1);
    const final = bracket?.battles.find(b => b.round === 2);

    // ── Subcategory selector (grouped by parent) ──────────────────────────────

    const parentCategories = useMemo(() => Object.keys(CATEGORY_SUBCATEGORIES), []);

    // ── Render ────────────────────────────────────────────────────────────────

    const containerClass = isWinamp ? 'text-[#00ff00] font-mono' : isDark ? 'text-gray-200' : 'text-gray-800';
    const labelClass = 'text-[9px] font-pixel opacity-40 mb-2 tracking-widest flex items-center gap-2';

    return (
        <div className={`${containerClass} animate-in fade-in duration-300`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Swords size={18} className="text-orange-400" />
                    <h2 className="font-pixel text-sm tracking-widest">БИТВЫ</h2>
                    <span className="text-[8px] font-mono opacity-30 border border-white/10 rounded px-1.5 py-0.5">3 ДНЯ</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] font-mono opacity-40">
                    <Clock size={12} />
                    {new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </div>
            </div>

            {/* Subcategory selector (accordion by parent category) */}
            <div className="mb-4 space-y-1">
                {parentCategories.map(parent => {
                    const subs = CATEGORY_SUBCATEGORIES[parent] ?? [];
                    const isExpanded = expandedParent === parent;
                    const hasEnough = subs.some(s => (subCounts[s] ?? 0) >= 4);
                    const isActive = subs.includes(selectedSub);

                    return (
                        <div key={parent} className={`rounded-xl overflow-hidden border transition-all ${
                            isWinamp
                                ? 'border-[#505050] bg-[#1a1a1a]'
                                : isActive
                                ? isDark ? 'border-orange-500/40 bg-orange-500/5' : 'border-orange-300 bg-orange-50'
                                : isDark ? 'border-white/5 bg-white/3' : 'border-gray-200 bg-gray-50'
                        }`}>
                            {/* Parent header */}
                            <button
                                className="w-full flex items-center justify-between px-3 py-2 text-left"
                                onClick={() => setExpandedParent(isExpanded ? null : parent)}
                            >
                                <div className="flex items-center gap-2">
                                    <span className={`font-pixel text-[10px] ${isActive ? 'text-orange-400' : 'opacity-60'}`}>{parent}</span>
                                    {!hasEnough && <span className="text-[8px] font-mono opacity-30">мало</span>}
                                </div>
                                <ChevronDown size={12} className={`opacity-40 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Subcategory pills */}
                            {isExpanded && (
                                <div className="px-3 pb-3 flex flex-wrap gap-1.5">
                                    {subs.map(sub => {
                                        const count = subCounts[sub] ?? 0;
                                        const enough = count >= 4;
                                        const isSelected = selectedSub === sub;
                                        return (
                                            <button
                                                key={sub}
                                                onClick={() => { if (enough) setSelectedSub(sub); }}
                                                disabled={!enough}
                                                title={!enough ? `Нужно 4, есть ${count}` : undefined}
                                                className={`px-2.5 py-1 rounded-lg font-pixel text-[8px] transition-all ${
                                                    isSelected
                                                        ? 'bg-orange-500 text-black'
                                                        : enough
                                                        ? isWinamp ? 'border border-[#505050] hover:border-[#00ff00]' : 'border border-white/10 hover:border-orange-500/60 hover:bg-orange-500/10'
                                                        : 'opacity-20 cursor-not-allowed border border-dashed border-white/10'
                                                }`}
                                            >
                                                {sub}
                                                {!enough && <span className="ml-1 opacity-60">{count}/4</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Content */}
            {firstLoad && !bracket ? (
                <div className="flex items-center justify-center py-16 gap-2 opacity-40">
                    <RefreshCw size={16} className="animate-spin" />
                    <span className="font-pixel text-xs">ЗАГРУЗКА ТУРНИРА...</span>
                </div>
            ) : notEnough ? (
                <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
                    <Swords size={32} className="mx-auto mb-3 opacity-20" />
                    <div className="font-pixel text-xs opacity-40">НЕДОСТАТОЧНО АРТЕФАКТОВ</div>
                    <div className="text-[10px] font-mono opacity-30 mt-1">Нужно минимум 4 объекта в подкатегории</div>
                </div>
            ) : !bracket ? (
                <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
                    <Zap size={32} className="mx-auto mb-3 opacity-20" />
                    <div className="font-pixel text-xs opacity-40">ВЫБЕРИТЕ ПОДКАТЕГОРИЮ</div>
                </div>
            ) : (
                <>
                    {/* Active subcategory label */}
                    <div className="mb-3 flex items-center gap-2">
                        <div className="text-[9px] font-mono opacity-30">{bracket.category}</div>
                        {bracket.status === 'COMPLETED' && (
                            <div className="text-[8px] font-pixel text-yellow-500 border border-yellow-500/30 rounded px-1.5 py-0.5">ЗАВЕРШЁН</div>
                        )}
                    </div>

                    {/* Champion banner */}
                    {bracket.winner && (
                        <div className={`mb-4 p-3 rounded-2xl border flex items-center gap-3 bg-yellow-500/10 border-yellow-500/30`}>
                            <Trophy size={24} className="text-yellow-400 flex-shrink-0" />
                            <div>
                                <div className="font-pixel text-[9px] text-yellow-500">🏆 ЧЕМПИОН</div>
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
                    <div className={labelClass}>ПОЛУФИНАЛЫ · 36Ч</div>
                    {sf1 && renderBattle(sf1, 'ПОЛУФИНАЛ 1')}
                    {sf2 && renderBattle(sf2, 'ПОЛУФИНАЛ 2')}

                    {/* Separator */}
                    <div className="flex items-center gap-3 my-4 opacity-15">
                        <div className="flex-1 h-px bg-current" />
                        <Swords size={12} />
                        <div className="flex-1 h-px bg-current" />
                    </div>

                    {/* Final */}
                    <div className={`${labelClass} text-yellow-400/60`}>
                        ФИНАЛ · 36Ч
                        {final?.status === 'PENDING' && sf1?.status === 'ACTIVE' && (
                            <span className="opacity-50">· откроется через {formatCountdown(sf1.endTime)}</span>
                        )}
                    </div>
                    {final && renderBattle(final, '⚔ ФИНАЛ')}

                    {/* Silent refresh indicator — tiny dot in corner, no spinner */}
                    <div className="text-center mt-1 mb-6">
                        <button
                            onClick={() => fetchBracket(selectedSub, false)}
                            className="flex items-center gap-1.5 mx-auto text-[8px] font-mono opacity-20 hover:opacity-60 transition-opacity"
                        >
                            <RefreshCw size={9} /> ОБНОВИТЬ
                        </button>
                    </div>
                </>
            )}

            {/* History */}
            {history.length > 0 && (
                <div className="mt-2">
                    <div className={labelClass}>
                        <Trophy size={10} className="text-yellow-500" /> ПРОШЛЫЕ ЧЕМПИОНЫ
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

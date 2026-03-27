import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Swords, Trophy, Clock, Lock, ChevronRight, RefreshCw, Zap } from 'lucide-react';
import { Exhibit, ArtifactBattle, DailyBracket } from '../types';
import MatrixIcon from './MatrixIcon';
import { getArtifactTier, TIER_CONFIG, CATEGORY_SUBCATEGORIES } from '../constants';
import { getDailyBracket, castBattleVote, getBattleHistory } from '../services/storageService';
import { getFirstImageUrl } from '../utils/imageUtils';
import XI from './XI';

interface DailyBattlesViewProps {
    theme: 'dark' | 'light' | 'xp' | 'winamp';
    exhibits: Exhibit[];
    currentUser: string;
    onExhibitClick: (item: Exhibit) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const MAIN_CATEGORIES = Object.keys(CATEGORY_SUBCATEGORIES);

const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;

function formatCountdown(endTime: string): string {
    const diff = new Date(endTime).getTime() - Date.now();
    if (diff <= 0) return '00:00:00';
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1_000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getNextCycleCountdown(): string {
    const now = Date.now();
    const periodStart = Math.floor(now / FOUR_DAYS_MS) * FOUR_DAYS_MS;
    const nextPeriod = periodStart + FOUR_DAYS_MS;
    const diff = nextPeriod - now;
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

/** Smart merge — only update state if vote counts/status actually changed */
function mergeBracket(prev: DailyBracket | null, next: DailyBracket | null): DailyBracket | null {
    if (!prev || !next) return next;
    if (prev.id !== next.id) return next;
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
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [bracket, setBracket] = useState<DailyBracket | null>(null);
    const [history, setHistory] = useState<DailyBracket[]>([]);
    const [firstLoad, setFirstLoad] = useState(true);
    const [voting, setVoting] = useState<Record<string, boolean>>({});
    const [localVotes, setLocalVotes] = useState<Record<string, string>>({});
    const [notEnough, setNotEnough] = useState(false);

    // Separate ticker — only countdown text re-renders, not battle cards
    const [tickKey, setTickKey] = useState(0);
    const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const isWinamp = theme === 'winamp';
    const isDark = theme === 'dark';

    // ── Category viability check ──────────────────────────────────────────────

    /** Count subcategories per main category that have ≥2 non-draft artifacts */
    const categoryCounts = useMemo(() => {
        const map: Record<string, number> = {};
        MAIN_CATEGORIES.forEach(cat => {
            const subs = CATEGORY_SUBCATEGORIES[cat] ?? [];
            map[cat] = subs.filter(sub =>
                exhibits.filter(e => !e.isDraft && e.subcategory === sub).length >= 2
            ).length;
        });
        return map;
    }, [exhibits]);

    const hasBattle = (cat: string) => (categoryCounts[cat] ?? 0) >= 2;

    // Auto-pick first viable category
    useEffect(() => {
        if (!selectedCategory) {
            const found = MAIN_CATEGORIES.find(c => hasBattle(c));
            setSelectedCategory(found ?? (MAIN_CATEGORIES[0] || ''));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categoryCounts]);

    // Sync local votes when bracket id changes
    useEffect(() => {
        if (bracket) setLocalVotes(loadLocalVotes(bracket.id));
    }, [bracket?.id]);

    // ── Fetch ─────────────────────────────────────────────────────────────────

    const fetchBracket = useCallback(async (cat: string, silent = false) => {
        if (!cat) return;
        if (!silent) setFirstLoad(true);
        setNotEnough(false);
        try {
            const result = await getDailyBracket(cat);
            if (result.reason === 'not_enough_artifacts') {
                setNotEnough(true);
                setBracket(null);
            } else {
                setBracket(prev => mergeBracket(prev, result.bracket));
            }
            if (!silent) {
                const hist = await getBattleHistory(cat, 1);
                setHistory(hist);
            }
        } finally {
            if (!silent) setFirstLoad(false);
        }
    }, []);

    useEffect(() => {
        if (selectedCategory) fetchBracket(selectedCategory, false);
    }, [selectedCategory, fetchBracket]);

    // Background silent refresh every 30s
    useEffect(() => {
        const iv = setInterval(() => {
            if (selectedCategory) fetchBracket(selectedCategory, true);
        }, 30_000);
        return () => clearInterval(iv);
    }, [selectedCategory, fetchBracket]);

    // Countdown ticker
    useEffect(() => {
        tickRef.current = setInterval(() => setTickKey(k => k + 1), 1000);
        return () => { if (tickRef.current) clearInterval(tickRef.current); };
    }, []);

    // ── Vote ──────────────────────────────────────────────────────────────────

    const handleVote = async (battle: ArtifactBattle, exhibitId: string, voteKey: 'votes1' | 'votes2') => {
        if (!currentUser || voting[battle.id] || localVotes[battle.id]) return;
        if (battle.status !== 'ACTIVE') return;
        if (new Date(battle.endTime).getTime() <= Date.now()) return;
        if (!bracket) return;

        // Optimistic update — instant feedback, no flash
        setLocalVotes(prev => ({ ...prev, [battle.id]: exhibitId }));
        setBracket(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                battles: prev.battles.map(b => b.id !== battle.id ? b : {
                    ...b,
                    votes1: voteKey === 'votes1' ? [...b.votes1, currentUser] : b.votes1,
                    votes2: voteKey === 'votes2' ? [...b.votes2, currentUser] : b.votes2,
                }),
            };
        });

        setVoting(v => ({ ...v, [battle.id]: true }));
        try {
            const updated = await castBattleVote(battle.bracketId, battle.id, exhibitId, currentUser);
            if (updated) {
                saveLocalVote(bracket.id, battle.id, exhibitId);
                fetchBracket(selectedCategory, true);
            } else {
                // Roll back on failure
                setLocalVotes(loadLocalVotes(bracket.id));
                fetchBracket(selectedCategory, true);
            }
        } finally {
            setVoting(v => ({ ...v, [battle.id]: false }));
        }
    };

    // ── Helpers ───────────────────────────────────────────────────────────────

    const getExhibit = (id: string | null | undefined): Exhibit | undefined =>
        id ? exhibits.find(e => e.id === id) : undefined;

    // ── Compact ArtifactCard (memoised — won't re-render from countdown ticks) ─

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
            <div className={`flex flex-col border rounded-lg overflow-hidden flex-1 min-w-0
                ${cardBg}
                ${iVotedThis ? 'ring-2 ring-green-500' : ''}
                ${isWinner ? 'ring-2 ring-yellow-400' : ''}
            `}>
                {/* Image */}
                <div
                    className="relative overflow-hidden cursor-pointer"
                    style={{ aspectRatio: '1 / 1' }}
                    onClick={() => artifact && onExhibitClick(artifact)}
                >
                    {imgUrl
                        ? <img src={imgUrl} alt={artifact?.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                        : <div className="w-full h-full bg-white/5 flex items-center justify-center"><XI icon={Swords} size={18} className="opacity-20" /></div>
                    }
                    {isPending && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <XI icon={Lock} size={14} className="text-gray-400" />
                        </div>
                    )}
                    {isWinner && (
                        <div className="absolute top-1 left-1">
                            <XI icon={Trophy} size={12} className="text-yellow-400 drop-shadow-[0_0_6px_rgba(234,179,8,0.9)]" />
                        </div>
                    )}
                    {tierCfg && (
                        <div className={`absolute bottom-1 right-1 text-[6px] font-pixel px-1 py-0.5 rounded ${tierCfg.badge}`}>
                            {tierCfg.name}
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="p-1.5 flex flex-col gap-1 flex-1">
                    <div className="font-pixel text-[8px] leading-tight line-clamp-2 opacity-80">
                        {artifact?.title || (isPending ? '???' : '—')}
                    </div>
                    <div className="text-[7px] font-mono opacity-30 truncate">@{artifact?.owner || '???'}</div>

                    {/* Vote bar with smooth CSS transition — no jump on update */}
                    {(hasVoted || battle.status === 'COMPLETED') && !isPending && (
                        <div className="mt-0.5">
                            <div className="flex justify-between text-[7px] font-mono opacity-50 mb-0.5">
                                <span>{votes}</span><span>{pct}%</span>
                            </div>
                            <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-green-500"
                                    style={{ width: `${pct}%`, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Vote button */}
                    {canVote && (
                        <button
                            onClick={() => participantId && handleVote(battle, participantId, voteKey)}
                            disabled={voting[battle.id]}
                            className="mt-auto w-full py-1 rounded bg-green-500 text-black font-pixel text-[7px] hover:bg-green-400 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {voting[battle.id] ? '…' : '▲ VOTE'}
                        </button>
                    )}
                    {hasVoted && iVotedThis && !isPending && (
                        <div className="mt-auto text-center text-[8px] font-pixel text-green-500">✓</div>
                    )}
                </div>
            </div>
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [localVotes, voting, exhibits, currentUser, isWinamp, isDark]);

    // ── Derived battle refs (declared early so render fns can close over them) ─

    const sf1 = bracket?.battles.find(b => b.round === 1 && b.slotIndex === 0);
    const sf2 = bracket?.battles.find(b => b.round === 1 && b.slotIndex === 1);
    const final = bracket?.battles.find(b => b.round === 2);

    // ── Battle blocks ─────────────────────────────────────────────────────────

    const sfBg = isWinamp
        ? 'bg-[#292929] border-[#505050]'
        : isDark ? 'bg-white/3 border-white/5' : 'bg-gray-100 border-gray-200';

    /** Renders one semi-final as a compact 2-card pair */
    const renderSfPair = (battle: ArtifactBattle, label: string) => {
        const isPending = battle.status === 'PENDING';
        const isCompleted = battle.status === 'COMPLETED';
        const timeLeft = !isPending && !isCompleted ? formatCountdown(battle.endTime) : null;
        const totalVotes = battle.votes1.length + battle.votes2.length;

        return (
            <div className={`flex-1 min-w-0 rounded-xl border p-2 flex flex-col gap-2 ${sfBg}`}>
                {/* Sub-header: subcategory name + timer */}
                <div className="flex items-center justify-between min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                        <span className="font-pixel text-[8px] text-green-500 truncate">
                            {(battle as any).category || label}
                        </span>
                        <span className="text-[7px] font-mono opacity-25 flex-shrink-0">· {label}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                        {isPending && <XI icon={Lock} size={8} className="opacity-30" />}
                        {timeLeft && (
                            <div className="flex items-center gap-0.5 text-[8px] font-mono text-orange-400">
                                <XI icon={Clock} size={8} />
                                {/* tickKey means only this text node re-renders */}
                                <span key={tickKey}>{timeLeft}</span>
                            </div>
                        )}
                        {isCompleted && <XI icon={Trophy} size={8} className="text-yellow-500" />}
                    </div>
                </div>

                {/* 2 artifact cards + VS divider */}
                <div className="flex items-stretch gap-1.5">
                    <ArtifactCard
                        battle={battle}
                        participantId={battle.participant1}
                        voteKey="votes1"
                        isWinner={battle.winner === battle.participant1}
                        isPending={isPending}
                    />
                    <div className="flex items-center flex-shrink-0">
                        <span className="font-pixel text-[9px] opacity-20">vs</span>
                    </div>
                    <ArtifactCard
                        battle={battle}
                        participantId={battle.participant2}
                        voteKey="votes2"
                        isWinner={battle.winner === battle.participant2}
                        isPending={isPending}
                    />
                </div>

                {totalVotes > 0 && (
                    <div className="text-center text-[7px] font-mono opacity-20">
                        {totalVotes} голосов
                    </div>
                )}
            </div>
        );
    };

    /** Renders the final match (wider layout) */
    const renderFinal = (battle: ArtifactBattle) => {
        const isPending = battle.status === 'PENDING';
        const isCompleted = battle.status === 'COMPLETED';
        const timeLeft = !isPending && !isCompleted ? formatCountdown(battle.endTime) : null;
        const finalBg = isWinamp
            ? 'bg-[#292929] border-yellow-600/30'
            : isDark ? 'bg-yellow-500/5 border-yellow-500/15' : 'bg-yellow-50 border-yellow-200';

        return (
            <div className={`rounded-xl border p-3 ${finalBg}`}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <MatrixIcon icon={Swords} size={12} color="#fbbf24" glow={2} theme={theme} />
                        <span className="font-pixel text-[10px] text-yellow-400">⚔ ФИНАЛ</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {isPending && (
                            <div className="flex items-center gap-1 text-[8px] font-mono opacity-35">
                                <XI icon={Lock} size={8} />
                                {sf1 && sf1.status === 'ACTIVE'
                                    ? <span key={tickKey}>откроется через {formatCountdown(sf1.endTime)}</span>
                                    : <span>ждёт полуфинала</span>
                                }
                            </div>
                        )}
                        {timeLeft && (
                            <div className="flex items-center gap-1 text-[8px] font-mono text-orange-400">
                                <XI icon={Clock} size={9} />
                                <span key={tickKey}>{timeLeft}</span>
                            </div>
                        )}
                        {isCompleted && (
                            <div className="flex items-center gap-1 text-[8px] font-mono text-yellow-500">
                                <XI icon={Trophy} size={9} /> ЗАВЕРШЁН
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-stretch gap-4">
                    <ArtifactCard
                        battle={battle}
                        participantId={battle.participant1}
                        voteKey="votes1"
                        isWinner={battle.winner === battle.participant1}
                        isPending={isPending}
                    />
                    <div className="flex items-center flex-shrink-0">
                        <span className="font-pixel text-sm opacity-30">VS</span>
                    </div>
                    <ArtifactCard
                        battle={battle}
                        participantId={battle.participant2}
                        voteKey="votes2"
                        isWinner={battle.winner === battle.participant2}
                        isPending={isPending}
                    />
                </div>

                {(battle.votes1.length + battle.votes2.length) > 0 && (
                    <div className="mt-2 text-center text-[8px] font-mono opacity-20">
                        Всего голосов: {battle.votes1.length + battle.votes2.length}
                    </div>
                )}
            </div>
        );
    };

    const containerClass = isWinamp ? 'text-[#00ff00] font-mono' : isDark ? 'text-gray-200' : 'text-gray-800';
    const labelClass = 'text-[9px] font-pixel opacity-40 mb-2 tracking-widest flex items-center gap-1.5';

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className={`${containerClass} animate-in fade-in duration-300`}>

            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <MatrixIcon icon={Swords} size={16} color="#fb923c" theme={theme} glow={2} />
                    <h2 className="font-pixel text-sm tracking-widest">БИТВЫ</h2>
                    <span className="text-[7px] font-mono opacity-25 border border-white/10 rounded px-1.5 py-0.5">3Д + 1Д ПАУЗА</span>
                </div>
                <div className="text-[8px] font-mono opacity-25">
                    {new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </div>
            </div>

            {/* ── Category carousel (horizontal pills) ────────────────────── */}
            <div
                className="flex gap-2 overflow-x-auto pb-2 mb-4"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
            >
                {MAIN_CATEGORIES.map(cat => {
                    const viable = hasBattle(cat);
                    const isSelected = selectedCategory === cat;
                    return (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`flex-shrink-0 px-3 py-1.5 rounded-full font-pixel text-[9px] transition-all border ${
                                isSelected
                                    ? 'bg-orange-500 text-black border-orange-500'
                                    : viable
                                    ? isWinamp
                                        ? 'border-[#505050] hover:border-[#00ff00] hover:text-[#00ff00]'
                                        : isDark
                                        ? 'border-white/15 hover:border-orange-500/60 hover:bg-orange-500/10'
                                        : 'border-gray-300 hover:border-orange-400 hover:bg-orange-50'
                                    : 'border-white/5 opacity-25 cursor-default'
                            }`}
                            title={!viable ? 'Недостаточно артефактов в подкатегориях' : undefined}
                        >
                            {cat}
                        </button>
                    );
                })}
            </div>

            {/* ── Main content ─────────────────────────────────────────────── */}

            {firstLoad && !bracket ? (
                <div className="flex items-center justify-center py-16 gap-2 opacity-40">
                    <XI icon={RefreshCw} size={16} className="animate-spin" />
                    <span className="font-pixel text-xs">ЗАГРУЗКА...</span>
                </div>

            ) : notEnough ? (
                <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
                    <XI icon={Swords} size={28} className="mx-auto mb-3 opacity-20" />
                    <div className="font-pixel text-xs opacity-40">НЕДОСТАТОЧНО АРТЕФАКТОВ</div>
                    <div className="text-[9px] font-mono opacity-25 mt-1">
                        Нужно ≥2 подкатегории с минимум 2 объектами
                    </div>
                </div>

            ) : !bracket ? (
                <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
                    <XI icon={Zap} size={28} className="mx-auto mb-3 opacity-20" />
                    <div className="font-pixel text-xs opacity-40">НЕТ ДАННЫХ</div>
                </div>

            ) : (
                <>
                    {/* Pause banner — shown when bracket is fully completed */}
                    {bracket.status === 'COMPLETED' && (
                        <div className={`mb-4 p-3 rounded-2xl border flex items-center gap-3 ${
                            isWinamp ? 'bg-[#1a1a1a] border-[#505050]' : isDark ? 'bg-white/3 border-white/10' : 'bg-gray-100 border-gray-200'
                        }`}>
                            <XI icon={Clock} size={16} className="text-orange-400 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                                <div className="font-pixel text-[8px] text-orange-400 tracking-widest">ПАУЗА · СЛЕДУЮЩИЙ ЦИКЛ</div>
                                <div className="font-mono text-sm text-orange-300" key={tickKey}>{getNextCycleCountdown()}</div>
                            </div>
                        </div>
                    )}

                    {/* No-winner banner — bracket completed but neither side reached 5 votes */}
                    {bracket.status === 'COMPLETED' && bracket.winner === null && (
                        <div className={`mb-4 p-3 rounded-2xl border flex items-center gap-3 ${
                            isWinamp ? 'bg-[#1a1a1a] border-[#505050]' : isDark ? 'bg-white/3 border-white/10' : 'bg-gray-100 border-gray-200'
                        }`}>
                            <XI icon={Swords} size={16} className="opacity-30 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                                <div className="font-pixel text-[8px] opacity-50 tracking-widest">ПОБЕДИТЕЛЯ НЕТ</div>
                                <div className="text-[9px] font-mono opacity-30 mt-0.5">Нужно минимум {5} голосов за позицию</div>
                            </div>
                        </div>
                    )}

                    {/* Champion banner */}
                    {bracket.winner && (
                        <div className="mb-4 p-3 rounded-2xl border flex items-center gap-3 bg-yellow-500/10 border-yellow-500/30">
                            <XI icon={Trophy} size={22} className="text-yellow-400 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                                <div className="font-pixel text-[8px] text-yellow-500">🏆 ЧЕМПИОН · АЧИВКА ВЫДАНА</div>
                                <div className="font-pixel text-xs font-bold truncate">
                                    {getExhibit(bracket.winner)?.title || '???'}
                                </div>
                                <div className="text-[7px] font-mono opacity-40">
                                    @{getExhibit(bracket.winner)?.owner || '???'}
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    const e = getExhibit(bracket.winner);
                                    if (e) onExhibitClick(e);
                                }}
                                className="ml-auto text-yellow-400 hover:text-yellow-300 transition-colors flex-shrink-0"
                            >
                                <XI icon={ChevronRight} size={14} />
                            </button>
                        </div>
                    )}

                    {/* ── Semi-finals: 4-in-a-row ──────────────────────────── */}
                    <div className={labelClass}>
                        <MatrixIcon icon={Swords} size={9} color="#4ade80" theme={theme} /> ПОЛУФИНАЛЫ · 36Ч
                    </div>

                    <div className="flex flex-col md:flex-row items-stretch gap-2 mb-4">
                        {sf1 && renderSfPair(sf1, 'СФ1')}

                        {/* Vertical divider with sword icon — desktop only */}
                        {sf1 && sf2 && (
                            <div className="hidden md:flex flex-col items-center justify-center w-5 flex-shrink-0">
                                <div className="flex-1 w-px bg-white/8" />
                                <XI icon={Swords} size={10} className="opacity-15 my-1 flex-shrink-0" />
                                <div className="flex-1 w-px bg-white/8" />
                            </div>
                        )}

                        {sf2 && renderSfPair(sf2, 'СФ2')}
                    </div>

                    {/* ── Divider ───────────────────────────────────────────── */}
                    <div className="flex items-center gap-3 my-4 opacity-10">
                        <div className="flex-1 h-px bg-current" />
                        <XI icon={Swords} size={10} />
                        <div className="flex-1 h-px bg-current" />
                    </div>

                    {/* ── Final ─────────────────────────────────────────────── */}
                    <div className={`${labelClass} text-yellow-400/50`}>
                        <MatrixIcon icon={Trophy} size={9} color="#fbbf24" glow={2} theme={theme} /> ФИНАЛ · 36Ч
                    </div>
                    {final && renderFinal(final)}

                    {/* Refresh link */}
                    <div className="text-center mt-4 mb-2">
                        <button
                            onClick={() => fetchBracket(selectedCategory, false)}
                            className="flex items-center gap-1.5 mx-auto text-[8px] font-mono opacity-15 hover:opacity-50 transition-opacity"
                        >
                            <XI icon={RefreshCw} size={8} /> ОБНОВИТЬ
                        </button>
                    </div>
                </>
            )}

            {/* ── Last champion ─────────────────────────────────────────── */}
            {history.length > 0 && history[0].winner && (() => {
                const b = history[0];
                const champion = getExhibit(b.winner);
                const imgUrl = champion ? getFirstImageUrl(champion.imageUrls, 'thumbnail') : '';
                return (
                    <div className="mt-4">
                        <div className={labelClass}>
                            <XI icon={Trophy} size={9} className="text-yellow-500" /> ПРОШЛЫЙ ЧЕМПИОН
                        </div>
                        <div
                            className={`flex items-center gap-3 p-2 rounded-xl border cursor-pointer hover:opacity-80 transition-opacity ${
                                isWinamp ? 'bg-[#1a1a1a] border-[#505050]' : 'bg-white/5 border-white/10'
                            }`}
                            onClick={() => champion && onExhibitClick(champion)}
                        >
                            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                                {imgUrl
                                    ? <img src={imgUrl} alt={champion?.title} className="w-full h-full object-cover" />
                                    : <div className="w-full h-full bg-white/5 flex items-center justify-center"><XI icon={Trophy} size={14} className="opacity-20" /></div>
                                }
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-[7px] font-pixel truncate opacity-70">{champion?.title || '???'}</div>
                                <div className="text-[7px] font-mono opacity-30">@{champion?.owner || '???'}</div>
                                <div className="text-[6px] font-mono opacity-20 mt-0.5">{b.date}</div>
                            </div>
                            <XI icon={Trophy} size={14} className="text-yellow-500 flex-shrink-0" />
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default DailyBattlesView;

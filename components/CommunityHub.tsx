import React, { useState, useMemo } from 'react';
import { Trophy, TrendingUp, Users, RefreshCw, Search, Star, Package, ShoppingBag, ArrowLeftRight, Gift, UserPlus, UserCheck, Crown, Sparkles, Swords } from 'lucide-react';
import { UserProfile, Exhibit } from '../types';
import DailyBattlesView from './DailyBattlesView';
import { ExhibitCard } from './ExhibitCard';
import { getUserAvatar } from '../services/storageService';
import { getFirstImageUrl } from '../utils/imageUtils';
import SEO from './SEO';
import XI from './XI';

interface CommunityHubProps {
    theme: 'dark' | 'light' | 'xp' | 'winamp';
    users: UserProfile[];
    exhibits: Exhibit[];
    onExhibitClick: (item: Exhibit) => void;
    onUserClick: (username: string) => void;
    onBack?: () => void;
    currentUser?: UserProfile | null;
    onReact: (id: string) => void;
    onFollow?: (username: string) => void;
    currentUsername?: string;
}

// Winamp Helper wrapper
const WinampWindow = ({ title, children, className = '' }: { title: string, children?: React.ReactNode, className?: string }) => (
    <div className={`mb-6 bg-[#292929] border-t-2 border-l-2 border-r-2 border-b-2 border-t-[#505050] border-l-[#505050] border-r-[#101010] border-b-[#101010] ${className}`}>
        <div className="h-4 bg-gradient-to-r from-wa-blue-light to-wa-blue-dark flex items-center justify-between px-1 cursor-default select-none mb-1">
            <span className="text-white font-winamp text-[10px] tracking-widest uppercase">{title}</span>
            <div className="w-2 h-2 bg-[#DCDCDC] border border-t-white border-l-white border-r-[#505050] border-b-[#505050]"></div>
        </div>
        <div className="p-2">
            {children}
        </div>
    </div>
);

// Medal colors for top collectors
const MEDAL = [
    { bg: 'bg-yellow-500', text: 'text-black', ring: 'ring-yellow-400', glow: 'shadow-yellow-500/50', icon: <XI icon={Crown} size={8} /> },
    { bg: 'bg-gray-300', text: 'text-black', ring: 'ring-gray-300', glow: 'shadow-gray-300/30', icon: null },
    { bg: 'bg-amber-600', text: 'text-white', ring: 'ring-amber-600', glow: 'shadow-amber-600/30', icon: null },
];

const CommunityHub: React.FC<CommunityHubProps> = ({
    theme, users = [], exhibits = [], onExhibitClick, onUserClick, onBack, currentUser, onReact, onFollow, currentUsername
}) => {
    // Read initial tab from URL
    const getInitialTab = () => {
        const params = new URLSearchParams(window.location.search);
        const t = params.get('tab');
        if (t === 'trade') return 'TRADE';
        if (t === 'people') return 'PEOPLE';
        if (t === 'battles') return 'BATTLES';
        return 'TRENDS';
    };

    const [tab, setTab] = useState<'TRENDS' | 'PEOPLE' | 'TRADE' | 'BATTLES'>(getInitialTab);
    const [trendWindow, setTrendWindow] = useState<'48H' | 'ALL'>('ALL');
    const [tradeFilter, setTradeFilter] = useState<'ALL' | 'SALE' | 'TRADE' | 'GIFT'>('ALL');
    const [peopleSearch, setPeopleSearch] = useState('');
    const [peopleSort, setPeopleSort] = useState<'SCORE' | 'POSTS' | 'FOLLOWERS'>('SCORE');

    const isWinamp = theme === 'winamp';
    const isLight = theme === 'light';
    const isXP = theme === 'xp';

    const handleTabChange = (newTab: typeof tab) => {
        setTab(newTab);
        const params = new URLSearchParams(window.location.search);
        if (newTab === 'TRENDS') params.delete('tab');
        else if (newTab === 'TRADE') params.set('tab', 'trade');
        else if (newTab === 'PEOPLE') params.set('tab', 'people');
        else if (newTab === 'BATTLES') params.set('tab', 'battles');
        const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
        window.history.replaceState({ ...window.history.state }, '', newUrl);
    };

    // --- THEME HELPERS ---
    const accent = isWinamp ? 'text-wa-gold' : isLight ? 'text-blue-600' : isXP ? 'text-blue-700' : 'text-green-400';
    const accentBorder = isWinamp ? 'border-wa-gold' : isLight ? 'border-blue-500' : isXP ? 'border-blue-700' : 'border-green-500';
    const cardBg = isWinamp ? 'bg-[#292929] border-[#505050]' : isLight ? 'bg-gray-50 border-gray-200' : isXP ? 'bg-[#ECE9D8] border-[#8592B5]' : 'bg-white/5 border-white/10';
    const inputBg = isWinamp ? 'bg-[#1a1a1a] border-[#505050] text-[#00ff00]' : isLight ? 'bg-white border-gray-300 text-gray-900' : isXP ? 'bg-white border-[#8592B5] text-gray-900' : 'bg-white/10 border-white/20 text-white';
    const sectionLabel = `text-xs uppercase tracking-widest font-pixel flex items-center gap-2 mb-4 ${isWinamp ? 'text-wa-gold font-winamp' : isLight ? 'text-gray-600' : isXP ? 'text-blue-800' : 'text-gray-400'}`;

    // --- COMMUNITY STATS ---
    const now = Date.now();
    const cutoff24h = now - 24 * 60 * 60 * 1000;
    const cutoff48h = now - 48 * 60 * 60 * 1000;

    const stats = useMemo(() => {
        const nonDraft = exhibits.filter(e => !e.isDraft);
        return {
            totalUsers: users.length,
            totalExhibits: nonDraft.length,
            newToday: nonDraft.filter(e => new Date(e.timestamp).getTime() > cutoff24h).length,
            onMarket: nonDraft.filter(e => e.tradeStatus && e.tradeStatus !== 'NONE' && e.tradeStatus !== 'NOT_FOR_SALE').length,
        };
    }, [users, exhibits]);

    // --- ALGORITHMS ---
    const topUsers = useMemo(() => users
        .map(u => {
            const postCount = exhibits.filter(e => e.owner === u.username && !e.isDraft).length;
            const likeCount = u.achievements?.find(a => a.id === 'INFLUENCER')?.current || 0;
            const followerCount = u.followers?.length || 0;
            const score = (postCount * 5) + likeCount + (followerCount * 2);
            return { ...u, score, postCount, followerCount };
        })
        .filter(u => u.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5), [users, exhibits]);

    const recentExhibits48h = useMemo(() =>
        exhibits.filter(e => !e.isDraft && new Date(e.timestamp).getTime() > cutoff48h),
        [exhibits]);

    // Score = likes*4 + comments*3 + shares*5 + views*1
    // Shares weighted highest (active intent), then comments (engagement), likes, views
    const trendScore = (e: Exhibit) =>
        (e.likes ?? 0) * 4 +
        (e.comments?.length ?? 0) * 3 +
        (e.shares ?? 0) * 5 +
        (e.views ?? 0);

    const trendingExhibits = useMemo(() => {
        const pool = (trendWindow === '48H' && recentExhibits48h.length >= 6) ? recentExhibits48h : exhibits.filter(e => !e.isDraft);
        return [...pool].sort((a, b) => trendScore(b) - trendScore(a)).slice(0, 6);
    }, [exhibits, trendWindow, recentExhibits48h]);

    const newExhibits = useMemo(() =>
        exhibits
            .filter(e => !e.isDraft && new Date(e.timestamp).getTime() > cutoff24h)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 6),
        [exhibits]);

    const tradeExhibits = useMemo(() => {
        let pool = exhibits.filter(e => !e.isDraft && e.postType !== 'WANTED');
        if (tradeFilter === 'ALL') pool = pool.filter(e => e.tradeStatus === 'FOR_SALE' || e.tradeStatus === 'FOR_TRADE' || e.tradeStatus === 'GIFT');
        else if (tradeFilter === 'SALE') pool = pool.filter(e => e.tradeStatus === 'FOR_SALE');
        else if (tradeFilter === 'TRADE') pool = pool.filter(e => e.tradeStatus === 'FOR_TRADE');
        else if (tradeFilter === 'GIFT') pool = pool.filter(e => e.tradeStatus === 'GIFT');
        return pool;
    }, [exhibits, tradeFilter]);

    const wantedExhibits = useMemo(() =>
        exhibits.filter(e => !e.isDraft && e.postType === 'WANTED')
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 8),
        [exhibits]);

    const peopleList = useMemo(() => {
        const query = peopleSearch.toLowerCase();
        return users
            .filter(u => u.username !== currentUser?.username)
            .map(u => ({
                ...u,
                postCount: exhibits.filter(e => e.owner === u.username && !e.isDraft).length,
                followerCount: u.followers?.length || 0,
                score: (exhibits.filter(e => e.owner === u.username).length * 5) +
                    (u.achievements?.find(a => a.id === 'INFLUENCER')?.current || 0) +
                    ((u.followers?.length || 0) * 2),
            }))
            .filter(u => u.postCount > 0)
            .filter(u => !query || u.username.toLowerCase().includes(query))
            .sort((a, b) => {
                if (peopleSort === 'SCORE') return b.score - a.score;
                if (peopleSort === 'POSTS') return b.postCount - a.postCount;
                return b.followerCount - a.followerCount;
            })
            .slice(0, 10);
    }, [users, exhibits, currentUser, peopleSearch, peopleSort]);

    const isFollowing = (username: string) => currentUser?.following?.includes(username) || false;

    // --- RENDERERS ---
    const renderTabButton = (id: typeof tab, icon: React.ReactNode, label: string) => (
        <button
            onClick={() => handleTabChange(id)}
            className={`flex flex-col items-center gap-1 p-3 flex-1 transition-all border-b-2 ${tab === id
                ? (isWinamp ? 'border-wa-gold text-wa-gold bg-[#292929]' : isXP ? 'border-blue-700 text-blue-700 font-bold' : 'border-green-500 text-green-500 font-bold')
                : 'border-transparent opacity-50 hover:opacity-100'
                }`}
        >
            {icon}
            <span className="text-[9px] font-pixel uppercase">{label}</span>
        </button>
    );

    const renderStatCard = (icon: React.ReactNode, value: number, label: string) => (
        <div className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border ${cardBg}`}>
            <div className={`${accent} opacity-70`}>{icon}</div>
            <span className={`text-lg font-bold font-pixel ${isLight || isXP ? 'text-gray-900' : 'text-white'}`}>{value}</span>
            <span className={`text-[9px] opacity-50 font-mono uppercase text-center leading-tight`}>{label}</span>
        </div>
    );

    const getTradeLabel = (item: Exhibit) => {
        if (item.tradeStatus === 'FOR_SALE') return `${item.price || '?'} ${item.currency || 'RUB'}`;
        if (item.tradeStatus === 'FOR_TRADE') return 'ОБМЕН';
        if (item.tradeStatus === 'GIFT') return 'ДАРЮ';
        return '';
    };

    const getTradeColor = (item: Exhibit) => {
        if (item.tradeStatus === 'FOR_SALE') return isWinamp ? 'bg-black text-[#00ff00] border border-[#00ff00]' : 'bg-green-600/90 text-white';
        if (item.tradeStatus === 'FOR_TRADE') return isWinamp ? 'bg-black text-[#00aaff] border border-[#00aaff]' : 'bg-blue-600/90 text-white';
        if (item.tradeStatus === 'GIFT') return isWinamp ? 'bg-black text-[#ff00ff] border border-[#ff00ff]' : 'bg-pink-500/90 text-white';
        return 'bg-black/80 text-white';
    };

    const emptyTradeMessage = {
        ALL: 'Рынок пуст. Выставите что-нибудь на продажу!',
        SALE: 'Нет предметов на продажу.',
        TRADE: 'Нет предметов на обмен.',
        GIFT: 'Никто ничего не дарит.',
    }[tradeFilter];

    return (
        <div className={`max-w-4xl mx-auto pb-32 animate-in fade-in ${isWinamp ? 'font-winamp text-wa-green' : isXP ? 'text-gray-900' : isLight ? 'text-gray-900' : 'text-gray-200'}`}>
            <SEO title="Сообщество | NeoArchive" />

            {/* Header */}
            {isWinamp ? (
                <WinampWindow title="COMMUNITY NETWORK">
                    <h1 className="text-xl font-winamp text-wa-gold flex items-center gap-2 mb-2"><XI icon={Users} size={24} /> ГЛОБАЛЬНАЯ СЕТЬ</h1>
                    <p className="text-[12px] opacity-80">Активные узлы: {users.length}</p>
                </WinampWindow>
            ) : (
                <div className={`p-6 pb-4 border-b ${isLight ? 'border-gray-200' : isXP ? 'border-[#8592B5]' : 'border-white/10'}`}>
                    <h1 className="text-2xl font-pixel font-bold flex items-center gap-3"><XI icon={Users} size={28} /> СООБЩЕСТВО</h1>
                    <p className="text-xs opacity-60 mt-1 font-mono">Рейтинги, люди и торговая площадка.</p>
                </div>
            )}

            {/* Community Stats Bar */}
            <div className="px-4 py-3 grid grid-cols-4 gap-2">
                {renderStatCard(<XI icon={Users} size={14} />, stats.totalUsers, 'коллекц.')}
                {renderStatCard(<XI icon={Package} size={14} />, stats.totalExhibits, 'предметов')}
                {renderStatCard(<XI icon={Sparkles} size={14} />, stats.newToday, 'сегодня')}
                {renderStatCard(<XI icon={ShoppingBag} size={14} />, stats.onMarket, 'на рынке')}
            </div>

            {/* Navigation */}
            <div className={`flex mb-6 ${isWinamp ? 'bg-[#292929] border-b border-[#505050]' : isXP ? 'bg-[#ECE9D8] border-b border-[#8592B5]' : isLight ? 'bg-white/90 border-b border-gray-200' : 'border-b border-white/10'}`}>
                {renderTabButton('TRENDS', <XI icon={TrendingUp} size={20} />, 'ТРЕНДЫ')}
                {renderTabButton('PEOPLE', <XI icon={Users} size={20} />, 'ЛЮДИ')}
                {renderTabButton('TRADE', <XI icon={RefreshCw} size={20} />, 'ОБМЕН')}
                {renderTabButton('BATTLES', <XI icon={Swords} size={20} />, 'БИТВЫ')}
            </div>

            {/* Content Area */}
            <div className="px-4">

                {/* ─── TRENDS TAB ─── */}
                {tab === 'TRENDS' && (
                    <div className="space-y-8 animate-in slide-in-from-right-4">

                        {/* Top Collectors */}
                        <div className={`p-4 rounded-2xl border ${isWinamp ? 'bg-[#292929] border-[#505050]' : isXP ? 'bg-[#ECE9D8] border-[#8592B5]' : isLight ? 'bg-yellow-50 border-yellow-200' : 'bg-gradient-to-r from-yellow-900/10 to-transparent border-yellow-500/20'}`}>
                            <h3 className={`${sectionLabel} ${isWinamp ? 'text-wa-gold' : 'text-yellow-500'}`}><XI icon={Trophy} size={14} /> ТОП КОЛЛЕКЦИОНЕРЫ</h3>
                            <div
                                className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide"
                                onTouchStart={e => e.stopPropagation()}
                                onTouchMove={e => e.stopPropagation()}
                                onTouchEnd={e => e.stopPropagation()}
                            >
                                {topUsers.map((u, i) => {
                                    const medal = MEDAL[i];
                                    const following = isFollowing(u.username);
                                    return (
                                        <div key={u.username} className="flex flex-col items-center gap-2 min-w-[88px]">
                                            <div
                                                className="relative cursor-pointer group pb-1 pr-1"
                                                onClick={() => onUserClick(u.username)}
                                            >
                                                <img
                                                    src={u.avatarUrl || getUserAvatar(u.username)}
                                                    className={`w-14 h-14 rounded-full border-2 transition-transform group-hover:scale-110 ${medal ? `ring-2 ${medal.ring} shadow-lg ${medal.glow}` : 'border-white/20'}`}
                                                    alt={u.username}
                                                    onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = getUserAvatar(u.username); }}
                                                />
                                                <div className={`absolute -bottom-1 -right-1 w-5 h-5 text-[9px] font-bold flex items-center justify-center rounded-full ${medal ? `${medal.bg} ${medal.text}` : 'bg-white/20 text-white'}`}>
                                                    {medal?.icon || `#${i + 1}`}
                                                </div>
                                            </div>
                                            <div className="text-center w-full">
                                                <span
                                                    className="text-[10px] font-bold truncate max-w-[88px] block cursor-pointer hover:underline"
                                                    onClick={() => onUserClick(u.username)}
                                                >@{u.username}</span>
                                                <span className="text-[8px] opacity-50 block">{u.postCount} пост · {u.followerCount} подп.</span>
                                                {currentUser && u.username !== currentUser.username && onFollow && (
                                                    <button
                                                        onClick={e => { e.stopPropagation(); onFollow(u.username); }}
                                                        className={`mt-1 px-2 py-0.5 rounded-full text-[8px] font-bold transition-all border ${following
                                                            ? 'border-green-500/50 text-green-500 opacity-70 hover:opacity-100'
                                                            : isWinamp ? 'border-wa-gold text-wa-gold hover:bg-wa-gold hover:text-black' : 'border-current opacity-60 hover:opacity-100'
                                                            }`}
                                                    >
                                                        {following ? '✓ ПОД.' : '+ ПОДП.'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                {topUsers.length === 0 && (
                                    <p className="text-xs opacity-40 font-mono py-4">Пока нет данных.</p>
                                )}
                            </div>
                        </div>

                        {/* Hot Categories */}
                        {/* Trending Exhibits */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className={`${sectionLabel} mb-0`}><XI icon={Star} size={14} className="text-red-400" /> СЕЙЧАС ПОПУЛЯРНО</h3>
                                <div className={`flex rounded-lg overflow-hidden border text-[9px] font-pixel ${isWinamp ? 'border-[#505050]' : isLight ? 'border-gray-200' : 'border-white/20'}`}>
                                    {(['48H', 'ALL'] as const).map(w => (
                                        <button
                                            key={w}
                                            onClick={() => setTrendWindow(w)}
                                            className={`px-2 py-1 transition-all ${trendWindow === w
                                                ? (isWinamp ? 'bg-wa-gold text-black' : isXP ? 'bg-blue-700 text-white' : 'bg-green-500 text-black font-bold')
                                                : 'opacity-50 hover:opacity-100'
                                                }`}
                                        >
                                            {w === '48H' ? '48Ч' : 'ВСЕ'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {trendWindow === '48H' && recentExhibits48h.length < 6 && (
                                <p className="text-[9px] opacity-40 font-mono mb-3">За 48ч меньше 6 предметов — показываем всё время.</p>
                            )}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {trendingExhibits.map(item => (
                                    <ExhibitCard
                                        key={item.id}
                                        item={item}
                                        theme={theme}
                                        onClick={onExhibitClick}
                                        currentUsername={currentUser?.username || ''}
                                        onReact={() => onReact(item.id)}
                                        onAuthorClick={onUserClick}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* New Today */}
                        {newExhibits.length > 0 && (
                            <div>
                                <h3 className={sectionLabel}><XI icon={Sparkles} size={14} className="text-cyan-400" /> НОВИНКИ СЕТИ</h3>
                                <div
                                    className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
                                    onTouchStart={e => e.stopPropagation()}
                                    onTouchMove={e => e.stopPropagation()}
                                    onTouchEnd={e => e.stopPropagation()}
                                >
                                    {newExhibits.map(item => {
                                        const img = getFirstImageUrl(item.imageUrls, 'thumbnail');
                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => onExhibitClick(item)}
                                                className={`flex-shrink-0 w-24 cursor-pointer group`}
                                            >
                                                <div className={`w-24 h-24 rounded-xl overflow-hidden border ${isLight ? 'border-gray-200' : 'border-white/10'} transition-transform group-hover:scale-105`}>
                                                    {img ? (
                                                        <img src={img} alt={item.title} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className={`w-full h-full flex items-center justify-center ${isLight ? 'bg-gray-100' : 'bg-white/5'}`}>
                                                            <XI icon={Package} size={24} className="opacity-20" />
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-[9px] font-mono opacity-70 mt-1 truncate">{item.title}</p>
                                                <p className="text-[8px] opacity-40">@{item.owner}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ─── PEOPLE TAB ─── */}
                {tab === 'PEOPLE' && (
                    <div className="space-y-4 animate-in slide-in-from-right-4">
                        {/* Search + Sort */}
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <XI icon={Search} size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
                                <input
                                    type="text"
                                    placeholder="Поиск по нику..."
                                    value={peopleSearch}
                                    onChange={e => setPeopleSearch(e.target.value)}
                                    className={`w-full pl-8 pr-3 py-2 rounded-xl border text-xs font-mono outline-none ${inputBg}`}
                                />
                            </div>
                            <div className={`flex rounded-xl overflow-hidden border text-[9px] font-pixel ${isWinamp ? 'border-[#505050]' : isLight ? 'border-gray-200' : 'border-white/20'}`}>
                                {(['SCORE', 'POSTS', 'FOLLOWERS'] as const).map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setPeopleSort(s)}
                                        className={`px-2 py-1.5 transition-all ${peopleSort === s
                                            ? (isWinamp ? 'bg-wa-gold text-black' : isXP ? 'bg-blue-700 text-white' : 'bg-green-500 text-black font-bold')
                                            : 'opacity-50 hover:opacity-100'
                                            }`}
                                    >
                                        {s === 'SCORE' ? 'РЕЙ' : s === 'POSTS' ? 'ПОСТ' : 'ПОД'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Users List */}
                        <div className="space-y-2">
                            {peopleList.length === 0 ? (
                                <div className="text-center py-10 opacity-40 font-mono text-xs">Никого не найдено.</div>
                            ) : (
                                peopleList.map(u => {
                                    const following = isFollowing(u.username);
                                    const badges = u.achievements?.filter(a => a.current >= a.target).slice(0, 2) || [];
                                    return (
                                        <div
                                            key={u.username}
                                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${cardBg} hover:border-opacity-50`}
                                        >
                                            <img
                                                src={u.avatarUrl || getUserAvatar(u.username)}
                                                className="w-10 h-10 rounded-full flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
                                                onClick={() => onUserClick(u.username)}
                                                alt={u.username}
                                                onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = getUserAvatar(u.username); }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span
                                                        className="text-sm font-bold cursor-pointer hover:underline truncate"
                                                        onClick={() => onUserClick(u.username)}
                                                    >@{u.username}</span>
                                                    {badges.map(b => (
                                                        <span key={b.id} title={b.id} className="text-[9px] opacity-60">🏅</span>
                                                    ))}
                                                </div>
                                                <p className="text-[10px] opacity-50 font-mono">{u.postCount} пост · {u.followerCount} подп.</p>
                                            </div>
                                            {currentUser && onFollow && (
                                                <button
                                                    onClick={() => onFollow(u.username)}
                                                    className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-pixel font-bold transition-all border ${following
                                                        ? (isWinamp ? 'border-[#505050] text-[#00ff00] opacity-70' : isLight ? 'border-green-300 text-green-600' : 'border-green-500/50 text-green-500')
                                                        : (isWinamp ? 'border-wa-gold text-wa-gold hover:bg-wa-gold hover:text-black' : isLight ? 'border-blue-400 text-blue-600 hover:bg-blue-600 hover:text-white' : 'border-green-500 text-green-400 hover:bg-green-500 hover:text-black')
                                                        }`}
                                                >
                                                    {following ? <><XI icon={UserCheck} size={10} /> ПОД.</> : <><XI icon={UserPlus} size={10} /> +ПОДП.</>}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* ─── TRADE TAB ─── */}
                {tab === 'TRADE' && (
                    <div className="animate-in slide-in-from-right-4 space-y-4">
                        {/* Disclaimer */}
                        <div className={`p-4 border rounded-xl text-center ${isWinamp ? 'border-[#505050] bg-[#292929]' : isXP ? 'bg-[#ECE9D8] border-[#8592B5] text-gray-800' : isLight ? 'bg-blue-50 border-blue-200 text-blue-900' : 'border-blue-500/30 bg-blue-500/5'}`}>
                            <h3 className="text-sm mb-1 font-bold">ТОРГОВАЯ ПЛОЩАДКА</h3>
                            <p className="text-[10px] opacity-60">
                                У нас нет гаранта. Все сделки проводятся напрямую между пользователями.<br />
                                Договаривайтесь в личных сообщениях или сторонних мессенджерах.
                            </p>
                        </div>

                        {/* WANTED Section */}
                        {tradeFilter === 'ALL' && wantedExhibits.length > 0 && (
                            <div>
                                <h3 className={sectionLabel}><XI icon={Search} size={14} className="text-purple-400" /> РАЗЫСКИВАЕТСЯ</h3>
                                <div
                                    className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
                                    onTouchStart={e => e.stopPropagation()}
                                    onTouchMove={e => e.stopPropagation()}
                                    onTouchEnd={e => e.stopPropagation()}
                                >
                                    {wantedExhibits.map(item => {
                                        const img = getFirstImageUrl(item.imageUrls, 'thumbnail');
                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => onExhibitClick(item)}
                                                className={`flex-shrink-0 w-28 cursor-pointer group`}
                                            >
                                                <div className={`relative w-28 h-28 rounded-xl overflow-hidden border ${isLight ? 'border-purple-200' : 'border-purple-500/30'} transition-transform group-hover:scale-105`}>
                                                    {img ? (
                                                        <img src={img} alt={item.title} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className={`w-full h-full flex items-center justify-center ${isLight ? 'bg-purple-50' : 'bg-purple-500/10'}`}>
                                                            <XI icon={Search} size={24} className="text-purple-400 opacity-50" />
                                                        </div>
                                                    )}
                                                    <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-purple-600/90 text-white text-[8px] font-bold rounded">ИЩУТ</div>
                                                </div>
                                                <p className="text-[9px] font-mono opacity-70 mt-1 truncate">{item.title}</p>
                                                <p className="text-[8px] opacity-40">@{item.owner}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Filter Chips */}
                        <div className={`flex gap-2 flex-wrap`}>
                            {([
                                { id: 'ALL', label: 'ВСЕ', icon: <XI icon={RefreshCw} size={10} /> },
                                { id: 'SALE', label: 'ПРОДАЖА', icon: <XI icon={ShoppingBag} size={10} /> },
                                { id: 'TRADE', label: 'ОБМЕН', icon: <XI icon={ArrowLeftRight} size={10} /> },
                                { id: 'GIFT', label: 'ДАРЮ', icon: <XI icon={Gift} size={10} /> },
                            ] as const).map(({ id, label, icon }) => (
                                <button
                                    key={id}
                                    onClick={() => setTradeFilter(id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-pixel font-bold border transition-all ${tradeFilter === id
                                        ? (isWinamp ? 'bg-wa-gold text-black border-wa-gold' : isXP ? 'bg-blue-700 text-white border-blue-700' : 'bg-green-500 text-black border-green-500')
                                        : (isWinamp ? 'border-[#505050] opacity-60 hover:opacity-100' : isLight ? 'border-gray-300 text-gray-600 hover:border-gray-400' : 'border-white/20 opacity-60 hover:opacity-100')
                                        }`}
                                >
                                    {icon}{label}
                                </button>
                            ))}
                        </div>

                        {/* Trade Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {tradeExhibits.length === 0 ? (
                                <div className="col-span-full text-center py-10 opacity-50 font-mono text-xs">{emptyTradeMessage}</div>
                            ) : (
                                tradeExhibits.map(item => {
                                    const img = getFirstImageUrl(item.imageUrls, 'thumbnail');
                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => onExhibitClick(item)}
                                            className="cursor-pointer group"
                                        >
                                            <div className={`relative aspect-square rounded-xl overflow-hidden border transition-all group-hover:scale-[1.02] ${isLight ? 'border-gray-200' : isXP ? 'border-[#8592B5]' : 'border-white/10'}`}>
                                                <img src={img} alt={item.title} className="w-full h-full object-cover" />
                                                <div className={`absolute bottom-0 inset-x-0 px-2 py-1.5 text-[11px] font-bold text-center ${getTradeColor(item)}`}>
                                                    {getTradeLabel(item)}
                                                </div>
                                            </div>
                                            <p className="text-[10px] font-mono opacity-80 mt-1.5 truncate">{item.title}</p>
                                            <p className="text-[9px] opacity-40">@{item.owner}</p>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* ─── BATTLES TAB ─── */}
                {tab === 'BATTLES' && (
                    <div className="animate-in slide-in-from-right-4 pb-6">
                        <DailyBattlesView
                            theme={theme}
                            exhibits={exhibits}
                            currentUser={currentUsername || currentUser?.username || ''}
                            onExhibitClick={onExhibitClick}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommunityHub;

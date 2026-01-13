
import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Users, RefreshCw, Flame } from 'lucide-react';
import { UserProfile, Exhibit } from '../types';
import ExhibitCard from './ExhibitCard';
import { getUserAvatar } from '../services/storageService';

interface CommunityHubProps {
    theme: 'dark' | 'light' | 'xp' | 'winamp';
    users: UserProfile[];
    exhibits: Exhibit[];
    onExhibitClick: (item: Exhibit) => void;
    onUserClick: (username: string) => void;
    onBack?: () => void;
    currentUser?: UserProfile | null;
}

// Winamp Helper wrapper moved outside
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

const CommunityHub: React.FC<CommunityHubProps> = ({ theme, users = [], exhibits = [], onExhibitClick, onUserClick, onBack, currentUser }) => {
    // Read initial tab from URL
    const getInitialTab = () => {
        const params = new URLSearchParams(window.location.search);
        const t = params.get('tab');
        if (t === 'trade') return 'TRADE';
        return 'TRENDS';
    };

    const [tab, setTab] = useState<'TRENDS' | 'TRADE'>(getInitialTab());
    
    const isWinamp = theme === 'winamp';

    // Sync tab changes to URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (tab === 'TRENDS') params.delete('tab');
        else if (tab === 'TRADE') params.set('tab', 'trade');
        
        const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
        window.history.replaceState({ ...window.history.state }, '', newUrl);
    }, [tab]);

    // --- ALGORITHMS ---
    const topUsers = users
        .map(u => {
            const postCount = exhibits.filter(e => e.owner === u.username).length;
            const likeCount = u.achievements?.find(a => a.id === 'INFLUENCER')?.current || 0;
            const followerCount = u.followers?.length || 0;
            const score = (postCount * 5) + likeCount + (followerCount * 2);
            return { ...u, score, postCount };
        })
        .filter(u => u.score > 0)
        .sort((a,b) => b.score - a.score)
        .slice(0, 5);

    const trendingExhibits = exhibits.sort((a,b) => (b.likes + b.views) - (a.likes + a.views)).slice(0, 6);
    const tradeExhibits = exhibits.filter(e => e.tradeStatus === 'FOR_SALE' || e.tradeStatus === 'FOR_TRADE');

    const renderTabButton = (id: typeof tab, icon: any, label: string) => (
        <button 
            onClick={() => setTab(id)}
            className={`flex flex-col items-center gap-1 p-3 flex-1 transition-all border-b-2 ${
                tab === id 
                ? (isWinamp ? 'border-wa-gold text-wa-gold bg-[#292929]' : 'border-green-500 text-green-500 font-bold') 
                : 'border-transparent opacity-50 hover:opacity-100'
            }`}
        >
            {React.createElement(icon, { size: 20 })}
            <span className="text-[9px] font-pixel uppercase">{label}</span>
        </button>
    );

    return (
        <div className={`max-w-4xl mx-auto pb-32 animate-in fade-in ${isWinamp ? 'font-winamp text-wa-green' : ''}`}>
            {/* Header */}
            {isWinamp ? (
                <WinampWindow title="COMMUNITY NETWORK">
                    <h1 className="text-xl font-winamp text-wa-gold flex items-center gap-2 mb-2"><Users size={24}/> ГЛОБАЛЬНАЯ СЕТЬ</h1>
                    <p className="text-[12px] opacity-80">Активные узлы: {users.length}</p>
                </WinampWindow>
            ) : (
                <div className="p-6 mb-6 border-b border-white/10">
                    <h1 className="text-2xl font-pixel font-bold flex items-center gap-3"><Users size={28} /> СООБЩЕСТВО</h1>
                    <p className="text-xs opacity-60 mt-1 font-mono">Центр обмена и рейтинги коллекционеров.</p>
                </div>
            )}

            {/* Navigation */}
            <div className={`flex mb-8 sticky top-16 z-30 ${isWinamp ? 'bg-[#292929] border-b border-[#505050]' : 'border-b border-white/10 bg-black/80 backdrop-blur-md'}`}>
                {renderTabButton('TRENDS', TrendingUp, 'ТРЕНДЫ')}
                {renderTabButton('TRADE', RefreshCw, 'ОБМЕН')}
            </div>

            {/* Content Area */}
            <div className="px-4">
                {tab === 'TRENDS' && (
                    <div className="space-y-8 animate-in slide-in-from-right-4">
                        {/* Top Collectors */}
                        <div className={`p-4 rounded-2xl border ${isWinamp ? 'bg-[#292929] border-[#505050]' : 'bg-gradient-to-r from-yellow-900/10 to-transparent border-yellow-500/20'}`}>
                            <h3 className={`text-xs mb-4 flex items-center gap-2 uppercase tracking-widest ${isWinamp ? 'text-wa-gold font-winamp' : 'text-yellow-500 font-pixel'}`}><Trophy size={14}/> ТОП КОЛЛЕКЦИОНЕРЫ</h3>
                            <div 
                                className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide"
                                onTouchStart={(e) => e.stopPropagation()}
                                onTouchMove={(e) => e.stopPropagation()}
                                onTouchEnd={(e) => e.stopPropagation()}
                            >
                                {topUsers.map((u, i) => (
                                    <div key={u.username} onClick={() => onUserClick(u.username)} className="flex flex-col items-center gap-2 cursor-pointer group min-w-[80px]">
                                        <div className="relative">
                                            <img src={u.avatarUrl || getUserAvatar(u.username)} className={`w-14 h-14 rounded-full border-2 transition-transform group-hover:scale-110 ${isWinamp ? 'border-[#505050]' : 'border-yellow-500/50'}`}/>
                                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-500 text-black text-[10px] font-bold flex items-center justify-center rounded-full">#{i+1}</div>
                                        </div>
                                        <div className="text-center">
                                            <span className="text-[10px] font-bold truncate max-w-[80px] block">@{u.username}</span>
                                            <span className="text-[8px] opacity-50">{u.score} pts</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Hot Items */}
                        <div>
                            <h3 className={`text-xs mb-4 flex items-center gap-2 uppercase tracking-widest ${isWinamp ? 'text-wa-gold font-winamp' : 'text-red-400 font-pixel'}`}><Flame size={14}/> СЕЙЧАС ПОПУЛЯРНО</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {trendingExhibits.map(item => (
                                    <ExhibitCard
                                        key={item.id}
                                        item={item}
                                        theme={theme}
                                        onClick={onExhibitClick}
                                        currentUsername={currentUser?.username || ''}
                                        onReact={() => {}}
                                        onAuthorClick={onUserClick}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'TRADE' && (
                    <div className="animate-in slide-in-from-right-4">
                        <div className={`mb-6 p-4 border rounded-xl text-center ${isWinamp ? 'border-[#505050] bg-[#292929]' : 'border-blue-500/30 bg-blue-500/5'}`}>
                            <h3 className="text-sm mb-1 font-bold">ТОРГОВАЯ ПЛОЩАДКА</h3>
                            <p className="text-[10px] opacity-60">
                                У нас нет гаранта. Все сделки проводятся напрямую между пользователями.<br/>
                                Договаривайтесь в личных сообщениях или сторонних мессенджерах.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {tradeExhibits.length === 0 ? (
                                <div className="col-span-full text-center py-10 opacity-50 font-mono text-xs">Рынок пуст. Выставите что-нибудь на продажу!</div>
                            ) : (
                                tradeExhibits.map(item => (
                                    <div key={item.id} className="relative">
                                        <ExhibitCard
                                            item={item}
                                            theme={theme}
                                            onClick={onExhibitClick}
                                            currentUsername={currentUser?.username || ''}
                                            onReact={() => {}}
                                            onAuthorClick={onUserClick}
                                        />
                                        <div className={`absolute top-2 left-2 px-2 py-1 text-[10px] font-bold rounded shadow-lg ${isWinamp ? 'bg-black text-[#00ff00] border border-[#00ff00]' : 'bg-black/80 text-white backdrop-blur-md'}`}>
                                            {item.tradeStatus === 'FOR_SALE' ? `${item.price || '?'} ${item.currency || 'RUB'}` : 'ОБМЕН'}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommunityHub;


import React, { useState } from 'react';
import { ArrowLeft, Search, Share2, Radar } from 'lucide-react';
import { WishlistItem, UserProfile, WishlistItemStatus } from '../types';
import { WISHLIST_STATUS_CONFIG } from '../constants';
import WishlistCard from './WishlistCard';
import { getUserAvatar } from '../services/storageService';
import XI from './XI';

interface UserWishlistViewProps {
    ownerUsername: string;
    currentUser?: UserProfile | null;
    wishlistItems: WishlistItem[];
    theme: 'dark' | 'light' | 'xp' | 'winamp';
    onBack: () => void;
    onItemClick: (item: WishlistItem) => void;
    onUserClick: (username: string) => void;
}

const UserWishlistView: React.FC<UserWishlistViewProps> = ({
    ownerUsername, currentUser, wishlistItems, theme, onBack, onItemClick, onUserClick
}) => {
    const [copied, setCopied] = useState(false);
    const [statusFilter, setStatusFilter] = useState<WishlistItemStatus | 'ALL'>('ALL');
    const isWinamp = theme === 'winamp';
    const isOwner = currentUser?.username === ownerUsername;

    const filteredItems = statusFilter === 'ALL'
        ? wishlistItems
        : wishlistItems.filter(w => (w.status ?? 'SEARCHING') === statusFilter);

    const handleShare = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={`max-w-4xl mx-auto animate-in fade-in pb-32 pt-4 px-4 ${isWinamp ? 'font-mono text-gray-300' : ''}`}>
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
                <button onClick={onBack} className={`flex items-center gap-2 font-pixel text-[10px] opacity-70 hover:opacity-100 uppercase tracking-widest ${isWinamp ? 'text-[#00ff00]' : ''}`}>
                    <XI icon={ArrowLeft} size={14} /> НАЗАД
                </button>
                <button onClick={handleShare} className={`flex items-center gap-2 font-pixel text-[10px] uppercase tracking-widest transition-all ${copied ? 'text-green-500' : 'opacity-70 hover:opacity-100'}`}>
                    <XI icon={Share2} size={14} /> {copied ? 'ССЫЛКА СКОПИРОВАНА' : 'ПОДЕЛИТЬСЯ'}
                </button>
            </div>

            <div className="text-center mb-10">
                <div className="inline-block relative mb-4">
                    <img src={getUserAvatar(ownerUsername)} className={`w-20 h-20 rounded-full border-4 ${isWinamp ? 'border-[#505050]' : 'border-purple-500/30'}`} />
                    <div className="absolute -bottom-2 -right-2 bg-black text-white p-2 rounded-full border border-white/10">
                        <XI icon={Radar} size={16} className={isWinamp ? 'text-[#00ff00]' : 'text-purple-400'} />
                    </div>
                </div>
                <h1 className={`text-2xl md:text-4xl font-pixel font-black uppercase mb-2 ${isWinamp ? 'text-[#00ff00]' : ''}`}>
                    WISHLIST_@{ownerUsername}
                </h1>
                <p className="font-mono text-xs opacity-50 uppercase tracking-widest">
                    Глобальный розыск артефактов
                </p>
            </div>

            {/* Status Filter */}
            {wishlistItems.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-6">
                    <button
                        onClick={() => setStatusFilter('ALL')}
                        className={`px-3 py-1.5 rounded-lg border text-[9px] font-pixel font-bold uppercase transition-all ${statusFilter === 'ALL' ? 'border-purple-500 text-purple-400 bg-purple-500/10' : 'border-white/10 opacity-50 hover:opacity-80'}`}
                    >
                        ВСЕ ({wishlistItems.length})
                    </button>
                    {(Object.entries(WISHLIST_STATUS_CONFIG) as [WishlistItemStatus, any][]).map(([key, cfg]) => {
                        const count = wishlistItems.filter(w => (w.status ?? 'SEARCHING') === key).length;
                        if (count === 0) return null;
                        return (
                            <button
                                key={key}
                                onClick={() => setStatusFilter(key)}
                                className={`px-3 py-1.5 rounded-lg border text-[9px] font-pixel font-bold uppercase transition-all flex items-center gap-1 ${statusFilter === key ? cfg.color + ' bg-white/10' : 'border-white/10 opacity-50 hover:opacity-80'}`}
                            >
                                {React.createElement(cfg.icon, { size: 10 })}
                                {cfg.label} ({count})
                            </button>
                        );
                    })}
                </div>
            )}

            {filteredItems.length === 0 ? (
                <div className={`p-12 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center opacity-50 ${isWinamp ? 'border-[#505050]' : 'border-white/10'}`}>
                    <XI icon={Search} size={48} className="mb-4 opacity-50" />
                    <p className="font-mono text-sm uppercase">{wishlistItems.length === 0 ? 'Список желаемого пуст' : 'Нет элементов с таким статусом'}</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredItems.map(item => (
                        <WishlistCard
                            key={item.id}
                            item={item}
                            theme={theme}
                            onClick={onItemClick}
                            onUserClick={onUserClick}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default UserWishlistView;

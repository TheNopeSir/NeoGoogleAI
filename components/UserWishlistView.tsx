
import React, { useState } from 'react';
import { ArrowLeft, Search, Share2, Radar } from 'lucide-react';
import { WishlistItem, UserProfile } from '../types';
import WishlistCard from './WishlistCard';
import { getUserAvatar } from '../services/storageService';

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
    const isWinamp = theme === 'winamp';
    const isOwner = currentUser?.username === ownerUsername;

    const handleShare = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={`max-w-6xl mx-auto animate-in fade-in pb-32 pt-4 px-4 ${isWinamp ? 'font-mono text-gray-300' : ''}`}>
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
                <button onClick={onBack} className={`flex items-center gap-2 font-pixel text-[10px] opacity-70 hover:opacity-100 uppercase tracking-widest ${isWinamp ? 'text-[#00ff00]' : ''}`}>
                    <ArrowLeft size={14} /> НАЗАД
                </button>
                <button onClick={handleShare} className={`flex items-center gap-2 font-pixel text-[10px] uppercase tracking-widest transition-all ${copied ? 'text-green-500' : 'opacity-70 hover:opacity-100'}`}>
                    <Share2 size={14} /> {copied ? 'ССЫЛКА СКОПИРОВАНА' : 'ПОДЕЛИТЬСЯ'}
                </button>
            </div>

            <div className="text-center mb-10">
                <div className="inline-block relative mb-4">
                    <img src={getUserAvatar(ownerUsername)} className={`w-20 h-20 rounded-full border-4 ${isWinamp ? 'border-[#505050]' : 'border-purple-500/30'}`} />
                    <div className="absolute -bottom-2 -right-2 bg-black text-white p-2 rounded-full border border-white/10">
                        <Radar size={16} className={isWinamp ? 'text-[#00ff00]' : 'text-purple-400'} />
                    </div>
                </div>
                <h1 className={`text-2xl md:text-4xl font-pixel font-black uppercase mb-2 ${isWinamp ? 'text-[#00ff00]' : ''}`}>
                    WISHLIST_@{ownerUsername}
                </h1>
                <p className="font-mono text-xs opacity-50 uppercase tracking-widest">
                    Глобальный розыск артефактов
                </p>
            </div>

            {wishlistItems.length === 0 ? (
                <div className={`p-12 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center opacity-50 ${isWinamp ? 'border-[#505050]' : 'border-white/10'}`}>
                    <Search size={48} className="mb-4 opacity-50" />
                    <p className="font-mono text-sm uppercase">Список желаемого пуст</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {wishlistItems.map(item => (
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

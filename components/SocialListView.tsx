
import React from 'react';
import { ArrowLeft, User, UserPlus, UserCheck } from 'lucide-react';
import { getUserAvatar, getFullDatabase, toggleFollow } from '../services/storageService';

interface SocialListViewProps {
    type: 'followers' | 'following';
    username: string;
    currentUserUsername?: string;
    theme: 'dark' | 'light' | 'xp' | 'winamp';
    onBack: () => void;
    onUserClick: (username: string) => void;
}

const SocialListView: React.FC<SocialListViewProps> = ({ 
    type, username, currentUserUsername, theme, onBack, onUserClick 
}) => {
    const allUsers = getFullDatabase().users;
    const targetUser = allUsers.find(u => u.username === username);
    
    if (!targetUser) return (
        <div className="p-8 text-center font-pixel">
            <button onClick={onBack} className="mb-4 flex items-center gap-2 mx-auto"><ArrowLeft size={16}/> НАЗАД</button>
            ПОЛЬЗОВАТЕЛЬ НЕ НАЙДЕН
        </div>
    );

    const list = type === 'followers' ? (targetUser.followers || []) : (targetUser.following || []);
    const title = type === 'followers' ? 'ПОДПИСЧИКИ' : 'ПОДПИСКИ';
    const isWinamp = theme === 'winamp';

    // Helper to check if current user follows someone
    const isFollowing = (u: string) => {
        if (!currentUserUsername) return false;
        const me = allUsers.find(user => user.username === currentUserUsername);
        return me?.following.includes(u);
    };

    const handleFollowToggle = async (e: React.MouseEvent, target: string) => {
        e.stopPropagation();
        if (!currentUserUsername) return;
        await toggleFollow(currentUserUsername, target);
        // Force refresh is handled by parent usually, but here we might need local state update or just let the app refresh on next sync/action
        // Ideally App.tsx handles refresh, but toggleFollow updates cache. 
        // We force a re-render by assuming the parent component might need a signal, but for now specific UI update isn't instant in this dumb component without state.
        // However, standard flow in this app relies on global refresh.
    };

    return (
        <div className={`max-w-2xl mx-auto animate-in fade-in pb-20 pt-4 px-4 ${isWinamp ? 'font-mono text-gray-300' : ''}`}>
             <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-4">
                <button onClick={onBack} className={`opacity-70 hover:opacity-100 flex items-center gap-2 font-pixel text-xs ${isWinamp ? 'text-[#00ff00]' : ''}`}>
                    <ArrowLeft size={16} /> НАЗАД
                </button>
                <h2 className={`font-pixel text-lg font-bold ${isWinamp ? 'text-[#00ff00]' : ''}`}>{title} <span className="text-green-500">@{username}</span></h2>
             </div>
             
             <div className="space-y-3">
                {list.length === 0 ? (
                    <div className="text-center opacity-50 py-12 font-mono text-xs border-2 border-dashed border-white/10 rounded-xl">
                        СПИСОК ПУСТ
                    </div>
                ) : (
                    list.map(uName => {
                        const uProfile = allUsers.find(u => u.username === uName);
                        const avatar = uProfile?.avatarUrl || getUserAvatar(uName);
                        const tagline = uProfile?.tagline || 'No status';
                        const alreadyFollowing = isFollowing(uName);
                        const isMe = uName === currentUserUsername;

                        return (
                            <div 
                                key={uName} 
                                onClick={() => onUserClick(uName)}
                                className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer hover:bg-white/5 ${isWinamp ? 'bg-[#191919] border-[#505050]' : theme === 'dark' ? 'bg-dark-surface border-white/10' : 'bg-white border-black/10'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20">
                                        <img src={avatar} alt={uName} className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <div className={`font-bold font-pixel text-xs ${isWinamp ? 'text-[#00ff00]' : ''}`}>@{uName}</div>
                                        <div className="text-[10px] font-mono opacity-50 truncate max-w-[150px]">{tagline}</div>
                                    </div>
                                </div>

                                {!isMe && currentUserUsername && (
                                    <button 
                                        onClick={(e) => handleFollowToggle(e, uName)}
                                        className={`p-2 rounded-lg transition-all ${alreadyFollowing ? 'bg-transparent border border-white/20 opacity-50' : 'bg-green-500 text-black shadow-[0_0_10px_rgba(74,222,128,0.3)]'}`}
                                    >
                                        {alreadyFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
                                    </button>
                                )}
                            </div>
                        );
                    })
                )}
             </div>
        </div>
    );
};

export default SocialListView;

import React from 'react';
import { ArrowLeft, Trash2, Search, Target, AlertCircle } from 'lucide-react';
import { WishlistItem } from '../types';
import { WISHLIST_PRIORITY_CONFIG } from '../constants';
import { getUserAvatar } from '../services/storageService';

interface WishlistDetailViewProps {
    item: WishlistItem;
    theme: 'dark' | 'light' | 'xp' | 'winamp';
    onBack: () => void;
    onDelete?: (id: string) => void;
    onAuthorClick: (username: string) => void;
    currentUser: string;
}

const WishlistDetailView: React.FC<WishlistDetailViewProps> = ({ 
    item, theme, onBack, onDelete, onAuthorClick, currentUser 
}) => {
    const priorityConfig = WISHLIST_PRIORITY_CONFIG[item.priority];
    const isOwner = currentUser === item.owner;
    const isXP = theme === 'xp';
    const isWinamp = theme === 'winamp';

    return (
        <div className={`max-w-2xl mx-auto animate-in fade-in pb-20 pt-4 px-4 ${isWinamp ? 'font-mono text-gray-300' : ''}`}>
            <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                <button onClick={onBack} className={`flex items-center gap-2 font-pixel text-[10px] opacity-70 hover:opacity-100 uppercase tracking-widest ${isWinamp ? 'text-[#00ff00]' : ''}`}>
                    <ArrowLeft size={14} /> НАЗАД
                </button>
                {isOwner && onDelete && (
                    <button 
                        onClick={() => onDelete(item.id)} 
                        className="text-red-500 hover:text-red-400 transition-all flex items-center gap-2 font-pixel text-[10px] uppercase"
                    >
                        <Trash2 size={14} /> УДАЛИТЬ ЗАПРОС
                    </button>
                )}
            </div>

            <div className={`p-1 rounded-3xl border-2 border-dashed ${isXP ? 'border-[#0058EE] bg-white' : isWinamp ? 'border-[#505050] bg-[#191919]' : `border-purple-500/30 ${theme === 'dark' ? 'bg-dark-surface' : 'bg-white'}`}`}>
                <div className="p-6 space-y-6">
                    {/* Header Badge */}
                    <div className="flex justify-center">
                        <div className={`px-4 py-1.5 rounded-full border flex items-center gap-2 text-[10px] font-pixel font-bold uppercase tracking-widest ${priorityConfig.color} bg-black/5`}>
                            {React.createElement(priorityConfig.icon, { size: 14 })}
                            WANTED: {item.priority} PRIORITY
                        </div>
                    </div>

                    {/* Image Area */}
                    <div className={`aspect-video rounded-xl overflow-hidden border-2 relative flex items-center justify-center ${isWinamp ? 'border-[#505050] bg-black' : theme === 'dark' ? 'border-white/10 bg-black/20' : 'border-black/10 bg-gray-50'}`}>
                        {item.referenceImageUrl ? (
                            <img src={item.referenceImageUrl} className="w-full h-full object-contain" alt={item.title} />
                        ) : (
                            <div className="flex flex-col items-center opacity-30">
                                <Search size={48} />
                                <span className="font-pixel text-[10px] mt-2">НЕТ РЕФЕРЕНСА</span>
                            </div>
                        )}
                        {item.priority === 'GRAIL' && (
                            <div className="absolute inset-0 border-4 border-yellow-500/20 pointer-events-none animate-pulse"></div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="text-center space-y-2">
                        <div className={`font-pixel text-[10px] opacity-50 uppercase tracking-widest ${isWinamp ? 'text-[#00ff00]' : ''}`}>{item.category}</div>
                        <h1 className={`text-2xl md:text-3xl font-pixel font-black ${isWinamp ? 'text-[#00ff00]' : ''}`}>{item.title}</h1>
                    </div>

                    {/* Notes Box */}
                    <div className={`p-6 rounded-xl border ${isWinamp ? 'bg-black border-[#505050]' : theme === 'dark' ? 'bg-black/30 border-white/10' : 'bg-gray-100 border-black/5'}`}>
                        <h3 className="font-pixel text-[10px] opacity-50 mb-3 flex items-center gap-2 uppercase tracking-widest">
                            <Target size={14} /> Параметры поиска / Заметки
                        </h3>
                        <p className={`font-mono text-sm leading-relaxed whitespace-pre-wrap italic ${isWinamp ? 'text-[#00ff00]' : ''}`}>
                            {item.notes || "Автор не оставил дополнительных примечаний к поиску."}
                        </p>
                    </div>

                    {/* Author Footer */}
                    <div className="flex items-center justify-center pt-4 border-t border-dashed border-white/10">
                        <div onClick={() => onAuthorClick(item.owner)} className="flex items-center gap-3 cursor-pointer group p-2 hover:bg-white/5 rounded-xl transition-all">
                            <img src={getUserAvatar(item.owner)} className="w-10 h-10 rounded-full border-2 border-purple-500/30" />
                            <div className="text-left">
                                <div className="font-pixel text-[9px] opacity-50 uppercase">Ищет агент</div>
                                <div className="font-bold font-pixel text-xs group-hover:text-purple-400 transition-colors">@{item.owner}</div>
                            </div>
                        </div>
                    </div>
                    
                    {!isOwner && (
                        <div className="text-center pt-2">
                            <p className="text-[10px] opacity-40 font-mono mb-2">Есть этот предмет? Свяжитесь с автором.</p>
                            <button onClick={() => onAuthorClick(item.owner)} className="px-6 py-2 bg-purple-500 text-white font-pixel text-[10px] font-bold rounded-full hover:scale-105 transition-transform">
                                НАПИСАТЬ СООБЩЕНИЕ
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WishlistDetailView;
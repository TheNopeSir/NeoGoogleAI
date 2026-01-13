
import React from 'react';
import { Search, Crown, Crosshair } from 'lucide-react';
import { WishlistItem } from '../types';
import { WISHLIST_PRIORITY_CONFIG } from '../constants';
import { getUserAvatar } from '../services/storageService';

interface WishlistCardProps {
  item: WishlistItem;
  theme: 'dark' | 'light' | 'xp' | 'winamp';
  onDelete?: (id: string) => void;
  onUserClick?: (username: string) => void;
  onClick?: (item: WishlistItem) => void;
}

const WishlistCard: React.FC<WishlistCardProps> = ({ item, theme, onDelete, onUserClick, onClick }) => {
  const priorityConfig = WISHLIST_PRIORITY_CONFIG[item.priority];
  const isXP = theme === 'xp';
  const isWinamp = theme === 'winamp';
  const isGrail = item.priority === 'GRAIL';

  return (
    <div 
      onClick={() => onClick && onClick(item)}
      className={`relative group flex flex-col h-full cursor-pointer transition-all duration-300 hover:-translate-y-1 overflow-hidden
        ${isXP 
          ? 'rounded border-2 border-[#0058EE] bg-white hover:shadow-lg' 
          : isWinamp
          ? 'rounded-none border border-[#505050] bg-[#191919] text-[#00ff00]'
          : `rounded-xl border ${priorityConfig.border} ${theme === 'dark' ? 'bg-black/40 hover:bg-white/5' : 'bg-white hover:bg-gray-50'}`
        }
        ${isGrail ? 'shadow-[0_0_20px_rgba(234,179,8,0.2)]' : ''}
      `}
    >
      {/* Target Overlay Effect */}
      <div className="absolute top-2 left-2 z-20 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
          <Crosshair size={16} className={priorityConfig.color.split(' ')[0]} />
      </div>

      {/* Image Area with "Missing" vibe */}
      <div className={`relative aspect-square overflow-hidden border-b ${isXP ? 'border-[#0058EE]' : isWinamp ? 'border-[#505050]' : 'border-white/10'}`}>
        {item.referenceImageUrl ? (
            <>
                <img 
                    src={item.referenceImageUrl} 
                    alt={item.title} 
                    className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-110 ${isGrail ? '' : 'grayscale group-hover:grayscale-0'}`} 
                />
                {/* Scanline overlay for aesthetic */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.2)_50%)] bg-[length:100%_4px] pointer-events-none opacity-50" />
            </>
        ) : (
            <div className="w-full h-full flex items-center justify-center bg-black/20">
                <Search size={32} className="opacity-20" />
            </div>
        )}
        
        {/* Priority Badge - Centered Bottom */}
        <div className={`absolute bottom-0 left-0 right-0 py-1 flex justify-center backdrop-blur-md border-t ${isXP ? 'bg-white/90 border-blue-200' : isWinamp ? 'bg-black border-[#505050]' : 'bg-black/80 border-white/10'}`}>
            <div className={`flex items-center gap-1.5 text-[8px] font-pixel font-bold uppercase tracking-widest ${priorityConfig.color.split(' ')[0]}`}>
                {React.createElement(priorityConfig.icon, { size: 10 })}
                {priorityConfig.label}
            </div>
        </div>
      </div>

      <div className="p-3 flex flex-col flex-1">
        <div className="flex justify-between items-start gap-2 mb-2">
            <h3 className={`text-[10px] font-bold font-pixel leading-tight uppercase ${isGrail ? 'text-yellow-500' : isWinamp ? 'text-[#00ff00]' : (theme === 'dark' ? 'text-white' : 'text-black')}`}>
                {item.title}
            </h3>
            {isGrail && <Crown size={12} className="text-yellow-500 shrink-0" />}
        </div>
        
        <div className={`text-[9px] font-mono opacity-50 mb-3 truncate ${isWinamp ? 'text-[#00ff00]' : ''}`}>{item.category}</div>

        {/* Footer: User Info */}
        <div className={`mt-auto pt-2 flex items-center justify-between border-t border-dashed ${isXP ? 'border-gray-300' : isWinamp ? 'border-[#505050]' : 'border-white/10'}`}>
            {onUserClick ? (
                <div onClick={(e) => { e.stopPropagation(); onUserClick(item.owner); }} className="flex items-center gap-2 cursor-pointer group/author w-full">
                    <img src={getUserAvatar(item.owner)} className="w-4 h-4 rounded-full border border-white/20" />
                    <span className={`text-[9px] font-pixel opacity-50 group-hover/author:opacity-100 transition-opacity truncate flex-1 ${isWinamp ? 'text-[#00ff00]' : ''}`}>@{item.owner}</span>
                </div>
            ) : ( <div className="h-4"></div> )}

            {onDelete && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                    className="text-[8px] text-red-500 opacity-50 hover:opacity-100 uppercase font-bold px-2"
                >
                    DEL
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default WishlistCard;
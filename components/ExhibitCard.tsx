import React from 'react';
import { Heart, Eye, MessageSquare } from 'lucide-react';
import { Exhibit } from '../types';
import { getArtifactTier, TIER_CONFIG, TRADE_STATUS_CONFIG } from '../constants';
import { getUserAvatar } from '../services/storageService';
import ProgressiveImage from './ProgressiveImage';
import { getImageUrl } from '../utils/imageUtils';

interface ExhibitCardProps {
  item: Exhibit;
  theme: 'dark' | 'light' | 'xp' | 'winamp';
  onClick: (item: Exhibit) => void;
  currentUsername: string;
  onReact: () => void;
  onAuthorClick: (author: string) => void;
}

const ExhibitCard: React.FC<ExhibitCardProps> = ({ item, theme, onClick, currentUsername, onReact, onAuthorClick }) => {
  const tier = getArtifactTier(item);
  const config = TIER_CONFIG[tier];
  const Icon = config.icon;
  const isCursed = tier === 'CURSED';
  const isHighTier = config.glow; // UNCOMMON and above get glow effects
  const uniqueViews = item.viewedBy?.length || item.views; // Use unique viewers if available

  // Simple Like Logic
  const isLiked = item.likedBy?.includes(currentUsername) || false;
  const likeCount = item.likes || 0;
  const commentCount = item.comments?.length || 0;
  
  // Trade Status Logic
  const tradeStatus = item.tradeStatus || 'NONE';
  const tradeConfig = TRADE_STATUS_CONFIG[tradeStatus];

  const isXP = theme === 'xp';
  const isWinamp = theme === 'winamp';

  // Получаем первое изображение для отображения с помощью утилиты
  const firstImage = getImageUrl(item.imageUrls?.[0], 'thumbnail');

  // Extract specs for display (Top 3) - Robust handling
  const specs = item.specs || {};
  const specEntries = Object.entries(specs)
    .filter(([_, val]) => val !== null && val !== undefined && String(val).trim() !== '')
    .slice(0, 3);

  if (isWinamp) {
      return (
        <div 
            onClick={() => onClick(item)}
            className="group cursor-pointer flex flex-col h-full bg-[#292929] border-t-2 border-l-2 border-r-2 border-b-2 border-t-[#505050] border-l-[#505050] border-r-[#101010] border-b-[#101010] overflow-hidden"
        >
            {/* Winamp Title Bar */}
            <div className="h-4 bg-gradient-to-r from-wa-blue-light to-wa-blue-dark flex items-center justify-between px-1 cursor-default select-none">
                <span className="text-white font-winamp text-[10px] tracking-widest uppercase truncate w-[85%]">{item.title}</span>
                <div className="w-2 h-2 bg-[#DCDCDC] border border-t-white border-l-white border-r-[#505050] border-b-[#505050]"></div>
            </div>

            {/* Content Area */}
            <div className="p-2 flex flex-col h-full">
                {/* Image 'Screen' */}
                <div className="relative aspect-square mb-2 bg-black border-2 border-t-[#101010] border-l-[#101010] border-r-[#505050] border-b-[#505050] overflow-hidden">
                    <ProgressiveImage
                        imageData={firstImage}
                        alt={item.title}
                        size="thumbnail"
                        className="w-full h-full"
                    />
                    <div className="absolute bottom-1 right-1 text-[8px] font-winamp text-wa-green bg-black/50 px-1">{item.category}</div>
                </div>

                {/* Specs removed to save space as requested */}

                {/* Meta Info - Playlist Style */}
                <div className="mt-auto pt-2 border-t border-[#505050] font-winamp text-wa-green leading-none">
                    {/* Username Line */}
                    <div 
                        className="truncate text-[12px] mb-1.5 cursor-pointer hover:underline hover:text-white" 
                        onClick={(e) => { e.stopPropagation(); onAuthorClick(item.owner); }}
                    >
                        @{item.owner}
                    </div>
                    
                    {/* Stats Line */}
                    <div className="flex justify-between items-center text-[10px]">
                        <span className="text-[#00A000]">{item.views} kbps</span>
                        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1 hover:text-white" title="Комментарии">
                                <MessageSquare size={10} /> {commentCount}
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onReact(); }}
                                className="flex items-center gap-1 hover:text-[#FFD700]"
                                title="Лайки"
                            >
                                <Heart size={10} fill={isLiked ? "currentColor" : "none"}/> {likeCount}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      );
  }

  // Standard Render for other themes
  return (
    <div
      onClick={() => onClick(item)}
      className={`group cursor-pointer flex flex-col h-full transition-all duration-300 hover:-translate-y-2 relative
        ${isXP
          ? 'rounded-t-lg shadow-lg border-2 border-[#0058EE] bg-white'
          : `rounded-2xl overflow-hidden border-2 ${theme === 'dark' ? `bg-dark-surface border-white/10 hover:border-green-500/50 ${config.shadow}` : 'bg-white border-black/5 hover:border-black/20 shadow-lg'}`
        }
        ${isCursed || config.animated ? 'animate-pulse' : ''}`
      }
      style={isHighTier && theme === 'dark' ? {
        boxShadow: `0 0 20px ${config.glowColor}, inset 0 0 20px ${config.glowColor}15`
      } : undefined}
    >
      {/* XP Window Header */}
      {isXP && (
          <div className="h-6 bg-gradient-to-r from-[#0058EE] to-[#3F8CF3] rounded-t-[4px] flex items-center justify-between px-2 shadow-sm">
             <span className="text-white font-bold text-[10px] drop-shadow-md truncate font-sans">{item.title}</span>
             <div className="flex gap-1">
                 <div className="w-3 h-3 bg-[#D64434] rounded-[2px] border border-white/30 shadow-inner"></div>
             </div>
          </div>
      )}

      <div className={`relative aspect-square overflow-hidden bg-black/20 ${!isXP ? 'rounded-t-2xl' : ''}`}>
        <ProgressiveImage
            imageData={firstImage}
            alt={item.title}
            size="thumbnail"
            className="w-full h-full transition-all duration-500 group-hover:scale-110"
        />

        {!isXP && <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg backdrop-blur-md text-[8px] font-pixel border uppercase bg-black/60 text-white border-white/10">{item.category}</div>}
        
        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-lg flex items-center gap-1 text-[8px] font-pixel font-bold shadow-xl border border-white/10 ${config.badge}`}>
            <Icon size={10} /> {config.name}
        </div>

        {tradeStatus !== 'NONE' && (
            <div className={`absolute bottom-2 left-2 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-[10px] font-bold tracking-wide shadow-lg uppercase border !bg-zinc-900/95 backdrop-blur-md ${tradeConfig.color.replace(/bg-[\w/-]+/, '')}`}>
                {tradeConfig.icon && React.createElement(tradeConfig.icon, { size: 12, strokeWidth: 2.5 })} 
                {tradeConfig.badge}
            </div>
        )}
      </div>

      <div className={`p-4 flex flex-col flex-1 ${isXP ? 'bg-[#ECE9D8]' : ''}`}>
        {!isXP && <h3 className={`text-sm font-bold font-pixel mb-3 line-clamp-2 leading-tight ${isCursed ? 'text-red-500' : ''}`}>{item.title}</h3>}
        
        {/* Specs Overlay - improved visibility */}
        {specEntries.length > 0 ? (
            <div className={`mb-3 space-y-1.5 p-2 rounded-lg ${isXP ? 'bg-white border border-gray-300' : 'bg-white/10 border border-white/10'}`}>
                {specEntries.map(([key, val]) => (
                    <div key={key} className="flex justify-between items-baseline text-[9px]">
                        <span className={`uppercase font-mono opacity-50 mr-2 truncate max-w-[40%] ${isXP ? 'text-gray-600' : ''}`}>{key}:</span>
                        <span className={`font-bold font-mono truncate flex-1 text-right ${isXP ? 'text-black' : 'text-white/90'}`}>{String(val)}</span>
                    </div>
                ))}
            </div>
        ) : (
            <div className="mb-3"></div> // Spacer to keep layout consistent
        )}

        <div className={`mt-auto font-mono text-[10px] ${isXP ? 'text-black opacity-80' : 'opacity-60'}`}>
            <span className="truncate uppercase">{item.condition || item.quality}</span>
        </div>
        
        <div className={`mt-2 pt-3 flex items-center justify-between border-t border-dashed ${isXP ? 'border-gray-400' : 'border-white/10'}`}>
            <div onClick={(e) => { e.stopPropagation(); onAuthorClick(item.owner); }} className="flex items-center gap-2 group/author cursor-pointer">
                <img src={getUserAvatar(item.owner)} className={`w-5 h-5 rounded-full border ${isXP ? 'border-gray-400' : 'border-white/20'}`} />
                <span className={`text-[10px] font-pixel opacity-50 group-hover/author:opacity-100 transition-opacity ${isXP ? 'text-black' : ''}`}>@{item.owner}</span>
            </div>
            
            <div className="flex items-center gap-3">
                <div className={`flex items-center gap-1 text-[10px] ${isXP ? 'text-black/60' : 'opacity-40'}`} title="Просмотры">
                    <Eye size={12} /> <span>{uniqueViews}</span>
                </div>
                <div className={`flex items-center gap-1 text-[10px] ${isXP ? 'text-black/60' : 'opacity-40'}`} title="Комментарии">
                    <MessageSquare size={12} /> <span>{commentCount}</span>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onReact(); }}
                        className={`flex items-center gap-1 text-[10px] transition-colors ${isLiked ? 'text-red-500' : (isXP ? 'text-black/60 hover:text-red-500' : 'opacity-40 hover:opacity-100 hover:text-red-500')}`}
                        title="Лайки"
                    >
                        <Heart size={12} fill={isLiked ? "currentColor" : "none"} /> <span>{likeCount}</span>
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ExhibitCard;
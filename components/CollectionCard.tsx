
import React from 'react';
import { FolderOpen, Share2, Heart, Layers } from 'lucide-react';
import { Collection } from '../types';
import { getUserAvatar } from '../services/storageService';

interface CollectionCardProps {
    col: Collection;
    theme: 'dark' | 'light' | 'xp' | 'winamp';
    onClick: (col: Collection) => void;
    onShare: (col: Collection) => void;
    isLiked?: boolean;
    onLike?: (e: React.MouseEvent) => void;
}

const CollectionCard: React.FC<CollectionCardProps> = ({ col, theme, onClick, onShare, isLiked, onLike }) => {
    const isXP = theme === 'xp';
    const isWinamp = theme === 'winamp';
    // Safeguard for exhibitIds being undefined
    const itemCount = col.exhibitIds?.length || 0;

    return (
      <div 
         onClick={() => onClick(col)}
         className={`group relative aspect-[4/5] md:aspect-[3/4] cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl 
         ${isXP 
            ? 'rounded-t-lg border-2 border-[#0058EE] bg-white' 
            : isWinamp
            ? 'rounded-none border border-[#505050] bg-[#191919] text-[#00ff00]'
            : `rounded-2xl overflow-hidden border-2 ${theme === 'dark' ? 'border-white/10 bg-dark-surface hover:border-green-500/30' : 'border-black/5 bg-white hover:border-black/20'}`
         }`}
      >
          {/* XP Window Header */}
          {isXP && (
              <div className="h-6 bg-gradient-to-r from-[#0058EE] to-[#3F8CF3] rounded-t-[4px] flex items-center justify-between px-2 shadow-sm absolute top-0 left-0 right-0 z-20">
                 <div className="flex items-center gap-1">
                    <FolderOpen size={10} className="text-white"/>
                    <span className="text-white font-bold text-[10px] drop-shadow-md truncate font-sans">{col.title}</span>
                 </div>
                 <div className="flex gap-1">
                     <div className="w-3 h-3 bg-[#D64434] rounded-[2px] border border-white/30 shadow-inner"></div>
                 </div>
              </div>
          )}

          {/* Background Image with Zoom Effect */}
          <div className={`absolute inset-0 overflow-hidden ${isXP ? 'top-6 border-b-2 border-[#0058EE]' : ''}`}>
            <img 
                src={col.coverImage} 
                alt={col.title} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
            />
          </div>

          {/* Gradient Overlay */}
          <div className={`absolute inset-0 flex flex-col justify-between p-5 ${isXP ? 'top-6 bg-gradient-to-t from-white/90 via-transparent to-transparent' : 'bg-gradient-to-t from-black/90 via-black/40 to-transparent'}`}>
              
              {/* Top Badge (Non-XP only) */}
              {!isXP && (
                  <div className="flex justify-between items-start">
                      <div className={`px-2 py-1 rounded-lg backdrop-blur-md border text-[9px] font-pixel flex items-center gap-1.5 uppercase tracking-widest ${isWinamp ? 'bg-black border-[#00ff00] text-[#00ff00]' : 'bg-black/40 border-white/10 text-white/90'}`}>
                          <Layers size={10} className={isWinamp ? 'text-[#00ff00]' : 'text-blue-400'}/> КОЛЛЕКЦИЯ
                      </div>
                  </div>
              )}
              {isXP && <div />} {/* Spacer */}

              {/* Bottom Content */}
              <div className="space-y-3">
                  <div>
                      <h3 className={`${isXP ? 'text-blue-900 drop-shadow-sm font-sans' : 'font-pixel drop-shadow-md'} text-lg md:text-xl font-bold leading-tight mb-1 line-clamp-2 ${isWinamp ? 'text-[#00ff00]' : !isXP ? 'text-white' : ''}`}>{col.title}</h3>
                      <p className={`text-[10px] font-mono line-clamp-1 ${isXP ? 'text-black/80' : isWinamp ? 'text-[#00ff00] opacity-80' : 'text-white/60'}`}>{col.description || 'Без описания'}</p>
                  </div>

                  <div className={`pt-3 border-t flex items-center justify-between ${isXP ? 'border-blue-900/20' : isWinamp ? 'border-[#505050]' : 'border-white/10'}`}>
                      {/* Author Info */}
                      <div className="flex items-center gap-2">
                          <img src={getUserAvatar(col.owner)} className={`w-6 h-6 rounded-full border ${isXP ? 'border-blue-900/20' : 'border-white/30'}`} />
                          <span className={`text-[10px] font-mono font-bold truncate max-w-[80px] ${isXP ? 'text-black' : isWinamp ? 'text-[#00ff00]' : 'text-white/80'}`}>@{col.owner}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                          {onLike && (
                              <button
                                  onClick={(e) => { e.stopPropagation(); onLike(e); }}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-lg backdrop-blur-sm border transition-colors ${isLiked ? 'bg-red-500/20 border-red-500/50 text-red-400' : (isXP ? 'bg-white/50 border-blue-900/10 text-blue-900 hover:bg-white' : isWinamp ? 'bg-black border-[#505050] text-[#00ff00] hover:bg-[#202020]' : 'bg-white/10 border-white/10 text-white hover:bg-white/20')}`}
                              >
                                  <Heart size={14} fill={isLiked ? "currentColor" : "none"} />
                                  <span className="text-[10px] font-bold">{col.likes || 0}</span>
                              </button>
                          )}
                          <div className={`w-[1px] h-4 ${isXP ? 'bg-black/20' : 'bg-white/20'}`} />
                          <div className={`px-2 py-1 rounded-lg text-[10px] font-bold backdrop-blur-sm ${isXP ? 'bg-blue-600 text-white' : isWinamp ? 'bg-[#00ff00] text-black' : 'bg-white/10 text-white'}`}>
                              {itemCount}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    );
};

export default CollectionCard;

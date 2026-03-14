import React from 'react';
import { Heart, Eye, MessageSquare, Camera, Tag } from 'lucide-react';
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

const formatRelativeTime = (timestamp: string): string => {
  const diff = Date.now() - new Date(timestamp).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'сегодня';
  if (days === 1) return 'вчера';
  if (days < 7) return `${days} дн.`;
  if (days < 30) return `${Math.floor(days / 7)} нед.`;
  return `${Math.floor(days / 30)} мес.`;
};

const formatPrice = (price: number, currency?: string): string => {
  const cur = currency || 'RUB';
  if (cur === 'RUB') return `${price.toLocaleString('ru-RU')} ₽`;
  if (cur === 'USD') return `$${price.toLocaleString('en-US')}`;
  if (cur === 'ETH') return `${price} ETH`;
  return `${price}`;
};

export const ExhibitCard: React.FC<ExhibitCardProps> = ({ item, theme, onClick, currentUsername, onReact, onAuthorClick }) => {
  const tier = getArtifactTier(item);
  const config = TIER_CONFIG[tier];
  const Icon = config.icon;
  const isCursed = tier === 'CURSED';
  const isHighTier = tier !== 'COMMON';
  const uniqueViews = item.viewedBy?.length || item.views;

  const isLiked = item.likedBy?.includes(currentUsername) || false;
  const likeCount = item.likes || 0;
  const commentCount = item.comments?.length || 0;

  const tradeStatus = item.tradeStatus || 'NONE';
  const tradeConfig = TRADE_STATUS_CONFIG[tradeStatus];

  const isXP = theme === 'xp';
  const isWinamp = theme === 'winamp';
  const isLight = theme === 'light';


  const firstImage = getImageUrl(item.imageUrls?.[0], 'thumbnail');
  const photoCount = item.imageUrls?.length || 0;
  const condition = item.condition || item.quality;

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('.interactive')) {
      return;
    }
    onClick(item);
  };

  const handleLike = () => {
    onReact();
  };

  const handleAuthorClick = (author: string) => {
    onAuthorClick(author);
  };

  // --- WINAMP THEME ---
  if (isWinamp) {
    return (
      <div
        onClick={handleCardClick}
        className="group cursor-pointer flex flex-col h-full bg-[#292929] border-t-2 border-l-2 border-r-2 border-b-2 border-t-[#505050] border-l-[#505050] border-r-[#101010] border-b-[#101010] overflow-hidden relative"
      >
        <div className="h-4 bg-gradient-to-r from-wa-blue-light to-wa-blue-dark flex items-center justify-between px-1 cursor-default select-none">
          <span className="text-white font-winamp text-[10px] tracking-widest uppercase truncate w-[85%]">{item.title}</span>
          <div className="w-2 h-2 bg-[#DCDCDC] border border-t-white border-l-white border-r-[#505050] border-b-[#505050]"></div>
        </div>

        <div className="p-2 flex flex-col h-full">
          <div className="relative aspect-square mb-2 bg-black border-2 border-t-[#101010] border-l-[#101010] border-r-[#505050] border-b-[#505050] overflow-hidden">
            <ProgressiveImage
              imageData={firstImage}
              alt={item.title}
              size="thumbnail"
              className="w-full h-full"
            />
            <div className="absolute bottom-1 right-1 text-[8px] font-winamp text-wa-green bg-black/50 px-1">{item.category}</div>
            {photoCount > 1 && (
              <div className="absolute top-1 right-1 flex items-center gap-0.5 text-[8px] font-winamp text-wa-green bg-black/60 px-1">
                <Camera size={7} /> {photoCount}
              </div>
            )}
          </div>

          <div className="mt-auto pt-2 border-t border-[#505050] font-winamp text-wa-green leading-none">
            <div
              className="truncate text-[12px] mb-1.5 cursor-pointer hover:underline hover:text-white inline-block interactive"
              onClick={() => handleAuthorClick(item.owner)}
            >
              @{item.owner}
            </div>

            {/* Condition + price row */}
            <div className="flex items-center justify-between text-[9px] mb-1.5 text-[#00A000]">
              {condition && <span className="truncate uppercase">{condition}</span>}
              {tradeStatus === 'FOR_SALE' && item.price ? (
                <span className="text-[#00FF00] font-bold ml-auto pl-1 shrink-0">{formatPrice(item.price, item.currency)}</span>
              ) : tradeStatus !== 'NONE' && (
                <span className={`ml-auto pl-1 shrink-0 ${tradeConfig.color.split(' ')[0]}`}>{tradeConfig.badge}</span>
              )}
            </div>

            <div className="flex justify-between items-center text-[10px]">
              <span className="text-[#00A000]">{item.views} kbps</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 hover:text-white" title="Комментарии">
                  <MessageSquare size={10} /> {commentCount}
                </div>
                <button
                  type="button"
                  onClick={handleLike}
                  className="flex items-center gap-1 hover:text-[#FFD700] p-2 -m-2 cursor-pointer interactive min-h-[44px] min-w-[44px] justify-center"
                  title="Лайки"
                >
                  <Heart size={10} fill={isLiked ? "currentColor" : "none"} /> {likeCount}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- XP THEME ---
  if (isXP) {
    return (
      <div
        onClick={handleCardClick}
        className={`group cursor-pointer flex flex-col h-full transition-all duration-300 hover:-translate-y-2 relative rounded-t-lg shadow-lg border-2 border-[#0058EE] bg-white ${isCursed || config.animated ? 'animate-pulse' : ''}`}
      >
        <div className="h-6 bg-gradient-to-r from-[#0058EE] to-[#3F8CF3] rounded-t-[4px] flex items-center justify-between px-2 shadow-sm">
          <span className="text-white font-bold text-[10px] drop-shadow-md truncate font-sans">{item.title}</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-[#D64434] rounded-[2px] border border-white/30 shadow-inner"></div>
          </div>
        </div>

        <div className="relative aspect-[4/3] overflow-hidden bg-black/20">
          <ProgressiveImage
            imageData={firstImage}
            alt={item.title}
            size="thumbnail"
            className="w-full h-full transition-all duration-500 group-hover:scale-110"
          />
          <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-lg flex items-center gap-1 text-[8px] font-pixel font-bold shadow-xl border border-white/10 ${config.badge}`}>
            <Icon size={10} /> {config.name}
          </div>
          {tradeStatus !== 'NONE' && (
            <div className={`absolute bottom-2 left-2 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-[10px] font-bold tracking-wide shadow-lg uppercase border !bg-zinc-900/95 backdrop-blur-md ${tradeConfig.color.replace(/bg-[\w/-]+/, '')}`}>
              {tradeConfig.icon && React.createElement(tradeConfig.icon, { size: 12, strokeWidth: 2.5 })}
              {tradeConfig.badge}
            </div>
          )}
          {photoCount > 1 && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[9px] font-pixel bg-black/60 text-white px-1.5 py-0.5 rounded">
              <Camera size={9} /> {photoCount}
            </div>
          )}
        </div>

        <div className="p-3 flex flex-col flex-1 bg-[#ECE9D8]">
          {/* Condition + Price row */}
          <div className="flex items-center justify-between mb-2">
            {condition && (
              <span className="font-mono text-[10px] text-black/70 uppercase tracking-wide truncate">{condition}</span>
            )}
            {tradeStatus === 'FOR_SALE' && item.price && (
              <span className="font-mono text-[11px] font-bold text-green-700 ml-auto shrink-0">{formatPrice(item.price, item.currency)}</span>
            )}
            {tradeStatus === 'FOR_TRADE' && (
              <span className="font-mono text-[10px] font-bold text-blue-700 ml-auto shrink-0">ОБМЕН</span>
            )}
          </div>

          <div className="mt-auto pt-2 flex flex-col gap-2 border-t border-dashed border-gray-400">
            <div
              onClick={() => handleAuthorClick(item.owner)}
              className="flex items-center gap-2 group/author cursor-pointer w-full relative z-20 interactive"
            >
              <img src={getUserAvatar(item.owner)} className="w-5 h-5 rounded-full border border-gray-400" alt={item.owner} />
              <span className="text-[10px] font-pixel opacity-50 group-hover/author:opacity-100 transition-opacity truncate flex-1 min-w-0 text-black">@{item.owner}</span>
              <span className="text-[9px] text-black/40 shrink-0">{formatRelativeTime(item.timestamp)}</span>
            </div>

            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-1 text-[11px] text-black/60" title="Просмотры">
                <Eye size={12} /> <span>{uniqueViews}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-[11px] text-black/60" title="Комментарии">
                  <MessageSquare size={12} /> <span>{commentCount}</span>
                </div>
                <button
                  type="button"
                  onClick={handleLike}
                  className={`flex items-center gap-1 text-[11px] transition-colors p-2 -m-2 cursor-pointer interactive min-h-[44px] min-w-[44px] justify-center ${isLiked ? 'text-red-500' : 'text-black/60 hover:text-red-500'}`}
                >
                  <Heart size={12} fill={isLiked ? "currentColor" : "none"} />
                  <span>{likeCount}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- DARK / LIGHT THEME — two-section card ---
  return (
    <div
      onClick={handleCardClick}
      className={`group cursor-pointer flex flex-col rounded-2xl overflow-hidden transition-all duration-300
        ${isLight
          ? 'bg-white shadow-md hover:shadow-xl hover:shadow-black/10 ring-1 ring-black/5 hover:ring-black/15'
          : `bg-dark-surface ring-1 ring-white/8 hover:ring-green-500/40 hover:shadow-lg hover:shadow-green-500/10 ${isHighTier ? config.borderDark : ''}`
        }
        ${isCursed || config.animated ? 'animate-pulse' : ''}
      `}
    >
      {/* Image section */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <ProgressiveImage
          imageData={firstImage}
          alt={item.title}
          size="thumbnail"
          className="w-full h-full transition-transform duration-500 group-hover:scale-105"
        />

        {/* Light gradient at bottom of image only */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

        {/* Top badges */}
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg backdrop-blur-md text-[8px] font-pixel border uppercase bg-black/50 text-white border-white/10">
          {item.category}
        </div>
        <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded-md flex items-center gap-1 text-[8px] font-pixel font-bold shadow-lg border border-white/10 ${config.badge}`}>
          <Icon size={9} /> {config.name}
        </div>

        {/* Trade badge — bottom left of image */}
        {tradeStatus !== 'NONE' && (
          <div className={`absolute bottom-2 left-2 px-2 py-1 rounded-lg flex items-center gap-1 text-[9px] font-bold tracking-wide shadow-lg uppercase border bg-zinc-900/90 backdrop-blur-md ${tradeConfig.color.replace(/bg-[\w/-]+/, '')}`}>
            {tradeConfig.icon && React.createElement(tradeConfig.icon, { size: 10, strokeWidth: 2.5 })}
            {tradeConfig.badge}
          </div>
        )}

        {/* Photo count — bottom right of image */}
        {photoCount > 1 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[9px] font-pixel bg-black/60 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-md">
            <Camera size={9} /> {photoCount}
          </div>
        )}
      </div>

      {/* Info panel */}
      <div className={`flex flex-col gap-2 px-3 py-2.5 ${isLight ? 'bg-white' : 'bg-dark-surface'}`}>
        {/* Title */}
        <h3 className={`font-bold font-pixel text-sm leading-tight line-clamp-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
          {item.title}
        </h3>

        {/* Condition + Price row */}
        {(condition || (tradeStatus === 'FOR_SALE' && item.price)) && (
          <div className="flex items-center justify-between gap-2">
            {condition && (
              <div className={`flex items-center gap-1 text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded ${isLight ? 'bg-gray-100 text-gray-600' : 'bg-white/8 text-white/60'}`}>
                <Tag size={9} />
                <span className="truncate">{condition}</span>
              </div>
            )}
            {tradeStatus === 'FOR_SALE' && item.price && (
              <span className="text-[11px] font-bold text-emerald-500 ml-auto shrink-0">
                {formatPrice(item.price, item.currency)}
              </span>
            )}
            {tradeStatus === 'FOR_TRADE' && !item.price && !condition && (
              <span className="text-[10px] font-bold text-blue-400">ОБМЕН</span>
            )}
          </div>
        )}

        {/* Author + Stats row */}
        <div className="flex items-center justify-between gap-2">
          <div
            onClick={() => handleAuthorClick(item.owner)}
            className="flex items-center gap-1.5 cursor-pointer interactive group/author min-w-0 flex-1"
          >
            <img
              src={getUserAvatar(item.owner)}
              className="w-4 h-4 rounded-full border border-white/20 shrink-0"
              alt={item.owner}
            />
            <span className={`text-[10px] group-hover/author:text-white transition-colors font-pixel truncate min-w-0 ${isLight ? 'text-gray-500 group-hover/author:!text-gray-900' : 'text-white/60'}`}>
              @{item.owner}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className={`flex items-center gap-1 text-[10px] ${isLight ? 'text-gray-400' : 'text-white/40'}`}>
              <Eye size={11} /> <span>{uniqueViews}</span>
            </div>
            <div className={`flex items-center gap-1 text-[10px] ${isLight ? 'text-gray-400' : 'text-white/40'}`}>
              <MessageSquare size={11} /> <span>{commentCount}</span>
            </div>
            <button
              type="button"
              onClick={handleLike}
              className={`flex items-center gap-1 text-[10px] transition-colors p-2 -m-2 cursor-pointer interactive min-h-[44px] min-w-[44px] justify-center ${isLiked ? 'text-red-400' : isLight ? 'text-gray-400 hover:text-red-400' : 'text-white/40 hover:text-red-400'}`}
            >
              <Heart size={11} fill={isLiked ? "currentColor" : "none"} />
              <span>{likeCount}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

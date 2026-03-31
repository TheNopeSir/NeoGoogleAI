import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Heart, Eye, MessageSquare, Camera, Tag, Search, FolderPlus, BookmarkPlus, X, Radar, MoreHorizontal, ExternalLink } from 'lucide-react';
import { Exhibit, WishlistPriority, Collection, WishlistItem } from '../types';
import { getArtifactTier, TIER_CONFIG, TRADE_STATUS_CONFIG } from '../constants';
import { getUserAvatar } from '../services/storageService';
import ProgressiveImage from './ProgressiveImage';
import { getImageUrl } from '../utils/imageUtils';
import MatrixIcon from './MatrixIcon';
import XI from './XI';

interface ExhibitCardProps {
  item: Exhibit;
  theme: 'dark' | 'light' | 'xp' | 'winamp';
  onClick: (item: Exhibit) => void;
  currentUsername: string;
  onReact: () => void;
  onAuthorClick: (author: string) => void;
  userCollections?: Collection[];
  onAddToCollection?: (exhibitId: string, collectionId: string) => void;
  onAddToWishlist?: (exhibit: Exhibit, priority: WishlistPriority) => void;
  wishlistMatch?: WishlistItem;
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

export const ExhibitCard: React.FC<ExhibitCardProps> = ({
  item, theme, onClick, currentUsername, onReact, onAuthorClick,
  userCollections = [], onAddToCollection, onAddToWishlist, wishlistMatch
}) => {
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

  // --- New computed values ---
  const isNew = Date.now() - new Date(item.timestamp).getTime() < 24 * 60 * 60 * 1000;
  const isViewed = (item.viewedBy?.includes(currentUsername)) || false;
  const isWanted = item.postType === 'WANTED';

  // --- Quick action overlay state ---
  const [showActionOverlay, setShowActionOverlay] = useState(false);
  const [actionMode, setActionMode] = useState<'NONE' | 'COLLECTION_PICKER' | 'WISHLIST_PICKER'>('NONE');
  const [showDotMenu, setShowDotMenu] = useState(false);

  // --- Hover preview portal state ---
  const cardRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewPos, setPreviewPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  const handleCardMouseEnter = () => {
    // Skip hover preview on touch devices
    if (window.matchMedia('(hover: none)').matches) return;
    hoverTimerRef.current = setTimeout(() => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const previewWidth = 288;
      const x = rect.right + previewWidth + 16 > window.innerWidth
        ? rect.left - previewWidth - 8
        : rect.right + 8;
      const y = Math.min(rect.top, window.innerHeight - 420);
      setPreviewPos({ x, y });
      setPreviewVisible(true);
    }, 700);
  };

  const handleCardMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setPreviewVisible(false);
    if (actionMode === 'NONE') setShowActionOverlay(false);
    setShowDotMenu(false);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('.interactive')) {
      return;
    }
    onClick(item);
  };

  const handleLike = () => { onReact(); };
  const handleAuthorClick = (author: string) => { onAuthorClick(author); };

  // --- WINAMP THEME ---
  if (isWinamp) {
    return (
      <div
        onClick={handleCardClick}
        className="group cursor-pointer flex flex-col h-full bg-[#292929] border-t-2 border-l-2 border-r-2 border-b-2 border-t-[#505050] border-l-[#505050] border-r-[#101010] border-b-[#101010] overflow-hidden relative"
      >
        <div className="h-4 bg-gradient-to-r from-wa-blue-light to-wa-blue-dark flex items-center justify-between px-1 cursor-default select-none">
          <span className="text-white font-winamp text-[10px] tracking-widest uppercase truncate w-[85%]">
            {isWanted && '🔍 '}{item.title}
          </span>
          <div className="w-2 h-2 bg-[#DCDCDC] border border-t-white border-l-white border-r-[#505050] border-b-[#505050]"></div>
        </div>

        <div className="p-2 flex flex-col h-full">
          <div className={`relative aspect-square mb-2 bg-black border-2 border-t-[#101010] border-l-[#101010] border-r-[#505050] border-b-[#505050] overflow-hidden ${isWanted ? 'border-amber-700' : ''}`}>
            <ProgressiveImage
              imageData={firstImage}
              alt={item.title}
              size="thumbnail"
              className="w-full h-full"
            />
            {isWanted && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <XI icon={Search} size={24} className="text-amber-400 opacity-70" />
              </div>
            )}
            <div className="absolute bottom-1 right-1 text-[8px] font-winamp text-wa-green bg-black/50 px-1">{item.category}</div>
            {photoCount > 1 && (
              <div className="absolute top-1 right-1 flex items-center gap-0.5 text-[8px] font-winamp text-wa-green bg-black/60 px-1">
                <XI icon={Camera} size={7} /> {photoCount}
              </div>
            )}
            {isNew && (
              <div className="absolute top-1 left-1 flex items-center gap-0.5 text-[8px] font-winamp text-black bg-[#00ff00] px-1 font-bold">
                NEW
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

            <div className="flex items-center justify-between text-[9px] mb-1.5 text-[#00A000]">
              {condition && <span className="truncate uppercase">{condition}</span>}
              {isWanted && item.price ? (
                <span className="text-amber-400 font-bold ml-auto pl-1 shrink-0">МАХ: {formatPrice(item.price, item.currency)}</span>
              ) : tradeStatus === 'FOR_SALE' && item.price ? (
                <span className="text-[#00FF00] font-bold ml-auto pl-1 shrink-0">{formatPrice(item.price, item.currency)}</span>
              ) : tradeStatus !== 'NONE' && (
                <span className={`ml-auto pl-1 shrink-0 ${tradeConfig.color.split(' ')[0]}`}>{tradeConfig.badge}</span>
              )}
            </div>

            <div className="flex justify-between items-center text-[10px]">
              <span className="text-[#00A000]">{item.views} kbps</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 hover:text-white" title="Комментарии">
                  <XI icon={MessageSquare} size={10} /> {commentCount}
                </div>
                <button
                  type="button"
                  onClick={handleLike}
                  className="flex items-center gap-1 hover:text-[#FFD700] p-2 -m-2 cursor-pointer interactive min-h-[44px] min-w-[44px] justify-center"
                  title="Лайки"
                >
                  <XI icon={Heart} size={10} fill={isLiked ? "currentColor" : "none"} /> {likeCount}
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
        className={`group cursor-pointer flex flex-col h-full transition-all duration-300 hover:-translate-y-2 relative rounded-t-lg shadow-lg border-2 bg-white ${isWanted ? 'border-amber-400' : 'border-[#0058EE]'} ${isCursed || config.animated ? 'animate-pulse' : ''}`}
      >
        <div className={`h-6 rounded-t-[4px] flex items-center justify-between px-2 shadow-sm ${isWanted ? 'bg-gradient-to-r from-amber-600 to-amber-400' : 'bg-gradient-to-r from-[#0058EE] to-[#3F8CF3]'}`}>
          <span className="text-white font-bold text-[10px] drop-shadow-md truncate font-sans">
            {isWanted && '🔍 '}{item.title}
          </span>
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-[#D64434] rounded-[2px] border border-white/30 shadow-inner"></div>
          </div>
        </div>

        <div className="relative aspect-[4/3] overflow-hidden bg-gray-200">
          <ProgressiveImage
            imageData={firstImage}
            alt={item.title}
            size="thumbnail"
            className="w-full h-full transition-all duration-500 group-hover:scale-110"
          />
          {isWanted && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <XI icon={Search} size={32} className="text-amber-400 opacity-80" />
            </div>
          )}
          <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-lg flex items-center gap-1 text-[8px] font-pixel font-bold shadow-xl border border-white/10 ${isWanted ? 'bg-amber-500 text-black' : config.badge}`}>
            {isWanted ? <><XI icon={Search} size={9} /> РАЗЫСКИВАЕТСЯ</> : <><Icon size={10} /> {config.name}</>}
          </div>
          {!isWanted && tradeStatus !== 'NONE' && (
            <div className={`absolute bottom-2 left-2 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-[10px] font-bold tracking-wide shadow-lg uppercase border !bg-[#003C74] backdrop-blur-md ${tradeConfig.color.replace(/bg-[\w/-]+/, '')}`}>
              {tradeConfig.icon && React.createElement(tradeConfig.icon, { size: 12, strokeWidth: 2.5 })}
              {tradeConfig.badge}
            </div>
          )}
          {photoCount > 1 && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[9px] font-pixel bg-[#003C74]/80 text-white px-1.5 py-0.5 rounded">
              <XI icon={Camera} size={9} /> {photoCount}
            </div>
          )}
          {isNew && (
            <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-500 text-black text-[7px] font-bold animate-pulse">
              ● NEW
            </div>
          )}
        </div>

        <div className="p-3 flex flex-col flex-1 bg-[#ECE9D8]">
          <div className="flex items-center justify-between mb-2">
            {condition && (
              <span className="font-mono text-[10px] text-black/70 uppercase tracking-wide truncate">{condition}</span>
            )}
            {isWanted && item.price ? (
              <span className="font-mono text-[11px] font-bold text-amber-700 ml-auto shrink-0">МАХ: {formatPrice(item.price, item.currency)}</span>
            ) : tradeStatus === 'FOR_SALE' && item.price ? (
              <span className="font-mono text-[11px] font-bold text-green-700 ml-auto shrink-0">{formatPrice(item.price, item.currency)}</span>
            ) : tradeStatus === 'FOR_TRADE' && (
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
                <XI icon={Eye} size={12} /> <span>{uniqueViews}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-[11px] text-black/60" title="Комментарии">
                  <XI icon={MessageSquare} size={12} /> <span>{commentCount}</span>
                </div>
                <button
                  type="button"
                  onClick={handleLike}
                  className={`flex items-center gap-1 text-[11px] transition-colors p-2 -m-2 cursor-pointer interactive min-h-[44px] min-w-[44px] justify-center ${isLiked ? 'text-red-500' : 'text-black/60 hover:text-red-500'}`}
                >
                  <XI icon={Heart} size={12} fill={isLiked ? "currentColor" : "none"} />
                  <span>{likeCount}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- DARK / LIGHT THEME ---
  return (
    <>
      <div
        ref={cardRef}
        onClick={handleCardClick}
        onMouseEnter={handleCardMouseEnter}
        onMouseLeave={handleCardMouseLeave}
        className={`group cursor-pointer flex flex-col rounded-2xl overflow-hidden transition-all duration-300
          ${isXP
            ? 'bg-white shadow-md hover:shadow-xl hover:shadow-xp-navy/10 ring-1 ring-xp-navy/10 hover:ring-xp-navy/30'
            : isLight
            ? 'bg-white shadow-md hover:shadow-xl hover:shadow-black/10 ring-1 ring-black/5 hover:ring-black/15'
            : `bg-dark-surface ring-1 ring-white/8 hover:ring-green-500/40 hover:shadow-lg hover:shadow-green-500/10 ${isHighTier && !isWanted ? config.borderDark : ''}`
          }
          ${isWanted ? (isLight || isXP ? 'ring-amber-400/50 hover:ring-amber-400' : 'ring-amber-500/30 hover:ring-amber-500/60') : ''}
          ${isCursed || config.animated ? 'animate-pulse' : ''}
        `}
      >
        {/* Image section */}
        <div
          className="relative aspect-[4/3] overflow-hidden"
          onMouseEnter={() => !isWanted && onAddToCollection && setShowActionOverlay(true)}
          onMouseLeave={() => { if (actionMode === 'NONE') setShowActionOverlay(false); }}
        >
          <ProgressiveImage
            imageData={firstImage}
            alt={item.title}
            size="thumbnail"
            className={`w-full h-full transition-transform duration-500 group-hover:scale-105 ${isViewed ? 'brightness-75 opacity-85' : ''}`}
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

          {/* WANTED: magnifying glass overlay */}
          {isWanted && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/25">
              <XI icon={Search} size={36} className="text-amber-400 opacity-60" />
            </div>
          )}

          {/* ПРОСМОТРЕНО: top strip */}
          {isViewed && !isWanted && (
            <div className="absolute top-0 inset-x-0 flex items-center justify-center gap-1 bg-black/55 backdrop-blur-sm py-1 z-10 pointer-events-none">
              <XI icon={Eye} size={10} className="text-white/60" />
              <span className="text-[8px] font-pixel text-white/60 uppercase tracking-wide">Просмотрено</span>
            </div>
          )}

          {/* Top-left: category + NEW badge stacked */}
          <div className={`absolute ${isViewed && !isWanted ? 'top-7' : 'top-2'} left-2 flex flex-col gap-1 z-20`}>
            <div className="px-2 py-0.5 rounded-lg backdrop-blur-md text-[8px] font-pixel border uppercase bg-black/50 text-white border-white/10">
              {item.category}
            </div>
            {isNew && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-green-500/90 text-black text-[7px] font-pixel font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-green-900 animate-pulse inline-block" />
                NEW
              </div>
            )}
            {wishlistMatch && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-600/90 text-white text-[7px] font-pixel font-bold backdrop-blur-md">
                <XI icon={Radar} size={8} className="text-purple-200" />
                ВИШЛИСТ
              </div>
            )}
          </div>

          {/* Top-right: tier badge or WANTED badge */}
          {isWanted ? (
            <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md flex items-center gap-1 text-[8px] font-pixel font-bold shadow-lg bg-amber-500 text-black border border-amber-400/50 z-20">
              <XI icon={Search} size={9} /> РАЗЫСКИВАЕТСЯ
            </div>
          ) : (
            <div className={`absolute ${isViewed ? 'top-7' : 'top-2'} right-2 px-1.5 py-0.5 rounded-md flex items-center gap-1 text-[8px] font-pixel font-bold shadow-lg border border-white/10 ${config.badge} z-20`}>
              <Icon size={9} /> {config.name}
            </div>
          )}

          {/* Trade badge — bottom left */}
          {!isWanted && tradeStatus !== 'NONE' && (
            <div className={`absolute bottom-2 left-2 px-2 py-1 rounded-lg flex items-center gap-1 text-[9px] font-bold tracking-wide shadow-lg uppercase border bg-zinc-900/90 backdrop-blur-md ${tradeConfig.color.replace(/bg-[\w/-]+/, '')}`}>
              {tradeConfig.icon && React.createElement(tradeConfig.icon, { size: 10, strokeWidth: 2.5 })}
              {tradeConfig.badge}
            </div>
          )}

          {/* Photo count — bottom right */}
          {photoCount > 1 && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[9px] font-pixel bg-black/60 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-md z-20">
              <XI icon={Camera} size={9} /> {photoCount}
            </div>
          )}

          {/* Quick action overlay (only for non-WANTED, only if callbacks provided) */}
          {onAddToCollection && onAddToWishlist && (
            <div
              className={`absolute inset-x-0 bottom-0 transition-all duration-200 z-30 ${showActionOverlay ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
            >
              {actionMode === 'NONE' && (
                <div className="flex gap-2 p-2 bg-black/85 backdrop-blur-sm">
                  {item.owner === currentUsername && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setActionMode('COLLECTION_PICKER'); }}
                      className="flex-1 py-1.5 bg-blue-500/20 border border-blue-500/40 rounded-lg text-[9px] font-bold text-blue-300 hover:bg-blue-500/30 transition-colors interactive flex items-center justify-center gap-1"
                    >
                      <XI icon={FolderPlus} size={10} /> Коллекция
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setActionMode('WISHLIST_PICKER'); }}
                    className="flex-1 py-1.5 bg-purple-500/20 border border-purple-500/40 rounded-lg text-[9px] font-bold text-purple-300 hover:bg-purple-500/30 transition-colors interactive flex items-center justify-center gap-1"
                  >
                    <XI icon={BookmarkPlus} size={10} /> Вишлист
                  </button>
                </div>
              )}

              {actionMode === 'COLLECTION_PICKER' && (
                <div className="bg-black/92 backdrop-blur-md p-2 max-h-36 overflow-y-auto">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[8px] font-pixel opacity-50 px-1">ВЫБЕРИТЕ КОЛЛЕКЦИЮ</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setActionMode('NONE'); }} className="p-1 opacity-40 hover:opacity-80 interactive">
                      <XI icon={X} size={10} />
                    </button>
                  </div>
                  {userCollections.length === 0 ? (
                    <div className="text-[8px] opacity-40 text-center py-2">Нет коллекций</div>
                  ) : (
                    userCollections.map(col => (
                      <button
                        key={col.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToCollection(item.id, col.id);
                          setActionMode('NONE');
                          setShowActionOverlay(false);
                        }}
                        className="w-full text-left px-2 py-1.5 text-[9px] hover:bg-white/10 rounded transition-colors interactive block truncate"
                      >
                        {col.title}
                      </button>
                    ))
                  )}
                </div>
              )}

              {actionMode === 'WISHLIST_PICKER' && (
                <div className="bg-black/92 backdrop-blur-md p-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[8px] font-pixel opacity-50">ПРИОРИТЕТ</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setActionMode('NONE'); }} className="p-1 opacity-40 hover:opacity-80 interactive">
                      <XI icon={X} size={10} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {(['GRAIL', 'HIGH', 'MEDIUM', 'LOW'] as WishlistPriority[]).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToWishlist(item, p);
                          setActionMode('NONE');
                          setShowActionOverlay(false);
                        }}
                        className={`py-1.5 text-[8px] font-bold border rounded-lg hover:bg-white/10 transition-colors interactive ${
                          p === 'GRAIL' ? 'border-yellow-500/50 text-yellow-400' :
                          p === 'HIGH' ? 'border-orange-500/50 text-orange-400' :
                          p === 'MEDIUM' ? 'border-blue-500/50 text-blue-400' :
                          'border-white/20 text-white/50'
                        }`}
                      >
                        {p === 'GRAIL' ? '👑 ГРААЛЬ' : p === 'HIGH' ? '🎯 ВЫСОКИЙ' : p === 'MEDIUM' ? '🔍 СРЕДНИЙ' : '👁 НИЗКИЙ'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info panel */}
        <div className={`flex flex-col gap-2 px-3 py-2.5 ${isXP || isLight ? 'bg-white' : 'bg-dark-surface'}`}>
          {/* Title */}
          <h3 className={`font-bold font-pixel text-sm leading-tight line-clamp-2 ${isXP || isLight ? 'text-gray-900' : 'text-white'}`}>
            {item.title}
          </h3>

          {/* Condition + Price row */}
          {(condition || (tradeStatus === 'FOR_SALE' && item.price) || isWanted) && (
            <div className="flex items-center justify-between gap-2">
              {condition && (
                <div className={`flex items-center gap-1 text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded ${isXP || isLight ? 'bg-gray-100 text-gray-600' : 'bg-white/8 text-white/60'}`}>
                  <XI icon={Tag} size={9} />
                  <span className="truncate">{condition}</span>
                </div>
              )}
              {isWanted && item.price ? (
                <span className="text-[11px] font-bold text-amber-400 ml-auto shrink-0">
                  МАХ: {formatPrice(item.price, item.currency)}
                </span>
              ) : tradeStatus === 'FOR_SALE' && item.price ? (
                <span className="text-[11px] font-bold text-emerald-500 ml-auto shrink-0">
                  {formatPrice(item.price, item.currency)}
                </span>
              ) : tradeStatus === 'FOR_TRADE' && !item.price && !condition && (
                <span className="text-[10px] font-bold text-blue-400">ОБМЕН</span>
              )}
            </div>
          )}

          {/* Author row */}
          <div
            onClick={() => handleAuthorClick(item.owner)}
            className="flex items-center gap-1.5 cursor-pointer interactive group/author min-w-0 w-full"
          >
            <img
              src={getUserAvatar(item.owner)}
              className={`w-4 h-4 rounded-full border shrink-0 ${isXP || isLight ? 'border-gray-200' : 'border-white/20'}`}
              alt={item.owner}
            />
            <span className={`text-[10px] transition-colors font-pixel truncate min-w-0 flex-1 ${isXP ? 'text-gray-500 group-hover/author:!text-xp-navy' : isLight ? 'text-gray-500 group-hover/author:!text-gray-900' : 'text-white/60 group-hover/author:text-white'}`}>
              @{item.owner}
            </span>
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1 text-[10px] ${isXP || isLight ? 'text-gray-400' : 'text-white/40'}`}>
                <MatrixIcon icon={Eye} size={11} theme={theme} glow={0} /> <span>{uniqueViews}</span>
              </div>
              <div className={`flex items-center gap-1 text-[10px] ${isXP || isLight ? 'text-gray-400' : 'text-white/40'}`}>
                <MatrixIcon icon={MessageSquare} size={11} color="#60a5fa" theme={theme} glow={0} /> <span>{commentCount}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleLike}
                className={`flex items-center gap-1 text-[10px] transition-colors p-2 -m-2 cursor-pointer interactive min-h-[44px] min-w-[44px] justify-center ${isLiked ? 'text-red-400' : isXP || isLight ? 'text-gray-400 hover:text-red-400' : 'text-white/40 hover:text-red-400'}`}
              >
                <MatrixIcon icon={Heart} size={11} color="#f87171" theme={theme} glow={isLiked ? 1 : 0} />
                <span>{likeCount}</span>
              </button>
              {/* Three-dot menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowDotMenu(v => !v); }}
                  className={`flex items-center p-2 -m-2 cursor-pointer interactive min-h-[44px] min-w-[44px] justify-center transition-colors ${isXP || isLight ? 'text-gray-400 hover:text-gray-700' : 'text-white/30 hover:text-white/70'}`}
                >
                  <XI icon={MoreHorizontal} size={14} />
                </button>
                {showDotMenu && (
                  <div
                    className={`absolute right-0 bottom-8 w-36 border rounded-xl shadow-2xl py-1 z-50 ${isXP || isLight ? 'bg-white border-gray-200' : 'bg-[#111]/95 backdrop-blur-md border-white/10'}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setShowDotMenu(false); onClick(item); }}
                      className={`w-full text-left px-3 py-1.5 text-[10px] font-pixel flex items-center gap-2 interactive ${isXP || isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-white/80'}`}
                    >
                      <XI icon={ExternalLink} size={11} /> Открыть
                    </button>
                    {onAddToCollection && item.owner === currentUsername && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setShowDotMenu(false); setShowActionOverlay(true); setActionMode('COLLECTION_PICKER'); }}
                        className={`w-full text-left px-3 py-1.5 text-[10px] font-pixel flex items-center gap-2 interactive ${isXP || isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-white/80'}`}
                      >
                        <XI icon={FolderPlus} size={11} /> Коллекция
                      </button>
                    )}
                    {onAddToWishlist && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setShowDotMenu(false); setShowActionOverlay(true); setActionMode('WISHLIST_PICKER'); }}
                        className={`w-full text-left px-3 py-1.5 text-[10px] font-pixel flex items-center gap-2 interactive ${isXP || isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-white/80'}`}
                      >
                        <XI icon={BookmarkPlus} size={11} /> Вишлист
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hover Preview Portal */}
      {previewVisible && !isWanted && ReactDOM.createPortal(
        <div
          className="fixed z-[9999] w-72 rounded-2xl overflow-hidden shadow-2xl pointer-events-none border border-white/15"
          style={{
            left: previewPos.x,
            top: previewPos.y,
            background: 'rgba(15,15,20,0.97)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div className="relative h-40 overflow-hidden">
            <img src={firstImage} className="w-full h-full object-cover" alt={item.title} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-2 left-2 flex gap-3 text-[9px] font-mono text-white/70">
              <span className="flex items-center gap-1"><MatrixIcon icon={Eye} size={10} theme="dark" glow={0} /> {uniqueViews}</span>
              <span className="flex items-center gap-1"><MatrixIcon icon={Heart} size={10} color="#f87171" theme="dark" glow={1} /> {likeCount}</span>
              <span className="flex items-center gap-1"><MatrixIcon icon={MessageSquare} size={10} color="#60a5fa" theme="dark" glow={1} /> {commentCount}</span>
            </div>
            <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded-md flex items-center gap-1 text-[7px] font-pixel font-bold border border-white/10 ${config.badge}`}>
              <Icon size={8} /> {config.name}
            </div>
          </div>
          <div className="p-3 space-y-2">
            <h3 className="font-pixel text-sm font-bold text-white line-clamp-2">{item.title}</h3>
            {item.description && (
              <p className="text-[10px] text-white/50 line-clamp-2">{item.description}</p>
            )}
            {Object.entries(item.specs || {}).slice(0, 3).map(([key, val]) => (
              <div key={key} className="flex justify-between text-[9px] font-mono">
                <span className="text-white/40 uppercase truncate mr-2">{key}</span>
                <span className="text-white/70 shrink-0">{val}</span>
              </div>
            ))}
            {condition && (
              <div className="flex justify-between text-[9px] font-mono">
                <span className="text-white/40 uppercase">Состояние</span>
                <span className="text-white/70">{condition}</span>
              </div>
            )}
            {tradeStatus === 'FOR_SALE' && item.price && (
              <div className="text-emerald-400 font-bold text-sm font-mono pt-1">
                {formatPrice(item.price, item.currency)}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

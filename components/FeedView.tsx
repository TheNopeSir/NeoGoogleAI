import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  LayoutGrid, List as ListIcon, Search, Heart,
  Zap, Radar, ArrowUpCircle, Folder, ChevronDown, ChevronUp, User as UserIcon,
  ArrowUp, Loader2, Inbox
} from 'lucide-react';
import { UserProfile, Exhibit, WishlistItem, Collection } from '../types';
import { DefaultCategory, CATEGORY_SUBCATEGORIES } from '../constants';
import * as db from '../services/storageService';
import { getUserAvatar } from '../services/storageService';
import { ExhibitCard } from './ExhibitCard';
import { getFirstImageUrl } from '../utils/imageUtils';
import WishlistCard from './WishlistCard';
import CollectionCard from './CollectionCard';
import SEO from './SEO';

interface FeedViewProps {
  theme: 'dark' | 'light' | 'xp' | 'winamp';
  user: UserProfile;
  stories: { username: string; avatar: string; latestItem?: Exhibit }[];
  exhibits: Exhibit[];
  wishlist: WishlistItem[];
  collections: Collection[];

  feedMode: 'ARTIFACTS' | 'WISHLIST' | 'COLLECTIONS';
  setFeedMode: (mode: 'ARTIFACTS' | 'WISHLIST' | 'COLLECTIONS') => void;
  feedViewMode: 'GRID' | 'LIST';
  setFeedViewMode: (mode: 'GRID' | 'LIST') => void;
  feedType: 'FOR_YOU' | 'FOLLOWING';
  setFeedType: (type: 'FOR_YOU' | 'FOLLOWING') => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;

  onNavigate: (view: string, params?: any) => void;
  onExhibitClick: (item: Exhibit) => void;
  onReact: (id: string) => void;
  onUserClick: (username: string) => void;
  onWishlistClick: (item: WishlistItem) => void;
  onCollectionClick: (col: Collection) => void;
}

const FeedSkeleton: React.FC<{ viewMode: 'GRID' | 'LIST' }> = ({ viewMode }) => (
    <div className={`animate-pulse ${viewMode === 'GRID' ? 'aspect-[3/4]' : 'h-24'} bg-white/5 rounded-xl border border-white/5`}></div>
);

const FeedView: React.FC<FeedViewProps> = ({
  theme,
  user,
  stories,
  exhibits,
  wishlist,
  collections,
  feedMode,
  setFeedMode,
  feedViewMode,
  setFeedViewMode,
  feedType,
  setFeedType,
  selectedCategory,
  setSelectedCategory,
  onNavigate,
  onExhibitClick,
  onReact,
  onUserClick,
  onWishlistClick,
  onCollectionClick
}) => {
  const isWinamp = theme === 'winamp';
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);

  // Wishlist expanded users
  const [expandedWishlistUsers, setExpandedWishlistUsers] = useState<Set<string>>(new Set());

  // Infinite Scroll State
  const [visibleCount, setVisibleCount] = useState(100);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  // Scroll-to-top button
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const handler = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Reset subcategory when main category changes
  useEffect(() => {
    setSelectedSubcategory(null);
    setVisibleCount(100); // Reset scroll on filter change
  }, [selectedCategory, feedType]);

  // --- CORE FILTERING & SORTING LOGIC ---
  const processedExhibits = useMemo(() => {
      // 1. FILTERING
      let items = exhibits.filter(e => {
          // EXCLUDE SELF & DRAFTS
          if (e.owner === user.username) return false;
          if (e.isDraft) return false;

          // Category Filter
          if (selectedCategory !== 'ВСЕ' && e.category !== selectedCategory) return false;
          if (selectedSubcategory && e.subcategory !== selectedSubcategory) return false;

          // Feed Type Filter (Following vs Global)
          if (feedType === 'FOLLOWING' && !user.following.includes(e.owner)) return false;

          return true;
      });

      // 2. SORTING BY TIME (Most Recent First)
      const scoredItems = items.map(item => ({
          ...item,
          _ts: new Date(item.timestamp).getTime()
      }));

      return scoredItems.sort((a, b) => {
          // Primary: Time (New to Old)
          if (b._ts !== a._ts) return b._ts - a._ts;
          // Secondary: ID (Deterministic tie-breaker)
          return b.id.localeCompare(a.id);
      });

  }, [exhibits, user.username, user.following, selectedCategory, selectedSubcategory, feedType]);

  const processedWishlist = useMemo(() => {
      return wishlist.filter(w => {
          if (w.owner === user.username) return false; // Exclude self
          if (selectedCategory !== 'ВСЕ' && w.category !== selectedCategory) return false;
          if (feedType === 'FOLLOWING' && !user.following.includes(w.owner)) return false;
          return true;
      }).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [wishlist, user.username, selectedCategory, feedType]);

  const processedCollections = useMemo(() => {
      return collections.filter(c => {
          if (c.owner === user.username) return false; // Exclude self
          if (feedType === 'FOLLOWING' && !user.following.includes(c.owner)) return false;
          return true;
      }).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [collections, user.username, feedType]);

  // --- INFINITE SCROLL ---
  useEffect(() => {
      const observer = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) {
              setIsLoadingMore(true);
              setTimeout(() => {
                  setVisibleCount(prev => prev + 20);
                  setIsLoadingMore(false);
              }, 300);
          }
      }, { threshold: 0.1 });

      if (observerRef.current) observer.observe(observerRef.current);
      return () => observer.disconnect();
  }, [processedExhibits.length, processedWishlist.length, processedCollections.length]);

  const visibleExhibits = processedExhibits.slice(0, visibleCount);
  const visibleWishlist = processedWishlist.slice(0, visibleCount);
  const visibleCollections = processedCollections.slice(0, visibleCount);

  // Parent Click Handler for List Items
  const handleListItemClick = (e: React.MouseEvent, item: Exhibit) => {
      const target = e.target as HTMLElement;
      // Check if clicked element is a button or inside a button/interactive element
      if (target.closest('button') || target.closest('a') || target.closest('.interactive')) {
          return;
      }
      onExhibitClick(item);
  };

  return (
    <div className="pb-24 space-y-4 animate-in fade-in isolate">
        <SEO title="NeoArchive | Лента" />
        
        {/* 1. MOBILE HEADER */}
        <header className="md:hidden flex justify-between items-center px-4 pt-4 bg-transparent">
            <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-black font-pixel text-xs ${isWinamp ? 'bg-[#292929] text-[#00ff00] border border-[#505050]' : 'bg-green-500'}`}>NA</div>
                <h1 className={`text-lg font-pixel font-bold tracking-tighter ${isWinamp ? 'text-[#00ff00]' : 'text-current'}`}>NeoArchive</h1>
            </div>
        </header>


        {/* 3. CONTROLS AREA */}
        <div className={`sticky top-0 md:top-16 z-30 pt-2 pb-3 px-4 transition-all border-b ${isWinamp ? 'bg-[#191919]/95 border-[#505050] backdrop-blur-md' : theme === 'light' ? 'bg-white/90 border-black/8 backdrop-blur-xl' : 'bg-zinc-950/90 border-white/[0.06] backdrop-blur-xl'}`}>
            <div className="max-w-[2400px] mx-auto w-full space-y-3">

                {/* Mode Toggle & Search */}
                <div className="flex gap-3">
                    {/* Segmented mode toggle with sliding pill */}
                    <div className={`flex-1 flex relative p-1 rounded-2xl ${isWinamp ? 'bg-[#292929] border border-[#505050]' : theme === 'dark' ? 'bg-white/[0.06]' : 'bg-black/[0.05]'}`}>
                        {/* Sliding background indicator */}
                        <div className={`absolute top-1 bottom-1 w-[calc(33.333%-2px)] rounded-xl transition-transform duration-200 ease-out ${
                            isWinamp ? 'bg-[#00ff00]' :
                            feedMode === 'ARTIFACTS' ? 'bg-gradient-to-r from-green-500 to-emerald-500 shadow-md shadow-green-500/20' :
                            feedMode === 'COLLECTIONS' ? 'bg-gradient-to-r from-blue-500 to-indigo-500 shadow-md shadow-blue-500/20' :
                            'bg-gradient-to-r from-purple-500 to-violet-500 shadow-md shadow-purple-500/20'
                        } ${feedMode === 'ARTIFACTS' ? 'translate-x-0.5' : feedMode === 'COLLECTIONS' ? 'translate-x-[calc(100%+1px)]' : 'translate-x-[calc(200%+1px)]'}`} />
                        <button onClick={() => setFeedMode('ARTIFACTS')} className={`flex-1 relative flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold transition-colors duration-150 z-10 ${feedMode === 'ARTIFACTS' ? (isWinamp ? 'text-black' : 'text-white') : (theme === 'dark' ? 'text-white/40 hover:text-white/70' : 'text-black/40 hover:text-black/70')}`}>
                            <LayoutGrid size={12} /> ЛЕНТА
                        </button>
                        <button onClick={() => setFeedMode('COLLECTIONS')} className={`flex-1 relative flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold transition-colors duration-150 z-10 ${feedMode === 'COLLECTIONS' ? (isWinamp ? 'text-black' : 'text-white') : (theme === 'dark' ? 'text-white/40 hover:text-white/70' : 'text-black/40 hover:text-black/70')}`}>
                            <Folder size={12} /> АЛЬБОМЫ
                        </button>
                        <button onClick={() => setFeedMode('WISHLIST')} className={`flex-1 relative flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold transition-colors duration-150 z-10 ${feedMode === 'WISHLIST' ? (isWinamp ? 'text-black' : 'text-white') : (theme === 'dark' ? 'text-white/40 hover:text-white/70' : 'text-black/40 hover:text-black/70')}`}>
                            <Radar size={12} /> ВИШЛИСТ
                        </button>
                    </div>
                    <button onClick={() => onNavigate('SEARCH')} className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${isWinamp ? 'bg-black border border-[#00ff00] text-[#00ff00]' : theme === 'dark' ? 'bg-white/[0.06] hover:bg-white/10 text-white/60 hover:text-white' : 'bg-black/[0.05] hover:bg-black/10 text-black/60 hover:text-black'}`}>
                        <Search size={18} />
                    </button>
                </div>

                {/* Filters Row */}
                <div className="flex items-center gap-2">
                    <div className={`flex p-0.5 rounded-xl shrink-0 ${isWinamp ? 'border border-[#505050]' : theme === 'dark' ? 'bg-white/[0.06]' : 'bg-black/[0.05]'}`}>
                        <button onClick={() => setFeedType('FOR_YOU')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-150 ${feedType === 'FOR_YOU' ? (isWinamp ? 'bg-[#00ff00] text-black' : theme === 'dark' ? 'bg-white/15 text-white shadow-sm' : 'bg-black/10 text-black shadow-sm') : (theme === 'dark' ? 'text-white/40 hover:text-white/70' : 'text-black/40 hover:text-black/70')}`}>ГЛАВНАЯ</button>
                        <button onClick={() => setFeedType('FOLLOWING')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-150 ${feedType === 'FOLLOWING' ? (isWinamp ? 'bg-[#00ff00] text-black' : theme === 'dark' ? 'bg-white/15 text-white shadow-sm' : 'bg-black/10 text-black shadow-sm') : (theme === 'dark' ? 'text-white/40 hover:text-white/70' : 'text-black/40 hover:text-black/70')}`}>ПОДПИСКИ</button>
                    </div>

                    <div className="flex gap-1 shrink-0 ml-auto">
                        <button onClick={() => setFeedViewMode('GRID')} className={`p-2 rounded-lg transition-all ${feedViewMode === 'GRID' ? (theme === 'dark' ? 'bg-white/10 text-green-400' : 'bg-black/10 text-green-600') : 'opacity-25 hover:opacity-50'}`}><LayoutGrid size={15}/></button>
                        <button onClick={() => setFeedViewMode('LIST')} className={`p-2 rounded-lg transition-all ${feedViewMode === 'LIST' ? (theme === 'dark' ? 'bg-white/10 text-green-400' : 'bg-black/10 text-green-600') : 'opacity-25 hover:opacity-50'}`}><ListIcon size={15}/></button>
                    </div>
                </div>

                {/* Category Pills */}
                <div className="space-y-2">
                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                        <button onClick={() => setSelectedCategory('ВСЕ')} className={`px-3.5 py-1.5 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all duration-150 ${selectedCategory === 'ВСЕ' ? (theme === 'dark' ? 'bg-white text-black shadow-md' : 'bg-black text-white shadow-md') : (theme === 'dark' ? 'bg-white/[0.06] text-white/50 hover:text-white/80' : 'bg-black/[0.05] text-black/50 hover:text-black/80')}`}>ВСЕ</button>
                        {Object.values(DefaultCategory).map(cat => (
                            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-3.5 py-1.5 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all duration-150 ${selectedCategory === cat ? (isWinamp ? 'bg-[#00ff00] text-black' : theme === 'dark' ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/40' : 'bg-green-100 text-green-700 ring-1 ring-green-300') : (theme === 'dark' ? 'bg-white/[0.04] text-white/40 hover:text-white/70 hover:bg-white/[0.07]' : 'bg-black/[0.04] text-black/40 hover:text-black/70 hover:bg-black/[0.07]')}`}>{cat}</button>
                        ))}
                    </div>
                    {/* Subcategories */}
                    {selectedCategory !== 'ВСЕ' && CATEGORY_SUBCATEGORIES[selectedCategory] && (
                        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide animate-in slide-in-from-top-2 duration-150">
                            <button onClick={() => setSelectedSubcategory(null)} className={`px-3 py-1 rounded-lg text-[9px] font-bold whitespace-nowrap transition-all ${!selectedSubcategory ? (theme === 'dark' ? 'bg-white/10 text-white' : 'bg-black/10 text-black') : (theme === 'dark' ? 'text-white/40 hover:text-white/70' : 'text-black/40 hover:text-black/70')}`}>ВСЕ</button>
                            {CATEGORY_SUBCATEGORIES[selectedCategory].map(sub => (
                                <button key={sub} onClick={() => setSelectedSubcategory(sub)} className={`px-3 py-1 rounded-lg text-[9px] font-bold whitespace-nowrap transition-all ${selectedSubcategory === sub ? (theme === 'dark' ? 'bg-white/10 text-white' : 'bg-black/10 text-black') : (theme === 'dark' ? 'text-white/40 hover:text-white/70' : 'text-black/40 hover:text-black/70')}`}>{sub}</button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* 4. MAIN FEED CONTENT */}
        <div className="px-4 max-w-[2400px] mx-auto w-full">
            {feedMode === 'ARTIFACTS' ? (
                <>
                    {/* Loading State / Empty State */}
                    {exhibits.length === 0 ? (
                        <div className={`grid gap-4 ${feedViewMode === 'LIST' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-2'}`}>
                            {[1,2,3,4,5,6].map(i => <FeedSkeleton key={i} viewMode={feedViewMode} />)}
                        </div>
                    ) : processedExhibits.length === 0 ? (
                        <div className="text-center py-20 opacity-50 font-mono text-xs border-2 border-dashed border-white/10 rounded-3xl">
                            <Inbox size={36} className="mx-auto mb-3 opacity-40" />
                            ЗДЕСЬ ПОКА ПУСТО<br/>
                            {feedType === 'FOLLOWING' ? "Подпишитесь на активных авторов" : "Попробуйте сбросить фильтры"}
                        </div>
                    ) : (
                        <div className={`grid gap-4 ${feedViewMode === 'GRID' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                            {visibleExhibits.map((item, index) => {
                                const isLiked = item.likedBy?.includes(user?.username || '') || false;
                                try {
                                    return feedViewMode === 'GRID' ? (
                                        <ExhibitCard
                                            key={item.id}
                                            item={item}
                                            theme={theme}
                                            onClick={onExhibitClick}
                                            currentUsername={user?.username || ''}
                                            onReact={() => onReact(item.id)}
                                            onAuthorClick={onUserClick}
                                        />
                                    ) : (
                                    <div key={item.id} onClick={(e) => handleListItemClick(e, item)} className={`flex gap-4 p-3 rounded-xl border cursor-pointer hover:bg-white/5 transition-all ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-black/10'}`}>
                                        <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-black/20"><img src={getFirstImageUrl(item.imageUrls, 'thumbnail')} className="w-full h-full object-cover" /></div>
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[9px] font-pixel opacity-50 uppercase">{item.category}</span>
                                                    <div className="relative z-20">
                                                        <button 
                                                            type="button"
                                                            onClick={() => onReact(item.id)} 
                                                            className="flex items-center gap-1 text-[10px] hover:text-red-500 transition-colors p-1 -m-1 cursor-pointer interactive"
                                                        >
                                                            <Heart size={12} className={isLiked ? "text-red-500 fill-current" : "opacity-60"} /> 
                                                            <span>{item.likes}</span>
                                                        </button>
                                                    </div>
                                                </div>
                                                <h3 className="font-bold font-pixel text-sm mt-1 line-clamp-1">{item.title}</h3>
                                                <p className="text-[10px] opacity-60 line-clamp-1 mt-1">{item.description}</p>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2 interactive" onClick={() => onUserClick(item.owner)}>
                                                <span className="text-[10px] font-bold opacity-70 hover:underline hover:text-green-500">@{item.owner}</span>
                                            </div>
                                        </div>
                                    </div>
                                    );
                                } catch (error) {
                                    return null; 
                                }
                            })}
                        </div>
                    )}
                </>
            ) : feedMode === 'COLLECTIONS' ? (
                /* COLLECTIONS MODE */
                <>
                    {processedCollections.length === 0 ? (
                        <div className="text-center py-20 opacity-30 font-mono text-xs border-2 border-dashed border-white/10 rounded-3xl">КОЛЛЕКЦИЙ НЕТ</div>
                    ) : (
                        <div className={`grid gap-4 ${feedViewMode === 'GRID' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6' : 'grid-cols-1 md:grid-cols-2'}`}>
                            {visibleCollections.map(col => (
                                <CollectionCard key={col.id} col={col} theme={theme} onClick={onCollectionClick} onShare={() => {}} />
                            ))}
                        </div>
                    )}
                </>
            ) : (
                /* WISHLIST MODE */
                <>
                    {processedWishlist.length === 0 ? (
                        <div className="text-center py-20 opacity-30 font-mono text-xs border-2 border-dashed border-white/10 rounded-3xl">ВИШЛИСТ ПУСТ</div>
                    ) : (() => {
                        // ... Same as before ...
                        const wishlistByUser: { [username: string]: WishlistItem[] } = {};
                        processedWishlist.forEach(item => {
                            if (!wishlistByUser[item.owner]) {
                                wishlistByUser[item.owner] = [];
                            }
                            wishlistByUser[item.owner].push(item);
                        });

                        const usernames = Object.keys(wishlistByUser).sort((a, b) =>
                            wishlistByUser[b].length - wishlistByUser[a].length
                        );

                        const toggleUser = (username: string) => {
                            const newSet = new Set(expandedWishlistUsers);
                            if (newSet.has(username)) {
                                newSet.delete(username);
                            } else {
                                newSet.add(username);
                            }
                            setExpandedWishlistUsers(newSet);
                        };

                        return (
                            <div className="space-y-3">
                                {usernames.map(username => {
                                    // ...
                                    const userItems = wishlistByUser[username];
                                    const isExpanded = expandedWishlistUsers.has(username);
                                    const grails = userItems.filter(w => w.priority === 'GRAIL');
                                    const high = userItems.filter(w => w.priority === 'HIGH');
                                    const medium = userItems.filter(w => w.priority === 'MEDIUM');
                                    const low = userItems.filter(w => w.priority === 'LOW');

                                    return (
                                        <div key={username} className={`rounded-xl border overflow-hidden ${isWinamp ? 'border-[#505050] bg-[#191919]' : 'border-white/10 bg-white/5'}`}>
                                            <div
                                                onClick={() => toggleUser(username)}
                                                className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={getUserAvatar(username)}
                                                        className="w-10 h-10 rounded-full border-2 border-white/20"
                                                    />
                                                    <div>
                                                        <div className="font-pixel text-sm font-bold flex items-center gap-2">
                                                            @{username}
                                                            <span className="text-[10px] opacity-50 font-mono">{userItems.length} предметов</span>
                                                        </div>
                                                        <div className="flex gap-2 mt-1">
                                                            {grails.length > 0 && <span className="text-[8px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-500">🏆 {grails.length}</span>}
                                                            {high.length > 0 && <span className="text-[8px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">🎯 {high.length}</span>}
                                                            {medium.length > 0 && <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">🔍 {medium.length}</span>}
                                                            {low.length > 0 && <span className="text-[8px] px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400">👁️ {low.length}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onUserClick(username); }}
                                                        className="px-3 py-1 text-[10px] rounded border border-white/20 hover:bg-white/10 transition-colors"
                                                    >
                                                        ПРОФИЛЬ
                                                    </button>
                                                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div className="p-4 pt-0 space-y-6 border-t border-white/5">
                                                    {[
                                                        { list: grails, color: 'text-yellow-500', title: '🏆 Священный Грааль', border: 'border-yellow-500/30', badge: 'bg-yellow-500' },
                                                        { list: high, color: 'text-orange-400', title: '🎯 Активная Охота', border: 'border-orange-500/20', badge: 'bg-orange-500' },
                                                        { list: medium, color: 'text-blue-400', title: '🔍 Интересует', border: 'border-blue-500/20', badge: 'bg-blue-500' },
                                                        { list: low, color: 'text-gray-400', title: '👁️ Наблюдаю', border: 'border-gray-500/20', badge: 'bg-gray-500' }
                                                    ].map((group, idx) => group.list.length > 0 && (
                                                        <div key={idx} className="space-y-3">
                                                            <div className={`flex items-center gap-3 pb-2 border-b ${group.border}`}>
                                                                <div className={`w-2 h-2 rounded-full ${group.badge} ${group.badge === 'bg-yellow-500' ? 'animate-pulse' : ''}`}></div>
                                                                <h3 className={`font-pixel text-xs ${group.color} uppercase tracking-wider`}>{group.title}</h3>
                                                                <span className="text-[10px] opacity-50 font-mono">{group.list.length}</span>
                                                            </div>
                                                            <div className={`grid gap-3 ${feedViewMode === 'GRID' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6' : 'grid-cols-1 md:grid-cols-2'}`}>
                                                                {group.list.map(item => <WishlistCard key={item.id} item={item} theme={theme} onClick={onWishlistClick} onUserClick={onUserClick} />)}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}
                </>
            )}

            <div ref={observerRef} className="h-16 flex items-center justify-center">
                {isLoadingMore && (
                    <Loader2 size={20} className="animate-spin text-white/30" />
                )}
            </div>
        </div>

        {/* Scroll-to-top button */}
        {scrollY > 400 && (
            <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className={`fixed bottom-24 right-4 z-50 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all md:bottom-8 ${isWinamp ? 'bg-[#00ff00] text-black' : 'bg-green-500 text-black hover:bg-green-400'}`}
                aria-label="Наверх"
            >
                <ArrowUp size={18} />
            </button>
        )}
    </div>
  );
};

export default FeedView;
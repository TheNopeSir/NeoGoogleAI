
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  LayoutGrid, List as ListIcon, Search, Heart,
  Zap, Radar, ArrowUpCircle, Folder, ChevronDown, ChevronUp, User as UserIcon
} from 'lucide-react';
import { UserProfile, Exhibit, WishlistItem, Collection } from '../types';
import { DefaultCategory, CATEGORY_SUBCATEGORIES } from '../constants';
import * as db from '../services/storageService';
import { getUserAvatar } from '../services/storageService';
import ExhibitCard from './ExhibitCard';
import { getFirstImageUrl } from '../utils/imageUtils';
import WishlistCard from './WishlistCard';
import CollectionCard from './CollectionCard';

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
  const [visibleCount, setVisibleCount] = useState(100); // Increased from 20 to 100 for better initial load
  const observerRef = useRef<HTMLDivElement>(null);

  // Reset subcategory when main category changes
  useEffect(() => {
    setSelectedSubcategory(null);
    setVisibleCount(100); // Reset scroll on filter change
  }, [selectedCategory, feedType]);

  // --- CORE FILTERING & SORTING LOGIC ---
  const processedExhibits = useMemo(() => {
      // 1. FILTERING
      let items = exhibits.filter(e => {
          // EXCLUDE SELF & DRAFTS (Fixes Problem #3)
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
              setVisibleCount(prev => prev + 20);
          }
      }, { threshold: 0.1 });

      if (observerRef.current) observer.observe(observerRef.current);
      return () => observer.disconnect();
  }, [processedExhibits.length, processedWishlist.length, processedCollections.length]);

  const visibleExhibits = processedExhibits.slice(0, visibleCount);
  const visibleWishlist = processedWishlist.slice(0, visibleCount);
  const visibleCollections = processedCollections.slice(0, visibleCount);

  return (
    <div className="pb-24 space-y-4 animate-in fade-in">
        
        {/* 1. MOBILE HEADER */}
        <header className="md:hidden flex justify-between items-center px-4 pt-4 bg-transparent">
            <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-black font-pixel text-xs ${isWinamp ? 'bg-[#292929] text-[#00ff00] border border-[#505050]' : 'bg-green-500'}`}>NA</div>
                <h1 className={`text-lg font-pixel font-bold tracking-tighter ${isWinamp ? 'text-[#00ff00]' : 'text-current'}`}>NeoArchive</h1>
            </div>
        </header>

        {/* 2. STORIES (Only on Artifacts Mode) */}
        {feedMode === 'ARTIFACTS' && stories.length > 0 && (
            <div className="pl-4 max-w-5xl mx-auto w-full pt-2">
                <h3 className="font-pixel text-[10px] opacity-50 mb-3 flex items-center gap-2 tracking-widest"><Zap size={12} className="text-yellow-500"/> ОБНОВЛЕНИЯ</h3>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide pr-4">
                    {stories.map((story, i) => (
                        <div key={i} onClick={() => story.latestItem && onExhibitClick(story.latestItem)} className="flex flex-col items-center gap-2 cursor-pointer group min-w-[70px]">
                            <div className="relative p-[2px] rounded-full bg-gradient-to-tr from-green-500 to-blue-500">
                                <div className={`rounded-full p-[2px] ${theme === 'dark' ? 'bg-black' : 'bg-white'}`}>
                                    <img src={story.avatar} className="w-14 h-14 rounded-full object-cover" />
                                </div>
                            </div>
                            <span className="text-[10px] font-bold truncate max-w-[70px]">@{story.username}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* 3. CONTROLS AREA */}
        <div className={`pt-2 pb-2 px-4 transition-all ${theme === 'dark' ? '' : isWinamp ? 'bg-[#191919] border-b border-[#505050]' : ''}`}>
            <div className="max-w-5xl mx-auto w-full space-y-4">
                
                {/* Mode Toggle & Search */}
                <div className="flex gap-4">
                    <div className={`flex-1 flex p-1 rounded-xl border ${isWinamp ? 'bg-[#292929] border-[#505050]' : theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                        <button onClick={() => setFeedMode('ARTIFACTS')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold transition-all ${feedMode === 'ARTIFACTS' ? (isWinamp ? 'bg-[#00ff00] text-black' : 'bg-green-500 text-black shadow-lg') : 'opacity-50'}`}>
                            <LayoutGrid size={14} /> ЛЕНТА
                        </button>
                        <button onClick={() => setFeedMode('COLLECTIONS')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold transition-all ${feedMode === 'COLLECTIONS' ? (isWinamp ? 'bg-[#00ff00] text-black' : 'bg-blue-500 text-white shadow-lg') : 'opacity-50'}`}>
                            <Folder size={14} /> КОЛЛЕКЦИИ
                        </button>
                        <button onClick={() => setFeedMode('WISHLIST')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold transition-all ${feedMode === 'WISHLIST' ? (isWinamp ? 'bg-[#00ff00] text-black' : 'bg-purple-500 text-white shadow-lg') : 'opacity-50'}`}>
                            <Radar size={14} /> ВИШЛИСТ
                        </button>
                    </div>
                    <button onClick={() => onNavigate('SEARCH')} className={`px-4 rounded-xl border flex items-center justify-center ${isWinamp ? 'bg-black border-[#00ff00] text-[#00ff00]' : 'bg-white/5 border-white/10'}`}>
                        <Search size={20} />
                    </button>
                </div>

                {/* Filters Row */}
                <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-hide pb-2">
                    <div className={`flex p-1 rounded-xl shrink-0 ${isWinamp ? 'border border-[#505050]' : theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`}>
                        <button onClick={() => setFeedType('FOR_YOU')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${feedType === 'FOR_YOU' ? (isWinamp ? 'bg-[#00ff00] text-black' : 'bg-green-500 text-black shadow') : 'opacity-50'}`}>ГЛАВНАЯ</button>
                        <button onClick={() => setFeedType('FOLLOWING')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${feedType === 'FOLLOWING' ? (isWinamp ? 'bg-[#00ff00] text-black' : 'bg-green-500 text-black shadow') : 'opacity-50'}`}>ПОДПИСКИ</button>
                    </div>

                    <div className="flex gap-1 shrink-0 ml-auto">
                        <button onClick={() => setFeedViewMode('GRID')} className={`p-2 rounded-lg ${feedViewMode === 'GRID' ? 'bg-white/10 text-green-500' : 'opacity-30'}`}><LayoutGrid size={16}/></button>
                        <button onClick={() => setFeedViewMode('LIST')} className={`p-2 rounded-lg ${feedViewMode === 'LIST' ? 'bg-white/10 text-green-500' : 'opacity-30'}`}><ListIcon size={16}/></button>
                    </div>
                </div>

                {/* Category Pills */}
                <div className="space-y-2">
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        <button onClick={() => setSelectedCategory('ВСЕ')} className={`px-4 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap border transition-all ${selectedCategory === 'ВСЕ' ? 'bg-white text-black border-white' : 'border-current opacity-40 hover:opacity-100'}`}>ВСЕ</button>
                        {Object.values(DefaultCategory).map(cat => (
                            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap border transition-all ${selectedCategory === cat ? (isWinamp ? 'bg-[#00ff00] text-black border-[#00ff00]' : 'bg-green-500 text-black border-green-500') : 'border-white/10 opacity-60 hover:opacity-100'}`}>{cat}</button>
                        ))}
                    </div>
                    {/* Subcategories */}
                    {selectedCategory !== 'ВСЕ' && CATEGORY_SUBCATEGORIES[selectedCategory] && (
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide animate-in slide-in-from-top-2">
                            <button onClick={() => setSelectedSubcategory(null)} className={`px-3 py-1 rounded-lg text-[9px] font-bold whitespace-nowrap border transition-all ${!selectedSubcategory ? 'bg-white/10 border-white' : 'border-transparent opacity-50'}`}>ВСЕ {selectedCategory}</button>
                            {CATEGORY_SUBCATEGORIES[selectedCategory].map(sub => (
                                <button key={sub} onClick={() => setSelectedSubcategory(sub)} className={`px-3 py-1 rounded-lg text-[9px] font-bold whitespace-nowrap border transition-all ${selectedSubcategory === sub ? 'bg-white/10 border-white' : 'border-transparent opacity-50'}`}>{sub}</button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* 4. MAIN FEED CONTENT */}
        <div className="px-4 max-w-5xl mx-auto w-full">
            {feedMode === 'ARTIFACTS' ? (
                <>
                    {/* Loading State / Empty State */}
                    {exhibits.length === 0 ? (
                        <div className="grid grid-cols-2 gap-4">
                            {[1,2,3,4].map(i => <FeedSkeleton key={i} viewMode={feedViewMode} />)}
                        </div>
                    ) : processedExhibits.length === 0 ? (
                        <div className="text-center py-20 opacity-50 font-mono text-xs border-2 border-dashed border-white/10 rounded-3xl">
                            <div className="mb-2 text-2xl">🏜️</div>
                            ЗДЕСЬ ПОКА ПУСТО<br/>
                            {feedType === 'FOLLOWING' ? "Подпишитесь на активных авторов" : "Попробуйте сбросить фильтры"}
                        </div>
                    ) : (
                        <div className={`grid gap-4 ${feedViewMode === 'GRID' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5' : 'grid-cols-1'}`}>
                            {visibleExhibits.map((item, index) => {
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
                                    <div key={item.id} onClick={() => onExhibitClick(item)} className={`flex gap-4 p-3 rounded-xl border cursor-pointer hover:bg-white/5 transition-all ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-black/10'}`}>
                                        <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-black/20"><img src={getFirstImageUrl(item.imageUrls, 'thumbnail')} className="w-full h-full object-cover" /></div>
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between"><span className="text-[9px] font-pixel opacity-50 uppercase">{item.category}</span><div className="flex items-center gap-1 text-[10px] opacity-60"><Heart size={10}/> {item.likes}</div></div>
                                                <h3 className="font-bold font-pixel text-sm mt-1 line-clamp-1">{item.title}</h3>
                                                <p className="text-[10px] opacity-60 line-clamp-1 mt-1">{item.description}</p>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2"><span className="text-[10px] font-bold opacity-70">@{item.owner}</span></div>
                                        </div>
                                    </div>
                                    );
                                } catch (error) {
                                    console.error(`[FeedView] Error rendering exhibit card #${index} (${item.id}):`, error);
                                    return null; // Skip broken cards instead of breaking entire feed
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
                        <div className={`grid gap-4 ${feedViewMode === 'GRID' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4' : 'grid-cols-1'}`}>
                            {visibleCollections.map(col => (
                                <CollectionCard key={col.id} col={col} theme={theme} onClick={onCollectionClick} onShare={() => {}} />
                            ))}
                        </div>
                    )}
                </>
            ) : (
                /* WISHLIST MODE - Grouped by Users */
                <>
                    {processedWishlist.length === 0 ? (
                        <div className="text-center py-20 opacity-30 font-mono text-xs border-2 border-dashed border-white/10 rounded-3xl">ВИШЛИСТ ПУСТ</div>
                    ) : (() => {
                        // Group wishlist by owner
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
                                    const userItems = wishlistByUser[username];
                                    const isExpanded = expandedWishlistUsers.has(username);

                                    // Group by priority
                                    const grails = userItems.filter(w => w.priority === 'GRAIL');
                                    const high = userItems.filter(w => w.priority === 'HIGH');
                                    const medium = userItems.filter(w => w.priority === 'MEDIUM');
                                    const low = userItems.filter(w => w.priority === 'LOW');

                                    return (
                                        <div key={username} className={`rounded-xl border overflow-hidden ${isWinamp ? 'border-[#505050] bg-[#191919]' : 'border-white/10 bg-white/5'}`}>
                                            {/* User Header - Clickable */}
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

                                            {/* Expanded Wishlist Content */}
                                            {isExpanded && (
                                                <div className="p-4 pt-0 space-y-6 border-t border-white/5">
                                                    {/* GRAIL Items */}
                                                    {grails.length > 0 && (
                                                        <div className="space-y-3">
                                                            <div className="flex items-center gap-3 pb-2 border-b border-yellow-500/30">
                                                                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse shadow-[0_0_10px_rgba(234,179,8,0.8)]"></div>
                                                                <h3 className="font-pixel text-xs text-yellow-500 uppercase tracking-wider">🏆 Священный Грааль</h3>
                                                                <span className="text-[10px] opacity-50 font-mono">{grails.length}</span>
                                                            </div>
                                                            <div className={`grid gap-3 ${feedViewMode === 'GRID' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4' : 'grid-cols-1'}`}>
                                                                {grails.map(item => <WishlistCard key={item.id} item={item} theme={theme} onClick={onWishlistClick} onUserClick={onUserClick} />)}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* HIGH Priority */}
                                                    {high.length > 0 && (
                                                        <div className="space-y-3">
                                                            <div className="flex items-center gap-3 pb-2 border-b border-orange-500/20">
                                                                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                                                <h3 className="font-pixel text-xs text-orange-400 uppercase tracking-wider">🎯 Активная Охота</h3>
                                                                <span className="text-[10px] opacity-50 font-mono">{high.length}</span>
                                                            </div>
                                                            <div className={`grid gap-3 ${feedViewMode === 'GRID' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4' : 'grid-cols-1'}`}>
                                                                {high.map(item => <WishlistCard key={item.id} item={item} theme={theme} onClick={onWishlistClick} onUserClick={onUserClick} />)}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* MEDIUM Priority */}
                                                    {medium.length > 0 && (
                                                        <div className="space-y-3">
                                                            <div className="flex items-center gap-3 pb-2 border-b border-blue-500/20">
                                                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                                <h3 className="font-pixel text-xs text-blue-400 uppercase tracking-wider">🔍 Интересует</h3>
                                                                <span className="text-[10px] opacity-50 font-mono">{medium.length}</span>
                                                            </div>
                                                            <div className={`grid gap-3 ${feedViewMode === 'GRID' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4' : 'grid-cols-1'}`}>
                                                                {medium.map(item => <WishlistCard key={item.id} item={item} theme={theme} onClick={onWishlistClick} onUserClick={onUserClick} />)}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* LOW Priority */}
                                                    {low.length > 0 && (
                                                        <div className="space-y-3">
                                                            <div className="flex items-center gap-3 pb-2 border-b border-gray-500/20">
                                                                <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                                                                <h3 className="font-pixel text-xs text-gray-400 uppercase tracking-wider">👁️ Наблюдаю</h3>
                                                                <span className="text-[10px] opacity-50 font-mono">{low.length}</span>
                                                            </div>
                                                            <div className={`grid gap-3 ${feedViewMode === 'GRID' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4' : 'grid-cols-1'}`}>
                                                                {low.map(item => <WishlistCard key={item.id} item={item} theme={theme} onClick={onWishlistClick} onUserClick={onUserClick} />)}
                                                            </div>
                                                        </div>
                                                    )}
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

            {/* Infinite Scroll Trigger */}
            <div ref={observerRef} className="h-20 flex items-center justify-center opacity-30">
                {(visibleCount < (feedMode === 'ARTIFACTS' ? processedExhibits.length : feedMode === 'COLLECTIONS' ? processedCollections.length : processedWishlist.length)) && (
                    <div className="animate-pulse flex items-center gap-2 text-xs font-mono"><ArrowUpCircle size={16}/> ЗАГРУЗКА ДАННЫХ...</div>
                )}
            </div>
        </div>
    </div>
  );
};

export default FeedView;

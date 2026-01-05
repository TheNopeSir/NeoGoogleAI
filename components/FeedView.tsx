import React, { useState, useEffect } from 'react';
import { 
  LayoutGrid, List as ListIcon, Search, Heart, 
  Zap, Radar
} from 'lucide-react';
import { UserProfile, Exhibit, WishlistItem } from '../types';
import { DefaultCategory, CATEGORY_SUBCATEGORIES } from '../constants';
import * as db from '../services/storageService';
import ExhibitCard from './ExhibitCard';
import WishlistCard from './WishlistCard';

interface FeedViewProps {
  theme: 'dark' | 'light' | 'xp' | 'winamp';
  user: UserProfile;
  stories: { username: string; avatar: string; latestItem?: Exhibit }[];
  exhibits: Exhibit[];
  wishlist: WishlistItem[];
  
  feedMode: 'ARTIFACTS' | 'WISHLIST';
  setFeedMode: (mode: 'ARTIFACTS' | 'WISHLIST') => void;
  feedViewMode: 'GRID' | 'LIST';
  setFeedViewMode: (mode: 'GRID' | 'LIST') => void;
  feedType: 'FOR_YOU' | 'FOLLOWING';
  setFeedType: (type: 'FOR_YOU' | 'FOLLOWING') => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;

  onNavigate: (view: string, params?: any) => void;
  onExhibitClick: (item: Exhibit) => void;
  onLike: (id: string, e?: React.MouseEvent) => void;
  onUserClick: (username: string) => void;
  onWishlistClick: (item: WishlistItem) => void;
}

const FeedView: React.FC<FeedViewProps> = ({
  theme,
  user,
  stories,
  exhibits,
  wishlist,
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
  onLike,
  onUserClick,
  onWishlistClick
}) => {
  const isWinamp = theme === 'winamp';
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);

  // Reset subcategory when main category changes
  useEffect(() => {
    setSelectedSubcategory(null);
  }, [selectedCategory]);

  // Filter items logic including subcategory
  const filterItems = (items: Exhibit[]) => {
      return items
        .filter(e => !e.isDraft)
        .filter(e => selectedCategory === 'ВСЕ' || e.category === selectedCategory)
        .filter(e => !selectedSubcategory || e.subcategory === selectedSubcategory)
        .filter(e => feedType === 'FOR_YOU' ? true : user.following.includes(e.owner));
  };

  const filterWishlist = (items: WishlistItem[]) => {
      return items
        .filter(w => selectedCategory === 'ВСЕ' || w.category === selectedCategory)
        .filter(w => feedType === 'FOR_YOU' ? true : user.following.includes(w.owner));
  };

  const filteredExhibits = filterItems(exhibits);
  const filteredWishlist = filterWishlist(wishlist);

  return (
    <div className="pb-24 space-y-6 animate-in fade-in">
        
        {/* 1. MOBILE HEADER (Static, Clean) */}
        <header className="md:hidden flex justify-between items-center px-4 pt-4 bg-transparent">
            <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-black font-pixel text-xs ${isWinamp ? 'bg-[#292929] text-[#00ff00] border border-[#505050]' : 'bg-green-500'}`}>NA</div>
                <h1 className={`text-lg font-pixel font-bold tracking-tighter ${isWinamp ? 'text-[#00ff00]' : 'text-current'}`}>NeoArchive</h1>
            </div>
        </header>

        {/* 2. STORIES */}
        {stories.length > 0 && (
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

        {/* 3. CONTROLS (Static) */}
        <div className={`pt-2 pb-2 px-4 transition-all ${theme === 'dark' ? '' : isWinamp ? 'bg-[#191919] border-b border-[#505050]' : ''}`}>
            <div className="max-w-5xl mx-auto w-full">
                {/* Feed Mode Toggle */}
                <div className={`flex mb-4 p-1 rounded-xl border ${isWinamp ? 'bg-[#292929] border-[#505050]' : theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                    <button 
                        onClick={() => setFeedMode('ARTIFACTS')} 
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold transition-all ${feedMode === 'ARTIFACTS' ? (isWinamp ? 'bg-[#00ff00] text-black' : 'bg-green-500 text-black shadow-lg') : 'opacity-50 hover:opacity-100'}`}
                    >
                        <LayoutGrid size={14} /> ЛЕНТА
                    </button>
                    <button 
                        onClick={() => setFeedMode('WISHLIST')} 
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold transition-all ${feedMode === 'WISHLIST' ? (isWinamp ? 'bg-[#00ff00] text-black' : 'bg-purple-500 text-white shadow-lg') : 'opacity-50 hover:opacity-100'}`}
                    >
                        <Radar size={14} /> ВИШЛИСТ
                    </button>
                </div>

                {/* Search Trigger - No Camera Icon */}
                <div className="mb-4">
                    <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all ${isWinamp ? 'bg-black border-[#00ff00]' : theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-black/10 shadow-sm'}`}>
                        <Search size={16} className="opacity-50" />
                        <input 
                            type="text" 
                            placeholder={feedMode === 'WISHLIST' ? "Поиск желаемого..." : "Поиск по базе..."}
                            className={`bg-transparent border-none outline-none text-xs w-full font-mono ${isWinamp ? 'text-[#00ff00] placeholder-green-900' : ''}`}
                            onFocus={() => onNavigate('SEARCH')} 
                            readOnly
                        />
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center justify-between gap-4">
                    <div className={`flex p-1 rounded-xl ${isWinamp ? 'border border-[#505050]' : theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`}>
                        <button 
                            onClick={() => setFeedType('FOR_YOU')} 
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${feedType === 'FOR_YOU' ? (isWinamp ? 'bg-[#00ff00] text-black' : 'bg-green-500 text-black shadow') : 'opacity-50 hover:opacity-100'}`}
                        >
                            РЕКОМЕНДАЦИИ
                        </button>
                        <button 
                            onClick={() => setFeedType('FOLLOWING')} 
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${feedType === 'FOLLOWING' ? (isWinamp ? 'bg-[#00ff00] text-black' : 'bg-green-500 text-black shadow') : 'opacity-50 hover:opacity-100'}`}
                        >
                            ПОДПИСКИ
                        </button>
                    </div>

                    <div className="flex gap-1">
                        <button onClick={() => setFeedViewMode('GRID')} className={`p-2 rounded-lg transition-all ${feedViewMode === 'GRID' ? 'bg-white/10 text-green-500' : 'opacity-50'}`}><LayoutGrid size={18}/></button>
                        <button onClick={() => setFeedViewMode('LIST')} className={`p-2 rounded-lg transition-all ${feedViewMode === 'LIST' ? 'bg-white/10 text-green-500' : 'opacity-50'}`}><ListIcon size={18}/></button>
                    </div>
                </div>

                {/* Categories */}
                <div className="space-y-2 pt-4">
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        <button 
                            onClick={() => setSelectedCategory('ВСЕ')}
                            className={`px-4 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap border transition-all ${selectedCategory === 'ВСЕ' ? 'bg-white text-black border-white' : 'border-current opacity-40 hover:opacity-100'}`}
                        >
                            ВСЕ
                        </button>
                        {Object.values(DefaultCategory).map(cat => (
                            <button 
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap border transition-all ${selectedCategory === cat ? (isWinamp ? 'bg-[#00ff00] text-black border-[#00ff00]' : 'bg-green-500 text-black border-green-500') : 'border-white/10 opacity-60 hover:opacity-100'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Subcategories */}
                    {selectedCategory !== 'ВСЕ' && CATEGORY_SUBCATEGORIES[selectedCategory] && (
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide animate-in slide-in-from-top-2">
                            <button
                                onClick={() => setSelectedSubcategory(null)}
                                className={`px-3 py-1 rounded-lg text-[9px] font-bold whitespace-nowrap border transition-all ${!selectedSubcategory ? (isWinamp ? 'bg-[#00ff00]/20 text-[#00ff00] border-[#00ff00]' : 'bg-white/10 border-white') : 'border-transparent opacity-50'}`}
                            >
                                ВСЕ {selectedCategory}
                            </button>
                            {CATEGORY_SUBCATEGORIES[selectedCategory].map(sub => (
                                <button
                                    key={sub}
                                    onClick={() => setSelectedSubcategory(sub)}
                                    className={`px-3 py-1 rounded-lg text-[9px] font-bold whitespace-nowrap border transition-all ${selectedSubcategory === sub ? (isWinamp ? 'bg-[#00ff00]/20 text-[#00ff00] border-[#00ff00]' : 'bg-white/10 border-white') : 'border-transparent opacity-50'}`}
                                >
                                    {sub}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* 4. GRID/LIST CONTENT */}
        <div className="px-4 max-w-5xl mx-auto w-full">
            {feedMode === 'ARTIFACTS' ? (
                // ARTIFACTS RENDER
                filteredExhibits.length === 0 ? (
                        <div className="text-center py-20 opacity-30 font-mono text-xs border-2 border-dashed border-white/10 rounded-3xl">
                            НЕТ ДАННЫХ В ПОТОКЕ
                            <br/>
                            {feedType === 'FOLLOWING' && "Подпишитесь на кого-нибудь!"}
                        </div>
                    ) : (
                        <div className={`grid gap-4 ${feedViewMode === 'GRID' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5' : 'grid-cols-1'}`}>
                            {filteredExhibits.map(item => (
                                    feedViewMode === 'GRID' ? (
                                        <ExhibitCard 
                                            key={item.id} 
                                            item={item} 
                                            theme={theme}
                                            onClick={onExhibitClick}
                                            isLiked={item.likedBy?.includes(user?.username || '') || false}
                                            onLike={(e) => onLike(item.id, e)}
                                            onAuthorClick={onUserClick}
                                        />
                                    ) : (
                                        // LIST VIEW CARD
                                        <div 
                                            key={item.id} 
                                            onClick={() => onExhibitClick(item)}
                                            className={`flex gap-4 p-3 rounded-xl border cursor-pointer hover:scale-[1.01] transition-all ${theme === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10' : isWinamp ? 'bg-[#191919] border-[#505050] text-[#00ff00]' : 'bg-white border-black/10 hover:shadow-md'}`}
                                        >
                                            <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-black/20">
                                                <img src={item.imageUrls[0]} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 flex flex-col justify-between">
                                                <div>
                                                    <div className="flex justify-between items-start">
                                                        <span className="text-[10px] font-pixel opacity-50 uppercase">{item.category}</span>
                                                        <div className="flex items-center gap-2 text-[10px] opacity-60">
                                                            <Heart size={12}/> {item.likes}
                                                        </div>
                                                    </div>
                                                    <h3 className="font-bold font-pixel text-sm mt-1">{item.title}</h3>
                                                    <p className="text-[10px] opacity-60 line-clamp-2 mt-1">{item.description}</p>
                                                </div>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <img src={db.getUserAvatar(item.owner)} className="w-5 h-5 rounded-full border border-white/20" />
                                                    <span className="text-[10px] font-bold">@{item.owner}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                ))
                            }
                        </div>
                    )
            ) : (
                // WISHLIST RENDER
                filteredWishlist.length === 0 ? (
                        <div className="text-center py-20 opacity-30 font-mono text-xs border-2 border-dashed border-white/10 rounded-3xl">
                            ВИШЛИСТ ПУСТ
                        </div>
                    ) : (
                        <div className={`grid gap-4 ${feedViewMode === 'GRID' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4' : 'grid-cols-1'}`}>
                            {filteredWishlist.map(item => (
                                    <WishlistCard 
                                        key={item.id}
                                        item={item}
                                        theme={theme}
                                        onClick={onWishlistClick}
                                        onUserClick={onUserClick}
                                    />
                                ))
                            }
                        </div>
                    )
            )}
        </div>
    </div>
  );
};

export default FeedView;
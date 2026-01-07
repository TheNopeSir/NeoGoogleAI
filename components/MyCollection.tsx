
import React, { useState, useMemo } from 'react';
import { Package, FolderPlus, ArrowLeft, Archive, Heart, Zap, RefreshCw, ArrowRight } from 'lucide-react';
import { UserProfile, Exhibit, Collection, WishlistItem } from '../types';
import ExhibitCard from './ExhibitCard';
import CollectionCard from './CollectionCard';
import TradeOfferModal from './TradeOfferModal';
import { getFullDatabase, getUserAvatar } from '../services/storageService';

interface MyCollectionProps {
    theme: 'dark' | 'light' | 'xp' | 'winamp';
    user: UserProfile;
    exhibits: Exhibit[]; // Owned items
    allExhibits?: Exhibit[]; // All items for favorites filtering
    collections: Collection[];
    wishlist?: WishlistItem[]; // Global wishlist
    onBack: () => void;
    onExhibitClick: (item: Exhibit) => void;
    onCollectionClick: (col: Collection) => void;
    onLike: (id: string, e?: React.MouseEvent) => void;
}

const MyCollection: React.FC<MyCollectionProps> = ({ 
    theme, 
    user, 
    exhibits,
    allExhibits = [], 
    collections, 
    wishlist = [],
    onBack, 
    onExhibitClick, 
    onCollectionClick, 
    onLike 
}) => {
    const [activeTab, setActiveTab] = useState<'MY_ITEMS' | 'COLLECTIONS' | 'MATCHES' | 'DRAFTS' | 'FAVORITES'>('MY_ITEMS');
    const [tradeModalTarget, setTradeModalTarget] = useState<{ item: Exhibit, user: UserProfile, isWishlist: boolean } | null>(null);

    // Separate drafts and published items from owned list
    const drafts = exhibits.filter(e => e.isDraft);
    const published = exhibits.filter(e => !e.isDraft);
    const favorites = allExhibits.filter(e => e.likedBy?.includes(user.username));

    const isWinamp = theme === 'winamp';

    // --- MATCHER ALGORITHM ---
    const matches = useMemo(() => {
        // 1. THEY WANT WHAT YOU HAVE (Incoming Demand)
        // Find wishlist items from OTHERS that match MY published exhibits
        const incoming = wishlist
            .filter(w => w.owner !== user.username) // Exclude my own wishes
            .map(w => {
                // Simple fuzzy match: Title containment + Category match
                const match = published.find(ex => 
                    ex.category === w.category && 
                    (ex.title.toLowerCase().includes(w.title.toLowerCase()) || w.title.toLowerCase().includes(ex.title.toLowerCase()))
                );
                return match ? { wish: w, exhibit: match, type: 'INCOMING' } : null;
            })
            .filter(Boolean) as { wish: WishlistItem, exhibit: Exhibit, type: 'INCOMING' }[];

        // 2. YOU WANT WHAT THEY HAVE (Outgoing Opportunities)
        // Find exhibits from OTHERS that match MY wishlist
        const myWishes = wishlist.filter(w => w.owner === user.username);
        const outgoing = myWishes
            .map(w => {
                const match = allExhibits.find(ex => 
                    ex.owner !== user.username && // Exclude my items
                    !ex.isDraft &&
                    (ex.tradeStatus === 'FOR_TRADE' || ex.tradeStatus === 'FOR_SALE') && // Only tradable items
                    ex.category === w.category &&
                    (ex.title.toLowerCase().includes(w.title.toLowerCase()) || w.title.toLowerCase().includes(ex.title.toLowerCase()))
                );
                return match ? { wish: w, exhibit: match, type: 'OUTGOING' } : null;
            })
            .filter(Boolean) as { wish: WishlistItem, exhibit: Exhibit, type: 'OUTGOING' }[];

        return { incoming, outgoing };
    }, [wishlist, published, allExhibits, user.username]);

    const renderTabButton = (tab: typeof activeTab, label: string, icon?: any) => (
        <button 
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 flex items-center gap-2 text-[10px] font-bold font-pixel uppercase transition-all whitespace-nowrap ${
                activeTab === tab 
                ? (isWinamp ? 'text-wa-gold border-b-2 border-wa-gold bg-[#292929]' : 'text-green-500 border-b-2 border-green-500') 
                : 'opacity-50 hover:opacity-100 border-b-2 border-transparent'
            }`}
        >
            {icon && React.createElement(icon, { size: 14 })}
            {isWinamp ? `[ ${label} ]` : label}
        </button>
    );

    const handleStartTrade = (exhibit: Exhibit, partnerUsername: string, isWishlistMode: boolean) => {
        const partner = getFullDatabase().users.find(u => u.username === partnerUsername) || { username: partnerUsername } as UserProfile;
        setTradeModalTarget({ item: exhibit, user: partner, isWishlist: isWishlistMode });
    };

    return (
        <div className={`max-w-4xl mx-auto animate-in fade-in pb-32 ${isWinamp ? 'font-mono text-gray-300' : ''}`}>
            
            {tradeModalTarget && (
                <TradeOfferModal 
                    recipient={tradeModalTarget.user}
                    currentUser={user}
                    userInventory={exhibits}
                    targetItem={tradeModalTarget.isWishlist ? undefined : tradeModalTarget.item}
                    onClose={() => setTradeModalTarget(null)}
                    isWishlist={tradeModalTarget.isWishlist}
                    // For outgoing, we want their item (targetItem). For incoming (wishlist fulfillment), we give our item.
                />
            )}

            <div className="flex items-center justify-between mb-6">
                <button onClick={onBack} className={`flex items-center gap-2 hover:underline opacity-70 font-pixel text-xs ${isWinamp ? 'text-[#00ff00]' : ''}`}>
                    <ArrowLeft size={16} /> НАЗАД
                </button>
                <div className={`font-pixel text-lg flex items-center gap-2 ${isWinamp ? 'text-[#00ff00]' : ''}`}>
                    <Package size={24} />
                    МОЯ ПОЛКА
                </div>
            </div>

            {/* Navigation Tabs */}
            <div 
                className={`flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide ${isWinamp ? 'border-b border-[#505050]' : 'border-b border-white/10'}`}
            >
                {renderTabButton('MY_ITEMS', 'ПРЕДМЕТЫ')}
                {renderTabButton('MATCHES', `СОВПАДЕНИЯ (${matches.incoming.length + matches.outgoing.length})`, Zap)}
                {renderTabButton('COLLECTIONS', 'АЛЬБОМЫ')}
                {renderTabButton('FAVORITES', 'ИЗБРАННОЕ')}
                {renderTabButton('DRAFTS', 'ЧЕРНОВИКИ')}
            </div>

            {/* MATCHES SECTION */}
            {activeTab === 'MATCHES' && (
                <div className="animate-in slide-in-from-right-4 space-y-8">
                    {/* INCOMING DEMAND */}
                    <div>
                        <h3 className="font-pixel text-xs mb-4 text-green-500 uppercase tracking-widest flex items-center gap-2">
                            <Zap size={14}/> ВАШИ ПРЕДМЕТЫ ИЩУТ ({matches.incoming.length})
                        </h3>
                        {matches.incoming.length === 0 ? (
                            <div className="text-xs opacity-40 font-mono italic">Пока никто не ищет ваши предметы.</div>
                        ) : (
                            <div className="grid gap-4">
                                {matches.incoming.map((m, idx) => (
                                    <div key={idx} className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${isWinamp ? 'bg-[#191919] border-[#505050]' : 'bg-green-500/5 border-green-500/20'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded bg-black/20 overflow-hidden shrink-0 border border-white/10">
                                                <img src={m.exhibit.imageUrls[0]} className="w-full h-full object-cover"/>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-pixel opacity-70">У ВАС ЕСТЬ:</div>
                                                <div className="font-bold text-sm">{m.exhibit.title}</div>
                                                <div className="text-xs flex items-center gap-2 mt-1">
                                                    <ArrowRight size={12} className="text-green-500"/> 
                                                    <img src={getUserAvatar(m.wish.owner)} className="w-4 h-4 rounded-full"/>
                                                    <span className="font-bold text-green-500">@{m.wish.owner}</span> хочет это
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleStartTrade(m.exhibit, m.wish.owner, true)}
                                            className="px-4 py-2 bg-green-500 text-black font-bold font-pixel text-[10px] rounded uppercase hover:bg-green-400"
                                        >
                                            ПРЕДЛОЖИТЬ
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* OUTGOING OPPORTUNITIES */}
                    <div>
                        <h3 className="font-pixel text-xs mb-4 text-blue-400 uppercase tracking-widest flex items-center gap-2">
                            <RefreshCw size={14}/> НАЙДЕНО ИЗ ВИШЛИСТА ({matches.outgoing.length})
                        </h3>
                        {matches.outgoing.length === 0 ? (
                            <div className="text-xs opacity-40 font-mono italic">В продаже нет предметов из вашего вишлиста.</div>
                        ) : (
                            <div className="grid gap-4">
                                {matches.outgoing.map((m, idx) => (
                                    <div key={idx} className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${isWinamp ? 'bg-[#191919] border-[#505050]' : 'bg-blue-500/5 border-blue-500/20'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded bg-black/20 overflow-hidden shrink-0 border border-white/10 relative">
                                                <img src={m.exhibit.imageUrls[0]} className="w-full h-full object-cover"/>
                                                {m.exhibit.tradeStatus === 'FOR_SALE' && <div className="absolute bottom-0 right-0 bg-blue-500 text-white text-[8px] px-1 font-bold">$$$</div>}
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-pixel opacity-70">ВЫ ИСКАЛИ:</div>
                                                <div className="font-bold text-sm">{m.wish.title}</div>
                                                <div className="text-xs flex items-center gap-2 mt-1">
                                                    <div className="flex items-center gap-1 opacity-70">
                                                        Найдено у <img src={getUserAvatar(m.exhibit.owner)} className="w-4 h-4 rounded-full"/> 
                                                        <span className="font-bold">@{m.exhibit.owner}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleStartTrade(m.exhibit, m.exhibit.owner, false)}
                                            className="px-4 py-2 bg-blue-500 text-white font-bold font-pixel text-[10px] rounded uppercase hover:bg-blue-400"
                                        >
                                            {m.exhibit.tradeStatus === 'FOR_SALE' ? 'КУПИТЬ' : 'ОБМЕНЯТЬ'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* DRAFTS SECTION */}
            {activeTab === 'DRAFTS' && (
                <div className="animate-in slide-in-from-right-4">
                    <h3 className="font-pixel text-xs mb-4 opacity-70 flex items-center gap-2 uppercase tracking-widest">
                        <Archive size={14}/> Черновики ({drafts.length})
                    </h3>
                    {drafts.length === 0 ? (
                        <div className="text-center py-10 opacity-30 font-pixel text-xs">Нет черновиков</div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {drafts.map(item => (
                                <div key={item.id} className="relative group opacity-80 hover:opacity-100">
                                    <div className="absolute top-2 right-2 z-10 bg-yellow-500 text-black text-[8px] font-bold px-1.5 py-0.5 rounded font-pixel">DRAFT</div>
                                    <ExhibitCard 
                                        item={item} 
                                        theme={theme}
                                        onClick={onExhibitClick}
                                        isLiked={false}
                                        onLike={(e) => onLike(item.id, e)}
                                        onAuthorClick={() => {}}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ARTIFACTS SECTION */}
            {activeTab === 'MY_ITEMS' && (
                <div className="animate-in slide-in-from-right-4">
                    <h3 className="font-pixel text-xs mb-4 flex items-center gap-2 uppercase tracking-widest">
                        <Package size={16} /> Ваши артефакты ({published.length})
                    </h3>
                    {published.length === 0 ? (
                        <div className={`p-12 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center opacity-50 ${isWinamp ? 'border-[#505050]' : theme === 'dark' ? 'border-dark-dim' : 'border-light-dim'}`}>
                            <p className="font-mono text-sm uppercase">Ваша полка пуста</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                            {published.map(item => (
                                <ExhibitCard 
                                    key={item.id} 
                                    item={item} 
                                    theme={theme}
                                    onClick={onExhibitClick}
                                    isLiked={item.likedBy?.includes(user.username) || false}
                                    onLike={(e) => onLike(item.id, e)}
                                    onAuthorClick={() => {}}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* FAVORITES SECTION */}
            {activeTab === 'FAVORITES' && (
                <div className="animate-in slide-in-from-right-4">
                    <h3 className="font-pixel text-xs mb-4 flex items-center gap-2 uppercase tracking-widest">
                        <Heart size={16} className="text-red-500" /> Избранные артефакты ({favorites.length})
                    </h3>
                    {favorites.length === 0 ? (
                        <div className={`p-12 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center opacity-50 ${isWinamp ? 'border-[#505050]' : theme === 'dark' ? 'border-dark-dim' : 'border-light-dim'}`}>
                            <p className="font-mono text-sm uppercase">Вы еще ничего не лайкнули</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                            {favorites.map(item => (
                                <ExhibitCard 
                                    key={item.id} 
                                    item={item} 
                                    theme={theme}
                                    onClick={onExhibitClick}
                                    isLiked={true}
                                    onLike={(e) => onLike(item.id, e)}
                                    onAuthorClick={() => {}}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* COLLECTIONS SECTION */}
            {activeTab === 'COLLECTIONS' && (
                <div className="animate-in slide-in-from-right-4">
                    <h3 className="font-pixel text-xs mb-4 flex items-center gap-2 uppercase tracking-widest">
                        <FolderPlus size={16} /> Коллекции ({collections.length})
                    </h3>
                    {collections.length === 0 ? (
                        <div className={`p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center opacity-50 ${isWinamp ? 'border-[#505050]' : theme === 'dark' ? 'border-dark-dim' : 'border-light-dim'}`}>
                            <p className="font-mono text-xs uppercase">Нет созданных коллекций</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {collections.map(c => (
                                <CollectionCard 
                                    key={c.id} 
                                    col={c} 
                                    theme={theme} 
                                    onClick={onCollectionClick} 
                                    onShare={() => {}} 
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MyCollection;


import React, { useState } from 'react';
import { Package, FolderPlus, ArrowLeft, Archive, Heart } from 'lucide-react';
import { UserProfile, Exhibit, Collection } from '../types';
import ExhibitCard from './ExhibitCard';
import CollectionCard from './CollectionCard';

interface MyCollectionProps {
    theme: 'dark' | 'light' | 'xp' | 'winamp';
    user: UserProfile;
    exhibits: Exhibit[]; // Owned items
    allExhibits?: Exhibit[]; // All items for favorites filtering
    collections: Collection[];
    onBack: () => void;
    onExhibitClick: (item: Exhibit) => void;
    onCollectionClick: (col: Collection) => void;
    onLike: (id: string, e?: React.MouseEvent) => void;
}

const MyCollection: React.FC<MyCollectionProps> = ({ 
    theme, 
    user, 
    exhibits,
    allExhibits = [], // Default to empty if not provided 
    collections, 
    onBack, 
    onExhibitClick, 
    onCollectionClick, 
    onLike 
}) => {
    const [activeTab, setActiveTab] = useState<'MY_ITEMS' | 'COLLECTIONS' | 'DRAFTS' | 'FAVORITES'>('MY_ITEMS');

    // Separate drafts and published items from owned list
    const drafts = exhibits.filter(e => e.isDraft);
    const published = exhibits.filter(e => !e.isDraft);
    
    // Filter favorites: items where user's name is in likedBy
    const favorites = allExhibits.filter(e => e.likedBy?.includes(user.username));

    const isWinamp = theme === 'winamp';

    const renderTabButton = (tab: typeof activeTab, label: string) => (
        <button 
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 text-[10px] font-bold font-pixel uppercase transition-all ${
                activeTab === tab 
                ? (isWinamp ? 'text-wa-gold border-b-2 border-wa-gold' : 'text-green-500 border-b-2 border-green-500') 
                : 'opacity-50 hover:opacity-100 border-b-2 border-transparent'
            }`}
        >
            {isWinamp ? `[ ${label} ]` : label}
        </button>
    );

    return (
        <div className={`max-w-4xl mx-auto animate-in fade-in pb-32 ${isWinamp ? 'font-mono text-gray-300' : ''}`}>
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
                className={`flex gap-2 overflow-x-auto pb-2 mb-8 ${isWinamp ? 'border-b border-[#505050]' : 'border-b border-white/10'}`}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
            >
                {renderTabButton('MY_ITEMS', 'ПРЕДМЕТЫ')}
                {renderTabButton('COLLECTIONS', 'АЛЬБОМЫ')}
                {renderTabButton('FAVORITES', 'ИЗБРАННОЕ')}
                {renderTabButton('DRAFTS', 'ЧЕРНОВИКИ')}
            </div>

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


import React, { useState, useMemo } from 'react';
import { Search, Grid, FolderPlus, Users, ArrowLeft } from 'lucide-react';
import { Exhibit, Collection, UserProfile } from '../types';
import ExhibitCard from './ExhibitCard';
import CollectionCard from './CollectionCard';
import { getUserAvatar } from '../services/storageService';

interface SearchViewProps {
    theme: 'dark' | 'light' | 'xp' | 'winamp';
    exhibits: Exhibit[];
    collections: Collection[];
    users: UserProfile[];
    onBack: () => void;
    onExhibitClick: (item: Exhibit) => void;
    onCollectionClick: (col: Collection) => void;
    onUserClick: (username: string) => void;
    onLike: (id: string, e?: React.MouseEvent) => void;
    currentUser: UserProfile | null;
}

const SearchView: React.FC<SearchViewProps> = ({ 
    theme, exhibits, collections, users, onBack, onExhibitClick, onCollectionClick, onUserClick, onLike, currentUser 
}) => {
    const [query, setQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'ARTIFACTS' | 'COLLECTIONS' | 'USERS'>('ARTIFACTS');

    const filteredArtifacts = useMemo(() => {
        if (!query) return [];
        const lower = query.toLowerCase();
        return exhibits.filter(e => {
            if (e.isDraft) return false;
            const inTitle = e.title.toLowerCase().includes(lower);
            const inDesc = e.description.toLowerCase().includes(lower);
            const inCat = e.category.toLowerCase().includes(lower);
            const inOwner = e.owner.toLowerCase().includes(lower);
            const inSpecs = e.specs ? Object.values(e.specs).some((val) => (val as string).toLowerCase().includes(lower)) : false;
            return inTitle || inDesc || inCat || inOwner || inSpecs;
        });
    }, [query, exhibits]);

    const filteredCollections = useMemo(() => {
        if (!query) return [];
        const lower = query.toLowerCase();
        return collections.filter(c => c.title.toLowerCase().includes(lower) || c.description.toLowerCase().includes(lower) || c.owner.toLowerCase().includes(lower));
    }, [query, collections]);

    const filteredUsers = useMemo(() => {
        if (!query) return [];
        const lower = query.toLowerCase();
        return users.filter(u => u.username.toLowerCase().includes(lower) || u.tagline.toLowerCase().includes(lower));
    }, [query, users]);

    const isWinamp = theme === 'winamp';

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in pb-32">
            <div className={`flex items-center gap-4 mb-6 sticky top-20 z-30 pt-4 pb-4 border-b backdrop-blur-md ${isWinamp ? 'bg-[#282828]/90 border-[#505050]' : 'bg-transparent border-white/10'}`}>
                <button onClick={onBack} className={`p-2 rounded-full transition-colors ${isWinamp ? 'hover:bg-[#505050]' : 'hover:bg-white/10'}`}>
                    <ArrowLeft size={20} className={isWinamp ? 'text-[#00ff00]' : ''}/>
                </button>
                <div className={`flex-1 flex items-center px-4 py-3 rounded-2xl border ${isWinamp ? 'bg-black border-[#505050] text-[#00ff00]' : theme === 'dark' ? 'bg-black/40 border-white/20' : 'bg-white border-black/10'}`}>
                    <Search size={18} className="opacity-50 mr-3" />
                    <input 
                        autoFocus
                        type="text" 
                        value={query} 
                        onChange={(e) => setQuery(e.target.value)} 
                        placeholder="ПОИСК ПО БАЗЕ ДАННЫХ..." 
                        className={`bg-transparent border-none outline-none text-sm font-mono w-full ${isWinamp ? 'text-[#00ff00] placeholder-[#00ff00]/50' : ''}`} 
                    />
                </div>
            </div>

            <div className={`flex mb-8 border-b ${isWinamp ? 'border-[#505050]' : 'border-gray-500/30'}`}>
                <button onClick={() => setActiveTab('ARTIFACTS')} className={`flex-1 pb-3 text-xs font-pixel flex justify-center items-center gap-2 ${activeTab === 'ARTIFACTS' ? (isWinamp ? 'text-[#00ff00] border-b-2 border-[#00ff00]' : 'text-green-500 border-b-2 border-green-500') : 'opacity-50'}`}>
                    <Grid size={14} /> АРТЕФАКТЫ
                    {query && <span className="bg-white/10 px-1.5 rounded-full text-[9px]">{filteredArtifacts.length}</span>}
                </button>
                <button onClick={() => setActiveTab('COLLECTIONS')} className={`flex-1 pb-3 text-xs font-pixel flex justify-center items-center gap-2 ${activeTab === 'COLLECTIONS' ? (isWinamp ? 'text-[#00ff00] border-b-2 border-[#00ff00]' : 'text-green-500 border-b-2 border-green-500') : 'opacity-50'}`}>
                    <FolderPlus size={14} /> КОЛЛЕКЦИИ
                    {query && <span className="bg-white/10 px-1.5 rounded-full text-[9px]">{filteredCollections.length}</span>}
                </button>
                <button onClick={() => setActiveTab('USERS')} className={`flex-1 pb-3 text-xs font-pixel flex justify-center items-center gap-2 ${activeTab === 'USERS' ? (isWinamp ? 'text-[#00ff00] border-b-2 border-[#00ff00]' : 'text-green-500 border-b-2 border-green-500') : 'opacity-50'}`}>
                    <Users size={14} /> ЛЮДИ
                    {query && <span className="bg-white/10 px-1.5 rounded-full text-[9px]">{filteredUsers.length}</span>}
                </button>
            </div>

            <div className="space-y-6">
                {!query && (
                    <div className="text-center py-20 opacity-30 font-pixel text-xs uppercase tracking-widest">
                        ВВЕДИТЕ ЗАПРОС ДЛЯ ПОИСКА
                    </div>
                )}

                {query && activeTab === 'ARTIFACTS' && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {filteredArtifacts.length === 0 ? <div className="col-span-full text-center opacity-50 py-10 font-mono text-xs">Ничего не найдено</div> : 
                        filteredArtifacts.map(item => (
                            <ExhibitCard 
                                key={item.id} 
                                item={item} 
                                theme={theme} 
                                onClick={onExhibitClick} 
                                isLiked={item.likedBy?.includes(currentUser?.username || '')} 
                                onLike={(e) => onLike(item.id, e)} 
                                onAuthorClick={onUserClick} 
                            />
                        ))}
                    </div>
                )}

                {query && activeTab === 'COLLECTIONS' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredCollections.length === 0 ? <div className="col-span-full text-center opacity-50 py-10 font-mono text-xs">Ничего не найдено</div> :
                        filteredCollections.map(col => (
                            <CollectionCard key={col.id} col={col} theme={theme} onClick={onCollectionClick} onShare={() => {}} />
                        ))}
                    </div>
                )}

                {query && activeTab === 'USERS' && (
                    <div className="space-y-4">
                        {filteredUsers.length === 0 ? <div className="text-center opacity-50 py-10 font-mono text-xs">Ничего не найдено</div> :
                        filteredUsers.map(u => (
                            <div 
                                key={u.username} 
                                onClick={() => onUserClick(u.username)}
                                className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer hover:bg-white/5 ${isWinamp ? 'border-[#505050] bg-[#191919]' : theme === 'dark' ? 'border-white/10 bg-dark-surface' : 'border-black/10 bg-white'}`}
                            >
                                <div className="w-12 h-12 rounded-full overflow-hidden border border-white/20">
                                    <img src={u.avatarUrl || getUserAvatar(u.username)} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <div className={`font-bold font-pixel text-sm ${isWinamp ? 'text-[#00ff00]' : ''}`}>@{u.username}</div>
                                    <div className={`text-[10px] font-mono opacity-60 ${isWinamp ? 'text-[#00ff00]' : ''}`}>{u.tagline}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchView;

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit2, LogOut, MessageSquare, Send, Trophy, Reply, Trash2, Check, X, Wand2, Eye, EyeOff, Camera, Palette, Settings, Search, Terminal, Sun, Package, Archive, FolderPlus, BookOpen, Heart, Share2, ExternalLink, Link as LinkIcon } from 'lucide-react';
import { UserProfile, Exhibit, Collection, GuestbookEntry, UserStatus, AppSettings, WishlistItem } from '../types';
import { STATUS_OPTIONS } from '../constants';
import * as db from '../services/storageService';
import { getUserAvatar } from '../services/storageService';
import WishlistCard from './WishlistCard';
import ExhibitCard from './ExhibitCard';
import CollectionCard from './CollectionCard';
import SEO from './SEO';

interface UserProfileViewProps {
    user: UserProfile;
    viewedProfileUsername: string;
    exhibits: Exhibit[];
    collections: Collection[];
    guestbook: GuestbookEntry[];
    theme: 'dark' | 'light' | 'xp' | 'winamp';
    onBack: () => void;
    onLogout: () => void;
    onFollow: (username: string) => void;
    onChat: (username: string) => void;
    onExhibitClick: (item: Exhibit) => void;
    onLike: (id: string, e?: React.MouseEvent) => void;
    onAuthorClick: (author: string) => void;
    onCollectionClick: (col: Collection) => void;
    onShareCollection: (col: Collection) => void;
    onViewHallOfFame: () => void;
    onGuestbookPost: (text: string) => void;
    refreshData: () => void;
    isEditingProfile: boolean;
    setIsEditingProfile: (v: boolean) => void;
    editTagline: string;
    setEditTagline: (v: string) => void;
    editBio: string;
    setEditBio: (v: string) => void;
    editStatus: UserStatus;
    setEditStatus: (v: UserStatus) => void;
    editTelegram: string;
    setEditTelegram: (v: string) => void;
    editPassword: string;
    setEditPassword: (v: string) => void;
    onSaveProfile: () => void;
    onProfileImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onProfileCoverUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    guestbookInput: string;
    setGuestbookInput: (v: string) => void;
    guestbookInputRef: React.RefObject<HTMLInputElement>;
    profileTab: 'ARTIFACTS' | 'COLLECTIONS';
    setProfileTab: (v: 'ARTIFACTS' | 'COLLECTIONS') => void;
    onOpenSocialList: (username: string, type: 'followers' | 'following') => void;
    onThemeChange?: (theme: 'dark' | 'light' | 'xp' | 'winamp') => void;
    onWishlistClick: (item: WishlistItem) => void;
}

// Winamp Helper wrapper moved outside
const WinampWindow = ({ title, children, className = '' }: { title: string, children?: React.ReactNode, className?: string }) => (
    <div className={`mb-6 bg-[#292929] border-t-2 border-l-2 border-r-2 border-b-2 border-t-[#505050] border-l-[#505050] border-r-[#101010] border-b-[#101010] ${className}`}>
        <div className="h-4 bg-gradient-to-r from-wa-blue-light to-wa-blue-dark flex items-center justify-between px-1 cursor-default select-none mb-1">
            <span className="text-white font-winamp text-[10px] tracking-widest uppercase">{title}</span>
            <div className="w-2 h-2 bg-[#DCDCDC] border border-t-white border-l-white border-r-[#505050] border-b-[#505050]"></div>
        </div>
        <div className="p-2">
            {children}
        </div>
    </div>
);

const UserProfileView: React.FC<UserProfileViewProps> = ({ 
    user, viewedProfileUsername, exhibits, collections, guestbook, theme, 
    onBack, onLogout, onFollow, onChat, onExhibitClick, onLike, onAuthorClick, 
    onCollectionClick, onShareCollection, onViewHallOfFame, onGuestbookPost, 
    isEditingProfile, setIsEditingProfile, editTagline, setEditTagline, editBio, setEditBio, editStatus, setEditStatus, editTelegram, setEditTelegram, 
    editPassword, setEditPassword,
    onSaveProfile, onProfileImageUpload, onProfileCoverUpload, guestbookInput, setGuestbookInput, guestbookInputRef, profileTab, setProfileTab, refreshData,
    onOpenSocialList, onThemeChange, onWishlistClick
}) => {
    const profileUser = db.getFullDatabase().users.find(u => u.username === viewedProfileUsername) || { 
        username: viewedProfileUsername, 
        email: 'ghost@matrix.net', 
        tagline: 'Цифровой призрак', 
        avatarUrl: getUserAvatar(viewedProfileUsername), 
        joinedDate: 'Unknown', 
        following: [], 
        followers: [],
        achievements: [], 
        telegram: '',
        settings: {}
    } as UserProfile;

    const isCurrentUser = user?.username === viewedProfileUsername;
    const isSubscribed = user?.following?.includes(viewedProfileUsername) || false;
    const isWinamp = theme === 'winamp';

    // Parse URL params for internal tabs
    const getInitialSection = () => {
        const params = new URLSearchParams(window.location.search);
        const section = params.get('section');
        if (section === 'favorites') return 'FAVORITES';
        if (section === 'logs') return 'LOGS';
        if (section === 'wishlist') return 'WISHLIST';
        if (section === 'config' && isCurrentUser) return 'CONFIG';
        return 'SHELF';
    };

    const getInitialShelfTab = () => {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab === 'collections') return 'COLLECTIONS';
        return 'ARTIFACTS';
    };

    const [activeSection, setActiveSection] = useState<'SHELF' | 'FAVORITES' | 'LOGS' | 'CONFIG' | 'WISHLIST'>(getInitialSection);
    const [localProfileTab, setLocalProfileTab] = useState<'ARTIFACTS' | 'COLLECTIONS'>(getInitialShelfTab);

    // Sync URL with tabs
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        
        if (activeSection === 'SHELF') params.delete('section');
        else params.set('section', activeSection.toLowerCase());

        if (activeSection === 'SHELF') {
            if (localProfileTab === 'ARTIFACTS') params.delete('tab');
            else params.set('tab', 'collections');
        } else {
            params.delete('tab');
        }

        const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
        window.history.replaceState({ ...window.history.state }, '', newUrl);
    }, [activeSection, localProfileTab]);

    const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
    const [editEntryText, setEditEntryText] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [localSettings, setLocalSettings] = useState<AppSettings>(user?.settings || { theme: 'dark' });

    const userExhibits = exhibits.filter(e => e.owner === viewedProfileUsername);
    const userCollections = collections.filter(c => c.owner === viewedProfileUsername);
    // Explicitly filter wishlist items for the viewed user
    const wishlistItems = db.getFullDatabase().wishlist.filter(w => w.owner === viewedProfileUsername);
    
    // Filter Favorites (Items liked by the viewed profile user)
    const favoritedExhibits = exhibits.filter(e => e.likedBy?.includes(viewedProfileUsername));

    // Filter Guestbook entries for this profile - Case Insensitive to prevent missing entries
    const profileGuestbook = guestbook.filter(g => g.targetUser.toLowerCase() === viewedProfileUsername.toLowerCase()).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const drafts = isCurrentUser ? userExhibits.filter(e => e.isDraft) : [];
    const publishedExhibits = userExhibits.filter(e => !e.isDraft);

    const handleEditEntry = (entry: GuestbookEntry) => { setEditingEntryId(entry.id); setEditEntryText(entry.text); };
    const handleSaveEntry = async (entry: GuestbookEntry) => { if (!editEntryText.trim()) return; const updated = { ...entry, text: editEntryText }; await db.updateGuestbookEntry(updated); setEditingEntryId(null); refreshData(); };
    const handleDeleteEntry = async (id: string) => { if (confirm('Удалить запись?')) { await db.deleteGuestbookEntry(id); refreshData(); } };
    const handleDeleteWishlist = async (id: string) => { if (confirm('Удалить из вишлиста?')) { await db.deleteWishlistItem(id); refreshData(); } };
    const generateSecurePassword = () => { const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*"; let pass = ""; for(let i=0; i<16; i++) { pass += chars.charAt(Math.floor(Math.random() * chars.length)); } setEditPassword(pass); setShowPassword(true); };
    const updateSetting = async (key: keyof AppSettings, value: any) => { if (!isCurrentUser) return; const newSettings = { ...localSettings, [key]: value }; setLocalSettings(newSettings); if (key === 'theme' && onThemeChange) onThemeChange(value); const updatedUser = { ...user, settings: newSettings }; await db.updateUserProfile(updatedUser); };

    const handleGuestbookSubmit = () => {
        if (!guestbookInput.trim()) return;
        onGuestbookPost(guestbookInput);
        setGuestbookInput('');
    };

    const handleShareWishlist = () => {
        const url = `${window.location.origin}/u/${viewedProfileUsername}/wishlist`;
        navigator.clipboard.writeText(url);
        alert('Ссылка на вишлист скопирована в буфер обмена!');
    };

    return (
        <div className={`max-w-4xl mx-auto space-y-6 animate-in slide-in-from-right-8 fade-in duration-500 pb-32 ${isWinamp ? 'font-winamp text-wa-green' : ''}`}>
            <SEO title={`@${profileUser.username} | Профиль NeoArchive`} description={profileUser.tagline || `Посмотрите коллекцию пользователя @${profileUser.username}`} image={profileUser.avatarUrl} path={`/profile/${profileUser.username}`} type="profile" />

            {!isWinamp && <button onClick={onBack} className="flex items-center gap-2 hover:underline opacity-70 font-pixel text-xs"><ArrowLeft size={16} /> НАЗАД</button>}
            
            <div className={isWinamp ? '' : `rounded-3xl border overflow-hidden relative ${theme === 'dark' ? 'bg-dark-surface border-dark-dim' : theme === 'xp' ? 'bg-white border-[#245DDA] shadow-lg' : 'bg-white border-light-dim'}`}>
                {/* PROFILE HEADER SECTION */}
                {isWinamp ? (
                    <WinampWindow title={`USER: ${profileUser.username}`}>
                        <div className="flex gap-4 items-start">
                            <div className="w-20 h-20 border-2 border-t-[#101010] border-l-[#101010] border-r-[#505050] border-b-[#505050] p-1 bg-black">
                                <img src={profileUser.avatarUrl} className="w-full h-full object-cover grayscale opacity-80 hover:opacity-100" />
                            </div>
                            <div className="flex-1 space-y-1">
                                <div className="text-[14px] text-wa-gold">{profileUser.username}</div>
                                <div className="text-[12px] opacity-80">{profileUser.tagline}</div>
                                {profileUser.telegram && (
                                    <a href={`https://t.me/${profileUser.telegram}`} target="_blank" rel="noopener noreferrer" className="text-[12px] text-blue-300 hover:text-blue-200 hover:underline block">
                                        TG: @{profileUser.telegram}
                                    </a>
                                )}
                                <div className="text-[12px] flex gap-2 mt-2">
                                    <span onClick={() => onOpenSocialList(profileUser.username, 'followers')} className="cursor-pointer hover:text-white">Подписчики: {profileUser.followers?.length || 0}</span>
                                    <span onClick={() => onOpenSocialList(profileUser.username, 'following')} className="cursor-pointer hover:text-white">Подписки: {profileUser.following?.length || 0}</span>
                                </div>
                                {!isCurrentUser && (
                                    <div className="flex gap-2 mt-2">
                                        <button onClick={() => onFollow(profileUser.username)} className="px-2 border border-[#505050] bg-[#292929] text-[10px] hover:text-white">{isSubscribed ? 'ОТПИСАТЬСЯ' : 'ПОДПИСАТЬСЯ'}</button>
                                        <button onClick={() => onChat(profileUser.username)} className="px-2 border border-[#505050] bg-[#292929] text-[10px] hover:text-white">ЛС</button>
                                    </div>
                                )}
                                {isCurrentUser && (
                                    <button onClick={onLogout} className="px-2 border border-[#505050] bg-[#292929] text-[10px] hover:text-red-500">ВЫЙТИ</button>
                                )}
                            </div>
                        </div>
                    </WinampWindow>
                ) : (
                    // Standard Profile Header
                    <>
                        <div className="h-40 md:h-52 bg-gray-800 relative">
                            {profileUser.coverUrl ? <img src={profileUser.coverUrl} className="w-full h-full object-cover" alt="Cover" /> : <div className={`w-full h-full ${theme === 'dark' ? 'bg-gradient-to-r from-green-900/20 to-black' : 'bg-gradient-to-r from-gray-100 to-gray-300'}`}></div>}
                            {theme === 'xp' && <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-r from-[#0058EE] to-[#3F8CF3] flex items-center px-4"><span className="text-white font-bold text-sm drop-shadow-md italic">Свойства пользователя</span></div>}
                            {isEditingProfile && isCurrentUser && (
                                <label className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-xl cursor-pointer hover:bg-black/70 border border-white/20 flex items-center gap-2 backdrop-blur-sm"><Camera size={16} /> <span className="text-[10px] font-pixel">ОБЛОЖКА</span><input type="file" accept="image/*" className="hidden" onChange={onProfileCoverUpload} /></label>
                            )}
                        </div>
                        <div className="px-6 pb-6 relative">
                            <div className="flex flex-col md:flex-row items-start md:items-end -mt-16 md:-mt-12 gap-6 mb-4">
                                <div className="relative group">
                                    <div className={`w-32 h-32 rounded-3xl overflow-hidden border-4 bg-black ${theme === 'xp' ? 'border-white shadow-lg' : 'border-dark-surface'}`}>
                                        <img src={profileUser.avatarUrl} alt={profileUser.username} className="w-full h-full object-cover"/>
                                    </div>
                                    {isEditingProfile && isCurrentUser && (
                                        <label className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"><Camera size={24} className="text-white" /><input type="file" accept="image/*" className="hidden" onChange={onProfileImageUpload} /></label>
                                    )}
                                </div>
                                <div className="flex-1 pt-2 md:pt-0">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <h2 className={`text-3xl font-pixel font-bold flex items-center gap-2 ${theme === 'xp' ? 'text-black' : ''}`}>@{profileUser.username}{profileUser.status && (<div className={`w-3 h-3 rounded-full ${STATUS_OPTIONS[profileUser.status].color.replace('text-', 'bg-')}`} title={STATUS_OPTIONS[profileUser.status].label} />)}</h2>
                                            <div className="flex flex-col gap-1 mt-1">
                                                <p className="text-xs font-mono opacity-60">Регистрация: {profileUser.joinedDate}</p>
                                                {profileUser.telegram && (
                                                    <a 
                                                        href={`https://t.me/${profileUser.telegram}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className={`text-xs font-mono flex items-center gap-1 hover:underline ${theme === 'xp' ? 'text-blue-600' : 'text-blue-400'}`}
                                                    >
                                                        <Send size={12}/> t.me/{profileUser.telegram}
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <button onClick={() => onOpenSocialList(profileUser.username, 'followers')} className="flex flex-col items-center group"><span className="font-pixel text-lg leading-none group-hover:text-green-500 transition-colors">{profileUser.followers?.length || 0}</span><span className="text-[9px] font-pixel opacity-50 uppercase group-hover:opacity-100">Подписчики</span></button>
                                            <button onClick={() => onOpenSocialList(profileUser.username, 'following')} className="flex flex-col items-center group"><span className="font-pixel text-lg leading-none group-hover:text-green-500 transition-colors">{profileUser.following?.length || 0}</span><span className="text-[9px] font-pixel opacity-50 uppercase group-hover:opacity-100">Подписки</span></button>
                                            <button onClick={onViewHallOfFame} className="flex flex-col items-center group"><Trophy size={18} className="group-hover:text-yellow-500 transition-colors" /><span className="text-[9px] font-pixel opacity-50 uppercase group-hover:opacity-100">Награды</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {isEditingProfile && isCurrentUser ? (
                                    <div className="space-y-4 bg-black/5 p-4 rounded-xl border border-dashed border-white/10">
                                        
                                        {/* Tagline */}
                                        <div>
                                            <label className="text-[10px] font-pixel opacity-50 uppercase tracking-widest mb-1 block">Статус / Слоган</label>
                                            <input 
                                                value={editTagline} 
                                                onChange={(e) => setEditTagline(e.target.value)} 
                                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs focus:border-green-500 outline-none"
                                            />
                                        </div>

                                        {/* Bio */}
                                        <div>
                                            <label className="text-[10px] font-pixel opacity-50 uppercase tracking-widest mb-1 block">О себе</label>
                                            <textarea 
                                                value={editBio} 
                                                onChange={(e) => setEditBio(e.target.value)} 
                                                rows={3}
                                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs focus:border-green-500 outline-none resize-none"
                                            />
                                        </div>

                                        {/* Status */}
                                        <div>
                                            <label className="text-[10px] font-pixel opacity-50 uppercase tracking-widest mb-1 block">Статус сети</label>
                                            <select 
                                                value={editStatus} 
                                                onChange={(e) => setEditStatus(e.target.value as any)}
                                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs focus:border-green-500 outline-none"
                                            >
                                                {Object.entries(STATUS_OPTIONS).map(([key, val]) => (
                                                    <option key={key} value={key}>{val.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Telegram */}
                                        <div>
                                            <label className="text-[10px] font-pixel opacity-50 uppercase tracking-widest mb-1 block">Telegram Username</label>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs opacity-50">@</span>
                                                <input 
                                                    value={editTelegram} 
                                                    onChange={(e) => setEditTelegram(e.target.value.replace('@', ''))} 
                                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs focus:border-green-500 outline-none"
                                                    placeholder="username"
                                                />
                                            </div>
                                        </div>

                                        {/* Password Change */}
                                        <div className="pt-4 border-t border-white/10">
                                            <label className="text-[10px] font-pixel opacity-50 uppercase tracking-widest mb-1 block text-yellow-500">Смена пароля (Оставьте пустым, если не меняете)</label>
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <input 
                                                        type={showPassword ? "text" : "password"}
                                                        value={editPassword} 
                                                        onChange={(e) => setEditPassword(e.target.value)} 
                                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs focus:border-yellow-500 outline-none"
                                                        placeholder="Новый пароль..."
                                                    />
                                                    <button 
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
                                                    >
                                                        {showPassword ? <Eye size={14} /> : <EyeOff size={14} />}
                                                    </button>
                                                </div>
                                                <button 
                                                    onClick={generateSecurePassword}
                                                    className="px-3 py-2 bg-white/10 rounded-lg hover:bg-white/20"
                                                    title="Сгенерировать надежный пароль"
                                                >
                                                    <Wand2 size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 pt-2"><button onClick={onSaveProfile} className="flex-1 bg-green-600 text-white px-4 py-2 rounded font-bold text-xs uppercase">Сохранить</button><button onClick={() => setIsEditingProfile(false)} className="px-4 py-2 rounded border hover:bg-white/10 text-xs uppercase">Отмена</button></div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between"><p className="font-mono font-bold text-sm">{profileUser.tagline}</p><div className="flex gap-2">{isCurrentUser ? (<><button onClick={() => { setEditTagline(user?.tagline || ''); setEditBio(user?.bio || ''); setEditStatus(user?.status || 'ONLINE'); setIsEditingProfile(true); }} className="px-3 py-1.5 border rounded-lg text-[10px] uppercase font-bold hover:bg-white/10 flex items-center gap-2"><Edit2 size={12} /> Ред.</button><button onClick={onLogout} className="px-3 py-1.5 border border-red-500/30 text-red-500 rounded-lg"><LogOut size={12} /></button></>) : (<><button onClick={() => onFollow(profileUser.username)} className={`px-4 py-1.5 rounded-lg font-bold font-pixel text-[10px] uppercase transition-all ${isSubscribed ? 'border border-white/20 opacity-60' : 'bg-green-500 text-black border-green-500'}`}>{isSubscribed ? 'Подписан' : 'Подписаться'}</button><button onClick={() => onChat(profileUser.username)} className="px-3 py-1.5 border rounded-lg hover:bg-white/10"><MessageSquare size={14} /></button></>)}</div></div>
                                        {profileUser.bio && <p className="font-mono text-sm opacity-70 whitespace-pre-wrap leading-relaxed max-w-2xl">{profileUser.bio}</p>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* TABS - Converted to Icons Only for standard themes */}
            <div className={`flex mb-4 ${isWinamp ? 'gap-1' : 'border-b border-gray-500/30'}`}>
                {isWinamp ? (
                    <>
                        <button onClick={() => setActiveSection('SHELF')} className={`px-3 py-1 text-[12px] bg-[#292929] border-t border-l border-r border-[#505050] ${activeSection === 'SHELF' ? 'text-wa-gold' : ''}`}>[ SHELF ]</button>
                        <button onClick={() => setActiveSection('FAVORITES')} className={`px-3 py-1 text-[12px] bg-[#292929] border-t border-l border-r border-[#505050] ${activeSection === 'FAVORITES' ? 'text-wa-gold' : ''}`}>[ FAV ]</button>
                        <button onClick={() => setActiveSection('LOGS')} className={`px-3 py-1 text-[12px] bg-[#292929] border-t border-l border-r border-[#505050] ${activeSection === 'LOGS' ? 'text-wa-gold' : ''}`}>[ LOGS ]</button>
                        <button onClick={() => setActiveSection('WISHLIST')} className={`px-3 py-1 text-[12px] bg-[#292929] border-t border-l border-r border-[#505050] ${activeSection === 'WISHLIST' ? 'text-wa-gold' : ''}`}>[ WISH ]</button>
                        {isCurrentUser && <button onClick={() => setActiveSection('CONFIG')} className={`px-3 py-1 text-[12px] bg-[#292929] border-t border-l border-r border-[#505050] ${activeSection === 'CONFIG' ? 'text-wa-gold' : ''}`}>[ CFG ]</button>}
                    </>
                ) : (
                    <>
                        <button onClick={() => setActiveSection('SHELF')} title="Полка" className={`flex-1 pb-3 text-center transition-colors flex items-center justify-center ${activeSection === 'SHELF' ? 'border-b-2 border-green-500 text-green-500' : 'opacity-50 hover:opacity-100'}`}><Package size={20} /></button>
                        <button onClick={() => setActiveSection('FAVORITES')} title="Избранное" className={`flex-1 pb-3 text-center transition-colors flex items-center justify-center ${activeSection === 'FAVORITES' ? 'border-b-2 border-green-500 text-green-500' : 'opacity-50 hover:opacity-100'}`}><Heart size={20} /></button>
                        <button onClick={() => setActiveSection('LOGS')} title="Гостевая" className={`flex-1 pb-3 text-center transition-colors flex items-center justify-center ${activeSection === 'LOGS' ? 'border-b-2 border-green-500 text-green-500' : 'opacity-50 hover:opacity-100'}`}><MessageSquare size={20} /></button>
                        <button onClick={() => setActiveSection('WISHLIST')} title="Вишлист" className={`flex-1 pb-3 text-center transition-colors flex items-center justify-center ${activeSection === 'WISHLIST' ? 'border-b-2 border-green-500 text-green-500' : 'opacity-50 hover:opacity-100'}`}><Search size={20} /></button>
                        {isCurrentUser && <button onClick={() => setActiveSection('CONFIG')} title="Настройки" className={`flex-1 pb-3 text-center transition-colors flex items-center justify-center ${activeSection === 'CONFIG' ? 'border-b-2 border-green-500 text-green-500' : 'opacity-50 hover:opacity-100'}`}><Settings size={20} /></button>}
                    </>
                )}
            </div>

            {/* CONTENT */}
            {activeSection === 'LOGS' && (
                <div className="space-y-6 animate-in fade-in">
                    <div className={`p-4 rounded-xl border flex gap-3 ${isWinamp ? 'bg-[#191919] border-[#505050]' : 'bg-white/5 border-white/10'}`}>
                        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                            <img src={user.avatarUrl} className="w-full h-full object-cover"/>
                        </div>
                        <div className="flex-1 flex gap-2">
                            <input 
                                ref={guestbookInputRef}
                                value={guestbookInput}
                                onChange={(e) => setGuestbookInput(e.target.value)}
                                placeholder="Оставить запись в гостевой книге..."
                                className="flex-1 bg-transparent border-none outline-none text-sm font-mono"
                                onKeyDown={(e) => e.key === 'Enter' && handleGuestbookSubmit()}
                            />
                            <button onClick={handleGuestbookSubmit} className="text-green-500 hover:text-green-400"><Send size={16}/></button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {profileGuestbook.length === 0 ? (
                            <div className="text-center opacity-50 py-8 font-mono text-xs">Гостевая книга пуста. Будьте первым!</div>
                        ) : (
                            profileGuestbook.map(entry => (
                                <div key={entry.id} className={`p-4 rounded-xl border animate-in slide-in-from-bottom-2 ${isWinamp ? 'bg-black border-[#505050]' : 'bg-white/5 border-white/10'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2" onClick={() => onAuthorClick(entry.author)}>
                                            <img src={getUserAvatar(entry.author)} className="w-6 h-6 rounded-full cursor-pointer"/>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-xs cursor-pointer hover:text-green-500">@{entry.author}</span>
                                                <span className="text-[9px] opacity-40 font-mono">{entry.timestamp}</span>
                                            </div>
                                        </div>
                                        {(isCurrentUser || user.isAdmin || entry.author === user.username) && (
                                            <button onClick={() => handleDeleteEntry(entry.id)} className="text-gray-500 hover:text-red-500"><Trash2 size={12}/></button>
                                        )}
                                    </div>
                                    <p className="text-sm font-mono opacity-80 pl-8 whitespace-pre-wrap break-words">{entry.text}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {activeSection === 'WISHLIST' && (
                <div className="space-y-6 animate-in fade-in">
                    <button 
                        onClick={handleShareWishlist} 
                        className={`w-full flex items-center justify-center gap-2 text-xs font-bold uppercase py-3 rounded-xl border-2 border-dashed hover:bg-white/5 transition-all ${isWinamp ? 'border-[#00ff00] text-[#00ff00]' : 'border-white/20 opacity-80 hover:opacity-100'}`}
                    >
                        <LinkIcon size={16}/> {isWinamp ? 'COPY WISHLIST LINK' : 'СКОПИРОВАТЬ ССЫЛКУ НА ВИШЛИСТ'}
                    </button>
                    {wishlistItems.length === 0 ? (
                        <div className="text-center opacity-50 py-10 font-mono text-xs uppercase">Вишлист пуст</div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {wishlistItems.map(item => (
                                <WishlistCard key={item.id} item={item} theme={theme} onClick={onWishlistClick} onUserClick={onAuthorClick} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeSection === 'FAVORITES' && (
                <div className="space-y-4 animate-in fade-in">
                    {favoritedExhibits.length === 0 ? (
                        <div className="text-center opacity-50 py-10 font-mono text-xs uppercase">Пользователь ничего не добавил в избранное</div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {favoritedExhibits.map(item => (
                                <ExhibitCard key={item.id} item={item} theme={theme} onClick={onExhibitClick} isLiked={item.likedBy?.includes(user?.username || '') || false} onLike={(e) => onLike(item.id, e)} onAuthorClick={onAuthorClick} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeSection === 'SHELF' && (
                <div className="space-y-8 animate-in fade-in">
                    {isWinamp && (
                        <div className="flex gap-4 mb-4 text-[12px]">
                            <button onClick={() => setLocalProfileTab('ARTIFACTS')} className={`${localProfileTab === 'ARTIFACTS' ? 'text-wa-gold' : ''}`}>[ ITEMS ]</button>
                            <button onClick={() => setLocalProfileTab('COLLECTIONS')} className={`${localProfileTab === 'COLLECTIONS' ? 'text-wa-gold' : ''}`}>[ ALBUMS ]</button>
                        </div>
                    )}
                    {!isWinamp && (
                        <div className="flex items-center gap-4 mb-4">
                            <button onClick={() => setLocalProfileTab('ARTIFACTS')} className={`text-xs font-pixel uppercase ${localProfileTab === 'ARTIFACTS' ? 'text-green-500 font-bold' : 'opacity-50'}`}>Предметы ({publishedExhibits.length})</button>
                            <button onClick={() => setLocalProfileTab('COLLECTIONS')} className={`text-xs font-pixel uppercase ${localProfileTab === 'COLLECTIONS' ? 'text-green-500 font-bold' : 'opacity-50'}`}>Коллекции ({userCollections.length})</button>
                        </div>
                    )}

                    {localProfileTab === 'ARTIFACTS' && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {publishedExhibits.length === 0 && <div className="col-span-full text-center opacity-50 text-xs">Нет предметов</div>}
                            {publishedExhibits.map(item => (
                                <ExhibitCard key={item.id} item={item} theme={theme} onClick={onExhibitClick} isLiked={item.likedBy?.includes(user?.username || '') || false} onLike={(e) => onLike(item.id, e)} onAuthorClick={() => {}} />
                            ))}
                        </div>
                    )}
                    {localProfileTab === 'COLLECTIONS' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {userCollections.length === 0 && <div className="col-span-full text-center opacity-50 text-xs">Нет коллекций</div>}
                            {userCollections.map(col => (
                                <CollectionCard key={col.id} col={col} theme={theme} onClick={onCollectionClick} onShare={onShareCollection} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {isCurrentUser && activeSection === 'CONFIG' && (
                <div className={isWinamp ? '' : `p-6 rounded-xl border flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 ${theme === 'dark' ? 'bg-dark-surface border-dark-dim' : 'bg-white border-light-dim'}`}>
                    {isWinamp ? (
                        <WinampWindow title="PREFERENCES / SKINS">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <button onClick={() => updateSetting('theme', 'dark')} className="p-2 border border-[#505050] hover:text-white">MATRIX_SKIN</button>
                                <button onClick={() => updateSetting('theme', 'light')} className="p-2 border border-[#505050] hover:text-white">OFFICE_SKIN</button>
                                <button onClick={() => updateSetting('theme', 'xp')} className="p-2 border border-[#505050] hover:text-white">XP_LUNA</button>
                                <button onClick={() => updateSetting('theme', 'winamp')} className="p-2 border border-[#505050] text-wa-gold border-wa-gold">WINAMP_CLASSIC</button>
                            </div>
                        </WinampWindow>
                    ) : (
                        <div>
                            <h3 className="font-pixel text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2 opacity-70"><Palette size={14}/> Интерфейс / Visuals</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <button onClick={() => updateSetting('theme', 'dark')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${localSettings.theme === 'dark' ? 'border-green-500 bg-green-500/10' : 'border-transparent bg-black/5 hover:bg-black/10'}`}><div className="w-8 h-8 bg-black rounded-full border border-gray-700 flex items-center justify-center text-green-500"><Terminal size={16}/></div><span className="font-pixel text-[10px]">MATRIX</span></button>
                                <button onClick={() => updateSetting('theme', 'light')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${localSettings.theme === 'light' ? 'border-blue-500 bg-blue-500/10' : 'border-transparent bg-gray-100 hover:bg-gray-200'}`}><div className="w-8 h-8 bg-white rounded-full border border-gray-300 flex items-center justify-center text-black"><Sun size={16}/></div><span className="font-pixel text-[10px]">OFFICE</span></button>
                                <button onClick={() => updateSetting('theme', 'xp')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${localSettings.theme === 'xp' ? 'border-blue-600 bg-blue-50' : 'border-transparent bg-blue-50/50 hover:bg-blue-100'}`}><div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full border border-white flex items-center justify-center text-white italic font-serif shadow">XP</div><span className="font-pixel text-[10px]">LUNA</span></button>
                                <button onClick={() => updateSetting('theme', 'winamp')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${localSettings.theme === 'winamp' ? 'border-[#00ff00] bg-[#191919]' : 'border-transparent bg-[#191919] hover:border-[#505050]'}`}><div className="w-8 h-8 bg-[#282828] rounded-full border border-[#505050] flex items-center justify-center text-[#00ff00]"><Terminal size={16}/></div><span className="font-pixel text-[10px]">WINAMP</span></button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default UserProfileView;


import React, { useState, useEffect, useMemo } from 'react';
import { 
    ArrowLeft, Edit2, LogOut, MessageSquare, Send, Trophy, 
    Trash2, Wand2, Eye, EyeOff, Camera, Palette, Settings, 
    Search, Terminal, Sun, Package, Heart, Link as LinkIcon, 
    AlertTriangle, RefreshCw, Crown, AlertCircle, Mail, Key
} from 'lucide-react';
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

// --- SUBCOMPONENTS ---

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

const RetroCounter: React.FC<{ count: number }> = ({ count }) => {
    const countStr = Math.max(count, 1).toString().padStart(6, '0');
    return (
        <div className="inline-flex gap-0.5 p-1 bg-black border-2 border-gray-600 rounded-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]" title="Счетчик посетителей">
            {countStr.split('').map((digit, i) => (
                <div key={i} className="w-3 h-5 bg-[#1a1a1a] text-red-600 font-mono flex items-center justify-center text-[10px] font-bold border border-[#333] shadow-[inset_0_0_2px_black] relative overflow-hidden">
                    <span className="relative z-10 text-red-500 text-shadow-red">{digit}</span>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-500/10 to-transparent opacity-20 pointer-events-none"></div>
                </div>
            ))}
        </div>
    );
};

// --- MAIN COMPONENT ---

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
    const isPlaceholderEmail = user.email?.includes('placeholder') || user.email?.includes('tg_');

    // Tabs
    const [activeSection, setActiveSection] = useState<'SHELF' | 'FAVORITES' | 'LOGS' | 'CONFIG' | 'WISHLIST'>('SHELF');
    const [localProfileTab, setLocalProfileTab] = useState<'ARTIFACTS' | 'COLLECTIONS'>('ARTIFACTS');

    // Edit State
    const [showPassword, setShowPassword] = useState(false);
    const [localSettings, setLocalSettings] = useState<AppSettings>(user?.settings || { theme: 'dark' });

    // New: State for changing email
    const [editEmail, setEditEmail] = useState(user.email);

    // Sync editEmail with user.email when it changes
    useEffect(() => {
        if (user.email !== editEmail) {
            setEditEmail(user.email);
        }
    }, [user.email]);

    // Filtered Data
    const userExhibits = exhibits.filter(e => e.owner === viewedProfileUsername);
    const userCollections = collections.filter(c => c.owner === viewedProfileUsername);
    const wishlistItems = db.getFullDatabase().wishlist.filter(w => w.owner === viewedProfileUsername);
    const favoritedExhibits = exhibits.filter(e => e.likedBy?.includes(viewedProfileUsername));
    const profileGuestbook = guestbook.filter(g => g.targetUser.toLowerCase() === viewedProfileUsername.toLowerCase()).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const publishedExhibits = userExhibits.filter(e => !e.isDraft);

    // --- WIDGET DATA CALCULATION ---
    
    // Showcase Item (Pride of Collection) - Compact Logic
    const showcaseItem = useMemo(() => {
        if (publishedExhibits.length === 0) return null;
        // Simple heuristic: Most liked item
        return [...publishedExhibits].sort((a, b) => (b.likes * 2 + b.views) - (a.likes * 2 + a.views))[0];
    }, [publishedExhibits]);

    // Visitor Counter
    const totalViews = useMemo(() => {
        const itemViews = publishedExhibits.reduce((acc, curr) => acc + (curr.views || 0), 0);
        return itemViews + (profileUser.followers?.length || 0) * 15 + 1337;
    }, [publishedExhibits, profileUser]);

    // Handlers
    const handleDeleteEntry = async (id: string) => { if (confirm('Удалить запись?')) { await db.deleteGuestbookEntry(id); refreshData(); } };
    const generateSecurePassword = () => { const chars = "ABCabc123!@#"; let pass = ""; for(let i=0; i<12; i++) { pass += chars.charAt(Math.floor(Math.random() * chars.length)); } setEditPassword(pass); setShowPassword(true); };
    const updateSetting = async (key: keyof AppSettings, value: any) => { 
        if (!isCurrentUser) return; 
        const newSettings = { ...localSettings, [key]: value }; 
        setLocalSettings(newSettings); 
        if (key === 'theme' && onThemeChange) onThemeChange(value); 
        const updatedUser = { ...user, settings: newSettings }; 
        await db.updateUserProfile(updatedUser); 
    };

    const handleSaveProfileExtended = async () => {
        if (!isCurrentUser) return;

        const updated = {
            ...user,
            tagline: editTagline,
            bio: editBio,
            status: editStatus,
            telegram: editTelegram
        };

        // Only update email if it's not empty (prevent overwriting existing email with empty value)
        if (editEmail && editEmail.trim()) {
            updated.email = editEmail.trim();
        } else if (user.email) {
            // Preserve existing email if new value is empty
            updated.email = user.email;
        }

        if (editPassword) updated.password = editPassword;

        await db.updateUserProfile(updated);
        setIsEditingProfile(false);
        setEditPassword('');
    };

    const handleGuestbookSubmit = () => {
        if (!guestbookInput.trim()) return;
        onGuestbookPost(guestbookInput);
        setGuestbookInput('');
    };

    const handleShareWishlist = () => {
        const url = `${window.location.origin}/u/${viewedProfileUsername}/wishlist`;
        navigator.clipboard.writeText(url);
        alert('Ссылка скопирована!');
    };

    const handleHardReset = async () => {
        if (!confirm("ВНИМАНИЕ! Это полностью очистит локальный кэш.")) return;
        await db.clearLocalCache();
        window.location.reload();
    };

    return (
        <div className={`max-w-4xl mx-auto space-y-4 animate-in slide-in-from-right-8 fade-in duration-500 pb-32 ${isWinamp ? 'font-winamp text-wa-green' : ''}`}>
            <SEO title={`@${profileUser.username} | Профиль`} />

            {!isWinamp && <button onClick={onBack} className="flex items-center gap-2 hover:underline opacity-70 font-pixel text-xs px-4 md:px-0"><ArrowLeft size={16} /> НАЗАД</button>}
            
            <div className={isWinamp ? '' : `md:rounded-3xl border-b md:border overflow-hidden relative ${theme === 'dark' ? 'bg-dark-surface border-dark-dim' : 'bg-white border-light-dim'}`}>
                {/* PROFILE HEADER */}
                {isWinamp ? (
                    <WinampWindow title={`USER: ${profileUser.username}`}>
                        <div className="flex gap-4 items-start">
                            <div className="w-20 h-20 border-2 border-inset border-[#505050] p-1 bg-black">
                                <img src={profileUser.avatarUrl} className="w-full h-full object-cover grayscale opacity-80 hover:opacity-100" />
                            </div>
                            <div className="flex-1 space-y-1">
                                <div className="text-[14px] text-wa-gold flex justify-between">
                                    <span>{profileUser.username}</span>
                                    <RetroCounter count={totalViews} />
                                </div>
                                <div className="text-[12px] opacity-80">{profileUser.tagline}</div>
                                <div className="text-[12px] flex gap-2 mt-2">
                                    <span onClick={() => onOpenSocialList(profileUser.username, 'followers')} className="cursor-pointer hover:text-white">Подписчики: {profileUser.followers?.length || 0}</span>
                                    <span onClick={() => onOpenSocialList(profileUser.username, 'following')} className="cursor-pointer hover:text-white">Подписки: {profileUser.following?.length || 0}</span>
                                </div>
                                {isCurrentUser && (
                                    <button onClick={onLogout} className="px-2 border border-[#505050] bg-[#292929] text-[10px] hover:text-red-500 mt-2">ВЫЙТИ</button>
                                )}
                            </div>
                        </div>
                    </WinampWindow>
                ) : (
                    <>
                        {/* Cover Image */}
                        <div className="h-32 md:h-52 bg-gray-800 relative group">
                            {profileUser.coverUrl ? <img src={profileUser.coverUrl} className="w-full h-full object-cover" /> : <div className={`w-full h-full ${theme === 'dark' ? 'bg-gradient-to-r from-green-900/20 to-black' : 'bg-gradient-to-r from-gray-100 to-gray-300'}`}></div>}
                            {isEditingProfile && isCurrentUser && (
                                <label className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-xl cursor-pointer hover:bg-black/70 border border-white/20 flex items-center gap-2 backdrop-blur-sm"><Camera size={16} /> <span className="text-[10px] font-pixel">ОБЛОЖКА</span><input type="file" accept="image/*" className="hidden" onChange={onProfileCoverUpload} /></label>
                            )}
                            <div className="absolute bottom-2 right-4 flex items-center gap-2 bg-black/40 backdrop-blur-md px-2 py-1 rounded border border-white/10">
                                <span className="text-[9px] font-pixel text-white opacity-70 hidden md:inline">VISITORS:</span>
                                <RetroCounter count={totalViews} />
                            </div>
                        </div>

                        {/* Avatar & Info Container */}
                        <div className="px-4 pb-6 relative">
                            <div className="flex flex-col items-start -mt-10 md:-mt-12 gap-4 mb-2">
                                {/* Avatar */}
                                <div className="relative group">
                                    <div className={`w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden border-4 bg-black shadow-lg ${theme === 'dark' ? 'border-dark-surface' : 'border-white'}`}>
                                        <img src={profileUser.avatarUrl} className="w-full h-full object-cover"/>
                                    </div>
                                    {isEditingProfile && isCurrentUser && (
                                        <label className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"><Camera size={24} className="text-white" /><input type="file" accept="image/*" className="hidden" onChange={onProfileImageUpload} /></label>
                                    )}
                                </div>

                                {/* Username & Stats */}
                                <div className="flex-1 w-full">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <h2 className="text-2xl md:text-3xl font-pixel font-bold flex items-center gap-2">@{profileUser.username}</h2>
                                            <p className="text-xs font-mono opacity-60 mt-1">В сети с {profileUser.joinedDate}</p>
                                        </div>
                                        <div className="flex items-center gap-6 border-t md:border-t-0 border-white/5 pt-3 md:pt-0">
                                            <button onClick={() => onOpenSocialList(profileUser.username, 'followers')} className="flex flex-col items-center group"><span className="font-pixel text-lg leading-none group-hover:text-green-500">{profileUser.followers?.length || 0}</span><span className="text-[9px] font-pixel opacity-50 uppercase group-hover:opacity-100">Фолловеры</span></button>
                                            <button onClick={() => onOpenSocialList(profileUser.username, 'following')} className="flex flex-col items-center group"><span className="font-pixel text-lg leading-none group-hover:text-green-500">{profileUser.following?.length || 0}</span><span className="text-[9px] font-pixel opacity-50 uppercase group-hover:opacity-100">Подписки</span></button>
                                            <button onClick={onViewHallOfFame} className="flex flex-col items-center group"><Trophy size={18} className="group-hover:text-yellow-500" /><span className="text-[9px] font-pixel opacity-50 uppercase group-hover:opacity-100">Награды</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Bio & Actions */}
                            <div className="space-y-4">
                                {isEditingProfile && isCurrentUser ? (
                                    <div className="space-y-4 bg-black/5 p-4 rounded-xl border border-dashed border-white/10">
                                        
                                        {isPlaceholderEmail && (
                                            <div className="bg-red-500/10 border border-red-500/50 p-3 rounded-lg flex items-start gap-3">
                                                <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
                                                <div>
                                                    <h3 className="text-red-500 font-bold text-xs mb-1">НЕОБХОДИМО ПРИВЯЗАТЬ EMAIL</h3>
                                                    <p className="text-[10px] opacity-70">
                                                        Вы вошли через Telegram. Ваш текущий email - временный. Установите реальный email и пароль, чтобы иметь возможность входа через форму.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <label className="text-[10px] font-pixel opacity-50 uppercase tracking-widest mb-1 block">Статус / Слоган</label>
                                            <input value={editTagline} onChange={(e) => setEditTagline(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs focus:border-green-500 outline-none"/>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-pixel opacity-50 uppercase tracking-widest mb-1 block">О себе</label>
                                            <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} rows={3} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs focus:border-green-500 outline-none resize-none"/>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-white/5">
                                            <div>
                                                <label className="text-[10px] font-pixel opacity-50 uppercase tracking-widest mb-1 flex items-center gap-2"><Mail size={12}/> Email (Для входа)</label>
                                                <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs focus:border-green-500 outline-none"/>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-pixel opacity-50 uppercase tracking-widest mb-1 flex items-center gap-2"><Key size={12}/> Новый пароль</label>
                                                <div className="flex gap-2">
                                                    <input value={editPassword} onChange={(e) => setEditPassword(e.target.value)} type={showPassword ? "text" : "password"} placeholder="Изменить пароль..." className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs focus:border-green-500 outline-none"/>
                                                    <button onClick={() => setShowPassword(!showPassword)} className="p-2 border rounded-lg hover:bg-white/10"><Eye size={14}/></button>
                                                    <button onClick={generateSecurePassword} className="p-2 border rounded-lg hover:bg-white/10"><Wand2 size={14}/></button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 pt-2">
                                            <button onClick={handleSaveProfileExtended} className="flex-1 bg-green-600 text-white px-4 py-2 rounded font-bold text-xs uppercase">Сохранить</button>
                                            <button onClick={() => setIsEditingProfile(false)} className="px-4 py-2 rounded border hover:bg-white/10 text-xs uppercase">Отмена</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                            <p className="font-mono font-bold text-sm leading-tight">{profileUser.tagline}</p>
                                            <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                                                {isCurrentUser ? (
                                                    <>
                                                        <button onClick={() => { setEditTagline(user?.tagline || ''); setEditBio(user?.bio || ''); setEditEmail(user?.email || ''); setIsEditingProfile(true); }} className="flex-1 md:flex-none px-3 py-1.5 border rounded-lg text-[10px] uppercase font-bold hover:bg-white/10 flex items-center justify-center gap-2"><Edit2 size={12} /> Ред.</button>
                                                        <button onClick={onLogout} className="px-3 py-1.5 border border-red-500/30 text-red-500 rounded-lg"><LogOut size={12} /></button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button onClick={() => onFollow(profileUser.username)} className={`flex-1 md:flex-none px-4 py-2 md:py-1.5 rounded-lg font-bold font-pixel text-[10px] uppercase transition-all ${isSubscribed ? 'border border-white/20 opacity-60' : 'bg-green-500 text-black border-green-500'}`}>{isSubscribed ? 'Подписан' : 'Подписаться'}</button>
                                                        <button onClick={() => onChat(profileUser.username)} className="px-4 py-2 md:py-1.5 border rounded-lg hover:bg-white/10"><MessageSquare size={14} /></button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {profileUser.bio && <p className="font-mono text-xs opacity-70 whitespace-pre-wrap leading-relaxed max-w-2xl">{profileUser.bio}</p>}
                                        
                                        {isCurrentUser && isPlaceholderEmail && !isEditingProfile && (
                                            <div onClick={() => setIsEditingProfile(true)} className="mt-2 bg-red-500/10 border border-red-500/50 p-2 rounded flex items-center gap-2 cursor-pointer hover:bg-red-500/20">
                                                <AlertCircle size={14} className="text-red-500"/>
                                                <span className="text-[10px] text-red-400 font-bold">Нажмите "Ред.", чтобы установить Email и Пароль.</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* SHOWCASE COMPACT WIDGET */}
            {activeSection === 'SHELF' && !isEditingProfile && showcaseItem && (
                <div className="px-0 md:px-0">
                    <div className={`relative overflow-hidden border rounded-xl flex h-28 md:h-32 group cursor-pointer ${isWinamp ? 'bg-[#191919] border-[#505050]' : 'bg-gradient-to-r from-yellow-900/20 to-transparent border-yellow-500/20 hover:border-yellow-500/40'}`} onClick={() => onExhibitClick(showcaseItem)}>
                        {/* Compact Image Left */}
                        <div className="w-24 md:w-32 h-full relative flex-shrink-0 bg-black">
                            <img src={typeof showcaseItem.imageUrls[0] === 'string' ? showcaseItem.imageUrls[0] : (showcaseItem.imageUrls[0]?.thumbnail || 'https://placehold.co/600x400?text=NO+IMAGE')} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute top-0 left-0 bg-yellow-500 text-black text-[8px] font-bold px-1.5 py-0.5 rounded-br-lg z-10 font-pixel">
                                <Crown size={8} className="inline mr-0.5"/> SHOWCASE
                            </div>
                        </div>
                        
                        {/* Compact Details Right */}
                        <div className="flex-1 p-3 flex flex-col justify-center min-w-0">
                            <div className={`text-[9px] uppercase tracking-widest mb-1 ${isWinamp ? 'text-[#00ff00]' : 'text-yellow-500 opacity-70'}`}>ГОРДОСТЬ КОЛЛЕКЦИИ</div>
                            <h3 className={`font-pixel text-sm md:text-lg font-bold truncate mb-1 ${isWinamp ? 'text-[#00ff00]' : 'text-white'}`}>{showcaseItem.title}</h3>
                            <div className="flex items-center gap-3 text-[10px] font-mono opacity-50">
                                <span className="flex items-center gap-1"><Heart size={10} className="text-red-500"/> {showcaseItem.likes}</span>
                                <span className="flex items-center gap-1"><Eye size={10} className="text-blue-400"/> {showcaseItem.views}</span>
                                <span className="truncate max-w-[80px] border border-white/10 px-1 rounded">{showcaseItem.category}</span>
                            </div>
                        </div>
                        
                        {/* Arrow Hint */}
                        <div className="w-8 flex items-center justify-center border-l border-white/5 opacity-50 group-hover:opacity-100 group-hover:bg-white/5">
                            <div className="border-t-2 border-r-2 border-white w-2 h-2 rotate-45 transform"></div>
                        </div>
                    </div>
                </div>
            )}

            {/* NAVIGATION TABS */}
            <div className={`flex mb-4 mt-2 px-0 md:px-0 ${isWinamp ? 'gap-1' : 'border-b border-gray-500/30'}`}>
                <button onClick={() => setActiveSection('SHELF')} className={`flex-1 pb-3 text-center ${activeSection === 'SHELF' ? 'border-b-2 border-green-500 text-green-500' : 'opacity-50'}`}><Package size={20} className="mx-auto"/></button>
                <button onClick={() => setActiveSection('FAVORITES')} className={`flex-1 pb-3 text-center ${activeSection === 'FAVORITES' ? 'border-b-2 border-green-500 text-green-500' : 'opacity-50'}`}><Heart size={20} className="mx-auto"/></button>
                <button onClick={() => setActiveSection('LOGS')} className={`flex-1 pb-3 text-center ${activeSection === 'LOGS' ? 'border-b-2 border-green-500 text-green-500' : 'opacity-50'}`}><MessageSquare size={20} className="mx-auto"/></button>
                <button onClick={() => setActiveSection('WISHLIST')} className={`flex-1 pb-3 text-center ${activeSection === 'WISHLIST' ? 'border-b-2 border-green-500 text-green-500' : 'opacity-50'}`}><Search size={20} className="mx-auto"/></button>
                {isCurrentUser && <button onClick={() => setActiveSection('CONFIG')} className={`flex-1 pb-3 text-center ${activeSection === 'CONFIG' ? 'border-b-2 border-green-500 text-green-500' : 'opacity-50'}`}><Settings size={20} className="mx-auto"/></button>}
            </div>

            {/* SECTIONS CONTENT */}
            
            {activeSection === 'SHELF' && (
                <div className="space-y-6 animate-in fade-in px-0 md:px-0">
                    <div className="flex items-center gap-4 mb-4 px-2 md:px-0">
                        <button onClick={() => setLocalProfileTab('ARTIFACTS')} className={`text-xs font-pixel uppercase ${localProfileTab === 'ARTIFACTS' ? 'text-green-500 font-bold' : 'opacity-50'}`}>Предметы ({publishedExhibits.length})</button>
                        <button onClick={() => setLocalProfileTab('COLLECTIONS')} className={`text-xs font-pixel uppercase ${localProfileTab === 'COLLECTIONS' ? 'text-green-500 font-bold' : 'opacity-50'}`}>Коллекции ({userCollections.length})</button>
                    </div>

                    {localProfileTab === 'ARTIFACTS' && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                            {publishedExhibits.length === 0 && <div className="col-span-full text-center opacity-50 text-xs py-8">Нет предметов</div>}
                            {publishedExhibits.map(item => (
                                <ExhibitCard key={item.id} item={item} theme={theme} onClick={onExhibitClick} isLiked={item.likedBy?.includes(user?.username || '') || false} onLike={(e) => onLike(item.id, e)} onAuthorClick={() => {}} />
                            ))}
                        </div>
                    )}
                    {localProfileTab === 'COLLECTIONS' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {userCollections.length === 0 && <div className="col-span-full text-center opacity-50 text-xs py-8">Нет коллекций</div>}
                            {userCollections.map(col => (
                                <CollectionCard key={col.id} col={col} theme={theme} onClick={onCollectionClick} onShare={onShareCollection} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeSection === 'FAVORITES' && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 animate-in fade-in px-0 md:px-0">
                    {favoritedExhibits.map(item => (
                        <ExhibitCard key={item.id} item={item} theme={theme} onClick={onExhibitClick} isLiked={true} onLike={(e) => onLike(item.id, e)} onAuthorClick={onAuthorClick} />
                    ))}
                    {favoritedExhibits.length === 0 && <div className="col-span-full text-center opacity-50 py-8 text-xs uppercase">Пусто</div>}
                </div>
            )}

            {activeSection === 'WISHLIST' && (
                <div className="space-y-6 animate-in fade-in px-0 md:px-0">
                    <button onClick={handleShareWishlist} className={`w-full flex items-center justify-center gap-2 text-xs font-bold uppercase py-3 rounded-xl border-2 border-dashed ${isWinamp ? 'border-[#00ff00] text-[#00ff00]' : 'border-white/20 opacity-80 hover:opacity-100'}`}>
                        <LinkIcon size={16}/> СКОПИРОВАТЬ ССЫЛКУ
                    </button>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                        {wishlistItems.map(item => (
                            <WishlistCard key={item.id} item={item} theme={theme} onClick={onWishlistClick} onUserClick={onAuthorClick} />
                        ))}
                    </div>
                </div>
            )}

            {activeSection === 'LOGS' && (
                <div className="space-y-6 animate-in fade-in px-0 md:px-0">
                    <div className={`p-4 rounded-xl border flex gap-3 ${isWinamp ? 'bg-[#191919] border-[#505050]' : 'bg-white/5 border-white/10'}`}>
                        <input ref={guestbookInputRef} value={guestbookInput} onChange={(e) => setGuestbookInput(e.target.value)} placeholder="Оставить запись..." className="flex-1 bg-transparent border-none outline-none text-sm font-mono"/>
                        <button onClick={handleGuestbookSubmit} className="text-green-500"><Send size={16}/></button>
                    </div>
                    <div className="space-y-4">
                        {profileGuestbook.map(entry => (
                            <div key={entry.id} className={`p-4 rounded-xl border ${isWinamp ? 'bg-black border-[#505050]' : 'bg-white/5 border-white/10'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div className="font-bold text-xs">@{entry.author}</div>
                                    {isCurrentUser && <button onClick={() => handleDeleteEntry(entry.id)}><Trash2 size={12} className="opacity-50 hover:text-red-500"/></button>}
                                </div>
                                <p className="text-sm font-mono opacity-80">{entry.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isCurrentUser && activeSection === 'CONFIG' && (
                <div className="p-6 rounded-xl border flex flex-col gap-6 animate-in fade-in bg-white/5 border-white/10 mx-0 md:mx-0">
                    <h3 className="font-pixel text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2 opacity-70"><Palette size={14}/> Внешний вид</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <button onClick={() => updateSetting('theme', 'dark')} className="p-4 border rounded hover:bg-white/10 text-xs">Matrix</button>
                        <button onClick={() => updateSetting('theme', 'light')} className="p-4 border rounded hover:bg-white/10 text-xs">Light</button>
                        <button onClick={() => updateSetting('theme', 'xp')} className="p-4 border rounded hover:bg-white/10 text-xs">Windows XP</button>
                        <button onClick={() => updateSetting('theme', 'winamp')} className="p-4 border rounded hover:bg-white/10 text-green-500 border-green-500 text-xs">Winamp</button>
                    </div>
                    <div className="pt-6 border-t border-white/10">
                        <h3 className="font-pixel text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2 text-red-500"><AlertTriangle size={14}/> Danger Zone</h3>
                        <button onClick={handleHardReset} className="w-full py-4 border-2 border-red-500/50 text-red-500 rounded-xl hover:bg-red-500/10 font-bold text-xs uppercase flex items-center justify-center gap-2"><RefreshCw size={16}/> HARD RESET</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserProfileView;

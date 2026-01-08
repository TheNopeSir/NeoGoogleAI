
import React, { useState, useEffect, useMemo } from 'react';
import { 
    ArrowLeft, Edit2, LogOut, MessageSquare, Send, Trophy, 
    Trash2, Wand2, Eye, EyeOff, Camera, Palette, Settings, 
    Search, Terminal, Sun, Package, Heart, Link as LinkIcon, 
    AlertTriangle, RefreshCw, Crown, Lock, Bell, Shield, Database,
    MapPin, Globe, Instagram, Youtube, UserCheck, Layout, Briefcase, Zap, Video, 
    BarChart3, PieChart, Key, Download, Laptop, Smartphone, FileText, Mail
} from 'lucide-react';
import { UserProfile, Exhibit, Collection, GuestbookEntry, UserStatus, AppSettings, WishlistItem, PrivacySettings, NotificationSettings, ExtendedProfile, FeedSettings, CollectorProfile, ApiKey } from '../types';
import { STATUS_OPTIONS, DEFAULT_PRIVACY_SETTINGS, DEFAULT_NOTIFICATION_SETTINGS, DEFAULT_FEED_SETTINGS, DEFAULT_COLLECTOR_PROFILE } from '../constants';
import * as db from '../services/storageService';
import { getUserAvatar, exportUserData, generateApiKey } from '../services/storageService';
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

const SettingsToggle: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; theme: string }> = ({ label, checked, onChange, disabled, theme }) => (
    <div className={`flex items-center justify-between p-3 border rounded-lg ${disabled ? 'opacity-50 pointer-events-none' : theme === 'dark' ? 'border-white/5 hover:bg-white/5' : 'border-black/5 hover:bg-black/5'}`}>
        <span className={`text-xs font-mono ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{label}</span>
        <div 
            onClick={() => !disabled && onChange(!checked)}
            className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${checked ? 'bg-green-500' : 'bg-gray-500'}`}
        >
            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${checked ? 'left-6' : 'left-1'}`} />
        </div>
    </div>
);

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
    const isDark = theme === 'dark';

    // Check privacy settings
    const showEmail = isCurrentUser || profileUser.privacy?.showEmail;
    const showTelegram = isCurrentUser || profileUser.privacy?.showTelegram;
    const showOnline = isCurrentUser || profileUser.privacy?.showOnlineStatus;

    // Tabs
    const [activeSection, setActiveSection] = useState<'SHELF' | 'FAVORITES' | 'LOGS' | 'ANALYTICS' | 'CONFIG' | 'WISHLIST'>('SHELF');
    const [localProfileTab, setLocalProfileTab] = useState<'ARTIFACTS' | 'COLLECTIONS'>('ARTIFACTS');
    const [settingsCategory, setSettingsCategory] = useState<'PROFILE' | 'PRIVACY' | 'NOTIFICATIONS' | 'APPEARANCE' | 'SECURITY' | 'CONTENT' | 'COLLECTOR' | 'DATA' | 'INTEGRATIONS'>('PROFILE');

    // Local state for extended settings (so we can save them in bulk)
    const [localPrivacy, setLocalPrivacy] = useState<PrivacySettings>(user?.privacy || DEFAULT_PRIVACY_SETTINGS);
    const [localNotifs, setLocalNotifs] = useState<NotificationSettings>(user?.notifications || DEFAULT_NOTIFICATION_SETTINGS);
    const [localFeed, setLocalFeed] = useState<FeedSettings>(user?.settings?.feed || DEFAULT_FEED_SETTINGS);
    const [localCollector, setLocalCollector] = useState<CollectorProfile>(user?.collector || DEFAULT_COLLECTOR_PROFILE);
    const [localExtended, setLocalExtended] = useState<ExtendedProfile>(user?.extended || {});
    
    // API Keys State
    const [apiKeys, setApiKeys] = useState<ApiKey[]>(user?.apiKeys || []);

    // Edit State
    const [showPassword, setShowPassword] = useState(false);
    const [localSettings, setLocalSettings] = useState<AppSettings>(user?.settings || { theme: 'dark' });

    // Ensure we have valid local state if user props update
    useEffect(() => {
        if(isCurrentUser) {
            setLocalPrivacy(user.privacy || DEFAULT_PRIVACY_SETTINGS);
            setLocalNotifs(user.notifications || DEFAULT_NOTIFICATION_SETTINGS);
            setLocalFeed(user.settings?.feed || DEFAULT_FEED_SETTINGS);
            setLocalCollector(user.collector || DEFAULT_COLLECTOR_PROFILE);
            setLocalExtended(user.extended || {});
            setApiKeys(user.apiKeys || []);
        }
    }, [user, isCurrentUser]);

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

    // Analytics Data (Calculated on the fly)
    const analyticsData = useMemo(() => {
        const totalItems = publishedExhibits.length;
        const totalLikes = publishedExhibits.reduce((acc, curr) => acc + curr.likes, 0);
        // Estimate value (mock sum of prices or default)
        const totalValue = publishedExhibits.reduce((acc, curr) => acc + (curr.price || 0), 0);
        
        // Category Distribution
        const categories: Record<string, number> = {};
        publishedExhibits.forEach(e => {
            categories[e.category] = (categories[e.category] || 0) + 1;
        });
        const categoryData = Object.entries(categories)
            .map(([label, count]) => ({ label, count, pct: (count / totalItems) * 100 }))
            .sort((a, b) => b.count - a.count);

        return { totalItems, totalLikes, totalValue, categoryData };
    }, [publishedExhibits]);

    // Handlers
    const handleDeleteEntry = async (id: string) => { if (confirm('Удалить запись?')) { await db.deleteGuestbookEntry(id); refreshData(); } };
    const generateSecurePassword = () => { const chars = "ABCabc123!@#"; let pass = ""; for(let i=0; i<12; i++) { pass += chars.charAt(Math.floor(Math.random() * chars.length)); } setEditPassword(pass); setShowPassword(true); };
    
    const updateTheme = async (val: any) => {
        if (!isCurrentUser) return;
        const newSettings = { ...localSettings, theme: val };
        setLocalSettings(newSettings);
        if (onThemeChange) onThemeChange(val);
        const updatedUser = { ...user, settings: newSettings };
        await db.updateUserProfile(updatedUser);
    };

    const handleSaveExtended = async () => {
        if (!isCurrentUser) return;
        
        const newAppSettings = { ...localSettings, feed: localFeed };

        const updatedUser = {
            ...user,
            tagline: editTagline,
            bio: editBio,
            status: editStatus,
            telegram: editTelegram,
            privacy: localPrivacy,
            notifications: localNotifs,
            collector: localCollector,
            extended: localExtended,
            settings: newAppSettings,
            apiKeys: apiKeys
        };
        if (editPassword) updatedUser.password = editPassword;
        
        await db.updateUserProfile(updatedUser);
        setIsEditingProfile(false);
        setEditPassword('');
        alert('Настройки профиля обновлены');
    };

    const handleGenerateApiKey = () => {
        const newKey = generateApiKey();
        setApiKeys(prev => [...prev, newKey]);
    };

    const handleDeleteApiKey = (id: string) => {
        setApiKeys(prev => prev.filter(k => k.id !== id));
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

    const handleExportData = async () => {
        await exportUserData(user.username);
    };

    // Render Helpers for Settings
    const renderSettingsNav = () => (
        <div className={`flex overflow-x-auto gap-2 mb-6 pb-2 border-b scrollbar-hide ${isWinamp ? 'border-[#505050]' : isDark ? 'border-white/10' : 'border-black/10'}`}>
            {[
                { id: 'PROFILE', label: 'ПРОФИЛЬ', icon: UserCheck },
                { id: 'COLLECTOR', label: 'КОЛЛЕКЦИОНЕР', icon: Briefcase },
                { id: 'CONTENT', label: 'КОНТЕНТ', icon: Layout },
                { id: 'PRIVACY', label: 'ПРИВАТНОСТЬ', icon: Lock },
                { id: 'NOTIFICATIONS', label: 'УВЕДОМЛЕНИЯ', icon: Bell },
                { id: 'APPEARANCE', label: 'ВИД', icon: Palette },
                { id: 'INTEGRATIONS', label: 'API & ИНТЕГРАЦИИ', icon: Terminal },
                { id: 'DATA', label: 'ДАННЫЕ', icon: Database },
                { id: 'SECURITY', label: 'БЕЗОПАСНОСТЬ', icon: Shield },
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setSettingsCategory(tab.id as any)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${
                        settingsCategory === tab.id 
                        ? (isWinamp ? 'bg-[#00ff00] text-black' : isDark ? 'bg-white text-black' : 'bg-black text-white') 
                        : (isDark ? 'opacity-50 hover:opacity-100 hover:bg-white/5' : 'opacity-50 hover:opacity-100 hover:bg-black/5')
                    }`}
                >
                    <tab.icon size={14} /> {tab.label}
                </button>
            ))}
        </div>
    );

    return (
        <div className={`max-w-4xl mx-auto space-y-4 animate-in slide-in-from-right-8 fade-in duration-500 pb-32 ${isWinamp ? 'font-winamp text-wa-green' : isDark ? 'text-gray-100' : 'text-gray-900'}`}>
            <SEO title={`@${profileUser.username} | Профиль`} />

            {!isWinamp && <button onClick={onBack} className="flex items-center gap-2 hover:underline opacity-70 font-pixel text-xs px-4 md:px-0"><ArrowLeft size={16} /> НАЗАД</button>}
            
            <div className={isWinamp ? '' : `md:rounded-3xl border-b md:border overflow-hidden relative ${isDark ? 'bg-dark-surface border-dark-dim' : 'bg-white border-light-dim'}`}>
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
                            {profileUser.coverUrl ? <img src={profileUser.coverUrl} className="w-full h-full object-cover" /> : <div className={`w-full h-full ${theme === 'dark' ? 'bg-gradient-to-r from-green-900/20 to-black' : 'bg-gradient-to-r from-gray-200 to-gray-400'}`}></div>}
                            {isEditingProfile && isCurrentUser && (
                                <label className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-xl cursor-pointer hover:bg-black/70 border border-white/20 flex items-center gap-2 backdrop-blur-sm"><Camera size={16} /> <span className="text-[10px] font-pixel">ОБЛОЖКА</span><input type="file" accept="image/*" className="hidden" onChange={onProfileCoverUpload} /></label>
                            )}
                        </div>

                        {/* Avatar & Info Container */}
                        <div className="px-4 pb-6 relative">
                            <div className="flex flex-col items-start -mt-10 md:-mt-12 gap-4 mb-2">
                                {/* Avatar */}
                                <div className="relative group">
                                    <div className={`w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden border-4 bg-black shadow-lg ${theme === 'dark' ? 'border-dark-surface' : 'border-white'}`}>
                                        <img src={profileUser.avatarUrl} className="w-full h-full object-cover"/>
                                    </div>
                                    {showOnline && (
                                        <div className={`absolute bottom-2 right-2 w-4 h-4 rounded-full border-2 border-black ${STATUS_OPTIONS[profileUser.status || 'ONLINE'].color.replace('text-', 'bg-')}`}></div>
                                    )}
                                    {isEditingProfile && isCurrentUser && (
                                        <label className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"><Camera size={24} className="text-white" /><input type="file" accept="image/*" className="hidden" onChange={onProfileImageUpload} /></label>
                                    )}
                                </div>

                                {/* Username & Stats */}
                                <div className="flex-1 w-full">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <h2 className="text-2xl md:text-3xl font-pixel font-bold flex items-center gap-2">@{profileUser.username}</h2>
                                            
                                            {/* Extended Info Row */}
                                            <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] font-mono opacity-60">
                                                <span>В сети с {profileUser.joinedDate}</span>
                                                {profileUser.collector && profileUser.collector.yearsCollecting > 0 && (
                                                    <span className={`flex items-center gap-1 border-l pl-3 text-yellow-500 ${isDark ? 'border-white/20' : 'border-black/20'}`}><Crown size={12}/> Стаж: {profileUser.collector.yearsCollecting} лет</span>
                                                )}
                                                {profileUser.extended?.location && (
                                                    <span className={`flex items-center gap-1 border-l pl-3 ${isDark ? 'border-white/20' : 'border-black/20'}`}><MapPin size={12}/> {profileUser.extended.location}</span>
                                                )}
                                                {profileUser.extended?.website && (
                                                    <a href={profileUser.extended.website} target="_blank" rel="noreferrer" className={`flex items-center gap-1 border-l pl-3 hover:text-blue-400 ${isDark ? 'border-white/20' : 'border-black/20'}`}><Globe size={12}/> Website</a>
                                                )}
                                                <div className={`flex items-center gap-2 border-l pl-3 ${isDark ? 'border-white/20' : 'border-black/20'}`}>
                                                    {profileUser.extended?.socialLinks?.instagram && <a href={profileUser.extended.socialLinks.instagram} target="_blank" className="hover:text-pink-500"><Instagram size={12}/></a>}
                                                    {profileUser.extended?.socialLinks?.youtube && <a href={profileUser.extended.socialLinks.youtube} target="_blank" className="hover:text-red-500"><Youtube size={12}/></a>}
                                                    {showTelegram && profileUser.telegram && <a href={`https://t.me/${profileUser.telegram}`} target="_blank" className="hover:text-blue-400"><Send size={12}/></a>}
                                                    {showEmail && profileUser.email && !profileUser.email.includes('@neoarchive.placeholder') && <a href={`mailto:${profileUser.email}`} className="hover:text-green-400"><Mail size={12}/></a>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`flex items-center gap-6 border-t md:border-t-0 pt-3 md:pt-0 ${isDark ? 'border-white/5' : 'border-black/5'}`}>
                                            <button onClick={() => onOpenSocialList(profileUser.username, 'followers')} className="flex flex-col items-center group"><span className="font-pixel text-lg leading-none group-hover:text-green-500">{profileUser.followers?.length || 0}</span><span className="text-[9px] font-pixel opacity-50 uppercase group-hover:opacity-100">Фолловеры</span></button>
                                            <button onClick={() => onOpenSocialList(profileUser.username, 'following')} className="flex flex-col items-center group"><span className="font-pixel text-lg leading-none group-hover:text-green-500">{profileUser.following?.length || 0}</span><span className="text-[9px] font-pixel opacity-50 uppercase group-hover:opacity-100">Подписки</span></button>
                                            <button onClick={onViewHallOfFame} className="flex flex-col items-center group"><Trophy size={18} className="group-hover:text-yellow-500" /><span className="text-[9px] font-pixel opacity-50 uppercase group-hover:opacity-100">Награды</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Bio & Actions */}
                            <div className="space-y-3">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                    <p className="font-mono font-bold text-sm leading-tight">{profileUser.tagline}</p>
                                    <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                                        {isCurrentUser ? (
                                            <>
                                                <button onClick={() => { 
                                                    setEditTagline(user?.tagline || ''); 
                                                    setEditBio(user?.bio || ''); 
                                                    setEditTelegram(user?.telegram || '');
                                                    setEditStatus(user?.status || 'ONLINE');
                                                    setIsEditingProfile(true); 
                                                    setActiveSection('CONFIG');
                                                }} className={`flex-1 md:flex-none px-3 py-1.5 border rounded-lg text-[10px] uppercase font-bold flex items-center justify-center gap-2 ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5 border-black/10'}`}><Edit2 size={12} /> Ред.</button>
                                                <button onClick={onLogout} className="px-3 py-1.5 border border-red-500/30 text-red-500 rounded-lg"><LogOut size={12} /></button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => onFollow(profileUser.username)} className={`flex-1 md:flex-none px-4 py-2 md:py-1.5 rounded-lg font-bold font-pixel text-[10px] uppercase transition-all ${isSubscribed ? 'border border-gray-500 opacity-60' : 'bg-green-500 text-black border-green-500'}`}>{isSubscribed ? 'Подписан' : 'Подписаться'}</button>
                                                <button onClick={() => onChat(profileUser.username)} className={`px-4 py-2 md:py-1.5 border rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5 border-black/10'}`}><MessageSquare size={14} /></button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {profileUser.bio && <p className="font-mono text-xs opacity-70 whitespace-pre-wrap leading-relaxed max-w-2xl">{profileUser.bio}</p>}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* SHOWCASE COMPACT WIDGET */}
            {activeSection === 'SHELF' && !isEditingProfile && showcaseItem && (
                <div className="px-0 md:px-0">
                    <div className={`relative overflow-hidden border rounded-xl flex h-28 md:h-32 group cursor-pointer ${isWinamp ? 'bg-[#191919] border-[#505050]' : isDark ? 'bg-gradient-to-r from-yellow-900/20 to-transparent border-yellow-500/20 hover:border-yellow-500/40' : 'bg-white border-yellow-500/20 shadow-md'}`} onClick={() => onExhibitClick(showcaseItem)}>
                        {/* Compact Image Left */}
                        <div className="w-24 md:w-32 h-full relative flex-shrink-0 bg-black">
                            <img src={showcaseItem.imageUrls[0]} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute top-0 left-0 bg-yellow-500 text-black text-[8px] font-bold px-1.5 py-0.5 rounded-br-lg z-10 font-pixel">
                                <Crown size={8} className="inline mr-0.5"/> SHOWCASE
                            </div>
                        </div>
                        
                        {/* Compact Details Right */}
                        <div className="flex-1 p-3 flex flex-col justify-center min-w-0">
                            <div className={`text-[9px] uppercase tracking-widest mb-1 ${isWinamp ? 'text-[#00ff00]' : 'text-yellow-500 opacity-70'}`}>ГОРДОСТЬ КОЛЛЕКЦИИ</div>
                            <h3 className={`font-pixel text-sm md:text-lg font-bold truncate mb-1 ${isWinamp ? 'text-[#00ff00]' : isDark ? 'text-white' : 'text-black'}`}>{showcaseItem.title}</h3>
                            <div className="flex items-center gap-3 text-[10px] font-mono opacity-50">
                                <span className="flex items-center gap-1"><Heart size={10} className="text-red-500"/> {showcaseItem.likes}</span>
                                <span className="flex items-center gap-1"><Eye size={10} className="text-blue-400"/> {showcaseItem.views}</span>
                                <span className={`truncate max-w-[80px] border px-1 rounded ${isDark ? 'border-white/10' : 'border-black/10'}`}>{showcaseItem.category}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* NAVIGATION TABS */}
            <div className={`flex mb-4 mt-2 px-0 md:px-0 ${isWinamp ? 'gap-1' : `border-b ${isDark ? 'border-gray-500/30' : 'border-gray-200'}`}`}>
                <button onClick={() => setActiveSection('SHELF')} className={`flex-1 pb-3 text-center ${activeSection === 'SHELF' ? 'border-b-2 border-green-500 text-green-500' : 'opacity-50'}`}><Package size={20} className="mx-auto"/></button>
                {isCurrentUser && <button onClick={() => setActiveSection('FAVORITES')} className={`flex-1 pb-3 text-center ${activeSection === 'FAVORITES' ? 'border-b-2 border-green-500 text-green-500' : 'opacity-50'}`}><Heart size={20} className="mx-auto"/></button>}
                <button onClick={() => setActiveSection('LOGS')} className={`flex-1 pb-3 text-center ${activeSection === 'LOGS' ? 'border-b-2 border-green-500 text-green-500' : 'opacity-50'}`}><MessageSquare size={20} className="mx-auto"/></button>
                <button onClick={() => setActiveSection('ANALYTICS')} className={`flex-1 pb-3 text-center ${activeSection === 'ANALYTICS' ? 'border-b-2 border-green-500 text-green-500' : 'opacity-50'}`}><BarChart3 size={20} className="mx-auto"/></button>
                <button onClick={() => setActiveSection('WISHLIST')} className={`flex-1 pb-3 text-center ${activeSection === 'WISHLIST' ? 'border-b-2 border-green-500 text-green-500' : 'opacity-50'}`}><Search size={20} className="mx-auto"/></button>
                {isCurrentUser && <button onClick={() => setActiveSection('CONFIG')} className={`flex-1 pb-3 text-center ${activeSection === 'CONFIG' ? 'border-b-2 border-green-500 text-green-500' : 'opacity-50'}`}><Settings size={20} className="mx-auto"/></button>}
            </div>

            {/* SECTIONS CONTENT */}
            
            {/* ... Shelf, Favorites, Wishlist, Logs (unchanged) ... */}
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

            {activeSection === 'FAVORITES' && isCurrentUser && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 animate-in fade-in px-0 md:px-0">
                    <div className="col-span-full text-[10px] opacity-50 uppercase tracking-widest text-center mb-4 flex items-center justify-center gap-2"><Lock size={12}/> Приватная коллекция</div>
                    {favoritedExhibits.map(item => (
                        <ExhibitCard key={item.id} item={item} theme={theme} onClick={onExhibitClick} isLiked={true} onLike={(e) => onLike(item.id, e)} onAuthorClick={onAuthorClick} />
                    ))}
                    {favoritedExhibits.length === 0 && <div className="col-span-full text-center opacity-50 py-8 text-xs uppercase">Пусто</div>}
                </div>
            )}

            {activeSection === 'WISHLIST' && (
                <div className="space-y-6 animate-in fade-in px-0 md:px-0">
                    <button onClick={handleShareWishlist} className={`w-full flex items-center justify-center gap-2 text-xs font-bold uppercase py-3 rounded-xl border-2 border-dashed ${isWinamp ? 'border-[#00ff00] text-[#00ff00]' : isDark ? 'border-white/20 opacity-80 hover:opacity-100' : 'border-black/20 text-black hover:border-black/40'}`}>
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
                    <div className={`p-4 rounded-xl border flex gap-3 ${isWinamp ? 'bg-[#191919] border-[#505050]' : isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
                        <input ref={guestbookInputRef} value={guestbookInput} onChange={(e) => setGuestbookInput(e.target.value)} placeholder="Оставить запись..." className="flex-1 bg-transparent border-none outline-none text-sm font-mono"/>
                        <button onClick={handleGuestbookSubmit} className="text-green-500"><Send size={16}/></button>
                    </div>
                    <div className="space-y-4">
                        {profileGuestbook.map(entry => (
                            <div key={entry.id} className={`p-4 rounded-xl border ${isWinamp ? 'bg-black border-[#505050]' : isDark ? 'bg-white/5 border-white/10' : 'bg-white border-black/10'}`}>
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

            {/* NEW ANALYTICS SECTION */}
            {activeSection === 'ANALYTICS' && (
                <div className="space-y-6 animate-in fade-in px-0 md:px-0">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-2 md:gap-4">
                        <div className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center ${isWinamp ? 'bg-black border-[#505050]' : isDark ? 'bg-white/5 border-white/10' : 'bg-white border-black/10'}`}>
                            <div className="text-[10px] font-pixel opacity-50 uppercase mb-1">Ценность</div>
                            <div className="text-lg font-bold font-mono">{analyticsData.totalValue} ₽</div>
                        </div>
                        <div className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center ${isWinamp ? 'bg-black border-[#505050]' : isDark ? 'bg-white/5 border-white/10' : 'bg-white border-black/10'}`}>
                            <div className="text-[10px] font-pixel opacity-50 uppercase mb-1">Лайки</div>
                            <div className="text-lg font-bold font-mono">{analyticsData.totalLikes}</div>
                        </div>
                        <div className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center ${isWinamp ? 'bg-black border-[#505050]' : isDark ? 'bg-white/5 border-white/10' : 'bg-white border-black/10'}`}>
                            <div className="text-[10px] font-pixel opacity-50 uppercase mb-1">Артефакты</div>
                            <div className="text-lg font-bold font-mono">{analyticsData.totalItems}</div>
                        </div>
                    </div>

                    {/* Category Distribution */}
                    <div className={`p-6 rounded-xl border ${isWinamp ? 'bg-black border-[#505050]' : isDark ? 'bg-white/5 border-white/10' : 'bg-white border-black/10'}`}>
                        <h3 className="font-pixel text-[10px] opacity-50 uppercase tracking-widest mb-6 flex items-center gap-2"><PieChart size={14}/> Распределение по категориям</h3>
                        <div className="space-y-4">
                            {analyticsData.categoryData.length === 0 && <div className="text-center opacity-30 text-[10px]">Нет данных</div>}
                            {analyticsData.categoryData.map((cat, i) => (
                                <div key={cat.label}>
                                    <div className="flex justify-between text-[10px] font-mono mb-1">
                                        <span>{cat.label}</span>
                                        <span>{cat.count} ({cat.pct.toFixed(1)}%)</span>
                                    </div>
                                    <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-black/10'}`}>
                                        <div 
                                            className={`h-full ${isWinamp ? 'bg-[#00ff00]' : 'bg-green-500'}`} 
                                            style={{ width: `${cat.pct}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Activity Heatmap (Mocked visual) */}
                    <div className={`p-6 rounded-xl border ${isWinamp ? 'bg-black border-[#505050]' : isDark ? 'bg-white/5 border-white/10' : 'bg-white border-black/10'}`}>
                        <h3 className="font-pixel text-[10px] opacity-50 uppercase tracking-widest mb-6 flex items-center gap-2"><BarChart3 size={14}/> Активность (Год)</h3>
                        <div className="flex gap-1 flex-wrap justify-center opacity-50">
                            {Array.from({length: 52}).map((_, i) => (
                                <div key={i} className="flex flex-col gap-1">
                                    {Array.from({length: 7}).map((_, j) => {
                                        const intensity = Math.random() > 0.8 ? (Math.random() > 0.5 ? 'bg-green-500' : 'bg-green-900') : (isDark ? 'bg-white/5' : 'bg-black/5');
                                        return <div key={j} className={`w-2 h-2 rounded-sm ${intensity}`}></div>
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {isCurrentUser && activeSection === 'CONFIG' && (
                <div className={`animate-in fade-in rounded-xl overflow-hidden mx-0 md:mx-0 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
                    {/* Settings Navigation */}
                    <div className={`p-4 border-b ${isDark ? 'bg-black/20 border-white/10' : 'bg-white/20 border-black/10'}`}>
                        {renderSettingsNav()}
                        
                        {/* ... Existing Profiles, Content, Collector sections ... */}
                        {settingsCategory === 'PROFILE' && (
                            <div className="space-y-4 animate-in slide-in-from-right-4">
                                <h3 className="font-pixel text-[10px] opacity-50 uppercase tracking-widest mb-4 block">Основное</h3>
                                <input value={editTagline} onChange={(e) => setEditTagline(e.target.value)} className={`w-full border rounded-lg px-3 py-2 font-mono text-xs focus:border-green-500 outline-none ${isDark ? 'bg-black/20 border-white/10' : 'bg-white border-black/10'}`} placeholder="Статус / Слоган" />
                                <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} rows={3} className={`w-full border rounded-lg px-3 py-2 font-mono text-xs focus:border-green-500 outline-none resize-none ${isDark ? 'bg-black/20 border-white/10' : 'bg-white border-black/10'}`} placeholder="О себе..." />
                                
                                <h3 className="font-pixel text-[10px] opacity-50 uppercase tracking-widest mb-4 block mt-6">Расширенная информация</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className={`flex items-center gap-2 border-b pb-1 ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                                        <MapPin size={14} className="opacity-50"/>
                                        <input value={localExtended.location || ''} onChange={(e) => setLocalExtended({...localExtended, location: e.target.value})} className="bg-transparent w-full text-xs outline-none" placeholder="Город" />
                                    </div>
                                    <div className={`flex items-center gap-2 border-b pb-1 ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                                        <Globe size={14} className="opacity-50"/>
                                        <input value={localExtended.website || ''} onChange={(e) => setLocalExtended({...localExtended, website: e.target.value})} className="bg-transparent w-full text-xs outline-none" placeholder="Website URL" />
                                    </div>
                                    <div className={`flex items-center gap-2 border-b pb-1 ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                                        <Send size={14} className="opacity-50"/>
                                        <input value={editTelegram} onChange={(e) => setEditTelegram(e.target.value.replace('@', ''))} className="bg-transparent w-full text-xs outline-none" placeholder="Telegram username" />
                                    </div>
                                    <div className={`flex items-center gap-2 border-b pb-1 ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                                        <Instagram size={14} className="opacity-50"/>
                                        <input value={localExtended.socialLinks?.instagram || ''} onChange={(e) => setLocalExtended({...localExtended, socialLinks: {...localExtended.socialLinks, instagram: e.target.value}})} className="bg-transparent w-full text-xs outline-none" placeholder="Instagram URL" />
                                    </div>
                                    <div className={`flex items-center gap-2 border-b pb-1 ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                                        <Youtube size={14} className="opacity-50"/>
                                        <input value={localExtended.socialLinks?.youtube || ''} onChange={(e) => setLocalExtended({...localExtended, socialLinks: {...localExtended.socialLinks, youtube: e.target.value}})} className="bg-transparent w-full text-xs outline-none" placeholder="Youtube URL" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {settingsCategory === 'COLLECTOR' && (
                            <div className="space-y-4 animate-in slide-in-from-right-4">
                                <h3 className="font-pixel text-[10px] opacity-50 uppercase tracking-widest mb-4 block">Данные коллекционера</h3>
                                <div className={`p-4 border rounded-xl space-y-4 ${isDark ? 'bg-black/20 border-white/10' : 'bg-white border-black/10'}`}>
                                    <div>
                                        <label className="text-[10px] opacity-50 uppercase tracking-widest mb-1 block">Основная специализация</label>
                                        <input value={localCollector.specialization || ''} onChange={(e) => setLocalCollector({...localCollector, specialization: e.target.value})} className={`w-full bg-transparent border-b py-1 text-xs outline-none focus:border-green-500 ${isDark ? 'border-white/10' : 'border-black/10'}`} placeholder="Например: Nintendo, Apple, VHS..." />
                                    </div>
                                    <div>
                                        <label className="text-[10px] opacity-50 uppercase tracking-widest mb-1 block">Стаж (Лет)</label>
                                        <input type="number" value={localCollector.yearsCollecting || ''} onChange={(e) => setLocalCollector({...localCollector, yearsCollecting: parseInt(e.target.value) || 0})} className={`w-full bg-transparent border-b py-1 text-xs outline-none focus:border-green-500 ${isDark ? 'border-white/10' : 'border-black/10'}`} placeholder="0" />
                                    </div>
                                    <div className="pt-2">
                                        <h4 className="text-[10px] opacity-50 uppercase tracking-widest mb-2">Статус торговли</h4>
                                        <div className="space-y-2">
                                            <SettingsToggle theme={theme} label="Открыт к обмену" checked={localCollector.openToTrade} onChange={(v) => setLocalCollector({...localCollector, openToTrade: v})} />
                                            <SettingsToggle theme={theme} label="Покупаю артефакты" checked={localCollector.openToBuy} onChange={(v) => setLocalCollector({...localCollector, openToBuy: v})} />
                                            <SettingsToggle theme={theme} label="Продаю из коллекции" checked={localCollector.openToSell} onChange={(v) => setLocalCollector({...localCollector, openToSell: v})} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {settingsCategory === 'CONTENT' && (
                            <div className="space-y-4 animate-in slide-in-from-right-4">
                                <h3 className="font-pixel text-[10px] opacity-50 uppercase tracking-widest mb-4 block">Настройки ленты</h3>
                                <div className="space-y-2">
                                    <div className={`p-3 border rounded-lg flex justify-between items-center ${isDark ? 'border-white/5' : 'border-black/5'}`}>
                                        <span className="text-xs font-mono">Вид по умолчанию</span>
                                        <div className="flex bg-black/30 rounded p-1 gap-1">
                                            <button onClick={() => setLocalFeed({...localFeed, defaultView: 'GRID'})} className={`px-2 py-1 text-[10px] rounded ${localFeed.defaultView === 'GRID' ? 'bg-white text-black' : 'opacity-50 text-white'}`}>GRID</button>
                                            <button onClick={() => setLocalFeed({...localFeed, defaultView: 'LIST'})} className={`px-2 py-1 text-[10px] rounded ${localFeed.defaultView === 'LIST' ? 'bg-white text-black' : 'opacity-50 text-white'}`}>LIST</button>
                                        </div>
                                    </div>
                                    <SettingsToggle theme={theme} label="Автовоспроизведение видео" checked={localFeed.autoplayVideos} onChange={(v) => setLocalFeed({...localFeed, autoplayVideos: v})} />
                                    <SettingsToggle theme={theme} label="Скрывать NSFW контент" checked={localFeed.hideNSFW} onChange={(v) => setLocalFeed({...localFeed, hideNSFW: v})} />
                                    <SettingsToggle theme={theme} label="Скрывать спойлеры" checked={localFeed.hideSpoilers} onChange={(v) => setLocalFeed({...localFeed, hideSpoilers: v})} />
                                    <SettingsToggle theme={theme} label="Компактный режим" checked={localFeed.compactMode} onChange={(v) => setLocalFeed({...localFeed, compactMode: v})} />
                                </div>
                            </div>
                        )}

                        {settingsCategory === 'PRIVACY' && (
                            <div className="space-y-4 animate-in slide-in-from-right-4">
                                <h3 className="font-pixel text-[10px] opacity-50 uppercase tracking-widest mb-4 block">Приватность</h3>
                                <div className="space-y-2">
                                    <SettingsToggle theme={theme} label="Показывать Email" checked={localPrivacy.showEmail} onChange={(v) => setLocalPrivacy({...localPrivacy, showEmail: v})} />
                                    <SettingsToggle theme={theme} label="Показывать Telegram" checked={localPrivacy.showTelegram} onChange={(v) => setLocalPrivacy({...localPrivacy, showTelegram: v})} />
                                    <SettingsToggle theme={theme} label="Открытая гостевая книга" checked={localPrivacy.allowGuestbook} onChange={(v) => setLocalPrivacy({...localPrivacy, allowGuestbook: v})} />
                                    <SettingsToggle theme={theme} label="Показывать статус онлайн" checked={localPrivacy.showOnlineStatus} onChange={(v) => setLocalPrivacy({...localPrivacy, showOnlineStatus: v})} />
                                    
                                    <div className={`p-3 border rounded-lg flex justify-between items-center ${isDark ? 'border-white/5' : 'border-black/5'}`}>
                                        <span className="text-xs font-mono">Личные сообщения</span>
                                        <select 
                                            value={localPrivacy.allowDirectMessages}
                                            onChange={(e) => setLocalPrivacy({...localPrivacy, allowDirectMessages: e.target.value as any})}
                                            className="bg-black/30 text-white border border-white/10 rounded px-2 py-1 text-xs"
                                        >
                                            <option value="EVERYONE">Все</option>
                                            <option value="FRIENDS">Только друзья</option>
                                            <option value="NONE">Никто</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {settingsCategory === 'NOTIFICATIONS' && (
                            <div className="space-y-4 animate-in slide-in-from-right-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-pixel text-[10px] opacity-50 uppercase tracking-widest block">Уведомления</h3>
                                    <SettingsToggle theme={theme} label="Включить" checked={localNotifs.enabled} onChange={(v) => setLocalNotifs({...localNotifs, enabled: v})} />
                                </div>
                                
                                {localNotifs.enabled && (
                                    <div className={`space-y-2 pl-2 border-l ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                                        <SettingsToggle theme={theme} label="Лайки" checked={localNotifs.types.likes} onChange={(v) => setLocalNotifs({...localNotifs, types: {...localNotifs.types, likes: v}})} />
                                        <SettingsToggle theme={theme} label="Комментарии" checked={localNotifs.types.comments} onChange={(v) => setLocalNotifs({...localNotifs, types: {...localNotifs.types, comments: v}})} />
                                        <SettingsToggle theme={theme} label="Новые подписчики" checked={localNotifs.types.follows} onChange={(v) => setLocalNotifs({...localNotifs, types: {...localNotifs.types, follows: v}})} />
                                        <SettingsToggle theme={theme} label="Сообщения" checked={localNotifs.types.messages} onChange={(v) => setLocalNotifs({...localNotifs, types: {...localNotifs.types, messages: v}})} />
                                        <SettingsToggle theme={theme} label="Сделки / Трейды" checked={localNotifs.types.trades} onChange={(v) => setLocalNotifs({...localNotifs, types: {...localNotifs.types, trades: v}})} />
                                    </div>
                                )}
                            </div>
                        )}

                        {settingsCategory === 'APPEARANCE' && (
                            <div className="space-y-4 animate-in slide-in-from-right-4">
                                <h3 className="font-pixel text-[10px] opacity-50 uppercase tracking-widest mb-4 block">Тема оформления</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={() => updateTheme('dark')} className={`p-4 border rounded hover:bg-white/10 text-xs ${localSettings.theme === 'dark' ? 'border-green-500 text-green-500' : 'border-white/10'}`}>Matrix (Dark)</button>
                                    <button onClick={() => updateTheme('light')} className={`p-4 border rounded hover:bg-black/10 text-xs ${localSettings.theme === 'light' ? 'border-green-500 text-green-500' : 'border-black/10'}`}>Office (Light)</button>
                                    <button onClick={() => updateTheme('xp')} className={`p-4 border rounded hover:bg-white/10 text-xs ${localSettings.theme === 'xp' ? 'border-green-500 text-green-500' : 'border-white/10'}`}>Windows XP</button>
                                    <button onClick={() => updateTheme('winamp')} className={`p-4 border rounded hover:bg-white/10 text-xs ${localSettings.theme === 'winamp' ? 'border-green-500 text-green-500' : 'border-white/10'}`}>Winamp Classic</button>
                                </div>
                            </div>
                        )}

                        {/* NEW INTEGRATIONS SECTION */}
                        {settingsCategory === 'INTEGRATIONS' && (
                            <div className="space-y-6 animate-in slide-in-from-right-4">
                                <div>
                                    <h3 className="font-pixel text-[10px] opacity-50 uppercase tracking-widest mb-4 block">Ключи разработчика (API)</h3>
                                    <p className="text-[10px] opacity-60 mb-4 font-mono">Используйте ключи для интеграции с внешними приложениями. Никому не сообщайте их.</p>
                                    
                                    <div className="space-y-3 mb-4">
                                        {apiKeys.length === 0 && <div className={`text-center opacity-30 text-[10px] border border-dashed rounded p-4 ${isDark ? 'border-white/10' : 'border-black/10'}`}>Нет активных ключей</div>}
                                        {apiKeys.map(key => (
                                            <div key={key.id} className={`p-3 border rounded flex justify-between items-center ${isDark ? 'bg-black/20 border-white/10' : 'bg-white border-black/10'}`}>
                                                <div>
                                                    <div className="text-[10px] font-bold text-green-500">{key.name}</div>
                                                    <div className="text-[10px] font-mono opacity-50 blur-sm hover:blur-none transition-all cursor-text">{key.key}</div>
                                                </div>
                                                <button onClick={() => handleDeleteApiKey(key.id)} className="text-red-500 hover:bg-red-500/10 p-2 rounded"><Trash2 size={14}/></button>
                                            </div>
                                        ))}
                                    </div>

                                    <button onClick={handleGenerateApiKey} className="w-full py-3 border border-green-500/30 text-green-500 rounded font-bold text-xs uppercase hover:bg-green-500/10 flex items-center justify-center gap-2">
                                        <Key size={14}/> Сгенерировать новый ключ
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* NEW DATA SECTION */}
                        {settingsCategory === 'DATA' && (
                            <div className="space-y-6 animate-in slide-in-from-right-4">
                                <div>
                                    <h3 className="font-pixel text-[10px] opacity-50 uppercase tracking-widest mb-4 block">Экспорт данных</h3>
                                    <p className="text-[10px] opacity-60 mb-4 font-mono">Скачать полный архив вашего профиля, коллекций и предметов в формате JSON.</p>
                                    <button onClick={handleExportData} className={`w-full py-4 border rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-black/5 border-black/10 hover:bg-black/10'}`}>
                                        <Download size={16}/> Скачать архив
                                    </button>
                                </div>
                            </div>
                        )}

                        {settingsCategory === 'SECURITY' && (
                            <div className="space-y-6 animate-in slide-in-from-right-4">
                                <div>
                                    <h3 className="font-pixel text-[10px] opacity-50 uppercase tracking-widest mb-4 block text-yellow-500">Смена пароля</h3>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <input 
                                                type={showPassword ? "text" : "password"}
                                                value={editPassword} 
                                                onChange={(e) => setEditPassword(e.target.value)} 
                                                className={`w-full border rounded-lg px-3 py-2 font-mono text-xs focus:border-yellow-500 outline-none ${isDark ? 'bg-black/20 border-white/10' : 'bg-white border-black/10'}`}
                                                placeholder="Новый пароль..."
                                            />
                                            <button onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100">
                                                {showPassword ? <Eye size={14} /> : <EyeOff size={14} />}
                                            </button>
                                        </div>
                                        <button onClick={generateSecurePassword} className={`px-3 py-2 rounded-lg ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-black/10 hover:bg-black/20'}`} title="Сгенерировать">
                                            <Wand2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Active Sessions Mock UI */}
                                <div>
                                    <h3 className="font-pixel text-[10px] opacity-50 uppercase tracking-widest mb-4 block">Активные сессии</h3>
                                    <div className="space-y-2">
                                        <div className="p-3 bg-green-900/10 border border-green-500/30 rounded flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Laptop size={16} className="text-green-500"/>
                                                <div>
                                                    <div className={`text-[10px] font-bold ${isDark ? 'text-white' : 'text-black'}`}>Chrome on Windows</div>
                                                    <div className="text-[8px] opacity-50">Москва, RU • Текущая сессия</div>
                                                </div>
                                            </div>
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                        </div>
                                        <div className={`p-3 border rounded flex items-center justify-between opacity-50 ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
                                            <div className="flex items-center gap-3">
                                                <Smartphone size={16}/>
                                                <div>
                                                    <div className={`text-[10px] font-bold ${isDark ? 'text-white' : 'text-black'}`}>Safari on iPhone</div>
                                                    <div className="text-[8px] opacity-50">Москва, RU • 2 часа назад</div>
                                                </div>
                                            </div>
                                            <button className="text-[8px] text-red-500 border border-red-500/30 px-2 py-1 rounded hover:bg-red-500/10">ВЫЙТИ</button>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className={`pt-6 border-t ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                                    <h3 className="font-pixel text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2 text-red-500"><AlertTriangle size={14}/> Danger Zone</h3>
                                    <button onClick={handleHardReset} className="w-full py-4 border-2 border-red-500/50 text-red-500 rounded-xl hover:bg-red-500/10 font-bold text-xs uppercase flex items-center justify-center gap-2">
                                        <RefreshCw size={16}/> HARD RESET APP
                                    </button>
                                    <p className="text-[10px] opacity-50 mt-2 text-center">Очистка локального кэша и перезагрузка приложения.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action Footer */}
                    <div className={`p-4 flex gap-2 ${isDark ? 'bg-black/40' : 'bg-black/5'}`}>
                        <button onClick={handleSaveExtended} className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg font-bold text-xs uppercase hover:bg-green-500 transition-all">Сохранить изменения</button>
                        <button onClick={() => setIsEditingProfile(false)} className={`px-6 py-3 rounded-lg border text-xs uppercase ${isDark ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'}`}>Отмена</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserProfileView;

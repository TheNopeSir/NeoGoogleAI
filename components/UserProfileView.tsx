import React, { useState, useEffect, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';

const APP_ORIGIN = Capacitor.isNativePlatform() ? 'https://neoarchive.ru' : window.location.origin;
import {
    ArrowLeft, Edit2, LogOut, MessageSquare, Send, Trophy,
    Trash2, Wand2, Eye, EyeOff, Camera, Palette, Settings,
    Search, Terminal, Sun, Package, Heart, Link as LinkIcon,
    AlertTriangle, RefreshCw, Crown, AlertCircle, Mail, Key, Bell,
    BookOpen, Check, Truck
} from 'lucide-react';
import { UserProfile, Exhibit, Collection, GuestbookEntry, UserStatus, AppSettings, WishlistItem, TradeRequest } from '../types';
import { STATUS_OPTIONS } from '../constants';
import * as db from '../services/storageService';
import { getUserAvatar, subscribeToPush, unsubscribeFromPush } from '../services/storageService';
import WishlistCard from './WishlistCard';
import { ExhibitCard } from './ExhibitCard';
import CollectionCard from './CollectionCard';
import SEO from './SEO';
import ShipmentsView from './ShipmentsView';
import XI from './XI';

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
    onReact: (id: string) => void;
    onAuthorClick: (author: string) => void;
    onCollectionClick: (col: Collection) => void;
    onShareCollection: (col: Collection) => void;
    onViewHallOfFame: (username: string) => void;
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
    allUsers: UserProfile[];
    tradeRequests?: TradeRequest[];
}

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
    onBack, onLogout, onFollow, onChat, onExhibitClick, onReact, onAuthorClick, 
    onCollectionClick, onShareCollection, onViewHallOfFame, onGuestbookPost, 
    isEditingProfile, setIsEditingProfile, editTagline, setEditTagline, editBio, setEditBio, editStatus, setEditStatus, editTelegram, setEditTelegram, 
    editPassword, setEditPassword,
    onSaveProfile, onProfileImageUpload, onProfileCoverUpload, guestbookInput, setGuestbookInput, guestbookInputRef, profileTab, setProfileTab, refreshData,
    onOpenSocialList, onThemeChange, onWishlistClick, allUsers, tradeRequests = []
}) => {
    const profileUser = allUsers.find(u => u.username === viewedProfileUsername) || { 
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

    const currentUserRealtime = allUsers.find(u => u.username === user.username) || user;
    const isCurrentUser = user?.username === viewedProfileUsername;
    const isSubscribed = currentUserRealtime?.following?.includes(viewedProfileUsername) || false;
    
    const isWinamp = theme === 'winamp';
    const isPlaceholderEmail = user.email?.includes('placeholder') || user.email?.includes('tg_');

    const [activeSection, setActiveSection] = useState<'SHELF' | 'FAVORITES' | 'LOGS' | 'CONFIG' | 'WISHLIST'>('SHELF');
    const [localProfileTab, setLocalProfileTab] = useState<'ARTIFACTS' | 'COLLECTIONS'>('ARTIFACTS');
    const [showPassword, setShowPassword] = useState(false);
    const [localSettings, setLocalSettings] = useState<AppSettings>(user?.settings || { theme: 'dark' });
    const [editEmail, setEditEmail] = useState(user.email);
    const [pushEnabled, setPushEnabled] = useState(false);
    const [passwordRequestSent, setPasswordRequestSent] = useState(false);
    const [emailRequestSent, setEmailRequestSent] = useState(false);
    const [editTgChannel, setEditTgChannel] = useState(user.tgChannel || '');

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            navigator.serviceWorker.ready.then(reg => {
                reg.pushManager.getSubscription().then(sub => setPushEnabled(!!sub));
            });
        }
    }, []);

    const userExhibits = exhibits.filter(e => e.owner === viewedProfileUsername);
    const userCollections = collections.filter(c => c.owner === viewedProfileUsername);
    const wishlistItems = db.getFullDatabase().wishlist.filter(w => w.owner === viewedProfileUsername);
    const favoritedExhibits = exhibits.filter(e => e.likedBy?.includes(viewedProfileUsername));
    const profileGuestbook = guestbook.filter(g => g.targetUser.toLowerCase() === viewedProfileUsername.toLowerCase()).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const publishedExhibits = userExhibits.filter(e => !e.isDraft);

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

        // Save non-sensitive fields directly
        const updated = {
            ...user,
            tagline: editTagline,
            bio: editBio,
            status: editStatus,
            telegram: editTelegram,
            tgChannel: editTgChannel,
        };
        await db.updateUserProfile(updated);

        let hasPending = false;

        // Password change → send confirmation email
        if (editPassword) {
            try {
                await db.requestPasswordChange(user.username, editPassword);
                setPasswordRequestSent(true);
                hasPending = true;
            } catch (err: any) {
                alert('Ошибка при запросе смены пароля: ' + (err.message || 'Неизвестная ошибка'));
                return;
            }
        }

        // Email change → send confirmation email to new address
        if (editEmail && editEmail !== user.email) {
            try {
                await db.requestEmailChange(user.username, editEmail);
                setEmailRequestSent(true);
                hasPending = true;
            } catch (err: any) {
                alert('Ошибка при запросе смены email: ' + (err.message || 'Неизвестная ошибка'));
                return;
            }
        }

        setEditPassword('');

        // Close form only if no confirmation emails were sent
        if (!hasPending) {
            setIsEditingProfile(false);
        }
    };

    const handleGuestbookSubmit = () => {
        if (!guestbookInput.trim()) return;
        onGuestbookPost(guestbookInput);
        setGuestbookInput('');
    };

    const handleShareWishlist = () => {
        const url = `${APP_ORIGIN}/u/${viewedProfileUsername}/wishlist`;
        navigator.clipboard.writeText(url);
        alert('Ссылка скопирована!');
    };

    const handleHardReset = async () => {
        if (!confirm("ВНИМАНИЕ! Это полностью очистит локальный кэш.")) return;
        await db.clearLocalCache();
        window.location.reload();
    };

    const togglePush = async () => {
        if (pushEnabled) {
            await unsubscribeFromPush();
            setPushEnabled(false);
        } else {
            const success = await subscribeToPush(user.username);
            if (success) {
                setPushEnabled(true);
                alert("Уведомления включены!");
            } else {
                alert("Не удалось включить уведомления. Проверьте настройки браузера.");
            }
        }
    };

    return (
        <div className={`max-w-4xl mx-auto space-y-4 animate-in slide-in-from-right-8 fade-in duration-500 pb-32 px-4 ${isWinamp ? 'font-winamp text-wa-green' : ''}`}>
            <SEO title={`@${profileUser.username} | NeoArchive`} />

            {!isWinamp && <button onClick={onBack} className="flex items-center gap-2 hover:underline opacity-70 font-pixel text-xs px-2 md:px-0"><XI icon={ArrowLeft} size={16} /> НАЗАД</button>}
            
            <div className={isWinamp ? '' : `md:rounded-3xl border-b md:border overflow-hidden relative ${theme === 'dark' ? 'bg-dark-surface border-dark-dim' : 'bg-white border-light-dim'}`}>
                {isWinamp ? (
                    <WinampWindow title={`USER: ${profileUser.username}`}>
                        <div className="flex gap-4 items-start">
                            <div className="w-20 h-20 border-2 border-inset border-[#505050] p-1 bg-black">
                                <img src={getUserAvatar(profileUser.username)} className="w-full h-full object-cover grayscale opacity-80 hover:opacity-100" />
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
                        <div className="h-32 md:h-52 bg-gray-800 relative group">
                            {profileUser.coverUrl ? <img src={profileUser.coverUrl} className="w-full h-full object-cover" /> : <div className={`w-full h-full ${theme === 'dark' ? 'bg-gradient-to-r from-green-900/20 to-black' : 'bg-gradient-to-r from-gray-100 to-gray-300'}`}></div>}
                            {isEditingProfile && isCurrentUser && (
                                <label className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-xl cursor-pointer hover:bg-black/70 border border-white/20 flex items-center gap-2 backdrop-blur-sm"><XI icon={Camera} size={16} /> <span className="text-[10px] font-pixel">ОБЛОЖКА</span><input type="file" accept="image/*" className="hidden" onChange={onProfileCoverUpload} /></label>
                            )}
                        </div>

                        <div className="px-4 pb-6 relative">
                            <div className="flex flex-col items-start -mt-10 md:-mt-12 gap-4 mb-2">
                                <div className="relative group">
                                    <div className={`w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden border-4 bg-black shadow-lg ${theme === 'dark' ? 'border-dark-surface' : 'border-white'}`}>
                                        <img src={getUserAvatar(profileUser.username)} className="w-full h-full object-cover"/>
                                    </div>
                                    {isEditingProfile && isCurrentUser && (
                                        <label className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"><XI icon={Camera} size={24} className="text-white" /><input type="file" accept="image/*" className="hidden" onChange={onProfileImageUpload} /></label>
                                    )}
                                </div>

                                <div className="flex-1 w-full">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <h2 className="text-2xl md:text-3xl font-pixel font-bold flex items-center gap-2">@{profileUser.username}</h2>
                                            <div className="flex items-center gap-3 mt-1">
                                                <p className="text-xs font-mono opacity-60">В сети с {profileUser.joinedDate}</p>
                                                {(() => { const s = STATUS_OPTIONS[profileUser.status || 'ONLINE']; const Icon = s.icon; return <span className={`inline-flex items-center gap-1 text-xs font-mono ${s.color}`}><Icon size={10} /> {s.label}</span>; })()}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6 border-t md:border-t-0 border-white/5 pt-3 md:pt-0">
                                            <button onClick={() => onOpenSocialList(profileUser.username, 'followers')} className="flex flex-col items-center group"><span className="font-pixel text-lg leading-none group-hover:text-green-500">{profileUser.followers?.length || 0}</span><span className="text-[9px] font-pixel opacity-50 uppercase group-hover:opacity-100">Фолловеры</span></button>
                                            <button onClick={() => onOpenSocialList(profileUser.username, 'following')} className="flex flex-col items-center group"><span className="font-pixel text-lg leading-none group-hover:text-green-500">{profileUser.following?.length || 0}</span><span className="text-[9px] font-pixel opacity-50 uppercase group-hover:opacity-100">Подписки</span></button>
                                            <button onClick={() => onViewHallOfFame(viewedProfileUsername)} className="flex flex-col items-center group"><XI icon={Trophy} size={18} className="group-hover:text-yellow-500" /><span className="text-[9px] font-pixel opacity-50 uppercase group-hover:opacity-100">Награды</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                {isEditingProfile && isCurrentUser ? (
                                    <div className="space-y-4 bg-black/5 p-4 rounded-xl border border-dashed border-white/10">
                                        {isPlaceholderEmail && (
                                            <div className="bg-red-500/10 border border-red-500/50 p-3 rounded-lg flex items-start gap-3">
                                                <XI icon={AlertCircle} size={20} className="text-red-500 flex-shrink-0" />
                                                <div>
                                                    <h3 className="text-red-500 font-bold text-xs mb-1">НЕОБХОДИМО ПРИВЯЗАТЬ EMAIL</h3>
                                                    <p className="text-[10px] opacity-70">
                                                        Вы вошли через Telegram. Ваш текущий email - временный. Установите реальный email и пароль, чтобы иметь возможность входа через форму.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                        {/* ... (Existing form fields) ... */}
                                        <div>
                                            <label className="text-[10px] font-pixel opacity-50 uppercase tracking-widest mb-1 block">Статус / Слоган</label>
                                            <input value={editTagline} onChange={(e) => setEditTagline(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs focus:border-green-500 outline-none"/>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-pixel opacity-50 uppercase tracking-widest mb-1 block">О себе</label>
                                            <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} rows={3} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs focus:border-green-500 outline-none resize-none"/>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-pixel opacity-50 uppercase tracking-widest mb-1 flex items-center gap-2">✈️ Telegram (личный)</label>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-xs opacity-40 font-mono pl-1">@</span>
                                                    <input
                                                        value={editTelegram}
                                                        onChange={(e) => setEditTelegram(e.target.value.replace(/^@/, ''))}
                                                        placeholder="username"
                                                        className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs focus:border-blue-500 outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-pixel opacity-50 uppercase tracking-widest mb-1 flex items-center gap-2">📢 Telegram-канал</label>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-xs opacity-40 font-mono pl-1">@</span>
                                                    <input
                                                        value={editTgChannel}
                                                        onChange={(e) => setEditTgChannel(e.target.value.replace(/^@/, ''))}
                                                        placeholder="channel_name"
                                                        className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs focus:border-blue-500 outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-pixel opacity-50 uppercase tracking-widest mb-2 block">Статус присутствия</label>
                                            <div className="flex flex-wrap gap-2">
                                                {(Object.entries(STATUS_OPTIONS) as [UserStatus, typeof STATUS_OPTIONS[keyof typeof STATUS_OPTIONS]][]).map(([key, opt]) => {
                                                    const Icon = opt.icon;
                                                    return (
                                                        <button key={key} onClick={() => setEditStatus(key as UserStatus)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${editStatus === key ? `${opt.color} border-current bg-white/10` : 'opacity-40 border-white/10 hover:opacity-70'}`}>
                                                            <Icon size={12} /> {opt.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-white/5">
                                            <div>
                                                <label className="text-[10px] font-pixel opacity-50 uppercase tracking-widest mb-1 flex items-center gap-2"><XI icon={Mail} size={12}/> Email</label>
                                                <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs focus:border-green-500 outline-none"/>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-pixel opacity-50 uppercase tracking-widest mb-1 flex items-center gap-2"><XI icon={Key} size={12}/> Новый пароль</label>
                                                <div className="flex gap-2">
                                                    <input value={editPassword} onChange={(e) => setEditPassword(e.target.value)} type={showPassword ? "text" : "password"} placeholder="Изменить пароль..." className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs focus:border-green-500 outline-none"/>
                                                    <button onClick={() => setShowPassword(!showPassword)} className="p-2 border rounded-lg hover:bg-white/10"><XI icon={Eye} size={14}/></button>
                                                    <button onClick={generateSecurePassword} className="p-2 border rounded-lg hover:bg-white/10"><XI icon={Wand2} size={14}/></button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <button onClick={handleSaveProfileExtended} className="flex-1 bg-green-600 text-white px-4 py-2 rounded font-bold text-xs uppercase">Сохранить</button>
                                            <button onClick={() => { setIsEditingProfile(false); setPasswordRequestSent(false); setEmailRequestSent(false); }} className="px-4 py-2 rounded border hover:bg-white/10 text-xs uppercase">Отмена</button>
                                        </div>
                                        {passwordRequestSent && (
                                            <div className="flex items-start gap-2 bg-green-500/10 border border-green-500/40 p-3 rounded-lg text-xs">
                                                <XI icon={Check} size={14} className="text-green-500 mt-0.5 flex-shrink-0"/>
                                                <span className="opacity-90">Письмо с подтверждением смены <strong>пароля</strong> отправлено на вашу почту. Проверьте входящие.</span>
                                            </div>
                                        )}
                                        {emailRequestSent && (
                                            <div className="flex items-start gap-2 bg-green-500/10 border border-green-500/40 p-3 rounded-lg text-xs">
                                                <XI icon={Check} size={14} className="text-green-500 mt-0.5 flex-shrink-0"/>
                                                <span className="opacity-90">Письмо с подтверждением нового <strong>email</strong> отправлено на <strong>{editEmail}</strong>. Текущий email останется прежним до подтверждения.</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                            <p className="font-mono font-bold text-sm leading-tight">{profileUser.tagline}</p>
                                            <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                                                {isCurrentUser ? (
                                                    <>
                                                        <button onClick={() => { setEditTagline(user?.tagline || ''); setEditBio(user?.bio || ''); setEditEmail(user?.email || ''); setIsEditingProfile(true); }} className="flex-1 md:flex-none px-3 py-1.5 border rounded-lg text-[10px] uppercase font-bold hover:bg-white/10 flex items-center justify-center gap-2"><XI icon={Edit2} size={12} /> Ред.</button>
                                                        <button onClick={onLogout} className="px-3 py-1.5 border border-red-500/30 text-red-500 rounded-lg"><XI icon={LogOut} size={12} /></button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button onClick={() => onFollow(profileUser.username)} className={`flex-1 md:flex-none px-4 py-2 md:py-1.5 rounded-lg font-bold font-pixel text-[10px] uppercase transition-all ${isSubscribed ? 'border border-white/20 opacity-60' : 'bg-green-500 text-black border-green-500'}`}>{isSubscribed ? 'Подписан' : 'Подписаться'}</button>
                                                        <button onClick={() => onChat(profileUser.username)} className="px-4 py-2 md:py-1.5 border rounded-lg hover:bg-white/10"><XI icon={MessageSquare} size={14} /></button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {profileUser.bio && <p className="font-mono text-xs opacity-70 whitespace-pre-wrap leading-relaxed max-w-2xl">{profileUser.bio}</p>}
                                        {(profileUser.telegram || profileUser.tgChannel) && (
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {profileUser.telegram && (
                                                    <a
                                                        href={`https://t.me/${profileUser.telegram}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[10px] font-mono hover:bg-blue-500/25 transition-colors"
                                                    >
                                                        ✈️ @{profileUser.telegram}
                                                    </a>
                                                )}
                                                {profileUser.tgChannel && (
                                                    <a
                                                        href={`https://t.me/${profileUser.tgChannel}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[10px] font-mono hover:bg-blue-500/25 transition-colors"
                                                    >
                                                        📢 @{profileUser.tgChannel}
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                        {isCurrentUser && isPlaceholderEmail && !isEditingProfile && (
                                            <div onClick={() => setIsEditingProfile(true)} className="mt-2 bg-red-500/10 border border-red-500/50 p-2 rounded flex items-center gap-2 cursor-pointer hover:bg-red-500/20">
                                                <XI icon={AlertCircle} size={14} className="text-red-500"/>
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

            <div className={`flex mb-4 mt-2 px-0 md:px-0 ${isWinamp ? 'gap-1' : 'border-b border-gray-500/30'}`}>
                <button onClick={() => setActiveSection('SHELF')} className={`flex-1 pb-3 text-center ${activeSection === 'SHELF' ? 'border-b-2 border-green-500 text-green-500' : 'opacity-50'}`}><XI icon={Package} size={20} className="mx-auto"/></button>
                <button onClick={() => setActiveSection('FAVORITES')} className={`flex-1 pb-3 text-center ${activeSection === 'FAVORITES' ? 'border-b-2 border-green-500 text-green-500' : 'opacity-50'}`}><XI icon={Heart} size={20} className="mx-auto"/></button>
                <button onClick={() => setActiveSection('LOGS')} className={`flex-1 pb-3 text-center ${activeSection === 'LOGS' ? 'border-b-2 border-green-500 text-green-500' : 'opacity-50'}`}><XI icon={MessageSquare} size={20} className="mx-auto"/></button>
                <button onClick={() => setActiveSection('WISHLIST')} className={`flex-1 pb-3 text-center ${activeSection === 'WISHLIST' ? 'border-b-2 border-green-500 text-green-500' : 'opacity-50'}`}><XI icon={Search} size={20} className="mx-auto"/></button>
                {/* Доставка временно отключена */}
                {/* {isCurrentUser && <button onClick={() => setActiveSection('SHIPMENTS')} className={`flex-1 pb-3 text-center relative ${activeSection === 'SHIPMENTS' ? 'border-b-2 border-green-500 text-green-500' : 'opacity-50'}`}><XI icon={Truck} size={20} className="mx-auto"/></button>} */}
                {isCurrentUser && <button onClick={() => setActiveSection('CONFIG')} className={`flex-1 pb-3 text-center ${activeSection === 'CONFIG' ? 'border-b-2 border-green-500 text-green-500' : 'opacity-50'}`}><XI icon={Settings} size={20} className="mx-auto"/></button>}
            </div>

            {/* SECTIONS CONTENT */}
            
            {activeSection === 'SHELF' && (
                <div className="space-y-6 animate-in fade-in px-0 md:px-0">
                    <div className="flex items-center gap-4 mb-4 px-2 md:px-0">
                        <button onClick={() => setLocalProfileTab('ARTIFACTS')} className={`text-xs font-pixel uppercase ${localProfileTab === 'ARTIFACTS' ? 'text-green-500 font-bold' : 'opacity-50'}`}>Предметы ({publishedExhibits.length})</button>
                        <button onClick={() => setLocalProfileTab('COLLECTIONS')} className={`text-xs font-pixel uppercase ${localProfileTab === 'COLLECTIONS' ? 'text-green-500 font-bold' : 'opacity-50'}`}>Коллекции ({userCollections.length})</button>
                    </div>
                    {localProfileTab === 'ARTIFACTS' && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
                            {publishedExhibits.map(item => <ExhibitCard key={item.id} item={item} theme={theme} onClick={onExhibitClick} currentUsername={user.username} onReact={() => onReact(item.id)} onAuthorClick={onAuthorClick} />)}
                            {publishedExhibits.length === 0 && <div className="col-span-full text-center py-10 opacity-30 font-mono text-xs">Полка пуста</div>}
                        </div>
                    )}
                    {localProfileTab === 'COLLECTIONS' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {userCollections.map(col => <CollectionCard key={col.id} col={col} theme={theme} onClick={onCollectionClick} onShare={onShareCollection} />)}
                            {userCollections.length === 0 && <div className="col-span-full text-center py-10 opacity-30 font-mono text-xs">Нет коллекций</div>}
                        </div>
                    )}
                </div>
            )}

            {activeSection === 'FAVORITES' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 animate-in fade-in">
                    {favoritedExhibits.map(item => (
                        <ExhibitCard
                            key={item.id}
                            item={item}
                            theme={theme}
                            onClick={onExhibitClick}
                            currentUsername={user.username}
                            onReact={() => onReact(item.id)}
                            onAuthorClick={onAuthorClick}
                        />
                    ))}
                    {favoritedExhibits.length === 0 && (
                        <div className="col-span-full py-12 text-center opacity-30 font-mono text-xs border-2 border-dashed border-white/10 rounded-2xl">
                            В избранном пока пусто
                        </div>
                    )}
                </div>
            )}

            {activeSection === 'WISHLIST' && (
                <div className="space-y-4 animate-in fade-in">
                    <div className="flex justify-end px-2">
                        <button onClick={handleShareWishlist} className="flex items-center gap-2 text-xs font-pixel opacity-70 hover:opacity-100 uppercase tracking-widest"><LinkIcon size={12}/> Поделиться вишлистом</button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {wishlistItems.map(item => (
                            <WishlistCard 
                                key={item.id} 
                                item={item} 
                                theme={theme} 
                                onClick={onWishlistClick}
                                onUserClick={() => {}}
                            />
                        ))}
                    </div>
                    {wishlistItems.length === 0 && (
                        <div className="py-12 text-center opacity-30 font-mono text-xs border-2 border-dashed border-white/10 rounded-2xl">
                            Вишлист пуст
                        </div>
                    )}
                </div>
            )}

            {activeSection === 'LOGS' && (
                <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in">
                    {!isCurrentUser && (
                        <div className="flex gap-2 mb-6">
                            <input 
                                ref={guestbookInputRef}
                                value={guestbookInput}
                                onChange={(e) => setGuestbookInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleGuestbookSubmit()}
                                placeholder={`Оставить запись для @${profileUser.username}...`}
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs focus:border-green-500 outline-none"
                            />
                            <button onClick={handleGuestbookSubmit} className="bg-green-500 text-black px-4 py-2 rounded-lg hover:bg-green-400">
                                <XI icon={Send} size={16} />
                            </button>
                        </div>
                    )}
                    
                    <div className="space-y-3">
                        {profileGuestbook.length === 0 ? (
                            <div className="text-center py-10 opacity-30 font-mono text-xs">Гостевая книга пуста</div>
                        ) : (
                            profileGuestbook.map(entry => (
                                <div key={entry.id} className={`p-4 rounded-xl border ${isWinamp ? 'bg-black border-[#505050] text-[#00ff00]' : 'bg-white/5 border-white/10'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onAuthorClick(entry.author)}>
                                            <img src={getUserAvatar(entry.author)} className="w-6 h-6 rounded-full border border-white/20"/>
                                            <span className="font-bold text-xs font-pixel">@{entry.author}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] opacity-40 font-mono">{entry.timestamp}</span>
                                            {(isCurrentUser || entry.author === user.username) && (
                                                <button onClick={() => handleDeleteEntry(entry.id)} className="text-red-500 opacity-50 hover:opacity-100"><XI icon={Trash2} size={12}/></button>
                                            )}
                                        </div>
                                    </div>
                                    <p className="font-mono text-xs opacity-80 break-words leading-relaxed">{entry.text}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* SHIPMENTS section временно отключена */}

            {isCurrentUser && activeSection === 'CONFIG' && (
                <div className="p-6 rounded-xl border flex flex-col gap-6 animate-in fade-in bg-white/5 border-white/10 mx-0 md:mx-0">
                    <h3 className="font-pixel text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2 opacity-70"><XI icon={Palette} size={14}/> Внешний вид</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <button onClick={() => updateSetting('theme', 'dark')} className="p-4 border rounded hover:bg-white/10 text-xs">Matrix</button>
                        <button onClick={() => updateSetting('theme', 'light')} className="p-4 border rounded hover:bg-white/10 text-xs">Light</button>
                        <button onClick={() => updateSetting('theme', 'xp')} className="p-4 border rounded hover:bg-white/10 text-xs">Windows XP</button>
                        <button onClick={() => updateSetting('theme', 'winamp')} className="p-4 border rounded hover:bg-white/10 text-green-500 border-green-500 text-xs">Winamp</button>
                    </div>

                    <div className="pt-6 border-t border-white/10">
                        <h3 className="font-pixel text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2 opacity-70"><XI icon={Bell} size={14}/> Уведомления</h3>

                        <div className="flex items-center justify-between p-4 border rounded mb-3 border-white/10">
                            <div>
                                <div className="font-bold text-xs mb-1">Анимация карточки</div>
                                <div className="text-[10px] opacity-60">Вращение в стиле Hearthstone при клике на уведомление</div>
                            </div>
                            <button
                                onClick={() => updateSetting('cardFlipAnimation', !(localSettings.cardFlipAnimation ?? true))}
                                className={`px-3 py-1 text-xs border rounded transition-colors font-pixel tracking-widest ${(localSettings.cardFlipAnimation ?? true) ? 'border-green-500 text-green-400 bg-green-500/10' : 'border-white/20 opacity-40'}`}
                            >
                                {(localSettings.cardFlipAnimation ?? true) ? 'ВКЛ' : 'ВЫКЛ'}
                            </button>
                        </div>

                        <div className={`flex items-center justify-between p-4 border rounded transition-all ${pushEnabled ? 'border-green-500/50 bg-green-500/10' : 'border-white/10'}`}>
                            <div>
                                <div className="font-bold text-xs mb-1">Push-уведомления</div>
                                <div className="text-[10px] opacity-60">Получать уведомления о лайках и ответах</div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={pushEnabled} onChange={togglePush} />
                                <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                            </label>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-white/10">
                        <h3 className="font-pixel text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2 text-red-500"><XI icon={AlertTriangle} size={14}/> Danger Zone</h3>
                        <button onClick={handleHardReset} className="w-full py-4 border-2 border-red-500/50 text-red-500 rounded-xl hover:bg-red-500/10 font-bold text-xs uppercase flex items-center justify-center gap-2"><XI icon={RefreshCw} size={16}/> HARD RESET</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserProfileView;
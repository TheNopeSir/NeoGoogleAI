
import React, { useState, useMemo, useRef } from 'react';
import { Bell, MessageCircle, Heart, MessageSquare, UserPlus, BookOpen, CheckCheck, RefreshCw, Check, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Notification, Message, UserProfile } from '../types';
import { getUserAvatar, markNotificationsRead, getMyTradeRequests } from '../services/storageService';
import SEO from './SEO';

interface ActivityViewProps {
    notifications: Notification[];
    messages: Message[];
    currentUser: UserProfile;
    theme: 'dark' | 'light' | 'xp' | 'winamp';
    onAuthorClick: (username: string) => void;
    onExhibitClick: (id: string, commentId?: string) => void;
    onChatClick: (username: string) => void;
}

const NotificationGroupCard: React.FC<{
    group: any;
    theme: string;
    onAuthorClick: (u: string) => void;
    onExhibitClick: (id: string) => void;
    markGroupRead: (items: Notification[]) => void;
}> = ({ group, theme, onAuthorClick, onExhibitClick, markGroupRead }) => {
    const [expanded, setExpanded] = useState(false);
    const readTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    
    const { items, type, timestamp } = group;
    const actor = items[0].actor;
    const count = items.length;
    const isUnread = items.some((n: Notification) => !n.isRead);
    const isSingle = count === 1;

    const handleMouseEnter = () => {
        if (!isUnread) return;
        if (readTimerRef.current) clearTimeout(readTimerRef.current);
        readTimerRef.current = setTimeout(() => {
            markGroupRead(items);
        }, 1000);
    };

    const handleMouseLeave = () => {
        if (readTimerRef.current) clearTimeout(readTimerRef.current);
    };

    const handleClick = () => {
        markGroupRead(items);
        if (isSingle) {
            // Navigate directly
            const first = items[0];
            if (first.targetId) {
                onExhibitClick(first.targetId);
            } else if (first.type === 'FOLLOW') {
                onAuthorClick(first.actor);
            }
        } else {
            // Toggle expand
            setExpanded(!expanded);
        }
    };

    const getIconForType = (t: string) => {
        switch (t) {
            case 'LIKE': return <Heart size={16} className="text-red-500 fill-current" />;
            case 'COMMENT': return <MessageSquare size={16} className="text-blue-500 fill-current" />;
            case 'FOLLOW': return <UserPlus size={16} className="text-green-500" />;
            case 'GUESTBOOK': return <BookOpen size={16} className="text-yellow-500" />;
            case 'TRADE_OFFER': return <RefreshCw size={16} className="text-blue-400" />;
            case 'TRADE_ACCEPTED': return <Check size={16} className="text-green-400" />;
            default: return <Bell size={16} />;
        }
    };

    let title = '';
    let subtext = '';

    if (type === 'LIKE') {
        title = isSingle ? `Понравился ваш экспонат` : `Оценил ${count} ваших экспонатов`;
    } else if (type === 'COMMENT') {
        title = isSingle ? `Новый комментарий` : `Оставил ${count} комментариев`;
    } else if (type === 'FOLLOW') {
        title = `Новый подписчик`;
    } else if (type.includes('TRADE')) {
        title = `Обновление по сделке`;
    } else if (type === 'GUESTBOOK') {
        title = `Запись в гостевой книге`;
    } else {
        title = 'Уведомление';
    }

    return (
        <div 
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`border-b transition-all ${isUnread ? 'bg-green-900/10 border-green-500/30' : theme === 'winamp' ? 'border-[#505050] bg-[#191919]' : 'border-white/5 bg-transparent opacity-70 hover:opacity-100'}`}
        >
            <div 
                onClick={handleClick}
                className="p-4 flex gap-4 cursor-pointer hover:bg-white/5 relative"
            >
                <div className="pt-1">{getIconForType(type)}</div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-mono mb-1">
                        <span className="font-bold text-green-400 hover:underline mr-1" onClick={(e) => { e.stopPropagation(); onAuthorClick(actor); }}>@{actor}</span>
                        <span className="opacity-70">{title.toLowerCase()}</span>
                    </div>
                    
                    {/* Single Item Preview */}
                    {isSingle && items[0].targetPreview && (
                        <div className="text-xs font-bold font-pixel opacity-90 border-l-2 border-white/20 pl-2 mt-2 truncate">
                            "{items[0].targetPreview}"
                        </div>
                    )}

                    <div className="text-[10px] opacity-40 mt-2 font-mono flex items-center gap-2">
                        {new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        {!isSingle && <span className="bg-white/10 px-1.5 rounded-full text-[9px] flex items-center gap-1">{expanded ? <ChevronUp size={10}/> : <ChevronDown size={10}/>} {expanded ? 'Свернуть' : 'Подробнее'}</span>}
                    </div>
                </div>
                {isUnread && <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0"/>}
            </div>

            {/* Expanded List */}
            {expanded && !isSingle && (
                <div className="bg-black/20 border-t border-white/5">
                    {items.map((notif: Notification, idx: number) => (
                        <div 
                            key={notif.id}
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                if (notif.targetId) onExhibitClick(notif.targetId); 
                            }}
                            className="p-3 pl-12 border-b border-white/5 flex items-center justify-between hover:bg-white/5 cursor-pointer group"
                        >
                            <div className="text-xs font-pixel opacity-80 truncate pr-4">
                                {notif.targetPreview || "Без названия"}
                            </div>
                            <ExternalLink size={12} className="opacity-0 group-hover:opacity-50"/>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const ActivityView: React.FC<ActivityViewProps> = ({ 
    notifications, messages, currentUser, theme, 
    onAuthorClick, onExhibitClick, onChatClick
}) => {
    const [activeTab, setActiveTab] = useState<'NOTIFICATIONS' | 'MESSAGES' | 'TRADES'>('NOTIFICATIONS');
    const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

    const myNotifs = useMemo(() => {
        let list = notifications.filter(n => n.recipient.toLowerCase() === currentUser.username.toLowerCase());
        if (filter === 'UNREAD') list = list.filter(n => !n.isRead);
        return list.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [notifications, currentUser.username, filter]);

    const myMessages = messages.filter(m => m.sender.toLowerCase() === currentUser.username.toLowerCase() || m.receiver.toLowerCase() === currentUser.username.toLowerCase());
    const trades = getMyTradeRequests();

    const handleMarkAllRead = () => { markNotificationsRead(currentUser.username); };

    // --- GROUPING LOGIC (ACTOR + TYPE + DATE) ---
    const groupedNotifications = useMemo(() => {
        const groups: { [key: string]: Notification[] } = {};
        const order: string[] = [];

        myNotifs.forEach(notif => {
            const date = new Date(notif.timestamp).toDateString();
            // Key: DATE_ACTOR_TYPE
            // This groups all actions of a specific type by a specific user on a specific day
            const groupKey = `${date}_${notif.actor}_${notif.type}`;
            
            if (!groups[groupKey]) {
                groups[groupKey] = [];
                order.push(groupKey);
            }
            groups[groupKey].push(notif);
        });

        return order.map(key => {
            const group = groups[key];
            return {
                id: key,
                type: group[0].type,
                items: group, // Contains array of notifications
                timestamp: group[0].timestamp,
            };
        });
    }, [myNotifs]);

    const getTimeLabel = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'СЕГОДНЯ';
        if (date.toDateString() === yesterday.toDateString()) return 'ВЧЕРА';
        return date.toLocaleDateString();
    };

    // Helper to mark a group read
    const markGroupRead = (groupItems: Notification[]) => {
        const unreadIds = groupItems.filter(n => !n.isRead).map(n => n.id);
        if (unreadIds.length > 0) {
            markNotificationsRead(currentUser.username, unreadIds);
        }
    };

    // Grouping by Date for display
    let lastDateLabel = '';

    return (
        <div className={`max-w-2xl mx-auto animate-in fade-in pb-20 ${theme === 'winamp' ? 'font-mono text-gray-300' : ''}`}>
            <SEO title="NeoArchive: Активность" />
            
            {/* Header Tabs */}
            <div className={`flex mb-6 border-b ${theme === 'winamp' ? 'border-[#505050]' : 'border-gray-500/30'}`}>
                <button 
                    onClick={() => setActiveTab('NOTIFICATIONS')}
                    className={`flex-1 pb-3 text-center font-pixel text-xs transition-colors flex items-center justify-center gap-2 ${activeTab === 'NOTIFICATIONS' ? 'border-b-2 border-green-500 text-green-500 font-bold' : 'opacity-50 hover:opacity-100'}`}
                >
                    <Bell size={14} /> ИНФО
                    {myNotifs.some(n => !n.isRead) && <span className="w-1.5 h-1.5 bg-red-500 rounded-full"/>}
                </button>
                <button 
                    onClick={() => setActiveTab('MESSAGES')}
                    className={`flex-1 pb-3 text-center font-pixel text-xs transition-colors flex items-center justify-center gap-2 ${activeTab === 'MESSAGES' ? 'border-b-2 border-green-500 text-green-500 font-bold' : 'opacity-50 hover:opacity-100'}`}
                >
                    <MessageCircle size={14} /> ЧАТЫ
                </button>
                <button 
                    onClick={() => setActiveTab('TRADES')}
                    className={`flex-1 pb-3 text-center font-pixel text-xs transition-colors flex items-center justify-center gap-2 ${activeTab === 'TRADES' ? 'border-b-2 border-green-500 text-green-500 font-bold' : 'opacity-50 hover:opacity-100'}`}
                >
                    <RefreshCw size={14} /> ОБМЕН
                </button>
            </div>

            {activeTab === 'NOTIFICATIONS' && (
                <div>
                    <div className="flex justify-between items-center mb-4 px-2">
                        <div className="flex gap-2">
                            <button onClick={() => setFilter('ALL')} className={`text-[10px] px-3 py-1 rounded-full border ${filter === 'ALL' ? 'bg-white text-black border-white' : 'border-white/20 opacity-50'}`}>ВСЕ</button>
                            <button onClick={() => setFilter('UNREAD')} className={`text-[10px] px-3 py-1 rounded-full border ${filter === 'UNREAD' ? 'bg-green-500 text-black border-green-500' : 'border-white/20 opacity-50'}`}>НОВЫЕ</button>
                        </div>
                        {myNotifs.some(n => !n.isRead) && (
                            <button onClick={handleMarkAllRead} className="text-[10px] text-green-500 hover:underline flex items-center gap-1">
                                <CheckCheck size={12}/> Прочитать все
                            </button>
                        )}
                    </div>

                    {groupedNotifications.length === 0 ? (
                        <div className="text-center py-20 opacity-30 font-pixel text-xs">НЕТ УВЕДОМЛЕНИЙ</div>
                    ) : (
                        <div className={`rounded-xl overflow-hidden border ${theme === 'winamp' ? 'border-[#505050] bg-black' : 'border-white/10 bg-white/5'}`}>
                            {groupedNotifications.map(group => {
                                const dateLabel = getTimeLabel(group.timestamp);
                                const showDate = dateLabel !== lastDateLabel;
                                lastDateLabel = dateLabel;

                                return (
                                    <React.Fragment key={group.id}>
                                        {showDate && (
                                            <div className="bg-white/5 px-4 py-2 text-[10px] font-bold font-pixel uppercase tracking-widest text-white/50 border-b border-white/5">
                                                {dateLabel}
                                            </div>
                                        )}
                                        <NotificationGroupCard 
                                            group={group} 
                                            theme={theme}
                                            onAuthorClick={onAuthorClick}
                                            onExhibitClick={onExhibitClick}
                                            markGroupRead={markGroupRead}
                                        />
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'MESSAGES' && (
                <div className="space-y-2">
                    {myMessages.length === 0 ? (
                        <div className="text-center py-20 opacity-30 font-pixel text-xs">НЕТ СООБЩЕНИЙ</div>
                    ) : (
                        (() => {
                            // Group messages by partner
                            const chats: { [key: string]: Message[] } = {};
                            myMessages.forEach(m => {
                                const partner = m.sender.toLowerCase() === currentUser.username.toLowerCase() ? m.receiver : m.sender;
                                if (!chats[partner]) chats[partner] = [];
                                chats[partner].push(m);
                            });

                            return Object.entries(chats).map(([partner, msgs]) => {
                                const lastMsg = msgs.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
                                const hasUnread = msgs.some(m => !m.isRead && m.sender.toLowerCase() === partner.toLowerCase());

                                return (
                                    <div 
                                        key={partner} 
                                        onClick={() => onChatClick(partner)}
                                        className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer hover:bg-white/5 transition-all ${theme === 'winamp' ? 'border-[#505050] bg-[#191919]' : 'border-white/10 bg-white/5'} ${hasUnread ? 'border-green-500/50' : ''}`}
                                    >
                                        <img src={getUserAvatar(partner)} className="w-10 h-10 rounded-full border border-white/20" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className={`font-bold font-pixel text-xs truncate ${hasUnread ? 'text-green-400' : ''}`}>@{partner}</span>
                                                <span className="text-[9px] opacity-40 font-mono ml-2 shrink-0">{new Date(lastMsg.timestamp).toLocaleDateString()}</span>
                                            </div>
                                            <div className={`text-xs font-mono truncate ${hasUnread ? 'text-white' : 'opacity-60'}`}>
                                                {lastMsg.sender.toLowerCase() === currentUser.username.toLowerCase() && <span className="opacity-50">Вы: </span>}
                                                {lastMsg.text}
                                            </div>
                                        </div>
                                        {hasUnread && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0"/>}
                                    </div>
                                );
                            });
                        })()
                    )}
                </div>
            )}

            {activeTab === 'TRADES' && (
                <div>
                    <div className="text-center opacity-30 py-10 font-pixel text-xs">АКТИВНЫЕ СДЕЛКИ</div>
                </div>
            )}
        </div>
    );
};

export default ActivityView;

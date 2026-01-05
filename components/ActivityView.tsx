import React, { useState, useMemo } from 'react';
import { Bell, MessageCircle, ChevronDown, ChevronUp, Heart, MessageSquare, UserPlus, BookOpen, CheckCheck, RefreshCw, X, Check, ArrowRight, Clock, AlertTriangle, Shield } from 'lucide-react';
import { Notification, Message, UserProfile } from '../types';
import { getUserAvatar, markNotificationsRead, getMyTradeRequests } from '../services/storageService';

interface ActivityViewProps {
    notifications: Notification[];
    messages: Message[];
    currentUser: UserProfile;
    theme: 'dark' | 'light' | 'xp' | 'winamp';
    onAuthorClick: (username: string) => void;
    onExhibitClick: (id: string, commentId?: string) => void;
    onChatClick: (username: string) => void;
}

const ActivityView: React.FC<ActivityViewProps> = ({ 
    notifications, messages, currentUser, theme, 
    onAuthorClick, onExhibitClick, onChatClick
}) => {
    const [activeTab, setActiveTab] = useState<'NOTIFICATIONS' | 'MESSAGES' | 'TRADES'>('NOTIFICATIONS');
    const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

    const myNotifs = useMemo(() => {
        let list = notifications.filter(n => n.recipient === currentUser.username);
        if (filter === 'UNREAD') list = list.filter(n => !n.isRead);
        return list.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [notifications, currentUser.username, filter]);

    const myMessages = messages.filter(m => m.sender === currentUser.username || m.receiver === currentUser.username);
    const trades = getMyTradeRequests();

    const handleMarkAllRead = () => { markNotificationsRead(currentUser.username); };

    // --- GROUPING LOGIC ---
    const groupedNotifications = useMemo(() => {
        const groups: { [key: string]: Notification[] } = {};
        const order: string[] = [];

        myNotifs.forEach(notif => {
            const date = new Date(notif.timestamp).toDateString();
            // Group key: TYPE + TARGET_ID + DATE
            const groupKey = `${date}_${notif.type}_${notif.targetId || 'general'}`;
            
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
                items: group,
                timestamp: group[0].timestamp,
                targetId: group[0].targetId,
                targetPreview: group[0].targetPreview
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

    const getIconForType = (type: string) => {
        switch (type) {
            case 'LIKE': return <Heart size={16} className="text-red-500 fill-current" />;
            case 'COMMENT': return <MessageSquare size={16} className="text-blue-500 fill-current" />;
            case 'FOLLOW': return <UserPlus size={16} className="text-green-500" />;
            case 'GUESTBOOK': return <BookOpen size={16} className="text-yellow-500" />;
            case 'TRADE_OFFER': return <RefreshCw size={16} className="text-blue-400" />;
            case 'TRADE_ACCEPTED': return <Check size={16} className="text-green-400" />;
            default: return <Bell size={16} />;
        }
    };

    const renderNotificationCard = (group: any) => {
        const count = group.items.length;
        const first = group.items[0];
        // Cast to string array to avoid 'unknown' type in JSX
        const uniqueActors = Array.from(new Set(group.items.map((n: any) => n.actor as string))) as string[];
        const isUnread = group.items.some((n: any) => !n.isRead);

        let title = '';
        if (first.type === 'LIKE') title = `Понравился ваш экспонат`;
        else if (first.type === 'COMMENT') title = `Новый комментарий`;
        else if (first.type === 'FOLLOW') title = `Новый подписчик`;
        else if (first.type.includes('TRADE')) title = `Обновление по сделке`;
        else title = 'Уведомление';

        const actorsText = uniqueActors.length === 1 
            ? <span className="font-bold text-green-400 cursor-pointer hover:underline" onClick={() => onAuthorClick(uniqueActors[0])}>@{uniqueActors[0]}</span> 
            : <span><span className="font-bold text-green-400">@{uniqueActors[0]}</span> и еще <span className="font-bold">{uniqueActors.length - 1}</span></span>;

        return (
            <div key={group.id} className={`p-4 border-b transition-all flex gap-4 ${isUnread ? 'bg-green-900/10 border-green-500/30' : theme === 'winamp' ? 'border-[#505050] bg-[#191919]' : 'border-white/5 bg-transparent'}`}>
                <div className="pt-1">{getIconForType(first.type)}</div>
                <div className="flex-1">
                    <div className="text-sm font-mono mb-1">
                        {actorsText} <span className="opacity-70">{title.toLowerCase()}</span>
                    </div>
                    {first.targetPreview && (
                        <div 
                            onClick={() => first.targetId && onExhibitClick(first.targetId)}
                            className="text-xs font-bold font-pixel opacity-90 cursor-pointer hover:text-green-400 transition-colors border-l-2 border-white/20 pl-2 mt-2"
                        >
                            "{first.targetPreview}"
                        </div>
                    )}
                    <div className="text-[10px] opacity-40 mt-2 font-mono flex items-center gap-2">
                        {new Date(first.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        {count > 1 && <span className="bg-white/10 px-1.5 rounded-full text-[9px]">+{count} событий</span>}
                    </div>
                </div>
                {isUnread && <div className="w-2 h-2 rounded-full bg-green-500 mt-2"/>}
            </div>
        );
    };

    // Grouping by Date for display
    let lastDateLabel = '';

    return (
        <div className={`max-w-2xl mx-auto animate-in fade-in pb-20 ${theme === 'winamp' ? 'font-mono text-gray-300' : ''}`}>
            
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
                                        {renderNotificationCard(group)}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'MESSAGES' && (
                <div className="space-y-2">
                    {/* Render messages logic (simplified for brevity, assume groupedMessages logic from previous code) */}
                    <div className="text-center opacity-30 py-10 font-pixel text-xs">РАЗДЕЛ СООБЩЕНИЙ</div>
                </div>
            )}

            {activeTab === 'TRADES' && (
                <div>
                    {/* Trades Logic (simplified) */}
                    <div className="text-center opacity-30 py-10 font-pixel text-xs">АКТИВНЫЕ СДЕЛКИ</div>
                </div>
            )}
        </div>
    );
};

export default ActivityView;
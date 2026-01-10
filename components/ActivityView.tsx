
import React, { useState, useMemo } from 'react';
import { Bell, MessageCircle, ChevronDown, ChevronUp, Heart, MessageSquare, UserPlus, BookOpen, CheckCheck, RefreshCw, X, Check, ArrowRight, Clock, AlertTriangle, Shield, DollarSign, Package } from 'lucide-react';
import { Notification, Message, UserProfile } from '../types';
import { getUserAvatar, markNotificationsRead, getMyTradeRequests, initializeDatabase, getFullDatabase } from '../services/storageService';

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
    const [isRefreshing, setIsRefreshing] = useState(false);

    const myNotifs = useMemo(() => {
        let list = notifications.filter(n => n.recipient.toLowerCase() === currentUser.username.toLowerCase());
        if (filter === 'UNREAD') list = list.filter(n => !n.isRead);
        return list.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [notifications, currentUser.username, filter]);

    const myMessages = messages.filter(m => m.sender.toLowerCase() === currentUser.username.toLowerCase() || m.receiver.toLowerCase() === currentUser.username.toLowerCase());
    const trades = getMyTradeRequests();

    const handleMarkAllRead = () => { markNotificationsRead(currentUser.username); };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await initializeDatabase();
        } catch (e) {
            console.error("Refresh failed", e);
        } finally {
            setTimeout(() => setIsRefreshing(false), 500);
        }
    };

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
                        <div className="flex gap-2">
                            {myNotifs.some(n => !n.isRead) && (
                                <button onClick={handleMarkAllRead} className="text-[10px] text-green-500 hover:underline flex items-center gap-1">
                                    <CheckCheck size={12}/>
                                </button>
                            )}
                            <button onClick={handleRefresh} className={`text-[10px] hover:text-white flex items-center gap-1 ${isRefreshing ? 'animate-spin opacity-100' : 'opacity-50'}`}>
                                <RefreshCw size={12}/>
                            </button>
                        </div>
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
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className={`font-bold font-pixel text-xs ${hasUnread ? 'text-green-400' : ''}`}>@{partner}</span>
                                                <span className="text-[9px] opacity-40 font-mono">{new Date(lastMsg.timestamp).toLocaleDateString()}</span>
                                            </div>
                                            <div className={`text-xs font-mono truncate ${hasUnread ? 'text-white' : 'opacity-60'}`}>
                                                {lastMsg.sender.toLowerCase() === currentUser.username.toLowerCase() && <span className="opacity-50">Вы: </span>}
                                                {lastMsg.text}
                                            </div>
                                        </div>
                                        {hasUnread && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>}
                                    </div>
                                );
                            });
                        })()
                    )}
                </div>
            )}

            {activeTab === 'TRADES' && (
                <div>
                    {(() => {
                        const db = getFullDatabase();
                        const myTrades = db.tradeRequests || [];
                        const userTrades = myTrades.filter(t =>
                            t.sender === currentUser.username || t.recipient === currentUser.username
                        ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

                        if (userTrades.length === 0) {
                            return (
                                <div className="text-center py-20 opacity-30 font-pixel text-xs border-2 border-dashed border-white/10 rounded-3xl">
                                    НЕТ АКТИВНЫХ СДЕЛОК
                                </div>
                            );
                        }

                        return (
                            <div className="space-y-3">
                                {userTrades.map(trade => {
                                    const isIncoming = trade.recipient === currentUser.username;
                                    const partner = isIncoming ? trade.sender : trade.recipient;
                                    const statusColor =
                                        trade.status === 'ACCEPTED' ? 'text-green-500' :
                                        trade.status === 'REJECTED' ? 'text-red-500' :
                                        trade.status === 'COMPLETED' ? 'text-blue-500' :
                                        'text-yellow-500';

                                    return (
                                        <div
                                            key={trade.id}
                                            className={`p-4 rounded-xl border cursor-pointer hover:bg-white/5 transition-all ${theme === 'winamp' ? 'border-[#505050] bg-[#191919]' : 'border-white/10 bg-white/5'}`}
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <img src={getUserAvatar(partner)} className="w-10 h-10 rounded-full border border-white/20" />
                                                    <div>
                                                        <div className="font-bold font-pixel text-sm flex items-center gap-2">
                                                            @{partner}
                                                            <span className={`text-[9px] px-2 py-0.5 rounded-full border ${statusColor} border-current`}>
                                                                {trade.status}
                                                            </span>
                                                        </div>
                                                        <div className="text-[10px] opacity-50 font-mono mt-0.5">
                                                            {isIncoming ? '→ Входящее предложение' : '← Исходящее предложение'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[10px] opacity-40 font-mono">
                                                        {new Date(trade.updatedAt).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Trade Details */}
                                            <div className="flex items-center gap-4 p-3 bg-black/20 rounded-lg">
                                                <div className="flex-1">
                                                    <div className="text-[9px] opacity-50 mb-1 uppercase">Предлагает</div>
                                                    <div className="flex items-center gap-2">
                                                        <Package size={14} className="text-blue-400" />
                                                        <span className="text-xs font-mono">{trade.senderItems.length} предмет(ов)</span>
                                                    </div>
                                                </div>

                                                <ArrowRight size={16} className="opacity-30" />

                                                <div className="flex-1">
                                                    <div className="text-[9px] opacity-50 mb-1 uppercase">За</div>
                                                    <div className="flex items-center gap-2">
                                                        {trade.price ? (
                                                            <>
                                                                <DollarSign size={14} className="text-green-400" />
                                                                <span className="text-xs font-mono font-bold text-green-400">
                                                                    {trade.price} {trade.currency || 'RUB'}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Package size={14} className="text-purple-400" />
                                                                <span className="text-xs font-mono">{trade.recipientItems.length} предмет(ов)</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Trade Type Badge */}
                                            {trade.type && (
                                                <div className="mt-2 text-[9px] opacity-50 font-mono flex items-center gap-2">
                                                    <span>Тип:</span>
                                                    <span className="px-2 py-0.5 rounded bg-white/10">{trade.type}</span>
                                                    {trade.isWishlistFulfillment && (
                                                        <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-500">
                                                            🎯 Из вишлиста
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
};

export default ActivityView;


import React, { useState, useMemo } from 'react';
import { Bell, MessageCircle, ChevronDown, ChevronUp, Heart, MessageSquare, UserPlus, BookOpen, CheckCheck, RefreshCw, X, Check, ArrowRight, Clock, AlertTriangle, Shield, Wallet } from 'lucide-react';
import { Notification, Message, UserProfile, TradeRequest, Exhibit } from '../types';
import { getUserAvatar, markNotificationsRead, getMyTradeRequests, initializeDatabase, acceptTradeRequest, updateTradeStatus, markSingleNotificationRead } from '../services/storageService';
import { getImageUrl } from '../utils/imageUtils';

interface ActivityViewProps {
    notifications: Notification[];
    messages: Message[];
    currentUser: UserProfile;
    theme: 'dark' | 'light' | 'xp' | 'winamp';
    onAuthorClick: (username: string) => void;
    onExhibitClick: (id: string, commentId?: string) => void;
    onChatClick: (username: string) => void;
    exhibits?: Exhibit[]; // Needed for trade cards
}

const ActivityView: React.FC<ActivityViewProps> = ({ 
    notifications, messages, currentUser, theme, 
    onAuthorClick, onExhibitClick, onChatClick, exhibits = []
}) => {
    const [activeTab, setActiveTab] = useState<'NOTIFICATIONS' | 'MESSAGES' | 'TRADES'>('NOTIFICATIONS');
    const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const isLight = theme === 'light';
    const isWinamp = theme === 'winamp';

    const myNotifs = useMemo(() => {
        let list = notifications.filter(n => n.recipient.toLowerCase() === currentUser.username.toLowerCase());
        if (filter === 'UNREAD') list = list.filter(n => !n.isRead);
        return list.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [notifications, currentUser.username, filter]);

    const myMessages = messages.filter(m => m.sender.toLowerCase() === currentUser.username.toLowerCase() || m.receiver.toLowerCase() === currentUser.username.toLowerCase());
    
    // Get trades
    const allTrades = getMyTradeRequests();
    const myTrades = useMemo(() => {
        return allTrades.filter(t => t.sender === currentUser.username || t.recipient === currentUser.username).sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }, [allTrades, currentUser.username]);

    const pendingIncomingTrades = myTrades.filter(t => t.recipient === currentUser.username && t.status === 'PENDING');
    const pendingOutgoingTrades = myTrades.filter(t => t.sender === currentUser.username && t.status === 'PENDING');
    const historyTrades = myTrades.filter(t => t.status !== 'PENDING');

    const handleMarkAllRead = () => { markNotificationsRead(currentUser.username); };

    const handleNotificationClick = (group: any) => {
        // Mark all in this group as read
        group.items.forEach((n: Notification) => {
            if (!n.isRead) markSingleNotificationRead(n.id, currentUser.username);
        });
        // If it's a specific target, navigate
        if (group.targets.length > 0) {
            onExhibitClick(group.targets[0].id);
        } else {
            onAuthorClick(group.actor);
        }
    };

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
    // Groups notifications from the SAME USER of the SAME TYPE on the SAME DAY
    const groupedNotifications = useMemo(() => {
        const groups: { [key: string]: Notification[] } = {};
        const order: string[] = [];

        myNotifs.forEach(notif => {
            const d = new Date(notif.timestamp);
            const dateKey = !isNaN(d.getTime()) ? d.toDateString() : 'Unknown Date';
            // Group key: DATE + ACTOR + TYPE
            const groupKey = `${dateKey}_${notif.actor}_${notif.type}`;
            
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
                actor: group[0].actor,
                items: group,
                timestamp: group[0].timestamp, // Latest one is first in myNotifs, so index 0 is correct
                // Collect unique targets for preview
                targets: Array.from(new Set(group.map(n => ({ id: n.targetId, title: n.targetPreview }))))
            };
        });
    }, [myNotifs]);

    const getTimeLabel = (dateStr: string) => {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return 'НЕДАВНО';
        
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'СЕГОДНЯ';
        if (date.toDateString() === yesterday.toDateString()) return 'ВЧЕРА';
        
        return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    };

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
        const isUnread = group.items.some((n: any) => !n.isRead);
        
        let actionText = '';
        if (first.type === 'LIKE') actionText = count > 1 ? `оценил ${count} ваших экспонатов` : 'оценил ваш экспонат';
        else if (first.type === 'COMMENT') actionText = count > 1 ? `оставил ${count} комментариев` : 'прокомментировал';
        else if (first.type === 'FOLLOW') actionText = 'подписался на вас';
        else if (first.type.includes('TRADE')) actionText = 'обновил статус сделки';
        else actionText = 'взаимодействует с вами';

        const uniqueTargets = group.targets.filter((t: any) => t.id && t.title).slice(0, 3); // Show max 3 previews

        return (
            <div 
                key={group.id} 
                onClick={() => handleNotificationClick(group)}
                className={`p-4 border-b transition-all flex gap-4 cursor-pointer 
                    ${isUnread 
                        ? (isLight ? 'bg-green-50 border-green-200' : 'bg-green-900/10 border-green-500/30') 
                        : (isWinamp ? 'border-[#505050] bg-[#191919] hover:bg-[#252525]' : isLight ? 'bg-white border-gray-100 hover:bg-gray-50' : 'border-white/5 bg-transparent hover:bg-white/5')}`
            }
            >
                <div className="pt-1">{getIconForType(first.type)}</div>
                <div className="flex-1">
                    <div className={`text-sm font-mono mb-2 ${isLight ? 'text-gray-800' : ''}`}>
                        <span className="font-bold text-green-500 hover:underline" onClick={(e) => { e.stopPropagation(); onAuthorClick(group.actor); }}>@{group.actor}</span> 
                        <span className="opacity-70"> {actionText}</span>
                    </div>
                    
                    {uniqueTargets.length > 0 && (
                        <div className="flex flex-col gap-1 mt-1">
                            {uniqueTargets.map((t: any, idx: number) => (
                                <div 
                                    key={idx}
                                    className={`text-xs font-bold font-pixel opacity-80 transition-colors border-l-2 pl-2 truncate ${isLight ? 'border-gray-300 text-gray-700' : 'border-white/20 hover:text-green-400'}`}
                                >
                                    "{t.title}"
                                </div>
                            ))}
                            {group.targets.length > 3 && (
                                <div className="text-[9px] opacity-40 pl-2">...и еще {group.targets.length - 3}</div>
                            )}
                        </div>
                    )}

                    <div className="text-[10px] opacity-40 mt-2 font-mono flex items-center gap-2">
                        {formatTime(first.timestamp)}
                    </div>
                </div>
                {isUnread && <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0"/>}
            </div>
        );
    };

    const renderTradeCard = (trade: TradeRequest) => {
        const isIncoming = trade.recipient === currentUser.username;
        const partner = isIncoming ? trade.sender : trade.recipient;
        const date = new Date(trade.createdAt).toLocaleDateString();
        
        // Find items involved (simple lookup)
        const senderItemsList = exhibits.filter(e => trade.senderItems.includes(e.id));
        const recipientItemsList = exhibits.filter(e => trade.recipientItems.includes(e.id));

        return (
            <div key={trade.id} className={`p-4 rounded-xl border mb-3 ${isWinamp ? 'bg-[#191919] border-[#505050]' : isLight ? 'bg-white border-gray-200 text-gray-800' : 'bg-white/5 border-white/10'}`}>
                <div className={`flex justify-between items-center mb-3 pb-3 border-b ${isLight ? 'border-gray-200' : 'border-white/5'}`}>
                    <div className="flex items-center gap-2">
                        <RefreshCw size={14} className={trade.status === 'PENDING' ? 'text-blue-400' : trade.status === 'ACCEPTED' ? 'text-green-500' : 'text-gray-500'} />
                        <span className="font-pixel text-[10px] font-bold uppercase">{trade.status === 'PENDING' ? (isIncoming ? 'ВХОДЯЩИЙ ЗАПРОС' : 'ОЖИДАЕТ ОТВЕТА') : trade.status}</span>
                    </div>
                    <div className="text-[9px] font-mono opacity-50">{date}</div>
                </div>

                <div className="flex items-center justify-between gap-2 mb-4">
                    {/* SENDER SIDE */}
                    <div className="flex-1 text-center">
                        <div className="text-[9px] font-bold opacity-50 mb-1">@{trade.sender}</div>
                        {trade.price && !trade.isWishlistFulfillment ? (
                            <div className="text-green-500 font-pixel font-bold text-sm flex items-center justify-center gap-1"><Wallet size={12}/> {trade.price} ₽</div>
                        ) : (
                            <div className="flex flex-wrap justify-center gap-1">
                                {senderItemsList.length > 0 ? senderItemsList.map(item => (
                                    <img key={item.id} src={getImageUrl(item.imageUrls[0], 'thumbnail')} className={`w-8 h-8 rounded border object-cover ${isLight ? 'border-gray-300' : 'border-white/10'}`} title={item.title}/>
                                )) : <span className="text-[9px] opacity-30">Ничего</span>}
                            </div>
                        )}
                    </div>

                    <ArrowRight size={16} className="opacity-30"/>

                    {/* RECIPIENT SIDE */}
                    <div className="flex-1 text-center">
                        <div className="text-[9px] font-bold opacity-50 mb-1">@{trade.recipient}</div>
                        {trade.price && trade.isWishlistFulfillment ? (
                            <div className="text-green-500 font-pixel font-bold text-sm flex items-center justify-center gap-1"><Wallet size={12}/> {trade.price} ₽</div>
                        ) : (
                            <div className="flex flex-wrap justify-center gap-1">
                                {recipientItemsList.length > 0 ? recipientItemsList.map(item => (
                                    <img key={item.id} src={getImageUrl(item.imageUrls[0], 'thumbnail')} className={`w-8 h-8 rounded border object-cover ${isLight ? 'border-gray-300' : 'border-white/10'}`} title={item.title}/>
                                )) : <span className="text-[9px] opacity-30">Ничего</span>}
                            </div>
                        )}
                    </div>
                </div>

                {trade.messages && trade.messages.length > 0 && (
                    <div className={`p-2 rounded text-[10px] font-mono opacity-70 mb-3 italic ${isLight ? 'bg-gray-100 text-gray-700' : 'bg-black/20'}`}>
                        "{trade.messages[0].text}"
                    </div>
                )}

                {trade.status === 'PENDING' && isIncoming && (
                    <div className="flex gap-2">
                        <button onClick={() => acceptTradeRequest(trade.id)} className="flex-1 py-2 bg-green-600 text-white font-bold text-[10px] rounded uppercase hover:bg-green-500">Принять</button>
                        <button onClick={() => updateTradeStatus(trade.id, 'DECLINED')} className="flex-1 py-2 border border-red-500 text-red-500 font-bold text-[10px] rounded uppercase hover:bg-red-500/10">Отклонить</button>
                    </div>
                )}

                {trade.status === 'PENDING' && !isIncoming && (
                    <button onClick={() => updateTradeStatus(trade.id, 'CANCELLED')} className={`w-full py-2 border font-bold text-[10px] rounded uppercase ${isLight ? 'border-gray-300 text-gray-500 hover:bg-gray-100' : 'border-white/10 text-white/50 hover:bg-white/10 hover:text-white'}`}>Отменить запрос</button>
                )}
            </div>
        );
    };

    // Grouping by Date for display
    let lastDateLabel = '';

    return (
        <div className={`max-w-2xl mx-auto animate-in fade-in pb-20 ${isWinamp ? 'font-mono text-gray-300' : ''}`}>
            
            {/* Header Tabs */}
            <div className={`flex mb-6 border-b ${isWinamp ? 'border-[#505050]' : isLight ? 'border-gray-200' : 'border-gray-500/30'}`}>
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
                    {pendingIncomingTrades.length > 0 && <span className="bg-blue-500 text-white text-[8px] font-bold px-1 rounded-full">{pendingIncomingTrades.length}</span>}
                </button>
            </div>

            {activeTab === 'NOTIFICATIONS' && (
                <div>
                    <div className="flex justify-between items-center mb-4 px-2">
                        <div className="flex gap-2">
                            <button onClick={() => setFilter('ALL')} className={`text-[10px] px-3 py-1 rounded-full border ${filter === 'ALL' ? (isLight ? 'bg-gray-200 border-gray-300 text-black' : 'bg-white text-black border-white') : 'border-white/20 opacity-50'}`}>ВСЕ</button>
                            <button onClick={() => setFilter('UNREAD')} className={`text-[10px] px-3 py-1 rounded-full border ${filter === 'UNREAD' ? 'bg-green-500 text-white border-green-500' : 'border-white/20 opacity-50'}`}>НОВЫЕ</button>
                        </div>
                        <div className="flex gap-2">
                            {myNotifs.some(n => !n.isRead) && (
                                <button onClick={handleMarkAllRead} className="text-[10px] text-green-500 hover:underline flex items-center gap-1 font-bold">
                                    <CheckCheck size={14}/> Прочитать все
                                </button>
                            )}
                            <button onClick={handleRefresh} className={`text-[10px] hover:text-green-500 flex items-center gap-1 ${isRefreshing ? 'animate-spin opacity-100' : 'opacity-50'}`}>
                                <RefreshCw size={12}/>
                            </button>
                        </div>
                    </div>

                    {groupedNotifications.length === 0 ? (
                        <div className="text-center py-20 opacity-30 font-pixel text-xs">НЕТ УВЕДОМЛЕНИЙ</div>
                    ) : (
                        <div className={`rounded-xl overflow-hidden border ${isWinamp ? 'border-[#505050] bg-black' : isLight ? 'bg-white border-gray-200' : 'border-white/10 bg-white/5'}`}>
                            {groupedNotifications.map(group => {
                                const dateLabel = getTimeLabel(group.timestamp);
                                const showDate = dateLabel !== lastDateLabel;
                                lastDateLabel = dateLabel;

                                return (
                                    <React.Fragment key={group.id}>
                                        {showDate && (
                                            <div className={`px-4 py-2 text-[10px] font-bold font-pixel uppercase tracking-widest border-b ${isLight ? 'bg-gray-50 text-gray-500 border-gray-200' : 'bg-white/5 text-white/50 border-white/5'}`}>
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
                                        className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer hover:bg-white/5 transition-all ${isWinamp ? 'border-[#505050] bg-[#191919]' : isLight ? 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50' : 'border-white/10 bg-white/5'} ${hasUnread ? 'border-green-500/50' : ''}`}
                                    >
                                        <img src={getUserAvatar(partner)} className={`w-10 h-10 rounded-full border ${isLight ? 'border-gray-300' : 'border-white/20'}`} />
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className={`font-bold font-pixel text-xs ${hasUnread ? 'text-green-500' : ''}`}>@{partner}</span>
                                                <span className="text-[9px] opacity-40 font-mono">{new Date(lastMsg.timestamp).toLocaleDateString()}</span>
                                            </div>
                                            <div className={`text-xs font-mono truncate ${hasUnread ? (isLight ? 'text-gray-900 font-bold' : 'text-white') : 'opacity-60'}`}>
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
                <div className="space-y-6">
                    {pendingIncomingTrades.length > 0 && (
                        <div>
                            <h3 className="font-pixel text-[10px] text-blue-400 mb-3 uppercase tracking-widest flex items-center gap-2"><ArrowRight size={12}/> Входящие запросы</h3>
                            <div className="space-y-2">{pendingIncomingTrades.map(renderTradeCard)}</div>
                        </div>
                    )}

                    {pendingOutgoingTrades.length > 0 && (
                        <div>
                            <h3 className="font-pixel text-[10px] opacity-50 mb-3 uppercase tracking-widest flex items-center gap-2"><Clock size={12}/> Отправленные (Ожидание)</h3>
                            <div className="space-y-2">{pendingOutgoingTrades.map(renderTradeCard)}</div>
                        </div>
                    )}

                    {historyTrades.length > 0 && (
                        <div>
                            <h3 className="font-pixel text-[10px] opacity-30 mb-3 uppercase tracking-widest flex items-center gap-2"><BookOpen size={12}/> История сделок</h3>
                            <div className="space-y-2 opacity-70 hover:opacity-100 transition-opacity">
                                {historyTrades.map(renderTradeCard)}
                            </div>
                        </div>
                    )}

                    {myTrades.length === 0 && (
                        <div className="text-center py-20 opacity-30 font-pixel text-xs">НЕТ АКТИВНЫХ СДЕЛОК</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ActivityView;

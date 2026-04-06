
import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Bell, MessageCircle, ChevronDown, ChevronUp, Heart, MessageSquare, UserPlus, BookOpen, CheckCheck, RefreshCw, X, Check, ArrowRight, Clock, AlertTriangle, Shield, Wallet, Radar, Trophy, TrendingUp, AtSign } from 'lucide-react';
import { Notification, Message, UserProfile, TradeRequest, Exhibit } from '../types';
import { getUserAvatar, markNotificationsRead, getMyTradeRequests, initializeDatabase, acceptTradeRequest, updateTradeStatus, markSingleNotificationRead } from '../services/storageService';
import { getImageUrl } from '../utils/imageUtils';
import { getArtifactTier, TIER_CONFIG } from '../constants';
import MatrixIcon from './MatrixIcon';
import XI from './XI';

interface ActivityViewProps {
    notifications: Notification[];
    messages: Message[];
    currentUser: UserProfile;
    theme: 'dark' | 'light' | 'xp' | 'winamp';
    onAuthorClick: (username: string) => void;
    onExhibitClick: (id: string, commentId?: string) => void;
    onChatClick: (username: string) => void;
    exhibits?: Exhibit[];
    cardFlipEnabled?: boolean;
}

const ActivityView: React.FC<ActivityViewProps> = ({
    notifications, messages, currentUser, theme,
    onAuthorClick, onExhibitClick, onChatClick, exhibits = [], cardFlipEnabled = true
}) => {
    const [activeTab, setActiveTab] = useState<'NOTIFICATIONS' | 'MESSAGES' | 'TRADES'>('NOTIFICATIONS');
    const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [flippingExhibit, setFlippingExhibit] = useState<Exhibit | null>(null);

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

    const markGroupRead = (group: any) => {
        group.items.forEach((n: Notification) => {
            if (!n.isRead) markSingleNotificationRead(n.id, currentUser.username);
        });
    };

    const triggerGradeUpFlip = (targetId: string) => {
        const exhibit = exhibits.find(e => e.id === targetId);
        if (exhibit && cardFlipEnabled) {
            setFlippingExhibit(exhibit);
        } else {
            onExhibitClick(targetId);
        }
    };

    const handleFlipOverlayClick = () => {
        if (!flippingExhibit) return;
        const id = flippingExhibit.id;
        setFlippingExhibit(null);
        onExhibitClick(id);
    };

    const handleFlipOverlayClose = (e: React.MouseEvent) => {
        e.stopPropagation();
        setFlippingExhibit(null);
    };

    const handleNotificationClick = (group: any) => {
        markGroupRead(group);
        if (group.type === 'GRADE_UP') {
            const targetId = group.items[0]?.targetId;
            if (targetId) triggerGradeUpFlip(targetId);
        } else if (group.type === 'MENTION') {
            const first = group.items[0];
            if (first?.targetId) onExhibitClick(first.targetId, first.contextId);
        } else {
            onAuthorClick(group.actor);
        }
    };

    const handleTargetClick = (e: React.MouseEvent, group: any, targetId: string) => {
        e.stopPropagation();
        markGroupRead(group);
        if (group.type === 'GRADE_UP') {
            triggerGradeUpFlip(targetId);
        } else if (group.type === 'MENTION') {
            const item = group.items.find((n: any) => n.targetId === targetId);
            onExhibitClick(targetId, item?.contextId);
        } else {
            onExhibitClick(targetId);
        }
    };

    const toggleGroupExpand = (e: React.MouseEvent, groupId: string) => {
        e.stopPropagation();
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) next.delete(groupId);
            else next.add(groupId);
            return next;
        });
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
            case 'LIKE':           return <MatrixIcon icon={Heart}         size={16} color="#f87171" glow={2} theme={theme} />;
            case 'COMMENT':        return <MatrixIcon icon={MessageSquare} size={16} color="#60a5fa" theme={theme} />;
            case 'FOLLOW':         return <MatrixIcon icon={UserPlus}      size={16} color="#4ade80" theme={theme} />;
            case 'GUESTBOOK':      return <MatrixIcon icon={BookOpen}      size={16} color="#fbbf24" theme={theme} />;
            case 'TRADE_OFFER':       return <MatrixIcon icon={RefreshCw} size={16} color="#fbbf24" theme={theme} />;
            case 'TRADE_ACCEPTED':    return <MatrixIcon icon={Check}     size={16} color="#4ade80" theme={theme} />;
            case 'WISHLIST_MATCH':    return <MatrixIcon icon={Radar}     size={16} color="#a78bfa" glow={2} theme={theme} />;
            case 'WISHLIST_ACQUIRED': return <MatrixIcon icon={Trophy}      size={16} color="#fbbf24" glow={2} theme={theme} />;
            case 'GRADE_UP':          return <MatrixIcon icon={TrendingUp} size={16} color="#facc15" glow={2} theme={theme} />;
            case 'MENTION':           return <MatrixIcon icon={AtSign}      size={16} color="#c084fc" glow={1} theme={theme} />;
            default:                  return <MatrixIcon icon={Bell}        size={16} theme={theme} />;
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
        else if (first.type === 'WISHLIST_MATCH') actionText = 'добавил артефакт из вашего вишлиста';
        else if (first.type === 'WISHLIST_ACQUIRED') actionText = '— вишлист-айтем получен!';
        else if (first.type === 'MENTION') actionText = 'упомянул вас в комментарии';
        else if (first.type === 'GRADE_UP') actionText = first.contextId ? `достиг ранга ${first.contextId}` : 'повысил ранг!';
        else if (first.type.includes('TRADE')) actionText = 'обновил статус сделки';
        else actionText = 'взаимодействует с вами';

        // Deduplicate targets by id using Map
        const allValidTargets: { id: string; title: string }[] = Array.from(
            new Map<string, { id: string; title: string }>(
                group.items
                    .filter((n: any) => n.targetId && n.targetPreview)
                    .map((n: any) => {
                        const currentExhibit = exhibits.find((ex: Exhibit) => ex.id === n.targetId);
                        return [n.targetId, { id: n.targetId, title: currentExhibit?.title || n.targetPreview }];
                    })
            ).values()
        );

        const isExpanded = expandedGroups.has(group.id);
        const visibleTargets = isExpanded ? allValidTargets : allValidTargets.slice(0, 3);
        const hiddenCount = allValidTargets.length - 3;

        return (
            <div
                key={group.id}
                onClick={() => handleNotificationClick(group)}
                className={`p-4 border-b transition-all flex gap-4 cursor-pointer
                    ${isUnread
                        ? (isLight ? 'bg-green-50 border-green-200' : 'bg-green-900/10 border-green-500/30')
                        : (isWinamp ? 'border-[#505050] bg-[#191919] hover:bg-[#252525]' : isLight ? 'bg-white border-gray-100 hover:bg-gray-50' : 'border-white/5 bg-transparent hover:bg-white/5')}`}
            >
                <div className="pt-1">{getIconForType(first.type)}</div>
                <div className="flex-1">
                    <div className={`text-sm font-mono mb-2 ${isLight ? 'text-gray-800' : ''}`}>
                        <span className="font-bold text-green-500 hover:underline" onClick={(e) => { e.stopPropagation(); onAuthorClick(group.actor); }}>@{group.actor}</span>
                        <span className="opacity-70"> {actionText}</span>
                    </div>

                    {visibleTargets.length > 0 && (
                        <div className="flex flex-col gap-1 mt-1">
                            {visibleTargets.map((t) => (
                                <div
                                    key={t.id}
                                    onClick={(e) => handleTargetClick(e, group, t.id)}
                                    className={`text-xs font-bold font-pixel opacity-80 transition-colors border-l-2 pl-2 truncate cursor-pointer hover:opacity-100 ${isLight ? 'border-gray-300 text-gray-700 hover:text-green-600 hover:border-green-400' : 'border-white/20 hover:text-green-400 hover:border-green-500/50'}`}
                                >
                                    "{t.title}"
                                </div>
                            ))}
                            {!isExpanded && hiddenCount > 0 && (
                                <div
                                    onClick={(e) => toggleGroupExpand(e, group.id)}
                                    className="text-[9px] pl-2 cursor-pointer text-green-500/60 hover:text-green-400 transition-colors font-mono"
                                >
                                    ...и ещё {hiddenCount} →
                                </div>
                            )}
                            {isExpanded && allValidTargets.length > 3 && (
                                <div
                                    onClick={(e) => toggleGroupExpand(e, group.id)}
                                    className="text-[9px] pl-2 cursor-pointer opacity-40 hover:opacity-70 transition-opacity font-mono"
                                >
                                    свернуть ↑
                                </div>
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
                        <XI icon={RefreshCw} size={14} className={trade.status === 'PENDING' ? 'text-blue-400' : trade.status === 'ACCEPTED' ? 'text-green-500' : 'text-gray-500'} />
                        <span className="font-pixel text-[10px] font-bold uppercase">{trade.status === 'PENDING' ? (isIncoming ? 'ВХОДЯЩИЙ ЗАПРОС' : 'ОЖИДАЕТ ОТВЕТА') : trade.status}</span>
                    </div>
                    <div className="text-[9px] font-mono opacity-50">{date}</div>
                </div>

                <div className="flex items-center justify-between gap-2 mb-4">
                    {/* SENDER SIDE */}
                    <div className="flex-1 text-center">
                        <div className="text-[9px] font-bold opacity-50 mb-1">@{trade.sender}</div>
                        {trade.price && !trade.isWishlistFulfillment ? (
                            <div className="text-green-500 font-pixel font-bold text-sm flex items-center justify-center gap-1"><XI icon={Wallet} size={12}/> {trade.price} ₽</div>
                        ) : (
                            <div className="flex flex-wrap justify-center gap-1">
                                {senderItemsList.length > 0 ? senderItemsList.map(item => (
                                    <img key={item.id} src={getImageUrl(item.imageUrls[0], 'thumbnail')} className={`w-8 h-8 rounded border object-cover ${isLight ? 'border-gray-300' : 'border-white/10'}`} title={item.title}/>
                                )) : <span className="text-[9px] opacity-30">Ничего</span>}
                            </div>
                        )}
                    </div>

                    <XI icon={ArrowRight} size={16} className="opacity-30"/>

                    {/* RECIPIENT SIDE */}
                    <div className="flex-1 text-center">
                        <div className="text-[9px] font-bold opacity-50 mb-1">@{trade.recipient}</div>
                        {trade.price && trade.isWishlistFulfillment ? (
                            <div className="text-green-500 font-pixel font-bold text-sm flex items-center justify-center gap-1"><XI icon={Wallet} size={12}/> {trade.price} ₽</div>
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
        <div className={`max-w-4xl mx-auto animate-in fade-in pb-20 ${isWinamp ? 'font-mono text-gray-300' : ''}`}>
            
            {/* Header Tabs */}
            <div className={`flex mb-6 border-b ${isWinamp ? 'border-[#505050]' : isLight ? 'border-gray-200' : 'border-gray-500/30'}`}>
                <button 
                    onClick={() => setActiveTab('NOTIFICATIONS')}
                    className={`flex-1 pb-3 text-center font-pixel text-xs transition-colors flex items-center justify-center gap-2 ${activeTab === 'NOTIFICATIONS' ? 'border-b-2 border-green-500 text-green-500 font-bold' : 'opacity-50 hover:opacity-100'}`}
                >
                    <XI icon={Bell} size={14} /> ИНФО
                    {myNotifs.some(n => !n.isRead) && <span className="w-1.5 h-1.5 bg-red-500 rounded-full"/>}
                </button>
                <button 
                    onClick={() => setActiveTab('MESSAGES')}
                    className={`flex-1 pb-3 text-center font-pixel text-xs transition-colors flex items-center justify-center gap-2 ${activeTab === 'MESSAGES' ? 'border-b-2 border-green-500 text-green-500 font-bold' : 'opacity-50 hover:opacity-100'}`}
                >
                    <XI icon={MessageCircle} size={14} /> ЧАТЫ
                </button>
                <button 
                    onClick={() => setActiveTab('TRADES')}
                    className={`flex-1 pb-3 text-center font-pixel text-xs transition-colors flex items-center justify-center gap-2 ${activeTab === 'TRADES' ? 'border-b-2 border-green-500 text-green-500 font-bold' : 'opacity-50 hover:opacity-100'}`}
                >
                    <XI icon={RefreshCw} size={14} /> ОБМЕН
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
                                    <XI icon={CheckCheck} size={14}/> Прочитать все
                                </button>
                            )}
                            <button onClick={handleRefresh} className={`text-[10px] hover:text-green-500 flex items-center gap-1 ${isRefreshing ? 'animate-spin opacity-100' : 'opacity-50'}`}>
                                <XI icon={RefreshCw} size={12}/>
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
                                        <img src={getUserAvatar(partner)} className={`w-10 h-10 rounded-full border shrink-0 object-cover ${isLight ? 'border-gray-300' : 'border-white/20'}`} />
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className={`font-bold font-pixel text-xs ${hasUnread ? 'text-green-500' : ''}`}>@{partner}</span>
                                                <span className="text-[9px] opacity-40 font-mono">{new Date(lastMsg.timestamp).toLocaleDateString()}</span>
                                            </div>
                                            <div className={`text-xs font-mono line-clamp-2 break-words ${hasUnread ? (isLight ? 'text-gray-900 font-bold' : 'text-white') : 'opacity-60'}`}>
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

            {flippingExhibit && ReactDOM.createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
                >
                    {/* Back button */}
                    <button
                        onClick={handleFlipOverlayClose}
                        className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all font-mono text-xs"
                    >
                        ← Назад
                    </button>

                    {/* Card flip container */}
                    <div
                        className="animate-card-flip relative flex-shrink-0"
                        style={{ transformStyle: 'preserve-3d', width: 260, height: 346 }}
                    >
                        {/* FRONT FACE — artifact photo */}
                        <div
                            className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl border-2 border-yellow-400/50"
                            style={{ backfaceVisibility: 'hidden' }}
                        >
                            <img
                                src={getImageUrl(flippingExhibit.imageUrls?.[0], 'medium')}
                                alt={flippingExhibit.title}
                                className="w-full h-full object-contain bg-black/60"
                            />
                        </div>

                        {/* BACK FACE — card "рубашка" */}
                        <div
                            className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl border-2 border-yellow-500/60"
                            style={{
                                backfaceVisibility: 'hidden',
                                transform: 'rotateY(180deg)',
                                background: 'linear-gradient(145deg, #0c1022 0%, #1b0e35 45%, #0c1022 100%)',
                            }}
                        >
                            <div className="absolute inset-[8px] rounded-xl border border-yellow-500/30" />
                            <div className="absolute inset-[16px] rounded-lg border border-yellow-400/20" />
                            <div className="absolute inset-0 opacity-10" style={{
                                backgroundImage: 'repeating-linear-gradient(45deg, #facc15 0px, #facc15 1px, transparent 1px, transparent 12px)',
                            }} />
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                                <div className="text-yellow-400/80 text-5xl select-none" style={{ textShadow: '0 0 20px rgba(234,179,8,0.6)' }}>✦</div>
                                <div className="text-yellow-400/40 font-pixel text-[9px] tracking-[0.3em] uppercase select-none">NeoArchive</div>
                            </div>
                            {['top-3 left-3','top-3 right-3','bottom-3 left-3','bottom-3 right-3'].map(pos => (
                                <div key={pos} className={`absolute ${pos} text-yellow-500/40 text-xs select-none`}>◆</div>
                            ))}
                        </div>
                    </div>

                    {/* Info below card */}
                    <div className="mt-6 flex flex-col items-center gap-2 select-none px-6 text-center">
                        <span className="text-white/50 font-mono text-[11px] tracking-widest uppercase">Получен новый статус</span>
                        <span className={`font-pixel text-3xl font-bold tracking-wider ${TIER_CONFIG[getArtifactTier(flippingExhibit)].color}`}>
                            {getArtifactTier(flippingExhibit)}
                        </span>
                        <span className="text-white/70 font-mono text-sm mt-1 max-w-xs break-words">
                            {flippingExhibit.title}
                        </span>
                    </div>

                    {/* Navigate CTA */}
                    <button
                        onClick={handleFlipOverlayClick}
                        className="mt-6 px-6 py-2 rounded-full border border-white/20 bg-white/10 text-white/50 hover:bg-white/20 hover:text-white transition-all font-mono text-[10px] tracking-widest"
                    >
                        нажмите, чтобы перейти →
                    </button>
                </div>,
                document.body
            )}

            {activeTab === 'TRADES' && (
                <div className="space-y-6">
                    {pendingIncomingTrades.length > 0 && (
                        <div>
                            <h3 className="font-pixel text-[10px] text-blue-400 mb-3 uppercase tracking-widest flex items-center gap-2"><XI icon={ArrowRight} size={12}/> Входящие запросы</h3>
                            <div className="space-y-2">{pendingIncomingTrades.map(renderTradeCard)}</div>
                        </div>
                    )}

                    {pendingOutgoingTrades.length > 0 && (
                        <div>
                            <h3 className="font-pixel text-[10px] opacity-50 mb-3 uppercase tracking-widest flex items-center gap-2"><XI icon={Clock} size={12}/> Отправленные (Ожидание)</h3>
                            <div className="space-y-2">{pendingOutgoingTrades.map(renderTradeCard)}</div>
                        </div>
                    )}

                    {historyTrades.length > 0 && (
                        <div>
                            <h3 className="font-pixel text-[10px] opacity-30 mb-3 uppercase tracking-widest flex items-center gap-2"><XI icon={BookOpen} size={12}/> История сделок</h3>
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

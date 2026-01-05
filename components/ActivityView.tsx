
import React, { useState } from 'react';
import { Bell, MessageCircle, ChevronDown, ChevronUp, Heart, MessageSquare, UserPlus, BookOpen, CheckCheck, RefreshCw, X, Check, ArrowRight, User, Clock, AlertTriangle } from 'lucide-react';
import { Notification, Message, UserProfile, Exhibit, TradeRequest } from '../types';
import { getUserAvatar, markNotificationsRead, getMyTradeRequests, acceptTradeRequest, updateTradeStatus, completeTradeRequest, getFullDatabase } from '../services/storageService';

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
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    const myNotifs = notifications.filter(n => n.recipient === currentUser.username);
    const myMessages = messages.filter(m => m.sender === currentUser.username || m.receiver === currentUser.username);
    const trades = getMyTradeRequests();
    
    // DB access for resolving item details
    const allExhibits = getFullDatabase().exhibits;

    const handleMarkAllRead = () => { markNotificationsRead(currentUser.username); };

    const groupedNotifs = myNotifs.reduce((acc, notif) => {
        const key = notif.targetId ? `${notif.type}_${notif.targetId}` : `${notif.type}_${new Date(notif.timestamp).toDateString()}`;
        if (!acc[key]) acc[key] = []; acc[key].push(notif); return acc;
    }, {} as Record<string, Notification[]>);

    const toggleGroup = (key: string) => { setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] })); };

    const getIconForType = (type: string) => {
        switch (type) {
            case 'LIKE': return <Heart size={14} className="text-red-500" />;
            case 'COMMENT': return <MessageSquare size={14} className="text-blue-500" />;
            case 'FOLLOW': return <UserPlus size={14} className="text-green-500" />;
            case 'GUESTBOOK': return <BookOpen size={14} className="text-yellow-500" />;
            case 'TRADE_OFFER': return <RefreshCw size={14} className="text-blue-400" />;
            case 'TRADE_ACCEPTED': return <Check size={14} className="text-green-400" />;
            case 'TRADE_DECLINED': return <X size={14} className="text-red-400" />;
            case 'TRADE_COMPLETED': return <CheckCheck size={14} className="text-gold-400" />;
            default: return <Bell size={14} />;
        }
    };

    const renderNotificationGroup = (key: string, group: Notification[]) => {
        const first = group[0];
        const isExpanded = expandedGroups[key];
        const count = group.length;
        const hasUnread = group.some(n => !n.isRead);
        const uniqueActors = Array.from(new Set(group.map(n => n.actor)));
        
        // Simpler title logic
        let title = 'Новое событие';
        if (first.type.includes('TRADE')) title = first.targetPreview || 'Обновление по сделке';
        else if (first.type === 'LIKE') title = `Понравился ваш артефакт "${first.targetPreview}"`;
        else if (first.type === 'COMMENT') title = `Новые комментарии к "${first.targetPreview}"`;
        else if (first.type === 'FOLLOW') title = `Новые подписчики`;

        const actorText = uniqueActors.length === 1 ? <span className="font-bold">@{uniqueActors[0]}</span> : <span className="font-bold">@{uniqueActors[0]} и еще {uniqueActors.length - 1}</span>;

        return (
            <div key={key} className={`border rounded mb-3 overflow-hidden transition-all ${theme === 'dark' ? 'border-gray-700 bg-gray-900/50' : theme === 'winamp' ? 'border-[#505050] bg-[#191919] text-[#00ff00]' : 'border-gray-200 bg-white'} ${hasUnread ? 'border-l-4 border-l-green-500' : 'opacity-70'}`}>
                <div onClick={() => toggleGroup(key)} className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${theme === 'dark' ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-100'}`}>{getIconForType(first.type)}</div>
                        <div>
                            <div className="text-xs font-mono opacity-50 mb-0.5">{first.timestamp.split(',')[0]}</div>
                            <div className="text-sm">{actorText}</div>
                            <div className="text-xs font-pixel opacity-80 mt-1">{title}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {count > 1 && <span className="text-[10px] bg-green-500 text-black px-1.5 rounded-full font-bold">+{count}</span>}
                        {hasUnread && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                </div>
                {isExpanded && (
                    <div className="border-t border-white/10">
                        {group.map(notif => (
                            <div key={notif.id} className={`p-3 flex items-center gap-3 hover:bg-white/5 border-b border-dashed border-white/10 last:border-0 ${!notif.isRead ? 'bg-green-500/5' : ''}`}>
                                <div className="flex-1 text-xs">
                                    <span onClick={() => onAuthorClick(notif.actor)} className="font-bold cursor-pointer hover:underline">@{notif.actor}</span>
                                    <span className="opacity-70 ml-2">{notif.timestamp}</span>
                                    {notif.type.includes('TRADE') && <button onClick={() => setActiveTab('TRADES')} className="float-right text-[10px] border px-2 rounded">VIEW TRADE</button>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const groupedMessages = Object.entries(myMessages.reduce((acc, m) => {
         const partner = m.sender === currentUser.username ? m.receiver : m.sender;
         if (!acc[partner] || new Date(m.timestamp) > new Date(acc[partner].timestamp)) acc[partner] = m;
         return acc;
    }, {} as Record<string, Message>)) as [string, Message][];

    const renderTradeCard = (req: TradeRequest) => {
        const isMyReq = req.sender === currentUser.username;
        const partner = isMyReq ? req.recipient : req.sender;
        const senderItems = req.senderItems.map(id => allExhibits.find(e => e.id === id)).filter(Boolean) as Exhibit[];
        const recipientItems = req.recipientItems.map(id => allExhibits.find(e => e.id === id)).filter(Boolean) as Exhibit[];
        
        // Visual logic: Left side is ME, Right side is THEM (for ease of reading)
        const myItems = isMyReq ? senderItems : recipientItems;
        const theirItems = isMyReq ? recipientItems : senderItems;

        const isActionRequired = (req.status === 'PENDING' && req.recipient === currentUser.username) || (req.status === 'COUNTER_OFFERED' && req.sender === currentUser.username) || (req.status === 'ACCEPTED');

        return (
            <div key={req.id} className={`border rounded-xl p-4 mb-4 transition-all ${theme === 'winamp' ? 'bg-[#292929] border-[#505050]' : 'bg-white/5 border-white/10'}`}>
                <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                        <RefreshCw size={16} className={isActionRequired ? "text-yellow-500 animate-pulse" : "opacity-50"}/>
                        <div className="text-xs font-bold uppercase tracking-widest">{req.type} TRADE <span className="opacity-50">#{req.id.slice(0,4)}</span></div>
                    </div>
                    <div className={`px-2 py-1 rounded text-[9px] font-bold uppercase ${req.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-500' : req.status === 'ACCEPTED' ? 'bg-blue-500/20 text-blue-500' : req.status === 'COMPLETED' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                        {req.status}
                    </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                    <div className="flex-1 bg-black/20 rounded p-2 border border-white/5">
                        <div className="text-[9px] opacity-50 mb-1 text-center">ВЫ ОТДАЕТЕ</div>
                        <div className="flex gap-1 justify-center flex-wrap">
                            {myItems.map(i => <img key={i.id} src={i.imageUrls[0]} className="w-8 h-8 rounded object-cover border border-white/10" title={i.title} />)}
                            {myItems.length === 0 && <span className="text-[9px] opacity-30 py-2">-</span>}
                        </div>
                    </div>
                    <ArrowRight size={16} className="opacity-30"/>
                    <div className="flex-1 bg-black/20 rounded p-2 border border-white/5">
                        <div className="text-[9px] opacity-50 mb-1 text-center">ВЫ ПОЛУЧАЕТЕ (от @{partner})</div>
                        <div className="flex gap-1 justify-center flex-wrap">
                            {theirItems.map(i => <img key={i.id} src={i.imageUrls[0]} className="w-8 h-8 rounded object-cover border border-white/10" title={i.title} />)}
                            {theirItems.length === 0 && <span className="text-[9px] opacity-30 py-2">-</span>}
                        </div>
                    </div>
                </div>

                {req.messages.length > 0 && (
                    <div className="bg-white/5 p-3 rounded mb-4 text-xs font-mono italic opacity-80">
                        "{req.messages[req.messages.length-1].text}"
                    </div>
                )}

                {/* Actions */}
                {isActionRequired && (
                    <div className="flex gap-2">
                        {req.status === 'ACCEPTED' ? (
                            <button onClick={() => completeTradeRequest(req.id)} className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded font-bold text-xs uppercase">ПОДТВЕРДИТЬ ПОЛУЧЕНИЕ</button>
                        ) : (
                            <>
                                <button onClick={() => acceptTradeRequest(req.id)} className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded font-bold text-xs uppercase">ПРИНЯТЬ</button>
                                <button onClick={() => updateTradeStatus(req.id, 'DECLINED')} className="flex-1 border border-red-500 text-red-500 hover:bg-red-500/10 py-2 rounded font-bold text-xs uppercase">ОТКЛОНИТЬ</button>
                            </>
                        )}
                    </div>
                )}
                
                {req.status === 'PENDING' && isMyReq && (
                    <button onClick={() => updateTradeStatus(req.id, 'CANCELLED')} className="w-full border border-white/20 hover:bg-white/10 text-xs py-2 rounded uppercase mt-2">ОТМЕНИТЬ ЗАПРОС</button>
                )}
            </div>
        );
    };

    return (
        <div className={`max-w-2xl mx-auto animate-in fade-in pb-20 ${theme === 'winamp' ? 'font-mono text-gray-300' : ''}`}>
            <div className={`flex mb-6 border-b ${theme === 'winamp' ? 'border-[#505050]' : 'border-gray-500/30'}`}>
                <button 
                    onClick={() => setActiveTab('NOTIFICATIONS')}
                    className={`flex-1 pb-3 text-center font-pixel text-xs transition-colors flex items-center justify-center gap-2 ${activeTab === 'NOTIFICATIONS' ? (theme === 'winamp' ? 'border-b-2 border-[#00ff00] text-[#00ff00]' : 'border-b-2 border-green-500 text-green-500 font-bold') : 'opacity-50 hover:opacity-100'}`}
                >
                    <Bell size={14} /> УВЕДОМЛЕНИЯ
                    {myNotifs.some(n => !n.isRead) && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"/>}
                </button>
                <button 
                    onClick={() => setActiveTab('MESSAGES')}
                    className={`flex-1 pb-3 text-center font-pixel text-xs transition-colors flex items-center justify-center gap-2 ${activeTab === 'MESSAGES' ? (theme === 'winamp' ? 'border-b-2 border-[#00ff00] text-[#00ff00]' : 'border-b-2 border-green-500 text-green-500 font-bold') : 'opacity-50 hover:opacity-100'}`}
                >
                    <MessageCircle size={14} /> СООБЩЕНИЯ
                </button>
                <button 
                    onClick={() => setActiveTab('TRADES')}
                    className={`flex-1 pb-3 text-center font-pixel text-xs transition-colors flex items-center justify-center gap-2 ${activeTab === 'TRADES' ? (theme === 'winamp' ? 'border-b-2 border-[#00ff00] text-[#00ff00]' : 'border-b-2 border-green-500 text-green-500 font-bold') : 'opacity-50 hover:opacity-100'}`}
                >
                    <RefreshCw size={14} /> ТРЕЙДЫ
                    {trades.actionRequired.length > 0 && <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"/>}
                </button>
            </div>

            <div className="space-y-4">
                {activeTab === 'NOTIFICATIONS' && (
                    <div>
                        {myNotifs.length > 0 && (
                            <div className="flex justify-end mb-4">
                                <button onClick={handleMarkAllRead} className="flex items-center gap-2 text-[10px] font-pixel opacity-50 hover:opacity-100">
                                    <CheckCheck size={14}/> ПРОЧИТАТЬ ВСЕ
                                </button>
                            </div>
                        )}
                        {Object.keys(groupedNotifs).length === 0 ? <div className="text-center opacity-50 font-mono py-10">НЕТ НОВЫХ СОБЫТИЙ</div> : (Object.entries(groupedNotifs) as [string, Notification[]][]).sort(([,a], [,b]) => b[0].timestamp.localeCompare(a[0].timestamp)).map(([key, group]) => renderNotificationGroup(key, group))}
                    </div>
                )}

                {activeTab === 'MESSAGES' && (
                    <div className="space-y-2">
                        {groupedMessages.length === 0 ? <div className="text-center opacity-50 font-mono py-10">СПИСОК СООБЩЕНИЙ ПУСТ</div> : groupedMessages.sort(([,a], [,b]) => b.timestamp.localeCompare(a.timestamp)).map(([partner, lastMsg]) => (
                            <div key={partner} onClick={() => onChatClick(partner)} className={`p-4 border rounded cursor-pointer hover:bg-white/5 flex gap-4 items-center transition-colors ${!lastMsg.isRead && lastMsg.receiver === currentUser.username ? 'border-green-500 bg-green-500/5' : (theme === 'dark' ? 'border-gray-700' : 'border-gray-200')}`}>
                                <div className="w-12 h-12 rounded-full overflow-hidden border border-white/20"><img src={getUserAvatar(partner)} className="w-full h-full object-cover" /></div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-sm flex justify-between mb-1">@{partner} <span className="opacity-50 font-normal text-[10px] font-mono">{lastMsg.timestamp.split(',')[1] || lastMsg.timestamp}</span></div>
                                    <div className={`text-xs font-mono truncate ${!lastMsg.isRead && lastMsg.receiver === currentUser.username ? 'text-green-500 font-bold' : 'opacity-70'}`}>{lastMsg.sender === currentUser.username ? 'Вы: ' : ''}{lastMsg.text}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'TRADES' && (
                    <div className="space-y-8">
                        {trades.actionRequired.length > 0 && (
                            <div>
                                <h3 className="text-xs font-bold mb-4 font-pixel text-yellow-500 flex items-center gap-2"><AlertTriangle size={14}/> ТРЕБУЕТ ДЕЙСТВИЯ ({trades.actionRequired.length})</h3>
                                {trades.actionRequired.map(renderTradeCard)}
                            </div>
                        )}

                        {trades.incoming.length > 0 && (
                            <div>
                                <h3 className="text-xs font-bold mb-4 font-pixel opacity-50">ВХОДЯЩИЕ / ОЖИДАЮТ ОТВЕТА ({trades.incoming.length})</h3>
                                {trades.incoming.map(renderTradeCard)}
                            </div>
                        )}

                        {trades.outgoing.length > 0 && (
                            <div>
                                <h3 className="text-xs font-bold mb-4 font-pixel opacity-50">ИСХОДЯЩИЕ ({trades.outgoing.length})</h3>
                                {trades.outgoing.map(renderTradeCard)}
                            </div>
                        )}

                        {trades.active.length > 0 && (
                            <div>
                                <h3 className="text-xs font-bold mb-4 font-pixel text-blue-400">АКТИВНЫЕ / В ПРОЦЕССЕ ({trades.active.length})</h3>
                                {trades.active.map(renderTradeCard)}
                            </div>
                        )}

                        {trades.history.length > 0 && (
                            <div className="opacity-60 grayscale hover:grayscale-0 transition-all">
                                <h3 className="text-xs font-bold mb-4 font-pixel opacity-50">ИСТОРИЯ ({trades.history.length})</h3>
                                {trades.history.slice(0, 5).map(renderTradeCard)}
                            </div>
                        )}
                        
                        {Object.values(trades).every(arr => arr.length === 0) && (
                            <div className="text-center py-20 opacity-30">
                                <RefreshCw size={48} className="mx-auto mb-4"/>
                                <p className="font-pixel text-xs uppercase">Нет активных сделок</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityView;

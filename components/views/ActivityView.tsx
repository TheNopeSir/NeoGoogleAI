
import React, { useMemo } from 'react';
import { Heart, MessageSquare, User, MessageCircle } from 'lucide-react';
import { Notification, Message, UserProfile } from '../../types';
import { getUserAvatar } from '../../services/storageService';

interface ActivityViewProps {
    theme: 'dark' | 'light';
    user: UserProfile | null;
    notifications: Notification[];
    messages: Message[];
    activityTab: 'UPDATES' | 'DIALOGS';
    setActivityTab: (tab: 'UPDATES' | 'DIALOGS') => void;
    handleOpenUpdates: () => void;
    handleAuthorClick: (author: string) => void;
    handleOpenChat: (partner: string) => void;
}

const ActivityView: React.FC<ActivityViewProps> = ({
    theme,
    user,
    notifications,
    messages,
    activityTab,
    setActivityTab,
    handleOpenUpdates,
    handleAuthorClick,
    handleOpenChat
}) => {
    const myNotifications = notifications.filter(n => n.recipient === user?.username);

    const aggregatedNotifs = useMemo(() => {
        const groups: Record<string, { base: Notification, actors: Set<string>, count: number, latestTime: string }> = {};

        myNotifications.forEach(n => {
            let key = n.type;
            if (n.targetId) key += `_${n.targetId}`;
            else if (n.type === 'FOLLOW') key += `_${n.timestamp.split(',')[0]}`; 

            if (!groups[key]) {
                groups[key] = { base: n, actors: new Set([n.actor]), count: 1, latestTime: n.timestamp };
            } else {
                groups[key].actors.add(n.actor);
                groups[key].count++;
                if (!n.isRead) groups[key].base.isRead = false;
                if (n.timestamp > groups[key].latestTime) groups[key].latestTime = n.timestamp;
            }
        });

        return Object.values(groups).sort((a, b) => {
            return b.latestTime.localeCompare(a.latestTime);
        });
    }, [myNotifications]);

    return (
        <div className="max-w-2xl mx-auto animate-in fade-in">
            <div className="flex justify-center mb-6 border-b border-gray-500/30">
                <button onClick={handleOpenUpdates} className={`px-6 py-3 font-pixel text-xs font-bold border-b-2 transition-colors relative ${activityTab === 'UPDATES' ? (theme === 'dark' ? 'border-dark-primary text-dark-primary' : 'border-light-accent text-light-accent') : 'border-transparent opacity-50'}`}>ОБНОВЛЕНИЯ {myNotifications.some(n => !n.isRead) && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>}</button>
                <button onClick={() => setActivityTab('DIALOGS')} className={`px-6 py-3 font-pixel text-xs font-bold border-b-2 transition-colors relative ${activityTab === 'DIALOGS' ? (theme === 'dark' ? 'border-dark-primary text-dark-primary' : 'border-light-accent text-light-accent') : 'border-transparent opacity-50'}`}>ДИАЛОГИ {messages.some(m => m.receiver === user?.username && !m.isRead) && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>}</button>
            </div>

            {activityTab === 'UPDATES' && (
                <div className="space-y-4">
                    {aggregatedNotifs.length === 0 ? (
                        <div className="text-center opacity-50 font-mono py-10">НЕТ НОВЫХ УВЕДОМЛЕНИЙ</div>
                    ) : (
                        aggregatedNotifs.map(group => {
                            const notif = group.base;
                            const actors = Array.from(group.actors);
                            const mainActor = actors[0];
                            const otherCount = group.count - 1;

                            return (
                                <div key={notif.id + '_group'} className={`p-4 rounded border flex items-start gap-4 ${theme === 'dark' ? 'bg-dark-surface border-dark-dim' : 'bg-white border-light-dim'} ${!notif.isRead ? 'border-l-4 border-l-red-500' : ''}`}>
                                    <div className="mt-1">
                                        {notif.type === 'LIKE' && <Heart className="text-red-500" size={16} />}
                                        {notif.type === 'COMMENT' && <MessageSquare className="text-blue-500" size={16} />}
                                        {notif.type === 'FOLLOW' && <User className="text-green-500" size={16} />}
                                        {notif.type === 'GUESTBOOK' && <MessageCircle className="text-yellow-500" size={16} />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-pixel text-xs opacity-50 mb-1 flex justify-between">
                                            <span>{group.latestTime}</span>
                                            {!notif.isRead && <span className="text-red-500 font-bold">NEW</span>}
                                        </div>
                                        <div className="font-mono text-sm">
                                            <span className="font-bold cursor-pointer hover:underline" onClick={() => handleAuthorClick(mainActor)}>@{mainActor}</span>
                                            {otherCount > 0 && <span className="opacity-70"> и еще {otherCount}</span>}

                                            {notif.type === 'LIKE' && ` оценили "${notif.targetPreview}".`}
                                            {notif.type === 'COMMENT' && ` прокомментировали "${notif.targetPreview}".`}
                                            {notif.type === 'FOLLOW' && ' подписались на вас.'}
                                            {notif.type === 'GUESTBOOK' && ' написали в гостевой книге.'}
                                        </div>
                                        {notif.type === 'COMMENT' && group.count === 1 && notif.targetPreview && (
                                            <div className="mt-2 text-xs opacity-70 italic border-l-2 pl-2 border-current">
                                                "{notif.targetPreview}"
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {activityTab === 'DIALOGS' && (
                <div className="space-y-4">
                    {messages.length === 0 ? (
                        <div className="text-center opacity-50 font-mono py-10">НЕТ АКТИВНЫХ КАНАЛОВ СВЯЗИ</div>
                    ) : (
                        [...new Set(messages.filter(m => m.sender === user?.username || m.receiver === user?.username).map(m => m.sender === user?.username ? m.receiver : m.sender))].map(partner => {
                            const unreadCount = messages.filter(m => m.sender === partner && m.receiver === user?.username && !m.isRead).length;
                            return (
                                <div key={partner} onClick={() => handleOpenChat(partner)} className={`p-4 rounded border flex items-center gap-4 cursor-pointer transition-all hover:translate-x-1 ${theme === 'dark' ? 'bg-dark-surface border-dark-dim hover:border-dark-primary' : 'bg-white border-light-dim hover:border-light-accent'}`}>
                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-500 relative">
                                        <img src={getUserAvatar(partner)} alt="Avatar" />
                                        {unreadCount > 0 && (<div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border border-black animate-pulse"></div>)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <span className="font-pixel text-sm font-bold">@{partner}</span>
                                            {unreadCount > 0 && <span className="text-[10px] font-bold bg-red-500 text-white px-2 rounded-full">{unreadCount} NEW</span>}
                                        </div>
                                        <div className="font-mono text-xs opacity-80 truncate">Нажмите для перехода в чат</div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            )}
        </div>
    );
};

export default ActivityView;

import React from 'react';
import { Home, Package, PlusCircle, Bell, User } from 'lucide-react';
import { ViewState } from '../types';

interface MobileNavigationProps {
    theme: 'dark' | 'light';
    view: ViewState;
    setView: (v: ViewState) => void;
    updateHash: (path: string) => void;
    hasNotifications: boolean;
    username: string;
    onResetFeed: () => void;
    onProfileClick: () => void;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({ theme, view, setView, updateHash, hasNotifications, onResetFeed, onProfileClick }) => {
    const navItems = [
        { id: 'FEED', icon: Home, label: 'ГЛАВНАЯ', action: () => { onResetFeed(); setView('FEED'); updateHash('/feed'); } },
        { id: 'MY_COLLECTION', icon: Package, label: 'ПОЛКА', action: () => { setView('MY_COLLECTION'); updateHash('/my-collection'); } },
        { id: 'ADD', icon: PlusCircle, label: 'ДОБАВИТЬ', action: () => { setView('CREATE_HUB'); updateHash('/create'); }, highlight: true },
        { id: 'ACTIVITY', icon: Bell, label: 'АКТИВНОСТЬ', action: () => { setView('ACTIVITY'); updateHash('/activity'); }, hasBadge: hasNotifications },
        { id: 'PROFILE', icon: User, label: 'ПРОФИЛЬ', action: onProfileClick }
    ];

    return (
        <div className={`md:hidden fixed bottom-0 left-0 w-full z-50 border-t pb-safe ${
            theme === 'dark' ? 'bg-black/95 border-dark-dim text-gray-400' : 'bg-white/95 border-light-dim text-gray-500'
        }`}>
            <div className="flex justify-around items-center h-16">
                {navItems.map(item => {
                    const isActive = view === item.id || (item.id === 'PROFILE' && view === 'USER_PROFILE') || (item.id === 'ADD' && ['CREATE_HUB', 'CREATE_ARTIFACT', 'CREATE_COLLECTION'].includes(view)) || (item.id === 'ACTIVITY' && ['ACTIVITY', 'DIRECT_CHAT'].includes(view));
                    return (
                        <button 
                            key={item.id}
                            onClick={item.action}
                            className={`flex flex-col items-center justify-center w-full h-full gap-1 relative ${
                                isActive 
                                ? (theme === 'dark' ? 'text-dark-primary' : 'text-light-accent') 
                                : ''
                            }`}
                        >
                            <item.icon 
                                size={item.highlight ? 28 : 20} 
                                strokeWidth={item.highlight ? 2 : 1.5}
                                className={item.highlight ? (theme === 'dark' ? 'text-dark-primary' : 'text-light-accent') : ''}
                            />
                            {!item.highlight && <span className="text-[8px] font-pixel mt-1">{item.label}</span>}
                            {item.hasBadge && (
                                <span className="absolute top-3 right-6 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default MobileNavigation;
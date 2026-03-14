import React from 'react';
import { UserProfile } from '../types';

export const renderTextWithMentions = (
    text: string,
    onUserClick: (username: string) => void,
    users?: UserProfile[]
): React.ReactNode => {
    if (!text) return '';
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
        if (part.startsWith('@')) {
            const username = part.slice(1);
            const userObj = users?.find(u => u.username.toLowerCase() === username.toLowerCase());
            return React.createElement(
                'span',
                { key: i, className: 'relative group/mention inline-block' },
                React.createElement(
                    'span',
                    {
                        onClick: (e: React.MouseEvent) => { e.stopPropagation(); onUserClick(username); },
                        className: 'text-blue-400 cursor-pointer hover:underline font-bold'
                    },
                    part
                ),
                userObj && React.createElement(
                    'span',
                    {
                        className: 'absolute bottom-full left-0 mb-1 hidden group-hover/mention:flex items-center gap-1.5 bg-black border border-white/10 rounded-lg px-2 py-1 text-[10px] font-mono whitespace-nowrap z-50 shadow-xl pointer-events-none'
                    },
                    React.createElement('img', {
                        src: userObj.avatarUrl,
                        className: 'w-4 h-4 rounded-full'
                    }),
                    `@${username}`
                )
            );
        }
        return part;
    });
};

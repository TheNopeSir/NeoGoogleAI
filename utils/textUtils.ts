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
        if (/^@\w+$/.test(part)) {
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

export const validateMessageText = (text: string): string | null => {
    const t = text.trim();
    if (t.length > 2000) return 'Сообщение слишком длинное (максимум 2000 символов).';
    if (/(.)\1{9,}/u.test(t)) return 'Не используйте повторяющиеся символы.';
    if ((t.match(/https?:\/\//gi) || []).length > 3) return 'Слишком много ссылок.';
    return null;
};

export const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,30}$/;

export const validateUsername = (username: string): string | null => {
    const u = username.trim();
    if (u.length < 3)  return 'Имя пользователя должно быть не короче 3 символов.';
    if (u.length > 30) return 'Имя пользователя не может быть длиннее 30 символов.';
    if (!USERNAME_REGEX.test(u)) return 'Только латинские буквы, цифры, _ и - (без пробелов).';
    return null;
};

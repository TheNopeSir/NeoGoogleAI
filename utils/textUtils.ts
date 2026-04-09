import React from 'react';
import { UserProfile } from '../types';
import { splitTextWithEmoji, getKolobokSrc } from './koloboks';

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
        // Plain text segment — replace emoji with koloboks
        const segments = splitTextWithEmoji(part);
        return React.createElement(
            React.Fragment,
            { key: i },
            ...segments.map((seg, j) => {
                if (seg.type === 'emoji') {
                    const src = getKolobokSrc(seg.value);
                    if (src) return React.createElement('img', {
                        key: j, src, alt: seg.value,
                        width: 22, height: 22,
                        className: 'inline-block align-middle rounded select-none mx-0.5',
                        draggable: false,
                        onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
                            const span = document.createElement('span');
                            span.textContent = seg.value;
                            e.currentTarget.replaceWith(span);
                        },
                    });
                }
                return seg.value;
            })
        );
    });
};

// --- STOP WORDS ---
// Нормализация текста: нижний регистр + замена латинских омоглифов на кириллицу
const normalizeForFilter = (text: string): string =>
    text
        .toLowerCase()
        .replace(/a/g, 'а').replace(/e/g, 'е').replace(/o/g, 'о')
        .replace(/p/g, 'р').replace(/c/g, 'с').replace(/x/g, 'х')
        .replace(/y/g, 'у').replace(/b/g, 'в').replace(/m/g, 'м')
        .replace(/h/g, 'н').replace(/k/g, 'к').replace(/t/g, 'т')
        .replace(/0/g, 'о').replace(/3/g, 'е').replace(/\|/g, 'и')
        .replace(/[\s\-_.*]+/g, ''); // убираем пробелы и разделители

// Корни стоп-слов (паттерны регексов для поиска вхождений в нормализованном тексте)
const STOP_WORD_PATTERNS: RegExp[] = [
    // Русский мат — основные корни
    /хуй|хуе|хуя|хую|хуем|хуев|хуях|хуищ|хуёв|хуёт|хуёт/,
    /пизд|пизж/,
    /ёбан|ебан|еба[лн]|ёба[лн]|ебё|ёбё|ёбат|ебат|ебли|ебут|ёбут|ебла|ебло|ебёт|заеб|заёб|наеб|наёб|поеб|поёб|проеб|уеб|уёб|выеб|выёб|отеб|отёб|ибан/,
    /бляд|блядь|блять|блядства|бляк|блядун/,
    /мудак|мудил|мудозвон/,
    /сука|суки|суку|суке|сукин/,
    /пидор|пидар|педик|пидрил|пидрас|питух/,
    /залуп|залупа/,
    /ёбан|ёбну|ёбать|ёбнут/,
    /👹|🖕/,
    // Наркотики
    /наркот|героин|кокаин|метамф|мефедрон|спайс|закладк|кладмен|амфетам|фенамин|лсд|экстази|мдма|каннаби/,
    // Спам / мошенничество
    /казино|рулетк|ставки.*выигр|выигр.*ставки|1win|1хбет|1xbet|mostbet|melbet|вавада|vavada|betwinner/,
    /кредит.*онлайн|займ.*срочно|деньги.*быстро.*без|мфо.*без|одобрим.*кредит/,
    /отмыва|обнал|отмыт.*деньг|накрут.*подписч|накрут.*лайк|накрут.*просмотр/,
    /купить.*паспорт|купи.*права|поддельн.*документ|фальшивые.*документ/,
    // English profanity
    /\bfuck\b|fucki|fucker|motherfuck/,
    /\bshit\b|bullshit/,
    /\bcunt\b/,
    /\bnigger\b|\bnigga\b/,
    /\bfaggot\b|\bfag\b/,
    /\bwhore\b|\bslut\b/,
    /\bbitchin\b/,
];

export const containsStopWords = (text: string): boolean => {
    const normalized = normalizeForFilter(text);
    return STOP_WORD_PATTERNS.some(re => re.test(normalized));
};

export const validateMessageText = (text: string): string | null => {
    const t = text.trim();
    if (t.length > 2000) return 'Сообщение слишком длинное (максимум 2000 символов).';
    if (/(.)\1{9,}/u.test(t)) return 'Не используйте повторяющиеся символы.';
    if ((t.match(/https?:\/\//gi) || []).length > 3) return 'Слишком много ссылок.';
    if (containsStopWords(t)) return 'Сообщение содержит недопустимые слова.';
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

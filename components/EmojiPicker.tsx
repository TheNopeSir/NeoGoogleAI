import React, { useEffect, useMemo, useRef } from 'react';
import Kolobok from './Kolobok';
import { KOLOBOK_LIST, trackKolobokUse, getFrequentKoloboks, QUICK_REACTIONS } from '../utils/koloboks';

interface EmojiPickerProps {
    onSelect: (emoji: string) => void;
    onClose: () => void;
    theme: 'dark' | 'light' | 'xp' | 'winamp';
    currentUsername?: string;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect, onClose, theme, currentUsername }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    // Top 12 frequent emojis for "recently used" strip
    const recentEmojis = useMemo(
        () => getFrequentKoloboks(currentUsername ?? '', QUICK_REACTIONS, 12),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [currentUsername],
    );
    // Only show recent strip if the user has actually used anything
    const hasRecent = useMemo(() => {
        if (!currentUsername) return false;
        try {
            const freq = JSON.parse(localStorage.getItem(`kolobok_freq_${currentUsername}`) || '{}');
            return Object.keys(freq).length > 0;
        } catch { return false; }
    }, [currentUsername]);

    const handleSelect = (emoji: string) => {
        if (currentUsername) trackKolobokUse(currentUsername, emoji);
        onSelect(emoji);
        onClose();
    };

    const bgClass = theme === 'winamp'
        ? 'bg-[#191919] border-[#505050]'
        : theme === 'xp'
        ? 'bg-[#ECE9D8] border-[#0058EE]'
        : theme === 'light'
        ? 'bg-white border-gray-200'
        : 'bg-[#111] border-white/10';

    const btnHover = theme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/10';
    const labelColor = theme === 'light' ? 'text-gray-400' : 'text-white/30';
    const divider = theme === 'light' ? 'border-gray-100' : 'border-white/8';

    return (
        <div
            ref={ref}
            className={`absolute bottom-full mb-2 right-0 z-50 border rounded-2xl p-2 shadow-2xl ${bgClass}`}
            style={{ width: 228 }}
        >
            {/* Recently used strip */}
            {hasRecent && (
                <div className={`mb-1.5 pb-1.5 border-b ${divider}`}>
                    <div className={`text-[8px] font-mono uppercase tracking-widest px-0.5 mb-0.5 ${labelColor}`}>
                        ЧАСТО
                    </div>
                    <div className="flex flex-wrap gap-0.5">
                        {recentEmojis.map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => handleSelect(emoji)}
                                className={`w-9 h-9 flex items-center justify-center rounded-xl ${btnHover} hover:scale-110 active:scale-90 transition-all`}
                            >
                                <Kolobok emoji={emoji} size={30} />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Full grid */}
            <div className="grid grid-cols-6 gap-0.5 max-h-52 overflow-y-auto no-scrollbar">
                {KOLOBOK_LIST.map(emoji => (
                    <button
                        key={emoji}
                        onClick={() => handleSelect(emoji)}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl ${btnHover} active:scale-90 transition-all`}
                    >
                        <Kolobok emoji={emoji} size={30} />
                    </button>
                ))}
            </div>
        </div>
    );
};

export default EmojiPicker;

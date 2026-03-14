import React, { useEffect, useRef } from 'react';

const EMOJIS = [
    '😀', '😂', '🥰', '😍',
    '🤩', '😮', '😢', '😡',
    '👍', '👎', '❤️', '🔥',
    '💯', '🎉', '🏆', '💎',
];

interface EmojiPickerProps {
    onSelect: (emoji: string) => void;
    onClose: () => void;
    theme: 'dark' | 'light' | 'xp' | 'winamp';
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect, onClose, theme }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    const isWinamp = theme === 'winamp';
    const isXP = theme === 'xp';
    const isLight = theme === 'light';

    const bgClass = isWinamp
        ? 'bg-[#191919] border-[#505050]'
        : isXP
        ? 'bg-[#ECE9D8] border-[#0058EE]'
        : isLight
        ? 'bg-white border-gray-200'
        : 'bg-black border-white/10';

    return (
        <div
            ref={ref}
            className={`absolute bottom-full mb-2 right-0 z-50 border rounded-2xl p-2 shadow-2xl ${bgClass}`}
        >
            <div className="grid grid-cols-4 gap-1">
                {EMOJIS.map(emoji => (
                    <button
                        key={emoji}
                        onClick={() => { onSelect(emoji); onClose(); }}
                        className="w-9 h-9 text-xl flex items-center justify-center rounded-xl hover:bg-white/10 active:scale-90 transition-all"
                    >
                        {emoji}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default EmojiPicker;

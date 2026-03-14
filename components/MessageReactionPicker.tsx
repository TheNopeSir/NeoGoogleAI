import React from 'react';
import { MessageReactionEmoji } from '../types';

const REACTION_EMOJIS: MessageReactionEmoji[] = ['❤️', '😂', '😮', '😢', '👍', '🔥', '👀', '💯'];

interface MessageReactionPickerProps {
    position: { x: number; y: number };
    onReact: (emoji: MessageReactionEmoji) => void;
    onClose: () => void;
    theme: 'dark' | 'light' | 'xp' | 'winamp';
}

const MessageReactionPicker: React.FC<MessageReactionPickerProps> = ({ position, onReact, onClose, theme }) => {
    const isWinamp = theme === 'winamp';
    const isXP = theme === 'xp';
    const isLight = theme === 'light';

    const bgClass = isWinamp
        ? 'bg-[#191919] border-[#505050]'
        : isXP
        ? 'bg-[#ECE9D8] border-[#0058EE]'
        : isLight
        ? 'bg-white border-gray-200 shadow-lg'
        : 'bg-[#111] border-white/10';

    // Clamp position so the picker doesn't go off-screen
    const pickerWidth = 304; // ~8 emojis * 38px
    const pickerHeight = 52;
    const left = Math.min(position.x, window.innerWidth - pickerWidth - 8);
    const top = Math.max(position.y - pickerHeight - 8, 8);

    return (
        <>
            <div
                className="fixed inset-0 z-[199]"
                onClick={onClose}
                onContextMenu={e => { e.preventDefault(); onClose(); }}
            />
            <div
                className={`fixed z-[200] border rounded-2xl px-3 py-2 shadow-2xl flex gap-1 ${bgClass}`}
                style={{ left, top }}
            >
                {REACTION_EMOJIS.map(emoji => (
                    <button
                        key={emoji}
                        onClick={() => { onReact(emoji); onClose(); }}
                        className="text-2xl w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 hover:scale-125 active:scale-90 transition-all"
                    >
                        {emoji}
                    </button>
                ))}
            </div>
        </>
    );
};

export default MessageReactionPicker;

import React, { useRef } from 'react';
import Kolobok from './Kolobok';
import { CornerDownRight } from 'lucide-react';
import { MessageReactionEmoji } from '../types';

const REACTION_EMOJIS: MessageReactionEmoji[] = ['❤️', '😂', '😮', '😢', '👍', '🔥', '👀', '💯'];

interface MessageReactionPickerProps {
    position: { x: number; y: number };
    onReact: (emoji: MessageReactionEmoji) => void;
    onClose: () => void;
    onReply?: () => void;
    theme: 'dark' | 'light' | 'xp' | 'winamp';
}

const MessageReactionPicker: React.FC<MessageReactionPickerProps> = ({ position, onReact, onClose, onReply, theme }) => {
    // Timestamp when picker mounted — used to ignore the synthetic click
    // that fires after a long-press gesture ends.
    const mountedAtRef = useRef(Date.now());

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
    const pickerHeight = onReply ? 90 : 52;
    const left = Math.min(Math.max(position.x - pickerWidth / 2, 8), window.innerWidth - pickerWidth - 8);
    const top = Math.max(position.y - pickerHeight - 12, 8);

    const handleBackdropClose = () => {
        // Ignore close requests within 700ms of mount — the synthetic click/touchend
        // from the long-press gesture that opened the picker would fire immediately otherwise.
        if (Date.now() - mountedAtRef.current < 700) return;
        onClose();
    };

    return (
        <>
            {/* Backdrop — only uses onClick (not onTouchEnd) to avoid race with the opening gesture */}
            <div
                className="fixed inset-0 z-[199]"
                onClick={handleBackdropClose}
            />
            <div
                className={`fixed z-[200] border rounded-2xl shadow-2xl ${bgClass}`}
                style={{ left, top, width: pickerWidth }}
                onClick={e => e.stopPropagation()}
            >
                {/* Emoji row */}
                <div className="flex gap-0.5 px-2 pt-2 pb-1">
                    {REACTION_EMOJIS.map(emoji => (
                        <button
                            key={emoji}
                            onClick={() => { onReact(emoji); onClose(); }}
                            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 hover:scale-125 active:scale-90 transition-all"
                        >
                            <Kolobok emoji={emoji} size={28} />
                        </button>
                    ))}
                </div>
                {/* Reply action */}
                {onReply && (
                    <div className={`mx-2 mb-2 border-t ${isLight ? 'border-gray-100' : 'border-white/10'}`}>
                        <button
                            onClick={() => { onReply(); onClose(); }}
                            className={`w-full flex items-center gap-2 px-2 py-2 rounded-xl text-[11px] font-pixel transition-colors mt-1 ${isLight ? 'hover:bg-gray-50 text-gray-700' : 'hover:bg-white/10 text-white/70'}`}
                        >
                            <CornerDownRight size={13} className="text-green-500" />
                            Ответить
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};

export default MessageReactionPicker;

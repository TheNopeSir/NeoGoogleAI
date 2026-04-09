import React, { useMemo, useRef, useState } from 'react';
import { CornerDownRight } from 'lucide-react';
import { MessageReactionEmoji } from '../types';
import Kolobok from './Kolobok';
import { KOLOBOK_LIST, QUICK_REACTIONS, trackKolobokUse, getFrequentKoloboks } from '../utils/koloboks';

interface MessageReactionPickerProps {
    position: { x: number; y: number };
    onReact: (emoji: MessageReactionEmoji) => void;
    onClose: () => void;
    onReply?: () => void;
    theme: 'dark' | 'light' | 'xp' | 'winamp';
    currentUsername?: string;
}

const MessageReactionPicker: React.FC<MessageReactionPickerProps> = ({
    position, onReact, onClose, onReply, theme, currentUsername,
}) => {
    const mountedAtRef = useRef(Date.now());
    const [showAll, setShowAll] = useState(false);

    const displayReactions = useMemo(
        () => getFrequentKoloboks(currentUsername ?? '', QUICK_REACTIONS),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [currentUsername],
    );

    const handleReact = (emoji: MessageReactionEmoji) => {
        if (currentUsername) trackKolobokUse(currentUsername, emoji);
        onReact(emoji);
        onClose();
    };

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

    const pickerW = showAll ? 288 : 312;
    const reactionH = showAll ? 160 : 52;
    const pickerH = reactionH + (onReply ? 44 : 0);
    const left = Math.min(Math.max(position.x - pickerW / 2, 8), window.innerWidth - pickerW - 8);
    const top = Math.max(position.y - pickerH - 12, 8);

    const handleBackdropClose = () => {
        if (Date.now() - mountedAtRef.current < 700) return;
        onClose();
    };

    const btnHover = isLight ? 'hover:bg-gray-100' : 'hover:bg-white/10';

    return (
        <>
            <div className="fixed inset-0 z-[199]" onClick={handleBackdropClose} />
            <div
                className={`fixed z-[200] border rounded-2xl shadow-2xl overflow-hidden ${bgClass}`}
                style={{ left, top, width: pickerW }}
                onClick={e => e.stopPropagation()}
            >
                {showAll ? (
                    /* Full kolobok grid */
                    <div className="p-1.5">
                        <div className="grid grid-cols-8 gap-0.5 max-h-36 overflow-y-auto no-scrollbar">
                            {KOLOBOK_LIST.map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={() => handleReact(emoji as MessageReactionEmoji)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-lg ${btnHover} hover:scale-110 active:scale-90 transition-all`}
                                >
                                    <Kolobok emoji={emoji} size={24} />
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowAll(false)}
                            className={`mt-1 w-full text-[10px] font-mono opacity-50 hover:opacity-80 py-0.5 ${isLight ? 'text-gray-600' : 'text-white'}`}
                        >
                            ↑ свернуть
                        </button>
                    </div>
                ) : (
                    /* Quick row + expand button */
                    <div className="flex items-center px-1.5 py-1.5 gap-0.5">
                        <div className="flex gap-0.5">
                            {displayReactions.map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={() => handleReact(emoji as MessageReactionEmoji)}
                                    className={`w-9 h-9 flex items-center justify-center rounded-xl ${btnHover} hover:scale-125 active:scale-90 transition-all`}
                                >
                                    <Kolobok emoji={emoji} size={28} />
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowAll(true)}
                            className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl text-base font-bold opacity-50 hover:opacity-100 transition-opacity ${btnHover}`}
                            title="Все реакции"
                        >
                            ＋
                        </button>
                    </div>
                )}

                {/* Reply */}
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

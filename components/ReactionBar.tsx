import React, { useEffect, useRef, useState } from 'react';
import Kolobok from './Kolobok';
import { MessageReaction, MessageReactionEmoji } from '../types';
import { getUserAvatar } from '../services/storageService';

interface ReactionBarProps {
    reactions: MessageReaction[];
    currentUsername: string;
    onReact: (emoji: MessageReactionEmoji) => void;
    isMe: boolean;
    theme: 'dark' | 'light' | 'xp' | 'winamp';
}

const ReactionBar: React.FC<ReactionBarProps> = ({ reactions, currentUsername, onReact, isMe, theme }) => {
    const [popover, setPopover] = useState<string | null>(null); // emoji key of open popover
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!popover) return;
        const handler = (e: MouseEvent | TouchEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                setPopover(null);
            }
        };
        document.addEventListener('mousedown', handler);
        document.addEventListener('touchstart', handler);
        return () => {
            document.removeEventListener('mousedown', handler);
            document.removeEventListener('touchstart', handler);
        };
    }, [popover]);

    if (!reactions || reactions.length === 0) return null;

    const isWinamp = theme === 'winamp';
    const isXP = theme === 'xp';
    const isLight = theme === 'light';

    const activeClass = isWinamp
        ? 'bg-[#005000] border-[#00ff00] text-[#00ff00]'
        : isXP
        ? 'bg-[#003C74]/20 border-[#003C74] text-[#003C74]'
        : isLight
        ? 'bg-green-100 border-green-400 text-green-700'
        : 'bg-green-500/20 border-green-500/40 text-green-400';
    const inactiveClass = isWinamp
        ? 'bg-[#191919] border-[#505050] text-gray-400 hover:bg-[#252525]'
        : isXP
        ? 'bg-[#ECE9D8] border-[#ACA899] text-black hover:bg-[#D4D0C8]'
        : isLight
        ? 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'
        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10';

    const popoverBg = isWinamp
        ? 'bg-[#191919] border-[#505050]'
        : isXP ? 'bg-[#ECE9D8] border-[#ACA899]'
        : isLight ? 'bg-white border-gray-200 shadow-lg'
        : 'bg-[#1a1a2e] border-white/10 shadow-xl';

    const popoverText = isWinamp ? 'text-[#00ff00]' : isLight ? 'text-gray-800' : 'text-white';

    return (
        <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
            {reactions.map(reaction => {
                const reacted = reaction.users.includes(currentUsername);
                const isOpen = popover === reaction.emoji;

                return (
                    <div key={reaction.emoji} className="relative">
                        {/* Who-reacted popover */}
                        {isOpen && (
                            <div
                                ref={popoverRef}
                                className={`absolute bottom-full mb-1.5 ${isMe ? 'right-0' : 'left-0'} z-50 border rounded-xl px-2.5 py-2 min-w-[120px] max-w-[200px] ${popoverBg}`}
                            >
                                <div className={`text-[9px] font-mono uppercase tracking-widest opacity-50 mb-1.5 ${popoverText}`}>
                                    Реагировали
                                </div>
                                <div className="flex flex-col gap-1">
                                    {reaction.users.map(u => (
                                        <div key={u} className="flex items-center gap-1.5">
                                            <img
                                                src={getUserAvatar(u)}
                                                className="w-4 h-4 rounded-full flex-shrink-0"
                                                alt={u}
                                            />
                                            <span className={`text-[11px] font-mono truncate ${popoverText}`}>
                                                {u === currentUsername ? `${u} (я)` : u}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Reaction pill */}
                        <button
                            className={`flex items-center gap-1 pl-1.5 pr-0.5 py-0.5 rounded-full text-[11px] font-mono border transition-all active:scale-90 cursor-pointer ${reacted ? activeClass : inactiveClass}`}
                            onClick={() => onReact(reaction.emoji as MessageReactionEmoji)}
                        >
                            <Kolobok emoji={reaction.emoji} size={18} />
                            {/* Count — tap to see who reacted */}
                            <span
                                className="px-1 min-w-[1.25rem] text-center"
                                onClick={e => {
                                    e.stopPropagation();
                                    setPopover(isOpen ? null : reaction.emoji);
                                }}
                            >
                                {reaction.users.length}
                            </span>
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

export default ReactionBar;

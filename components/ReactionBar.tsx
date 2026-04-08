import React from 'react';
import Kolobok from './Kolobok';
import { MessageReaction, MessageReactionEmoji } from '../types';

interface ReactionBarProps {
    reactions: MessageReaction[];
    currentUsername: string;
    onReact: (emoji: MessageReactionEmoji) => void;
    isMe: boolean;
    theme: 'dark' | 'light' | 'xp' | 'winamp';
}

const ReactionBar: React.FC<ReactionBarProps> = ({ reactions, currentUsername, onReact, isMe, theme }) => {
    if (!reactions || reactions.length === 0) return null;

    const isWinamp = theme === 'winamp';
    const isXP = theme === 'xp';
    const isLight = theme === 'light';

    return (
        <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
            {reactions.map(reaction => {
                const reacted = reaction.users.includes(currentUsername);
                const baseClass = 'flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono border transition-all active:scale-90 cursor-pointer';
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

                return (
                    <button
                        key={reaction.emoji}
                        onClick={() => onReact(reaction.emoji as MessageReactionEmoji)}
                        className={`${baseClass} ${reacted ? activeClass : inactiveClass}`}
                        title={reaction.users.join(', ')}
                    >
                        <Kolobok emoji={reaction.emoji} size={14} />
                        <span>{reaction.users.length}</span>
                    </button>
                );
            })}
        </div>
    );
};

export default ReactionBar;

import React, { useEffect, useRef, useState } from 'react';
import Kolobok from './Kolobok';

export interface SheetAction {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    destructive?: boolean;
}

interface MessageActionSheetProps {
    theme: 'dark' | 'light' | 'xp' | 'winamp';
    onClose: () => void;
    actions: SheetAction[];
    quickReactions?: string[];
    onReact?: (emoji: string) => void;
    position?: { x: number; y: number };
}

const POPUP_W = 272;

const MessageActionSheet: React.FC<MessageActionSheetProps> = ({
    theme, onClose, actions, quickReactions, onReact, position,
}) => {
    const isLight = theme === 'light';
    const isWinamp = theme === 'winamp';
    const isXP = theme === 'xp';

    const popupRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ top: -999, left: -999 });

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    // Calculate popup position
    useEffect(() => {
        if (!position) return;
        const popH = (quickReactions?.length ? 60 : 0) + actions.length * 46 + 16;
        const gap = 8;

        let top = position.y - popH - gap;
        let left = position.x - POPUP_W / 2;

        // flip below if not enough space above
        if (top < gap) top = position.y + gap;
        // clamp horizontal
        left = Math.max(gap, Math.min(left, window.innerWidth - POPUP_W - gap));
        // clamp vertical bottom
        top = Math.min(top, window.innerHeight - popH - gap);

        setPos({ top, left });
    }, [position, actions.length, quickReactions]);

    const bgClass = isWinamp
        ? 'bg-[#191919] border-[#505050]'
        : isXP
        ? 'bg-[#ECE9D8] border-[#ACA899]'
        : isLight
        ? 'bg-white border-gray-200 shadow-xl'
        : 'bg-[#1a1a2e] border-white/10';

    const dividerClass = isLight ? 'border-gray-100' : isWinamp ? 'border-[#505050]' : 'border-white/8';

    const rowBase = 'w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-mono transition-colors';
    const rowNormal = isLight
        ? 'text-gray-800 hover:bg-gray-50 active:bg-gray-100'
        : isWinamp
        ? 'text-[#00ff00] hover:bg-[#303030] active:bg-[#404040]'
        : isXP
        ? 'text-gray-900 hover:bg-[#D4D0C8] active:bg-[#C0BDB5]'
        : 'text-white hover:bg-white/8 active:bg-white/15';
    const rowDestruct = 'text-red-400 hover:bg-red-500/10 active:bg-red-500/20';

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[190]"
                onClick={onClose}
            />

            {/* Floating bubble */}
            <div
                ref={popupRef}
                className={`fixed z-[200] border rounded-2xl shadow-2xl overflow-hidden ${bgClass}`}
                style={{ top: pos.top, left: pos.left, width: POPUP_W }}
                onClick={e => e.stopPropagation()}
            >
                {/* Reactions — horizontal scrollable slider */}
                {quickReactions && quickReactions.length > 0 && onReact && (
                    <div className={`border-b ${dividerClass}`}>
                        <div className="flex overflow-x-auto gap-0.5 px-2 py-2 no-scrollbar">
                            {quickReactions.map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={() => { onReact(emoji); onClose(); }}
                                    className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 hover:scale-125 active:scale-90 transition-all"
                                >
                                    <Kolobok emoji={emoji} size={28} />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Action buttons */}
                <div>
                    {actions.map((action, i) => (
                        <button
                            key={i}
                            className={`${rowBase} ${action.destructive ? rowDestruct : rowNormal}`}
                            onClick={() => { action.onClick(); onClose(); }}
                        >
                            <span className="opacity-60 flex-shrink-0">{action.icon}</span>
                            <span>{action.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
};

export default MessageActionSheet;

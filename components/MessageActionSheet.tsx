import React, { useEffect, useRef, useState } from 'react';
import Kolobok from './Kolobok';
import { KOLOBOK_LIST } from '../utils/koloboks';

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

const POPUP_W = 288;

const MessageActionSheet: React.FC<MessageActionSheetProps> = ({
    theme, onClose, actions, quickReactions, onReact, position,
}) => {
    const isLight = theme === 'light';
    const isWinamp = theme === 'winamp';
    const isXP = theme === 'xp';

    const [showAll, setShowAll] = useState(false);
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

    useEffect(() => {
        if (!position) return;
        const reactH = showAll ? 160 : 60;
        const popH = reactH + actions.length * 46 + 12;
        const gap = 8;
        let top = position.y - popH - gap;
        let left = position.x - POPUP_W / 2;
        if (top < gap) top = position.y + gap;
        left = Math.max(gap, Math.min(left, window.innerWidth - POPUP_W - gap));
        top = Math.min(top, window.innerHeight - popH - gap);
        setPos({ top, left });
    }, [position, actions.length, showAll]);

    const bgClass = isWinamp
        ? 'bg-[#191919] border-[#505050]'
        : isXP
        ? 'bg-[#ECE9D8] border-[#ACA899]'
        : isLight
        ? 'bg-white border-gray-200 shadow-xl'
        : 'bg-[#1a1a2e] border-white/10';

    const divider = isLight ? 'border-gray-100' : isWinamp ? 'border-[#505050]' : 'border-white/8';

    const rowBase = 'w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-mono transition-colors';
    const rowNormal = isLight
        ? 'text-gray-800 hover:bg-gray-50 active:bg-gray-100'
        : isWinamp
        ? 'text-[#00ff00] hover:bg-[#303030]'
        : isXP
        ? 'text-gray-900 hover:bg-[#D4D0C8]'
        : 'text-white hover:bg-white/8 active:bg-white/15';
    const rowDestruct = 'text-red-400 hover:bg-red-500/10 active:bg-red-500/20';

    const btnBase = 'flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl hover:scale-125 active:scale-90 transition-all';
    const btnHover = isLight ? 'hover:bg-gray-100' : 'hover:bg-white/10';

    return (
        <>
            <div className="fixed inset-0 z-[190]" onClick={onClose} />

            <div
                className={`fixed z-[200] border rounded-2xl shadow-2xl overflow-hidden ${bgClass}`}
                style={{ top: pos.top, left: pos.left, width: POPUP_W }}
                onClick={e => e.stopPropagation()}
            >
                {/* Reactions area */}
                {quickReactions && quickReactions.length > 0 && onReact && (
                    <div className={`border-b ${divider}`}>
                        {showAll ? (
                            /* Full grid */
                            <div className="p-1.5">
                                <div className="grid grid-cols-8 gap-0.5 max-h-36 overflow-y-auto no-scrollbar">
                                    {KOLOBOK_LIST.map(emoji => (
                                        <button
                                            key={emoji}
                                            onClick={() => { onReact(emoji); onClose(); }}
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
                            /* Scrollable quick row + expand button */
                            <div className="flex items-center px-1.5 py-1.5 gap-0.5">
                                <div className="flex overflow-x-auto gap-0.5 no-scrollbar flex-1">
                                    {quickReactions.map(emoji => (
                                        <button
                                            key={emoji}
                                            onClick={() => { onReact(emoji); onClose(); }}
                                            className={`${btnBase} ${btnHover}`}
                                        >
                                            <Kolobok emoji={emoji} size={26} />
                                        </button>
                                    ))}
                                </div>
                                {/* Expand button */}
                                <button
                                    onClick={() => setShowAll(true)}
                                    className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl text-base font-bold opacity-50 hover:opacity-100 transition-opacity ml-0.5 ${btnHover}`}
                                    title="Все реакции"
                                >
                                    ＋
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
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

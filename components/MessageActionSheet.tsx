import React, { useEffect } from 'react';

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
}

const MessageActionSheet: React.FC<MessageActionSheetProps> = ({
    theme, onClose, actions, quickReactions, onReact,
}) => {
    const isLight = theme === 'light';
    const isWinamp = theme === 'winamp';
    const isXP = theme === 'xp';

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    // Lock body scroll while open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    const sheetBg = isWinamp
        ? 'bg-[#191919] border-[#505050]'
        : isXP  ? 'bg-[#ECE9D8] border-[#ACA899]'
        : isLight ? 'bg-white border-gray-200'
        : 'bg-[#1c1c2e] border-white/10';

    const handleBg = isLight ? 'bg-gray-300' : 'bg-white/20';

    const rowBase = 'w-full flex items-center gap-4 px-5 py-3.5 rounded-xl transition-colors text-left text-sm font-mono';
    const rowNormal = isLight
        ? 'text-gray-800 hover:bg-gray-100 active:bg-gray-200'
        : isWinamp ? 'text-[#00ff00] hover:bg-[#303030] active:bg-[#404040]'
        : isXP     ? 'text-gray-900 hover:bg-[#D4D0C8] active:bg-[#C0BDB5]'
        : 'text-white hover:bg-white/8 active:bg-white/15';
    const rowDestruct = 'text-red-400 hover:bg-red-500/10 active:bg-red-500/20';

    const divider = isLight ? 'border-gray-100' : isWinamp ? 'border-[#505050]' : 'border-white/6';

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/55 z-[60] backdrop-blur-[2px]"
                onClick={onClose}
            />

            {/* Sheet — bottom on mobile, centered card on sm+ */}
            <div
                className={`
                    fixed z-[61] shadow-2xl border
                    bottom-0 left-0 right-0 rounded-t-2xl
                    sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2
                    sm:-translate-x-1/2 sm:-translate-y-1/2
                    sm:w-72 sm:rounded-2xl
                    animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-150
                    ${sheetBg}
                `}
                onClick={e => e.stopPropagation()}
            >
                {/* Drag handle (mobile only) */}
                <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
                    <div className={`w-10 h-1 rounded-full ${handleBg}`} />
                </div>

                {/* Quick emoji reactions */}
                {quickReactions && quickReactions.length > 0 && onReact && (
                    <div className={`flex justify-center gap-0.5 px-3 py-3 border-b ${divider}`}>
                        {quickReactions.map(emoji => (
                            <button
                                key={emoji}
                                className="text-[22px] sm:text-2xl hover:scale-125 active:scale-90 transition-transform px-1.5 py-0.5 rounded-xl hover:bg-white/10"
                                onClick={() => { onReact(emoji); onClose(); }}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}

                {/* Actions */}
                <div className="p-2">
                    {actions.map((action, i) => (
                        <button
                            key={i}
                            className={`${rowBase} ${action.destructive ? rowDestruct : rowNormal}`}
                            onClick={() => { action.onClick(); onClose(); }}
                        >
                            <span className="opacity-75 flex-shrink-0">{action.icon}</span>
                            <span>{action.label}</span>
                        </button>
                    ))}
                </div>

                {/* iOS safe-area bottom gap */}
                <div className="h-5 sm:h-1" />
            </div>
        </>
    );
};

export default MessageActionSheet;

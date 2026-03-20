
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Bell, MessageSquare, Heart, RefreshCw, UserPlus, BookOpen, TrendingUp } from 'lucide-react';
import { Notification } from '../types';
import { subscribeToToasts } from '../services/storageService';
import { TIER_CONFIG } from '../constants';
import MatrixIcon from './MatrixIcon';
import XI from './XI';

const TOAST_TTL = 6000; // ms до авто-скрытия
const FLIP_DURATION = 800; // ms

// Типы, при нажатии на которые запускается Hearthstone-флип
const FLIP_TYPES = new Set(['WISHLIST_ACQUIRED', 'TRADE_ACCEPTED', 'TRADE_COMPLETED', 'GRADE_UP']);

interface GroupedToast {
    key: string;
    actor: string;
    types: Set<string>;
    count: number;
    previews: string[];
    // для GRADE_UP
    gradeUpTier?: string;
    gradeUpTitle?: string;
    gradeUpExhibitId?: string;
}

interface ToastContainerProps {
    cardFlipEnabled?: boolean;
}

/** Человеко-читаемое описание типов событий */
function describeTypes(types: Set<string>, count: number): string {
    const has = (t: string) => types.has(t);
    if (has('FOLLOW')) return 'подписался на вас';
    if (has('LIKE') && has('COMMENT')) return `оценил и прокомментировал (${count})`;
    if (has('LIKE'))    return count > 1 ? `оценил ${count} записи` : 'оценил вашу запись';
    if (has('COMMENT')) return count > 1 ? `оставил ${count} комментария` : 'прокомментировал';
    if (has('TRADE_OFFER')) return 'прислал предложение обмена';
    if (has('TRADE_ACCEPTED')) return 'принял ваш обмен';
    if (has('TRADE_COMPLETED')) return 'завершил обмен';
    if (has('WISHLIST_ACQUIRED')) return 'вишлист-айтем получен!';
    if (has('GUESTBOOK')) return 'оставил запись в гостевой';
    return 'взаимодействует с вами';
}

function getIcon(types: Set<string>) {
    if (types.has('GRADE_UP'))      return <MatrixIcon icon={TrendingUp}    size={16} color="#facc15" theme="dark" />;
    if (types.has('FOLLOW'))        return <MatrixIcon icon={UserPlus}      size={16} color="#4ade80" theme="dark" />;
    if (types.has('COMMENT'))       return <MatrixIcon icon={MessageSquare} size={16} color="#60a5fa" theme="dark" />;
    if (types.has('LIKE'))          return <MatrixIcon icon={Heart}         size={16} color="#f87171" theme="dark" />;
    if (types.has('TRADE_OFFER') || types.has('TRADE_ACCEPTED') || types.has('TRADE_COMPLETED'))
                                    return <MatrixIcon icon={RefreshCw}     size={16} color="#fbbf24" theme="dark" />;
    if (types.has('GUESTBOOK'))     return <MatrixIcon icon={BookOpen}      size={16} color="#fbbf24" theme="dark" />;
    return <MatrixIcon icon={Bell} size={16} theme="dark" />;
}

function hasFlipType(types: Set<string>): boolean {
    for (const t of types) if (FLIP_TYPES.has(t)) return true;
    return false;
}

/** Возвращает ключ для группировки. GRADE_UP группируется по exhibitId, остальные — по actor */
function toastKey(n: Notification): string {
    if (n.type === 'GRADE_UP') return `GRADE_UP:${n.targetId ?? n.actor}`;
    return n.actor;
}

/** Компонент одного тоста */
const ToastItem: React.FC<{
    toast: GroupedToast;
    isFlipping: boolean;
    cardFlipEnabled: boolean;
    onClose: (key: string) => void;
    onClick: (toast: GroupedToast) => void;
}> = ({ toast, isFlipping, cardFlipEnabled, onClose, onClick }) => {
    const isGradeUp = toast.types.has('GRADE_UP');
    const tierCfg = isGradeUp && toast.gradeUpTier
        ? (TIER_CONFIG as any)[toast.gradeUpTier] ?? null
        : null;

    const borderClass = tierCfg
        ? `border-2 ${tierCfg.borderDark}`
        : 'border border-green-500/50';

    const headerColor = tierCfg ? tierCfg.color : 'text-green-400';

    return (
        <div
            onClick={() => onClick(toast)}
            style={{ transformStyle: 'preserve-3d' }}
            className={[
                'pointer-events-auto bg-black/90 text-white p-3 rounded-xl shadow-2xl',
                'flex items-start gap-3',
                'animate-in slide-in-from-right fade-in duration-300',
                'cursor-pointer select-none',
                borderClass,
                isFlipping && cardFlipEnabled ? 'animate-card-flip' : '',
            ].join(' ')}
        >
            <div className="mt-1 flex-shrink-0">{getIcon(toast.types)}</div>

            <div className="flex-1 min-w-0">
                <div className="text-xs font-bold font-pixel mb-1 flex justify-between items-center">
                    <span className={`opacity-70 tracking-widest text-[9px] uppercase ${headerColor}`}>
                        {isGradeUp ? '⬆ ГРЕЙД АПГРЕЙД' : 'УВЕДОМЛЕНИЕ'}
                    </span>
                    <button
                        onClick={e => { e.stopPropagation(); onClose(toast.key); }}
                        className="opacity-40 hover:opacity-100 transition-opacity ml-2"
                    >
                        <XI icon={X} size={12} />
                    </button>
                </div>

                {isGradeUp ? (
                    /* Специальный рендер для GRADE_UP */
                    <div className="text-xs font-mono leading-snug">
                        <div className="opacity-80 mb-1 truncate">
                            «{toast.gradeUpTitle ?? toast.previews[0] ?? 'Артефакт'}»
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="opacity-60 text-[10px]">теперь</span>
                            {tierCfg ? (
                                <span className={`text-[10px] font-pixel font-bold px-1.5 py-0.5 rounded ${tierCfg.badge}`}>
                                    {tierCfg.name}
                                </span>
                            ) : (
                                <span className="text-yellow-400 font-bold text-[10px]">{toast.gradeUpTier}</span>
                            )}
                        </div>
                        {cardFlipEnabled && (
                            <div className="text-[9px] opacity-40 mt-1">нажми чтобы увидеть</div>
                        )}
                    </div>
                ) : (
                    /* Обычный рендер */
                    <>
                        <div className="text-xs font-mono leading-snug">
                            <span className="text-green-400 font-bold">@{toast.actor}</span>
                            <span className="opacity-80"> {describeTypes(toast.types, toast.count)}</span>
                        </div>
                        {toast.previews.length > 0 && (
                            <div className="mt-1.5 flex flex-col gap-0.5">
                                {toast.previews.map((p, i) => (
                                    <div key={i} className="text-[10px] opacity-55 truncate border-l-2 border-white/20 pl-2">
                                        "{p}"
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

const ToastContainer: React.FC<ToastContainerProps> = ({ cardFlipEnabled = true }) => {
    const [toasts, setToasts] = useState<Map<string, GroupedToast>>(new Map());
    const [flipping, setFlipping] = useState<Set<string>>(new Set());
    const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    const removeToast = useCallback((key: string) => {
        setToasts(prev => {
            const next = new Map(prev);
            next.delete(key);
            return next;
        });
        setFlipping(prev => {
            if (!prev.has(key)) return prev;
            const next = new Set(prev);
            next.delete(key);
            return next;
        });
        const t = timers.current.get(key);
        if (t) { clearTimeout(t); timers.current.delete(key); }
    }, []);

    const scheduleRemoval = useCallback((key: string, ttl = TOAST_TTL) => {
        const old = timers.current.get(key);
        if (old) clearTimeout(old);
        const id = setTimeout(() => removeToast(key), ttl);
        timers.current.set(key, id);
    }, [removeToast]);

    const handleToastClick = useCallback((toast: GroupedToast) => {
        if (cardFlipEnabled && hasFlipType(toast.types)) {
            setFlipping(prev => new Set(prev).add(toast.key));
            const old = timers.current.get(toast.key);
            if (old) clearTimeout(old);
            const id = setTimeout(() => removeToast(toast.key), FLIP_DURATION);
            timers.current.set(toast.key, id);
        } else {
            removeToast(toast.key);
        }
    }, [cardFlipEnabled, removeToast]);

    useEffect(() => {
        const unsubscribe = subscribeToToasts((newToast: Notification) => {
            const key = toastKey(newToast);

            setToasts(prev => {
                const next = new Map(prev);
                const existing = next.get(key);

                if (existing) {
                    const updatedTypes = new Set(existing.types);
                    updatedTypes.add(newToast.type);
                    const updatedPreviews = [...existing.previews];
                    if (newToast.targetPreview && !updatedPreviews.includes(newToast.targetPreview)) {
                        updatedPreviews.push(newToast.targetPreview);
                    }
                    next.set(key, {
                        ...existing,
                        types: updatedTypes,
                        count: existing.count + 1,
                        previews: updatedPreviews.slice(0, 2),
                        // обновляем тир если GRADE_UP
                        ...(newToast.type === 'GRADE_UP' && newToast.contextId
                            ? { gradeUpTier: newToast.contextId }
                            : {}),
                    });
                } else {
                    next.set(key, {
                        key,
                        actor: newToast.actor,
                        types: new Set([newToast.type]),
                        count: 1,
                        previews: newToast.targetPreview ? [newToast.targetPreview] : [],
                        ...(newToast.type === 'GRADE_UP' ? {
                            gradeUpTier: newToast.contextId,
                            gradeUpTitle: newToast.targetPreview,
                            gradeUpExhibitId: newToast.targetId,
                        } : {}),
                    });
                }
                return next;
            });

            scheduleRemoval(key);
        });

        return () => {
            unsubscribe();
            timers.current.forEach(t => clearTimeout(t));
        };
    }, [scheduleRemoval]);

    const toastList = Array.from(toasts.values());

    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-full max-w-xs pointer-events-none">
            {toastList.map(toast => (
                <ToastItem
                    key={toast.key}
                    toast={toast}
                    isFlipping={flipping.has(toast.key)}
                    cardFlipEnabled={cardFlipEnabled}
                    onClose={removeToast}
                    onClick={handleToastClick}
                />
            ))}
        </div>
    );
};

export default ToastContainer;

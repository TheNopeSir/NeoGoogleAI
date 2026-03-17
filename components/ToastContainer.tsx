
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Bell, MessageSquare, Heart, RefreshCw, UserPlus, BookOpen } from 'lucide-react';
import { Notification } from '../types';
import { subscribeToToasts } from '../services/storageService';
import MatrixIcon from './MatrixIcon';
import XI from './XI';

const TOAST_TTL = 5000; // ms до авто-скрытия

interface GroupedToast {
    key: string;       // = actor (уникальный ключ группы)
    actor: string;
    types: Set<string>;
    count: number;
    previews: string[]; // до 2 названий артефактов
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
    if (has('GUESTBOOK')) return 'оставил запись в гостевой';
    return 'взаимодействует с вами';
}

function getIcon(types: Set<string>) {
    if (types.has('FOLLOW'))        return <MatrixIcon icon={UserPlus}      size={16} color="#4ade80" theme="dark" />;
    if (types.has('COMMENT'))       return <MatrixIcon icon={MessageSquare} size={16} color="#60a5fa" theme="dark" />;
    if (types.has('LIKE'))          return <MatrixIcon icon={Heart}         size={16} color="#f87171" theme="dark" />;
    if (types.has('TRADE_OFFER') || types.has('TRADE_ACCEPTED'))
                                    return <MatrixIcon icon={RefreshCw}     size={16} color="#fbbf24" theme="dark" />;
    if (types.has('GUESTBOOK'))     return <MatrixIcon icon={BookOpen}      size={16} color="#fbbf24" theme="dark" />;
    return <MatrixIcon icon={Bell} size={16} theme="dark" />;
}

const ToastContainer: React.FC = () => {
    // Актуальные сгруппированные тосты (Map для O(1) поиска по actor)
    const [toasts, setToasts] = useState<Map<string, GroupedToast>>(new Map());

    // Таймеры удаления: actor → timeoutId
    const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    const removeToast = useCallback((actor: string) => {
        setToasts(prev => {
            const next = new Map(prev);
            next.delete(actor);
            return next;
        });
        const t = timers.current.get(actor);
        if (t) { clearTimeout(t); timers.current.delete(actor); }
    }, []);

    const scheduleRemoval = useCallback((actor: string) => {
        // Сбрасываем существующий таймер
        const old = timers.current.get(actor);
        if (old) clearTimeout(old);

        const id = setTimeout(() => removeToast(actor), TOAST_TTL);
        timers.current.set(actor, id);
    }, [removeToast]);

    useEffect(() => {
        const unsubscribe = subscribeToToasts((newToast: Notification) => {
            const actor = newToast.actor;

            setToasts(prev => {
                const next = new Map(prev);
                const existing = next.get(actor);

                if (existing) {
                    // Обновляем существующую группу
                    const updatedTypes = new Set(existing.types);
                    updatedTypes.add(newToast.type);

                    const updatedPreviews = existing.previews;
                    if (newToast.targetPreview && !updatedPreviews.includes(newToast.targetPreview)) {
                        updatedPreviews.push(newToast.targetPreview);
                    }

                    next.set(actor, {
                        ...existing,
                        types: updatedTypes,
                        count: existing.count + 1,
                        previews: updatedPreviews.slice(0, 2),
                    });
                } else {
                    // Создаём новую группу
                    next.set(actor, {
                        key: actor,
                        actor,
                        types: new Set([newToast.type]),
                        count: 1,
                        previews: newToast.targetPreview ? [newToast.targetPreview] : [],
                    });
                }
                return next;
            });

            // Каждое новое событие сбрасывает таймер для этого актора
            scheduleRemoval(actor);
        });

        return () => {
            unsubscribe();
            // Очищаем все таймеры при размонтировании
            timers.current.forEach(t => clearTimeout(t));
        };
    }, [scheduleRemoval]);

    const toastList = Array.from(toasts.values());

    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-full max-w-xs pointer-events-none">
            {toastList.map(toast => (
                <div
                    key={toast.key}
                    className="pointer-events-auto bg-black/90 border border-green-500/50 text-white p-3 rounded-xl shadow-2xl flex items-start gap-3 animate-in slide-in-from-right fade-in duration-300"
                >
                    <div className="mt-1 flex-shrink-0">{getIcon(toast.types)}</div>

                    <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold font-pixel mb-1 flex justify-between items-center">
                            <span className="opacity-50 tracking-widest">УВЕДОМЛЕНИЕ</span>
                            <button
                                onClick={() => removeToast(toast.actor)}
                                className="opacity-40 hover:opacity-100 transition-opacity ml-2"
                            >
                                <XI icon={X} size={12} />
                            </button>
                        </div>

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
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ToastContainer;

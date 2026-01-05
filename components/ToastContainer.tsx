
import React, { useState, useEffect } from 'react';
import { X, Bell, MessageSquare, Heart, RefreshCw, UserPlus } from 'lucide-react';
import { Notification } from '../types';
import { subscribeToToasts } from '../services/storageService';

const ToastContainer: React.FC = () => {
    const [toasts, setToasts] = useState<Notification[]>([]);

    useEffect(() => {
        const unsubscribe = subscribeToToasts((newToast) => {
            setToasts(prev => [newToast, ...prev]);
            // Auto remove after 5s
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== newToast.id));
            }, 5000);
        });
        return () => unsubscribe();
    }, []);

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'LIKE': return <Heart size={16} className="text-red-500" />;
            case 'COMMENT': return <MessageSquare size={16} className="text-blue-500" />;
            case 'FOLLOW': return <UserPlus size={16} className="text-green-500" />;
            case 'TRADE_OFFER': return <RefreshCw size={16} className="text-yellow-500" />;
            default: return <Bell size={16} className="text-white" />;
        }
    };

    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-full max-w-xs pointer-events-none">
            {toasts.map(toast => (
                <div 
                    key={toast.id} 
                    className="pointer-events-auto bg-black/90 border border-green-500/50 text-white p-3 rounded-xl shadow-2xl flex items-start gap-3 animate-in slide-in-from-right fade-in duration-300"
                >
                    <div className="mt-1">{getIcon(toast.type)}</div>
                    <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold font-pixel mb-1 flex justify-between">
                            <span>НОВОЕ СОБЫТИЕ</span>
                            <button onClick={() => removeToast(toast.id)} className="opacity-50 hover:opacity-100"><X size={12}/></button>
                        </div>
                        <div className="text-xs font-mono">
                            <span className="text-green-400 font-bold">@{toast.actor}</span>
                            <span className="opacity-80"> {toast.type === 'LIKE' ? 'оценил ваш пост' : toast.type === 'COMMENT' ? 'прокомментировал' : 'взаимодействует'}</span>
                        </div>
                        {toast.targetPreview && (
                            <div className="text-[10px] opacity-60 mt-1 truncate border-l-2 border-white/20 pl-2">
                                "{toast.targetPreview}"
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ToastContainer;

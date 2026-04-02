import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Send, Globe, Shield } from 'lucide-react';
import { UserProfile } from '../types';
import { getUserAvatar, getGlobalChatMessages, sendGlobalChatMessage } from '../services/storageService';
import { validateMessageText } from '../utils/textUtils';
import XI from './XI';

interface GlobalChatProps {
    theme: 'dark' | 'light' | 'xp' | 'winamp';
    currentUser: UserProfile;
    onBack: () => void;
}

const GlobalChat: React.FC<GlobalChatProps> = ({ theme, currentUser, onBack }) => {
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const lastSendRef = useRef<number>(0);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const isWinamp = theme === 'winamp';
    const isXP = theme === 'xp';
    const isLight = theme === 'light';

    const loadMessages = useCallback(async () => {
        const data = await getGlobalChatMessages();
        setMessages(data);
    }, []);

    useEffect(() => {
        loadMessages();
        pollingRef.current = setInterval(loadMessages, 5000);
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [loadMessages]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        const text = input.trim();
        if (!text || isSending) return;
        if (Date.now() - lastSendRef.current < 500) return;

        const err = validateMessageText(text);
        if (err) { setSendError(err); return; }

        lastSendRef.current = Date.now();
        setIsSending(true);
        setSendError(null);
        setInput('');
        try {
            const msg = {
                id: crypto.randomUUID(),
                sender: currentUser.username,
                text,
                timestamp: new Date().toISOString(),
            };
            await sendGlobalChatMessage(msg);
            // Optimistic update
            setMessages(prev => [...prev, msg]);
        } catch {
            setSendError('Ошибка отправки');
            setInput(text);
        } finally {
            setIsSending(false);
        }
    };

    const headerBg = isWinamp
        ? 'bg-[#191919] border-[#505050]'
        : isXP
        ? 'bg-[#ECE9D8] border-[#ACA899]'
        : isLight
        ? 'bg-white border-gray-200'
        : 'border-white/10 bg-white/5';

    const inputBg = isWinamp
        ? 'bg-black/40 border border-[#505050] text-[#00ff00] placeholder-gray-600'
        : isXP
        ? 'bg-white border border-[#ACA899] text-black'
        : isLight
        ? 'bg-gray-50 border border-gray-200 text-gray-900'
        : 'bg-black/40 border border-white/10';

    return (
        <div className={`max-w-4xl mx-auto flex flex-col h-[calc(100vh-140px)] animate-in fade-in ${isWinamp ? 'font-mono text-gray-300' : ''}`}>
            {/* Header */}
            <div className={`flex items-center justify-between p-4 border-b rounded-t-3xl ${headerBg}`}>
                <div className="flex items-center gap-4 min-w-0">
                    <button onClick={onBack} className={`p-2 rounded-full transition-colors flex-shrink-0 ${isWinamp ? 'hover:bg-[#505050]' : 'hover:bg-white/10'}`}>
                        <XI icon={ArrowLeft} size={20} />
                    </button>
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border ${isWinamp ? 'border-[#00ff00] bg-[#001100]' : isLight ? 'border-blue-300 bg-blue-50' : 'border-green-500/30 bg-green-500/10'}`}>
                            <XI icon={Globe} size={20} className={isWinamp ? 'text-[#00ff00]' : isLight ? 'text-blue-600' : 'text-green-400'} />
                        </div>
                        <div className="min-w-0">
                            <div className={`font-pixel text-xs font-bold truncate ${isWinamp ? 'text-[#00ff00]' : ''}`}>ОБЩИЙ ЧАТ</div>
                            <div className="flex items-center gap-1 text-[8px] font-mono text-green-500 animate-pulse truncate">
                                <XI icon={Shield} size={8} /> ICQ_GLOBAL_CHANNEL
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide no-scrollbar">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-4">
                        <XI icon={Globe} size={48} />
                        <p className="font-pixel text-[10px] tracking-widest uppercase">БУДЬТЕ ПЕРВЫМ В ЭФИРЕ</p>
                    </div>
                ) : (
                    messages.map(msg => {
                        const isMe = msg.sender === currentUser.username;
                        const bubbleBg = isMe
                            ? 'bg-green-500 text-black rounded-tr-none'
                            : isWinamp
                            ? 'bg-[#191919] border border-[#505050] text-[#00ff00] rounded-tl-none'
                            : isXP
                            ? 'bg-[#ECE9D8] border border-[#ACA899] text-black rounded-tl-none'
                            : isLight
                            ? 'bg-gray-100 text-gray-900 rounded-tl-none'
                            : 'bg-white/10 text-white rounded-tl-none';

                        return (
                            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2`}>
                                {!isMe && (
                                    <div className="flex items-center gap-1.5 mb-1 ml-1">
                                        <img
                                            src={getUserAvatar(msg.sender)}
                                            className="w-4 h-4 rounded-full"
                                            alt={msg.sender}
                                        />
                                        <span className="text-[9px] font-pixel opacity-60">@{msg.sender}</span>
                                    </div>
                                )}
                                <div className={`max-w-[80%] p-3 rounded-2xl font-mono text-sm leading-relaxed break-words whitespace-pre-wrap ${bubbleBg}`}>
                                    {msg.text}
                                    <div className={`text-[9px] mt-1 opacity-50 ${isMe ? 'text-black/60' : isXP ? 'text-gray-600' : 'text-white/40'}`}>
                                        {new Date(msg.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className={`p-4 border-t rounded-b-3xl relative ${isWinamp ? 'bg-[#191919] border-[#505050]' : isXP ? 'bg-[#ECE9D8] border-[#ACA899]' : isLight ? 'bg-white border-gray-200' : 'bg-white/5 border-white/10'}`}>
                {sendError && <p className="text-red-400 text-[10px] font-mono px-1 pb-1">{sendError}</p>}
                <div className="flex gap-2">
                    <input
                        value={input}
                        onChange={e => { setInput(e.target.value); setSendError(null); }}
                        placeholder="СООБЩЕНИЕ В ЭФИР..."
                        className={`flex-1 rounded-xl px-4 py-3 font-mono text-sm focus:outline-none focus:border-green-500 transition-all min-w-0 ${inputBg}`}
                        maxLength={500}
                    />
                    <button
                        type="submit"
                        disabled={isSending || !input.trim()}
                        className={`p-4 bg-green-500 text-black rounded-xl hover:scale-105 active:scale-95 transition-all flex-shrink-0 ${(isSending || !input.trim()) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <XI icon={Send} size={20} />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default GlobalChat;

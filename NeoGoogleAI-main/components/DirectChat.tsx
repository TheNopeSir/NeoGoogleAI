
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, Send, Terminal, Shield, MessageSquare } from 'lucide-react';
import { UserProfile, Message } from '../types';
import { getUserAvatar } from '../services/storageService';

interface DirectChatProps {
    theme: 'dark' | 'light' | 'xp' | 'winamp';
    currentUser: UserProfile;
    partnerUsername: string;
    messages: Message[];
    onBack: () => void;
    onSendMessage: (text: string) => void;
}

const DirectChat: React.FC<DirectChatProps> = ({ 
    theme, currentUser, partnerUsername, messages, onBack, onSendMessage 
}) => {
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    // CRITICAL: Filter and sort uniquely to prevent double rendering
    const uniqueMessages = useMemo(() => {
        const map = new Map<string, Message>();
        messages.forEach(m => map.set(m.id, m));
        return Array.from(map.values()).sort((a,b) => a.timestamp.localeCompare(b.timestamp));
    }, [messages]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [uniqueMessages]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        onSendMessage(input);
        setInput('');
    };
    
    const isWinamp = theme === 'winamp';

    return (
        <div className={`max-w-2xl mx-auto flex flex-col h-[calc(100vh-140px)] animate-in fade-in ${isWinamp ? 'font-mono text-gray-300' : ''}`}>
            <div className={`flex items-center justify-between p-4 border-b rounded-t-3xl ${isWinamp ? 'bg-[#191919] border-[#505050]' : 'border-white/10 bg-white/5'}`}>
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className={`p-2 rounded-full transition-colors ${isWinamp ? 'hover:bg-[#505050]' : 'hover:bg-white/10'}`}><ArrowLeft size={20}/></button>
                    <div className="flex items-center gap-3">
                        <img src={getUserAvatar(partnerUsername)} className="w-10 h-10 rounded-full border border-green-500/30" />
                        <div>
                            <div className={`font-pixel text-xs font-bold ${isWinamp ? 'text-[#00ff00]' : ''}`}>@{partnerUsername}</div>
                            <div className="flex items-center gap-1 text-[8px] font-mono text-green-500 animate-pulse">
                                <Shield size={8} /> SECURE_LINK_ESTABLISHED
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide no-scrollbar">
                {uniqueMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-4">
                        <MessageSquare size={48} />
                        <p className="font-pixel text-[10px] tracking-widest uppercase">НАЧНИТЕ ДИАЛОГ В СЕТИ</p>
                    </div>
                ) : (
                    uniqueMessages.map((msg) => {
                        const isMe = msg.sender === currentUser.username;
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                                <div className={`max-w-[80%] p-4 rounded-2xl font-mono text-sm leading-relaxed break-words ${isMe ? 'bg-green-500 text-black rounded-tr-none' : isWinamp ? 'bg-[#191919] border border-[#505050] text-[#00ff00] rounded-tl-none' : 'bg-white/10 text-white rounded-tl-none'}`}>
                                    {msg.text}
                                    <div className={`text-[9px] mt-2 opacity-50 ${isMe ? 'text-black/60' : 'text-white/40'}`}>
                                        {msg.timestamp.split(',')[1] || msg.timestamp}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <form onSubmit={handleSend} className={`p-4 border-t rounded-b-3xl ${isWinamp ? 'bg-[#191919] border-[#505050]' : 'bg-white/5 border-white/10'}`}>
                <div className="flex gap-2">
                    <input 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="ВВЕСТИ СООБЩЕНИЕ..." 
                        className={`flex-1 rounded-xl px-4 py-3 font-mono text-sm focus:outline-none focus:border-green-500 transition-all ${isWinamp ? 'bg-black/40 border border-[#505050] text-[#00ff00] placeholder-gray-600' : 'bg-black/40 border border-white/10'}`}
                    />
                    <button type="submit" className="p-4 bg-green-500 text-black rounded-xl hover:scale-105 active:scale-95 transition-all">
                        <Send size={20} />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default DirectChat;
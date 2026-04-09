import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, Send, Shield, MessageSquare, Reply, Copy } from 'lucide-react';
import { UserProfile, Message, MessageReactionEmoji } from '../types';
import { getUserAvatar } from '../services/storageService';
import { QUICK_REACTIONS } from '../utils/koloboks';
import ReactionBar from './ReactionBar';
import MessageActionSheet, { SheetAction } from './MessageActionSheet';
import { renderTextWithMentions, validateMessageText } from '../utils/textUtils';
import XI from './XI';

interface DirectChatProps {
    theme: 'dark' | 'light' | 'xp' | 'winamp';
    currentUser: UserProfile;
    partnerUsername: string;
    messages: Message[];
    users: UserProfile[];
    onBack: () => void;
    onSendMessage: (text: string) => void;
    onReactToMessage: (messageId: string, emoji: MessageReactionEmoji) => void;
}

const DirectChat: React.FC<DirectChatProps> = ({
    theme, currentUser, partnerUsername, messages, users, onBack, onSendMessage, onReactToMessage
}) => {
    const [input, setInput] = useState('');
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
    const [activeMsg, setActiveMsg] = useState<Message | null>(null);
    const [activeMsgPos, setActiveMsgPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [isSending, setIsSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const lastSendRef = useRef<number>(0);

    const uniqueMessages = useMemo(() => {
        const map = new Map<string, Message>();
        messages.forEach(m => map.set(m.id, m));
        return Array.from(map.values()).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    }, [messages]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [uniqueMessages]);

    useEffect(() => {
        if (mentionQuery !== null) {
            const query = mentionQuery.toLowerCase();
            setFilteredUsers(
                users
                    .filter(u => u.username !== currentUser.username && u.username.toLowerCase().includes(query))
                    .slice(0, 5)
            );
        } else {
            setFilteredUsers([]);
        }
    }, [mentionQuery, users, currentUser.username]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const text = e.target.value;
        setInput(text);
        setSendError(null);
        const lastWord = text.split(' ').pop();
        if (lastWord && lastWord.startsWith('@')) setMentionQuery(lastWord.slice(1));
        else setMentionQuery(null);
    };

    const selectMention = (username: string) => {
        const words = input.split(' ');
        words.pop();
        setInput([...words, `@${username} `].join(' '));
        setMentionQuery(null);
    };

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isSending) return;
        if (Date.now() - lastSendRef.current < 500) return;

        const err = validateMessageText(input);
        if (err) { setSendError(err); return; }

        lastSendRef.current = Date.now();
        setIsSending(true);
        setSendError(null);
        onSendMessage(input);
        setInput('');
        setMentionQuery(null);
        setReplyingTo(null);
        setTimeout(() => setIsSending(false), 500);
    };

    const handleReply = (msg: Message) => {
        setReplyingTo(msg);
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const buildActions = (msg: Message): SheetAction[] => [
        {
            icon: <XI icon={Reply} size={18} />,
            label: 'Ответить',
            onClick: () => handleReply(msg),
        },
        {
            icon: <XI icon={Copy} size={18} />,
            label: 'Копировать текст',
            onClick: () => navigator.clipboard.writeText(msg.text).catch(() => {}),
        },
    ];

    const isWinamp = theme === 'winamp';
    const isXP = theme === 'xp';
    const isLight = theme === 'light';

    const headerBg = isWinamp
        ? 'bg-[#191919] border-[#505050]'
        : isXP ? 'bg-[#ECE9D8] border-[#ACA899]'
        : isLight ? 'bg-white border-gray-200'
        : 'border-white/10 bg-white/5';

    const inputBg = isWinamp
        ? 'bg-black/40 border border-[#505050] text-[#00ff00] placeholder-gray-600'
        : isXP ? 'bg-white border border-[#ACA899] text-black'
        : isLight ? 'bg-gray-50 border border-gray-200 text-gray-900'
        : 'bg-black/40 border border-white/10';

    const footerBg = isWinamp ? 'bg-[#191919] border-[#505050]'
        : isXP ? 'bg-[#ECE9D8] border-[#ACA899]'
        : isLight ? 'bg-white border-gray-200'
        : 'bg-white/5 border-white/10';

    return (
        <div className={`max-w-4xl mx-auto flex flex-col h-[calc(100svh-4rem)] md:h-[calc(100vh-140px)] animate-in fade-in ${isWinamp ? 'font-mono text-gray-300' : ''}`}>
            {/* Header */}
            <div className={`flex items-center justify-between p-3 sm:p-4 border-b rounded-t-3xl ${headerBg}`}>
                <div className="flex items-center gap-3 min-w-0">
                    <button onClick={onBack} className={`p-1.5 rounded-full transition-colors flex-shrink-0 ${isWinamp ? 'hover:bg-[#505050]' : 'hover:bg-white/10'}`}>
                        <XI icon={ArrowLeft} size={18} />
                    </button>
                    <div className="flex items-center gap-2.5 min-w-0">
                        <img src={getUserAvatar(partnerUsername)} className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-green-500/30 flex-shrink-0 object-cover" />
                        <div className="min-w-0">
                            <div className={`font-pixel text-[11px] font-bold truncate ${isWinamp ? 'text-[#00ff00]' : ''}`}>@{partnerUsername}</div>
                            <div className="flex items-center gap-1 text-[8px] font-mono text-green-500 animate-pulse truncate">
                                <XI icon={Shield} size={7} /> SECURE_LINK_ESTABLISHED
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-2 py-2 sm:px-4 sm:py-4 space-y-1 sm:space-y-2 scrollbar-hide no-scrollbar"
            >
                {uniqueMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-4">
                        <XI icon={MessageSquare} size={48} />
                        <p className="font-pixel text-[10px] tracking-widest uppercase">НАЧНИТЕ ДИАЛОГ В СЕТИ</p>
                    </div>
                ) : (
                    uniqueMessages.map(msg => {
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
                            <div
                                key={msg.id}
                                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2`}
                            >
                                {/* Bubble */}
                                <div
                                    className={`max-w-[82%] sm:max-w-[80%] px-2.5 py-2 sm:p-3 rounded-2xl font-mono text-xs sm:text-sm leading-snug sm:leading-relaxed break-words whitespace-pre-wrap cursor-pointer select-none active:opacity-75 transition-opacity ${bubbleBg}`}
                                    onClick={e => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setActiveMsgPos({ x: r.left + r.width / 2, y: r.top }); setActiveMsg(msg); }}
                                    onContextMenu={e => { e.preventDefault(); const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setActiveMsgPos({ x: r.left + r.width / 2, y: r.top }); setActiveMsg(msg); }}
                                >
                                    {renderTextWithMentions(msg.text, () => {}, users)}
                                    <div className={`text-[9px] mt-0.5 sm:mt-1 opacity-50 ${isMe ? 'text-black/60' : isXP ? 'text-gray-600' : 'text-white/40'}`}>
                                        {msg.timestamp.split(',')[1] || msg.timestamp}
                                    </div>
                                </div>

                                {msg.reactions && msg.reactions.length > 0 && (
                                    <div className="mt-0.5 sm:mt-1">
                                        <ReactionBar
                                            reactions={msg.reactions}
                                            currentUsername={currentUser.username}
                                            onReact={emoji => onReactToMessage(msg.id, emoji)}
                                            isMe={isMe}
                                            theme={theme}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Action sheet */}
            {activeMsg && (
                <MessageActionSheet
                    theme={theme}
                    onClose={() => setActiveMsg(null)}
                    actions={buildActions(activeMsg)}
                    quickReactions={QUICK_REACTIONS}
                    onReact={emoji => onReactToMessage(activeMsg.id, emoji as MessageReactionEmoji)}
                    position={activeMsgPos}
                    currentUsername={currentUser.username}
                />
            )}

            {/* Input area */}
            <div className={`border-t rounded-b-3xl relative ${footerBg}`}>
                {/* Reply bar */}
                {replyingTo && (
                    <div className={`flex items-center justify-between px-3 pt-2 pb-1 border-b ${isLight ? 'border-gray-100' : 'border-white/5'}`}>
                        <div className="flex items-center gap-2 min-w-0">
                            <XI icon={Reply} size={11} className="text-green-500 flex-shrink-0" />
                            <span className="text-[10px] font-mono opacity-60 truncate">
                                <span className={`font-bold ${replyingTo.sender === currentUser.username ? '' : 'text-green-400'}`}>
                                    @{replyingTo.sender}:
                                </span>{' '}
                                {replyingTo.text.slice(0, 60)}{replyingTo.text.length > 60 ? '…' : ''}
                            </span>
                        </div>
                        <button onClick={() => setReplyingTo(null)} className="text-[10px] opacity-40 hover:opacity-80 transition-opacity ml-2 flex-shrink-0">✕</button>
                    </div>
                )}

                {/* Mention dropdown */}
                {mentionQuery !== null && filteredUsers.length > 0 && (
                    <div className={`absolute bottom-full mb-2 left-4 w-64 border rounded-xl overflow-hidden shadow-2xl z-50 ${isWinamp ? 'bg-[#191919] border-[#505050]' : isXP ? 'bg-[#ECE9D8] border-[#ACA899]' : 'bg-black border-white/10'}`}>
                        {filteredUsers.map(u => (
                            <button
                                key={u.username}
                                type="button"
                                onClick={() => selectMention(u.username)}
                                className={`w-full flex items-center gap-2 p-2 text-left transition-colors ${isXP ? 'hover:bg-[#D4D0C8] text-gray-900' : 'hover:bg-white/10'}`}
                            >
                                <img src={u.avatarUrl} className="w-6 h-6 rounded-full" />
                                <span className="font-bold text-[10px]">@{u.username}</span>
                            </button>
                        ))}
                    </div>
                )}

                {sendError && <p className="text-red-400 text-[10px] font-mono px-3 pt-1.5">{sendError}</p>}

                <form onSubmit={handleSend} className="flex gap-1.5 p-2 sm:p-3">
                    <input
                        ref={inputRef}
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={e => { if (e.key === 'Escape') setReplyingTo(null); }}
                        placeholder={replyingTo ? `Ответить @${replyingTo.sender}...` : 'ВВЕСТИ СООБЩЕНИЕ...'}
                        className={`flex-1 rounded-xl px-3 py-2 font-mono text-xs sm:text-sm focus:outline-none focus:border-green-500 transition-all min-w-0 ${inputBg}`}
                        maxLength={500}
                        autoComplete="off"
                    />
                    <button
                        type="submit"
                        disabled={isSending || !input.trim()}
                        className={`p-2 bg-green-500 text-black rounded-xl hover:scale-105 active:scale-95 transition-all flex-shrink-0 ${(isSending || !input.trim()) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <XI icon={Send} size={17} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default DirectChat;

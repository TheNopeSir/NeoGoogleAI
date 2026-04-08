import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Send, Globe, Shield, Smile, Reply, Trash2, Crown, Copy } from 'lucide-react';
import { UserProfile, GlobalChatMessage } from '../types';
import { getUserAvatar, getGlobalChatMessages, sendGlobalChatMessage, deleteGlobalChatMessage } from '../services/storageService';
import { validateMessageText } from '../utils/textUtils';
import MessageActionSheet, { SheetAction } from './MessageActionSheet';
import XI from './XI';

interface GlobalChatProps {
    theme: 'dark' | 'light' | 'xp' | 'winamp';
    currentUser: UserProfile;
    onBack: () => void;
    onUserClick?: (username: string) => void;
    allUsers?: UserProfile[];
}

const EMOJIS = [
    '😀','😂','🥰','😎','🤔','😅','😭','🤣','😏','🤩',
    '👍','👎','❤️','🔥','💯','👀','💀','🎉','🚀','💪',
    '🎮','🕹️','📺','🎯','🏆','⭐','💎','🤝','✌️','🙌',
    '😤','🫡','🥹','🫠','😬','🤯','🥴','😇','🤖','👾',
];

const GlobalChat: React.FC<GlobalChatProps> = ({ theme, currentUser, onBack, onUserClick, allUsers = [] }) => {
    const [messages, setMessages] = useState<GlobalChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<GlobalChatMessage | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [mentionAtPos, setMentionAtPos] = useState<number>(0);
    const [activeMsg, setActiveMsg] = useState<GlobalChatMessage | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const lastSendRef = useRef<number>(0);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const isWinamp = theme === 'winamp';
    const isXP = theme === 'xp';
    const isLight = theme === 'light';
    const isAdmin = currentUser.isAdmin === true;

    const loadMessages = useCallback(async () => {
        const data = await getGlobalChatMessages();
        setMessages(data);
    }, []);

    useEffect(() => {
        loadMessages();
        pollingRef.current = setInterval(loadMessages, 5000);
        return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
    }, [loadMessages]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInput(val);
        setSendError(null);
        if (showEmojiPicker) setShowEmojiPicker(false);

        const cursorPos = e.target.selectionStart ?? val.length;
        const textBefore = val.slice(0, cursorPos);
        const atMatch = textBefore.match(/@(\w*)$/);
        if (atMatch) {
            setMentionQuery(atMatch[1]);
            setMentionAtPos(cursorPos - atMatch[0].length);
        } else {
            setMentionQuery(null);
        }
    };

    const insertMention = (username: string) => {
        const queryLen = (mentionQuery ?? '').length;
        const before = input.slice(0, mentionAtPos);
        const after = input.slice(mentionAtPos + 1 + queryLen);
        setInput(before + '@' + username + ' ' + after);
        setMentionQuery(null);
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const insertEmoji = (emoji: string) => {
        setInput(prev => prev + emoji);
        setShowEmojiPicker(false);
        setTimeout(() => inputRef.current?.focus(), 0);
    };

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
        setMentionQuery(null);
        const savedReply = replyingTo;
        setReplyingTo(null);

        try {
            const msg: GlobalChatMessage = {
                id: crypto.randomUUID(),
                sender: currentUser.username,
                text,
                timestamp: new Date().toISOString(),
                ...(savedReply && {
                    replyTo: {
                        id: savedReply.id,
                        sender: savedReply.sender,
                        text: savedReply.text.slice(0, 120),
                    },
                }),
            };
            await sendGlobalChatMessage(msg);
            setMessages(prev => [...prev, msg]);
        } catch {
            setSendError('Ошибка отправки');
            setInput(text);
            setReplyingTo(savedReply);
        } finally {
            setIsSending(false);
        }
    };

    const handleDelete = async (msgId: string) => {
        if (!isAdmin) return;
        await deleteGlobalChatMessage(msgId);
        setMessages(prev => prev.filter(m => m.id !== msgId));
    };

    const handleReply = (msg: GlobalChatMessage) => {
        setReplyingTo(msg);
        setShowEmojiPicker(false);
        setMentionQuery(null);
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const buildActions = (msg: GlobalChatMessage): SheetAction[] => {
        const actions: SheetAction[] = [
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
        if (isAdmin) {
            actions.push({
                icon: <XI icon={Trash2} size={18} />,
                label: 'Удалить',
                onClick: () => handleDelete(msg.id),
                destructive: true,
            });
        }
        return actions;
    };

    const renderText = (text: string) => {
        const parts = text.split(/(@\w+)/g);
        return parts.map((part, i) => {
            if (part.startsWith('@') && part.length > 1) {
                return (
                    <span
                        key={i}
                        className={`font-bold cursor-pointer hover:underline ${isWinamp ? 'text-[#00ff88]' : 'text-green-400'}`}
                        onClick={() => onUserClick?.(part.slice(1))}
                    >
                        {part}
                    </span>
                );
            }
            return <span key={i}>{part}</span>;
        });
    };

    const getSenderBadge = (username: string) => {
        const u = allUsers.find(x => x.username === username);
        if (!u) return null;
        if (u.isAdmin) return <XI icon={Crown} size={10} className="text-yellow-400" title="Администратор" />;
        return null;
    };

    const mentionSuggestions = mentionQuery !== null
        ? allUsers
            .filter(u => u.username !== currentUser.username && u.username.toLowerCase().startsWith(mentionQuery.toLowerCase()))
            .slice(0, 5)
        : [];

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
                {isAdmin && (
                    <div className="flex items-center gap-1 text-[9px] font-mono text-yellow-400 border border-yellow-400/30 px-2 py-1 rounded-full">
                        <XI icon={Crown} size={10} /> ADMIN
                    </div>
                )}
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-2 py-2 sm:px-4 sm:py-4 space-y-1 sm:space-y-2 scrollbar-hide no-scrollbar"
            >
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
                            <div
                                key={msg.id}
                                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2`}
                            >
                                {!isMe && (
                                    <button
                                        className="flex items-center gap-1.5 mb-0.5 ml-1 hover:opacity-100 opacity-70 transition-opacity"
                                        onClick={() => onUserClick?.(msg.sender)}
                                    >
                                        <img src={getUserAvatar(msg.sender)} className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full" alt={msg.sender} />
                                        <span className="text-[9px] font-pixel hover:underline">@{msg.sender}</span>
                                        {getSenderBadge(msg.sender)}
                                    </button>
                                )}

                                {/* Bubble */}
                                <div
                                    className={`max-w-[82%] sm:max-w-[80%] px-2.5 py-2 sm:p-3 rounded-2xl font-mono text-xs sm:text-sm leading-snug sm:leading-relaxed break-words whitespace-pre-wrap cursor-pointer select-none active:opacity-75 transition-opacity ${bubbleBg}`}
                                    onClick={() => setActiveMsg(msg)}
                                    onContextMenu={e => { e.preventDefault(); setActiveMsg(msg); }}
                                >
                                    {msg.replyTo && (
                                        <div
                                            className={`text-[9px] sm:text-[10px] mb-1.5 border-l-2 pl-2 opacity-70 truncate cursor-pointer hover:opacity-100 transition-opacity ${isMe ? 'border-black/30' : isWinamp ? 'border-[#00ff00]/40' : 'border-white/30'}`}
                                            onClick={e => {
                                                e.stopPropagation();
                                                const el = document.getElementById(`msg-${msg.replyTo!.id}`);
                                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            }}
                                        >
                                            <span className="font-bold">@{msg.replyTo.sender}: </span>
                                            {msg.replyTo.text.slice(0, 80)}{msg.replyTo.text.length > 80 ? '…' : ''}
                                        </div>
                                    )}

                                    <div id={`msg-${msg.id}`}>{renderText(msg.text)}</div>

                                    <div className={`text-[9px] mt-0.5 sm:mt-1 opacity-50 ${isMe ? 'text-black/60' : isXP ? 'text-gray-600' : 'text-white/40'}`}>
                                        {new Date(msg.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
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
                />
            )}

            {/* Input area */}
            <div className={`border-t rounded-b-3xl relative ${footerBg}`}>
                {/* Reply bar */}
                {replyingTo && (
                    <div className={`flex items-center justify-between px-4 pt-3 pb-1 border-b ${isLight ? 'border-gray-100' : 'border-white/5'}`}>
                        <div className="flex items-center gap-2 min-w-0">
                            <XI icon={Reply} size={12} className="text-green-500 flex-shrink-0" />
                            <span className="text-[10px] font-mono opacity-60 truncate">
                                <span className="text-green-400 font-bold">@{replyingTo.sender}:</span> {replyingTo.text.slice(0, 60)}{replyingTo.text.length > 60 ? '…' : ''}
                            </span>
                        </div>
                        <button onClick={() => setReplyingTo(null)} className="text-[10px] opacity-40 hover:opacity-80 transition-opacity ml-2 flex-shrink-0">✕</button>
                    </div>
                )}

                {/* Mention autocomplete */}
                {mentionSuggestions.length > 0 && (
                    <div className={`absolute bottom-full left-4 right-4 mb-1 rounded-xl overflow-hidden shadow-lg border z-20 ${isLight ? 'bg-white border-gray-200' : isWinamp ? 'bg-[#191919] border-[#505050]' : 'bg-gray-900 border-white/10'}`}>
                        {mentionSuggestions.map(u => (
                            <button
                                key={u.username}
                                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-green-500/10 transition-colors"
                                onMouseDown={e => { e.preventDefault(); insertMention(u.username); }}
                            >
                                <img src={getUserAvatar(u.username)} className="w-5 h-5 rounded-full" alt={u.username} />
                                <span className="text-xs font-mono">@{u.username}</span>
                                {u.isAdmin && <XI icon={Crown} size={10} className="text-yellow-400" />}
                            </button>
                        ))}
                    </div>
                )}

                {/* Emoji picker */}
                {showEmojiPicker && (
                    <div className={`absolute bottom-full left-4 mb-1 p-2 rounded-xl shadow-lg border z-20 grid grid-cols-10 gap-1 ${isLight ? 'bg-white border-gray-200' : isWinamp ? 'bg-[#191919] border-[#505050]' : 'bg-gray-900 border-white/10'}`}>
                        {EMOJIS.map(emoji => (
                            <button
                                key={emoji}
                                className="w-7 h-7 text-base hover:scale-125 transition-transform flex items-center justify-center rounded"
                                onMouseDown={e => { e.preventDefault(); insertEmoji(emoji); }}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}

                {sendError && <p className="text-red-400 text-[10px] font-mono px-4 pt-2">{sendError}</p>}

                <form onSubmit={handleSend} className="flex gap-2 p-2.5 sm:p-4">
                    <button
                        type="button"
                        onClick={() => { setShowEmojiPicker(v => !v); setMentionQuery(null); }}
                        className={`p-3 rounded-xl transition-all flex-shrink-0 ${showEmojiPicker ? 'bg-green-500/20 text-green-400' : isLight ? 'hover:bg-gray-100' : 'hover:bg-white/10'}`}
                    >
                        <XI icon={Smile} size={18} />
                    </button>
                    <input
                        ref={inputRef}
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={e => {
                            if (e.key === 'Escape') { setReplyingTo(null); setShowEmojiPicker(false); setMentionQuery(null); }
                        }}
                        placeholder={replyingTo ? `Ответить @${replyingTo.sender}...` : 'СООБЩЕНИЕ В ЭФИР...'}
                        className={`flex-1 rounded-xl px-4 py-3 font-mono text-sm focus:outline-none focus:border-green-500 transition-all min-w-0 ${inputBg}`}
                        maxLength={500}
                        autoComplete="off"
                    />
                    <button
                        type="submit"
                        disabled={isSending || !input.trim()}
                        className={`p-3 bg-green-500 text-black rounded-xl hover:scale-105 active:scale-95 transition-all flex-shrink-0 ${(isSending || !input.trim()) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <XI icon={Send} size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default GlobalChat;

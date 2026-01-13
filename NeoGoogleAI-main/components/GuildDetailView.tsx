
import React, { useState } from 'react';
import { ArrowLeft, Users, Shield, BookOpen, Share2, LogOut, Trash2, UserMinus } from 'lucide-react';
import { Guild, UserProfile } from '../types';
import { getUserAvatar, leaveGuild, kickFromGuild, deleteGuild } from '../services/storageService';

interface GuildDetailViewProps {
    guild: Guild;
    currentUser: UserProfile;
    theme: 'dark' | 'light' | 'xp' | 'winamp';
    onBack: () => void;
    onUserClick: (username: string) => void;
}

const GuildDetailView: React.FC<GuildDetailViewProps> = ({ 
    guild, currentUser, theme, onBack, onUserClick 
}) => {
    const isLeader = guild.leader === currentUser.username;
    const isWinamp = theme === 'winamp';
    const [inviteCopied, setInviteCopied] = useState(false);
    
    // Safeguard members array
    const members = guild.members || [];

    const handleCopyInvite = () => {
        const code = guild.inviteCode || 'ERROR';
        navigator.clipboard.writeText(code);
        setInviteCopied(true);
        setTimeout(() => setInviteCopied(false), 2000);
    };

    const handleLeave = async () => {
        if (isLeader) {
            alert('Лидер не может покинуть гильдию. Вы можете удалить её или передать права (в разработке).');
            return;
        }
        if (confirm('Вы уверены, что хотите покинуть гильдию?')) {
            const success = await leaveGuild(guild.id, currentUser.username);
            if(success) onBack();
        }
    };

    const handleDelete = async () => {
        if (confirm('Вы уверены? Это удалит гильдию и исключит всех участников. Действие необратимо.')) {
            await deleteGuild(guild.id);
            onBack();
        }
    };

    const handleKick = async (member: string) => {
        if (confirm(`Исключить пользователя @${member}?`)) {
            await kickFromGuild(guild.id, member);
        }
    };

    const canDelete = isLeader || currentUser.isAdmin;

    return (
        <div className={`max-w-4xl mx-auto animate-in fade-in pb-32 pt-4 px-4 ${isWinamp ? 'font-mono text-gray-300' : ''}`}>
            <button onClick={onBack} className={`flex items-center gap-2 mb-6 hover:underline opacity-70 font-pixel text-xs ${isWinamp ? 'text-[#00ff00]' : ''}`}>
                <ArrowLeft size={16} /> НАЗАД
            </button>

            <div className={`p-6 rounded-3xl border mb-6 relative overflow-hidden ${isWinamp ? 'bg-[#191919] border-[#505050]' : 'bg-gradient-to-br from-gray-900 to-black border-white/10'}`}>
                <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-white/20">
                        {guild.bannerUrl ? (
                            <img src={guild.bannerUrl} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-green-900 text-green-400 text-3xl font-bold">
                                {guild.name[0]}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h1 className={`text-2xl md:text-3xl font-pixel font-bold mb-2 ${isWinamp ? 'text-[#00ff00]' : 'text-white'}`}>{guild.name}</h1>
                        <p className="opacity-60 text-sm font-mono max-w-xl">{guild.description}</p>
                        <div className="flex items-center justify-center md:justify-start gap-4 mt-4 text-xs font-mono opacity-50">
                            <span className="flex items-center gap-1"><Users size={14}/> {members.length} Участников</span>
                            <span className="flex items-center gap-1"><Shield size={14}/> Лидер: {guild.leader}</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <button 
                            onClick={handleCopyInvite}
                            className={`px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase hover:bg-blue-500 transition-all flex items-center gap-2`}
                        >
                            <Share2 size={14}/> {inviteCopied ? 'СКОПИРОВАНО!' : 'ПРИГЛАСИТЬ'}
                        </button>
                        {guild.inviteCode && <div className="text-[10px] text-center opacity-50 font-mono">КОД: {guild.inviteCode}</div>}
                        
                        {!isLeader && (
                            <button onClick={handleLeave} className="px-4 py-2 border border-red-500/50 text-red-500 rounded-xl font-bold text-xs uppercase hover:bg-red-500/10 transition-all flex items-center gap-2">
                                <LogOut size={14}/> ПОКИНУТЬ
                            </button>
                        )}

                        {canDelete && (
                            <button onClick={handleDelete} className="px-4 py-2 border border-red-600 text-red-500 rounded-xl font-bold text-xs uppercase hover:bg-red-600 hover:text-white transition-all flex items-center gap-2">
                                <Trash2 size={14}/> УДАЛИТЬ
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`md:col-span-2 space-y-6`}>
                    {guild.rules && (
                        <div className={`p-6 rounded-2xl border ${isWinamp ? 'bg-black border-[#505050]' : 'bg-white/5 border-white/10'}`}>
                            <h3 className="font-pixel text-sm mb-4 flex items-center gap-2 text-yellow-500"><BookOpen size={16}/> ПРАВИЛА ГИЛЬДИИ</h3>
                            <p className="font-mono text-sm opacity-80 whitespace-pre-wrap">{guild.rules}</p>
                        </div>
                    )}
                    
                    <div className={`p-6 rounded-2xl border ${isWinamp ? 'bg-black border-[#505050]' : 'bg-white/5 border-white/10'}`}>
                        <h3 className="font-pixel text-sm mb-4 flex items-center gap-2"><Users size={16}/> УЧАСТНИКИ</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {members.map(member => (
                                <div key={member} className={`flex items-center justify-between p-3 rounded-lg border hover:bg-white/5 cursor-pointer ${isWinamp ? 'border-[#505050]' : 'border-white/5'}`}>
                                    <div className="flex items-center gap-3" onClick={() => onUserClick(member)}>
                                        <img src={getUserAvatar(member)} className="w-8 h-8 rounded-full" />
                                        <div className="text-xs font-bold">@{member}</div>
                                        {member === guild.leader && <Shield size={12} className="text-yellow-500"/>}
                                    </div>
                                    {isLeader && member !== currentUser.username && (
                                        <button onClick={() => handleKick(member)} className="text-red-500 hover:bg-red-500/20 p-2 rounded">
                                            <UserMinus size={14}/>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GuildDetailView;

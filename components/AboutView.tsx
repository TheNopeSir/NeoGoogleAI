
import React from 'react';
import { ArrowLeft, Database, Shield, Zap, Heart, Globe, Terminal } from 'lucide-react';

interface AboutViewProps {
    theme: 'dark' | 'light' | 'xp' | 'winamp';
    onBack: () => void;
}

const AboutView: React.FC<AboutViewProps> = ({ theme, onBack }) => {
    const isWinamp = theme === 'winamp';
    const isDark = theme === 'dark' || isWinamp;

    return (
        <div className={`max-w-3xl mx-auto animate-in fade-in pb-32 pt-4 px-4 ${isWinamp ? 'font-mono text-gray-300' : isDark ? 'text-gray-200' : 'text-gray-800'}`}>
            <button onClick={onBack} className={`flex items-center gap-2 mb-8 hover:underline opacity-70 font-pixel text-xs ${isWinamp ? 'text-[#00ff00]' : ''}`}>
                <ArrowLeft size={16} /> НАЗАД
            </button>

            <div className="text-center mb-12">
                <div className="inline-block p-4 rounded-full bg-green-500/10 border border-green-500 mb-4 animate-pulse">
                    <Terminal size={48} className="text-green-500"/>
                </div>
                <h1 className={`text-4xl md:text-5xl font-pixel font-black mb-4 uppercase tracking-tighter ${isWinamp ? 'text-[#00ff00]' : ''}`}>
                    NeoArchive
                </h1>
                <p className="font-mono text-sm opacity-60 uppercase tracking-widest">Цифровое убежище для ваших коллекций.</p>
            </div>

            <div className={`p-8 rounded-3xl border mb-8 ${isWinamp ? 'bg-[#191919] border-[#505050]' : isDark ? 'bg-white/5 border-white/10' : 'bg-white border-black/10'}`}>
                <h2 className="font-pixel text-xl mb-6 flex items-center gap-3">
                    <Database size={24} className="text-blue-500"/> ЧТО ЭТО ТАКОЕ?
                </h2>
                <p className="font-mono text-sm leading-relaxed opacity-80 mb-4">
                    NeoArchive — это платформа для коллекционеров, созданная в эстетике раннего интернета (Web 1.0, Y2K). 
                    Здесь нет алгоритмических лент, навязчивой рекламы или "успешного успеха".
                </p>
                <p className="font-mono text-sm leading-relaxed opacity-80">
                    Это место для вашей **Цифровой Полки**. Выкладывайте свои гаджеты, игры, винил, комиксы или редкие находки. 
                    Организуйте их в коллекции, делитесь с единомышленниками и находите предметы, которые давно искали.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                <div className={`p-6 rounded-2xl border ${isWinamp ? 'bg-black border-[#505050]' : isDark ? 'bg-white/5 border-white/10' : 'bg-white border-black/10'}`}>
                    <Shield size={32} className="text-green-500 mb-4"/>
                    <h3 className="font-pixel text-sm font-bold mb-2">ПРИВАТНОСТЬ</h3>
                    <p className="text-xs font-mono opacity-60">
                        Вы сами решаете, что показывать. Скройте профиль, закройте цены или сделайте коллекцию доступной только для друзей.
                    </p>
                </div>
                <div className={`p-6 rounded-2xl border ${isWinamp ? 'bg-black border-[#505050]' : isDark ? 'bg-white/5 border-white/10' : 'bg-white border-black/10'}`}>
                    <Zap size={32} className="text-yellow-500 mb-4"/>
                    <h3 className="font-pixel text-sm font-bold mb-2">ТОРГОВЛЯ</h3>
                    <p className="text-xs font-mono opacity-60">
                        Встроенная система статусов: "Продаю", "Меняю", "Ищу". Находите партнеров для обмена напрямую без посредников.
                    </p>
                </div>
                <div className={`p-6 rounded-2xl border ${isWinamp ? 'bg-black border-[#505050]' : isDark ? 'bg-white/5 border-white/10' : 'bg-white border-black/10'}`}>
                    <Globe size={32} className="text-blue-500 mb-4"/>
                    <h3 className="font-pixel text-sm font-bold mb-2">АТМОСФЕРА</h3>
                    <p className="text-xs font-mono opacity-60">
                        Темы оформления (Matrix, Windows XP, Winamp) возвращают дух старой школы.
                    </p>
                </div>
                <div className={`p-6 rounded-2xl border ${isWinamp ? 'bg-black border-[#505050]' : isDark ? 'bg-white/5 border-white/10' : 'bg-white border-black/10'}`}>
                    <Heart size={32} className="text-red-500 mb-4"/>
                    <h3 className="font-pixel text-sm font-bold mb-2">COMMUNITY DRIVEN</h3>
                    <p className="text-xs font-mono opacity-60">
                        Развивается силами сообщества. Никаких корпораций. Только чистый энтузиазм.
                    </p>
                </div>
            </div>

            <div className="text-center opacity-30 font-pixel text-[10px] space-y-2">
                <p>VERSION: 5.5.0 (STABLE)</p>
                <p>MADE BY COLLECTORS FOR COLLECTORS</p>
                <p>2025 © NEO_ARCHIVE PROTOCOL</p>
            </div>
        </div>
    );
};

export default AboutView;

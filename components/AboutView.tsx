
import React from 'react';
import { ArrowLeft, Database, Shield, Zap, Heart, Globe, Terminal, User, Code, FileText, Cpu, Star, RefreshCw } from 'lucide-react';
import SEO from './SEO';

interface AboutViewProps {
    theme: 'dark' | 'light' | 'xp' | 'winamp';
    onBack: () => void;
}

const AboutView: React.FC<AboutViewProps> = ({ theme, onBack }) => {
    const isWinamp = theme === 'winamp';
    const isDark = theme === 'dark' || isWinamp;

    return (
        <div className={`max-w-3xl mx-auto animate-in fade-in pb-32 pt-4 px-4 ${isWinamp ? 'font-mono text-gray-300' : isDark ? 'text-gray-200' : 'text-gray-800'}`}>
            <SEO 
                title="NeoArchive: О проекте" 
                description="Манифест NeoArchive. Цифровое убежище для коллекционеров. Философия, технологии и благодарности."
            />
            
            <button onClick={onBack} className={`flex items-center gap-2 mb-8 hover:underline opacity-70 font-pixel text-xs ${isWinamp ? 'text-[#00ff00]' : ''}`}>
                <ArrowLeft size={16} /> <span className="uppercase">Вернуться в сеть</span>
            </button>

            {/* HEADER */}
            <div className={`border-b-2 pb-8 mb-12 text-center ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                <div className="inline-flex items-center justify-center p-6 rounded-full bg-black border border-green-500/50 mb-6 shadow-[0_0_30px_rgba(74,222,128,0.2)]">
                    <Terminal size={48} className="text-green-500 animate-pulse"/>
                </div>
                <h1 className={`text-4xl md:text-6xl font-pixel font-black mb-2 tracking-tighter ${isWinamp ? 'text-[#00ff00]' : ''}`}>
                    NeoArchive
                </h1>
                <div className="flex items-center justify-center gap-2 text-xs font-mono opacity-50 uppercase tracking-[0.3em]">
                    <span>System Core</span>
                    <span>•</span>
                    <span>v5.5.0 Stable</span>
                </div>
            </div>

            {/* MANIFESTO */}
            <div className={`mb-16 font-mono leading-relaxed space-y-6 ${isWinamp ? 'text-[#00ff00]' : ''}`}>
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-px bg-current flex-1 opacity-20"></div>
                    <h2 className="font-pixel text-lg font-bold">MANIFESTO_V1.TXT</h2>
                    <div className="h-px bg-current flex-1 opacity-20"></div>
                </div>
                
                <p className="text-sm md:text-base opacity-90">
                    <span className="font-bold text-green-500">NeoArchive</span> — это приложение для создания <strong>виртуальных коллекций и цифровых полок</strong>. Мы переносим магию физического коллекционирования в цифровое пространство.
                </p>
                <p className="text-sm md:text-base opacity-90">
                    Здесь вы можете оцифровать свои сокровища: ретро-консоли, винил, книги, LEGO или любые другие предметы. Создавайте красивые каталоги, делитесь ими и находите единомышленников в духе Web 1.0.
                </p>
                <div className={`p-4 border-l-2 ${isDark ? 'border-green-500 bg-green-500/5' : 'border-black bg-black/5'}`}>
                    <p className="italic text-xs md:text-sm">
                        "Мы верим, что каждая вещь имеет историю. Наша задача — сохранить эти истории, когда физические носители исчезнут."
                    </p>
                </div>
            </div>

            {/* MODULES GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-16">
                <div className={`p-6 border rounded-none md:rounded-xl relative group overflow-hidden ${isDark ? 'border-white/10 hover:border-green-500/50 bg-white/5' : 'border-black/10 bg-white'}`}>
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-100 transition-opacity"><Database size={64}/></div>
                    <h3 className="font-pixel text-sm font-bold mb-2 flex items-center gap-2"><Shield className="text-blue-500" size={16}/> ПРИВАТНОСТЬ</h3>
                    <p className="text-xs font-mono opacity-70">
                        Ваши данные принадлежат вам. Настраивайте видимость каждой коллекции: для всех, для друзей или только для себя. Никаких трекеров и продажи данных.
                    </p>
                </div>

                <div className={`p-6 border rounded-none md:rounded-xl relative group overflow-hidden ${isDark ? 'border-white/10 hover:border-yellow-500/50 bg-white/5' : 'border-black/10 bg-white'}`}>
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-100 transition-opacity"><Zap size={64}/></div>
                    <h3 className="font-pixel text-sm font-bold mb-2 flex items-center gap-2"><RefreshCw className="text-yellow-500" size={16}/> ТОРГОВЛЯ</h3>
                    <p className="text-xs font-mono opacity-70">
                        P2P система обмена без посредников. Выставляйте лоты, предлагайте обмен (Trade), используйте систему вишлистов для поиска Граалей.
                    </p>
                </div>

                <div className={`p-6 border rounded-none md:rounded-xl relative group overflow-hidden ${isDark ? 'border-white/10 hover:border-purple-500/50 bg-white/5' : 'border-black/10 bg-white'}`}>
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-100 transition-opacity"><Globe size={64}/></div>
                    <h3 className="font-pixel text-sm font-bold mb-2 flex items-center gap-2"><Globe className="text-purple-500" size={16}/> АТМОСФЕРА</h3>
                    <p className="text-xs font-mono opacity-70">
                        Скины интерфейса (Matrix, Winamp, Windows XP) переключаются на лету. Погружение в эпоху, когда дизайн имел душу.
                    </p>
                </div>

                <div className={`p-6 border rounded-none md:rounded-xl relative group overflow-hidden ${isDark ? 'border-white/10 hover:border-red-500/50 bg-white/5' : 'border-black/10 bg-white'}`}>
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-100 transition-opacity"><Cpu size={64}/></div>
                    <h3 className="font-pixel text-sm font-bold mb-2 flex items-center gap-2"><Cpu className="text-red-500" size={16}/> ТЕХНОЛОГИИ</h3>
                    <p className="text-xs font-mono opacity-70">
                        PWA (работает офлайн), локальное шифрование, мгновенная синхронизация. Мы используем современный стек для ретро-задач.
                    </p>
                </div>
            </div>

            {/* CONTRIBUTORS / CREDITS */}
            <div className={`mb-16 border-2 ${isWinamp ? 'border-[#505050] bg-[#191919]' : isDark ? 'border-white/10 bg-black/40' : 'border-black/10 bg-white'}`}>
                <div className={`p-2 border-b flex justify-between items-center ${isWinamp ? 'bg-[#000040]' : isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
                    <span className="font-pixel text-xs font-bold pl-2">SYSTEM_CONTRIBUTORS.EXE</span>
                    <div className="flex gap-1">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                </div>
                
                <div className="p-6">
                    <p className="font-mono text-xs opacity-60 mb-6 text-center">
                        Особая благодарность первым колонистам и бета-тестерам, чья обратная связь помогла сформировать этот мир.
                    </p>

                    <div className="space-y-4">
                        <a 
                            href="https://t.me/surffun" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className={`flex items-center gap-4 p-4 border rounded hover:translate-x-2 transition-transform group ${isDark ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'}`}
                        >
                            <div className="w-10 h-10 rounded bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold font-pixel text-sm">
                                S
                            </div>
                            <div className="flex-1">
                                <div className="font-bold font-pixel text-sm flex items-center gap-2">
                                    @Surf <Star size={12} className="text-yellow-500 fill-yellow-500"/>
                                </div>
                                <div className="text-[10px] font-mono opacity-50">Chief Quality Assurance / Stress Testing</div>
                            </div>
                            <Globe size={16} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-400"/>
                        </a>

                        <a 
                            href="https://t.me/ketarro_official" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className={`flex items-center gap-4 p-4 border rounded hover:translate-x-2 transition-transform group ${isDark ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'}`}
                        >
                            <div className="w-10 h-10 rounded bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold font-pixel text-sm">
                                K
                            </div>
                            <div className="flex-1">
                                <div className="font-bold font-pixel text-sm flex items-center gap-2">
                                    @Ketarro <Star size={12} className="text-yellow-500 fill-yellow-500"/>
                                </div>
                                <div className="text-[10px] font-mono opacity-50">Security Analysis / Logic Core Logic</div>
                            </div>
                            <Globe size={16} className="opacity-0 group-hover:opacity-100 transition-opacity text-purple-400"/>
                        </a>
                    </div>
                </div>
            </div>

            {/* FOOTER */}
            <div className="text-center space-y-2 opacity-30 font-pixel text-[10px]">
                <p>INITIATED: 2025</p>
                <p>PROTOCOL: DECENTRALIZED COLLECTION STORAGE</p>
                <p>MADE BY COLLECTORS FOR COLLECTORS</p>
                <div className="pt-4 flex justify-center gap-4">
                    <FileText size={16} />
                    <Code size={16} />
                    <Heart size={16} />
                </div>
            </div>
        </div>
    );
};

export default AboutView;

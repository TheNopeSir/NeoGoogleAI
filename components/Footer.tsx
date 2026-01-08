
import React from 'react';
import { Info } from 'lucide-react';

interface FooterProps {
    theme: 'dark' | 'light' | 'xp' | 'winamp';
    onAboutClick: () => void;
}

const Footer: React.FC<FooterProps> = ({ theme, onAboutClick }) => {
    const isWinamp = theme === 'winamp';
    const isDark = theme === 'dark';

    return (
        <footer className={`py-12 text-center border-t mt-auto w-full ${isWinamp ? 'border-[#505050] text-[#00ff00] bg-[#191919]' : isDark ? 'border-white/5 text-gray-500' : 'border-black/5 text-gray-400'}`}>
            <div className="flex flex-col items-center gap-4">
                <button 
                    onClick={onAboutClick}
                    className={`flex items-center gap-2 text-xs font-mono uppercase tracking-widest hover:underline transition-all ${isWinamp ? 'text-[#00ff00]' : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black'}`}
                >
                    <Info size={14} /> О приложении
                </button>
                <div className="text-[10px] font-pixel opacity-50">
                    NEO_ARCHIVE PROTOCOL © 2025
                </div>
            </div>
        </footer>
    );
};

export default Footer;

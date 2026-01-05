import React from 'react';
import { UserProfile } from '../types';

interface HeroSectionProps {
    theme: 'dark' | 'light';
    user: UserProfile | null;
}

const HeroSection: React.FC<HeroSectionProps> = ({ theme }) => (
    <div className={`hidden md:block relative mb-6 p-6 rounded-lg border-2 border-dashed overflow-hidden group ${
        theme === 'dark' 
        ? 'border-dark-dim bg-dark-surface/50 hover:border-dark-primary transition-colors' 
        : 'border-light-dim bg-white/50 hover:border-light-accent transition-colors'
    }`}>
        <div className={`absolute top-0 left-0 w-1 h-full opacity-50 ${theme === 'dark' ? 'bg-dark-primary' : 'bg-light-accent'}`}></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className={`text-sm md:text-2xl lg:text-3xl font-pixel mb-2 break-words ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                    NEO_ARCHIVE
                </h1>
                <p className={`font-mono text-[10px] md:text-sm max-w-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Цифровой ковчег для сохранения артефактов прошлого в облачной вечности.
                </p>
            </div>
        </div>
        <div className={`absolute inset-0 pointer-events-none opacity-5 bg-gradient-to-r from-transparent via-current to-transparent animate-[shimmer_2s_infinite] ${
            theme === 'dark' ? 'text-dark-primary' : 'text-light-accent'
        }`} />
    </div>
);

export default HeroSection;
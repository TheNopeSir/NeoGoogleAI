import React from 'react';
import { Download, X } from 'lucide-react';

interface InstallBannerProps {
    theme: 'dark' | 'light';
    onInstall: () => void;
    onClose: () => void;
}

const InstallBanner: React.FC<InstallBannerProps> = ({ theme, onInstall, onClose }) => (
    <div className={`fixed top-14 left-0 w-full z-40 p-2 flex justify-center animate-in slide-in-from-top-2`}>
        <div className={`flex items-center gap-3 p-3 rounded border-2 shadow-lg backdrop-blur-md max-w-sm w-full justify-between ${
            theme === 'dark' 
            ? 'bg-black/90 border-dark-primary text-white shadow-dark-primary/20' 
            : 'bg-white/90 border-light-accent text-black shadow-light-accent/20'
        }`}>
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded border ${
                    theme === 'dark' ? 'border-dark-primary bg-dark-primary/20' : 'border-light-accent bg-light-accent/20'
                }`}>
                    <Download size={20} className="animate-bounce" />
                </div>
                <div>
                    <h3 className="font-pixel text-[10px] font-bold">SYSTEM UPDATE</h3>
                    <p className="font-mono text-[9px] opacity-80">Установить приложение?</p>
                </div>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={onInstall}
                    className={`px-3 py-1 font-pixel text-[9px] font-bold uppercase border hover:bg-current hover:text-black transition-colors ${
                        theme === 'dark' ? 'border-dark-primary text-dark-primary' : 'border-light-accent text-light-accent'
                    }`}
                >
                    INSTALL
                </button>
                <button onClick={onClose} className="opacity-50 hover:opacity-100">
                    <X size={16} />
                </button>
            </div>
        </div>
    </div>
);

export default InstallBanner;
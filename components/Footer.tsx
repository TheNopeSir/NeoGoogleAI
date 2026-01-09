import React from 'react';
import { Info, Heart, Code, ExternalLink } from 'lucide-react';

interface FooterProps {
  theme: 'dark' | 'light' | 'xp' | 'winamp';
  onAboutClick: () => void;
}

const Footer: React.FC<FooterProps> = ({ theme, onAboutClick }) => {
  const getFooterClasses = () => {
    switch(theme) {
      case 'xp':
        return 'bg-[#ECE9D8] border-t-2 border-[#003C74] text-black';
      case 'winamp':
        return 'bg-[#292929] border-t border-[#505050] text-gray-300 font-winamp';
      case 'light':
        return 'bg-white/90 backdrop-blur-md border-t border-gray-200 text-gray-700';
      default:
        return 'bg-black/90 backdrop-blur-md border-t border-white/10 text-gray-400';
    }
  };

  const getLinkClasses = () => {
    switch(theme) {
      case 'xp':
        return 'text-[#245DDA] hover:underline';
      case 'winamp':
        return 'text-[#00ff00] hover:text-[#00ff00]/80';
      case 'light':
        return 'text-blue-600 hover:text-blue-700';
      default:
        return 'text-green-500 hover:text-green-400';
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer className={`hidden md:block mt-auto py-8 ${getFooterClasses()}`}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">

          {/* About Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-8 h-8 flex items-center justify-center font-bold text-xs rounded border ${
                theme === 'winamp' ? 'border-[#505050] bg-[#191919] text-[#00ff00]' :
                'bg-green-500 border-green-500 text-black'
              }`}>
                NA
              </div>
              <h3 className="font-pixel text-sm font-bold">NeoArchive</h3>
            </div>
            <p className="text-xs leading-relaxed opacity-70">
              Ваша персональная цифровая полка для коллекционирования и каталогизации
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-pixel text-xs font-bold mb-3 opacity-80">НАВИГАЦИЯ</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={onAboutClick}
                  className={`flex items-center gap-2 ${getLinkClasses()} transition-colors`}
                >
                  <Info size={14} />
                  О приложении
                </button>
              </li>
              <li>
                <a
                  href="https://t.me/surffun"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 ${getLinkClasses()} transition-colors`}
                >
                  <ExternalLink size={14} />
                  Поддержка
                </a>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="font-pixel text-xs font-bold mb-3 opacity-80">СООБЩЕСТВО</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="https://t.me/surffun"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 ${getLinkClasses()} transition-colors`}
                >
                  <ExternalLink size={14} />
                  @surffun
                </a>
              </li>
              <li>
                <a
                  href="https://t.me/ketarro_official"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 ${getLinkClasses()} transition-colors`}
                >
                  <ExternalLink size={14} />
                  @ketarro_official
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-current/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs opacity-60">
            <div className="flex items-center gap-2">
              <span>© {currentYear} NeoArchive System</span>
              <span className="hidden md:inline">•</span>
              <span className="flex items-center gap-1">
                Создано с <Heart size={12} className="text-red-500 inline" /> для коллекционеров
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Code size={12} />
              <span className="font-mono">v5.1</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

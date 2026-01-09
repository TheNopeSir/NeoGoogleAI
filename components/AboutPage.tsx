import React from 'react';
import { ArrowLeft, ExternalLink, Heart, Code, Database, Zap, Users, Shield, Sparkles } from 'lucide-react';
import SEO from './SEO';

interface AboutPageProps {
  theme: 'dark' | 'light' | 'xp' | 'winamp';
  onBack: () => void;
}

const AboutPage: React.FC<AboutPageProps> = ({ theme, onBack }) => {
  const getThemeClasses = () => {
    switch(theme) {
      case 'xp': return 'bg-[#ECE9D8] text-black';
      case 'winamp': return 'bg-[#191919] text-gray-300 font-winamp';
      case 'light': return 'bg-white text-gray-900';
      default: return 'bg-dark-surface text-gray-100';
    }
  };

  const getCardClasses = () => {
    switch(theme) {
      case 'xp': return 'bg-white border-2 border-[#003C74] shadow-lg';
      case 'winamp': return 'bg-[#292929] border border-[#505050]';
      case 'light': return 'bg-gray-50 border border-gray-200';
      default: return 'bg-dark-bg/50 border border-white/10';
    }
  };

  const getAccentColor = () => {
    switch(theme) {
      case 'xp': return 'text-[#245DDA]';
      case 'winamp': return 'text-[#00ff00]';
      case 'light': return 'text-blue-600';
      default: return 'text-green-500';
    }
  };

  return (
    <div className={`min-h-screen pb-24 ${getThemeClasses()}`}>
      <SEO
        title="О приложении - NeoArchive: Ваша цифровая полка"
        description="NeoArchive — это инновационный сервис для создания и управления цифровыми коллекциями. Организуйте свои гаджеты, игры, книги, винил и любые предметы хобби. Делитесь коллекциями, находите единомышленников и торгуйте редкими экземплярами."
        type="article"
      />

      {/* Header */}
      <div className={`sticky top-0 z-10 px-4 py-4 border-b ${getCardClasses()}`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity"
          >
            <ArrowLeft size={20} />
            <span className="hidden sm:inline">Назад</span>
          </button>
          <h1 className={`font-pixel text-lg ${getAccentColor()}`}>О ПРИЛОЖЕНИИ</h1>
          <div className="w-16"></div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* Hero Section */}
        <div className={`${getCardClasses()} rounded-2xl p-8 text-center`}>
          <div className="inline-block mb-4">
            <div className={`w-20 h-20 mx-auto flex items-center justify-center font-bold text-2xl rounded-2xl border-4 ${
              theme === 'winamp' ? 'border-[#00ff00] bg-[#191919] text-[#00ff00]' :
              'bg-gradient-to-br from-green-400 to-green-600 border-green-500 text-black shadow-lg shadow-green-500/50'
            }`}>
              NA
            </div>
          </div>
          <h2 className={`font-pixel text-2xl mb-4 ${getAccentColor()}`}>
            NeoArchive
          </h2>
          <p className="text-lg leading-relaxed mb-4">
            Ваша персональная цифровая полка для коллекционирования и каталогизации
          </p>
          <p className="opacity-70 text-sm">
            Версия 5.1 | Запущено в 2025
          </p>
        </div>

        {/* Main Description */}
        <div className={`${getCardClasses()} rounded-2xl p-6 space-y-4`}>
          <h3 className={`font-pixel text-lg mb-4 flex items-center gap-2 ${getAccentColor()}`}>
            <Sparkles size={20} />
            Что такое NeoArchive?
          </h3>
          <p className="leading-relaxed">
            <strong>NeoArchive</strong> — это инновационная платформа для создания, организации и демонстрации цифровых коллекций.
            Мы помогаем превратить ваши увлечения в красиво оформленный каталог, которым можно делиться с друзьями и единомышленниками по всему миру.
          </p>
          <p className="leading-relaxed">
            Будь то ретро-техника, виниловые пластинки, редкие игры, книги, модели или любые другие предметы —
            NeoArchive предоставляет удобные инструменты для документирования каждого экспоната вашей коллекции
            с фотографиями, подробными характеристиками и историей.
          </p>
        </div>

        {/* Features */}
        <div className={`${getCardClasses()} rounded-2xl p-6`}>
          <h3 className={`font-pixel text-lg mb-6 flex items-center gap-2 ${getAccentColor()}`}>
            <Zap size={20} />
            Возможности платформы
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Database className={`${getAccentColor()} flex-shrink-0 mt-1`} size={20} />
              <div>
                <h4 className="font-bold mb-1">Управление коллекциями</h4>
                <p className="text-sm opacity-70">
                  Создавайте артефакты с фото, описаниями и спецификациями. Объединяйте их в тематические коллекции.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Users className={`${getAccentColor()} flex-shrink-0 mt-1`} size={20} />
              <div>
                <h4 className="font-bold mb-1">Социальная сеть</h4>
                <p className="text-sm opacity-70">
                  Подписывайтесь на других коллекционеров, комментируйте, лайкайте и общайтесь в личных сообщениях.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Heart className={`${getAccentColor()} flex-shrink-0 mt-1`} size={20} />
              <div>
                <h4 className="font-bold mb-1">Wishlist система</h4>
                <p className="text-sm opacity-70">
                  Создавайте списки желаемых предметов. Сообщество поможет найти редкие экземпляры.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Shield className={`${getAccentColor()} flex-shrink-0 mt-1`} size={20} />
              <div>
                <h4 className="font-bold mb-1">Система рейтингов</h4>
                <p className="text-sm opacity-70">
                  Достижения, статистика просмотров, лайки и репутация в сообществе.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Code className={`${getAccentColor()} flex-shrink-0 mt-1`} size={20} />
              <div>
                <h4 className="font-bold mb-1">Офлайн режим</h4>
                <p className="text-sm opacity-70">
                  Работа без интернета с автоматической синхронизацией данных при восстановлении связи.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Sparkles className={`${getAccentColor()} flex-shrink-0 mt-1`} size={20} />
              <div>
                <h4 className="font-bold mb-1">Ретро темы</h4>
                <p className="text-sm opacity-70">
                  Темы оформления: Dark, Light, Windows XP и Winamp для истинных ценителей эстетики.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Technology Stack */}
        <div className={`${getCardClasses()} rounded-2xl p-6`}>
          <h3 className={`font-pixel text-lg mb-4 flex items-center gap-2 ${getAccentColor()}`}>
            <Code size={20} />
            Технологии
          </h3>
          <p className="leading-relaxed mb-4">
            NeoArchive построен на современном технологическом стеке:
          </p>
          <div className="flex flex-wrap gap-2">
            {['React 19', 'TypeScript', 'Supabase', 'Tailwind CSS', 'IndexedDB', 'PWA', 'Vite', 'Node.js'].map(tech => (
              <span
                key={tech}
                className={`px-3 py-1 rounded-full text-xs font-mono ${
                  theme === 'dark' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                  theme === 'light' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                  theme === 'xp' ? 'bg-[#245DDA]/20 text-[#245DDA] border border-[#245DDA]/30' :
                  'bg-[#00ff00]/20 text-[#00ff00] border border-[#00ff00]/30'
                }`}
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* SEO Keywords */}
        <div className={`${getCardClasses()} rounded-2xl p-6`}>
          <h3 className={`font-pixel text-lg mb-4 flex items-center gap-2 ${getAccentColor()}`}>
            <Database size={20} />
            Для кого NeoArchive?
          </h3>
          <div className="space-y-3 text-sm leading-relaxed">
            <p>
              ✨ <strong>Коллекционеры ретро-техники</strong> — каталогизируйте винтажные компьютеры, игровые приставки, аудиотехнику
            </p>
            <p>
              🎮 <strong>Геймеры</strong> — ведите учёт физических копий игр, редких изданий и коллекционок
            </p>
            <p>
              📚 <strong>Библиофилы</strong> — организуйте домашнюю библиотеку с возможностью поиска и фильтрации
            </p>
            <p>
              🎵 <strong>Меломаны</strong> — управляйте коллекцией виниловых пластинок, CD и кассет
            </p>
            <p>
              🧱 <strong>Моделисты</strong> — каталогизируйте наборы LEGO, модели самолётов, кораблей и техники
            </p>
            <p>
              🎨 <strong>Ценители искусства</strong> — создавайте цифровые каталоги фигурок, артбуков и мерча
            </p>
          </div>
        </div>

        {/* Contributors */}
        <div className={`${getCardClasses()} rounded-2xl p-6`}>
          <h3 className={`font-pixel text-lg mb-6 flex items-center gap-2 ${getAccentColor()}`}>
            <Heart size={20} className="text-red-500" />
            Благодарности
          </h3>
          <p className="mb-6 leading-relaxed">
            Особая благодарность нашим активным участникам сообщества, которые помогали с идеями,
            тестированием и поиском багов:
          </p>
          <div className="space-y-4">
            <a
              href="https://t.me/surffun"
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-3 p-4 rounded-xl transition-all hover:scale-[1.02] ${
                theme === 'dark' ? 'bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30' :
                theme === 'light' ? 'bg-blue-50 hover:bg-blue-100 border border-blue-200' :
                theme === 'xp' ? 'bg-white hover:bg-gray-100 border-2 border-[#0078D7]' :
                'bg-[#00ff00]/10 hover:bg-[#00ff00]/20 border border-[#00ff00]/30'
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                theme === 'winamp' ? 'bg-[#00ff00] text-black' : 'bg-blue-500 text-white'
              }`}>
                SF
              </div>
              <div className="flex-1">
                <div className="font-bold">@surffun</div>
                <div className="text-xs opacity-70">Идеи и концепции • Тестирование</div>
              </div>
              <ExternalLink size={16} className="opacity-50" />
            </a>

            <a
              href="https://t.me/ketarro_official"
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-3 p-4 rounded-xl transition-all hover:scale-[1.02] ${
                theme === 'dark' ? 'bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30' :
                theme === 'light' ? 'bg-purple-50 hover:bg-purple-100 border border-purple-200' :
                theme === 'xp' ? 'bg-white hover:bg-gray-100 border-2 border-[#8B5CF6]' :
                'bg-[#00ff00]/10 hover:bg-[#00ff00]/20 border border-[#00ff00]/30'
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                theme === 'winamp' ? 'bg-[#00ff00] text-black' : 'bg-purple-500 text-white'
              }`}>
                KO
              </div>
              <div className="flex-1">
                <div className="font-bold">@ketarro_official</div>
                <div className="text-xs opacity-70">Баг-репорты • QA тестирование</div>
              </div>
              <ExternalLink size={16} className="opacity-50" />
            </a>
          </div>
          <p className="mt-6 text-center text-sm opacity-70">
            Спасибо всем, кто делает NeoArchive лучше! ❤️
          </p>
        </div>

        {/* Contact & Support */}
        <div className={`${getCardClasses()} rounded-2xl p-6 text-center`}>
          <h3 className={`font-pixel text-lg mb-4 ${getAccentColor()}`}>
            Связь и поддержка
          </h3>
          <p className="mb-4 opacity-70">
            Нашли баг? Есть предложения? Хотите помочь проекту?
          </p>
          <p className="text-sm opacity-70">
            Присоединяйтесь к нашему сообществу и участвуйте в развитии платформы
          </p>
        </div>

        {/* Footer Note */}
        <div className="text-center text-xs opacity-50 pt-4">
          <p>© 2025 NeoArchive System</p>
          <p className="mt-1">Создано с ❤️ для коллекционеров</p>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;

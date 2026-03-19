import React, { useEffect, useState } from 'react';
import { Archive, ArrowLeftRight, Users, ArrowRight, ChevronDown, Smartphone, Zap, WifiOff, Bell, Share, X } from 'lucide-react';
import MatrixRain from './MatrixRain';
import CRTOverlay from './CRTOverlay';
import SEO from './SEO';
import XI from './XI';

interface LandingPageProps {
  onLogin: () => void;
  onRegister: () => void;
}

const TIERS = [
  { name: 'COMMON',    color: '#9ca3af', bg: 'rgba(156,163,175,0.1)', border: 'rgba(156,163,175,0.3)' },
  { name: 'UNCOMMON',  color: '#4ade80', bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.4)' },
  { name: 'RARE',      color: '#22d3ee', bg: 'rgba(34,211,238,0.1)',  border: 'rgba(34,211,238,0.5)' },
  { name: 'EPIC',      color: '#a855f7', bg: 'rgba(168,85,247,0.1)',  border: 'rgba(168,85,247,0.6)' },
  { name: 'LEGENDARY', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.7)' },
  { name: 'MYTHIC',    color: '#ec4899', bg: 'rgba(236,72,153,0.1)',  border: 'rgba(236,72,153,0.8)' },
  { name: 'CURSED',    color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.8)' },
];

const FEATURES = [
  {
    icon: Archive,
    title: 'Коллекции',
    desc: 'Создавай каталоги своих редкостей. Любые предметы — от виниловых пластинок до антиквариата.',
  },
  {
    icon: ArrowLeftRight,
    title: 'Торговля',
    desc: 'Обменивайся экспонатами с другими коллекционерами. Система трейдов прямо в приложении.',
  },
  {
    icon: Users,
    title: 'Сообщество',
    desc: 'Подписывайся на авторов, ставь реакции, веди переписку. Живая лента редкостей.',
  },
];

const PWA_PERKS = [
  { icon: WifiOff,  label: 'Работает офлайн',        desc: 'Лента и коллекция доступны без сети' },
  { icon: Zap,      label: 'Мгновенный запуск',       desc: 'Открывается как нативное приложение' },
  { icon: Bell,     label: 'Push-уведомления',        desc: 'Новые трейды и лайки — мгновенно' },
];

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onRegister }) => {
  const [userCount, setUserCount] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);

  // PWA install state
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isYandex, setIsYandex] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(d => { if (d.users) setUserCount(d.users); })
      .catch(() => {});
  }, []);

  // PWA install prompt setup
  useEffect(() => {
    // Already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const ua = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));
    setIsYandex(/yabrowser/.test(ua));

    // beforeinstallprompt may have fired before React mounted —
    // index.html captures it in window.__pwaPrompt
    if ((window as any).__pwaPrompt) {
      setInstallPrompt((window as any).__pwaPrompt);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      (window as any).__pwaPrompt = e;
    };

    window.addEventListener('beforeinstallprompt', handler);
    // custom event dispatched by index.html when prompt is captured
    window.addEventListener('pwa-prompt-ready', () => {
      if ((window as any).__pwaPrompt) setInstallPrompt((window as any).__pwaPrompt);
    });

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      (window as any).__pwaPrompt = null;
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      setIsInstalled(true);
    }
  };

  const showInstallSection = !isInstalled;
  const showBanner = installPrompt && !isInstalled && !bannerDismissed;

  return (
    <div className={`min-h-screen bg-black text-white overflow-x-hidden transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <SEO title="NeoArchive — Цифровой архив коллекций" />

      {/* ─── STICKY INSTALL BANNER (Chrome/Android/Desktop) ─── */}
      {showBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-4 py-3 bg-black/95 border-b border-green-500/25 backdrop-blur-md animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(74,222,128,0.4)]">
              <span className="font-pixel text-black text-[10px] font-bold">NA</span>
            </div>
            <div className="min-w-0">
              <p className="font-pixel text-[11px] text-white truncate">NeoArchive</p>
              <p className="font-mono text-[10px] text-white/50 truncate">Установить как приложение</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleInstall}
              className="px-4 py-1.5 bg-green-500 text-black font-pixel text-[10px] uppercase tracking-wide hover:bg-green-400 transition-colors shadow-[0_0_10px_rgba(74,222,128,0.3)]"
            >
              УСТАНОВИТЬ
            </button>
            <button
              onClick={() => setBannerDismissed(true)}
              className="p-1.5 text-white/30 hover:text-white/60 transition-colors"
              aria-label="Закрыть"
            >
              <XI icon={X} size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ─── HERO ─── */}
      <section className={`relative min-h-screen flex flex-col items-center justify-center text-center px-4 overflow-hidden ${showBanner ? 'pt-14' : ''}`}>
        <MatrixRain theme="dark" />
        <CRTOverlay />

        <div className="relative z-10 flex flex-col items-center gap-6 max-w-2xl mx-auto">
          {/* Logo badge */}
          <div className="w-16 h-16 rounded-2xl bg-green-500 flex items-center justify-center mb-2 shadow-[0_0_40px_rgba(74,222,128,0.5)]">
            <span className="font-pixel text-black text-2xl font-bold">NA</span>
          </div>

          <h1 className="font-pixel text-4xl sm:text-5xl md:text-6xl tracking-tight text-white leading-none">
            NEO_<span className="text-green-400">ARCHIVE</span>
          </h1>

          <p className="font-mono text-sm sm:text-base text-white/60 max-w-md leading-relaxed tracking-wide">
            Платформа для цифровых коллекционеров.
            <br />
            Каталогизируй, торгуй, делись редкостями.
          </p>

          {userCount !== null && (
            <div className="flex items-center gap-2 text-xs font-mono text-green-400">
              <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              {userCount.toLocaleString()} коллекционеров онлайн
            </div>
          )}

          <div className="flex gap-4 mt-2 flex-wrap justify-center">
            <button
              onClick={onRegister}
              className="px-8 py-3 bg-green-500 text-black font-pixel text-xs uppercase tracking-widest hover:bg-green-400 transition-all shadow-[0_0_20px_rgba(74,222,128,0.4)] hover:shadow-[0_0_30px_rgba(74,222,128,0.6)]"
            >
              НАЧАТЬ →
            </button>
            <button
              onClick={onLogin}
              className="px-8 py-3 border border-white/20 font-pixel text-xs uppercase tracking-widest hover:bg-white/5 hover:border-white/40 transition-all"
            >
              ВОЙТИ
            </button>
          </div>

          {/* Quick install hint in hero (if prompt ready) */}
          {installPrompt && !isInstalled && (
            <button
              onClick={handleInstall}
              className="flex items-center gap-2 mt-2 text-[11px] font-mono text-green-400/70 hover:text-green-400 transition-colors underline underline-offset-4"
            >
              <XI icon={Smartphone} size={12} />
              Установить приложение бесплатно
            </button>
          )}
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-30 animate-bounce z-10">
          <span className="text-[10px] font-mono uppercase tracking-widest">Узнать больше</span>
          <XI icon={ChevronDown} size={16} />
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="py-24 px-4 bg-zinc-950">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-pixel text-center text-xl tracking-widest text-white/80 mb-2 uppercase">Возможности</h2>
          <div className="w-16 h-0.5 bg-green-500 mx-auto mb-14" />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="p-6 rounded-2xl border border-white/5 bg-white/[0.03] hover:border-green-500/30 hover:bg-white/[0.06] transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center mb-4 group-hover:bg-green-500/20 transition-colors">
                  <Icon size={20} className="text-green-400" />
                </div>
                <h3 className="font-pixel text-sm text-white mb-2 uppercase tracking-wider">{title}</h3>
                <p className="font-mono text-xs text-white/50 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── RARITY TIERS ─── */}
      <section className="py-24 px-4 bg-black">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-pixel text-center text-xl tracking-widest text-white/80 mb-2 uppercase">Система редкостей</h2>
          <div className="w-16 h-0.5 bg-green-500 mx-auto mb-4" />
          <p className="text-center font-mono text-xs text-white/40 mb-14 max-w-md mx-auto">
            Каждый экспонат получает уровень редкости на основе лайков, просмотров и активности.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            {TIERS.map(tier => (
              <div
                key={tier.name}
                className="px-5 py-3 rounded-xl border font-pixel text-xs tracking-widest transition-all hover:scale-105"
                style={{
                  color: tier.color,
                  backgroundColor: tier.bg,
                  borderColor: tier.border,
                  boxShadow: `0 0 12px ${tier.border}`,
                }}
              >
                {tier.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA BOTTOM ─── */}
      <section className="py-24 px-4 bg-zinc-950 text-center">
        <div className="max-w-xl mx-auto flex flex-col items-center gap-6">
          <h2 className="font-pixel text-2xl sm:text-3xl tracking-tight text-white">
            ГОТОВ К <span className="text-green-400">АРХИВУ?</span>
          </h2>
          <p className="font-mono text-xs text-white/50 max-w-sm">
            Присоединяйся к сообществу коллекционеров. Регистрация бесплатна.
          </p>
          <button
            onClick={onRegister}
            className="flex items-center gap-3 px-10 py-4 bg-green-500 text-black font-pixel text-xs uppercase tracking-widest hover:bg-green-400 transition-all shadow-[0_0_30px_rgba(74,222,128,0.4)]"
          >
            ЗАРЕГИСТРИРОВАТЬСЯ <XI icon={ArrowRight} size={16} />
          </button>
          <button
            onClick={onLogin}
            className="text-[11px] font-mono text-white/40 hover:text-white/70 underline underline-offset-4 transition-colors"
          >
            Уже есть аккаунт? Войти
          </button>
        </div>
      </section>

      {/* ─── PWA INSTALL SECTION ─── */}
      {showInstallSection && (
        <section className="py-24 px-4 bg-black relative overflow-hidden">
          {/* Subtle green glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-green-500/5 rounded-full blur-3xl" />
          </div>

          <div className="max-w-4xl mx-auto relative z-10">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-green-500/30 bg-green-500/5 mb-6">
                <XI icon={Smartphone} size={14} className="text-green-400" />
                <span className="font-mono text-[11px] text-green-400 uppercase tracking-widest">Мобильное приложение</span>
              </div>
              <h2 className="font-pixel text-xl sm:text-2xl tracking-widest text-white mb-2 uppercase">
                Установить на устройство
              </h2>
              <div className="w-16 h-0.5 bg-green-500 mx-auto mb-4" />
              <p className="font-mono text-xs text-white/40 max-w-sm mx-auto">
                NeoArchive — PWA-приложение. Работает как нативное, без магазинов приложений.
              </p>
            </div>

            {/* Perks grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
              {PWA_PERKS.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-4 p-5 rounded-2xl border border-white/5 bg-white/[0.02] hover:border-green-500/20 transition-all">
                  <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                    <Icon size={17} className="text-green-400" />
                  </div>
                  <div>
                    <p className="font-pixel text-xs text-white mb-1 uppercase tracking-wide">{label}</p>
                    <p className="font-mono text-[11px] text-white/40 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Install action */}
            {isIOS ? (
              /* iOS Safari: share → Add to Home Screen */
              <div className="max-w-sm mx-auto p-6 rounded-2xl border border-white/10 bg-white/[0.03] text-center">
                <p className="font-pixel text-xs text-white/60 uppercase mb-5 tracking-wide">Установка на iOS</p>
                <div className="space-y-4 text-left">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      <XI icon={Share} size={15} className="text-white/50" />
                    </div>
                    <p className="font-mono text-xs text-white/60">Нажмите кнопку <span className="text-white">«Поделиться»</span> в Safari</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 font-pixel text-white/50 text-[10px]">+</div>
                    <p className="font-mono text-xs text-white/60">Выберите <span className="text-white">«На экран «Домой»»</span></p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center shrink-0">
                      <span className="font-pixel text-green-400 text-[10px]">NA</span>
                    </div>
                    <p className="font-mono text-xs text-white/60">Готово — иконка <span className="text-white">NeoArchive</span> на рабочем столе</p>
                  </div>
                </div>
              </div>
            ) : installPrompt ? (
              /* beforeinstallprompt available — native button (Chrome / Edge / Yandex when ready) */
              <div className="text-center">
                <button
                  onClick={handleInstall}
                  className="inline-flex items-center gap-3 px-10 py-4 bg-green-500 text-black font-pixel text-xs uppercase tracking-widest hover:bg-green-400 transition-all shadow-[0_0_30px_rgba(74,222,128,0.35)] hover:shadow-[0_0_40px_rgba(74,222,128,0.55)]"
                >
                  <XI icon={Smartphone} size={16} />
                  УСТАНОВИТЬ ПРИЛОЖЕНИЕ
                </button>
                <p className="font-mono text-[10px] text-white/25 mt-4">Работает на Android, Windows, macOS, Linux</p>
              </div>
            ) : isYandex ? (
              /* Yandex Browser: manual steps */
              <div className="max-w-sm mx-auto p-6 rounded-2xl border border-white/10 bg-white/[0.03] text-center">
                <p className="font-pixel text-xs text-white/60 uppercase mb-5 tracking-wide">Установка в Яндекс Браузере</p>
                <div className="space-y-4 text-left">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 font-mono text-white/60 text-base leading-none">⋮</div>
                    <p className="font-mono text-xs text-white/60">Нажмите <span className="text-white">«⋮»</span> — меню браузера</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      <XI icon={Smartphone} size={15} className="text-white/50" />
                    </div>
                    <p className="font-mono text-xs text-white/60">Выберите <span className="text-white">«Добавить на главный экран»</span> или <span className="text-white">«Установить приложение»</span></p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center shrink-0">
                      <span className="font-pixel text-green-400 text-[10px]">NA</span>
                    </div>
                    <p className="font-mono text-xs text-white/60">Подтвердите — иконка <span className="text-white">NeoArchive</span> появится на рабочем столе</p>
                  </div>
                </div>
              </div>
            ) : (
              /* Chrome/Edge without prompt yet — address bar hint */
              <div className="max-w-sm mx-auto p-6 rounded-2xl border border-white/10 bg-white/[0.03] text-center">
                <p className="font-pixel text-xs text-white/60 uppercase mb-5 tracking-wide">Установка в Chrome / Edge</p>
                <div className="space-y-4 text-left">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 font-mono text-white/60 text-sm">↓</div>
                    <p className="font-mono text-xs text-white/60">Найдите иконку <span className="text-white">«Установить»</span> в правой части адресной строки</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 font-mono text-white/60 text-base leading-none">⋮</div>
                    <p className="font-mono text-xs text-white/60">Или откройте меню <span className="text-white">«⋮»</span> → <span className="text-white">«Установить NeoArchive»</span></p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      <XI icon={Smartphone} size={15} className="text-white/50" />
                    </div>
                    <p className="font-mono text-xs text-white/60">На Android: меню <span className="text-white">«⋮»</span> → <span className="text-white">«Добавить на главный экран»</span></p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─── FOOTER ─── */}
      <footer className="py-8 px-4 border-t border-white/5 bg-black">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-green-500 flex items-center justify-center">
              <span className="font-pixel text-black text-[10px] font-bold">NA</span>
            </div>
            <span className="font-pixel text-xs text-white/40 tracking-widest">NEO_ARCHIVE</span>
          </div>
          <span className="font-mono text-[10px] text-white/20">© {new Date().getFullYear()} NeoArchive. Все права защищены.</span>
        </div>
        <div className="max-w-4xl mx-auto mt-4 pt-4 border-t border-white/5 text-center">
          <span className="font-mono text-[10px] text-white/20">
            Самозанятый: Демидов Константин Андреевич · ИНН 615011868785
          </span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

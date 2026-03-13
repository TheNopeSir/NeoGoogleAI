import React, { useEffect, useState } from 'react';
import { Archive, ArrowLeftRight, Users, Sparkles, ArrowRight, ChevronDown } from 'lucide-react';
import MatrixRain from './MatrixRain';
import CRTOverlay from './CRTOverlay';
import SEO from './SEO';

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
  {
    icon: Sparkles,
    title: 'AI-оценка',
    desc: 'Gemini анализирует твои находки, предлагает категорию и описание автоматически.',
  },
];

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onRegister }) => {
  const [userCount, setUserCount] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Fade-in on mount
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(d => { if (d.users) setUserCount(d.users); })
      .catch(() => {});
  }, []);

  return (
    <div className={`min-h-screen bg-black text-white overflow-x-hidden transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <SEO title="NeoArchive — Цифровой архив коллекций" />

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 overflow-hidden">
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
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-30 animate-bounce z-10">
          <span className="text-[10px] font-mono uppercase tracking-widest">Узнать больше</span>
          <ChevronDown size={16} />
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="py-24 px-4 bg-zinc-950">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-pixel text-center text-xl tracking-widest text-white/80 mb-2 uppercase">Возможности</h2>
          <div className="w-16 h-0.5 bg-green-500 mx-auto mb-14" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
            ЗАРЕГИСТРИРОВАТЬСЯ <ArrowRight size={16} />
          </button>
          <button
            onClick={onLogin}
            className="text-[11px] font-mono text-white/40 hover:text-white/70 underline underline-offset-4 transition-colors"
          >
            Уже есть аккаунт? Войти
          </button>
        </div>
      </section>

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
      </footer>
    </div>
  );
};

export default LandingPage;

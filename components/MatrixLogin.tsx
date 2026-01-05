
import React, { useState, useEffect, useRef } from 'react';
import { Mail, Lock, UserPlus, User, AlertCircle, CheckSquare, Square, Send, Wand2, Eye, EyeOff, Terminal, RefreshCw } from 'lucide-react';
import { UserProfile } from '../types';
import * as db from '../services/storageService';

interface MatrixLoginProps {
  theme: 'dark' | 'light';
  onLogin: (user: UserProfile, remember: boolean) => void;
}

type AuthStep = 'ENTRY' | 'LOGIN' | 'REGISTER' | 'TELEGRAM' | 'RECOVERY';

interface TelegramUser { id: number; first_name: string; last_name?: string; username?: string; photo_url?: string; auth_date: number; hash: string; }
declare global { interface Window { onTelegramAuth: (user: TelegramUser) => void; } }

const MatrixLogin: React.FC<MatrixLoginProps> = ({ theme, onLogin }) => {
  const [step, setStep] = useState<AuthStep>('ENTRY');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  // Tagline removed from state for registration as it's not required
  const [rememberMe, setRememberMe] = useState(true);
  const telegramWrapperRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [showRecoverOption, setShowRecoverOption] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === 'true') { setInfoMessage("ПОЧТА ПОДТВЕРЖДЕНА"); setStep('LOGIN'); window.history.replaceState({}, document.title, window.location.pathname + window.location.hash); }
  }, []);

  useEffect(() => {
      if (step === 'TELEGRAM' && telegramWrapperRef.current) {
          window.onTelegramAuth = async (user: TelegramUser) => {
              setIsLoading(true);
              try { const userProfile = await db.loginViaTelegram(user); onLogin(userProfile, true); } 
              catch (err: any) { setError("LOGIN FAILED: " + (err.message || "Server Error")); setIsLoading(false); }
          };
          telegramWrapperRef.current.innerHTML = '';
          const script = document.createElement('script');
          script.src = "https://telegram.org/js/telegram-widget.js?22";
          script.async = true;
          script.setAttribute('data-telegram-login', 'TrusterStoryBot');
          script.setAttribute('data-size', 'large');
          script.setAttribute('data-radius', '10');
          script.setAttribute('data-onauth', 'onTelegramAuth(user)');
          script.setAttribute('data-request-access', 'write');
          telegramWrapperRef.current.appendChild(script);
      }
  }, [step]);

  const resetForm = () => { setError(''); setInfoMessage(''); setShowRecoverOption(false); setPassword(''); setUsername(''); setShowPassword(false); };
  const generateSecurePassword = () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
      let pass = "";
      for(let i=0; i<16; i++) { pass += chars.charAt(Math.floor(Math.random() * chars.length)); }
      setPassword(pass); setShowPassword(true);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
      e.preventDefault(); setIsLoading(true); setError(''); setInfoMessage('');
      try { const user = await db.loginUser(email.toLowerCase(), password); onLogin(user, rememberMe); } 
      catch (err: any) { setError(err.message || 'ОШИБКА АВТОРИЗАЦИИ'); setIsLoading(false); }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !username) { setError('ЗАПОЛНИТЕ ВСЕ ПОЛЯ'); return; }
    
    setIsLoading(true); setError(''); setShowRecoverOption(false);
    
    // Always lowercase email for consistency
    const cleanEmail = email.toLowerCase();
    const defaultTagline = 'Новый пользователь';

    try { 
        await db.registerUser(username, password, defaultTagline, cleanEmail); 
        setInfoMessage('ПИСЬМО ОТПРАВЛЕНО'); 
        setStep('LOGIN'); 
        setPassword(''); 
    } 
    catch (err: any) { 
        setError(err.message || "ОШИБКА РЕГИСТРАЦИИ"); 
        if (err.message?.includes('заняты')) { setShowRecoverOption(true); setInfoMessage("Email или Никнейм занят"); } 
    } 
    finally { setIsLoading(false); }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('УКАЖИТЕ EMAIL'); return; }
    setIsLoading(true); setError(''); setInfoMessage('');
    try {
        await db.recoverPassword(email.toLowerCase());
        setInfoMessage('НОВЫЙ ПАРОЛЬ ОТПРАВЛЕН НА EMAIL');
        setStep('LOGIN');
    } catch (err: any) {
        setError(err.message || "ОШИБКА ВОССТАНОВЛЕНИЯ");
    } finally {
        setIsLoading(false);
    }
  };

  const renderContent = () => {
    if (step === 'ENTRY') {
        return (
            <div className="flex flex-col gap-4 w-full">
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => { setStep('LOGIN'); resetForm(); }} className="py-8 border font-pixel text-xs uppercase tracking-widest hover:bg-white hover:text-black transition-colors flex flex-col items-center gap-2 border-white/20 text-white/80">
                        <Terminal size={24} /><span>ВХОД</span>
                    </button>
                    <button onClick={() => { setStep('REGISTER'); resetForm(); }} className="py-8 border font-pixel text-xs uppercase tracking-widest hover:bg-white hover:text-black transition-colors flex flex-col items-center gap-2 border-white/20 text-white/80">
                        <UserPlus size={24} /><span>РЕГ</span>
                    </button>
                </div>
                <button onClick={() => { setStep('TELEGRAM'); resetForm(); }} className="py-4 border font-pixel text-[10px] uppercase tracking-widest hover:bg-[#0088cc] hover:text-white hover:border-[#0088cc] transition-colors flex items-center justify-center gap-2 border-white/20 text-white/60">
                    <Send size={16} /> TELEGRAM
                </button>
            </div>
        )
    }

    if (step === 'TELEGRAM') {
        return (
            <div className="flex flex-col gap-4 w-full">
                 <div className="flex justify-center my-4 min-h-[80px]" ref={telegramWrapperRef}>
                     {isLoading ? <div className="animate-pulse text-[10px] font-mono text-white/50">...</div> : <div className="animate-pulse text-[10px] font-mono text-white/50">...</div>}
                 </div>
                 {error && <div className="text-red-500 text-[10px] font-mono text-center">{error}</div>}
                 <button type="button" onClick={() => { setStep('ENTRY'); resetForm(); }} className="text-[10px] font-mono opacity-50 hover:underline text-center text-white">ОТМЕНА</button>
            </div>
        );
    }

    if (step === 'LOGIN') {
        return (
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4 w-full">
                 {infoMessage && <div className="text-green-500 text-[10px] font-mono text-center mb-2">{infoMessage}</div>}
                 <div className="flex items-center gap-2 border-b p-3 border-white/20">
                    <User size={16} className="text-white/50" /><input value={email} onChange={e => setEmail(e.target.value)} type="text" className="bg-transparent w-full focus:outline-none font-mono text-sm text-white placeholder-white/30" placeholder="EMAIL" required />
                 </div>
                 <div className="flex items-center gap-2 border-b p-3 border-white/20">
                    <Lock size={16} className="text-white/50" />
                    <input value={password} onChange={e => setPassword(e.target.value)} type={showPassword ? "text" : "password"} className="bg-transparent w-full focus:outline-none font-mono text-sm text-white placeholder-white/30" placeholder="******" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="opacity-50 hover:opacity-100 focus:outline-none text-white">{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
                 </div>
                 <div className="flex justify-between items-center px-1">
                     <div onClick={() => setRememberMe(!rememberMe)} className="flex items-center gap-2 cursor-pointer opacity-70 hover:opacity-100 select-none text-white">
                         {rememberMe ? <CheckSquare size={14} /> : <Square size={14} />}<span className="text-[10px] font-mono uppercase">СОХРАНИТЬ</span>
                     </div>
                     <button type="button" onClick={() => { setStep('RECOVERY'); setError(''); }} className="text-[10px] font-mono text-white/50 hover:text-white hover:underline uppercase">Забыли пароль?</button>
                 </div>
                 {error && <div className="flex items-center gap-2 text-red-500 text-[10px] font-mono justify-center"><AlertCircle size={14}/> {error}</div>}
                 <button type="submit" disabled={isLoading} className="mt-2 py-3 font-bold font-pixel text-xs uppercase bg-white text-black hover:bg-gray-200">{isLoading ? '...' : 'ВОЙТИ'}</button>
                 <button type="button" onClick={() => { setStep('ENTRY'); resetForm(); }} className="text-[10px] font-mono opacity-50 hover:underline text-center text-white">НАЗАД</button>
            </form>
        )
    }

    if (step === 'REGISTER') {
        return (
            <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4 w-full">
                <div className="flex items-center gap-2 border-b p-2 border-white/20"><Mail size={16} className="text-white/50"/><input value={email} onChange={e => setEmail(e.target.value)} type="email" className="bg-transparent w-full focus:outline-none font-mono text-sm text-white placeholder-white/30" placeholder="EMAIL" required /></div>
                
                <div className="flex items-center gap-2 border-b p-2 border-white/20"><User size={16} className="text-white/50"/><input value={username} onChange={e => setUsername(e.target.value)} className="bg-transparent w-full focus:outline-none font-mono text-sm text-white placeholder-white/30" placeholder="NICKNAME" required /></div>

                <div className="flex items-center gap-2 border-b p-2 border-white/20">
                    <Lock size={16} className="text-white/50" />
                    <input value={password} onChange={e => setPassword(e.target.value)} type={showPassword ? "text" : "password"} className="bg-transparent w-full focus:outline-none font-mono text-sm text-white placeholder-white/30" placeholder="PASS" required />
                    <button type="button" onClick={generateSecurePassword} className="opacity-50 hover:opacity-100 text-white"><Wand2 size={14} /></button>
                </div>
                
                {error && <div className="text-red-500 text-[10px] font-mono text-center">{error}</div>}
                
                <button type="submit" disabled={isLoading} className="mt-2 py-3 font-bold font-pixel text-xs uppercase bg-white text-black hover:bg-gray-200">{isLoading ? '...' : 'СОЗДАТЬ'}</button>
                <div className="flex justify-between items-center">
                    <button type="button" onClick={() => { setStep('ENTRY'); resetForm(); }} className="text-[10px] font-mono opacity-50 hover:underline text-white">НАЗАД</button>
                    {showRecoverOption && (
                        <button type="button" onClick={() => setStep('RECOVERY')} className="text-[10px] font-mono text-yellow-500 hover:underline">ВОССТАНОВИТЬ?</button>
                    )}
                </div>
            </form>
        )
    }

    if (step === 'RECOVERY') {
        return (
            <form onSubmit={handleRecoverySubmit} className="flex flex-col gap-4 w-full animate-in fade-in">
                <h3 className="text-white font-pixel text-xs text-center mb-2">ВОССТАНОВЛЕНИЕ ДОСТУПА</h3>
                <div className="flex items-center gap-2 border-b p-3 border-white/20">
                   <Mail size={16} className="text-white/50" />
                   <input value={email} onChange={e => setEmail(e.target.value)} type="email" className="bg-transparent w-full focus:outline-none font-mono text-sm text-white placeholder-white/30" placeholder="ВАШ EMAIL" required />
                </div>
                <p className="text-[10px] font-mono text-white/50 text-center">Система сгенерирует новый пароль и отправит его на указанную почту.</p>
                
                {error && <div className="flex items-center gap-2 text-red-500 text-[10px] font-mono justify-center"><AlertCircle size={14}/> {error}</div>}
                
                <button type="submit" disabled={isLoading} className="mt-2 py-3 font-bold font-pixel text-xs uppercase bg-white text-black hover:bg-gray-200 flex items-center justify-center gap-2">
                    {isLoading ? '...' : <><RefreshCw size={14}/> СБРОСИТЬ</>}
                </button>
                <button type="button" onClick={() => { setStep('LOGIN'); resetForm(); }} className="text-[10px] font-mono opacity-50 hover:underline text-center text-white">ОТМЕНА</button>
            </form>
        )
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-black">
      <div className="w-full max-w-sm p-8 bg-black border border-white/10 rounded-lg shadow-[0_0_30px_rgba(0,0,0,0.5)]">
         {renderContent()}
      </div>
    </div>
  );
};

export default MatrixLogin;

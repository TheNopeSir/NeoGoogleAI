
import React, { useState, useEffect, useRef } from 'react';
import { Mail, Lock, UserPlus, User, AlertCircle, CheckSquare, Square, Send, Wand2, Eye, EyeOff, Terminal, RefreshCw, Activity, ArrowRight, Check } from 'lucide-react';
import { UserProfile } from '../types';
import * as db from '../services/storageService';

interface MatrixLoginProps {
  theme: 'dark' | 'light';
  onLogin: (user: UserProfile, remember: boolean) => void;
  initialCode?: string | null;
  initialType?: 'REGISTER' | 'RESET' | null;
}

type AuthStep = 'ENTRY' | 'LOGIN' | 'REGISTER' | 'TELEGRAM' | 'RECOVERY' | 'VERIFYING' | 'NEW_PASSWORD';

interface TelegramUser { id: number; first_name: string; last_name?: string; username?: string; photo_url?: string; auth_date: number; hash: string; }
declare global { interface Window { onTelegramAuth: (user: TelegramUser) => void; } }

const MatrixLogin: React.FC<MatrixLoginProps> = ({ theme, onLogin, initialCode, initialType }) => {
  const [step, setStep] = useState<AuthStep>('ENTRY');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const telegramWrapperRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [showRecoverOption, setShowRecoverOption] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userCount, setUserCount] = useState<number | null>(null);

  // New Password State
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    // Check initial params for verification flow
    if (initialCode && initialType) {
        if (initialType === 'REGISTER') {
            handleVerifyRegistration(initialCode);
        } else if (initialType === 'RESET') {
            setStep('NEW_PASSWORD');
        }
    } else {
        // Only fetch stats if not verifying
        fetch('/api/health')
            .then(res => {
                if (!res.ok) throw new Error("Health check failed");
                return res.json();
            })
            .then(data => {
                if (data && typeof data.totalUsers === 'number') setUserCount(data.totalUsers);
            })
            .catch(() => {
                // Silently ignore errors to avoid console noise for users
                // console.debug("Server stats unavailable");
            });
    }
  }, [initialCode, initialType]);

  const handleVerifyRegistration = async (code: string) => {
      setStep('VERIFYING');
      setIsLoading(true);
      try {
          const response = await fetch('/api/auth/verify-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code })
          });
          const data = await response.json();
          if (data.error) throw new Error(data.error);
          
          setInfoMessage("АККАУНТ УСПЕШНО АКТИВИРОВАН");
          setStep('LOGIN');
          // Pre-fill if username available in data? No, keep generic login.
      } catch (err: any) {
          setError("ОШИБКА АКТИВАЦИИ: " + err.message);
          setStep('ENTRY');
      } finally {
          setIsLoading(false);
      }
  };

  const handleCompleteReset = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!initialCode || !newPassword) return;
      setIsLoading(true);
      try {
          const response = await fetch('/api/auth/complete-reset', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code: initialCode, newPassword })
          });
          const data = await response.json();
          if (data.error) throw new Error(data.error);
          
          setInfoMessage("ПАРОЛЬ ИЗМЕНЕН. ВОЙДИТЕ.");
          setStep('LOGIN');
      } catch (err: any) {
          setError(err.message);
      } finally {
          setIsLoading(false);
      }
  };

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
      if (step === 'NEW_PASSWORD') setNewPassword(pass);
      else setPassword(pass); 
      setShowPassword(true);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
      e.preventDefault(); setIsLoading(true); setError(''); setInfoMessage('');
      const cleanEmail = email.trim();
      const cleanPassword = password.trim();
      try { 
          const user = await db.loginUser(cleanEmail, cleanPassword); 
          onLogin(user, rememberMe); 
      } 
      catch (err: any) { 
          setError(err.message || 'ОШИБКА АВТОРИЗАЦИИ'); 
          setIsLoading(false); 
      }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !username) { setError('ЗАПОЛНИТЕ ВСЕ ПОЛЯ'); return; }
    
    setIsLoading(true); setError(''); setShowRecoverOption(false);
    
    // Trim everything
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();
    const defaultTagline = 'Новый пользователь';

    try { 
        await db.registerUser(cleanUsername, cleanPassword, defaultTagline, cleanEmail); 
        setInfoMessage('ССЫЛКА ОТПРАВЛЕНА НА EMAIL. ПРОВЕРЬТЕ ПОЧТУ.'); 
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
        await db.recoverPassword(email.trim().toLowerCase());
        setInfoMessage('ИНСТРУКЦИИ ОТПРАВЛЕНЫ НА EMAIL');
        setStep('LOGIN');
    } catch (err: any) {
        setError(err.message || "ОШИБКА ВОССТАНОВЛЕНИЯ");
    } finally {
        setIsLoading(false);
    }
  };

  const renderContent = () => {
    if (step === 'VERIFYING') {
        return (
            <div className="flex flex-col items-center justify-center gap-4 text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
                <div className="text-xs font-mono text-green-500">АКТИВАЦИЯ АККАУНТА...</div>
            </div>
        )
    }

    if (step === 'NEW_PASSWORD') {
        return (
            <form onSubmit={handleCompleteReset} className="flex flex-col gap-4 w-full">
                <h3 className="text-center text-white font-pixel text-xs mb-2">НОВЫЙ ПАРОЛЬ</h3>
                <div className="flex items-center gap-2 border-b p-3 border-white/20">
                    <Lock size={16} className="text-white/50" />
                    <input value={newPassword} onChange={e => setNewPassword(e.target.value)} type={showPassword ? "text" : "password"} className="bg-transparent w-full focus:outline-none font-mono text-sm text-white placeholder-white/30" placeholder="NEW PASSWORD" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="opacity-50 hover:opacity-100 focus:outline-none text-white">{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
                    <button type="button" onClick={generateSecurePassword} className="opacity-50 hover:opacity-100 text-white"><Wand2 size={14} /></button>
                </div>
                {error && <div className="flex items-center gap-2 text-red-500 text-[10px] font-mono justify-center"><AlertCircle size={14}/> {error}</div>}
                <button type="submit" disabled={isLoading} className="mt-2 py-3 font-bold font-pixel text-xs uppercase bg-white text-black hover:bg-gray-200 flex items-center justify-center gap-2">{isLoading ? '...' : <><Check size={16}/> СОХРАНИТЬ</>}</button>
            </form>
        )
    }

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
                
                {userCount !== null && (
                    <div className="mt-4 flex items-center justify-center gap-2 opacity-50">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_#22c55e]"></div>
                        <span className="text-[10px] font-mono text-green-500 tracking-[0.2em]">
                            ACTIVE_NODES: {userCount.toLocaleString()}
                        </span>
                    </div>
                )}
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
                 {infoMessage && <div className="text-green-500 text-[10px] font-mono text-center mb-2 border border-green-500/50 p-2 bg-green-900/20">{infoMessage}</div>}
                 <div className="flex items-center gap-2 border-b p-3 border-white/20">
                    <User size={16} className="text-white/50" /><input value={email} onChange={e => setEmail(e.target.value)} type="text" className="bg-transparent w-full focus:outline-none font-mono text-sm text-white placeholder-white/30" placeholder="LOGIN / EMAIL" required />
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
                <p className="text-[10px] font-mono text-white/50 text-center">Ссылка для сброса будет отправлена на Email.</p>
                
                {error && <div className="flex items-center gap-2 text-red-500 text-[10px] font-mono justify-center"><AlertCircle size={14}/> {error}</div>}
                
                <button type="submit" disabled={isLoading} className="mt-2 py-3 font-bold font-pixel text-xs uppercase bg-white text-black hover:bg-gray-200 flex items-center justify-center gap-2">
                    {isLoading ? '...' : <><RefreshCw size={14}/> ОТПРАВИТЬ</>}
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

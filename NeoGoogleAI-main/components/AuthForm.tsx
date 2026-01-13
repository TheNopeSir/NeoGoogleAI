
import React, { useState } from 'react';
import { Terminal, Lock, User, ArrowRight, CheckSquare, Square, Github, Chrome, Gamepad2, Mail } from 'lucide-react';
import { UserProfile } from '../types';
import * as db from '../services/storageService';

interface AuthFormProps {
  theme: 'dark' | 'light';
  onLogin: (user: UserProfile, remember: boolean) => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ theme, onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [tagline, setTagline] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('ЗАПОЛНИТЕ ВСЕ ПОЛЯ');
      return;
    }

    if (isRegister) {
        if (!tagline) {
             setError('УКАЖИТЕ СТАТУС');
             return;
        }
        if (!email) {
             setError('УКАЖИТЕ EMAIL');
             return;
        }
    }

    setIsLoading(true);

    try {
        let user: UserProfile;
        
        if (isRegister) {
            user = await db.registerUser(username, password, tagline, email);
        } else {
            user = await db.loginUser(username, password);
        }
        
        onLogin(user, rememberMe);
        
    } catch (err: any) {
        setError(err.message || "ОШИБКА АВТОРИЗАЦИИ");
    } finally {
        setIsLoading(false);
    }
  };

  const handleSocialRedirect = (provider: string) => {
      // Redirect to our backend auth routes
      if (provider === 'Google') {
          window.location.href = '/api/auth/google';
      } else if (provider === 'Yandex') {
          window.location.href = '/api/auth/yandex';
      } else {
          // Keep simulation for others not implemented yet
          alert('Протокол еще не интегрирован в матрицу. Используйте Google или Yandex.');
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-20">
      <div className={`w-full max-w-md border-2 p-8 rounded-lg shadow-2xl relative ${
        theme === 'dark' 
          ? 'bg-black/80 border-dark-primary shadow-[0_0_30px_rgba(74,222,128,0.2)]' 
          : 'bg-white/90 border-light-accent shadow-xl'
      }`}>
        <div className="flex justify-center mb-8">
           <div className={`p-4 rounded-full border-2 ${theme === 'dark' ? 'border-dark-primary text-dark-primary' : 'border-light-accent text-light-accent'}`}>
             <Terminal size={32} />
           </div>
        </div>

        <h2 className={`text-2xl font-pixel text-center mb-2 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
          {isRegister ? 'НОВАЯ ЛИЧНОСТЬ' : 'ВХОД В СИСТЕМУ'}
        </h2>
        
        <p className={`text-center font-mono text-xs mb-8 opacity-70 ${theme === 'dark' ? 'text-dark-dim' : 'text-light-dim'}`}>
          {isRegister ? 'СОЗДАНИЕ ЗАПИСИ В БД...' : 'ДОСТУП К АРХИВУ...'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 font-mono">
          <div className="space-y-1">
            <label className="text-xs font-bold ml-1 uppercase opacity-70">Имя пользователя</label>
            <div className={`flex items-center border-b-2 px-2 py-2 ${theme === 'dark' ? 'border-dark-dim focus-within:border-dark-primary' : 'border-light-dim focus-within:border-light-accent'}`}>
              <User size={16} className="opacity-50 mr-2" />
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="bg-transparent w-full focus:outline-none"
                placeholder="USER_ID"
              />
            </div>
          </div>

          {isRegister && (
            <>
            <div className="space-y-1 animate-in slide-in-from-top-2 fade-in">
              <label className="text-xs font-bold ml-1 uppercase opacity-70">Email</label>
              <div className={`flex items-center border-b-2 px-2 py-2 ${theme === 'dark' ? 'border-dark-dim focus-within:border-dark-primary' : 'border-light-dim focus-within:border-light-accent'}`}>
                <Mail size={16} className="opacity-50 mr-2" />
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="bg-transparent w-full focus:outline-none"
                  placeholder="EMAIL"
                />
              </div>
            </div>

            <div className="space-y-1 animate-in slide-in-from-top-2 fade-in">
              <label className="text-xs font-bold ml-1 uppercase opacity-70">Статус / Слоган</label>
              <div className={`flex items-center border-b-2 px-2 py-2 ${theme === 'dark' ? 'border-dark-dim focus-within:border-dark-primary' : 'border-light-dim focus:border-light-accent'}`}>
                <Terminal size={16} className="opacity-50 mr-2" />
                <input 
                  type="text" 
                  value={tagline}
                  onChange={e => setTagline(e.target.value)}
                  className="bg-transparent w-full focus:outline-none"
                  placeholder="ВВЕДИТЕ СТАТУС"
                />
              </div>
            </div>
            </>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold ml-1 uppercase opacity-70">Пароль</label>
            <div className={`flex items-center border-b-2 px-2 py-2 ${theme === 'dark' ? 'border-dark-dim focus-within:border-dark-primary' : 'border-light-dim focus:border-light-accent'}`}>
              <Lock size={16} className="opacity-50 mr-2" />
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="bg-transparent w-full focus:outline-none"
                placeholder="******"
              />
            </div>
          </div>
          
          {!isRegister && (
            <div 
                className={`flex items-center gap-2 text-xs font-bold cursor-pointer opacity-80 hover:opacity-100 ${theme === 'dark' ? 'text-dark-primary' : 'text-light-accent'}`}
                onClick={() => setRememberMe(!rememberMe)}
            >
                {rememberMe ? <CheckSquare size={14} /> : <Square size={14} />}
                <span>ЗАПОМНИТЬ МЕНЯ</span>
            </div>
          )}

          {error && (
            <div className="text-red-500 text-xs font-bold text-center border border-red-500 p-2 bg-red-500/10 animate-pulse">
              [ОШИБКА]: {error}
            </div>
          )}

          <button 
            disabled={isLoading}
            className={`w-full py-4 mt-4 font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
              theme === 'dark' 
                ? 'bg-dark-primary text-black hover:shadow-[0_0_15px_rgba(74,222,128,0.5)]' 
                : 'bg-light-accent text-white hover:bg-emerald-700'
            }`}
          >
            {isLoading ? 'СВЯЗЬ С СЕРВЕРОМ...' : (isRegister ? 'СОЗДАТЬ' : 'ВОЙТИ')} 
            {!isLoading && <ArrowRight size={16} />}
          </button>
        </form>

        {/* Social Login Section */}
        <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
                <div className={`w-full border-t ${theme === 'dark' ? 'border-dark-dim' : 'border-light-dim'}`}></div>
            </div>
            <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
                <span className={`px-2 ${theme === 'dark' ? 'bg-black text-dark-dim' : 'bg-white text-light-dim'}`}>
                    Или войти через
                </span>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
            <button 
                onClick={() => handleSocialRedirect('Google')}
                className={`flex flex-col items-center justify-center p-3 border rounded transition-all hover:scale-105 active:scale-95 gap-2 ${
                   theme === 'dark' ? 'border-dark-dim hover:border-dark-primary hover:bg-white/5' : 'border-light-dim hover:border-light-accent hover:bg-gray-50'
                }`}
            >
                <Chrome size={20} />
                <span className="text-[9px] font-bold uppercase">Google</span>
            </button>

            <button 
                onClick={() => handleSocialRedirect('Yandex')}
                className={`flex flex-col items-center justify-center p-3 border rounded transition-all hover:scale-105 active:scale-95 gap-2 ${
                   theme === 'dark' ? 'border-dark-dim hover:border-red-500 hover:text-red-500 hover:bg-white/5' : 'border-light-dim hover:border-red-500 hover:text-red-500 hover:bg-gray-50'
                }`}
            >
                 <span className="font-serif font-bold text-xl leading-none">Я</span>
                <span className="text-[9px] font-bold uppercase">Yandex</span>
            </button>

            <button 
                onClick={() => handleSocialRedirect('GitHub')}
                className={`flex flex-col items-center justify-center p-3 border rounded transition-all hover:scale-105 active:scale-95 gap-2 opacity-50 cursor-not-allowed ${
                   theme === 'dark' ? 'border-dark-dim' : 'border-light-dim'
                }`}
                title="В разработке"
            >
                 <Github size={20} />
                <span className="text-[9px] font-bold uppercase">Github</span>
            </button>
            
            <button 
                onClick={() => handleSocialRedirect('Discord')}
                className={`flex flex-col items-center justify-center p-3 border rounded transition-all hover:scale-105 active:scale-95 gap-2 opacity-50 cursor-not-allowed ${
                   theme === 'dark' ? 'border-dark-dim' : 'border-light-dim'
                }`}
                title="В разработке"
            >
                 <Gamepad2 size={20} />
                <span className="text-[9px] font-bold uppercase">Discord</span>
            </button>
        </div>

        <div className="mt-6 text-center">
          <button 
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
            className={`text-xs underline hover:no-underline ${theme === 'dark' ? 'text-dark-dim hover:text-white' : 'text-light-dim hover:text-black'}`}
          >
            {isRegister ? 'УЖЕ ЕСТЬ АККАУНТ? ВОЙТИ' : 'НЕТ АККАУНТА? РЕГИСТРАЦИЯ'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;

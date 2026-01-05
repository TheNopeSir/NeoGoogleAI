
import React, { useState, useRef } from 'react';
import { ArrowLeft, Save, Search, Camera, Flame, Star, Circle, Crown } from 'lucide-react';
import { DefaultCategory, WISHLIST_PRIORITY_CONFIG } from '../constants';
import { fileToBase64 } from '../services/storageService';
import { WishlistItem, WishlistPriority } from '../types';

interface CreateWishlistItemViewProps {
  theme: 'dark' | 'light' | 'xp' | 'winamp';
  onBack: () => void;
  onSave: (item: any) => void;
}

const CreateWishlistItemView: React.FC<CreateWishlistItemViewProps> = ({ theme, onBack, onSave }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>(DefaultCategory.MISC);
  const [priority, setPriority] = useState<WishlistPriority>('MEDIUM');
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const b64 = await fileToBase64(e.target.files[0]);
      setImage(b64);
    }
  };

  const handleSubmit = () => {
    if (!title.trim()) return alert("Введите название того, что ищете");
    onSave({
      id: crypto.randomUUID(),
      title,
      category,
      priority,
      notes,
      referenceImageUrl: image,
      timestamp: new Date().toISOString()
    });
  };

  const isWinamp = theme === 'winamp';

  return (
    <div className={`max-w-xl mx-auto space-y-8 animate-in fade-in pb-32 ${isWinamp ? 'font-mono text-gray-300' : ''}`}>
      <div className="flex items-center justify-between border-b border-dashed border-white/10 pb-4">
        <button onClick={onBack} className={`flex items-center gap-2 font-pixel text-[10px] opacity-70 hover:opacity-100 uppercase tracking-widest ${isWinamp ? 'text-[#00ff00]' : ''}`}>
          <ArrowLeft size={14} /> ОТМЕНА
        </button>
        <h2 className={`font-pixel text-lg flex items-center gap-2 ${isWinamp ? 'text-[#00ff00]' : ''}`}><Search size={18} /> НОВОЕ ЖЕЛАНИЕ</h2>
      </div>

      <div className="space-y-6">
        
        {/* Image Reference */}
        <div 
            onClick={() => fileInputRef.current?.click()}
            className={`aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group ${isWinamp ? 'border-[#505050] bg-[#191919] text-[#00ff00]' : theme === 'dark' ? 'border-white/10 hover:border-purple-500/50 bg-white/5' : 'border-black/10 hover:border-black/30'}`}
        >
            {image ? (
                <>
                    <img src={image} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-30 transition-opacity" />
                    <div className="z-10 text-xs font-pixel uppercase tracking-widest bg-black/50 px-3 py-1 rounded">Изменить референс</div>
                </>
            ) : (
                <>
                    <Camera size={32} className="opacity-50 mb-2" />
                    <span className="text-[10px] font-pixel opacity-50">ДОБАВИТЬ РЕФЕРЕНС (ФОТО)</span>
                </>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
        </div>

        {/* Inputs */}
        <div className="space-y-4">
            <div>
                <label className="text-[10px] font-pixel opacity-50 uppercase tracking-widest mb-2 block">Что вы ищете?</label>
                <input 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    className={`w-full bg-black/30 border border-white/10 rounded-xl px-5 py-4 font-mono text-sm focus:border-purple-500 outline-none transition-colors ${isWinamp ? 'text-[#00ff00] placeholder-gray-600' : ''}`}
                    placeholder="Название консоли, игры, гаджета..."
                    autoFocus
                />
            </div>

            <div>
                <label className="text-[10px] font-pixel opacity-50 uppercase tracking-widest mb-2 block">Категория</label>
                <select 
                    value={category} 
                    onChange={e => setCategory(e.target.value)}
                    className={`w-full bg-black/30 border border-white/10 rounded-xl px-4 py-4 font-mono text-sm focus:border-purple-500 outline-none appearance-none ${isWinamp ? 'text-[#00ff00]' : ''}`}
                >
                    {Object.values(DefaultCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
            </div>

            <div>
                <label className="text-[10px] font-pixel opacity-50 uppercase tracking-widest mb-2 block">Приоритет поиска</label>
                <div className="grid grid-cols-2 gap-2">
                    {Object.entries(WISHLIST_PRIORITY_CONFIG).map(([key, config]) => (
                        <button
                            key={key}
                            onClick={() => setPriority(key as WishlistPriority)}
                            className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${priority === key ? config.color + ' bg-white/10' : 'border-white/10 opacity-50 hover:opacity-100'}`}
                        >
                            {React.createElement(config.icon, { size: 14 })}
                            <span className="text-[10px] font-bold uppercase">{config.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="text-[10px] font-pixel opacity-50 uppercase tracking-widest mb-2 block">Заметки (Бюджет, состояние, регион)</label>
                <textarea 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)} 
                    rows={4}
                    className={`w-full bg-black/30 border border-white/10 rounded-xl px-5 py-4 font-mono text-sm focus:border-purple-500 outline-none resize-none ${isWinamp ? 'text-[#00ff00] placeholder-gray-600' : ''}`}
                    placeholder="Ищу в состоянии Mint, бюджет до 5000р..."
                />
            </div>
        </div>

        <button 
            onClick={handleSubmit}
            className="w-full py-5 bg-purple-500 text-white rounded-2xl font-pixel text-sm tracking-[0.2em] hover:scale-[1.01] active:scale-95 transition-all shadow-[0_0_30px_rgba(168,85,247,0.4)] flex items-center justify-center gap-3 font-black"
        >
            <Search size={20} /> ДОБАВИТЬ В ВИШЛИСТ
        </button>

      </div>
    </div>
  );
};

export default CreateWishlistItemView;

import React, { useState, useRef } from 'react';
import { Camera, ArrowLeft, Save, X, Info, Archive, Video, RefreshCw, Link2, Award, DollarSign } from 'lucide-react';
import { DefaultCategory, CATEGORY_SUBCATEGORIES, CATEGORY_SPECS_TEMPLATES, TRADE_STATUS_CONFIG, CATEGORY_CONDITIONS } from '../constants';
import { fileToBase64 } from '../services/storageService';
import { Exhibit, TradeStatus } from '../types';

interface CreateArtifactViewProps {
  theme: 'dark' | 'light' | 'xp' | 'winamp';
  onBack: () => void;
  onSave: (artifact: any) => void;
  initialData?: Exhibit | null;
  userArtifacts?: Exhibit[]; // Needed for linking items
}

const CreateArtifactView: React.FC<CreateArtifactViewProps> = ({ theme, onBack, onSave, initialData, userArtifacts = [] }) => {
  const [images, setImages] = useState<string[]>(initialData?.imageUrls || []);
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [category, setCategory] = useState<string>(initialData?.category || DefaultCategory.PHONES);
  const [subcategory, setSubcategory] = useState(initialData?.subcategory || '');
  const [condition, setCondition] = useState(initialData?.condition || '');
  const [videoUrl, setVideoUrl] = useState(initialData?.videoUrl || '');
  const [specs, setSpecs] = useState<Record<string, string>>(initialData?.specs || {});
  const [tradeStatus, setTradeStatus] = useState<TradeStatus>(initialData?.tradeStatus || 'NONE');
  const [relatedIds, setRelatedIds] = useState<string[]>(initialData?.relatedIds || []);
  
  const [price, setPrice] = useState<string>(initialData?.price ? initialData.price.toString() : '');
  const [currency, setCurrency] = useState<'RUB' | 'USD' | 'ETH'>(initialData?.currency || 'RUB');
  const [tradeRequest, setTradeRequest] = useState(initialData?.tradeRequest || '');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newImages = [...images];
      for (let i = 0; i < e.target.files.length; i++) {
        const b64 = await fileToBase64(e.target.files[i]);
        newImages.push(b64);
      }
      setImages(newImages);
    }
  };

  const toggleRelated = (id: string) => {
      setRelatedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSubmit = (asDraft: boolean = false) => {
    if (!title) {
      alert("Укажите название артефакта");
      return;
    }
    onSave({
      id: initialData?.id,
      title,
      description,
      category,
      subcategory,
      condition,
      videoUrl,
      imageUrls: images.length > 0 ? images : ['https://placehold.co/600x400?text=NO+IMAGE'],
      specs,
      tradeStatus,
      price: price ? parseFloat(price) : undefined,
      currency,
      tradeRequest,
      relatedIds,
      isDraft: asDraft
    });
  };

  const isWinamp = theme === 'winamp';

  return (
    <div className={`max-w-4xl mx-auto space-y-8 animate-in fade-in pb-32 ${isWinamp ? 'font-mono text-gray-300' : ''}`}>
      <div className="flex items-center justify-between">
        <button onClick={onBack} className={`flex items-center gap-2 font-pixel text-[10px] opacity-70 hover:opacity-100 uppercase tracking-widest ${isWinamp ? 'text-[#00ff00]' : ''}`}>
          <ArrowLeft size={14} /> ОТМЕНА
        </button>
        <h2 className={`font-pixel text-lg ${isWinamp ? 'text-[#00ff00]' : ''}`}>{initialData ? 'РЕДАКТИРОВАНИЕ' : 'НОВЫЙ_АРТЕФАКТ'}</h2>
      </div>

      <div className="space-y-6">
        {/* Media Preview / Upload */}
        <div className="space-y-4">
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {images.map((img, idx) => (
              <div key={idx} className="relative w-32 h-32 md:w-40 md:h-40 flex-shrink-0 group">
                <img src={img} className="w-full h-full object-cover rounded-2xl border-2 border-white/10" />
                <button 
                  onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))} 
                  className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <button 
              onClick={() => fileInputRef.current?.click()}
              className={`w-32 h-32 md:w-40 md:h-40 flex-shrink-0 flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl transition-all ${isWinamp ? 'border-[#505050] bg-[#191919] text-[#00ff00]' : theme === 'dark' ? 'border-white/10 hover:border-green-500/50 bg-white/5' : 'border-black/10 hover:border-black/30'}`}
            >
              <Camera size={28} />
              <span className="text-[10px] font-pixel">ДОБАВИТЬ_ФОТО</span>
            </button>
            <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*" onChange={handleImageUpload} />
          </div>
          <p className="text-[10px] font-mono opacity-40 text-center md:text-left">
             Загрузите до 5 фотографий.
          </p>
        </div>

        {/* Basic Metadata */}
        <div className={`p-8 rounded-3xl border ${isWinamp ? 'bg-[#191919] border-[#505050]' : theme === 'dark' ? 'bg-dark-surface border-white/10' : 'bg-white border-black/10 shadow-xl'}`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-pixel opacity-50 uppercase tracking-widest mb-2 block">Название экспоната</label>
                <input 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  className={`w-full bg-black/30 border border-white/10 rounded-xl px-5 py-4 font-mono text-sm focus:border-green-500 outline-none transition-colors ${isWinamp ? 'text-[#00ff00] placeholder-gray-600' : ''}`} 
                  placeholder="Введите название или модель..."
                />
              </div>

              <div>
                  <label className="text-[10px] font-pixel opacity-50 uppercase tracking-widest mb-2 flex items-center gap-2"><Video size={12}/> Ссылка на видео (YouTube/Rutube)</label>
                  <input 
                      value={videoUrl} 
                      onChange={e => setVideoUrl(e.target.value)} 
                      className={`w-full bg-black/30 border border-white/10 rounded-xl px-5 py-4 font-mono text-sm focus:border-green-500 outline-none transition-colors ${isWinamp ? 'text-[#00ff00] placeholder-gray-600' : ''}`}
                      placeholder="https://youtube.com/watch?v=..."
                  />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-pixel opacity-50 uppercase tracking-widest mb-2 block">Категория</label>
                  <select 
                    value={category} 
                    onChange={e => { setCategory(e.target.value); setSubcategory(''); setCondition(''); }}
                    className={`w-full bg-black/30 border border-white/10 rounded-xl px-4 py-4 font-mono text-sm focus:border-green-500 outline-none appearance-none ${isWinamp ? 'text-[#00ff00]' : ''}`}
                  >
                    {Object.values(DefaultCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-pixel opacity-50 uppercase tracking-widest mb-2 block">Подкатегория</label>
                  <select 
                    value={subcategory} 
                    onChange={e => setSubcategory(e.target.value)}
                    className={`w-full bg-black/30 border border-white/10 rounded-xl px-4 py-4 font-mono text-sm focus:border-green-500 outline-none appearance-none disabled:opacity-30 ${isWinamp ? 'text-[#00ff00]' : ''}`}
                    disabled={!CATEGORY_SUBCATEGORIES[category]}
                  >
                    <option value="">Не выбрано</option>
                    {CATEGORY_SUBCATEGORIES[category]?.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                  </select>
                </div>
                <div>
                    <label className="text-[10px] font-pixel opacity-50 uppercase tracking-widest mb-2 flex items-center gap-2"><Award size={12}/> Грейд / Состояние</label>
                    <select 
                        value={condition} 
                        onChange={e => setCondition(e.target.value)}
                        className={`w-full bg-black/30 border border-white/10 rounded-xl px-4 py-4 font-mono text-sm focus:border-green-500 outline-none appearance-none ${isWinamp ? 'text-[#00ff00]' : ''}`}
                    >
                        <option value="">Не указано</option>
                        {(CATEGORY_CONDITIONS[category] || CATEGORY_CONDITIONS[DefaultCategory.MISC]).map(cond => (
                            <option key={cond} value={cond}>{cond}</option>
                        ))}
                    </select>
                </div>
              </div>

              {/* Trade Status Selection */}
              <div>
                  <label className="text-[10px] font-pixel opacity-50 uppercase tracking-widest mb-2 flex items-center gap-2"><RefreshCw size={12}/> Статус (Торговый терминал)</label>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                      {Object.entries(TRADE_STATUS_CONFIG).filter(([k]) => k !== 'NONE').map(([k, cfg]) => {
                          const statusKey = k as TradeStatus;
                          const isSelected = tradeStatus === statusKey;
                          return (
                              <button 
                                key={k}
                                onClick={() => setTradeStatus(isSelected ? 'NONE' : statusKey)}
                                className={`p-3 rounded-xl border text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2 ${isSelected ? cfg.color : 'border-white/10 opacity-50 hover:opacity-100 hover:border-white/30'}`}
                              >
                                  {cfg.icon && React.createElement(cfg.icon, { size: 14 })}
                                  {cfg.label}
                              </button>
                          );
                      })}
                  </div>

                  {tradeStatus === 'FOR_SALE' && (
                      <div className="flex gap-2 animate-in slide-in-from-top-2">
                          <input 
                              type="number"
                              value={price}
                              onChange={e => setPrice(e.target.value)}
                              placeholder="Цена..."
                              className={`flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm focus:border-green-500 outline-none ${isWinamp ? 'text-[#00ff00]' : ''}`}
                          />
                          <select 
                              value={currency}
                              onChange={e => setCurrency(e.target.value as any)}
                              className={`bg-black/30 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm focus:border-green-500 outline-none ${isWinamp ? 'text-[#00ff00]' : ''}`}
                          >
                              <option value="RUB">RUB</option>
                              <option value="USD">USD</option>
                              <option value="ETH">ETH</option>
                          </select>
                      </div>
                  )}

                  {tradeStatus === 'FOR_TRADE' && (
                      <div className="animate-in slide-in-from-top-2">
                          <input 
                              value={tradeRequest}
                              onChange={e => setTradeRequest(e.target.value)}
                              placeholder="Что хотите взамен? (например: Nintendo 3DS)"
                              className={`w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm focus:border-green-500 outline-none ${isWinamp ? 'text-[#00ff00]' : ''}`}
                          />
                      </div>
                  )}
              </div>

              <div>
                <label className="text-[10px] font-pixel opacity-50 uppercase tracking-widest mb-2 block">Описание и история</label>
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  rows={6}
                  className={`w-full bg-black/30 border border-white/10 rounded-xl px-5 py-4 font-mono text-sm focus:border-green-500 outline-none resize-none leading-relaxed ${isWinamp ? 'text-[#00ff00] placeholder-gray-600' : ''}`}
                  placeholder="Опишите артефакт, его происхождение и значение для коллекции..."
                />
              </div>
            </div>

            {/* Specifications & Linked Items */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-pixel text-[11px] opacity-70 tracking-widest uppercase flex items-center gap-2">
                  <Info size={14} className="text-blue-400" /> ТЕХНИЧЕСКИЙ_ПАСПОРТ
                </h3>
              </div>
              <div className={`grid grid-cols-1 gap-4 p-5 rounded-2xl border border-white/5 ${isWinamp ? 'bg-black' : 'bg-black/20'}`}>
                {(CATEGORY_SPECS_TEMPLATES[category] || ['Производитель', 'Год', 'Модель']).map(spec => (
                  <div key={spec}>
                    <label className="text-[9px] font-mono opacity-40 uppercase mb-1 block">{spec}</label>
                    <input 
                      value={specs[spec] || ''} 
                      onChange={e => setSpecs(prev => ({...prev, [spec]: e.target.value}))}
                      className={`w-full bg-black/20 border border-white/5 rounded-lg px-4 py-3 font-mono text-xs focus:border-green-500 outline-none transition-all ${isWinamp ? 'text-[#00ff00]' : ''}`}
                      placeholder={`Укажите ${spec}...`}
                    />
                  </div>
                ))}
              </div>

              {/* Linked Items Selection */}
              <div className="pt-4 border-t border-white/10">
                  <h3 className="font-pixel text-[11px] opacity-70 tracking-widest uppercase flex items-center gap-2 mb-4">
                      <Link2 size={14} className="text-yellow-400" /> СВЯЗАННЫЕ ПРЕДМЕТЫ
                  </h3>
                  <div className="max-h-48 overflow-y-auto grid grid-cols-1 gap-2 pr-2 custom-scrollbar">
                      {userArtifacts.filter(a => a.id !== initialData?.id).length === 0 && <div className="text-center opacity-30 text-[10px] py-4">Нет других предметов для связки</div>}
                      {userArtifacts.filter(a => a.id !== initialData?.id).map(art => (
                          <div 
                            key={art.id} 
                            onClick={() => toggleRelated(art.id)}
                            className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${relatedIds.includes(art.id) ? 'bg-green-500/10 border-green-500 text-green-500' : 'border-white/10 hover:bg-white/5'}`}
                          >
                              <div className="w-8 h-8 rounded bg-gray-800 overflow-hidden flex-shrink-0">
                                  <img src={art.imageUrls[0]} className="w-full h-full object-cover" />
                              </div>
                              <div className="text-xs truncate flex-1">{art.title}</div>
                              {relatedIds.includes(art.id) && <div className="w-2 h-2 rounded-full bg-green-500"></div>}
                          </div>
                      ))}
                  </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <button 
            onClick={() => handleSubmit(false)}
            className="flex-1 py-5 bg-green-500 text-black rounded-2xl font-pixel text-sm tracking-[0.2em] hover:scale-[1.01] active:scale-95 transition-all shadow-[0_0_30px_rgba(74,222,128,0.4)] flex items-center justify-center gap-3 font-black"
          >
            <Save size={20} /> СОХРАНИТЬ В АРХИВ
          </button>
          <button 
            onClick={() => handleSubmit(true)}
            className="px-8 py-5 bg-white/5 border-2 border-white/10 rounded-2xl font-pixel text-[10px] opacity-60 hover:opacity-100 hover:bg-white/10 transition-all flex items-center justify-center gap-3 tracking-widest"
          >
            <Archive size={20} /> В ЧЕРНОВИКИ
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateArtifactView;
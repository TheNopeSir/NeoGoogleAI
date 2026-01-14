
import React, { useState, useRef } from 'react';
import { Camera, ArrowLeft, Save, X, Info, Archive, Video, RefreshCw, Link2, Award, DollarSign, User, Star, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { DefaultCategory, CATEGORY_SUBCATEGORIES, CATEGORY_SPECS_TEMPLATES, TRADE_STATUS_CONFIG, CATEGORY_CONDITIONS } from '../constants';
import { fileToBase64 } from '../services/storageService';
import { Exhibit, TradeStatus, UserProfile } from '../types';
import { getImageUrl } from '../utils/imageUtils';

interface CreateArtifactViewProps {
  theme: 'dark' | 'light' | 'xp' | 'winamp';
  onBack: () => void;
  onSave: (artifact: any) => void;
  initialData?: Exhibit | null;
  userArtifacts?: Exhibit[]; // Needed for linking items
  currentUser?: UserProfile | null; // Current user info
  allUsers?: UserProfile[]; // All users for admin owner selection
}

const CreateArtifactView: React.FC<CreateArtifactViewProps> = ({ theme, onBack, onSave, initialData, userArtifacts = [], currentUser = null, allUsers = [] }) => {
  const [images, setImages] = useState<any[]>(initialData?.imageUrls || []);
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [category, setCategory] = useState<string>(initialData?.category || DefaultCategory.PHONES);
  const [subcategory, setSubcategory] = useState(initialData?.subcategory || '');
  const [condition, setCondition] = useState(initialData?.condition || '');
  const [videoUrl, setVideoUrl] = useState(initialData?.videoUrl || '');
  const [specs, setSpecs] = useState<Record<string, string>>(initialData?.specs || {});
  const [tradeStatus, setTradeStatus] = useState<TradeStatus>(initialData?.tradeStatus || 'NONE');
  const [relatedIds, setRelatedIds] = useState<string[]>(initialData?.relatedIds || []);
  const [adminOwner, setAdminOwner] = useState<string>(initialData?.owner || ''); // For admin to change owner

  const [price, setPrice] = useState<string>(initialData?.price ? initialData.price.toString() : '');
  const [currency, setCurrency] = useState<'RUB' | 'USD' | 'ETH'>(initialData?.currency || 'RUB');
  const [tradeRequest, setTradeRequest] = useState(initialData?.tradeRequest || '');

  const isAdmin = currentUser?.isAdmin === true;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newImages = [...images];
      for (let i = 0; i < e.target.files.length; i++) {
        // Here we can either upload immediately or just convert to base64 for preview
        // Since saving happens on submit, we use base64 for preview
        const b64 = await fileToBase64(e.target.files[i]);
        newImages.push(b64);
      }
      setImages(newImages);
    }
  };

  const toggleRelated = (id: string) => {
      setRelatedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    const newImages = [...images];
    const [movedImage] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedImage);
    setImages(newImages);
  };

  const setAsMainImage = (index: number) => {
    if (index === 0) return;
    const newImages = [...images];
    const [mainImage] = newImages.splice(index, 1);
    newImages.unshift(mainImage);
    setImages(newImages);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      moveImage(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
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
      // Images can be strings (base64/legacy urls) or objects (processed)
      // The server will handle uploading base64 strings to S3
      imageUrls: images.length > 0 ? images : ['https://placehold.co/600x400?text=NO+IMAGE'],
      specs,
      tradeStatus,
      price: price ? parseFloat(price) : undefined,
      currency,
      tradeRequest,
      relatedIds,
      isDraft: asDraft,
      adminOwner: isAdmin && adminOwner ? adminOwner : undefined // Pass admin-selected owner
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
              <div
                key={idx}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                className={`relative w-32 h-32 md:w-40 md:h-40 flex-shrink-0 group cursor-move transition-all ${
                  draggedIndex === idx ? 'opacity-50 scale-95' : ''
                } ${
                  dragOverIndex === idx && draggedIndex !== idx ? 'scale-105 ring-2 ring-green-500' : ''
                }`}
              >
                <img src={getImageUrl(img, 'thumbnail')} className="w-full h-full object-cover rounded-2xl border-2 border-white/10" />

                {/* Main Image Indicator */}
                {idx === 0 && (
                  <div className="absolute top-2 left-2 bg-yellow-500 text-black p-1.5 rounded-full shadow-lg">
                    <Star size={12} fill="currentColor" />
                  </div>
                )}

                {/* Drag Handle */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-black/70 text-white p-1 rounded">
                    <GripVertical size={14} />
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-b-2xl">
                  <div className="flex gap-1 justify-center">
                    {idx > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); moveImage(idx, idx - 1); }}
                        className="bg-white/20 hover:bg-white/30 text-white p-1 rounded transition-colors"
                        title="Переместить влево"
                      >
                        <ChevronLeft size={14} />
                      </button>
                    )}
                    {idx !== 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setAsMainImage(idx); }}
                        className="bg-yellow-500/80 hover:bg-yellow-500 text-black p-1 rounded transition-colors"
                        title="Сделать главным"
                      >
                        <Star size={14} />
                      </button>
                    )}
                    {idx < images.length - 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); moveImage(idx, idx + 1); }}
                        className="bg-white/20 hover:bg-white/30 text-white p-1 rounded transition-colors"
                        title="Переместить вправо"
                      >
                        <ChevronRight size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                  className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
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
             Загрузите до 5 фотографий. Перетаскивайте для изменения порядка. Первое фото — главное превью.
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

              {/* Admin Owner Selection */}
              {isAdmin && initialData?.id && (
                <div className="p-4 border border-yellow-500/30 bg-yellow-500/5 rounded-xl">
                  <label className="text-[10px] font-pixel opacity-70 uppercase tracking-widest mb-2 flex items-center gap-2 text-yellow-500">
                    <User size={12}/> Владелец артефакта (только для суперадминов)
                  </label>
                  <select
                    value={adminOwner}
                    onChange={e => setAdminOwner(e.target.value)}
                    className={`w-full bg-black/30 border border-yellow-500/30 rounded-xl px-4 py-4 font-mono text-sm focus:border-yellow-500 outline-none appearance-none ${isWinamp ? 'text-[#00ff00]' : ''}`}
                  >
                    <option value="">Выберите владельца...</option>
                    {allUsers.map(u => (
                      <option key={u.username} value={u.username}>{u.username}</option>
                    ))}
                  </select>
                  <p className="text-[9px] font-mono opacity-40 mt-2">
                    Изменение владельца позволяет передать артефакт другому пользователю
                  </p>
                </div>
              )}

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
                                  <img src={getImageUrl(art.imageUrls[0], 'thumbnail')} className="w-full h-full object-cover" />
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

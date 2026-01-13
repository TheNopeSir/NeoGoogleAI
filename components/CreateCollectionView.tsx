
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Save, Camera, CheckCircle2, Circle, X, Trash2 } from 'lucide-react';
import { Collection, Exhibit } from '../types';
import { fileToBase64 } from '../services/storageService';

interface CreateCollectionViewProps {
    theme: 'dark' | 'light' | 'xp' | 'winamp';
    userArtifacts: Exhibit[]; // Только артефакты текущего пользователя
    initialData?: Collection | null;
    onBack: () => void;
    onSave: (data: Partial<Collection>) => void;
    onDelete?: (id: string) => void;
}

const CreateCollectionView: React.FC<CreateCollectionViewProps> = ({ 
    theme, userArtifacts, initialData, onBack, onSave, onDelete 
}) => {
    const [title, setTitle] = useState(initialData?.title || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [coverImage, setCoverImage] = useState(initialData?.coverImage || '');
    const [selectedArtifactIds, setSelectedArtifactIds] = useState<string[]>(initialData?.exhibitIds || []);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const b64 = await fileToBase64(e.target.files[0]);
            setCoverImage(b64);
        }
    };

    const toggleArtifact = (id: string) => {
        setSelectedArtifactIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleSave = () => {
        if (!title.trim()) return alert("Введите название коллекции");
        if (!coverImage) return alert("Выберите обложку");
        
        onSave({
            id: initialData?.id,
            title,
            description,
            coverImage,
            exhibitIds: selectedArtifactIds,
            likes: initialData?.likes || 0,
            likedBy: initialData?.likedBy || []
        });
    };

    const isWinamp = theme === 'winamp';

    return (
        <div className={`max-w-4xl mx-auto space-y-8 animate-in fade-in pb-32 ${isWinamp ? 'font-mono text-gray-300' : ''}`}>
            <div className="flex items-center justify-between">
                <button onClick={onBack} className={`flex items-center gap-2 font-pixel text-[10px] opacity-70 hover:opacity-100 uppercase tracking-widest ${isWinamp ? 'text-[#00ff00]' : ''}`}>
                    <ArrowLeft size={14} /> ОТМЕНА
                </button>
                <div className="flex gap-4">
                     {initialData && onDelete && (
                        <button onClick={() => { if(confirm('Удалить коллекцию?')) onDelete(initialData.id); }} className="text-red-500 hover:text-red-400 flex items-center gap-2 font-pixel text-[10px] uppercase">
                            <Trash2 size={14} /> УДАЛИТЬ
                        </button>
                    )}
                    <h2 className={`font-pixel text-lg ${isWinamp ? 'text-[#00ff00]' : ''}`}>{initialData ? 'РЕДАКТИРОВАНИЕ' : 'НОВАЯ_КОЛЛЕКЦИЯ'}</h2>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    {/* Cover Image */}
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={`aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group ${isWinamp ? 'border-[#505050] bg-[#191919] text-[#00ff00]' : theme === 'dark' ? 'border-white/10 hover:border-green-500/50 bg-white/5' : 'border-black/10 hover:border-black/30'}`}
                    >
                        {coverImage ? (
                            <>
                                <img src={coverImage} className="absolute inset-0 w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <Camera size={32} className="text-white"/>
                                </div>
                            </>
                        ) : (
                            <>
                                <Camera size={32} className="opacity-50 mb-2" />
                                <span className="text-[10px] font-pixel opacity-50">ОБЛОЖКА</span>
                            </>
                        )}
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-pixel opacity-50 uppercase tracking-widest mb-2 block">Название</label>
                            <input 
                                value={title} 
                                onChange={e => setTitle(e.target.value)} 
                                className={`w-full bg-black/30 border border-white/10 rounded-xl px-5 py-4 font-mono text-sm focus:border-green-500 outline-none ${isWinamp ? 'text-[#00ff00] placeholder-gray-600' : ''}`}
                                placeholder="Например: Мои ретро консоли"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-pixel opacity-50 uppercase tracking-widest mb-2 block">Описание</label>
                            <textarea 
                                value={description} 
                                onChange={e => setDescription(e.target.value)} 
                                rows={4}
                                className={`w-full bg-black/30 border border-white/10 rounded-xl px-5 py-4 font-mono text-sm focus:border-green-500 outline-none resize-none ${isWinamp ? 'text-[#00ff00] placeholder-gray-600' : ''}`}
                                placeholder="О чем эта подборка..."
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                         <h3 className="font-pixel text-[11px] opacity-70 tracking-widest uppercase">ВЫБЕРИТЕ АРТЕФАКТЫ</h3>
                         <span className="text-xs font-mono">{selectedArtifactIds.length} выбрано</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {userArtifacts.length === 0 ? (
                            <div className="col-span-2 text-center py-10 opacity-50 font-mono text-xs border border-dashed border-white/10 rounded-xl">
                                У вас пока нет своих артефактов. <br/> Создайте их, чтобы добавить в коллекцию.
                            </div>
                        ) : (
                            userArtifacts.map(item => {
                                const isSelected = selectedArtifactIds.includes(item.id);
                                return (
                                    <div 
                                        key={item.id} 
                                        onClick={() => toggleArtifact(item.id)}
                                        className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${isSelected ? 'border-green-500 opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                    >
                                        <img src={item.imageUrls[0]} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-2">
                                            <span className="text-[9px] font-pixel text-white truncate">{item.title}</span>
                                        </div>
                                        <div className="absolute top-2 right-2">
                                            {isSelected ? <CheckCircle2 size={18} className="text-green-500 bg-black rounded-full" /> : <Circle size={18} className="text-white drop-shadow-md" />}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            <button 
                onClick={handleSave}
                className="w-full py-5 bg-green-500 text-black rounded-2xl font-pixel text-sm tracking-[0.2em] hover:scale-[1.01] active:scale-95 transition-all shadow-[0_0_30px_rgba(74,222,128,0.4)] flex items-center justify-center gap-3 font-black"
            >
                <Save size={20} /> СОХРАНИТЬ КОЛЛЕКЦИЮ
            </button>
        </div>
    );
};

export default CreateCollectionView;
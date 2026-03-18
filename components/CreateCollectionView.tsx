
import React, { useState, useRef } from 'react';
import { ArrowLeft, Save, Camera, CheckCircle2, Circle, Trash2, GripVertical, Globe, Lock, UserCheck, Tag, X } from 'lucide-react';
import { Collection, Exhibit, CollectionVisibility } from '../types';
import { fileToBase64 } from '../services/storageService';
import { getImageUrl } from '../utils/imageUtils';
import { COLLECTION_VISIBILITY_CONFIG } from '../constants';
import XI from './XI';

interface CreateCollectionViewProps {
    theme: 'dark' | 'light' | 'xp' | 'winamp';
    userArtifacts: Exhibit[];
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
    const [orderedIds, setOrderedIds] = useState<string[]>(initialData?.exhibitIds || []);
    const [visibility, setVisibility] = useState<CollectionVisibility>(initialData?.visibility || 'PUBLIC');
    const [tags, setTags] = useState<string[]>(initialData?.tags || []);
    const [tagInput, setTagInput] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const dragItem = useRef<number | null>(null);
    const dragOver = useRef<number | null>(null);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const b64 = await fileToBase64(e.target.files[0]);
            setCoverImage(b64);
        }
    };

    const toggleArtifact = (id: string) => {
        setOrderedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // Drag handlers for reordering selected artifacts
    const handleDragStart = (index: number) => { dragItem.current = index; };
    const handleDragEnter = (index: number) => { dragOver.current = index; };
    const handleDragEnd = () => {
        if (dragItem.current === null || dragOver.current === null) return;
        const reordered = [...orderedIds];
        const [moved] = reordered.splice(dragItem.current, 1);
        reordered.splice(dragOver.current, 0, moved);
        setOrderedIds(reordered);
        dragItem.current = null;
        dragOver.current = null;
    };

    const addTag = () => {
        const t = tagInput.trim().toUpperCase().slice(0, 20);
        if (!t || tags.includes(t) || tags.length >= 3) return;
        setTags([...tags, t]);
        setTagInput('');
    };

    const removeTag = (t: string) => setTags(tags.filter(x => x !== t));

    const handleSave = () => {
        if (!title.trim()) return alert("Введите название коллекции");
        if (!coverImage) return alert("Выберите обложку");
        onSave({
            id: initialData?.id,
            title,
            description,
            coverImage,
            exhibitIds: orderedIds,
            likes: initialData?.likes || 0,
            likedBy: initialData?.likedBy || [],
            visibility,
            tags,
        });
    };

    const isWinamp = theme === 'winamp';
    const selectedArtifacts = orderedIds.map(id => userArtifacts.find(a => a.id === id)).filter(Boolean) as Exhibit[];
    const availableArtifacts = userArtifacts.filter(a => !orderedIds.includes(a.id));

    return (
        <div className={`max-w-4xl mx-auto space-y-8 animate-in fade-in pb-32 ${isWinamp ? 'font-mono text-gray-300' : ''}`}>
            <div className="flex items-center justify-between">
                <button onClick={onBack} className={`flex items-center gap-2 font-pixel text-[10px] opacity-70 hover:opacity-100 uppercase tracking-widest ${isWinamp ? 'text-[#00ff00]' : ''}`}>
                    <XI icon={ArrowLeft} size={14} /> ОТМЕНА
                </button>
                <div className="flex gap-4">
                    {initialData && onDelete && (
                        <button onClick={() => { if (confirm('Удалить коллекцию?')) onDelete(initialData.id); }} className="text-red-500 hover:text-red-400 flex items-center gap-2 font-pixel text-[10px] uppercase">
                            <XI icon={Trash2} size={14} /> УДАЛИТЬ
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
                                <img src={getImageUrl(coverImage, 'medium')} className="absolute inset-0 w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <XI icon={Camera} size={32} className="text-white" />
                                </div>
                            </>
                        ) : (
                            <>
                                <XI icon={Camera} size={32} className="opacity-50 mb-2" />
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
                                rows={3}
                                className={`w-full bg-black/30 border border-white/10 rounded-xl px-5 py-4 font-mono text-sm focus:border-green-500 outline-none resize-none ${isWinamp ? 'text-[#00ff00] placeholder-gray-600' : ''}`}
                                placeholder="О чем эта подборка..."
                            />
                        </div>

                        {/* Visibility */}
                        <div>
                            <label className="text-[10px] font-pixel opacity-50 uppercase tracking-widest mb-2 block">Видимость</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(Object.entries(COLLECTION_VISIBILITY_CONFIG) as [CollectionVisibility, any][]).map(([key, cfg]) => (
                                    <button
                                        key={key}
                                        onClick={() => setVisibility(key)}
                                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${visibility === key ? cfg.color + ' bg-white/10' : 'border-white/10 opacity-50 hover:opacity-100'}`}
                                    >
                                        {React.createElement(cfg.icon, { size: 14 })}
                                        <span className="text-[8px] font-bold uppercase">{cfg.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tags */}
                        <div>
                            <label className="text-[10px] font-pixel opacity-50 uppercase tracking-widest mb-2 block">Теги (макс. 3)</label>
                            <div className="flex gap-2 mb-2 flex-wrap">
                                {tags.map(t => (
                                    <span key={t} className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 border border-blue-500/40 rounded text-[9px] font-pixel text-blue-300">
                                        <XI icon={Tag} size={8} /> {t}
                                        <button onClick={() => removeTag(t)} className="ml-1 hover:text-red-400"><XI icon={X} size={8} /></button>
                                    </span>
                                ))}
                            </div>
                            {tags.length < 3 && (
                                <div className="flex gap-2">
                                    <input
                                        value={tagInput}
                                        onChange={e => setTagInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && addTag()}
                                        className={`flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs focus:border-blue-500 outline-none ${isWinamp ? 'text-[#00ff00]' : ''}`}
                                        placeholder="SEGA ERA..."
                                        maxLength={20}
                                    />
                                    <button onClick={addTag} className="px-3 py-2 bg-blue-500/20 border border-blue-500/40 rounded-lg text-[9px] font-pixel text-blue-300 hover:bg-blue-500/30 transition-colors">
                                        ADD
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Selected Artifacts (draggable) */}
                    {selectedArtifacts.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h3 className="font-pixel text-[11px] opacity-70 tracking-widest uppercase">В КОЛЛЕКЦИИ ({selectedArtifacts.length})</h3>
                                <span className="text-[9px] font-mono opacity-40">↕ перетащить</span>
                            </div>
                            <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1 custom-scrollbar">
                                {selectedArtifacts.map((item, index) => (
                                    <div
                                        key={item.id}
                                        draggable
                                        onDragStart={() => handleDragStart(index)}
                                        onDragEnter={() => handleDragEnter(index)}
                                        onDragEnd={handleDragEnd}
                                        onDragOver={e => e.preventDefault()}
                                        className={`flex items-center gap-2 p-2 rounded-lg border border-green-500/30 bg-green-500/5 cursor-grab active:cursor-grabbing group transition-all hover:border-green-500/50`}
                                    >
                                        <XI icon={GripVertical} size={14} className="opacity-30 group-hover:opacity-70 shrink-0" />
                                        <img src={getImageUrl(item.imageUrls[0], 'thumbnail')} className="w-8 h-8 rounded object-cover shrink-0" />
                                        <span className="text-[10px] font-pixel flex-1 truncate">{item.title}</span>
                                        <button
                                            onClick={() => toggleArtifact(item.id)}
                                            className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                        >
                                            <XI icon={X} size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Available Artifacts */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h3 className="font-pixel text-[11px] opacity-70 tracking-widest uppercase">
                                {selectedArtifacts.length > 0 ? 'ДОСТУПНЫЕ АРТЕФАКТЫ' : 'ВЫБЕРИТЕ АРТЕФАКТЫ'}
                            </h3>
                            <span className="text-xs font-mono opacity-50">{orderedIds.length} выбрано</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 max-h-[260px] overflow-y-auto pr-2 custom-scrollbar">
                            {availableArtifacts.length === 0 && selectedArtifacts.length === 0 ? (
                                <div className="col-span-2 text-center py-10 opacity-50 font-mono text-xs border border-dashed border-white/10 rounded-xl">
                                    У вас пока нет своих артефактов. <br /> Создайте их, чтобы добавить в коллекцию.
                                </div>
                            ) : availableArtifacts.length === 0 ? (
                                <div className="col-span-2 text-center py-6 opacity-40 font-pixel text-[9px] border border-dashed border-white/5 rounded-xl uppercase">
                                    Все артефакты добавлены
                                </div>
                            ) : (
                                availableArtifacts.map(item => (
                                    <div
                                        key={item.id}
                                        onClick={() => toggleArtifact(item.id)}
                                        className="relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 border-transparent opacity-60 hover:opacity-100 transition-all hover:border-white/20"
                                    >
                                        <img src={getImageUrl(item.imageUrls[0], 'thumbnail')} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-2">
                                            <span className="text-[9px] font-pixel text-white truncate">{item.title}</span>
                                        </div>
                                        <div className="absolute top-2 right-2">
                                            <XI icon={Circle} size={18} className="text-white drop-shadow-md" />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <button
                onClick={handleSave}
                className="w-full py-5 bg-green-500 text-black rounded-2xl font-pixel text-sm tracking-[0.2em] hover:scale-[1.01] active:scale-95 transition-all shadow-[0_0_30px_rgba(74,222,128,0.4)] flex items-center justify-center gap-3 font-black"
            >
                <XI icon={Save} size={20} /> СОХРАНИТЬ КОЛЛЕКЦИЮ
            </button>
        </div>
    );
};

export default CreateCollectionView;

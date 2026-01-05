
import React, { useState, useMemo } from 'react';
import { X, RefreshCw, ArrowRightLeft, Lock, Check, Gift, MessageSquare, ChevronRight, AlertCircle } from 'lucide-react';
import { Exhibit, UserProfile, TradeType } from '../types';
import { sendTradeRequest } from '../services/storageService';

interface TradeOfferModalProps {
    targetItem?: Exhibit; // If initiated from an item
    currentUser: UserProfile;
    userInventory: Exhibit[];
    targetUserInventory?: Exhibit[]; // Needed if we want to select their items
    recipient: UserProfile; // We need the user object/name
    onClose: () => void;
}

const TradeOfferModal: React.FC<TradeOfferModalProps> = ({ targetItem, currentUser, userInventory, targetUserInventory = [], recipient, onClose }) => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [tradeType, setTradeType] = useState<TradeType>('DIRECT');
    const [mySelectedItems, setMySelectedItems] = useState<string[]>([]);
    const [theirSelectedItems, setTheirSelectedItems] = useState<string[]>(targetItem ? [targetItem.id] : []);
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter locked items
    const availableMyItems = useMemo(() => userInventory.filter(i => !i.isDraft && !i.lockedInTradeId), [userInventory]);
    // We assume targetUserInventory is passed correctly. If not provided (e.g. from profile without loading exhibits), we can't select their items.
    // If targetItem is provided, it is the initial selection.
    
    // NOTE: In a real app we'd need to fetch target inventory if not provided. 
    // For now, we assume `targetUserInventory` might be empty if called from Profile, 
    // so we disable "Their Items" selection unless `targetItem` is present or inventory passed.
    
    const canSelectTheirItems = targetUserInventory.length > 0 || targetItem;

    const toggleMyItem = (id: string) => {
        if (tradeType === 'DIRECT') {
            setMySelectedItems([id]); // Only 1 allowed
        } else {
            setMySelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
        }
    };

    const toggleTheirItem = (id: string) => {
        if (tradeType === 'GIFT') return; // Cannot select their items in gift
        if (tradeType === 'DIRECT') {
            setTheirSelectedItems([id]);
        } else {
            setTheirSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
        }
    };

    const handleNext = () => {
        if (step === 1) {
            setStep(2);
        } else if (step === 2) {
            // Validation
            if (tradeType !== 'GIFT' && theirSelectedItems.length === 0) return alert("Выберите, что вы хотите получить");
            if (mySelectedItems.length === 0) return alert("Выберите, что вы отдаете");
            setStep(3);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await sendTradeRequest({
                recipient: recipient.username,
                senderItems: mySelectedItems,
                recipientItems: theirSelectedItems,
                type: tradeType,
                message
            });
            alert("Предложение отправлено!");
            onClose();
        } catch (e) {
            alert("Ошибка: " + e);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderStep1_Type = () => (
        <div className="space-y-4">
            <h3 className="font-pixel text-center text-lg mb-6">ВЫБЕРИТЕ ТИП СДЕЛКИ</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button onClick={() => setTradeType('DIRECT')} className={`p-6 border-2 rounded-xl flex flex-col items-center gap-4 transition-all ${tradeType === 'DIRECT' ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:border-white/30'}`}>
                    <RefreshCw size={32} className={tradeType === 'DIRECT' ? 'text-blue-500' : 'opacity-50'}/>
                    <div className="text-center">
                        <div className="font-bold text-sm">ПРЯМОЙ ОБМЕН</div>
                        <div className="text-[10px] opacity-50 mt-1">1 предмет ⇄ 1 предмет</div>
                    </div>
                </button>
                <button onClick={() => setTradeType('MULTI')} className={`p-6 border-2 rounded-xl flex flex-col items-center gap-4 transition-all ${tradeType === 'MULTI' ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 hover:border-white/30'}`}>
                    <ArrowRightLeft size={32} className={tradeType === 'MULTI' ? 'text-purple-500' : 'opacity-50'}/>
                    <div className="text-center">
                        <div className="font-bold text-sm">МУЛЬТИ-ТРЕЙД</div>
                        <div className="text-[10px] opacity-50 mt-1">Много ⇄ Много</div>
                    </div>
                </button>
                <button onClick={() => setTradeType('GIFT')} className={`p-6 border-2 rounded-xl flex flex-col items-center gap-4 transition-all ${tradeType === 'GIFT' ? 'border-pink-500 bg-pink-500/10' : 'border-white/10 hover:border-white/30'}`}>
                    <Gift size={32} className={tradeType === 'GIFT' ? 'text-pink-500' : 'opacity-50'}/>
                    <div className="text-center">
                        <div className="font-bold text-sm">ПОДАРОК</div>
                        <div className="text-[10px] opacity-50 mt-1">Бесплатная передача</div>
                    </div>
                </button>
            </div>
        </div>
    );

    const renderStep2_Selection = () => (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 flex flex-col md:flex-row min-h-0">
                {/* MY ITEMS */}
                <div className="flex-1 border-r border-white/10 flex flex-col min-h-0">
                    <div className="p-3 bg-black/20 text-center border-b border-white/10 font-bold text-xs uppercase text-green-500">
                        ВЫ ОТДАЕТЕ ({mySelectedItems.length})
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 gap-2 content-start custom-scrollbar">
                        {availableMyItems.map(item => (
                            <div key={item.id} onClick={() => toggleMyItem(item.id)} className={`relative aspect-square border-2 rounded cursor-pointer ${mySelectedItems.includes(item.id) ? 'border-green-500' : 'border-white/10 hover:border-white/30'}`}>
                                <img src={item.imageUrls[0]} className="w-full h-full object-cover"/>
                                {mySelectedItems.includes(item.id) && <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center"><Check className="text-green-500 font-bold"/></div>}
                            </div>
                        ))}
                        {availableMyItems.length === 0 && <div className="col-span-3 text-center text-xs opacity-30 py-4">Нет доступных предметов</div>}
                    </div>
                </div>

                {/* THEIR ITEMS (Skipped for GIFT) */}
                {tradeType !== 'GIFT' && (
                    <div className="flex-1 flex flex-col min-h-0 bg-white/5">
                        <div className="p-3 bg-black/20 text-center border-b border-white/10 font-bold text-xs uppercase text-blue-500">
                            ВЫ ПОЛУЧАЕТЕ ({theirSelectedItems.length})
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 gap-2 content-start custom-scrollbar">
                            {targetItem && (
                                <div onClick={() => toggleTheirItem(targetItem.id)} className={`relative aspect-square border-2 rounded cursor-pointer ${theirSelectedItems.includes(targetItem.id) ? 'border-blue-500' : 'border-white/10 hover:border-white/30'}`}>
                                    <img src={targetItem.imageUrls[0]} className="w-full h-full object-cover"/>
                                    <div className="absolute top-0 right-0 bg-yellow-500 text-black text-[8px] px-1 font-bold">TARGET</div>
                                    {theirSelectedItems.includes(targetItem.id) && <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center"><Check className="text-blue-500 font-bold"/></div>}
                                </div>
                            )}
                            {/* If we had full inventory of target user, map here */}
                            {(!targetItem && targetUserInventory.length === 0) && <div className="col-span-3 text-center text-xs opacity-30 py-4">Инвентарь пользователя недоступен для выбора (только через кнопку 'Обмен' на предмете)</div>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    const renderStep3_Confirm = () => (
        <div className="flex flex-col h-full space-y-6 overflow-y-auto p-4">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h3 className="font-pixel text-xs opacity-50 mb-2">СООБЩЕНИЕ ДЛЯ @{recipient.username}</h3>
                <textarea 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-sm font-mono focus:border-green-500 outline-none h-24 resize-none"
                    placeholder="Привет! Предлагаю обмен..."
                />
            </div>

            <div className="flex items-center justify-between gap-8 p-4 border border-white/10 rounded-xl bg-black/20">
                <div className="text-center">
                    <div className="text-xs font-bold text-green-500 mb-1">ОТДАЕТЕ</div>
                    <div className="text-2xl font-pixel">{mySelectedItems.length}</div>
                </div>
                <div className="flex flex-col items-center opacity-50"><ArrowRightLeft/></div>
                <div className="text-center">
                    <div className="text-xs font-bold text-blue-500 mb-1">ПОЛУЧАЕТЕ</div>
                    <div className="text-2xl font-pixel">{theirSelectedItems.length}</div>
                </div>
            </div>

            <div className="text-center text-[10px] opacity-50 font-mono">
                <AlertCircle size={12} className="inline mr-1"/>
                После подтверждения предложения оно будет отправлено пользователю. Экспонаты не блокируются до принятия сделки обеими сторонами.
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in zoom-in-95">
            <div className="w-full max-w-2xl h-[600px] bg-[#1a1a1a] border border-white/10 rounded-2xl flex flex-col shadow-2xl overflow-hidden font-sans text-white">
                
                {/* Header */}
                <div className="bg-[#222] p-4 flex justify-between items-center border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <RefreshCw size={20} className="text-green-500" />
                        <div>
                            <div className="font-bold text-sm tracking-widest uppercase font-pixel">ТОРГОВЫЙ ТЕРМИНАЛ</div>
                            <div className="text-[10px] opacity-50">Сделка с @{recipient.username}</div>
                        </div>
                    </div>
                    <button onClick={onClose} className="hover:text-red-500 transition-colors"><X size={24} /></button>
                </div>

                {/* Progress Bar */}
                <div className="flex border-b border-white/5">
                    <div className={`flex-1 h-1 ${step >= 1 ? 'bg-green-500' : 'bg-white/10'}`}/>
                    <div className={`flex-1 h-1 ${step >= 2 ? 'bg-green-500' : 'bg-white/10'}`}/>
                    <div className={`flex-1 h-1 ${step >= 3 ? 'bg-green-500' : 'bg-white/10'}`}/>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden relative p-4 flex flex-col">
                    {step === 1 && renderStep1_Type()}
                    {step === 2 && renderStep2_Selection()}
                    {step === 3 && renderStep3_Confirm()}
                </div>

                {/* Footer */}
                <div className="p-4 bg-[#222] border-t border-white/5 flex justify-between">
                    {step > 1 ? (
                        <button onClick={() => setStep(prev => prev - 1 as any)} className="px-6 py-2 border border-white/20 rounded font-bold text-xs uppercase hover:bg-white/5">Назад</button>
                    ) : (
                        <div></div>
                    )}
                    
                    {step < 3 ? (
                        <button onClick={handleNext} className="px-8 py-2 bg-green-600 text-black font-bold rounded text-xs uppercase hover:bg-green-500 flex items-center gap-2">
                            Далее <ChevronRight size={16}/>
                        </button>
                    ) : (
                        <button onClick={handleSubmit} disabled={isSubmitting} className="px-8 py-2 bg-green-600 text-black font-bold rounded text-xs uppercase hover:bg-green-500 flex items-center gap-2 shadow-lg shadow-green-900/50">
                            {isSubmitting ? 'ОТПРАВКА...' : 'ОТПРАВИТЬ ПРЕДЛОЖЕНИЕ'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TradeOfferModal;

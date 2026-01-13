
import React, { useState, useMemo } from 'react';
import { X, RefreshCw, ArrowRightLeft, Lock, Check, Gift, MessageSquare, ChevronRight, AlertCircle, DollarSign, Wallet } from 'lucide-react';
import { Exhibit, UserProfile, TradeType } from '../types';
import { sendTradeRequest } from '../services/storageService';

interface TradeOfferModalProps {
    targetItem?: Exhibit; // If initiated from an item (Target inventory)
    currentUser: UserProfile;
    userInventory: Exhibit[];
    targetUserInventory?: Exhibit[]; // Needed if we want to select their items
    recipient: UserProfile; // We need the user object/name
    onClose: () => void;
    isWishlist?: boolean; // Context: Are we fulfilling a wishlist request?
    wishlistId?: string;
}

const TradeOfferModal: React.FC<TradeOfferModalProps> = ({ 
    targetItem, 
    currentUser, 
    userInventory, 
    targetUserInventory = [], 
    recipient, 
    onClose,
    isWishlist = false,
    wishlistId
}) => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [tradeType, setTradeType] = useState<TradeType>('DIRECT');
    const [mySelectedItems, setMySelectedItems] = useState<string[]>([]);
    
    // In Wishlist mode, we don't "take" the targetItem, we fulfill a wish. 
    // So if isWishlist is true, theirSelectedItems starts empty. 
    // Otherwise, it starts with targetItem if available.
    const [theirSelectedItems, setTheirSelectedItems] = useState<string[]>(!isWishlist && targetItem ? [targetItem.id] : []);
    
    const [moneyAmount, setMoneyAmount] = useState<string>('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter locked items
    const availableMyItems = useMemo(() => userInventory.filter(i => !i.isDraft && !i.lockedInTradeId), [userInventory]);
    
    const canSelectTheirItems = targetUserInventory.length > 0 || (targetItem && !isWishlist);

    const toggleMyItem = (id: string) => {
        // If Buying (Money), I am paying, I don't give items usually? 
        // Actually "Money" trade might imply "Part Money Part Item" in some games, 
        // but here let's stick to "Buying" means Money -> Item.
        // However, user asked for "Money" type. Let's allow simple logic.
        
        if (tradeType === 'MONEY') {
             // If I am BUYING, I give NO items, only money.
             // If I am SELLING (Wishlist fulfill), I give 1 item, I want money.
             if (isWishlist) {
                 setMySelectedItems([id]); // I give item
             } else {
                 // I am buying, I give money, so no items selected here?
                 // Wait, TradeType MONEY implies Money is involved.
                 // Let's assume standard flow: I want THEIR item.
                 // If MONEY: I give Money (price), They give Item.
                 // So mySelectedItems should be empty? Yes.
                 setMySelectedItems([]);
             }
             return;
        }

        if (tradeType === 'DIRECT') {
            setMySelectedItems([id]); // Only 1 allowed
        } else {
            setMySelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
        }
    };

    const toggleTheirItem = (id: string) => {
        if (tradeType === 'GIFT' && !isWishlist) return; // Cannot select their items in gift unless we are gifting TO them (then we select nothing of theirs)
        
        if (tradeType === 'MONEY') {
            // I am BUYING: I select Their Item.
            // I am SELLING (Wishlist): I select Nothing of theirs (I want money).
            if (isWishlist) {
                setTheirSelectedItems([]); 
            } else {
                setTheirSelectedItems([id]); // Buying 1 item
            }
            return;
        }

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
            if (tradeType === 'MONEY') {
                if (!moneyAmount || parseInt(moneyAmount) <= 0) return alert("Введите корректную сумму в рублях");
                if (isWishlist) {
                    // Selling: Must select my item to give
                    if (mySelectedItems.length === 0) return alert("Выберите предмет, который вы продаете");
                } else {
                    // Buying: Must select their item to buy
                    if (theirSelectedItems.length === 0) return alert("Выберите предмет, который хотите купить");
                }
            } else if (tradeType === 'GIFT') {
                if (mySelectedItems.length === 0) return alert("Выберите подарок");
            } else {
                // Direct / Multi
                if (isWishlist) {
                     // Fulfilling wish: Must give item. Might not ask for anything (Gift) or specific item?
                     // If Direct/Multi in wishlist context, implies swap.
                     if (mySelectedItems.length === 0) return alert("Выберите предмет для обмена");
                } else {
                    if (theirSelectedItems.length === 0) return alert("Выберите, что вы хотите получить");
                    if (mySelectedItems.length === 0) return alert("Выберите, что вы отдаете");
                }
            }
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
                message,
                price: moneyAmount ? parseInt(moneyAmount) : undefined,
                currency: 'RUB',
                isWishlistFulfillment: isWishlist,
                wishlistId: wishlistId
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
        <div className="space-y-4 overflow-y-auto max-h-[60vh] p-1">
            <h3 className="font-pixel text-center text-lg mb-6 text-white">ВЫБЕРИТЕ ТИП СДЕЛКИ</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={() => setTradeType('DIRECT')} className={`p-4 border-2 rounded-xl flex items-center gap-4 transition-all ${tradeType === 'DIRECT' ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:border-white/30'}`}>
                    <RefreshCw size={24} className={tradeType === 'DIRECT' ? 'text-blue-500' : 'opacity-50'}/>
                    <div className="text-left">
                        <div className="font-bold text-sm text-white">ПРЯМОЙ ОБМЕН</div>
                        <div className="text-[10px] opacity-50 mt-1">1 предмет ⇄ 1 предмет</div>
                    </div>
                </button>
                <button onClick={() => setTradeType('MULTI')} className={`p-4 border-2 rounded-xl flex items-center gap-4 transition-all ${tradeType === 'MULTI' ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 hover:border-white/30'}`}>
                    <ArrowRightLeft size={24} className={tradeType === 'MULTI' ? 'text-purple-500' : 'opacity-50'}/>
                    <div className="text-left">
                        <div className="font-bold text-sm text-white">МУЛЬТИ-ТРЕЙД</div>
                        <div className="text-[10px] opacity-50 mt-1">Много ⇄ Много</div>
                    </div>
                </button>
                <button onClick={() => setTradeType('MONEY')} className={`p-4 border-2 rounded-xl flex items-center gap-4 transition-all ${tradeType === 'MONEY' ? 'border-green-500 bg-green-500/10' : 'border-white/10 hover:border-white/30'}`}>
                    <Wallet size={24} className={tradeType === 'MONEY' ? 'text-green-500' : 'opacity-50'}/>
                    <div className="text-left">
                        <div className="font-bold text-sm text-white">ЗА ДЕНЬГИ (RUB)</div>
                        <div className="text-[10px] opacity-50 mt-1">{isWishlist ? 'Продать предмет' : 'Купить предмет'}</div>
                    </div>
                </button>
                <button onClick={() => setTradeType('GIFT')} className={`p-4 border-2 rounded-xl flex items-center gap-4 transition-all ${tradeType === 'GIFT' ? 'border-pink-500 bg-pink-500/10' : 'border-white/10 hover:border-white/30'}`}>
                    <Gift size={24} className={tradeType === 'GIFT' ? 'text-pink-500' : 'opacity-50'}/>
                    <div className="text-left">
                        <div className="font-bold text-sm text-white">ПОДАРОК</div>
                        <div className="text-[10px] opacity-50 mt-1">Безвозмездно</div>
                    </div>
                </button>
            </div>
        </div>
    );

    const renderStep2_Selection = () => (
        <div className="flex flex-col h-full min-h-0">
            {/* Money Input Section */}
            {tradeType === 'MONEY' && (
                <div className="mb-4 p-4 bg-green-900/20 border border-green-500/30 rounded-xl flex items-center gap-4">
                    <DollarSign size={24} className="text-green-500"/>
                    <div className="flex-1">
                        <label className="text-[10px] font-bold text-green-500 uppercase block mb-1">Сумма сделки (RUB)</label>
                        <input 
                            type="number" 
                            value={moneyAmount}
                            onChange={e => setMoneyAmount(e.target.value)}
                            placeholder="5000"
                            className="w-full bg-transparent border-b border-green-500 text-xl font-mono text-white focus:outline-none"
                        />
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col md:flex-row min-h-0 gap-4">
                {/* MY ITEMS (SENDER) */}
                {/* Logic: If Buying (Money), I give nothing (disabled). If Selling/Gifting/Trading, I pick items. */}
                <div className={`flex-1 border border-white/10 rounded-xl flex flex-col min-h-0 ${tradeType === 'MONEY' && !isWishlist ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="p-3 bg-black/20 text-center border-b border-white/10 font-bold text-xs uppercase text-green-500">
                        ВЫ ОТДАЕТЕ ({tradeType === 'MONEY' && !isWishlist ? 'ДЕНЬГИ' : mySelectedItems.length})
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 grid grid-cols-3 gap-2 content-start custom-scrollbar">
                        {availableMyItems.map(item => (
                            <div key={item.id} onClick={() => toggleMyItem(item.id)} className={`relative aspect-square border-2 rounded cursor-pointer ${mySelectedItems.includes(item.id) ? 'border-green-500' : 'border-white/10 hover:border-white/30'}`}>
                                <img src={item.imageUrls[0]} className="w-full h-full object-cover rounded-sm"/>
                                {mySelectedItems.includes(item.id) && <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center"><Check className="text-green-500 font-bold"/></div>}
                            </div>
                        ))}
                        {availableMyItems.length === 0 && <div className="col-span-3 text-center text-xs opacity-30 py-4 text-white">Инвентарь пуст</div>}
                    </div>
                </div>

                {/* THEIR ITEMS (RECIPIENT) */}
                {/* Logic: If Gift, I take nothing. If Selling (Money), I take nothing (disabled). */}
                {tradeType !== 'GIFT' && (
                    <div className={`flex-1 border border-white/10 rounded-xl flex flex-col min-h-0 bg-white/5 ${tradeType === 'MONEY' && isWishlist ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="p-3 bg-black/20 text-center border-b border-white/10 font-bold text-xs uppercase text-blue-500">
                            ВЫ ПОЛУЧАЕТЕ ({tradeType === 'MONEY' && isWishlist ? 'ДЕНЬГИ' : theirSelectedItems.length})
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 grid grid-cols-3 gap-2 content-start custom-scrollbar">
                            {(targetItem && !isWishlist) && (
                                <div onClick={() => toggleTheirItem(targetItem.id)} className={`relative aspect-square border-2 rounded cursor-pointer ${theirSelectedItems.includes(targetItem.id) ? 'border-blue-500' : 'border-white/10 hover:border-white/30'}`}>
                                    <img src={targetItem.imageUrls[0]} className="w-full h-full object-cover rounded-sm"/>
                                    <div className="absolute top-0 right-0 bg-yellow-500 text-black text-[8px] px-1 font-bold">ЦЕЛЬ</div>
                                    {theirSelectedItems.includes(targetItem.id) && <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center"><Check className="text-blue-500 font-bold"/></div>}
                                </div>
                            )}
                            {/* If we aren't showing target item (e.g. general trade or wishlist fulfillment where we select nothing from them yet) */}
                            {(!targetItem || isWishlist) && targetUserInventory.length === 0 && (
                                <div className="col-span-3 text-center text-xs opacity-30 py-4 text-white">
                                    {isWishlist && tradeType === 'MONEY' ? 'Вы получите оплату' : 'Предметы пользователя недоступны'}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    const renderStep3_Confirm = () => (
        <div className="flex flex-col h-full space-y-4 overflow-y-auto p-1 custom-scrollbar">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h3 className="font-pixel text-xs opacity-50 mb-2 text-white">СООБЩЕНИЕ ДЛЯ @{recipient.username}</h3>
                <textarea 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-sm font-mono focus:border-green-500 outline-none h-20 resize-none text-white"
                    placeholder="Привет! Предлагаю обмен..."
                />
            </div>

            <div className="flex items-center justify-between gap-4 p-4 border border-white/10 rounded-xl bg-black/20">
                <div className="text-center flex-1">
                    <div className="text-[10px] font-bold text-green-500 mb-1 uppercase">ОТДАЕТЕ</div>
                    {tradeType === 'MONEY' && !isWishlist ? (
                        <div className="text-lg font-pixel text-green-400">{moneyAmount} ₽</div>
                    ) : (
                        <div className="text-lg font-pixel text-white">{mySelectedItems.length} <span className="text-xs">ПРЕДМ.</span></div>
                    )}
                </div>
                <div className="flex flex-col items-center opacity-50 text-white"><ArrowRightLeft/></div>
                <div className="text-center flex-1">
                    <div className="text-[10px] font-bold text-blue-500 mb-1 uppercase">ПОЛУЧАЕТЕ</div>
                    {tradeType === 'MONEY' && isWishlist ? (
                        <div className="text-lg font-pixel text-blue-400">{moneyAmount} ₽</div>
                    ) : (
                        <div className="text-lg font-pixel text-white">{theirSelectedItems.length} <span className="text-xs">ПРЕДМ.</span></div>
                    )}
                </div>
            </div>

            {isWishlist && (
                <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-center">
                    <p className="text-[10px] text-purple-300 font-bold font-pixel uppercase">ИСПОЛНЕНИЕ ЖЕЛАНИЯ (WISHLIST)</p>
                </div>
            )}

            <div className="text-center text-[10px] opacity-50 font-mono text-white">
                <AlertCircle size={12} className="inline mr-1"/>
                После подтверждения предложение будет отправлено. Сделка завершится только после согласия второй стороны.
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in zoom-in-95">
            <div className="w-full max-w-2xl max-h-[90vh] h-full flex flex-col bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden font-sans">
                
                {/* Header */}
                <div className="bg-[#222] p-4 flex justify-between items-center border-b border-white/5 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <RefreshCw size={20} className="text-green-500" />
                        <div>
                            <div className="font-bold text-sm tracking-widest uppercase font-pixel text-white">ТОРГОВЫЙ ТЕРМИНАЛ</div>
                            <div className="text-[10px] opacity-50 text-white">Сделка с @{recipient.username}</div>
                        </div>
                    </div>
                    <button onClick={onClose} className="hover:text-red-500 transition-colors text-white"><X size={24} /></button>
                </div>

                {/* Progress Bar */}
                <div className="flex border-b border-white/5 flex-shrink-0">
                    <div className={`flex-1 h-1 ${step >= 1 ? 'bg-green-500' : 'bg-white/10'}`}/>
                    <div className={`flex-1 h-1 ${step >= 2 ? 'bg-green-500' : 'bg-white/10'}`}/>
                    <div className={`flex-1 h-1 ${step >= 3 ? 'bg-green-500' : 'bg-white/10'}`}/>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-hidden relative p-4 flex flex-col min-h-0">
                    {step === 1 && renderStep1_Type()}
                    {step === 2 && renderStep2_Selection()}
                    {step === 3 && renderStep3_Confirm()}
                </div>

                {/* Footer - Fixed */}
                <div className="p-4 bg-[#222] border-t border-white/5 flex justify-between flex-shrink-0">
                    {step > 1 ? (
                        <button onClick={() => setStep(prev => prev - 1 as any)} className="px-6 py-3 border border-white/20 rounded-xl font-bold text-xs uppercase hover:bg-white/5 text-white">Назад</button>
                    ) : (
                        <div></div>
                    )}
                    
                    {step < 3 ? (
                        <button onClick={handleNext} className="px-8 py-3 bg-green-600 text-black font-bold rounded-xl text-xs uppercase hover:bg-green-500 flex items-center gap-2">
                            Далее <ChevronRight size={16}/>
                        </button>
                    ) : (
                        <button onClick={handleSubmit} disabled={isSubmitting} className="px-8 py-3 bg-green-600 text-black font-bold rounded-xl text-xs uppercase hover:bg-green-500 flex items-center gap-2 shadow-lg shadow-green-900/50">
                            {isSubmitting ? 'ОТПРАВКА...' : 'ОТПРАВИТЬ'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TradeOfferModal;

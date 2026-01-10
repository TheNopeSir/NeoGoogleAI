
import { Exhibit, TierType, TradeStatus, WishlistPriority } from './types';
import { Zap, Flame, Award, User, Circle, Moon, MinusCircle, EyeOff, MessageCircle, Ghost, Terminal, Upload, Star, MessageSquare, Layers, Search, RefreshCw, DollarSign, Gift, Lock, Crown, Radar, Eye, Target, Sparkles, Gem } from 'lucide-react';

export const DefaultCategory = {
  PHONES: 'ТЕЛЕФОНЫ',
  GAMES: 'ИГРЫ',
  MAGAZINES: 'ЖУРНАЛЫ',
  MUSIC: 'МУЗЫКА',
  VIDEO: 'ВИДЕО',
  TOYS: 'ИГРУШКИ',
  COMPUTERS: 'КОМПЬЮТЕРЫ',
  CAMERAS: 'КАМЕРЫ',
  MISC: 'ПРОЧЕЕ'
} as const;

export const CATEGORY_SUBCATEGORIES: Record<string, string[]> = {
    [DefaultCategory.PHONES]: ['Смартфоны', 'Кнопочные телефоны', 'Раскладушки', 'Слайдеры', 'КПК', 'Стационарные', 'Пейджеры'],
    [DefaultCategory.GAMES]: ['Картриджи (8-bit/16-bit)', 'Диски (CD/DVD/BD)', 'Портативные консоли', 'Стационарные консоли', 'Аксессуары', 'Аркадные автоматы'],
    [DefaultCategory.MAGAZINES]: ['Игровые', 'Компьютерные', 'Технические', 'Музыкальные', 'Комиксы', 'Каталоги', 'Постеры'],
    [DefaultCategory.MUSIC]: ['Аудиокассеты', 'Винил (LP/EP)', 'CD', 'MiniDisc', 'Плееры (Портатив)', 'Hi-Fi Компоненты', 'Катушки'],
    [DefaultCategory.VIDEO]: ['VHS', 'DVD', 'Blu-ray', 'Видеоплееры', 'Проекторы', 'Video CD'],
    [DefaultCategory.TOYS]: ['Action Figures', 'Конструкторы', 'Мягкие игрушки', 'Роботы', 'Настольные игры', 'Тамагочи/Электроника', 'Моделизм'],
    [DefaultCategory.COMPUTERS]: ['Ретро ПК', 'Ноутбуки', 'Комплектующие', 'Периферия', 'Носители (Floppy/ZIP)'],
    [DefaultCategory.CAMERAS]: ['Пленочные', 'Цифровые (Early Digital)', 'Polaroid/Instax', 'Видеокамеры', 'Объективы'],
    [DefaultCategory.MISC]: ['Часы', 'Калькуляторы', 'Мерч', 'Упаковка', 'Реклама', 'Другое']
};

export const CATEGORY_SPECS_TEMPLATES: Record<string, string[]> = {
  [DefaultCategory.PHONES]: ['Бренд', 'Модель', 'Год выпуска', 'Стандарт связи', 'Тип корпуса'],
  [DefaultCategory.GAMES]: ['Платформа', 'Название', 'Регион', 'Год', 'Комплектация'],
  [DefaultCategory.MAGAZINES]: ['Название', 'Номер', 'Год', 'Издательство', 'Язык'],
  [DefaultCategory.MUSIC]: ['Исполнитель', 'Альбом', 'Год', 'Носитель', 'Состояние'],
  [DefaultCategory.VIDEO]: ['Название', 'Год', 'Носитель', 'Режиссер', 'Издатель'],
  [DefaultCategory.TOYS]: ['Название', 'Серия', 'Бренд', 'Год', 'Материал'],
  [DefaultCategory.COMPUTERS]: ['Бренд', 'Модель', 'Процессор', 'ОЗУ', 'Год'],
  [DefaultCategory.CAMERAS]: ['Бренд', 'Модель', 'Тип', 'Матрица/Пленка', 'Год'],
  [DefaultCategory.MISC]: ['Название', 'Производитель', 'Год', 'Описание']
};

export const TRADE_STATUS_CONFIG: Record<TradeStatus, any> = {
    'NONE': { label: '', color: '', icon: null },
    'FOR_TRADE': { label: 'ОБМЕН', color: 'text-blue-300 border-blue-500 bg-blue-500/20', icon: RefreshCw, badge: 'ОБМЕН' },
    'FOR_SALE': { label: 'ПРОДАЖА', color: 'text-emerald-300 border-emerald-500 bg-emerald-500/20', icon: DollarSign, badge: 'ПРОДАЖА' },
    'GIFT': { label: 'ДАРЮ', color: 'text-pink-300 border-pink-500 bg-pink-500/20', icon: Gift, badge: 'ОТДАМ' },
    'NOT_FOR_SALE': { label: 'НЕ ПРОДАЕТСЯ', color: 'text-gray-400 border-gray-600 bg-gray-500/20', icon: Lock, badge: 'ЛИЧНОЕ' },
};

export const WISHLIST_PRIORITY_CONFIG: Record<WishlistPriority, any> = {
    'LOW': { label: 'НАБЛЮДАЮ', desc: 'Присматриваюсь', color: 'text-gray-400 border-gray-500 bg-gray-500/10', icon: Eye, border: 'border-gray-500' },
    'MEDIUM': { label: 'ИНТЕРЕС', desc: 'Куплю при случае', color: 'text-blue-400 border-blue-500 bg-blue-500/10', icon: Search, border: 'border-blue-500' },
    'HIGH': { label: 'ОХОТА', desc: 'Активно ищу', color: 'text-orange-400 border-orange-500 bg-orange-500/10', icon: Target, border: 'border-orange-500' },
    'GRAIL': { label: 'ГРААЛЬ', desc: 'Мечта коллекции', color: 'text-yellow-400 border-yellow-500 bg-yellow-500/10 animate-pulse', icon: Crown, glow: true, border: 'border-yellow-500' },
};

export const BADGE_CONFIG = {
    'HELLO_WORLD': { label: 'HELLO WORLD', desc: 'Первый вход в систему', color: 'bg-green-500', icon: Terminal, target: 1 },
    'UPLOADER': { label: 'DATA_MINER', desc: 'Загружено артефактов', color: 'bg-blue-500', icon: Upload, target: 5 },
    'INFLUENCER': { label: 'NET_CELEB', desc: 'Лайков получено', color: 'bg-purple-500', icon: Star, target: 50 },
    'CRITIC': { label: 'OBSERVER', desc: 'Оставлено комментариев', color: 'bg-yellow-500', icon: MessageSquare, target: 10 },
    'LEGEND': { label: 'THE_ONE', desc: 'Владелец Легендарного артефакта', color: 'bg-red-500', icon: Zap, target: 1 },
    'COLLECTOR': { label: 'ARCHIVIST', desc: 'Создано коллекций', color: 'bg-orange-500', icon: Layers, target: 3 }
};

export const BADGES = BADGE_CONFIG;

export const STATUS_OPTIONS = {
    'ONLINE': { label: 'В сети', color: 'text-green-500', icon: Circle },
    'AWAY': { label: 'Отошел', color: 'text-yellow-500', icon: Moon },
    'DND': { label: 'Не беспокоить', color: 'text-red-500', icon: MinusCircle },
    'INVISIBLE': { label: 'Невидимка', color: 'text-gray-400', icon: EyeOff },
    'FREE_FOR_CHAT': { label: 'Готов болтать', color: 'text-blue-500', icon: MessageCircle },
};

export const CATEGORY_CONDITIONS: Record<string, string[]> = {
  [DefaultCategory.PHONES]: ['НОВЫЙ (SEALED)', 'LIKE NEW', 'EXC', 'GOOD', 'FAIR', 'PARTS'],
  [DefaultCategory.GAMES]: ['SEALED', 'CIB', 'BOXED', 'LOOSE', 'D.O.A.'],
  [DefaultCategory.MUSIC]: ['MINT', 'NM', 'VG+', 'VG', 'G', 'POOR'],
  [DefaultCategory.MAGAZINES]: ['NEW', 'FINE', 'VERY GOOD', 'GOOD', 'FAIR', 'POOR'],
  [DefaultCategory.VIDEO]: ['SEALED', 'MINT', 'EXC', 'GOOD', 'VHS-RIP'],
  [DefaultCategory.TOYS]: ['MISB (Sealed)', 'MIB (Boxed)', 'LOOSE (Complete)', 'LOOSE (Incomplete)', 'BROKEN'],
  [DefaultCategory.COMPUTERS]: ['NOS (New Old Stock)', 'RESTORED', 'WORKING', 'UNTESTED', 'FOR PARTS'],
  [DefaultCategory.CAMERAS]: ['MINT', 'NEAR MINT', 'EXC++', 'EXC', 'USER', 'UG'],
  [DefaultCategory.MISC]: ['ИДЕАЛ', 'ХОРОШЕЕ', 'ПОТЕРТОЕ', 'СЛОМАНО']
};

// Category base tier (multiplier for tier calculation)
export const CATEGORY_TIER_MULTIPLIER: Record<string, number> = {
  [DefaultCategory.PHONES]: 1.2,      // Телефоны - более ценные, выше шанс на редкий тир
  [DefaultCategory.GAMES]: 1.5,       // Игры - коллекционные, высокий спрос
  [DefaultCategory.MAGAZINES]: 1.0,   // Журналы - стандартная ценность
  [DefaultCategory.MUSIC]: 1.3,       // Музыка - винил и редкие издания
  [DefaultCategory.VIDEO]: 1.1,       // Видео - VHS и редкие диски
  [DefaultCategory.TOYS]: 1.4,        // Игрушки - коллекционные, винтажные
  [DefaultCategory.COMPUTERS]: 1.6,   // Компьютеры - ретро-техника, очень ценная
  [DefaultCategory.CAMERAS]: 1.7,     // Камеры - раритетная техника, высокая ценность
  [DefaultCategory.MISC]: 0.9         // Прочее - базовая ценность
};

export const getArtifactTier = (item: Exhibit): TierType => {
    // Special case: CURSED items (manually marked or specific conditions)
    if (item.title.toUpperCase().includes('CURSED') || (item.title === 'вфуфвф' && (item.owner === 'Truester' || item.owner === '@Truester'))) {
        return 'CURSED';
    }

    // Calculate engagement score with weighted factors
    const uniqueViewers = item.viewedBy?.length || Math.floor(item.views * 0.3); // Estimate if viewedBy not available
    const engagementScore = (item.likes * 30) + ((item.comments?.length || 0) * 15) + (uniqueViewers * 2);

    // Age multiplier: newer items get slight boost (within first 7 days)
    const ageInDays = (Date.now() - new Date(item.timestamp).getTime()) / (1000 * 60 * 60 * 24);
    const ageMultiplier = ageInDays < 7 ? 1.2 : 1.0;

    // Category multiplier: some categories are inherently more valuable
    const categoryMultiplier = CATEGORY_TIER_MULTIPLIER[item.category] || 1.0;

    const finalScore = engagementScore * ageMultiplier * categoryMultiplier;

    // Progressive tier thresholds
    if (finalScore >= 15000) return 'MYTHIC';      // Ultra rare, godlike
    if (finalScore >= 8000) return 'LEGENDARY';    // Very rare
    if (finalScore >= 3000) return 'EPIC';         // Rare
    if (finalScore >= 800) return 'RARE';          // Uncommon-rare
    if (finalScore >= 200) return 'UNCOMMON';      // Better than common
    return 'COMMON';                                // Standard
};

export const TIER_CONFIG: Record<TierType, any> = {
    COMMON: {
        name: 'COMMON',
        color: 'text-gray-500',
        bgColor: 'bg-gray-500/10',
        borderDark: 'border-dark-dim',
        badge: 'bg-gray-500 text-white',
        icon: User,
        shadow: '',
        glow: false
    },
    UNCOMMON: {
        name: 'UNCOMMON',
        color: 'text-green-500',
        bgColor: 'bg-green-500/15',
        borderDark: 'border-green-600 shadow-[0_0_8px_rgba(34,197,94,0.25)]',
        badge: 'bg-green-600 text-white',
        icon: Sparkles,
        shadow: 'shadow-[0_0_8px_rgba(34,197,94,0.15)]',
        glow: true,
        glowColor: 'rgba(34,197,94,0.2)'
    },
    RARE: {
        name: 'RARE',
        color: 'text-cyan-500',
        bgColor: 'bg-cyan-500/20',
        borderDark: 'border-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.35)]',
        badge: 'bg-cyan-600 text-white',
        icon: Award,
        shadow: 'shadow-[0_0_12px_rgba(6,182,212,0.25)]',
        glow: true,
        glowColor: 'rgba(6,182,212,0.3)'
    },
    EPIC: {
        name: 'EPIC',
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/20',
        borderDark: 'border-purple-500 shadow-[0_0_18px_rgba(168,85,247,0.45)]',
        badge: 'bg-purple-600 text-white',
        icon: Flame,
        shadow: 'shadow-[0_0_18px_rgba(168,85,247,0.35)]',
        glow: true,
        glowColor: 'rgba(168,85,247,0.4)'
    },
    LEGENDARY: {
        name: 'LEGENDARY',
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/25',
        borderDark: 'border-yellow-500 shadow-[0_0_25px_rgba(234,179,8,0.55)]',
        badge: 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white',
        icon: Zap,
        shadow: 'shadow-[0_0_25px_rgba(234,179,8,0.45)]',
        glow: true,
        glowColor: 'rgba(234,179,8,0.5)'
    },
    MYTHIC: {
        name: 'MYTHIC',
        color: 'text-pink-400',
        bgColor: 'bg-gradient-to-br from-pink-500/30 to-blue-500/30',
        borderDark: 'border-pink-500 shadow-[0_0_35px_rgba(236,72,153,0.7)] animate-pulse-slow',
        badge: 'bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 text-white font-bold',
        icon: Gem,
        shadow: 'shadow-[0_0_35px_rgba(236,72,153,0.6)] animate-pulse',
        glow: true,
        glowColor: 'rgba(236,72,153,0.6)',
        animated: true
    },
    CURSED: {
        name: 'CURSED',
        color: 'text-red-500',
        bgColor: 'bg-red-500/20',
        borderDark: 'border-red-600 shadow-[0_0_30px_rgba(239,68,68,0.7)] animate-pulse-slow',
        badge: 'bg-red-600 text-white font-black italic',
        icon: Ghost,
        shadow: 'shadow-[0_0_30px_rgba(220,38,38,0.6)] animate-pulse',
        glow: true,
        glowColor: 'rgba(239,68,68,0.7)',
        animated: true
    }
};

export const calculateArtifactScore = (item: Exhibit, userPreferences?: Record<string, number>): number => {
    const likeScore = item.likes * 10;
    const viewScore = item.views * 0.5;
    const prefBoost = userPreferences && userPreferences[item.category] ? userPreferences[item.category] * 100 : 0;
    return likeScore + viewScore + prefBoost;
};

// --- SMART SIMILARITY ALGORITHM ---
export const getSimilarArtifacts = (current: Exhibit, all: Exhibit[], limit: number = 4): Exhibit[] => {
    if (!current || !all) return [];
    
    // 1. Tokenize current title (remove junk)
    const stopWords = ['the', 'and', 'for', 'with', 'edition', 'version', 'новый', 'продам', 'купил'];
    const currentTokens = current.title.toLowerCase()
        .replace(/[^\w\sа-яё]/gi, '') // remove special chars
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.includes(w));
    
    return all
        .filter(item => item.id !== current.id && !item.isDraft) // Exclude self and drafts
        .map(item => {
            let score = 0;
            
            // 1. Category Match (Base weight: 10)
            if (item.category === current.category) score += 10;
            
            // 2. Subcategory Match (High weight: 25)
            if (item.subcategory && item.subcategory === current.subcategory) score += 25;
            
            // 3. Smart Title Matching (Weight: 15 per match)
            const itemTokens = item.title.toLowerCase().split(/\s+/);
            let matches = 0;
            currentTokens.forEach(token => {
                if (itemTokens.some(t => t.includes(token) || token.includes(t))) {
                    matches++;
                }
            });
            score += (matches * 15);

            // 4. Linked item bonus (if user manually linked them elsewhere)
            if (current.relatedIds?.includes(item.id)) score += 100;

            // 5. Specs overlap (Advanced)
            if (item.specs && current.specs) {
                const brandA = Object.values(current.specs).find(v => ['sony', 'nintendo', 'sega', 'apple', 'nokia'].includes(v.toLowerCase()));
                const brandB = Object.values(item.specs).find(v => ['sony', 'nintendo', 'sega', 'apple', 'nokia'].includes(v.toLowerCase()));
                if (brandA && brandB && brandA.toLowerCase() === brandB.toLowerCase()) {
                    score += 20; // Same Major Brand
                }
            }

            return { item, score };
        })
        .filter(x => x.score > 5) // Must have at least minimal relevance
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(x => x.item);
};

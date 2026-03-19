
import { Exhibit, TierType, TradeStatus, WishlistPriority, WishlistItemStatus, CollectionVisibility } from './types';
import { Zap, Flame, Award, User, Circle, Moon, MinusCircle, EyeOff, MessageCircle, Ghost, Terminal, Upload, Star, MessageSquare, Layers, Search, RefreshCw, DollarSign, Gift, Lock, Crown, Radar, Eye, Target, Trophy, CheckCircle, PauseCircle, Globe, UserCheck, TrendingUp, BookOpen, Feather } from 'lucide-react';

export const DefaultCategory = {
  PHONES: 'ТЕЛЕФОНЫ',
  GADGETS: 'ГАДЖЕТЫ',
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
    [DefaultCategory.PHONES]: ['Смартфоны (ранние, до 2005)', 'Кнопочные телефоны', 'Раскладушки', 'Слайдеры', 'КПК / Органайзеры', 'Стационарные телефоны', 'Радиотелефоны (DECT)'],
    [DefaultCategory.GADGETS]: ['Портативные плееры (Walkman, Discman, MiniDisc)', 'Пейджеры', 'Электронные часы', 'Калькуляторы', 'Тамагочи / Виртуальные питомцы', 'Диктофоны / Рекордеры', 'Электронные переводчики', 'Прочие портативные гаджеты'],
    [DefaultCategory.GAMES]: ['Картриджи 8-bit (Famicom / Atari / Sega MS)', 'Картриджи 16-bit (SNES / Mega Drive / Neo Geo)', 'Картриджи 32/64-bit (N64 / GBA)', 'Диски (CD / DVD / GD-ROM)', 'Портативные консоли', 'Стационарные консоли', 'Аркадные автоматы / PCB', 'Аксессуары и периферия'],
    [DefaultCategory.MAGAZINES]: ['Игровые журналы', 'Компьютерные журналы', 'Технические журналы', 'Музыкальные журналы / Fanzines', 'Комиксы', 'Игровые руководства / Мануалы', 'Каталоги и рекламные буклеты', 'Постеры / Вкладыши'],
    [DefaultCategory.MUSIC]: ['Виниловые пластинки LP', 'Виниловые синглы (7" / EP)', 'Аудиокассеты', 'CD', 'MiniDisc', '8-Track / Картриджи', 'Катушки / Бобины (Reel-to-Reel)', 'Аксессуары (иглы, чистящие наборы)'],
    [DefaultCategory.VIDEO]: ['VHS', 'Betamax', 'LaserDisc', 'Video CD (VCD)', 'DVD', 'Blu-ray (коллекционные издания)', 'Видеомагнитофоны / VCR', 'Проекторы', 'Телевизоры (CRT / ламповые)', 'Hi-Fi Компоненты (усилители, ресиверы, вертушки)', 'Магнитофоны (катушечные / кассетные деки)', 'Радиоприёмники'],
    [DefaultCategory.TOYS]: ['Action Figures / Фигурки', 'Конструкторы (LEGO / Meccano / советские)', 'Мягкие игрушки', 'Роботы и электронные игрушки', 'Настольные игры', 'Куклы и аксессуары', 'Моделизм (пластиковые модели)', 'Радиоуправляемые модели (ретро RC)'],
    [DefaultCategory.COMPUTERS]: ['Ретро ПК (ZX Spectrum / BK / Amiga / Atari ST / IBM)', 'Ноутбуки (до 2003)', 'Комплектующие', 'Периферия (мыши, клавиатуры, принтеры)', 'Носители (Floppy / ZIP / Tape)', 'Программное обеспечение (ПО, игры на дискетах/CD)', 'Документация / Мануалы'],
    [DefaultCategory.CAMERAS]: ['Плёночные фотоаппараты 35мм', 'Плёночные фотоаппараты средний формат', 'Polaroid / Instax / Моментальные', 'Ранние цифровые фотоаппараты (до 2005)', 'Видеокамеры аналоговые', 'Видеокамеры цифровые (ранние)', 'Объективы и оптика', 'Аксессуары (вспышки, штативы, фильтры)'],
    [DefaultCategory.MISC]: ['Мерч / Сувениры', 'Упаковка (vintage packaging)', 'Значки / Пины', 'Рекламные материалы', 'Другое']
};

export const CATEGORY_SPECS_TEMPLATES: Record<string, string[]> = {
  [DefaultCategory.PHONES]: ['Бренд', 'Модель', 'Год выпуска', 'Стандарт связи', 'Тип корпуса'],
  [DefaultCategory.GADGETS]: ['Бренд', 'Модель', 'Год выпуска', 'Тип', 'Питание'],
  [DefaultCategory.GAMES]: ['Платформа', 'Название', 'Регион', 'Год', 'Комплектация'],
  [DefaultCategory.MAGAZINES]: ['Название', 'Номер', 'Год', 'Издательство', 'Язык'],
  [DefaultCategory.MUSIC]: ['Исполнитель', 'Альбом', 'Год', 'Носитель', 'Лейбл'],
  [DefaultCategory.VIDEO]: ['Название / Модель', 'Год', 'Носитель / Тип', 'Бренд', 'Регион / Стандарт'],
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

export const WISHLIST_STATUS_CONFIG: Record<WishlistItemStatus, any> = {
    'SEARCHING': { label: 'ПОИСК', desc: 'Активно ищу', color: 'text-blue-400 border-blue-500 bg-blue-500/10', icon: Search },
    'ACQUIRED':  { label: 'НАШЕЛ', desc: 'Уже в коллекции', color: 'text-green-400 border-green-500 bg-green-500/10', icon: CheckCircle },
    'PAUSED':    { label: 'ПАУЗА', desc: 'Приостановил поиск', color: 'text-gray-400 border-gray-500 bg-gray-500/10', icon: PauseCircle },
};

export const COLLECTION_VISIBILITY_CONFIG: Record<CollectionVisibility, any> = {
    'PUBLIC':    { label: 'ПУБЛИЧНАЯ', desc: 'Видят все', color: 'text-green-400 border-green-500 bg-green-500/10', icon: Globe },
    'FOLLOWERS': { label: 'ПОДПИСЧИКИ', desc: 'Только подписчики', color: 'text-blue-400 border-blue-500 bg-blue-500/10', icon: UserCheck },
    'PRIVATE':   { label: 'ЛИЧНАЯ', desc: 'Только я', color: 'text-gray-400 border-gray-500 bg-gray-500/10', icon: Lock },
};

export const BADGE_CONFIG = {
    // ── COMMON ──────────────────────────────────────────────────────────────
    'HELLO_WORLD':    { label: 'HELLO WORLD', desc: 'Первый вход в систему',                        color: 'bg-green-500',  icon: Terminal,    target: 1,  tier: 'COMMON' },
    'UPLOADER':       { label: 'DATA_MINER',  desc: 'Загружено 5 артефактов',                       color: 'bg-green-500',  icon: Upload,      target: 5,  tier: 'COMMON' },
    'INIT_SEQUENCE':  { label: 'INIT.EXE',    desc: 'Загружен первый артефакт',                     color: 'bg-green-500',  icon: Upload,      target: 1,  tier: 'COMMON' },
    'INFLUENCER':     { label: 'NET_CELEB',   desc: 'Лайков получено',                              color: 'bg-green-500',  icon: Star,        target: 50, tier: 'COMMON' },
    'CRITIC':         { label: 'OBSERVER',    desc: 'Оставлено 10 комментариев',                    color: 'bg-green-500',  icon: MessageSquare, target: 10, tier: 'COMMON' },
    'COLLECTOR':      { label: 'ARCHIVIST',   desc: 'Создано 3 коллекции',                          color: 'bg-green-500',  icon: Layers,      target: 3,  tier: 'COMMON' },
    'FIRST_FOLLOW':   { label: 'HANDSHAKE',   desc: 'Первая подписка',                              color: 'bg-green-500',  icon: UserCheck,   target: 1,  tier: 'COMMON' },
    'FIRST_VOTE':     { label: 'PING',        desc: 'Первый голос в битве артефактов',               color: 'bg-green-500',  icon: Target,      target: 1,  tier: 'COMMON' },
    'GHOST_MODE':     { label: 'GHOST_MODE',  desc: 'Установлен статус Невидимка',                  color: 'bg-green-500',  icon: EyeOff,      target: 1,  tier: 'COMMON' },
    // ── UNCOMMON ────────────────────────────────────────────────────────────
    'BATTLE_CHAMPION':{ label: 'CHAMPION',    desc: 'Победитель битвы артефактов',                  color: 'bg-blue-500',   icon: Trophy,      target: 1,  tier: 'UNCOMMON' },
    'ARCHAEOLOGIST':  { label: 'DIGITAL_DIG', desc: 'Загружено 25 артефактов',                      color: 'bg-blue-500',   icon: Search,      target: 25, tier: 'UNCOMMON' },
    'ANALYST':        { label: 'ANALYST',     desc: 'Оставлено 50 комментариев',                    color: 'bg-blue-500',   icon: Eye,         target: 50, tier: 'UNCOMMON' },
    'CURATOR':        { label: 'CURATOR',     desc: 'Создано 10 коллекций',                         color: 'bg-blue-500',   icon: BookOpen,    target: 10, tier: 'UNCOMMON' },
    'SIGNAL_BOOST':   { label: 'SIGNAL++',    desc: 'Набрано 10 подписчиков',                       color: 'bg-blue-500',   icon: TrendingUp,  target: 10, tier: 'UNCOMMON' },
    'GRAIL_HUNTER':   { label: 'GRAIL.HUNT',  desc: '5 предметов с приоритетом ГРААЛЬ в вишлисте',  color: 'bg-blue-500',   icon: Crown,       target: 5,  tier: 'UNCOMMON' },
    // ── RARE ────────────────────────────────────────────────────────────────
    'LEGEND':         { label: 'THE_ONE',     desc: 'Владелец Легендарного артефакта',               color: 'bg-purple-500', icon: Zap,         target: 1,  tier: 'RARE' },
    'ARCHON':         { label: 'ARCHON',      desc: 'Загружено 100 артефактов',                     color: 'bg-purple-500', icon: Award,       target: 100, tier: 'RARE' },
    'BROADCAST_NODE': { label: 'BROADCAST',   desc: 'Набрано 50 подписчиков',                       color: 'bg-purple-500', icon: Radar,       target: 50, tier: 'RARE' },
    'OVERCLOCK':      { label: 'OVERCLOCK',   desc: 'Выиграно 5 битв артефактов',                   color: 'bg-purple-500', icon: Flame,       target: 5,  tier: 'RARE' },
    // ── EPIC ────────────────────────────────────────────────────────────────
    'FULL_STACK':     { label: 'FULL_STACK',  desc: 'Артефакты во всех 10 категориях',              color: 'bg-orange-500', icon: Globe,       target: 10, tier: 'EPIC' },
    'HEMINGWAY':      { label: 'HEMINGWAY',   desc: '10 лайков на комментарий короче 50 символов',  color: 'bg-orange-500', icon: Feather,     target: 1,  tier: 'EPIC' },
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
  [DefaultCategory.PHONES]:    ['НОВЫЙ (SEALED)', 'LIKE NEW', 'EXC', 'GOOD', 'FAIR', 'PARTS'],
  [DefaultCategory.GADGETS]:   ['НОВЫЙ (SEALED)', 'LIKE NEW', 'EXC++', 'EXC', 'GOOD', 'FAIR', 'PARTS'],
  [DefaultCategory.GAMES]:     ['SEALED', 'CIB', 'BOXED', 'LOOSE', 'D.O.A.'],
  [DefaultCategory.MUSIC]:     ['M (Mint)', 'NM', 'VG+', 'VG', 'G', 'P'],
  [DefaultCategory.MAGAZINES]: ['MINT', 'FINE', 'VERY GOOD', 'GOOD', 'FAIR', 'POOR'],
  [DefaultCategory.VIDEO]:     ['SEALED', 'MINT', 'EXC', 'GOOD', 'РАБОЧИЙ', 'НА ЗАПЧАСТИ'],
  [DefaultCategory.TOYS]:      ['MISB (Sealed)', 'MIB (Boxed)', 'LOOSE (Complete)', 'LOOSE (Incomplete)', 'BROKEN'],
  [DefaultCategory.COMPUTERS]: ['NOS (New Old Stock)', 'RESTORED', 'WORKING', 'UNTESTED', 'FOR PARTS'],
  [DefaultCategory.CAMERAS]:   ['MINT', 'NEAR MINT', 'EXC++', 'EXC', 'USER', 'UG', 'FOR PARTS'],
  [DefaultCategory.MISC]:      ['ИДЕАЛ', 'ХОРОШЕЕ', 'ПОТЁРТОЕ', 'ПОВРЕЖДЁННОЕ']
};

export const SUBCATEGORY_CONDITIONS: Record<string, string[]> = {
  // МУЗЫКА — медиа (стандарт Discogs)
  'Виниловые пластинки LP':      ['M (Mint)', 'NM', 'VG+', 'VG', 'G', 'P'],
  'Виниловые синглы (7" / EP)':  ['M (Mint)', 'NM', 'VG+', 'VG', 'G', 'P'],
  'Аудиокассеты':                ['M (Mint)', 'NM', 'VG+', 'VG', 'G', 'WORN'],
  'CD':                          ['SEALED', 'MINT', 'VG+', 'VG', 'SCRATCHED', 'BROKEN'],
  'MiniDisc':                    ['SEALED', 'MINT', 'VG+', 'VG', 'WORN'],
  '8-Track / Картриджи':         ['MINT', 'VG+', 'VG', 'WORN', 'BROKEN'],
  'Катушки / Бобины (Reel-to-Reel)': ['MINT', 'VG+', 'VG', 'WORN', 'BROKEN'],

  // ВИДЕО — медиа
  'VHS':                         ['SEALED', 'MINT', 'VG+', 'VG', 'WORN', 'DAMAGED'],
  'Betamax':                     ['SEALED', 'MINT', 'VG+', 'VG', 'WORN', 'DAMAGED'],
  'LaserDisc':                   ['SEALED', 'MINT', 'VG+', 'VG', 'SCRATCHED', 'DAMAGED'],
  'Video CD (VCD)':              ['SEALED', 'MINT', 'VG+', 'VG', 'SCRATCHED'],
  'DVD':                         ['SEALED', 'MINT', 'VG+', 'VG', 'SCRATCHED'],
  'Blu-ray (коллекционные издания)': ['SEALED', 'MINT', 'VG+', 'VG', 'SCRATCHED'],

  // ВИДЕО — AV-техника (стандарт eBay Vintage Electronics)
  'Видеомагнитофоны / VCR':      ['NOS', 'MINT', 'EXC', 'GOOD', 'РАБОЧИЙ', 'НЕТЕСТИРОВАННЫЙ', 'НА ЗАПЧАСТИ'],
  'Проекторы':                   ['NOS', 'MINT', 'EXC', 'GOOD', 'РАБОЧИЙ', 'НЕТЕСТИРОВАННЫЙ', 'НА ЗАПЧАСТИ'],
  'Телевизоры (CRT / ламповые)': ['NOS', 'MINT', 'EXC', 'GOOD', 'РАБОЧИЙ', 'НЕТЕСТИРОВАННЫЙ', 'НА ЗАПЧАСТИ'],
  'Hi-Fi Компоненты (усилители, ресиверы, вертушки)': ['NOS', 'MINT', 'EXC', 'GOOD', 'РАБОЧИЙ', 'НЕТЕСТИРОВАННЫЙ', 'НА ЗАПЧАСТИ'],
  'Магнитофоны (катушечные / кассетные деки)': ['NOS', 'MINT', 'EXC', 'GOOD', 'РАБОЧИЙ', 'НЕТЕСТИРОВАННЫЙ', 'НА ЗАПЧАСТИ'],
  'Радиоприёмники':              ['NOS', 'MINT', 'EXC', 'GOOD', 'РАБОЧИЙ', 'НЕТЕСТИРОВАННЫЙ', 'НА ЗАПЧАСТИ'],

  // ИГРЫ — картриджи / диски (стандарт игровых коллекционеров: CIB)
  'Картриджи 8-bit (Famicom / Atari / Sega MS)':   ['SEALED', 'CIB (Коробка+Мануал)', 'BOXED (Коробка)', 'LOOSE (Картридж)', 'D.O.A.'],
  'Картриджи 16-bit (SNES / Mega Drive / Neo Geo)': ['SEALED', 'CIB (Коробка+Мануал)', 'BOXED (Коробка)', 'LOOSE (Картридж)', 'D.O.A.'],
  'Картриджи 32/64-bit (N64 / GBA)':               ['SEALED', 'CIB (Коробка+Мануал)', 'BOXED (Коробка)', 'LOOSE (Картридж)', 'D.O.A.'],
  'Диски (CD / DVD / GD-ROM)':   ['SEALED', 'CIB', 'BOXED', 'LOOSE', 'SCRATCHED', 'D.O.A.'],
  'Портативные консоли':         ['SEALED', 'MINT', 'EXC', 'GOOD', 'РАБОЧАЯ', 'НА ЗАПЧАСТИ'],
  'Стационарные консоли':        ['SEALED', 'MINT', 'EXC', 'GOOD', 'РАБОЧАЯ', 'НА ЗАПЧАСТИ'],
  'Аркадные автоматы / PCB':     ['РАБОЧИЙ (JAMMA Ready)', 'РАБОЧИЙ', 'ТРЕБУЕТ РЕМОНТА', 'НА ЗАПЧАСТИ'],

  // КОМПЬЮТЕРЫ — специфические подкатегории
  'Носители (Floppy / ZIP / Tape)': ['SEALED', 'TESTED OK', 'UNTESTED', 'BAD SECTORS', 'FAILED'],
  'Программное обеспечение (ПО, игры на дискетах/CD)': ['SEALED', 'CIB (С Мануалом)', 'BOXED', 'MEDIA ONLY'],
  'Документация / Мануалы':      ['MINT', 'FINE', 'GOOD', 'FAIR', 'POOR'],

  // КАМЕРЫ — стандарт KEH Camera / Japan Camera
  'Объективы и оптика':          ['MINT', 'NEAR MINT', 'EXC++', 'EXC', 'USER', 'FUNGUS/HAZE', 'UG'],
  'Polaroid / Instax / Моментальные': ['WORKING', 'TESTED', 'UNTESTED', 'FOR PARTS'],

  // ИГРУШКИ — стандарт коллекционеров (MISB/MIB)
  'Action Figures / Фигурки':    ['MISB (Запечатан)', 'MIB (В коробке)', 'MOC (На карте)', 'LOOSE (Полный)', 'LOOSE (Неполный)', 'СЛОМАН'],
  'Конструкторы (LEGO / Meccano / советские)': ['MISB', 'MIB (Полный)', 'MIB (Неполный)', 'LOOSE (Полный)', 'LOOSE (Неполный)', 'СЛОМАН'],
  'Мягкие игрушки':              ['НОВАЯ (С бирками)', 'ОТЛИЧНОЕ', 'ХОРОШЕЕ', 'ПОТЁРТОЕ', 'НА РЕМОНТ'],
  'Роботы и электронные игрушки': ['SEALED', 'MINT', 'РАБОЧИЙ', 'НЕТЕСТИРОВАННЫЙ', 'НА ЗАПЧАСТИ'],
  'Настольные игры':             ['SEALED', 'ПОЛНЫЙ КОМПЛЕКТ', 'НЕПОЛНЫЙ КОМПЛЕКТ', 'КОМПОНЕНТЫ'],
  'Куклы и аксессуары':          ['MISB', 'MIB', 'LOOSE (Полная)', 'LOOSE (Неполная)', 'ПОВРЕЖДЕНА'],
  'Моделизм (пластиковые модели)': ['SEALED', 'СОБРАН+ПОКРАШЕН', 'СОБРАН', 'ЧАСТИЧНО СОБРАН', 'ЗАПЧАСТИ'],
  'Радиоуправляемые модели (ретро RC)': ['РАБОЧАЯ', 'ТРЕБУЕТ ОБСЛУЖИВАНИЯ', 'НЕПОЛНАЯ', 'НА ЗАПЧАСТИ'],
};

export const getArtifactTier = (item: Exhibit): TierType => {
    if (item.title.toUpperCase().includes('CURSED') || (item.title === 'вфуфвф' && (item.owner === 'Truester' || item.owner === '@Truester'))) return 'CURSED';
    
    const score = (item.likes * 25) + ((item.comments?.length || 0) * 10) + item.views;
    if (score >= 50000) return 'MYTHIC';
    if (score >= 10000) return 'LEGENDARY';
    if (score >= 2000) return 'EPIC';
    if (score >= 500) return 'RARE';
    if (score >= 100) return 'UNCOMMON';
    return 'COMMON';
};

// Enhanced Glows
export const TIER_CONFIG: Record<TierType, any> = {
    COMMON: { name: 'COMMON', color: 'text-gray-500', bgColor: 'bg-gray-500/20', borderDark: 'border-dark-dim', badge: 'bg-gray-500 text-white', icon: User, shadow: '' },
    UNCOMMON: { name: 'UNCOMMON', color: 'text-green-400', bgColor: 'bg-green-500/20', borderDark: 'border-green-500 shadow-[0_0_10px_rgba(74,222,128,0.4)]', badge: 'bg-green-600 text-white', icon: Circle, shadow: 'shadow-[0_0_10px_rgba(74,222,128,0.3)]' },
    RARE: { name: 'RARE', color: 'text-cyan-500', bgColor: 'bg-cyan-500/20', borderDark: 'border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.5)]', badge: 'bg-cyan-600 text-white', icon: Award, shadow: 'shadow-[0_0_20px_rgba(6,182,212,0.4)]', glow: true },
    EPIC: { name: 'EPIC', color: 'text-purple-500', bgColor: 'bg-purple-500/20', borderDark: 'border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.6)]', badge: 'bg-purple-600 text-white', icon: Flame, shadow: 'shadow-[0_0_30px_rgba(168,85,247,0.5)]', glow: true },
    LEGENDARY: { name: 'LEGENDARY', color: 'text-yellow-500', bgColor: 'bg-yellow-500/20', borderDark: 'border-yellow-500 shadow-[0_0_40px_rgba(234,179,8,0.7)]', badge: 'bg-gradient-to-r from-yellow-600 to-red-600 text-white', icon: Zap, shadow: 'shadow-[0_0_40px_rgba(234,179,8,0.6)]', glow: true },
    MYTHIC: { name: 'MYTHIC', color: 'text-pink-500', bgColor: 'bg-pink-500/20', borderDark: 'border-pink-500 shadow-[0_0_50px_rgba(236,72,153,0.8)]', badge: 'bg-gradient-to-r from-pink-600 to-purple-600 text-white', icon: Crown, shadow: 'shadow-[0_0_50px_rgba(236,72,153,0.7)]', glow: true },
    CURSED: { name: 'CURSED', color: 'text-red-500', bgColor: 'bg-red-500/20', borderDark: 'border-red-600 shadow-[0_0_40px_rgba(239,68,68,0.8)] animate-pulse-slow', badge: 'bg-red-600 text-white font-black italic', icon: Ghost, shadow: 'shadow-[0_0_40px_rgba(220,38,38,0.7)] animate-pulse' }
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
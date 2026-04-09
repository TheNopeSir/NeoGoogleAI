// ============================================================
// Классический пак колобков (standart_dark_skin)
// emoji → filename в /public/koloboks/
// ============================================================

// Mapping: emoji → файл
const KOLOBOK_MAP: Record<string, string> = {

    // --- Лица ---
    '😀': 'smile3.gif',       // улыбка
    '😊': 'blum2.gif',        // блюм счастливый
    '🤗': 'blum3.gif',        // блюм радостный
    '😂': 'laugh2.gif',       // смех до слёз
    '🤣': 'rofl.gif',         // катается от смеха
    '😘': 'air_kiss.gif',     // воздушный поцелуй
    '😇': 'angel.gif',        // ангел
    '😡': 'aggressive.gif',   // агрессивный
    '😢': 'sad.gif',          // грустный
    '😭': 'cray.gif',         // рыдает
    '😉': 'wink3.gif',        // подмигивает
    '😎': 'dirol.gif',        // крутой в очках (dirol!)
    '😳': 'blush2.gif',       // краснеет
    '😏': 'boast.gif',        // хвастается / смирк
    '🤪': 'crazy.gif',        // сумасшедший
    '🤔': 'sclerosis.gif',    // думает / склероз
    '🤷': 'dntknw.gif',       // не знаю
    '😐': 'mda.gif',          // мда / нейтральный
    '😛': 'mosking.gif',      // дразнится
    '😝': 'taunt.gif',        // дразнит
    '😜': 'snooks.gif',       // озорной подмиг
    '🙄': 'sarcasm.gif',      // закатывает глаза
    '😒': 'sarcastic.gif',    // саркастичный
    '😑': 'sarcastic_blum.gif', // саркастичный блюм
    '😱': 'scare2.gif',       // в панике
    '😤': 'stinker.gif',      // пыхтит
    '😰': 'acute.gif',        // в ужасе
    '🙏': 'sorry.gif',        // извини / пожалуйста
    '😔': 'sorry2.gif',       // расстроен
    '😴': 'lazy.gif',         // ленивый / спит
    '🤦': 'facepalm.gif',     // фейспалм
    '🧐': 'umnik2.gif',       // умник
    '🧙': 'wizard.gif',       // волшебник
    '🦸': 'neo.gif',          // нео / герой
    '💪': 'new_russian.gif',  // качок
    '😮': 'wow.gif',          // вау / удивлён

    // --- Активности ---
    '💃': 'dance2.gif',       // танцует
    '🎵': 'music.gif',        // слушает музыку
    '🎶': 'music2.gif',       // музыкальные ноты
    '👏': 'clapping.gif',     // аплодирует
    '🥂': 'drinks.gif',       // тост / за встречу
    '🍺': 'alcoholic.gif',    // пьёт пиво
    '🚬': 'smoke.gif',        // курит
    '🏃': 'dash1.gif',        // бежит
    '💅': 'spruce_up.gif',    // прихорашивается
    '🤩': 'fan_1.gif',        // фанат / звезда
    '🎮': 'gamer4.gif',       // геймер

    // --- Общение / объекты ---
    '📧': 'mail1.gif',        // письмо
    '📞': 'telephone.gif',    // телефон
    '📱': 'buba_phone.gif',   // мобильный телефон
    '🫶': 'thank_you.gif',    // спасибо
    '💝': 'thank_you2.gif',   // спасибо с сердцем
    '⚽': 'spartak.gif',      // футбол
    '🇷🇺': 'russian.gif',    // Россия
    '🌞': 'sun_bespectacled.gif', // солнышко в очках
    '🤞': 'superstition.gif', // пальцы скрещены
    '🚫': 'banned.gif',       // заблокирован
    '✋': 'stop.gif',          // стоп

    // --- Согласие / несогласие ---
    '👌': 'agree.gif',        // окей / согласен
    '👍': 'thumbsup.svg',     // лайк
    '👎': 'bad.gif',          // плохо / не нравится
    '🙅': 'nea.gif',          // ни за что / неа
    '🙁': 'negative.gif',     // негативный
    '🎉': 'yahoo.gif',        // ура!
    '✅': 'yes2.gif',          // да / чекмарк
    '☑️': 'yes3.gif',         // да / галочка
    '💯': 'yes4.gif',          // сто из ста
    '🫵': 'yu.gif',           // тычет пальцем на тебя
    '😗': 'whistle2.gif',     // насвистывает
    '🎊': 'whistle3.gif',     // праздник / конфетти

    // --- Символы (SVG для иконок без колобка) ---
    '❤️': 'heart.svg',
    '🔥': 'fire.svg',
    '🏆': 'trophy.svg',
    '💎': 'diamond.svg',
    '👀': 'eyes.svg',
    '💀': 'skull.svg',
    '⭐': 'star.svg',
    '🚀': 'rocket.svg',
    '🎯': 'target.svg',
    '✌️': 'peace.gif',        // победа / мир
    '🙌': 'clapping.gif',     // обе руки аплодируют
    '🤝': 'handshake.svg',
};

// Полный упорядоченный список для пикера (по категориям)
export const KOLOBOK_LIST: string[] = [
    // Лица
    '😀', '😊', '🤗', '😂', '🤣', '😘', '😇', '😡',
    '😢', '😭', '😉', '😎', '😳', '😏', '🤪', '🤔',
    '🤷', '😐', '😛', '😝', '😜', '🙄', '😒', '😑',
    '😱', '😤', '😰', '🙏', '😔', '😴', '🤦', '🧐',
    '🧙', '🦸', '💪', '😮',
    // Активности
    '💃', '🎵', '🎶', '👏', '🥂', '🍺', '🚬', '🏃',
    '💅', '🤩', '🎮',
    // Общение
    '📧', '📞', '📱', '🫶', '💝', '⚽', '🇷🇺', '🌞',
    '🤞', '🚫', '✋',
    // Согласие / несогласие
    '👌', '👍', '👎', '🙅', '🙁', '🎉', '✅', '💯',
    '🫵', '😗', '🎊', '✌️',
    // Символы
    '❤️', '🔥', '🏆', '💎', '👀', '💀', '⭐', '🚀',
    '🎯', '🙌', '🤝',
];

// Быстрые реакции (8 самых популярных)
export const QUICK_REACTIONS: string[] = [
    '❤️', '😀', '😂', '😢', '😡', '👍', '🙄', '🎉',
];

export function getKolobokSrc(emoji: string): string | null {
    const file = KOLOBOK_MAP[emoji];
    return file ? `/koloboks/${file}` : null;
}

export function splitTextWithEmoji(text: string): Array<{ type: 'text' | 'emoji'; value: string }> {
    const keys = Object.keys(KOLOBOK_MAP);
    if (!keys.length || !text) return [{ type: 'text', value: text }];
    const escaped = [...keys]
        .sort((a, b) => b.length - a.length)
        .map(e => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(${escaped.join('|')})`, 'gu');
    const result: Array<{ type: 'text' | 'emoji'; value: string }> = [];
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
        if (m.index > last) result.push({ type: 'text', value: text.slice(last, m.index) });
        result.push({ type: 'emoji', value: m[0] });
        last = regex.lastIndex;
    }
    if (last < text.length) result.push({ type: 'text', value: text.slice(last) });
    return result;
}

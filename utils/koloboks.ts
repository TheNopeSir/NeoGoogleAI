// ============================================================
// Классический пак колобков (standart_dark_skin)
// emoji → filename в /public/koloboks/
// ============================================================

// Mapping: emoji → файл (только файлы из оригинального пака standart_dark_skin)
const KOLOBOK_MAP: Record<string, string> = {

    // --- Лица ---
    '😀': 'smile3.gif',         // улыбка
    '🤗': 'blum3.gif',          // блюм радостный
    '😂': 'laugh2.gif',         // смех до слёз
    '🤣': 'rofl.gif',           // катается от смеха
    '😇': 'angel.gif',          // ангел
    '😎': 'dirol.gif',          // крутой в очках (dirol!)
    '😛': 'mosking.gif',        // дразнится
    '😉': 'wink3.gif',          // подмигивает
    '😳': 'blush2.gif',         // краснеет
    '😏': 'boast.gif',          // хвастается
    '🤪': 'crazy.gif',          // сумасшедший
    '🤔': 'sclerosis.gif',      // думает / склероз
    '🤷': 'dntknw.gif',         // не знаю
    '😐': 'mda.gif',            // мда / нейтральный
    '🙄': 'sarcasm.gif',        // закатывает глаза
    '😒': 'sarcastic.gif',      // саркастичный
    '😑': 'sarcastic_blum.gif', // саркастичный блюм
    '😱': 'scare2.gif',         // в панике
    '😤': 'stinker.gif',        // пыхтит
    '😰': 'acute.gif',          // в ужасе
    '🙏': 'sorry.gif',          // извини / пожалуйста
    '😴': 'lazy.gif',           // ленивый / спит
    '🤦': 'facepalm.gif',       // фейспалм
    '🧐': 'umnik2.gif',         // умник
    '🦸': 'neo.gif',            // нео / герой
    '💪': 'new_russian.gif',    // качок
    '😢': 'sad.gif',            // грустный

    // --- Активности ---
    '💃': 'dance2.gif',         // танцует
    '🎵': 'music.gif',          // слушает музыку
    '🎶': 'music2.gif',         // музыкальные ноты
    '😗': 'whistle2.gif',       // насвистывает
    '🎊': 'whistle3.gif',       // праздник / свист
    '👏': 'clapping.gif',       // аплодирует
    '🚬': 'smoke.gif',          // курит
    '🎮': 'gamer4.gif',         // геймер

    // --- Общение / объекты ---
    '📧': 'mail1.gif',          // письмо
    '🫶': 'thank_you.gif',      // спасибо
    '💝': 'thank_you2.gif',     // спасибо с сердцем
    '🇷🇺': 'russian.gif',      // Россия
    '🌞': 'sun_bespectacled.gif', // солнышко в очках
    '✋': 'stop.gif',            // стоп

    // --- Согласие / несогласие ---
    '👌': 'agree.gif',          // окей / согласен
    '👎': 'bad.gif',            // плохо
    '🙁': 'negative.gif',       // негативный
    '🎉': 'yahoo.gif',          // ура!
    '✅': 'yes2.gif',            // да / чекмарк
    '☑️': 'yes3.gif',           // да / галочка
    '💯': 'yes4.gif',            // сто из ста
    '🫵': 'yu.gif',             // тычет пальцем
    '🙌': 'clapping.gif',       // обе руки
};

// Полный упорядоченный список для пикера (строго по файлам из пака)
export const KOLOBOK_LIST: string[] = [
    // Лица: позитив
    '😀', '🤗', '😂', '🤣', '😎', '😇', '😉',
    // Лица: подшучивание
    '😛', '😳', '😏', '🤪',
    // Лица: задумчивость / нейтраль
    '🤔', '🤷', '😐', '🧐',
    // Лица: сарказм
    '🙄', '😒', '😑',
    // Лица: злость / страх
    '😱', '😤', '😰', '😢',
    // Лица: прочие
    '🙏', '😴', '🤦', '🦸', '💪',
    // Активности
    '💃', '🎵', '🎶', '😗', '🎊', '👏', '🙌', '🚬', '🎮',
    // Общение / объекты
    '📧', '🫶', '💝', '🇷🇺', '🌞', '✋',
    // Согласие / несогласие
    '👌', '👎', '🙁', '🎉', '✅', '☑️', '💯', '🫵',
];

// Быстрые реакции — только из оригинального пака
export const QUICK_REACTIONS: string[] = [
    '😀', '😂', '🤣', '😎', '😢', '🙄', '🎉', '👌',
];

export function getKolobokSrc(emoji: string): string | null {
    const file = KOLOBOK_MAP[emoji];
    return file ? `/koloboks/${file}` : null;
}

// ============================================================
// Frequency tracking — stored in localStorage per user
// ============================================================

/** Increment use-count for a kolobok emoji */
export function trackKolobokUse(username: string, emoji: string): void {
    if (!username || !emoji) return;
    try {
        const key = `kolobok_freq_${username}`;
        const freq: Record<string, number> = JSON.parse(localStorage.getItem(key) || '{}');
        freq[emoji] = (freq[emoji] || 0) + 1;
        localStorage.setItem(key, JSON.stringify(freq));
    } catch {}
}

/**
 * Returns up to `count` emojis sorted by personal use-frequency.
 * Falls back to `fallback` list to fill remaining slots (no duplicates).
 */
export function getFrequentKoloboks(
    username: string,
    fallback: string[],
    count: number = 8,
): string[] {
    if (!username) return fallback.slice(0, count);
    try {
        const key = `kolobok_freq_${username}`;
        const freq: Record<string, number> = JSON.parse(localStorage.getItem(key) || '{}');
        // Only include emojis that are in the known pack
        const sorted = Object.entries(freq)
            .filter(([e]) => KOLOBOK_LIST.includes(e))
            .sort(([, a], [, b]) => b - a)
            .map(([e]) => e);
        // Fill remaining slots with fallback (no duplicates)
        const result = [...sorted];
        for (const e of fallback) {
            if (result.length >= count) break;
            if (!result.includes(e)) result.push(e);
        }
        return result.slice(0, count);
    } catch {
        return fallback.slice(0, count);
    }
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

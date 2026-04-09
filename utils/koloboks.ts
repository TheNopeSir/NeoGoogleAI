// Canonical ordered list for pickers — one entry per unique kolobok
export const KOLOBOK_LIST: string[] = [
    // Лица
    '😀', '😂', '🤣', '🥰', '😍', '🤩', '😎', '😮',
    '😢', '😡', '🤔', '😅', '😏', '😇', '😉', '😛',
    '😬', '🤷', '🥴', '🫠', '🤯', '🤖', '👾', '🫡',
    // Символы
    '❤️', '🔥', '👍', '👎', '💯', '🎉', '🏆', '💎',
    '👀', '💀', '⭐', '💪', '🚀', '🎮', '🕹️', '📺',
    '🎯', '✌️', '🙌', '🤝',
];

// Mapping of emoji characters to ICQ kolobok filenames (with extension)
// GIF = real classic ICQ koloboks from kolobok.us collection
// SVG = custom icons for non-face symbols
const KOLOBOK_MAP: Record<string, string> = {
    // --- Лица: настоящие ICQ-колобки (GIF) ---
    '😀': 'smile.gif',
    '😂': 'laugh.gif',
    '🤣': 'rofl.gif',
    '🥰': 'love.gif',
    '😍': 'kiss.gif',
    '🤩': 'biggrin.gif',
    '😎': 'cool.gif',
    '😮': 'wow.gif',
    '😢': 'sad.gif',
    '😭': 'sad.gif',
    '😡': 'angry.gif',
    '😤': 'angry.gif',
    '🤔': 'think.gif',
    '😅': 'sweat.gif',
    '😏': 'smirk.gif',
    '😇': 'angel.gif',
    '😉': 'wink.gif',
    '😛': 'tongue.gif',
    '😝': 'tongue.gif',
    '😬': 'rolleyes.gif',
    '🤷': 'dunno.gif',
    '🥴': 'woozy.svg',
    '🥹': 'sweat.gif',
    '🫠': 'melting.svg',
    '🤯': 'mindblown.svg',
    '🤖': 'robot.svg',
    '👾': 'alien.svg',
    '🫡': 'salute.svg',
    // --- Символы: SVG-иконки ---
    '❤️': 'heart.svg',
    '🔥': 'fire.svg',
    '👍': 'thumbsup.svg',
    '👎': 'thumbsdown.svg',
    '💯': '100.svg',
    '🎉': 'party.svg',
    '🏆': 'trophy.svg',
    '💎': 'diamond.svg',
    '👀': 'eyes.svg',
    '💀': 'skull.svg',
    '⭐': 'star.svg',
    '💪': 'strong.svg',
    '🚀': 'rocket.svg',
    '🎮': 'game.svg',
    '🕹️': 'joystick.svg',
    '📺': 'tv.svg',
    '🎯': 'target.svg',
    '✌️': 'victory.svg',
    '🙌': 'clap.svg',
    '🤝': 'handshake.svg',
};

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

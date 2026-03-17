import React from 'react';
import { LucideIcon } from 'lucide-react';
import XpIcon from './XpIcon';

type Theme = 'dark' | 'light' | 'xp' | 'winamp';

interface MatrixIconProps {
  icon: LucideIcon;
  size?: number;
  /** Цвет иконки. По умолчанию — зелёный неон для dark/winamp, текущий цвет для light/xp */
  color?: string;
  /** Интенсивность свечения (0 = выключено, 1 = стандартно, 2 = ярко) */
  glow?: 0 | 1 | 2;
  theme: Theme;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
}

const NEON_PRESETS: Record<string, { color: string; shadow: string[] }> = {
  green:  { color: '#4ade80', shadow: ['0 0 4px #4ade80', '0 0 10px #4ade8066'] },
  lime:   { color: '#00ff00', shadow: ['0 0 4px #00ff00', '0 0 12px #00ff0066'] },
  red:    { color: '#f87171', shadow: ['0 0 4px #f87171', '0 0 10px #f8717166'] },
  blue:   { color: '#60a5fa', shadow: ['0 0 4px #60a5fa', '0 0 10px #60a5fa66'] },
  yellow: { color: '#fbbf24', shadow: ['0 0 4px #fbbf24', '0 0 10px #fbbf2466'] },
  purple: { color: '#a78bfa', shadow: ['0 0 4px #a78bfa', '0 0 10px #a78bfa66'] },
  pink:   { color: '#f472b6', shadow: ['0 0 4px #f472b6', '0 0 10px #f472b666'] },
  cyan:   { color: '#22d3ee', shadow: ['0 0 4px #22d3ee', '0 0 10px #22d3ee66'] },
  orange: { color: '#fb923c', shadow: ['0 0 4px #fb923c', '0 0 10px #fb923c66'] },
  white:  { color: '#e2e8f0', shadow: ['0 0 4px #e2e8f0', '0 0 8px #e2e8f044'] },
};

/** Угадывает неоновый пресет по CSS-цвету строке */
function resolvePreset(color: string): { color: string; shadow: string[] } {
  const c = color.toLowerCase();
  if (c.includes('red') || c === '#f87171' || c === '#ef4444') return NEON_PRESETS.red;
  if (c.includes('blue') || c === '#60a5fa' || c === '#3b82f6') return NEON_PRESETS.blue;
  if (c.includes('yellow') || c === '#fbbf24' || c === '#eab308' || c === '#ffd700') return NEON_PRESETS.yellow;
  if (c.includes('purple') || c === '#a78bfa' || c === '#8b5cf6') return NEON_PRESETS.purple;
  if (c.includes('pink') || c === '#f472b6' || c === '#ec4899') return NEON_PRESETS.pink;
  if (c.includes('cyan') || c === '#22d3ee' || c === '#06b6d4') return NEON_PRESETS.cyan;
  if (c.includes('orange') || c === '#fb923c' || c === '#f97316') return NEON_PRESETS.orange;
  if (c === '#00ff00' || c === '#00ea00') return NEON_PRESETS.lime;
  if (c.includes('green') || c === '#4ade80' || c === '#22c55e') return NEON_PRESETS.green;
  // Произвольный hex — строим glow на его основе
  return { color, shadow: [`0 0 4px ${color}`, `0 0 10px ${color}66`] };
}

const MatrixIcon: React.FC<MatrixIconProps> = ({
  icon: Icon,
  size = 16,
  color,
  glow = 1,
  theme,
  className = '',
  style,
  onClick,
}) => {
  const isNeon = theme === 'dark' || theme === 'winamp';

  // XP тема — спрайтовые иконки Win XP
  if (theme === 'xp') {
    return (
      <XpIcon
        icon={Icon}
        size={size}
        className={className}
        style={style}
        onClick={onClick}
      />
    );
  }

  // Светлая тема — рендерим иконку без изменений
  if (!isNeon) {
    return (
      <Icon
        size={size}
        className={className}
        style={style}
        onClick={onClick}
      />
    );
  }

  // Определяем цвет
  const resolvedColor = color ?? (theme === 'winamp' ? '#00ff00' : '#4ade80');
  const preset = resolvePreset(resolvedColor);

  // Строим filter на основе интенсивности glow
  let filter = '';
  if (glow === 1) {
    filter = `drop-shadow(${preset.shadow[0]}) drop-shadow(${preset.shadow[1]})`;
  } else if (glow === 2) {
    filter = [
      `drop-shadow(${preset.shadow[0]})`,
      `drop-shadow(${preset.shadow[0]})`,
      `drop-shadow(${preset.shadow[1]})`,
    ].join(' ');
  }

  const iconStyle: React.CSSProperties = {
    color: preset.color,
    filter: filter || undefined,
    transition: 'filter 0.2s ease, color 0.2s ease',
    ...style,
  };

  return (
    <Icon
      size={size}
      className={className}
      style={iconStyle}
      onClick={onClick}
    />
  );
};

export default MatrixIcon;

// ── Хелпер для семантических цветов ──────────────────────────────────────────

/** Возвращает hex-цвет для семантического типа события/статуса */
export function neonColor(
  semantic: 'like' | 'comment' | 'follow' | 'trade' | 'warn' | 'success' | 'battle' | 'grail' | 'legend'
): string {
  switch (semantic) {
    case 'like':    return '#f87171';
    case 'comment': return '#60a5fa';
    case 'follow':  return '#4ade80';
    case 'trade':   return '#fbbf24';
    case 'warn':    return '#fb923c';
    case 'success': return '#4ade80';
    case 'battle':  return '#f472b6';
    case 'grail':   return '#ffd700';
    case 'legend':  return '#fbbf24';
    default:        return '#4ade80';
  }
}

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { XP_SVG_MAP } from './WinXpIcons';

// ─── Component ────────────────────────────────────────────────────────────────
// Renders a WinXP-style SVG icon for the given Lucide icon.
// Falls back to the original Lucide SVG when no custom icon exists.
// ─────────────────────────────────────────────────────────────────────────────

interface XpIconProps {
  /** Lucide icon — resolved via displayName to an XP SVG component */
  icon: LucideIcon;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
}

const XpIcon: React.FC<XpIconProps> = ({
  icon: Icon,
  size = 16,
  className = '',
  style,
  onClick,
}) => {
  const name = (Icon as unknown as { displayName?: string }).displayName ?? '';
  const renderer = XP_SVG_MAP[name];

  // No SVG for this icon → fall back to original Lucide SVG
  if (!renderer) {
    return (
      <Icon size={size} className={className} style={style} onClick={onClick} />
    );
  }

  return (
    <span
      className={className}
      style={{
        display:       'inline-block',
        width:         size,
        height:        size,
        flexShrink:    0,
        verticalAlign: 'middle',
        lineHeight:    0,
        ...style,
      }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      {renderer(size)}
    </span>
  );
};

export default XpIcon;

/**
 * XI — Theme-aware icon wrapper.
 *
 * Drop-in replacement for any Lucide icon:
 *   Before:  <Heart size={16} className="text-red-400" />
 *   After:   <XI icon={Heart} size={16} className="text-red-400" />
 *
 * In XP theme → renders WinXP PNG from /public/icons/xp/
 * In other themes → renders the original Lucide SVG
 *
 * Reads the current theme from ThemeContext (set in App.tsx),
 * so no `theme` prop is needed at the call site.
 */
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { useTheme } from './ThemeContext';
import XpIcon from './XpIcon';

interface XIProps {
  icon: LucideIcon;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
  // Lucide-specific props (used in non-XP themes, ignored in XP)
  color?: string;
  strokeWidth?: number;
  fill?: string;
  [key: string]: unknown;
}

const XI: React.FC<XIProps> = ({
  icon: Icon,
  size = 16,
  className,
  style,
  onClick,
  color,
  fill,
  strokeWidth,
  ...rest
}) => {
  const theme = useTheme();

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

  return (
    <Icon
      size={size}
      className={className}
      style={style}
      onClick={onClick}
      color={color}
      fill={fill}
      strokeWidth={strokeWidth}
      {...(rest as Record<string, unknown>)}
    />
  );
};

export default XI;

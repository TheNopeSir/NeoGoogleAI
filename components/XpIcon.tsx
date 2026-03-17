import React from 'react';
import { LucideIcon } from 'lucide-react';

// ─── Sprite layout ────────────────────────────────────────────────────────────
// File: /public/icons/xp-icons.png
// Size: 2016 × 2128 px  |  Grid: 21 cols × 22 rows  |  Cell: 96 × 96 px
//
// To adjust a position: change { row, col } for the icon you need.
// Visual helper: open /public/icons/xp-icons.png and count from top-left (0-based).
// ─────────────────────────────────────────────────────────────────────────────

const SPRITE_CELL = 96;
const SPRITE_W = 2016;
const SPRITE_H = 2128;

interface XpDef {
  row: number;
  col: number;
}

/**
 * Map of Lucide icon display-names → sprite grid position.
 * Row 0 is the top row, col 0 is the leftmost column.
 */
export const XP_ICON_MAP: Record<string, XpDef> = {
  // ── Row 0: Navigation arrows ────────────────────────────────────────────
  ArrowRight:       { row: 0, col: 0 },
  ArrowLeft:        { row: 0, col: 1 },
  ArrowRightLeft:   { row: 0, col: 2 },
  ArrowLeftRight:   { row: 0, col: 2 },
  ChevronLeft:      { row: 0, col: 3 },
  ChevronRight:     { row: 0, col: 4 },
  Check:            { row: 0, col: 5 },
  ChevronDown:      { row: 0, col: 6 },
  ChevronUp:        { row: 0, col: 7 },
  Clock:            { row: 0, col: 8 },
  Star:             { row: 0, col: 9 },
  BookmarkPlus:     { row: 0, col: 10 },
  Edit3:            { row: 0, col: 12 },
  Search:           { row: 0, col: 13 },

  // ── Row 1: Tools / Users / Apps ─────────────────────────────────────────
  Save:             { row: 1, col: 0 },
  Users:            { row: 1, col: 3 },
  User:             { row: 1, col: 4 },
  Github:           { row: 1, col: 5 },
  Chrome:           { row: 1, col: 6 },
  Gamepad2:         { row: 1, col: 7 },
  Shield:           { row: 1, col: 8 },
  BookOpen:         { row: 1, col: 9 },
  FolderOpen:       { row: 1, col: 11 },
  FolderPlus:       { row: 1, col: 13 },

  // ── Row 2: Camera / Video / Share ───────────────────────────────────────
  Video:            { row: 2, col: 0 },
  Camera:           { row: 2, col: 2 },
  Share2:           { row: 2, col: 3 },
  Share:            { row: 2, col: 4 },
  Link2:            { row: 2, col: 5 },

  // ── Row 3: Documents / Notes ────────────────────────────────────────────
  Layers:           { row: 3, col: 0 },
  Trash2:           { row: 3, col: 5 },
  Lock:             { row: 3, col: 6 },
  RefreshCw:        { row: 3, col: 8 },

  // ── Row 4: Internet / Email ─────────────────────────────────────────────
  Globe:            { row: 4, col: 0 },
  Mail:             { row: 4, col: 2 },
  Send:             { row: 4, col: 4 },

  // ── Row 5: Info / Status / Notifications ───────────────────────────────
  Info:             { row: 5, col: 0 },
  Bell:             { row: 5, col: 4 },
  MessageSquare:    { row: 5, col: 5 },
  MessageCircle:    { row: 5, col: 6 },

  // ── Row 6: Gamification / Achievements ─────────────────────────────────
  Heart:            { row: 6, col: 0 },
  Flame:            { row: 6, col: 2 },
  Sparkles:         { row: 6, col: 3 },
  Trophy:           { row: 6, col: 4 },
  Crown:            { row: 6, col: 5 },
  Award:            { row: 6, col: 7 },
  Zap:              { row: 6, col: 8 },

  // ── Row 7: Status alerts ────────────────────────────────────────────────
  AlertCircle:      { row: 7, col: 0 },
  X:                { row: 7, col: 1 },
  AlertTriangle:    { row: 7, col: 2 },
  CheckCircle:      { row: 7, col: 3 },
  CheckCircle2:     { row: 7, col: 3 },
  CheckCheck:       { row: 7, col: 3 },
  CheckSquare:      { row: 7, col: 3 },
  MinusCircle:      { row: 7, col: 4 },
  EyeOff:           { row: 7, col: 6 },
  Eye:              { row: 7, col: 5 },
  Key:              { row: 7, col: 8 },

  // ── Row 8: Packages / Archive / Folders ────────────────────────────────
  Archive:          { row: 8, col: 0 },
  Package:          { row: 8, col: 1 },
  PackageCheck:     { row: 8, col: 2 },
  PackageSearch:    { row: 8, col: 3 },
  Grid:             { row: 8, col: 9 },
  Tag:              { row: 8, col: 14 },

  // ── Row 9: Files / Docs ─────────────────────────────────────────────────
  Download:         { row: 9, col: 0 },
  Upload:           { row: 9, col: 1 },

  // ── Row 10: Commerce / Delivery ─────────────────────────────────────────
  DollarSign:       { row: 10, col: 0 },
  Wallet:           { row: 10, col: 1 },
  Gift:             { row: 10, col: 2 },
  Truck:            { row: 10, col: 6 },
  ShoppingBag:      { row: 10, col: 7 },

  // ── Row 11: Social / People ─────────────────────────────────────────────
  UserPlus:         { row: 11, col: 0 },
  UserCheck:        { row: 11, col: 1 },
  UserMinus:        { row: 11, col: 2 },

  // ── Row 12: Media / Player ──────────────────────────────────────────────
  TrendingUp:       { row: 12, col: 0 },
  Activity:         { row: 12, col: 1 },
  Radar:            { row: 12, col: 2 },

  // ── Row 13: System / Hardware ───────────────────────────────────────────
  Database:         { row: 13, col: 0 },
  Terminal:         { row: 13, col: 1 },
  Smartphone:       { row: 13, col: 4 },

  // ── Row 14: Misc ───────────────────────────────────────────────────────
  Target:           { row: 14, col: 0 },
  Crosshair:        { row: 14, col: 1 },
  Swords:           { row: 14, col: 2 },
  Wand2:            { row: 14, col: 5 },

  // ── Row 15: Network / Connectivity ─────────────────────────────────────
  WifiOff:          { row: 15, col: 3 },
  MapPin:           { row: 15, col: 5 },

  // ── Row 16: Ghost / Special ─────────────────────────────────────────────
  Ghost:            { row: 16, col: 6 },
  Moon:             { row: 16, col: 4 },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface XpIconProps {
  /** Lucide icon component — used to look up the sprite position */
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
  const def = XP_ICON_MAP[name];

  // No mapping → fall back to the original lucide icon
  if (!def) {
    return (
      <Icon size={size} className={className} style={style} onClick={onClick} />
    );
  }

  const scale = size / SPRITE_CELL;

  const containerStyle: React.CSSProperties = {
    display: 'inline-block',
    width: size,
    height: size,
    flexShrink: 0,
    backgroundImage: 'url(/icons/xp-icons.png)',
    backgroundSize: `${SPRITE_W * scale}px ${SPRITE_H * scale}px`,
    backgroundPosition: `-${def.col * size}px -${def.row * size}px`,
    backgroundRepeat: 'no-repeat',
    imageRendering: size < 24 ? 'pixelated' : 'auto',
    ...style,
  };

  return (
    <span
      className={className}
      style={containerStyle}
      onClick={onClick}
      aria-label={name}
      role={onClick ? 'button' : undefined}
    />
  );
};

export default XpIcon;

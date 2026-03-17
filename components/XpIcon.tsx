import React from 'react';
import { LucideIcon } from 'lucide-react';

// ─── Sprite layout ────────────────────────────────────────────────────────────
// File : /public/icons/xp-icons.png
// Size : 2016 × 2128 px  |  Grid: 21 cols × 22 rows  |  Cell: 96 × 96 px
//
// Positions verified by extracting 32 px row-strips from the sprite.
// To adjust: change { row, col } below (0-indexed, top-left = 0,0).
// ─────────────────────────────────────────────────────────────────────────────

const SPRITE_CELL = 96;
const SPRITE_W    = 2016;
const SPRITE_H    = 2128;

interface XpDef { row: number; col: number }

/**
 * Lucide displayName → sprite [row, col]
 *
 * Row reference (verified visually):
 *  R00 – ← → ⟺  < > ˅ ^ cabinet globe mail search
 *  R02 – user×4  users  github  chrome  gamepad  folders
 *  R03 – gray folder variants (plain, +plus, +check, +minus…)
 *  R05 – camera  video  download↓  share  music  CDs
 *  R06 – 💬×3  bell  mail  send  book  ✓  globes×10  ⚡
 *  R07 – windows  globes  ℹ️  ❓  ⚠️  🚫  ✗
 *  R08 – ❤ ⭐ 🔥 🔥 ✨ 🏆 👑 🎖 ⚡  drives
 *  R09 – ❓ ✗ ⚠️  🔒  ✓circle  (small status set)
 *  R10 – 📦×4  gift-hands  folder-hand  globe  bluetooth  wifi  notepad
 *  R11 – tan-folder×4  yellow-open  yellow-closed  +notepad  +edit  +plus  bookmarks
 *  R12 – 🗄️×3  folders  checklist  doc+pencil  +plus  stacked-papers  drives
 *  R13 – $  wallet  wallet-open  🎁  tag  🔄  printer×2  ?  🚚  search-user  👥  👥  shield×4
 *  R16 – (WMA…FLASH badges)  ℹ️  💾  ✏️doc  🗑️  doc  C:\  …
 *  R17 – 🔍  ⊞grid  👁️  ✏️pencil  ?  🚫  💾  doc  pencil+notepad  papers  ▶  …  bluetooth
 *  R19 – ⚔️  🎯  ⊕  📡  badge  gamepad  box  🪟  folder  🔑  drives
 *  R20 – C:\  db  shield  📈heartbeat  …  wand  …  wifi  ✗  📊  📱  📍  ⏰  👻
 *  R21 – drives×4  ↓download  🌙  wand  wifi  📱  📍  👻  🌙  🚫…
 */
export const XP_ICON_MAP: Record<string, XpDef> = {

  // ── Row 0: Navigation arrows ────────────────────────────────────────────
  ArrowLeft:        { row: 0, col: 0  },  // ← blue
  ArrowRight:       { row: 0, col: 1  },  // → blue
  ArrowLeftRight:   { row: 0, col: 2  },  // ⟺ swap
  ArrowRightLeft:   { row: 0, col: 2  },  // ⟺ swap
  ChevronLeft:      { row: 0, col: 5  },  // ‹
  ChevronRight:     { row: 0, col: 6  },  // ›
  ChevronDown:      { row: 0, col: 7  },  // ˅
  ChevronUp:        { row: 0, col: 8  },  // ˄
  Database:         { row: 0, col: 9  },  // filing cabinet
  Globe:            { row: 0, col: 11 },  // 🌐
  Search:           { row: 0, col: 16 },  // 🔍

  // ── Row 2: Social / Users / Apps ────────────────────────────────────────
  User:             { row: 2, col: 0  },  // single user
  UserCheck:        { row: 2, col: 1  },  // user + ✓
  UserMinus:        { row: 2, col: 2  },  // user + −
  UserPlus:         { row: 2, col: 3  },  // user + ＋
  Users:            { row: 2, col: 4  },  // group
  Github:           { row: 2, col: 5  },  // octocat
  Chrome:           { row: 2, col: 7  },  // Chrome logo
  Gamepad2:         { row: 2, col: 8  },  // controller

  // ── Row 3: Folder variants ───────────────────────────────────────────────
  FolderPlus:       { row: 3, col: 1  },  // folder + plus

  // ── Row 5: Media / Download / Share ─────────────────────────────────────
  Camera:           { row: 5, col: 0  },  // 📷
  Video:            { row: 5, col: 1  },  // 🎬
  Download:         { row: 5, col: 4  },  // ↓ down-arrow
  Share2:           { row: 5, col: 5  },  // share arrows
  Share:            { row: 5, col: 5  },  // share arrows

  // ── Row 6: Chat / Bell / Mail / Book / Globes ────────────────────────────
  MessageCircle:    { row: 6, col: 0  },  // 💬 blue bubble
  MessageSquare:    { row: 6, col: 1  },  // 💬 yellow bubble
  Bell:             { row: 6, col: 3  },  // 🔔
  Mail:             { row: 6, col: 4  },  // ✉️
  Send:             { row: 6, col: 5  },  // ✈️ paper plane
  BookOpen:         { row: 6, col: 6  },  // 📖
  Check:            { row: 6, col: 7  },  // ✓ green

  // ── Row 7: System status ─────────────────────────────────────────────────
  Info:             { row: 7, col: 11 },  // ℹ️  bubble
  AlertCircle:      { row: 7, col: 12 },  // ❓  bubble
  AlertTriangle:    { row: 7, col: 13 },  // ⚠️
  MinusCircle:      { row: 7, col: 14 },  // 🚫  no-symbol
  EyeOff:           { row: 7, col: 14 },  // 🚫  hidden = no-symbol
  X:                { row: 7, col: 15 },  // ✗  red X

  // ── Row 8: GAMIFICATION ─────────────────────────────────────────────────
  Heart:            { row: 8, col: 0  },  // ❤️
  Star:             { row: 8, col: 1  },  // ⭐
  Flame:            { row: 8, col: 2  },  // 🔥 (small)
  Sparkles:         { row: 8, col: 4  },  // ✨
  Trophy:           { row: 8, col: 5  },  // 🏆
  Crown:            { row: 8, col: 6  },  // 👑
  Award:            { row: 8, col: 7  },  // 🎖️
  Zap:              { row: 8, col: 8  },  // ⚡

  // ── Row 9: Status small / Lock / CheckCircle ─────────────────────────────
  Lock:             { row: 9, col: 3  },  // 🔒
  CheckCircle:      { row: 9, col: 4  },  // ✓ in circle
  CheckCircle2:     { row: 9, col: 4  },
  CheckCheck:       { row: 9, col: 4  },
  CheckSquare:      { row: 9, col: 4  },

  // ── Row 10: Packages / Boxes ─────────────────────────────────────────────
  Package:          { row: 10, col: 0 },  // 📦 cardboard box
  PackageCheck:     { row: 10, col: 1 },  // box variant
  PackageSearch:    { row: 10, col: 2 },  // box variant

  // ── Row 11: Yellow folders / Bookmarks ───────────────────────────────────
  FolderOpen:       { row: 11, col: 4 },  // 📂 yellow open
  BookmarkPlus:     { row: 11, col: 11},  // bookmark / flag

  // ── Row 12: Archive / Docs ───────────────────────────────────────────────
  Archive:          { row: 12, col: 0 },  // 🗄️ filing cabinet
  Layers:           { row: 12, col: 9 },  // stacked papers

  // ── Row 13: Commerce / Delivery / Shield ─────────────────────────────────
  DollarSign:       { row: 13, col: 0 },  // $
  Wallet:           { row: 13, col: 1 },  // 👜
  Gift:             { row: 13, col: 3 },  // 🎁
  Tag:              { row: 13, col: 4 },  // 🏷️
  RefreshCw:        { row: 13, col: 5 },  // 🔄
  Truck:            { row: 13, col: 9 },  // 🚚
  ShoppingBag:      { row: 13, col: 11},  // 👥 repurposed (community/shop)
  Shield:           { row: 13, col: 13},  // 🛡️

  // ── Row 16: Save / Edit / Trash ──────────────────────────────────────────
  Save:             { row: 16, col: 10},  // 💾 floppy disk
  Edit3:            { row: 16, col: 11},  // ✏️ pencil on doc
  Trash2:           { row: 16, col: 12},  // 🗑️ trash bin

  // ── Row 17: Grid / Eye ───────────────────────────────────────────────────
  Grid:             { row: 17, col: 1 },  // ⊞ 4-square
  Eye:              { row: 17, col: 2 },  // 👁️

  // ── Row 19: Battle / Game ────────────────────────────────────────────────
  Swords:           { row: 19, col: 0 },  // ⚔️
  Target:           { row: 19, col: 1 },  // 🎯
  Crosshair:        { row: 19, col: 2 },  // ⊕
  Radar:            { row: 19, col: 3 },  // 📡

  // ── Row 20: Terminal / Activity / Misc ───────────────────────────────────
  Terminal:         { row: 20, col: 0 },  // C:\>
  Activity:         { row: 20, col: 3 },  // heartbeat / EKG
  Wand2:            { row: 20, col: 6 },  // ✨ magic wand
  TrendingUp:       { row: 20, col: 12},  // 📊 bar chart
  Smartphone:       { row: 20, col: 13},  // 📱
  MapPin:           { row: 20, col: 14},  // 📍
  Clock:            { row: 20, col: 15},  // ⏰
  Ghost:            { row: 20, col: 16},  // 👻

  // ── Row 21: Download / Moon / Wifi ───────────────────────────────────────
  Moon:             { row: 21, col: 4 },  // 🌙
  WifiOff:          { row: 21, col: 11},  // 🚫 no-signal

  // ── Misc / other rows ────────────────────────────────────────────────────
  GripVertical:     { row: 4,  col: 6 },  // 6-dot grid (drag handle)
  Link2:            { row: 4,  col: 5 },  // 🔗 chain link
  LogOut:           { row: 7,  col: 1 },  // → forward arrow (exit)
};

// ─── Component ────────────────────────────────────────────────────────────────

interface XpIconProps {
  /** Lucide icon — resolved via displayName to a sprite cell */
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
  const def  = XP_ICON_MAP[name];

  // No sprite entry → fall back to the original Lucide SVG
  if (!def) {
    return (
      <Icon size={size} className={className} style={style} onClick={onClick} />
    );
  }

  const scale = size / SPRITE_CELL;

  const spanStyle: React.CSSProperties = {
    display:            'inline-block',
    flexShrink:         0,
    width:              size,
    height:             size,
    backgroundImage:    'url(/icons/xp-icons.png)',
    backgroundSize:     `${Math.round(SPRITE_W * scale)}px ${Math.round(SPRITE_H * scale)}px`,
    backgroundPosition: `-${def.col * size}px -${def.row * size}px`,
    backgroundRepeat:   'no-repeat',
    imageRendering:     size <= 20 ? 'pixelated' : 'auto',
    verticalAlign:      'middle',
    ...style,
  };

  return (
    <span
      className={className}
      style={spanStyle}
      onClick={onClick}
      aria-label={name}
      role={onClick ? 'button' : undefined}
    />
  );
};

export default XpIcon;

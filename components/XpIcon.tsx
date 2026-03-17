import React from 'react';
import { LucideIcon } from 'lucide-react';

// ─── Icon map ─────────────────────────────────────────────────────────────────
// Individual 32×32 transparent PNG files from /public/icons/xp/
// Source: icons_pack_32x32_transparent.zip
//
// Key = Lucide displayName, Value = filename in /public/icons/xp/
// Icons without a mapping fall back to the original Lucide SVG.
// ─────────────────────────────────────────────────────────────────────────────

export const XP_ICON_MAP: Record<string, string> = {

  // ── Navigation ──────────────────────────────────────────────────────────
  ArrowLeft:        '002_arrow_left.png',
  ArrowRight:       '003_arrow_right.png',
  ArrowLeftRight:   '000_arrow_back.png',
  ArrowRightLeft:   '001_arrow_forward.png',
  ChevronLeft:      '005_arrow_prev.png',
  ChevronRight:     '006_arrow_next.png',
  ChevronDown:      '007_check_down.png',
  ChevronUp:        '008_check_up.png',
  LogOut:           '001_arrow_forward.png',

  // ── Search / UI actions ─────────────────────────────────────────────────
  Search:           '015_search.png',
  Edit3:            '216_pencil_line.png',
  Save:             '218_floppy.png',
  Trash2:           '221_recycle_bin.png',
  RefreshCw:        '173_refresh.png',
  Download:         '048_download_arrow.png',
  Upload:           '022_download2.png',
  Share:            '049_share.png',
  Share2:           '050_share2.png',
  Link2:            '051_chain_link.png',
  GripVertical:     '052_dots_grid.png',
  Grid:             '213_grid_view.png',
  Eye:              '214_eye.png',
  EyeOff:           '102_no_entry.png',
  Tag:              '172_tag.png',
  Clock:            '274_clock.png',

  // ── Users / Social ──────────────────────────────────────────────────────
  User:             '029_user.png',
  UserPlus:         '030_user_add.png',
  UserCheck:        '031_user_check.png',
  UserMinus:        '032_user_remove.png',
  Users:            '178_users_group.png',
  Github:           '034_github_color.png',
  Chrome:           '035_chrome.png',
  Gamepad2:         '245_gamepad2.png',

  // ── Communication ────────────────────────────────────────────────────────
  MessageCircle:    '075_chat_bubble.png',
  MessageSquare:    '076_chat_yellow.png',
  Bell:             '078_bell.png',
  Mail:             '014_envelope.png',
  Send:             '080_plane_paper.png',
  BookOpen:         '081_book_open.png',

  // ── Status / Alerts ─────────────────────────────────────────────────────
  Info:             '027_info_blue.png',
  AlertCircle:      '100_question_mark.png',
  AlertTriangle:    '101_warning_triangle.png',
  MinusCircle:      '102_no_entry.png',
  X:                '103_x_red.png',
  Check:            '082_check_green.png',
  CheckCircle:      '198_check_circle.png',
  CheckCircle2:     '199_check_circle2.png',
  CheckCheck:       '200_check_circle3.png',
  CheckSquare:      '201_check_square.png',
  Lock:             '126_lock_gold.png',
  Shield:           '263_shield_windows.png',

  // ── GAMIFICATION ────────────────────────────────────────────────────────
  Heart:            '107_heart.png',
  Star:             '108_star.png',
  Flame:            '109_fire.png',
  Sparkles:         '111_sparkle.png',
  Trophy:           '112_trophy.png',
  Crown:            '113_crown.png',
  Award:            '115_medal_ribbon.png',
  Zap:              '116_lightning.png',

  // ── Internet / Globe ────────────────────────────────────────────────────
  Globe:            '083_globe.png',
  WifiOff:          '270_x_signal.png',
  Wifi:             '134_wifi.png',

  // ── Media ────────────────────────────────────────────────────────────────
  Camera:           '044_camera_photo.png',
  Video:            '045_video_camera.png',

  // ── Files / Folders ──────────────────────────────────────────────────────
  FolderOpen:       '010_folder_open.png',
  FolderPlus:       '149_folder_add.png',
  BookmarkPlus:     '152_bookmark_blue.png',
  Archive:          '155_cabinet.png',
  Layers:           '165_paper_stack.png',

  // ── Packages / Boxes ─────────────────────────────────────────────────────
  Package:          '140_box.png',
  PackageCheck:     '142_box_check.png',
  PackageSearch:    '143_box_search.png',

  // ── Commerce / Delivery ──────────────────────────────────────────────────
  DollarSign:       '168_dollar.png',
  Wallet:           '169_wallet.png',
  Gift:             '171_gift.png',
  Truck:            '176_truck.png',
  ShoppingBag:      '197_shopping_bag.png',

  // ── System / Hardware ─────────────────────────────────────────────────────
  Database:         '262_database.png',
  Terminal:         '225_cmd_prompt.png',
  Smartphone:       '272_phone2.png',
  MapPin:           '273_map_pin.png',

  // ── Gaming / Battle ───────────────────────────────────────────────────────
  Swords:           '246_sword.png',
  Target:           '247_target.png',
  Crosshair:        '248_crosshair.png',
  Radar:            '249_radar.png',

  // ── Misc ──────────────────────────────────────────────────────────────────
  Activity:         '264_heartbeat.png',
  Wand2:            '267_magic_wand.png',
  TrendingUp:       '271_signal_bars.png',
  Ghost:            '275_ghost.png',
  Moon:             '279_moon.png',
};

// ─── Component ────────────────────────────────────────────────────────────────

interface XpIconProps {
  /** Lucide icon — resolved via displayName to a PNG file */
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
  const file = XP_ICON_MAP[name];

  // No PNG for this icon → fall back to original Lucide SVG
  if (!file) {
    return (
      <Icon size={size} className={className} style={style} onClick={onClick} />
    );
  }

  const imgStyle: React.CSSProperties = {
    width:          size,
    height:         size,
    flexShrink:     0,
    display:        'inline-block',
    verticalAlign:  'middle',
    imageRendering: size <= 20 ? 'pixelated' : 'auto',
    ...style,
  };

  return (
    <img
      src={`/icons/xp/${file}`}
      width={size}
      height={size}
      alt={name}
      draggable={false}
      className={className}
      style={imgStyle}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    />
  );
};

export default XpIcon;

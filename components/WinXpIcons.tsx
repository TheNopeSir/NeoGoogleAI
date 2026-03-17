/**
 * WinXpIcons — hand-crafted SVG icons in Windows XP style.
 *
 * Visual rules (matching original XP icon design language):
 *  • Radial gradient, light source from top-left  (cx 35% cy 30%)
 *  • White semi-transparent gloss ellipse in upper area
 *  • feDropShadow filter  (dx 0.5 dy 1 blur 1.4 opacity 0.35)
 *  • Vibrant, saturated palette
 *  • viewBox 0 0 32 32, scalable to any size
 *
 * Each icon is exported as a React component accepting { size: number }.
 * useId() ensures unique gradient / filter IDs when multiple instances
 * of the same icon appear on the same page.
 */
import React, { useId } from 'react';

// ─── tiny helpers ─────────────────────────────────────────────────────────────

type GradStop = [string, string];   // [startColor, endColor]

interface WrapProps {
  size: number;
  grad: GradStop;
  grad2?: GradStop;           // optional second gradient
  shadow?: boolean;
  children: (ids: { g: string; g2: string; f: string }) => React.ReactNode;
}

/** Shared SVG wrapper: defs (gradient + filter) + children factory */
const W: React.FC<WrapProps> = ({ size, grad, grad2, shadow = true, children }) => {
  const raw = useId();
  const pfx = raw.replace(/:/g, '_');
  const ids = { g: `g${pfx}`, g2: `g2${pfx}`, f: `f${pfx}` };
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={ids.g} cx="35%" cy="30%" r="72%">
          <stop offset="0%" stopColor={grad[0]} />
          <stop offset="100%" stopColor={grad[1]} />
        </radialGradient>
        {grad2 && (
          <radialGradient id={ids.g2} cx="35%" cy="30%" r="72%">
            <stop offset="0%" stopColor={grad2[0]} />
            <stop offset="100%" stopColor={grad2[1]} />
          </radialGradient>
        )}
        {shadow && (
          <filter id={ids.f} x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="0.5" dy="1" stdDeviation="1.4"
              floodColor="#000000" floodOpacity="0.35" />
          </filter>
        )}
      </defs>
      {children(ids)}
    </svg>
  );
};

/** Gloss highlight – white ellipse that gives the plastic sheen */
const Gloss: React.FC<{ cx: number; cy: number; rx: number; ry: number; op?: number }> =
  ({ cx, cy, rx, ry, op = 0.38 }) => (
    <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="white" opacity={op} />
  );

// ─── Gamification ─────────────────────────────────────────────────────────────

export const XpHeart: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#FF8FA8', '#CC0033']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <path
          d="M16 27 C8 22 3 17 3 11.5 A6.5 6.5 0 0 1 9.5 5 C12 5 14 6.5 16 8.5
             C18 6.5 20 5 22.5 5 A6.5 6.5 0 0 1 29 11.5 C29 17 24 22 16 27Z"
          fill={`url(#${g})`}
        />
        <Gloss cx={11} cy={11} rx={4} ry={2.5} />
      </g>
    )}
  </W>
);

export const XpStar: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#FFE566', '#E68900']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <polygon
          points="16,3 19.5,12 29,13 22,19.5 24.5,29 16,24.5 7.5,29 10,19.5 3,13 12.5,12"
          fill={`url(#${g})`}
        />
        <Gloss cx={12} cy={11} rx={4} ry={2} />
      </g>
    )}
  </W>
);

export const XpFlame: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#FFCC55', '#DD2200']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <path
          d="M16 29 C10 25 8 20 10 15 C12 11 14 13 14 13
             C13 9 16 4 19 6 C19 6 23 10 22 16
             C25 12 24 20 21 24 C22 20 18 24 16 29Z"
          fill={`url(#${g})`}
        />
        <Gloss cx={13} cy={12} rx={3} ry={2} op={0.45} />
      </g>
    )}
  </W>
);

export const XpSparkles: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#FFF066', '#FFB200']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        {/* large centre star */}
        <path d="M16 4 L17.8 13 L27 14 L17.8 15.5 L16 25 L14.2 15.5 L5 14 L14.2 13Z"
          fill={`url(#${g})`} />
        {/* small top-right star */}
        <path d="M24 3 L24.8 6.5 L28 7 L24.8 7.6 L24 11 L23.2 7.6 L20 7 L23.2 6.5Z"
          fill="#FFE566" />
        {/* small bottom-left star */}
        <path d="M8 20 L8.6 22.5 L11 23 L8.6 23.5 L8 26 L7.4 23.5 L5 23 L7.4 22.5Z"
          fill="#FFE566" />
        <Gloss cx={13} cy={11} rx={3} ry={1.5} />
      </g>
    )}
  </W>
);

export const XpTrophy: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#FFE566', '#C87000']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        {/* cup body */}
        <path d="M9 4 H23 L21 18 C21 21 19 23 16 23 C13 23 11 21 11 18Z"
          fill={`url(#${g})`} />
        {/* handles */}
        <path d="M9 7 H5 Q4 7 4 10 Q4 14 9 14" fill="none" stroke="#C87000" strokeWidth="2" />
        <path d="M23 7 H27 Q28 7 28 10 Q28 14 23 14" fill="none" stroke="#C87000" strokeWidth="2" />
        {/* stem */}
        <rect x="14" y="23" width="4" height="4" fill="#E09000" />
        {/* base */}
        <rect x="9" y="27" width="14" height="2.5" rx="1" fill="#C87000" />
        <Gloss cx={13} cy={9} rx={4} ry={2} />
      </g>
    )}
  </W>
);

export const XpCrown: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#FFE566', '#C87000']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <path
          d="M4 26 L4 22 L8 10 L14 17 L16 8 L18 17 L24 10 L28 22 L28 26Z"
          fill={`url(#${g})`}
        />
        {/* jewels */}
        <circle cx="16" cy="10" r="1.5" fill="#FF4466" />
        <circle cx="8" cy="13" r="1" fill="#4488FF" />
        <circle cx="24" cy="13" r="1" fill="#44CC44" />
        <Gloss cx={12} cy={15} rx={4} ry={2} />
      </g>
    )}
  </W>
);

export const XpAward: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#FFE566', '#C87000']} grad2={['#6699FF', '#0033AA']}>
    {({ g, g2, f }) => (
      <g filter={`url(#${f})`}>
        {/* medal circle */}
        <circle cx="16" cy="12" r="10" fill={`url(#${g})`} />
        <circle cx="16" cy="12" r="7.5" fill="none" stroke="#C87000" strokeWidth="1.5" />
        {/* star inside */}
        <polygon points="16,6 17.4,10 21.8,10 18.5,12.8 19.8,17 16,14.5 12.2,17 13.5,12.8 10.2,10 14.6,10"
          fill="#C87000" />
        {/* ribbon */}
        <path d="M13 21 L11 29 L16 26 L21 29 L19 21" fill={`url(#${g2})`} />
        <Gloss cx={12} cy={8} rx={4} ry={2} />
      </g>
    )}
  </W>
);

export const XpZap: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#FFEE44', '#FF8800']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <path
          d="M19 3 L9 17 H17 L13 29 L23 15 H15Z"
          fill={`url(#${g})`}
        />
        <Gloss cx={13} cy={11} rx={3} ry={2} />
      </g>
    )}
  </W>
);

// ─── Communication ────────────────────────────────────────────────────────────

export const XpBell: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#FFE566', '#CC8800']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <path
          d="M16 4 C11 4 8 8 8 14 L8 21 L5 23 H27 L24 21 L24 14 C24 8 21 4 16 4Z"
          fill={`url(#${g})`}
        />
        {/* clapper */}
        <path d="M13 23 A3 3 0 0 0 19 23" fill={`url(#${g})`} />
        {/* top dot */}
        <circle cx="16" cy="3" r="2" fill="#CC8800" />
        <Gloss cx={12} cy={10} rx={4} ry={2.5} />
      </g>
    )}
  </W>
);

export const XpMessageCircle: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#66AAFF', '#0044CC']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <circle cx="16" cy="14" r="12" fill={`url(#${g})`} />
        <path d="M10 26 L13 22" stroke="#0044CC" strokeWidth="2.5" strokeLinecap="round" />
        {/* dots */}
        <circle cx="11" cy="14" r="1.8" fill="white" opacity={0.85} />
        <circle cx="16" cy="14" r="1.8" fill="white" opacity={0.85} />
        <circle cx="21" cy="14" r="1.8" fill="white" opacity={0.85} />
        <Gloss cx={12} cy={8} rx={5} ry={2.5} />
      </g>
    )}
  </W>
);

export const XpMessageSquare: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#66AAFF', '#0044CC']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <rect x="3" y="5" width="26" height="19" rx="3" fill={`url(#${g})`} />
        <path d="M8 24 L8 29 L14 24" fill={`url(#${g})`} />
        <circle cx="11" cy="14.5" r="1.8" fill="white" opacity={0.85} />
        <circle cx="16" cy="14.5" r="1.8" fill="white" opacity={0.85} />
        <circle cx="21" cy="14.5" r="1.8" fill="white" opacity={0.85} />
        <Gloss cx={12} cy={9} rx={5} ry={2.5} />
      </g>
    )}
  </W>
);

export const XpMail: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#FFFFFF', '#C8D8F0']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <rect x="3" y="7" width="26" height="18" rx="2" fill={`url(#${g})`} stroke="#5588CC" strokeWidth="1" />
        {/* flap lines */}
        <path d="M3 7 L16 18 L29 7" fill="none" stroke="#5588CC" strokeWidth="1.5" />
        <path d="M3 25 L11 16" fill="none" stroke="#99AACC" strokeWidth="1" />
        <path d="M29 25 L21 16" fill="none" stroke="#99AACC" strokeWidth="1" />
        <Gloss cx={10} cy={10} rx={5} ry={2} op={0.5} />
      </g>
    )}
  </W>
);

export const XpSend: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#88CCFF', '#0066CC']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <path d="M3 4 L29 16 L3 28 L8 17 L22 16 L8 15Z" fill={`url(#${g})`} />
        <Gloss cx={10} cy={11} rx={5} ry={2} />
      </g>
    )}
  </W>
);

export const XpBookOpen: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#FFFDE0', '#DDD0A0']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        {/* left page */}
        <path d="M3 7 C3 7 10 6 16 9 L16 27 C10 24 3 25 3 25Z" fill={`url(#${g})`} />
        {/* right page */}
        <path d="M29 7 C29 7 22 6 16 9 L16 27 C22 24 29 25 29 25Z" fill={`url(#${g})`} />
        {/* spine */}
        <line x1="16" y1="9" x2="16" y2="27" stroke="#A09060" strokeWidth="1.5" />
        {/* lines on pages */}
        <line x1="6" y1="13" x2="13" y2="12" stroke="#B0A070" strokeWidth="1" opacity={0.7} />
        <line x1="6" y1="16" x2="13" y2="15" stroke="#B0A070" strokeWidth="1" opacity={0.7} />
        <line x1="6" y1="19" x2="13" y2="18" stroke="#B0A070" strokeWidth="1" opacity={0.7} />
        <line x1="19" y1="12" x2="26" y2="13" stroke="#B0A070" strokeWidth="1" opacity={0.7} />
        <line x1="19" y1="15" x2="26" y2="16" stroke="#B0A070" strokeWidth="1" opacity={0.7} />
        <line x1="19" y1="18" x2="26" y2="19" stroke="#B0A070" strokeWidth="1" opacity={0.7} />
      </g>
    )}
  </W>
);

// ─── Navigation ───────────────────────────────────────────────────────────────

export const XpArrowLeft: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#88BBFF', '#2255CC']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <path d="M22 6 L8 16 L22 26 L22 20 L28 20 L28 12 L22 12Z" fill={`url(#${g})`} />
        <Gloss cx={14} cy={12} rx={5} ry={2} />
      </g>
    )}
  </W>
);

export const XpArrowRight: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#88BBFF', '#2255CC']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <path d="M10 6 L24 16 L10 26 L10 20 L4 20 L4 12 L10 12Z" fill={`url(#${g})`} />
        <Gloss cx={11} cy={11} rx={5} ry={2} />
      </g>
    )}
  </W>
);

const ChevronBase: React.FC<{ size: number; d: string }> = ({ size, d }) => (
  <W size={size} grad={['#88BBFF', '#2255CC']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <path d={d} fill={`url(#${g})`} />
        <Gloss cx={13} cy={11} rx={4} ry={2} />
      </g>
    )}
  </W>
);

export const XpChevronLeft: React.FC<{ size: number }> = ({ size }) => (
  <ChevronBase size={size} d="M20 5 L8 16 L20 27 L23 24 L14 16 L23 8Z" />
);
export const XpChevronRight: React.FC<{ size: number }> = ({ size }) => (
  <ChevronBase size={size} d="M12 5 L24 16 L12 27 L9 24 L18 16 L9 8Z" />
);
export const XpChevronDown: React.FC<{ size: number }> = ({ size }) => (
  <ChevronBase size={size} d="M5 12 L16 24 L27 12 L24 9 L16 18 L8 9Z" />
);
export const XpChevronUp: React.FC<{ size: number }> = ({ size }) => (
  <ChevronBase size={size} d="M5 20 L16 8 L27 20 L24 23 L16 14 L8 23Z" />
);

// ─── Users / Social ───────────────────────────────────────────────────────────

export const XpUser: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#77BBFF', '#1155CC']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <circle cx="16" cy="11" r="7" fill={`url(#${g})`} />
        <path d="M4 28 C4 21 9 17 16 17 C23 17 28 21 28 28Z" fill={`url(#${g})`} />
        <Gloss cx={12} cy={7} rx={4} ry={2} />
      </g>
    )}
  </W>
);

export const XpUsers: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#77BBFF', '#1155CC']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        {/* back user */}
        <circle cx="22" cy="10" r="5.5" fill="#4488CC" />
        <path d="M14 26 C14 20 17 17 22 17 C27 17 30 20 30 26Z" fill="#4488CC" />
        {/* front user */}
        <circle cx="12" cy="11" r="6.5" fill={`url(#${g})`} />
        <path d="M2 29 C2 22 6 18 12 18 C18 18 22 22 22 29Z" fill={`url(#${g})`} />
        <Gloss cx={9} cy={7} rx={4} ry={2} />
      </g>
    )}
  </W>
);

export const XpUserPlus: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#77BBFF', '#1155CC']} grad2={['#66DD66', '#008800']}>
    {({ g, g2, f }) => (
      <g filter={`url(#${f})`}>
        <circle cx="13" cy="11" r="6.5" fill={`url(#${g})`} />
        <path d="M2 29 C2 22 6 18 13 18 C19 18 23 22 23 29Z" fill={`url(#${g})`} />
        {/* plus */}
        <circle cx="24" cy="23" r="7" fill={`url(#${g2})`} />
        <rect x="22" y="20" width="4" height="6" rx="1" fill="white" />
        <rect x="21" y="21" width="6" height="4" ry="1" fill="white" />
        <Gloss cx={9} cy={7} rx={4} ry={2} />
      </g>
    )}
  </W>
);

export const XpUserCheck: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#77BBFF', '#1155CC']} grad2={['#66DD66', '#008800']}>
    {({ g, g2, f }) => (
      <g filter={`url(#${f})`}>
        <circle cx="13" cy="11" r="6.5" fill={`url(#${g})`} />
        <path d="M2 29 C2 22 6 18 13 18 C19 18 23 22 23 29Z" fill={`url(#${g})`} />
        <circle cx="24" cy="23" r="7" fill={`url(#${g2})`} />
        <path d="M19.5 23 L22.5 26.5 L28.5 19.5" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <Gloss cx={9} cy={7} rx={4} ry={2} />
      </g>
    )}
  </W>
);

export const XpUserMinus: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#77BBFF', '#1155CC']} grad2={['#FF6644', '#CC2200']}>
    {({ g, g2, f }) => (
      <g filter={`url(#${f})`}>
        <circle cx="13" cy="11" r="6.5" fill={`url(#${g})`} />
        <path d="M2 29 C2 22 6 18 13 18 C19 18 23 22 23 29Z" fill={`url(#${g})`} />
        <circle cx="24" cy="23" r="7" fill={`url(#${g2})`} />
        <rect x="20" y="21.5" width="8" height="3" rx="1.5" fill="white" />
        <Gloss cx={9} cy={7} rx={4} ry={2} />
      </g>
    )}
  </W>
);

// ─── Status / Alerts ──────────────────────────────────────────────────────────

export const XpSearch: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#AADDFF', '#2266CC']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        {/* lens */}
        <circle cx="13" cy="13" r="9.5" fill={`url(#${g})`} />
        <circle cx="13" cy="13" r="6.5" fill="none" stroke="white" strokeWidth="1.5" opacity={0.5} />
        {/* handle */}
        <line x1="20" y1="20" x2="28" y2="28" stroke="#2266CC" strokeWidth="4" strokeLinecap="round" />
        <Gloss cx={9} cy={8} rx={4.5} ry={2.5} />
      </g>
    )}
  </W>
);

export const XpGlobe: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#55CCFF', '#0055AA']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <circle cx="16" cy="16" r="13" fill={`url(#${g})`} />
        {/* latitude lines */}
        <ellipse cx="16" cy="16" rx="13" ry="5" fill="none" stroke="white" strokeWidth="0.8" opacity={0.4} />
        <line x1="3" y1="16" x2="29" y2="16" stroke="white" strokeWidth="0.8" opacity={0.4} />
        {/* longitude lines */}
        <ellipse cx="16" cy="16" rx="5" ry="13" fill="none" stroke="white" strokeWidth="0.8" opacity={0.4} />
        <ellipse cx="16" cy="16" rx="9" ry="13" fill="none" stroke="white" strokeWidth="0.8" opacity={0.4} />
        <Gloss cx={10} cy={8} rx={6} ry={3} op={0.4} />
      </g>
    )}
  </W>
);

export const XpInfo: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#77CCFF', '#0055CC']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <circle cx="16" cy="16" r="13" fill={`url(#${g})`} />
        <text x="16" y="22" textAnchor="middle" fill="white"
          fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="17">i</text>
        <Gloss cx={11} cy={8} rx={5} ry={2.5} />
      </g>
    )}
  </W>
);

export const XpAlertCircle: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#77CCFF', '#0055CC']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <circle cx="16" cy="16" r="13" fill={`url(#${g})`} />
        <text x="16" y="22" textAnchor="middle" fill="white"
          fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="17">?</text>
        <Gloss cx={11} cy={8} rx={5} ry={2.5} />
      </g>
    )}
  </W>
);

export const XpAlertTriangle: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#FFE566', '#CC7700']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <path d="M16 3 L30 28 H2Z" fill={`url(#${g})`} />
        <text x="16" y="26" textAnchor="middle" fill="#7A4000"
          fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="15">!</text>
        <Gloss cx={12} cy={14} rx={4} ry={2} />
      </g>
    )}
  </W>
);

export const XpX: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#FF8888', '#CC0000']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <circle cx="16" cy="16" r="13" fill={`url(#${g})`} />
        <path d="M10 10 L22 22 M22 10 L10 22"
          stroke="white" strokeWidth="3.5" strokeLinecap="round" />
        <Gloss cx={11} cy={9} rx={5} ry={2.5} />
      </g>
    )}
  </W>
);

export const XpCheck: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#66EE66', '#007700']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <circle cx="16" cy="16" r="13" fill={`url(#${g})`} />
        <path d="M8 16 L13 22 L24 10"
          fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <Gloss cx={11} cy={9} rx={5} ry={2.5} />
      </g>
    )}
  </W>
);

export const XpCheckCircle: React.FC<{ size: number }> = XpCheck;
export const XpMinusCircle: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#FF8888', '#CC0000']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <circle cx="16" cy="16" r="13" fill={`url(#${g})`} />
        <rect x="8" y="14" width="16" height="4" rx="2" fill="white" />
        <Gloss cx={11} cy={9} rx={5} ry={2.5} />
      </g>
    )}
  </W>
);

export const XpLock: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#FFE566', '#CC8800']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        {/* shackle */}
        <path d="M10 16 L10 10 A6 6 0 0 1 22 10 L22 16"
          fill="none" stroke="#AA7700" strokeWidth="3.5" strokeLinecap="round" />
        {/* body */}
        <rect x="6" y="15" width="20" height="14" rx="3" fill={`url(#${g})`} />
        {/* keyhole */}
        <circle cx="16" cy="21" r="2.5" fill="#AA7700" />
        <rect x="14.5" y="21" width="3" height="4" rx="1" fill="#AA7700" />
        <Gloss cx={10} cy={18} rx={4} ry={2} />
      </g>
    )}
  </W>
);

export const XpShield: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#88AAFF', '#1133AA']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <path d="M16 3 L28 8 L28 18 C28 24 22 28 16 30 C10 28 4 24 4 18 L4 8Z"
          fill={`url(#${g})`} />
        {/* inner check */}
        <path d="M10 17 L14 22 L22 12"
          fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <Gloss cx={11} cy={8} rx={5} ry={2.5} />
      </g>
    )}
  </W>
);

// ─── Files / Folders ──────────────────────────────────────────────────────────

export const XpFolderOpen: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#FFE566', '#CC8800']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        {/* folder back */}
        <rect x="2" y="10" width="28" height="18" rx="2" fill="#E09000" />
        {/* tab */}
        <path d="M2 10 L2 8 Q2 6 4 6 L12 6 Q14 6 15 8 L15 10Z" fill="#CC8800" />
        {/* folder front */}
        <rect x="2" y="12" width="28" height="16" rx="2" fill={`url(#${g})`} />
        <Gloss cx={10} cy={14} rx={7} ry={2} />
      </g>
    )}
  </W>
);

export const XpFolderPlus: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#FFE566', '#CC8800']} grad2={['#66EE66', '#007700']}>
    {({ g, g2, f }) => (
      <g filter={`url(#${f})`}>
        <rect x="2" y="10" width="22" height="18" rx="2" fill="#E09000" />
        <path d="M2 10 L2 8 Q2 6 4 6 L10 6 Q12 6 13 8 L13 10Z" fill="#CC8800" />
        <rect x="2" y="12" width="22" height="16" rx="2" fill={`url(#${g})`} />
        {/* plus badge */}
        <circle cx="24" cy="22" r="7" fill={`url(#${g2})`} />
        <rect x="22" y="19" width="4" height="6" rx="1" fill="white" />
        <rect x="21" y="20.5" width="6" height="3" ry="1" fill="white" />
        <Gloss cx={6} cy={14} rx={5} ry={2} />
      </g>
    )}
  </W>
);

export const XpArchive: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#BBCCDD', '#556677']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        {/* drawer unit */}
        <rect x="4" y="4" width="24" height="24" rx="2" fill={`url(#${g})`} />
        {/* drawer lines */}
        <rect x="4" y="12" width="24" height="1" fill="#445566" opacity={0.5} />
        <rect x="4" y="20" width="24" height="1" fill="#445566" opacity={0.5} />
        {/* handles */}
        <rect x="10" y="7" width="12" height="4" rx="1.5" fill="#889AAA" />
        <rect x="10" y="15" width="12" height="4" rx="1.5" fill="#889AAA" />
        <rect x="10" y="23" width="12" height="4" rx="1.5" fill="#889AAA" />
        <Gloss cx={10} cy={7} rx={5} ry={2} />
      </g>
    )}
  </W>
);

export const XpLayers: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#EEF0FF', '#8899CC']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <rect x="7" y="18" width="22" height="10" rx="2" fill={`url(#${g})`} stroke="#8899CC" strokeWidth="0.5" />
        <rect x="5" y="13" width="22" height="10" rx="2" fill={`url(#${g})`} stroke="#8899CC" strokeWidth="0.5" />
        <rect x="3" y="8" width="22" height="10" rx="2" fill={`url(#${g})`} stroke="#8899CC" strokeWidth="0.5" />
        <Gloss cx={8} cy={9} rx={6} ry={2} />
      </g>
    )}
  </W>
);

export const XpBookmarkPlus: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#77AAFF', '#2244BB']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <path d="M7 3 H22 Q24 3 24 5 L24 29 L15 23 L6 29 L6 5 Q6 3 7 3Z" fill={`url(#${g})`} />
        <path d="M11 12 H19 M15 8 V16" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <Gloss cx={10} cy={6} rx={5} ry={2} />
      </g>
    )}
  </W>
);

// ─── Packages / Commerce ──────────────────────────────────────────────────────

export const XpPackage: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#E8C880', '#9A6420']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        {/* box */}
        <rect x="4" y="12" width="24" height="16" rx="1.5" fill={`url(#${g})`} />
        {/* lid */}
        <rect x="2" y="8" width="28" height="6" rx="1.5" fill="#C8A060" />
        {/* ribbon */}
        <rect x="13.5" y="4" width="5" height="24" fill="#DD8800" opacity={0.5} />
        <rect x="2" y="10" width="28" height="3" fill="#DD8800" opacity={0.5} />
        <Gloss cx={8} cy={9} rx={6} ry={2} />
      </g>
    )}
  </W>
);

export const XpGift: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#FF8888', '#CC2200']} grad2={['#88BBFF', '#2255CC']}>
    {({ g, g2, f }) => (
      <g filter={`url(#${f})`}>
        {/* box */}
        <rect x="4" y="14" width="24" height="14" rx="2" fill={`url(#${g2})`} />
        {/* lid */}
        <rect x="3" y="10" width="26" height="6" rx="1.5" fill="#4477CC" />
        {/* bow centre */}
        <circle cx="16" cy="11" r="3" fill={`url(#${g})`} />
        {/* bow loops */}
        <path d="M16 10 C12 6 8 6 9 10 C10 12 13 12 16 10Z" fill={`url(#${g})`} />
        <path d="M16 10 C20 6 24 6 23 10 C22 12 19 12 16 10Z" fill={`url(#${g})`} />
        {/* ribbon vertical */}
        <rect x="14.5" y="14" width="3" height="14" fill="#CC2200" opacity={0.35} />
        <Gloss cx={8} cy={11} rx={5} ry={2} />
      </g>
    )}
  </W>
);

export const XpDollarSign: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#88EE88', '#006600']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <circle cx="16" cy="16" r="13" fill={`url(#${g})`} />
        <text x="16" y="22" textAnchor="middle" fill="white"
          fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="17">$</text>
        <Gloss cx={11} cy={9} rx={5} ry={2.5} />
      </g>
    )}
  </W>
);

export const XpWallet: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#C89060', '#7A4020']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <rect x="3" y="8" width="26" height="18" rx="2" fill={`url(#${g})`} />
        {/* flap */}
        <rect x="3" y="8" width="26" height="6" rx="2" fill="#A07040" />
        {/* coin pocket */}
        <rect x="18" y="14" width="9" height="8" rx="2" fill="#8A5030" />
        <circle cx="22.5" cy="18" r="2.5" fill="#C89060" />
        <Gloss cx={8} cy={10} rx={5} ry={2} />
      </g>
    )}
  </W>
);

export const XpTag: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#DDCCAA', '#886644']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <path d="M6 6 H18 L28 16 L18 26 H6 Q4 26 4 24 L4 8 Q4 6 6 6Z" fill={`url(#${g})`} />
        <circle cx="9" cy="12" r="2" fill="white" opacity={0.7} />
        <line x1="11" y1="15" x2="21" y2="15" stroke="#886644" strokeWidth="1.5" opacity={0.5} />
        <line x1="11" y1="18" x2="19" y2="18" stroke="#886644" strokeWidth="1.5" opacity={0.5} />
        <Gloss cx={8} cy={8} rx={5} ry={2} />
      </g>
    )}
  </W>
);

export const XpTruck: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#88AADD', '#334488']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        {/* body */}
        <rect x="2" y="9" width="19" height="14" rx="1.5" fill={`url(#${g})`} />
        {/* cab */}
        <path d="M21 15 L21 9 L29 15Z" fill={`url(#${g})`} />
        <rect x="21" y="15" width="8" height="8" rx="1" fill="#5577AA" />
        {/* window */}
        <rect x="22" y="11" width="5" height="5" rx="0.5" fill="#BBCCEE" opacity={0.8} />
        {/* base */}
        <rect x="2" y="21" width="27" height="3" rx="0" fill="#334488" />
        {/* wheels */}
        <circle cx="7" cy="24" r="3.5" fill="#222" /><circle cx="7" cy="24" r="1.5" fill="#888" />
        <circle cx="22" cy="24" r="3.5" fill="#222" /><circle cx="22" cy="24" r="1.5" fill="#888" />
        <Gloss cx={6} cy={11} rx={5} ry={2} />
      </g>
    )}
  </W>
);

export const XpShoppingBag: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#88AAFF', '#2244BB']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <path d="M6 12 H26 L24 28 H8Z" fill={`url(#${g})`} />
        {/* handle */}
        <path d="M10 12 C10 6 22 6 22 12" fill="none" stroke="#2244BB" strokeWidth="2.5" strokeLinecap="round" />
        <Gloss cx={10} cy={14} rx={5} ry={2} />
      </g>
    )}
  </W>
);

// ─── Actions ──────────────────────────────────────────────────────────────────

export const XpDownload: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#88CCFF', '#0066CC']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <path d="M16 4 L16 20 M8 14 L16 22 L24 14" fill="none" stroke={`url(#${g})`} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="4" y="24" width="24" height="4" rx="2" fill={`url(#${g})`} />
      </g>
    )}
  </W>
);

export const XpUpload: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#88CCFF', '#0066CC']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <path d="M16 22 L16 6 M8 12 L16 4 L24 12" fill="none" stroke={`url(#${g})`} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="4" y="24" width="24" height="4" rx="2" fill={`url(#${g})`} />
      </g>
    )}
  </W>
);

export const XpTrash: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#AABBCC', '#556677']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        {/* lid */}
        <rect x="5" y="7" width="22" height="4" rx="2" fill="#889AAA" />
        <rect x="12" y="4" width="8" height="4" rx="1.5" fill="#889AAA" />
        {/* bin */}
        <path d="M7 11 L9 28 H23 L25 11Z" fill={`url(#${g})`} />
        {/* lines */}
        <line x1="13" y1="14" x2="13" y2="25" stroke="#556677" strokeWidth="1.5" opacity={0.5} strokeLinecap="round" />
        <line x1="16" y1="14" x2="16" y2="25" stroke="#556677" strokeWidth="1.5" opacity={0.5} strokeLinecap="round" />
        <line x1="19" y1="14" x2="19" y2="25" stroke="#556677" strokeWidth="1.5" opacity={0.5} strokeLinecap="round" />
        <Gloss cx={10} cy={12} rx={5} ry={2} />
      </g>
    )}
  </W>
);

export const XpEdit: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#FFEE88', '#CC8800']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <path d="M6 22 L5 27 L10 26 L26 10 L22 6Z" fill={`url(#${g})`} />
        <path d="M22 6 L26 10 L28 7 L25 4Z" fill="#CC4400" />
        <path d="M5 27 L10 26" stroke="#AA7700" strokeWidth="1" />
        <Gloss cx={15} cy={9} rx={5} ry={2} />
      </g>
    )}
  </W>
);

export const XpSave: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#AABBCC', '#334455']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <rect x="3" y="3" width="26" height="26" rx="2" fill={`url(#${g})`} />
        {/* label area */}
        <rect x="7" y="3" width="14" height="12" rx="1" fill="#CCDDEE" />
        {/* write-protect notch */}
        <rect x="17" y="3" width="4" height="5" rx="0" fill="#889AAA" />
        {/* bottom read area */}
        <rect x="6" y="17" width="20" height="9" rx="1" fill="#889AAA" />
        <Gloss cx={8} cy={5} rx={5} ry={2} />
      </g>
    )}
  </W>
);

export const XpRefreshCw: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#66CCFF', '#0066CC']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <path d="M16 5 A11 11 0 1 1 7 19" fill="none" stroke={`url(#${g})`} strokeWidth="4" strokeLinecap="round" />
        {/* arrowhead */}
        <path d="M4 14 L7 20 L12 16Z" fill={`url(#${g})`} />
      </g>
    )}
  </W>
);

export const XpDatabase: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#88AABB', '#334455']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <ellipse cx="16" cy="8" rx="12" ry="5" fill={`url(#${g})`} />
        <rect x="4" y="8" width="24" height="8" fill="#778899" />
        <ellipse cx="16" cy="16" rx="12" ry="5" fill={`url(#${g})`} />
        <rect x="4" y="16" width="24" height="8" fill="#667788" />
        <ellipse cx="16" cy="24" rx="12" ry="5" fill={`url(#${g})`} />
        <Gloss cx={10} cy={6} rx={5} ry={2} />
      </g>
    )}
  </W>
);

export const XpTerminal: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#334455', '#000011']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <rect x="3" y="4" width="26" height="24" rx="2" fill={`url(#${g})`} />
        {/* title bar */}
        <rect x="3" y="4" width="26" height="6" rx="2" fill="#003366" />
        <circle cx="8" cy="7" r="1.5" fill="#FF5F56" />
        <circle cx="12" cy="7" r="1.5" fill="#FEBC2E" />
        <circle cx="16" cy="7" r="1.5" fill="#28C840" />
        {/* cursor */}
        <text x="7" y="20" fill="#44FF44" fontFamily="monospace" fontSize="9">C:\&gt;_</text>
      </g>
    )}
  </W>
);

// ─── Misc ─────────────────────────────────────────────────────────────────────

export const XpSwords: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#DDEEFF', '#8899AA']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        {/* sword 1 */}
        <rect x="14.5" y="3" width="3" height="20" rx="1" fill={`url(#${g})`} transform="rotate(45, 16, 16)" />
        <rect x="10" y="14" width="12" height="3" rx="1" fill="#8899AA" transform="rotate(45, 16, 16)" />
        {/* sword 2 */}
        <rect x="14.5" y="3" width="3" height="20" rx="1" fill={`url(#${g})`} transform="rotate(-45, 16, 16)" />
        <rect x="10" y="14" width="12" height="3" rx="1" fill="#8899AA" transform="rotate(-45, 16, 16)" />
        <Gloss cx={11} cy={9} rx={5} ry={2} />
      </g>
    )}
  </W>
);

export const XpTarget: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#FF8888', '#CC0000']} shadow={false}>
    {({ g }) => (
      <>
        <circle cx="16" cy="16" r="13" fill={`url(#${g})`} />
        <circle cx="16" cy="16" r="9.5" fill="white" />
        <circle cx="16" cy="16" r="6.5" fill="#CC0000" />
        <circle cx="16" cy="16" r="3" fill="white" />
        <circle cx="16" cy="16" r="1.2" fill="#CC0000" />
        <Gloss cx={11} cy={9} rx={5} ry={2.5} />
      </>
    )}
  </W>
);

export const XpCrosshair: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#66AAFF', '#0044CC']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <circle cx="16" cy="16" r="12" fill="none" stroke={`url(#${g})`} strokeWidth="3" />
        <circle cx="16" cy="16" r="4.5" fill="none" stroke={`url(#${g})`} strokeWidth="2" />
        <line x1="16" y1="2" x2="16" y2="10" stroke={`url(#${g})`} strokeWidth="2.5" strokeLinecap="round" />
        <line x1="16" y1="22" x2="16" y2="30" stroke={`url(#${g})`} strokeWidth="2.5" strokeLinecap="round" />
        <line x1="2" y1="16" x2="10" y2="16" stroke={`url(#${g})`} strokeWidth="2.5" strokeLinecap="round" />
        <line x1="22" y1="16" x2="30" y2="16" stroke={`url(#${g})`} strokeWidth="2.5" strokeLinecap="round" />
      </g>
    )}
  </W>
);

export const XpRadar: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#44FF88', '#006633']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <circle cx="16" cy="16" r="13" fill="#002211" stroke="#00AA55" strokeWidth="0.5" />
        <circle cx="16" cy="16" r="9" fill="none" stroke="#00AA55" strokeWidth="0.8" opacity={0.5} />
        <circle cx="16" cy="16" r="5" fill="none" stroke="#00AA55" strokeWidth="0.8" opacity={0.5} />
        {/* sweep */}
        <path d="M16 16 L16 4" stroke={`url(#${g})`} strokeWidth="2" strokeLinecap="round" />
        <path d="M16 16 L26 22" stroke={`url(#${g})`} strokeWidth="1.5" strokeLinecap="round" opacity={0.4} />
        {/* blips */}
        <circle cx="22" cy="10" r="1.5" fill="#44FF88" />
        <circle cx="12" cy="20" r="1" fill="#44FF88" opacity={0.7} />
      </g>
    )}
  </W>
);

export const XpGhost: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#FFFFFF', '#BBC8E8']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <path
          d="M8 28 L8 14 A8 8 0 0 1 24 14 L24 28 L21 25 L18 28 L15 25 L12 28Z"
          fill={`url(#${g})`}
        />
        {/* eyes */}
        <circle cx="12.5" cy="17" r="2.5" fill="#334466" />
        <circle cx="19.5" cy="17" r="2.5" fill="#334466" />
        <circle cx="13.5" cy="16" r="1" fill="white" />
        <circle cx="20.5" cy="16" r="1" fill="white" />
        <Gloss cx={11} cy={11} rx={5} ry={2.5} op={0.5} />
      </g>
    )}
  </W>
);

export const XpMoon: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#FFE566', '#CC8800']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <path
          d="M22 6 A13 13 0 1 0 22 26 A9 9 0 0 1 22 6Z"
          fill={`url(#${g})`}
        />
        <Gloss cx={10} cy={9} rx={4} ry={2.5} />
      </g>
    )}
  </W>
);

export const XpClock: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#FFFFFF', '#C0C8D8']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <circle cx="16" cy="16" r="13" fill={`url(#${g})`} />
        <circle cx="16" cy="16" r="13" fill="none" stroke="#8899AA" strokeWidth="1.5" />
        {/* hour ticks */}
        {[0,30,60,90,120,150,180,210,240,270,300,330].map(a => {
          const r = a * Math.PI / 180;
          return <line key={a}
            x1={16 + 10 * Math.sin(r)} y1={16 - 10 * Math.cos(r)}
            x2={16 + 12 * Math.sin(r)} y2={16 - 12 * Math.cos(r)}
            stroke="#8899AA" strokeWidth="1.5" strokeLinecap="round" />;
        })}
        {/* hands */}
        <line x1="16" y1="16" x2="16" y2="8" stroke="#334455" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="16" y1="16" x2="22" y2="18" stroke="#334455" strokeWidth="2" strokeLinecap="round" />
        <circle cx="16" cy="16" r="1.5" fill="#334455" />
        <Gloss cx={11} cy={9} rx={5} ry={2.5} op={0.4} />
      </g>
    )}
  </W>
);

export const XpActivity: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#FF6688', '#CC0033']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <path
          d="M2 16 H7 L10 8 L13 24 L16 12 L19 20 L22 14 L25 16 H30"
          fill="none" stroke={`url(#${g})`} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
        />
      </g>
    )}
  </W>
);

export const XpWand: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#CC88FF', '#6600CC']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <rect x="3" y="25" width="20" height="4" rx="2" fill={`url(#${g})`} transform="rotate(-45, 13, 27)" />
        {/* sparkles */}
        <path d="M22 5 L23 8 L26 9 L23 10 L22 13 L21 10 L18 9 L21 8Z" fill="#FFD700" />
        <path d="M27 3 L27.7 5.5 L30 6 L27.7 6.5 L27 9 L26.3 6.5 L24 6 L26.3 5.5Z" fill="#FFD700" />
        <Gloss cx={10} cy={17} rx={4} ry={2} />
      </g>
    )}
  </W>
);

export const XpSmartphone: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#778899', '#334455']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <rect x="8" y="3" width="16" height="26" rx="3" fill={`url(#${g})`} />
        <rect x="10" y="7" width="12" height="17" rx="1" fill="#AABBCC" opacity={0.8} />
        <circle cx="16" cy="27" r="1.5" fill="#556677" />
        <Gloss cx={11} cy={6} rx={4} ry={2} />
      </g>
    )}
  </W>
);

export const XpMapPin: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#FF6666', '#CC0000']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <path d="M16 3 A9 9 0 0 1 25 12 C25 18 16 29 16 29 C16 29 7 18 7 12 A9 9 0 0 1 16 3Z"
          fill={`url(#${g})`} />
        <circle cx="16" cy="12" r="4" fill="white" opacity={0.7} />
        <Gloss cx={12} cy={7} rx={4} ry={2.5} />
      </g>
    )}
  </W>
);

export const XpEye: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#AADDFF', '#0055AA']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <path d="M3 16 C7 9 25 9 29 16 C25 23 7 23 3 16Z" fill={`url(#${g})`} />
        <circle cx="16" cy="16" r="5" fill="#334466" />
        <circle cx="16" cy="16" r="3" fill="#0022AA" />
        <circle cx="13.5" cy="13.5" r="1.5" fill="white" opacity={0.7} />
        <Gloss cx={9} cy={13} rx={5} ry={2} op={0.4} />
      </g>
    )}
  </W>
);

export const XpEyeOff: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#AAAAAA', '#555555']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <path d="M3 16 C7 9 25 9 29 16 C25 23 7 23 3 16Z" fill={`url(#${g})`} />
        <circle cx="16" cy="16" r="5" fill="#666677" />
        <line x1="5" y1="5" x2="27" y2="27" stroke="#CC3333" strokeWidth="3" strokeLinecap="round" />
      </g>
    )}
  </W>
);

export const XpLink: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#88BBFF', '#1155CC']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <path d="M14 19 A7 7 0 0 0 19 14 L23 10 A5 5 0 0 1 28 10 A5 5 0 0 1 28 17 L24 21 A7 7 0 0 1 17 21"
          fill="none" stroke={`url(#${g})`} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M18 13 A7 7 0 0 0 13 18 L9 22 A5 5 0 0 1 4 22 A5 5 0 0 1 4 15 L8 11 A7 7 0 0 1 15 11"
          fill="none" stroke={`url(#${g})`} strokeWidth="3.5" strokeLinecap="round" />
      </g>
    )}
  </W>
);

export const XpGrid: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#88BBFF', '#1155CC']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        {[0,1,2].map(row => [0,1,2].map(col => (
          <rect key={`${row}${col}`}
            x={4 + col * 9} y={4 + row * 9}
            width={7} height={7} rx="1.5"
            fill={`url(#${g})`} />
        )))}
      </g>
    )}
  </W>
);

export const XpTrendingUp: React.FC<{ size: number }> = ({ size }) => (
  <W size={size} grad={['#44EE88', '#006633']}>
    {({ g, f }) => (
      <g filter={`url(#${f})`}>
        <polyline points="3,24 11,16 16,20 24,10 29,10"
          fill="none" stroke={`url(#${g})`} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="23,6 29,10 25,14"
          fill="none" stroke={`url(#${g})`} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    )}
  </W>
);

// ─── Icon map: Lucide displayName → component ─────────────────────────────────

export type XpSvgRenderer = (size: number) => React.ReactElement;

export const XP_SVG_MAP: Record<string, XpSvgRenderer> = {
  Heart:          s => <XpHeart size={s} />,
  Star:           s => <XpStar size={s} />,
  Flame:          s => <XpFlame size={s} />,
  Sparkles:       s => <XpSparkles size={s} />,
  Trophy:         s => <XpTrophy size={s} />,
  Crown:          s => <XpCrown size={s} />,
  Award:          s => <XpAward size={s} />,
  Zap:            s => <XpZap size={s} />,
  Bell:           s => <XpBell size={s} />,
  MessageCircle:  s => <XpMessageCircle size={s} />,
  MessageSquare:  s => <XpMessageSquare size={s} />,
  Mail:           s => <XpMail size={s} />,
  Send:           s => <XpSend size={s} />,
  BookOpen:       s => <XpBookOpen size={s} />,
  ArrowLeft:      s => <XpArrowLeft size={s} />,
  ArrowRight:     s => <XpArrowRight size={s} />,
  ArrowLeftRight: s => <XpArrowRight size={s} />,
  ArrowRightLeft: s => <XpArrowRight size={s} />,
  ChevronLeft:    s => <XpChevronLeft size={s} />,
  ChevronRight:   s => <XpChevronRight size={s} />,
  ChevronDown:    s => <XpChevronDown size={s} />,
  ChevronUp:      s => <XpChevronUp size={s} />,
  User:           s => <XpUser size={s} />,
  Users:          s => <XpUsers size={s} />,
  UserPlus:       s => <XpUserPlus size={s} />,
  UserCheck:      s => <XpUserCheck size={s} />,
  UserMinus:      s => <XpUserMinus size={s} />,
  Search:         s => <XpSearch size={s} />,
  Globe:          s => <XpGlobe size={s} />,
  Info:           s => <XpInfo size={s} />,
  AlertCircle:    s => <XpAlertCircle size={s} />,
  AlertTriangle:  s => <XpAlertTriangle size={s} />,
  X:              s => <XpX size={s} />,
  Check:          s => <XpCheck size={s} />,
  CheckCircle:    s => <XpCheckCircle size={s} />,
  CheckCircle2:   s => <XpCheckCircle size={s} />,
  CheckCheck:     s => <XpCheckCircle size={s} />,
  CheckSquare:    s => <XpCheckCircle size={s} />,
  MinusCircle:    s => <XpMinusCircle size={s} />,
  EyeOff:         s => <XpEyeOff size={s} />,
  Lock:           s => <XpLock size={s} />,
  Shield:         s => <XpShield size={s} />,
  FolderOpen:     s => <XpFolderOpen size={s} />,
  FolderPlus:     s => <XpFolderPlus size={s} />,
  Archive:        s => <XpArchive size={s} />,
  Layers:         s => <XpLayers size={s} />,
  BookmarkPlus:   s => <XpBookmarkPlus size={s} />,
  Package:        s => <XpPackage size={s} />,
  PackageCheck:   s => <XpPackage size={s} />,
  PackageSearch:  s => <XpPackage size={s} />,
  Gift:           s => <XpGift size={s} />,
  DollarSign:     s => <XpDollarSign size={s} />,
  Wallet:         s => <XpWallet size={s} />,
  Tag:            s => <XpTag size={s} />,
  Truck:          s => <XpTruck size={s} />,
  ShoppingBag:    s => <XpShoppingBag size={s} />,
  Download:       s => <XpDownload size={s} />,
  Upload:         s => <XpUpload size={s} />,
  Trash2:         s => <XpTrash size={s} />,
  Edit3:          s => <XpEdit size={s} />,
  Save:           s => <XpSave size={s} />,
  RefreshCw:      s => <XpRefreshCw size={s} />,
  Database:       s => <XpDatabase size={s} />,
  Terminal:       s => <XpTerminal size={s} />,
  Swords:         s => <XpSwords size={s} />,
  Target:         s => <XpTarget size={s} />,
  Crosshair:      s => <XpCrosshair size={s} />,
  Radar:          s => <XpRadar size={s} />,
  Ghost:          s => <XpGhost size={s} />,
  Moon:           s => <XpMoon size={s} />,
  Clock:          s => <XpClock size={s} />,
  Activity:       s => <XpActivity size={s} />,
  Wand2:          s => <XpWand size={s} />,
  Smartphone:     s => <XpSmartphone size={s} />,
  MapPin:         s => <XpMapPin size={s} />,
  Eye:            s => <XpEye size={s} />,
  Link2:          s => <XpLink size={s} />,
  Grid:           s => <XpGrid size={s} />,
  TrendingUp:     s => <XpTrendingUp size={s} />,
  Share2:         s => <XpSend size={s} />,
  Share:          s => <XpSend size={s} />,
};

/**
 * ═══════════════════════════════════════════════════════════════════
 * Navratri 2026 — Shared Design System
 * ═══════════════════════════════════════════════════════════════════
 *
 * Single source of truth for all Navratri module UI.
 * Apple-inspired: clean, minimal, professional, premium.
 *
 * Usage:
 *   import { colors, spacing, type, radii, shadows, chip, btn, input, card } from '@/lib/navratri/designSystem';
 *   const c = colors('dark');
 */

// ── Spacing Scale (px) ──────────────────────────────────────────────────────
export const spacing = {
  xs: 4,  sm: 8,  md: 12,  base: 16,  lg: 20,  xl: 24,  '2xl': 32,  '3xl': 40,  '4xl': 48,  '5xl': 64,
};

// ── Border Radii ────────────────────────────────────────────────────────────
export const radii = { xs: 6, sm: 8, md: 12, lg: 16, xl: 20, full: 9999 };

// ── Color Palette ───────────────────────────────────────────────────────────
const palette = {
  // Brand
  saffron:    '#FF6B35',
  maroon:     '#8B1E3F',
  gold:       '#FFD700',
  // Semantic
  green:      '#34D399',
  greenDark:  '#059669',
  red:        '#EF4444',
  redDark:    '#DC2626',
  blue:       '#60A5FA',
  amber:      '#F59E0B',
  // Neutrals
  white:      '#FFFFFF',
  gray50:     '#FAFAFA',
  gray100:    '#F5F5F5',
  gray200:    '#E5E5E5',
  gray300:    '#D4D4D4',
  gray400:    '#A3A3A3',
  gray500:    '#737373',
  gray600:    '#525252',
  gray700:    '#404040',
  gray800:    '#262626',
  gray900:    '#171717',
  gray950:    '#0a0a0a',
};

export const colors = (theme = 'dark') => {
  if (theme === 'light') return {
    bg:         '#FAFAF8',
    bgAlt:      '#FFFFFF',
    card:       '#FFFFFF',
    cardHover:  '#FAFAFA',
    border:     'rgba(0,0,0,0.08)',
    borderSolid:'#E5E5E5',
    text:       '#171717',
    textSecondary: '#404040',
    muted:      '#737373',
    placeholder:'#A3A3A3',
    // Brand
    primary:    palette.maroon,
    primaryBg:  'rgba(139,30,63,0.06)',
    secondary:  palette.saffron,
    accent:     palette.maroon,
    accentBg:   'rgba(139,30,63,0.08)',
    gold:       '#B8860B',
    gradient:   'linear-gradient(135deg, #FF6B35, #8B1E3F)',
    // Semantic
    green:      '#059669',
    greenBg:    'rgba(5,150,105,0.08)',
    red:        '#DC2626',
    redBg:      'rgba(220,38,38,0.06)',
    blue:       '#2563EB',
    blueBg:     'rgba(37,99,235,0.06)',
    amber:      '#D97706',
    amberBg:    'rgba(217,119,6,0.06)',
    // Surfaces
    overlay:    'rgba(0,0,0,0.4)',
    inputBg:    '#FAFAFA',
    inputBorder:'#E5E5E5',
    // Shadows
    shadow:     '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
    shadowMd:   '0 4px 12px rgba(0,0,0,0.08)',
    shadowLg:   '0 8px 24px rgba(0,0,0,0.10)',
  };

  // Dark theme (default)
  return {
    bg:         '#09090B',
    bgAlt:      '#111113',
    card:       '#18181B',
    cardHover:  '#1F1F23',
    border:     'rgba(255,255,255,0.08)',
    borderSolid:'#27272A',
    text:       '#FAFAFA',
    textSecondary: '#D4D4D8',
    muted:      '#A1A1AA',
    placeholder:'#52525B',
    // Brand
    primary:    palette.saffron,
    primaryBg:  'rgba(255,107,53,0.10)',
    secondary:  palette.maroon,
    accent:     palette.gold,
    accentBg:   'rgba(255,215,0,0.08)',
    gold:       palette.gold,
    gradient:   'linear-gradient(135deg, #FF6B35, #8B1E3F)',
    // Semantic
    green:      palette.green,
    greenBg:    'rgba(52,211,153,0.10)',
    red:        palette.red,
    redBg:      'rgba(239,68,68,0.10)',
    blue:       palette.blue,
    blueBg:     'rgba(96,165,250,0.10)',
    amber:      palette.amber,
    amberBg:    'rgba(245,158,11,0.10)',
    // Surfaces
    overlay:    'rgba(0,0,0,0.6)',
    inputBg:    'rgba(255,255,255,0.04)',
    inputBorder:'rgba(255,255,255,0.10)',
    // Shadows
    shadow:     '0 1px 3px rgba(0,0,0,0.3)',
    shadowMd:   '0 4px 12px rgba(0,0,0,0.4)',
    shadowLg:   '0 8px 24px rgba(0,0,0,0.5)',
  };
};

// ── Typography ──────────────────────────────────────────────────────────────
export const type = {
  // System font stack — SF Pro on Apple, system-ui elsewhere
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Inter', system-ui, sans-serif",
  pageTitle:    { fontSize: '28px', fontWeight: '700', letterSpacing: '-0.02em', lineHeight: '1.15' },
  sectionTitle: { fontSize: '20px', fontWeight: '600', letterSpacing: '-0.01em', lineHeight: '1.25' },
  cardTitle:    { fontSize: '17px', fontWeight: '600', letterSpacing: '-0.01em', lineHeight: '1.3' },
  body:         { fontSize: '15px', fontWeight: '400', lineHeight: '1.5' },
  bodyMedium:   { fontSize: '15px', fontWeight: '500', lineHeight: '1.5' },
  secondary:    { fontSize: '13px', fontWeight: '400', lineHeight: '1.45', letterSpacing: '0.01em' },
  label:        { fontSize: '13px', fontWeight: '500', lineHeight: '1.3', letterSpacing: '0.02em' },
  caption:      { fontSize: '12px', fontWeight: '500', lineHeight: '1.3' },
  overline:     { fontSize: '11px', fontWeight: '600', lineHeight: '1.2', letterSpacing: '0.06em', textTransform: 'uppercase' },
  btnText:      { fontSize: '15px', fontWeight: '600', letterSpacing: '-0.01em' },
  btnTextLg:    { fontSize: '17px', fontWeight: '600', letterSpacing: '-0.01em' },
  tabletNum:    { fontSize: '24px', fontWeight: '700', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' },
  bigNum:       { fontSize: '32px', fontWeight: '700', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' },
};

// ── Status Chip Styles ──────────────────────────────────────────────────────
export const chip = (status, theme = 'dark') => {
  const c = colors(theme);
  const map = {
    paid:         { bg: c.greenBg, color: c.green, label: 'Paid' },
    pending:      { bg: c.amberBg, color: c.amber, label: 'Pending' },
    failed:       { bg: c.redBg, color: c.red, label: 'Failed' },
    refunded:     { bg: c.blueBg, color: c.blue, label: 'Refunded' },
    cancelled:    { bg: c.redBg, color: c.red, label: 'Cancelled' },
    checked_in:   { bg: c.greenBg, color: c.green, label: 'Checked In' },
    not_checked:  { bg: c.amberBg, color: c.amber, label: 'Not Checked In' },
    picked_up:    { bg: c.greenBg, color: c.green, label: 'Picked Up' },
    partial:      { bg: c.amberBg, color: c.amber, label: 'Partial' },
    valid:        { bg: c.greenBg, color: c.green, label: 'Valid' },
    invalid:      { bg: c.redBg, color: c.red, label: 'Invalid' },
    draft:        { bg: c.blueBg, color: c.blue, label: 'Draft' },
    posted:       { bg: c.greenBg, color: c.green, label: 'Posted' },
    active:       { bg: c.greenBg, color: c.green, label: 'Active' },
    closed:       { bg: c.amberBg, color: c.amber, label: 'Closed' },
    complimentary:{ bg: c.accentBg, color: c.accent, label: 'Complimentary' },
  };
  const s = map[status] || { bg: c.accentBg, color: c.muted, label: status };
  return {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '3px 10px', borderRadius: radii.full,
    fontSize: '12px', fontWeight: '600', letterSpacing: '0.02em',
    background: s.bg, color: s.color,
    _label: s.label,
  };
};

// ── Button Styles ───────────────────────────────────────────────────────────
const btnBase = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
  borderRadius: `${radii.md}px`, border: 'none', cursor: 'pointer',
  transition: 'all 0.15s ease',
  ...type.btnText,
};

export const btn = (variant = 'primary', theme = 'dark') => {
  const c = colors(theme);
  const variants = {
    primary: {
      ...btnBase,
      padding: '14px 24px',
      background: c.gradient,
      color: '#FFFFFF',
      boxShadow: '0 2px 8px rgba(255,107,53,0.25)',
    },
    primaryLg: {
      ...btnBase, ...type.btnTextLg,
      padding: '18px 32px',
      background: c.gradient,
      color: '#FFFFFF',
      boxShadow: '0 2px 8px rgba(255,107,53,0.25)',
      width: '100%',
    },
    secondary: {
      ...btnBase,
      padding: '12px 20px',
      background: 'transparent',
      color: c.text,
      border: `1px solid ${c.border}`,
    },
    ghost: {
      ...btnBase,
      padding: '12px 20px',
      background: 'transparent',
      color: c.muted,
      border: 'none',
    },
    destructive: {
      ...btnBase,
      padding: '14px 24px',
      background: c.redBg,
      color: c.red,
      border: `1px solid rgba(239,68,68,0.2)`,
    },
    success: {
      ...btnBase, ...type.btnTextLg,
      padding: '18px 32px',
      background: c.green,
      color: '#000',
      width: '100%',
      boxShadow: '0 2px 8px rgba(52,211,153,0.25)',
    },
    icon: {
      ...btnBase,
      padding: '10px',
      background: 'transparent',
      color: c.muted,
      border: `1px solid ${c.border}`,
      borderRadius: `${radii.sm}px`,
      minWidth: '44px', minHeight: '44px',
    },
  };
  return variants[variant] || variants.primary;
};

// ── Input Styles ────────────────────────────────────────────────────────────
export const input = (theme = 'dark', state = 'default') => {
  const c = colors(theme);
  const base = {
    width: '100%', padding: '14px 16px',
    borderRadius: `${radii.md}px`,
    border: `1px solid ${state === 'error' ? c.red : c.inputBorder}`,
    background: c.inputBg, color: c.text,
    fontSize: '16px', // 16px prevents iOS zoom
    outline: 'none', boxSizing: 'border-box',
    fontFamily: type.fontFamily,
    transition: 'border-color 0.15s ease',
  };
  if (state === 'disabled') {
    base.opacity = 0.5;
    base.cursor = 'not-allowed';
  }
  return base;
};

// ── Card Styles ─────────────────────────────────────────────────────────────
export const card = (theme = 'dark', variant = 'default') => {
  const c = colors(theme);
  const base = {
    background: c.card,
    borderRadius: `${radii.lg}px`,
    border: `1px solid ${c.border}`,
    overflow: 'hidden',
  };
  if (variant === 'elevated') {
    base.boxShadow = c.shadowMd;
  }
  if (variant === 'interactive') {
    base.cursor = 'pointer';
    base.transition = 'all 0.15s ease';
  }
  return base;
};

// ── Page Container ──────────────────────────────────────────────────────────
export const page = (theme = 'dark') => {
  const c = colors(theme);
  return {
    minHeight: '100dvh',
    background: c.bg,
    color: c.text,
    fontFamily: type.fontFamily,
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
  };
};

// ── Container (max-width + centering) ───────────────────────────────────────
export const container = (maxWidth = '640px') => ({
  maxWidth,
  margin: '0 auto',
  padding: `0 ${spacing.base}px ${spacing['4xl']}px`,
});

// ── Section ─────────────────────────────────────────────────────────────────
export const section = (theme = 'dark') => ({
  ...card(theme),
  padding: `${spacing.xl}px`,
});

// ── Alert/Banner ────────────────────────────────────────────────────────────
export const alert = (variant = 'info', theme = 'dark') => {
  const c = colors(theme);
  const styles = {
    error:   { bg: c.redBg, border: c.red, color: c.red, icon: '⚠️' },
    success: { bg: c.greenBg, border: c.green, color: c.green, icon: '✓' },
    warning: { bg: c.amberBg, border: c.amber, color: c.amber, icon: '⚠' },
    info:    { bg: c.blueBg, border: c.blue, color: c.blue, icon: 'ℹ' },
  };
  const s = styles[variant] || styles.info;
  return {
    padding: `${spacing.md}px ${spacing.base}px`,
    borderRadius: `${radii.md}px`,
    background: s.bg,
    border: `1px solid rgba(${variant === 'error' ? '239,68,68' : variant === 'success' ? '52,211,153' : variant === 'warning' ? '245,158,11' : '96,165,250'},0.2)`,
    color: s.color,
    fontSize: '14px', fontWeight: '500',
    display: 'flex', alignItems: 'center', gap: '8px',
    _icon: s.icon,
  };
};

// ── Table helpers ───────────────────────────────────────────────────────────
export const table = (theme = 'dark') => {
  const c = colors(theme);
  return {
    wrapper: { width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
    th: {
      padding: '10px 12px', textAlign: 'left',
      fontSize: '12px', fontWeight: '600', letterSpacing: '0.04em', textTransform: 'uppercase',
      color: c.muted, borderBottom: `1px solid ${c.border}`,
      background: c.bgAlt, position: 'sticky', top: 0,
    },
    td: {
      padding: '12px', borderBottom: `1px solid ${c.border}`,
      color: c.text, verticalAlign: 'middle',
    },
    tdMuted: {
      padding: '12px', borderBottom: `1px solid ${c.border}`,
      color: c.muted, verticalAlign: 'middle', fontSize: '13px',
    },
    row: { transition: 'background 0.1s ease' },
    rowHover: { background: c.cardHover },
  };
};

// ── Mobile Card (table row replacement) ─────────────────────────────────────
export const mobileCard = (theme = 'dark') => {
  const c = colors(theme);
  return {
    wrapper: {
      background: c.card,
      borderRadius: `${radii.lg}px`,
      border: `1px solid ${c.border}`,
      padding: `${spacing.base}px`,
      marginBottom: `${spacing.sm}px`,
    },
    header: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      marginBottom: `${spacing.sm}px`,
    },
    title: { ...type.cardTitle, color: c.text, margin: 0 },
    subtitle: { ...type.secondary, color: c.muted, marginTop: '2px' },
    row: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: `${spacing.xs}px 0`,
    },
    label: { ...type.caption, color: c.muted },
    value: { ...type.bodyMedium, color: c.text },
  };
};

// ── Skeleton Loader ─────────────────────────────────────────────────────────
export const skeleton = (theme = 'dark') => {
  const c = colors(theme);
  return {
    base: {
      background: `linear-gradient(90deg, ${c.card} 25%, ${c.cardHover} 50%, ${c.card} 75%)`,
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      borderRadius: `${radii.sm}px`,
    },
  };
};

// ── Empty State ─────────────────────────────────────────────────────────────
export const emptyState = (theme = 'dark') => {
  const c = colors(theme);
  return {
    wrapper: {
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: `${spacing['4xl']}px ${spacing.xl}px`,
      textAlign: 'center',
    },
    icon: { fontSize: '48px', marginBottom: `${spacing.base}px`, opacity: 0.5 },
    title: { ...type.cardTitle, color: c.text, marginBottom: `${spacing.sm}px` },
    description: { ...type.secondary, color: c.muted, maxWidth: '320px' },
  };
};

// ── CSS Keyframes (inject once per page) ────────────────────────────────────
export const keyframes = `
  @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.03); } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }
`;

// ── Breakpoint helpers ──────────────────────────────────────────────────────
export const breakpoints = {
  sm: 640,   // iPhone landscape
  md: 768,   // iPad portrait
  lg: 1024,  // iPad landscape
  xl: 1280,  // Desktop
  '2xl': 1440,
};

// Helper: detect if we should show mobile layout
export const useIsMobile = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < breakpoints.md;
};

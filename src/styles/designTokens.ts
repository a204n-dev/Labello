/**
 * Design Tokens - Single source of truth for UI styling
 * Import from here instead of hardcoding values
 */

// Color palette - semantic naming
export const colors = {
  // Background layers
  bg: {
    primary: '#020617',      // slate-950
    secondary: '#0f172a',    // slate-900
    tertiary: '#1e293b',     // slate-800
    elevated: '#334155',     // slate-700
    hover: '#475569',        // slate-600
  },
  // Borders
  border: {
    subtle: '#1e293b',       // slate-800
    default: '#334155',      // slate-700
    strong: '#475569',       // slate-600
    focus: '#6366f1',        // indigo-500
  },
  // Text
  text: {
    primary: '#f1f5f9',      // slate-100
    secondary: '#94a3b8',    // slate-400
    muted: '#64748b',        // slate-500
    inverse: '#0f172a',      // slate-900
  },
  // Semantic states
  state: {
    success: {
      bg: '#064e3b',         // emerald-950
      text: '#34d399',       // emerald-300
      border: '#065f46',     // emerald-800
    },
    warning: {
      bg: '#78350f',         // amber-950
      text: '#fbbf24',       // amber-300
      border: '#92400e',     // amber-800
    },
    error: {
      bg: '#7f1d1d',         // rose-950
      text: '#f87171',       // rose-300
      border: '#991b1b',     // rose-800
    },
    info: {
      bg: '#1e3a8a',         // blue-950
      text: '#60a5fa',       // blue-300
      border: '#1e40af',     // blue-800
    },
    accent: {
      bg: '#312e81',         // indigo-950
      text: '#a5b4fc',       // indigo-300
      border: '#3730a3',     // indigo-800
    },
  },
  // Mode-specific
  mode: {
    utau: '#6366f1',         // indigo-500
    diffsinger: '#ec4899',   // pink-500
  },
} as const;

// Spacing scale
export const spacing = {
  0: '0',
  1: '0.125rem',   // 2px
  2: '0.25rem',    // 4px
  3: '0.375rem',   // 6px
  4: '0.5rem',     // 8px
  5: '0.625rem',   // 10px
  6: '0.75rem',    // 12px
  8: '1rem',       // 16px
  10: '1.25rem',   // 20px
  12: '1.5rem',    // 24px
  16: '2rem',      // 32px
} as const;

// Typography
export const typography = {
  fontFamily: {
    sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
  },
  fontSize: {
    xs: '0.6875rem',    // 11px
    sm: '0.75rem',      // 12px
    base: '0.8125rem',  // 13px
    lg: '0.875rem',     // 14px
    xl: '1rem',         // 16px
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
} as const;

// Border radius
export const radius = {
  none: '0',
  sm: '0.25rem',     // 4px
  md: '0.375rem',    // 6px
  lg: '0.5rem',      // 8px
  xl: '0.75rem',     // 12px
  full: '9999px',
} as const;

// Shadows
export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
} as const;

// Transitions
export const transitions = {
  fast: '150ms ease',
  normal: '200ms ease',
  slow: '300ms ease',
} as const;

// Z-index layers
export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  modal: 30,
  popover: 40,
  tooltip: 50,
  toast: 60,
} as const;

// Breakpoints
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Panel default widths
export const panelWidths = {
  sidebar: { min: 200, max: 400, default: 256 },
  properties: { min: 240, max: 480, default: 320 },
} as const;

// Component sizing
export const sizing = {
  headerHeight: '3.5rem',        // 56px
  headerHeightMobile: '3rem',    // 48px
  toolbarHeight: '3rem',         // 48px
  statusBarHeight: '1.5rem',     // 24px
  iconSize: {
    sm: '1rem',      // 16px
    md: '1.25rem',   // 20px
    lg: '1.5rem',    // 24px
  },
  buttonHeight: {
    sm: '1.75rem',   // 28px
    md: '2rem',      // 32px
    lg: '2.5rem',    // 40px
  },
} as const;

// Focus ring
export const focusRing = `outline-none ring-2 ring-offset-2 ring-offset-slate-950 ring-indigo-500`;

// Common component variants
export const variants = {
  button: {
    primary: `bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-sm`,
    secondary: `bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700`,
    ghost: `bg-transparent hover:bg-slate-800 text-slate-300`,
    danger: `bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white`,
    success: `bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white`,
  },
  input: `bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 
          focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500`,
  panel: `bg-slate-950 border-l border-slate-800`,
  card: `bg-slate-900 border border-slate-800 rounded-lg`,
} as const;

export type Colors = typeof colors;
export type Spacing = typeof spacing;
export type Typography = typeof typography;
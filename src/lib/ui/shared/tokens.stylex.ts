import * as stylex from '@stylexjs/stylex';

const DARK = '@media (prefers-color-scheme: dark)';

export const colors = stylex.defineVars({
	background: { default: '#F7FAFC', [DARK]: '#0B1220' },
	foreground: { default: '#0B1220', [DARK]: '#F8FAFC' },
	primary: { default: '#0284C7', [DARK]: '#38BDF8' },
	primaryForeground: { default: '#FFFFFF', [DARK]: '#0B1220' },
	accent: { default: '#E0F2FE', [DARK]: '#082F49' },
	accentForeground: { default: '#0B1220', [DARK]: '#F8FAFC' },
	muted: { default: '#F1F5F9', [DARK]: '#1E293B' },
	mutedForeground: { default: '#64748B', [DARK]: '#94A3B8' },
	destructive: { default: '#DC2626', [DARK]: '#F87171' },
	destructiveForeground: { default: '#FFFFFF', [DARK]: '#0B1220' },
	border: { default: '#E2E8F0', [DARK]: '#1E293B' },
	overlay: { default: 'rgb(11 18 32 / 0.4)', [DARK]: 'rgb(2 6 16 / 0.6)' },
	input: { default: '#E2E8F0', [DARK]: '#1E293B' },
	ring: { default: '#0284C7', [DARK]: '#38BDF8' },
});

export const typography = stylex.defineVars({
	fontDisplay: "'Bricolage Grotesque Variable', ui-sans-serif, sans-serif",
	fontBody: "'Source Sans 3', ui-sans-serif, sans-serif",
	fontMono: "'IBM Plex Mono', ui-monospace, monospace",
	sizeDisplay: '2.5rem',
	sizeTitle: '1.25rem',
	sizeBody: '1rem',
	sizeLabel: '0.8125rem',
	sizeMono: '0.8125rem',
	weightDisplay: '800',
	weightStrong: '600',
	weightBody: '400',
	lineBody: '1.5',
	lineTight: '1.15',
});

export const space = stylex.defineVars({
	xs: '0.25rem',
	sm: '0.5rem',
	md: '1rem',
	lg: '1.5rem',
	xl: '2.5rem',
	xxl: '4rem',
});

export const radius = stylex.defineVars({
	control: '0.25rem',
});

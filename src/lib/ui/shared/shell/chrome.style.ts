import * as stylex from '@stylexjs/stylex';
import { colors, space, typography } from '$lib/ui/shared/tokens.stylex';

export const chrome = stylex.create({
	frame: {
		maxWidth: '72rem',
		marginInline: 'auto',
		paddingInline: space.xl,
		paddingBlock: space.xl,
		fontFamily: typography.fontBody,
		color: colors.foreground,
		'@media (max-width: 40rem)': {
			paddingInline: space.md,
			paddingBlock: space.lg,
		},
	},
	header: {
		display: 'flex',
		alignItems: 'baseline',
		justifyContent: 'flex-start',
		gap: space.md,
		marginBottom: space.xxl,
	},
	nav: {
		display: 'flex',
		gap: space.lg,
	},
	title: {
		margin: 0,
		fontFamily: typography.fontDisplay,
		fontSize: typography.sizeDisplay,
		fontWeight: typography.weightDisplay,
		lineHeight: typography.lineTight,
		letterSpacing: '-0.03em',
		color: colors.foreground,
	},
	titleMark: {
		display: 'block',
		width: '4ch',
		height: 3,
		marginTop: space.sm,
		backgroundColor: colors.primary,
	},
	back: {
		display: 'inline-block',
		marginBottom: space.lg,
	},
	section: {
		marginTop: space.xl,
	},
	empty: {
		marginTop: space.xl,
		maxWidth: '36rem',
		fontSize: typography.sizeBody,
		color: colors.mutedForeground,
	},
	detailMeta: {
		marginTop: space.sm,
		fontFamily: typography.fontMono,
		fontSize: typography.sizeMono,
		color: colors.mutedForeground,
	},
});

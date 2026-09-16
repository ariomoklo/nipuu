import * as stylex from '@stylexjs/stylex';
import { colors, radius, space, typography } from '$lib/ui/shared/tokens.stylex';

const REDUCE = '@media (prefers-reduced-motion: reduce)';

export const button = stylex.create({
	base: {
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		alignSelf: 'flex-start',
		gap: space.sm,
		borderWidth: 1,
		borderStyle: 'solid',
		borderRadius: radius.control,
		paddingInline: space.md,
		paddingBlock: space.sm,
		fontFamily: typography.fontBody,
		fontSize: typography.sizeLabel,
		fontWeight: typography.weightStrong,
		lineHeight: typography.lineTight,
		cursor: 'pointer',
		transitionProperty: 'background-color, color, border-color',
		transitionDuration: '150ms',
		[REDUCE]: {
			transitionDuration: '0ms',
		},
		':focus-visible': {
			outlineWidth: 2,
			outlineStyle: 'solid',
			outlineColor: colors.ring,
			outlineOffset: 2,
		},
	},
	primary: {
		backgroundColor: colors.primary,
		color: colors.primaryForeground,
		borderColor: colors.primary,
		':hover': {
			opacity: 0.9,
		},
	},
	ghost: {
		backgroundColor: 'transparent',
		color: colors.foreground,
		borderColor: 'transparent',
		':hover': {
			color: colors.primary,
		},
	},
	destructive: {
		backgroundColor: 'transparent',
		color: colors.destructive,
		borderColor: colors.destructive,
		':hover': {
			backgroundColor: colors.destructive,
			color: colors.destructiveForeground,
		},
	},
});

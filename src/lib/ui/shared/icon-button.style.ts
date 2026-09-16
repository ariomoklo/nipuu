import * as stylex from '@stylexjs/stylex';
import { colors, radius, space } from '$lib/ui/shared/tokens.stylex';

const REDUCE = '@media (prefers-reduced-motion: reduce)';

export const iconButton = stylex.create({
	base: {
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		padding: space.xs,
		borderWidth: 0,
		borderStyle: 'none',
		borderRadius: radius.control,
		backgroundColor: 'transparent',
		color: colors.mutedForeground,
		cursor: 'pointer',
		transitionProperty: 'color',
		transitionDuration: '150ms',
		[REDUCE]: {
			transitionDuration: '0ms'
		},
		':hover': {
			color: colors.foreground
		},
		':focus-visible': {
			outlineWidth: 2,
			outlineStyle: 'solid',
			outlineColor: colors.ring,
			outlineOffset: 2
		}
	},
	danger: {
		':hover': {
			color: colors.destructive
		}
	},
	active: {
		color: colors.primary
	}
});

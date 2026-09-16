import * as stylex from '@stylexjs/stylex';
import { colors, typography } from '$lib/ui/shared/tokens.stylex';

export const navLink = stylex.create({
	root: {
		fontFamily: typography.fontBody,
		fontSize: typography.sizeBody,
		fontWeight: typography.weightBody,
		color: colors.mutedForeground,
		':hover': {
			color: colors.foreground,
		},
		':focus-visible': {
			outlineWidth: 2,
			outlineStyle: 'solid',
			outlineColor: colors.ring,
			outlineOffset: 2,
		},
	},
	current: {
		color: colors.primary,
		fontWeight: typography.weightStrong,
	},
});

import * as stylex from '@stylexjs/stylex';
import { colors, typography } from '$lib/ui/shared/tokens.stylex';

export const textLink = stylex.create({
	root: {
		fontFamily: typography.fontBody,
		fontSize: typography.sizeBody,
		color: colors.primary,
		':hover': {
			textDecorationLine: 'underline'
		},
		':focus-visible': {
			outlineWidth: 2,
			outlineStyle: 'solid',
			outlineColor: colors.ring,
			outlineOffset: 2
		}
	}
});

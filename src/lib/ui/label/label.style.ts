import * as stylex from '@stylexjs/stylex';
import { colors, space, typography } from '$lib/ui/shared/tokens.stylex';

export const label = stylex.create({
	root: {
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'flex-start',
		gap: space.xs,
		fontFamily: typography.fontBody,
		fontSize: typography.sizeLabel,
		fontWeight: typography.weightStrong,
		color: colors.foreground,
	},
});

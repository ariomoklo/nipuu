import * as stylex from '@stylexjs/stylex';
import { colors, radius, space, typography } from '$lib/ui/shared/tokens.stylex';

export const input = stylex.create({
	root: {
		display: 'block',
		width: '100%',
		maxWidth: '24rem',
		appearance: 'none',
		backgroundColor: colors.background,
		color: colors.foreground,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.input,
		borderRadius: radius.control,
		paddingInline: space.sm,
		paddingBlock: space.sm,
		fontFamily: typography.fontMono,
		fontSize: typography.sizeMono,
		lineHeight: typography.lineBody,
		':focus-visible': {
			outlineWidth: 2,
			outlineStyle: 'solid',
			outlineColor: colors.ring,
			outlineOffset: 2,
		},
	},
});

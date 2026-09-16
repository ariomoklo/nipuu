import * as stylex from '@stylexjs/stylex';
import { colors, typography } from '$lib/ui/shared/tokens.stylex';

export const detail = stylex.create({
	titlePath: {
		fontFamily: typography.fontMono,
		fontSize: typography.sizeMono,
		color: colors.foreground,
		overflowWrap: 'anywhere',
	},
	hint: {
		cursor: 'help',
		textDecorationLine: 'underline',
		textDecorationStyle: 'dotted',
		textDecorationColor: colors.border,
		textUnderlineOffset: '0.2em',
	},
});

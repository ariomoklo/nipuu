import * as stylex from '@stylexjs/stylex';
import { colors, radius, space, typography } from '$lib/ui/shared/tokens.stylex';

/** Room a picker control leaves for its chevron: `space.sm` + 16px icon + `space.xs`. */
const PICKER_INSET = '1.75rem';

export const select = stylex.create({
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
		paddingInlineEnd: PICKER_INSET,
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

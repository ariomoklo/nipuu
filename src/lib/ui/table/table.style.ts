import * as stylex from '@stylexjs/stylex';
import { colors, space, typography } from '$lib/ui/shared/tokens.stylex';

export const table = stylex.create({
	root: {
		width: '100%',
		textAlign: 'left',
		fontFamily: typography.fontMono,
		fontSize: typography.sizeMono,
	},
	th: {
		paddingBlock: space.sm,
		paddingInline: space.sm,
		paddingInlineStart: 0,
		fontFamily: typography.fontBody,
		fontSize: typography.sizeLabel,
		fontWeight: typography.weightStrong,
		textTransform: 'uppercase',
		letterSpacing: '0.08em',
		color: colors.mutedForeground,
		borderBottomWidth: 1,
		borderBottomStyle: 'solid',
		borderBottomColor: colors.border,
		whiteSpace: 'nowrap',
	},
	td: {
		paddingBlock: space.sm,
		paddingInline: space.sm,
		paddingInlineStart: 0,
		color: colors.foreground,
		verticalAlign: 'top',
		borderBottomWidth: 1,
		borderBottomStyle: 'solid',
		borderBottomColor: colors.border,
	},
});

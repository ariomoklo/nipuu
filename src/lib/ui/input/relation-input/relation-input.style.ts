import * as stylex from '@stylexjs/stylex';
import { colors, radius, space, typography } from '$lib/ui/shared/tokens.stylex';

/** Room a picker control leaves for its chevron: `space.sm` + 16px icon + `space.xs`. */
const PICKER_INSET = '1.75rem';

export const combobox = stylex.create({
	input: {
		paddingInlineEnd: PICKER_INSET,
	},
	listbox: {
		position: 'absolute',
		insetInlineStart: 0,
		insetInlineEnd: 0,
		insetBlockStart: 'calc(100% + 4px)',
		zIndex: 20,
		margin: 0,
		padding: space.xs,
		listStyle: 'none',
		maxHeight: '13rem',
		overflowY: 'auto',
		backgroundColor: colors.background,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		borderRadius: radius.control,
	},
	option: {
		display: 'flex',
		alignItems: 'baseline',
		justifyContent: 'space-between',
		gap: space.md,
		paddingInline: space.sm,
		paddingBlock: space.xs,
		borderRadius: radius.control,
		fontFamily: typography.fontBody,
		fontSize: typography.sizeLabel,
		color: colors.foreground,
		cursor: 'pointer',
	},
	optionActive: {
		backgroundColor: colors.muted,
	},
	optionLabel: {
		whiteSpace: 'nowrap',
	},
	optionValue: {
		minWidth: 0,
		overflow: 'hidden',
		fontFamily: typography.fontMono,
		fontSize: typography.sizeMono,
		color: colors.mutedForeground,
		whiteSpace: 'nowrap',
		textOverflow: 'ellipsis',
	},
	empty: {
		fontFamily: typography.fontBody,
		fontSize: typography.sizeLabel,
		color: colors.mutedForeground,
		paddingInline: space.sm,
		paddingBlock: space.xs,
	},
});

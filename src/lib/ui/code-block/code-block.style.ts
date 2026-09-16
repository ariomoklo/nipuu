import * as stylex from '@stylexjs/stylex';
import { colors, radius, space, typography } from '$lib/ui/shared/tokens.stylex';

export const code = stylex.create({
	frame: {
		margin: 0,
		overflow: 'hidden',
		backgroundColor: colors.muted,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		borderRadius: radius.control,
	},
	header: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: space.md,
		paddingInline: space.md,
		paddingBlock: space.sm,
		backgroundColor: colors.background,
		borderBottomWidth: 1,
		borderBottomStyle: 'solid',
		borderBottomColor: colors.border,
	},
	title: {
		margin: 0,
		fontFamily: typography.fontBody,
		fontSize: typography.sizeLabel,
		fontWeight: typography.weightStrong,
		color: colors.mutedForeground,
	},
	body: {
		display: 'grid',
		gridTemplateColumns: 'auto minmax(0, 1fr)',
		alignItems: 'start',
		overflowX: 'auto',
		paddingBlock: space.sm,
	},
	gutter: {
		paddingInline: space.md,
		fontFamily: typography.fontMono,
		fontSize: typography.sizeMono,
		lineHeight: typography.lineBody,
		color: colors.mutedForeground,
		textAlign: 'right',
		userSelect: 'none',
		whiteSpace: 'pre',
		fontVariantNumeric: 'tabular-nums',
	},
	line: {
		margin: 0,
		padding: 0,
		paddingInlineEnd: space.md,
		fontFamily: typography.fontMono,
		fontSize: typography.sizeMono,
		lineHeight: typography.lineBody,
		whiteSpace: 'pre',
	},
	token: {
		color: 'var(--shiki-light)',
		'@media (prefers-color-scheme: dark)': {
			color: 'var(--shiki-dark)',
		},
	},
});

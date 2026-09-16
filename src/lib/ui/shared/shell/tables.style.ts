import * as stylex from '@stylexjs/stylex';
import { colors, radius, space, typography } from '$lib/ui/shared/tokens.stylex';

export const tables = stylex.create({
	list: {
		listStyle: 'none',
		margin: 0,
		marginTop: space.xl,
		padding: 0,
		display: 'flex',
		flexDirection: 'column',
		gap: space.sm,
	},
	modelCard: {
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'flex-start',
		gap: space.xs,
		width: '100%',
		paddingInline: space.md,
		paddingBlock: space.md,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		borderRadius: radius.control,
		backgroundColor: colors.background,
		color: colors.foreground,
		textDecorationLine: 'none',
		':hover': {
			borderColor: colors.primary,
		},
		':focus-visible': {
			outlineWidth: 2,
			outlineStyle: 'solid',
			outlineColor: colors.ring,
			outlineOffset: 2,
		},
	},
	name: {
		margin: 0,
		fontFamily: typography.fontDisplay,
		fontSize: typography.sizeTitle,
		fontWeight: typography.weightDisplay,
		letterSpacing: '-0.03em',
		color: 'inherit',
	},
	meta: {
		fontFamily: typography.fontMono,
		fontSize: typography.sizeMono,
		lineHeight: typography.lineBody,
		color: colors.mutedForeground,
	},
});

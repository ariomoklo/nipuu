import * as stylex from '@stylexjs/stylex';
import { colors, radius, space, typography } from '$lib/ui/shared/tokens.stylex';

export const logs = stylex.create({
	list: {
		listStyle: 'none',
		margin: 0,
		marginTop: space.xl,
		padding: 0,
		display: 'flex',
		flexDirection: 'column',
		gap: space.sm,
	},
	row: {
		display: 'grid',
		gridTemplateColumns: 'auto minmax(0, 1fr) auto auto',
		alignItems: 'baseline',
		columnGap: space.md,
		width: '100%',
		paddingInline: space.md,
		paddingBlock: space.sm,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		borderRadius: radius.control,
		backgroundColor: colors.background,
		textAlign: 'left',
		cursor: 'pointer',
		textDecorationLine: 'none',
		color: colors.foreground,
		':hover': {
			color: colors.primary,
			borderColor: colors.primary,
		},
		':focus-visible': {
			outlineWidth: 2,
			outlineStyle: 'solid',
			outlineColor: colors.ring,
			outlineOffset: 2,
		},
	},
	method: {
		fontFamily: typography.fontDisplay,
		fontSize: typography.sizeTitle,
		fontWeight: typography.weightDisplay,
		lineHeight: typography.lineTight,
		letterSpacing: '-0.03em',
		color: 'inherit',
	},
	path: {
		fontFamily: typography.fontMono,
		fontSize: typography.sizeMono,
		color: colors.foreground,
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
	},
	status: {
		fontFamily: typography.fontMono,
		fontSize: typography.sizeMono,
	},
	statusOk: {
		color: colors.primary,
	},
	statusNeutral: {
		color: colors.mutedForeground,
	},
	statusError: {
		color: colors.destructive,
	},
	meta: {
		fontFamily: typography.fontMono,
		fontSize: typography.sizeMono,
		color: colors.mutedForeground,
	},
});

import * as stylex from '@stylexjs/stylex';
import { colors, radius, space, typography } from '$lib/ui/shared/tokens.stylex';

export const browser = stylex.create({
	rowActions: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'flex-end',
		gap: space.xs
	},
	newRowCell: {
		paddingInline: 0,
		borderBottomWidth: 0
	},
	newRow: {
		display: 'flex',
		alignItems: 'center',
		gap: space.sm,
		width: '100%',
		paddingInline: space.sm,
		paddingBlock: space.sm,
		borderRadius: radius.control,
		fontFamily: typography.fontBody,
		fontSize: typography.sizeLabel,
		fontWeight: typography.weightStrong,
		color: colors.mutedForeground,
		textDecorationLine: 'none',
		':hover': {
			color: colors.foreground
		},
		':focus-visible': {
			outlineWidth: 2,
			outlineStyle: 'solid',
			outlineColor: colors.ring,
			outlineOffset: 2
		}
	},
	toolbar: {
		display: 'flex',
		alignItems: 'center',
		gap: space.sm,
		marginTop: space.xl
	},
	searchForm: {
		display: 'flex',
		flex: 1,
		maxWidth: '24rem'
	},
	filterGrid: {
		display: 'grid',
		gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
		alignItems: 'end',
		gap: space.md
	},
	filterPair: {
		display: 'grid',
		gridTemplateColumns: 'minmax(0, 6.5rem) minmax(0, 1fr)',
		gap: space.sm,
		alignSelf: 'stretch'
	},
	cellText: {
		display: 'inline-block',
		maxWidth: '24ch',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
		verticalAlign: 'bottom'
	},
	cellStrong: {
		fontWeight: typography.weightStrong
	},
	cellEmpty: {
		color: colors.mutedForeground
	},
	cellActions: {
		width: '1%',
		whiteSpace: 'nowrap'
	},
	pager: {
		display: 'flex',
		flexWrap: 'wrap',
		alignItems: 'center',
		gap: space.md,
		marginBlock: space.lg,
		fontFamily: typography.fontMono,
		fontSize: typography.sizeMono,
		color: colors.mutedForeground
	}
});

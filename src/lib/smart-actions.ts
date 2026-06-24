/**
 * Shared "Smart actions" — the quick ways to put reviews to work. Rendered by
 * <CollectReviewsCard> on the Reviews and Feedback pages.
 */
export interface SmartAction {
	icon: 'email' | 'link' | 'qr' | 'star' | 'edit' | 'eye';
	title: string;
	desc: string;
	href: string;
}

export const SMART_ACTIONS: SmartAction[] = [
	{
		icon: 'email',
		title: 'Email after orders',
		desc: 'Automatically ask customers for a review',
		href: '/app/get-reviews#email'
	},
	{
		icon: 'link',
		title: 'Share a link',
		desc: 'Send your review link anywhere',
		href: '/app/get-reviews#link'
	},
	{
		icon: 'qr',
		title: 'QR code',
		desc: 'Print or display in-store',
		href: '/app/get-reviews#qr'
	},
	{
		icon: 'star',
		title: 'Show it on your store',
		desc: 'Add the review widget to your storefront',
		href: '/app/widget'
	},
	{
		icon: 'eye',
		title: 'Show / hide reviews',
		desc: 'Choose which reviews appear in your widget',
		href: '/app/reviews'
	},
	{
		icon: 'edit',
		title: 'Edit feedback page',
		desc: 'Customize the rating form text & layout',
		href: '/app/feedback/form'
	}
];

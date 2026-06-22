export interface GLocation {
	/** Unique Google Place ID (Primary key) */
	placeId: string;
	/** Name/title of the location */
	title: string;
	/** Optional address */
	address?: string | null;
	/** Optional phone number */
	phone?: string | null;
	/** Optional website URL */
	website?: string | null;
	/** Aggregated score */
	totalScore: number;
	/** Number of reviews */
	reviewsCount: number;
	/** The review filters for the location */
	review_filters: Record<string, unknown>;
	/** URL to the Google page for the location */
	google_page_url: string;
	/** Link to leave a review for this location */
	review_link: string;
	/** Image URL */
	imageUrl: string;
}

export interface Review {
	reviewId: string;
	text?: string;
	name: string;
	stars: number;
	publishedAtDate: string;
	reviewerPhotoUrl: string;
	reviewImageUrls: string[];
	/** Enriched property added by enrichReviews */
	timeago?: string;
}

export interface DisplaySettings {
	showtime?: boolean;
	variableheighttext?: boolean;
	imagesToShow?: number;
	visibleReviews?: number;
	color?: string;
	extraclasses?: string;
	[key: string]: unknown;
}

export interface ImportStatus {
	taskStatus: string;
	reviewCount: number;
	totalReviews: number;
	statusText: string;
}

export interface WidgetSettingsResponse {
	/** Indicates if reviews are loading */
	reviewsLoading: boolean;
	/** Indicates if reviews are currently being imported */
	importing?: boolean;
	/** Progress of the import (0-100) */
	importProgress?: number;
	/** Detailed import status */
	importStatus?: ImportStatus;
	customCss: string;
	displaySettings: DisplaySettings;
	reviewData: Review[];
	placeData: GLocation | GLocation[];
}

export interface WidgetConfig {
	widgetType: string;
	variant: string;
	myshopifyDomain: string;
	endpoint: string;
	location: number;
	displaySettings: DisplaySettings;
	customCss?: string;
}

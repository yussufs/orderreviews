/**
 * Centralized Theme System for Google Reviews Widget
 *
 * This is the single source of truth for all CSS variables and theme presets.
 * Widgets should NOT define their own theme classes - all theming flows through here.
 */

/**
 * All CSS variables used by the widget, with their default values
 */
export const CSS_VARS = {
	// Primary (affect multiple elements)
	primaryBgColor: { var: '--dragonio-primary-bg-color', default: '#f8f8f8' },
	primaryColor: { var: '--dragonio-primary-color', default: '#333333' },
	primaryBorderRadius: { var: '--dragonio-primary-border-radius', default: '16px' },
	primaryPadding: { var: '--dragonio-primary-padding', default: '1em' },
	primaryBoxShadow: { var: '--dragonio-primary-box-shadow', default: '0 1px 3px rgba(0,0,0,0.08)' },

	// Widget container
	widgetBackground: {
		var: '--dragonio-google-review-widget-background',
		default: 'var(--dragonio-primary-bg-color)'
	},
	widgetPadding: {
		var: '--dragonio-google-review-widget-padding',
		default: 'var(--dragonio-primary-padding)'
	},
	widgetBorderRadius: {
		var: '--dragonio-google-review-widget-border-radius',
		default: 'var(--dragonio-primary-border-radius)'
	},
	widgetBoxShadow: { var: '--dragonio-google-review-widget-box-shadow', default: 'none' },

	// Header (transparent by default - sits inside widget)
	headerBackground: {
		var: '--dragonio-google-review-widget-header-background',
		default: 'transparent'
	},
	headerColor: {
		var: '--dragonio-google-review-widget-header-color',
		default: 'var(--dragonio-primary-color)'
	},
	headerPadding: { var: '--dragonio-google-review-widget-header-padding', default: '0' },
	headerBorderRadius: { var: '--dragonio-google-review-widget-header-border-radius', default: '0' },
	headerBoxShadow: { var: '--dragonio-google-review-widget-header-box-shadow', default: 'none' },

	// Cards (white with subtle shadow)
	cardBackground: { var: '--dragonio-google-review-widget-card-background', default: '#ffffff' },
	cardColor: {
		var: '--dragonio-google-review-widget-card-color',
		default: 'var(--dragonio-primary-color)'
	},
	cardPadding: {
		var: '--dragonio-google-review-widget-card-padding',
		default: 'var(--dragonio-primary-padding)'
	},
	cardBorderRadius: {
		var: '--dragonio-google-review-widget-card-border-radius',
		default: 'var(--dragonio-primary-border-radius)'
	},
	cardBoxShadow: {
		var: '--dragonio-google-review-widget-card-box-shadow',
		default: 'var(--dragonio-primary-box-shadow)'
	},

	// Footer (reviewer info in speech bubble variant)
	footerColor: {
		var: '--dragonio-google-review-widget-footer-color',
		default: 'var(--dragonio-primary-color)'
	},

	// Buttons
	buttonBackground: {
		var: '--dragonio-google-review-widget-button-background',
		default: '#ffffff'
	},
	buttonColor: { var: '--dragonio-google-review-widget-button-color', default: '#333333' },

	// Stars
	starColor: { var: '--dragonio-google-review-star-color', default: '#fbbc04' },

	// Images
	imageSize: { var: '--dragonio-google-review-widget-image-size', default: '40px' },
	headerImageSize: { var: '--dragonio-google-review-widget-header-image-size', default: '56px' },
	reviewImageWidth: { var: '--dragonio-google-review-image-width', default: '80px' },
	reviewImageBorderRadius: { var: '--dragonio-google-review-image-border-radius', default: '12px' },

	// Badge specific
	badgeBgColor: { var: '--dragonio-badge-bg-color', default: '#ffffff' },
	badgeColor: { var: '--dragonio-badge-color', default: '#333333' },
	badgeBorderRadius: { var: '--dragonio-badge-border-radius', default: '12px' },
	badgePadding: { var: '--dragonio-badge-padding', default: '12px 16px' },
	badgeBoxShadow: { var: '--dragonio-badge-box-shadow', default: '0 2px 8px rgba(0,0,0,0.1)' },
	badgeAccent: { var: '--dragonio-google-review-badge-accent', default: '#1a73e8' },

	// Drawer specific
	drawerBgColor: { var: '--dragonio-drawer-bg-color', default: '#ffffff' },
	drawerColor: { var: '--dragonio-drawer-color', default: '#333333' },
	drawerBorderRadius: { var: '--dragonio-drawer-border-radius', default: '0' },
	drawerPadding: { var: '--dragonio-drawer-padding', default: '20px' },
	drawerWidth: { var: '--dragonio-drawer-width', default: '360px' },
	drawerLeaveReviewBg: { var: '--dragonio-drawer-leave-review-bg-color', default: '#1a73e8' }
} as const;

export type CssVarKey = keyof typeof CSS_VARS;

/**
 * Theme presets - each overrides specific CSS variables
 */
export const THEMES: Record<string, Partial<Record<CssVarKey, string>>> = {
	default: {
		// Uses CSS_VARS defaults
	},
	dark: {
		primaryBgColor: '#1f2937',
		primaryColor: '#e5e5e5',
		widgetBackground: '#1f2937',
		cardBackground: '#2d3748',
		cardColor: '#ffffff',
		buttonBackground: '#2d3748',
		buttonColor: '#e5e5e5',
		badgeBgColor: '#2d3748',
		badgeColor: '#e5e5e5',
		drawerBgColor: '#1f2937',
		drawerColor: '#e5e5e5'
	},
	'off-white': {
		primaryBgColor: '#f8f8f8',
		primaryBorderRadius: '20px',
		widgetBackground: '#f8f8f8',
		cardBackground: '#ffffff',
		cardBoxShadow: '0 1px 3px rgba(0,0,0,0.1)',
		buttonBackground: '#ffffff',
		headerPadding: '0'
	},
	'light-purple': {
		primaryBgColor: '#f3f6f9',
		primaryBorderRadius: '20px',
		widgetBackground: '#ffffff',
		cardBackground: '#f3f6f9',
		cardBoxShadow: '0 1px 3px rgba(0,0,0,0.1)',
		buttonBackground: '#ffffff',
		headerPadding: '0'
	},
	pink: {
		primaryBgColor: '#ffe4ec',
		primaryBorderRadius: '20px',
		widgetBackground: '#ffffff',
		cardBoxShadow: '0 1px 3px rgba(0,0,0,0.1)',
		buttonBackground: '#ec4899',
		buttonColor: '#ffffff',
		starColor: '#ec4899',
		badgeAccent: '#ec4899',
		badgeBgColor: '#ffeef8'
	},
	green: {
		primaryBgColor: '#edefe8',
		primaryBorderRadius: '20px',
		widgetBackground: '#ffffff',
		cardBoxShadow: '0 1px 3px rgba(0,0,0,0.1)',
		buttonBackground: '#edefe8',
		buttonColor: '#4b7850',
		starColor: '#4b7850',
		badgeAccent: '#4b7850',
		badgeBgColor: '#f0f4ed'
	},
	blue: {
		primaryBgColor: '#f0f5fd',
		primaryBorderRadius: '20px',
		widgetBackground: '#ffffff',
		cardBoxShadow: '0 1px 3px rgba(0,0,0,0.1)',
		buttonBackground: '#5582c2',
		buttonColor: '#e5eefe',
		badgeAccent: '#5582c2',
		badgeBgColor: '#e5eefe'
	},
	yellow: {
		primaryBgColor: '#fef9e7',
		primaryBorderRadius: '20px',
		widgetBackground: '#ffffff',
		cardBoxShadow: '0 1px 3px rgba(0,0,0,0.1)',
		buttonBackground: '#fbbf24',
		badgeBgColor: '#fef9e7',
		badgeAccent: '#f59e0b'
	}
};

export const DEFAULT_THEME = 'default';

/**
 * Key aliases for backwards compatibility
 * Maps various input formats to CSS_VARS keys
 */
const KEY_ALIASES: Record<string, CssVarKey> = {
	// Widget container aliases
	background: 'widgetBackground',
	'widget-background': 'widgetBackground',
	padding: 'widgetPadding',
	'widget-padding': 'widgetPadding',
	borderRadius: 'widgetBorderRadius',
	'widget-border-radius': 'widgetBorderRadius',
	boxShadow: 'widgetBoxShadow',
	'widget-box-shadow': 'widgetBoxShadow',

	// Header aliases
	'header-background': 'headerBackground',
	'header-color': 'headerColor',
	'header-padding': 'headerPadding',
	'header-border-radius': 'headerBorderRadius',
	'header-box-shadow': 'headerBoxShadow',

	// Card aliases
	'card-background': 'cardBackground',
	'card-color': 'cardColor',
	'card-padding': 'cardPadding',
	'card-border-radius': 'cardBorderRadius',
	'card-box-shadow': 'cardBoxShadow',

	// Footer aliases (speech bubble reviewer info)
	'footer-color': 'footerColor',

	// Button aliases
	'button-background': 'buttonBackground',
	'button-color': 'buttonColor',

	// Star aliases
	'star-color': 'starColor',

	// Image aliases
	'image-size': 'imageSize',
	'header-image-size': 'headerImageSize',
	'review-image-width': 'reviewImageWidth',
	'review-image-border-radius': 'reviewImageBorderRadius',

	// Primary aliases
	'primary-bg-color': 'primaryBgColor',
	'primary-color': 'primaryColor',
	'primary-border-radius': 'primaryBorderRadius',
	'primary-padding': 'primaryPadding',
	'primary-box-shadow': 'primaryBoxShadow',

	// Badge aliases
	'badge-bg-color': 'badgeBgColor',
	'badge-color': 'badgeColor',
	'badge-border-radius': 'badgeBorderRadius',
	'badge-padding': 'badgePadding',
	'badge-box-shadow': 'badgeBoxShadow',
	'badge-accent': 'badgeAccent',

	// Drawer aliases
	'drawer-bg-color': 'drawerBgColor',
	'drawer-color': 'drawerColor',
	'drawer-border-radius': 'drawerBorderRadius',
	'drawer-padding': 'drawerPadding',
	'drawer-width': 'drawerWidth'
};

/**
 * Settings that should be skipped when mapping to CSS variables
 * These are behavior settings, not style settings
 */
const BEHAVIOR_SETTINGS = new Set([
	'color',
	'showtime',
	'variableheighttext',
	'imagesToShow',
	'visibleReviews',
	'extraclasses'
]);

/**
 * Generate CSS variables string from theme + custom overrides
 *
 * @param themeName - Name of the theme preset to use
 * @param customOverrides - Custom CSS variable overrides (key: CSS_VARS key, value: CSS value)
 * @returns CSS variables string for use in a style tag
 */
export function generateCssVariables(
	themeName: string = DEFAULT_THEME,
	customOverrides: Record<string, string> = {}
): string {
	const theme = THEMES[themeName] || THEMES[DEFAULT_THEME];
	const lines: string[] = [];

	for (const [key, config] of Object.entries(CSS_VARS)) {
		// Priority: customOverrides > theme > default
		const value = customOverrides[key] ?? theme[key as keyof typeof theme] ?? config.default;
		lines.push(`${config.var}: ${value};`);
	}

	return lines.join('\n');
}

/**
 * Map displaySettings keys to CSS_VARS keys
 * Handles both camelCase and kebab-case input
 *
 * @param displaySettings - Object with display settings from config/API
 * @returns Object with CSS_VARS keys mapped to their values
 */
export function mapDisplaySettingsToCssVars(
	displaySettings: Record<string, unknown>
): Record<string, string> {
	const result: Record<string, string> = {};

	for (const [key, value] of Object.entries(displaySettings)) {
		// Skip non-string values and behavior settings
		if (typeof value !== 'string' || BEHAVIOR_SETTINGS.has(key)) {
			continue;
		}

		// Try direct match first (key is already a CSS_VARS key)
		if (key in CSS_VARS) {
			result[key] = value;
			continue;
		}

		// Try alias lookup
		const aliasKey = KEY_ALIASES[key];
		if (aliasKey) {
			result[aliasKey] = value;
		}
	}

	return result;
}

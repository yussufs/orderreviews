/**
 * Google Reviews Widget Entry Point
 * Mounts the Svelte widget inside a Shadow DOM for style isolation
 * Supports multiple widget instances on the same page
 */

import WidgetRouter from './WidgetRouter.svelte';
import { mount } from 'svelte';
import { extractWidgetConfig } from './lib/api';
import { parseDisplaySettings } from './lib/utils';
import baseStyles from './styles/base.css?inline';

// Extend the Window interface to include _DragonIOFontsInjected
declare global {
	interface Window {
		_DragonIOFontsInjected?: boolean;
	}
}

/**
 * Load Google Fonts into the document head (outside Shadow DOM)
 */
function loadBaseFonts() {
	if (window._DragonIOFontsInjected) {
		return;
	}

	const hasManrope = document.head.querySelector(
		'link[href*="fonts.googleapis.com"][href*="Manrope"]'
	);
	const hasNotoSans = document.head.querySelector(
		'link[href*="fonts.googleapis.com"][href*="Noto+Sans"]'
	);

	if (!hasManrope || !hasNotoSans) {
		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href =
			'https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&family=Noto+Sans:ital,wght@0,100..900;1,100..900&display=swap';
		document.head.appendChild(link);
	}

	window._DragonIOFontsInjected = true;
}

/**
 * Initialize a single widget instance
 */
function initWidget(container: HTMLElement) {
	// Check if already initialized (prevent double initialization)
	if (container.shadowRoot) {
		return;
	}

	// Apply width styles directly on the element (must be outside Shadow DOM)
	// Note: The shopify-block wrapper handles grid-column via CSS class in liquid
	container.style.display = 'block';
	container.style.width = '100%';
	container.style.maxWidth = '100%';
	container.style.minWidth = '0';
	container.style.boxSizing = 'border-box';

	// Extract configuration from attributes
	const config = extractWidgetConfig(container);
	const displaySettingsFromAttrs = parseDisplaySettings(container);

	// Merge display settings from attributes
	config.displaySettings = {
		showtime: true,
		variableheighttext: false,
		imagesToShow: 2,
		...displaySettingsFromAttrs
	};

	// Get custom CSS from attribute if provided
	const customCssAttr = container.getAttribute('custom-css');
	if (customCssAttr) {
		config.customCss = customCssAttr;
	}

	// Create Shadow DOM for style isolation
	const shadow = container.attachShadow({ mode: 'open' });

	// Inject base styles into shadow root
	const styleEl = document.createElement('style');
	styleEl.textContent = baseStyles;
	shadow.appendChild(styleEl);

	// Move any child <style> tags into the shadow root (for custom CSS from Liquid blocks)
	const childStyles = container.querySelectorAll('style');
	childStyles.forEach((style) => {
		shadow.appendChild(style.cloneNode(true));
		style.remove();
	});

	// Create a container inside the shadow root (minimal mount target for Svelte)
	const widgetContainer = document.createElement('div');
	widgetContainer.className = 'order-reviews-widget-shadow-container';
	shadow.appendChild(widgetContainer);

	// Mount the Svelte widget inside the Shadow DOM
	mount(WidgetRouter, {
		target: widgetContainer,
		props: {
			config
		}
	});

	// Load fonts
	loadBaseFonts();
}

/**
 * Widget container selector
 * Supports multiple selector patterns for flexibility
 */
const WIDGET_SELECTOR =
	'.order-reviews-widget-wrapper, [data-order-reviews-widget], order-reviews-widget';

/**
 * Initialize all widget instances on the page
 */
function init() {
	const widgets = document.querySelectorAll<HTMLElement>(WIDGET_SELECTOR);

	if (widgets.length === 0) {
		// Widget container not found - this is expected on non-widget pages
		return;
	}

	// Initialize each widget independently
	widgets.forEach(initWidget);
}

/**
 * Watch for dynamically added widget containers (e.g., AJAX page loads)
 * Uses MutationObserver to detect new containers and initialize them
 */
function observeDynamicContainers() {
	const observer = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			// Check added nodes for widget containers
			for (const node of mutation.addedNodes) {
				if (node.nodeType !== Node.ELEMENT_NODE) continue;

				const element = node as HTMLElement;

				// Check if the added node itself is a widget container
				if (element.matches?.(WIDGET_SELECTOR)) {
					initWidget(element);
				}

				// Check if the added node contains widget containers
				const nestedWidgets = element.querySelectorAll?.<HTMLElement>(WIDGET_SELECTOR);
				nestedWidgets?.forEach(initWidget);
			}
		}
	});

	// Observe the entire document for changes
	observer.observe(document.body, {
		childList: true,
		subtree: true
	});
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', () => {
		init();
		observeDynamicContainers();
	});
} else {
	init();
	observeDynamicContainers();
}

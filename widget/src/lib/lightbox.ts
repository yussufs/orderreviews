/**
 * Lightbox Store & Portal Manager
 * Manages the state of the image lightbox using Svelte stores
 * Renders lightbox to document.body to escape Shadow DOM constraints
 */
import { writable } from 'svelte/store';
import { mount } from 'svelte';
import LightboxPortal from '../components/LightboxPortal.svelte';

type LightboxState = {
	isOpen: boolean;
	images: string[];
	currentIndex: number;
};

// Create a writable store for lightbox state
export const lightboxStore = writable<LightboxState>({
	isOpen: false,
	images: [],
	currentIndex: 0
});

// Track the mounted lightbox portal instance
let lightboxPortalInstance: ReturnType<typeof mount> | null = null;
let lightboxContainer: HTMLDivElement | null = null;

/**
 * Ensure the lightbox portal is mounted to document.body
 * This allows the lightbox to escape Shadow DOM constraints
 */
function ensureLightboxPortal() {
	if (lightboxPortalInstance) return;

	// Create a container in document.body for the lightbox
	lightboxContainer = document.createElement('div');
	lightboxContainer.id = 'dragonio-lightbox-portal';
	lightboxContainer.style.cssText =
		'position: fixed; top: 0; left: 0; z-index: 2147483647; pointer-events: none;';
	document.body.appendChild(lightboxContainer);

	// Mount the lightbox portal component
	lightboxPortalInstance = mount(LightboxPortal, {
		target: lightboxContainer
	});
}

export function openLightbox(images: string[], startIndex: number = 0) {
	// Ensure portal is mounted before opening
	ensureLightboxPortal();

	lightboxStore.set({
		images,
		currentIndex: Math.max(0, Math.min(startIndex, images.length - 1)),
		isOpen: true
	});
}

export function closeLightbox() {
	lightboxStore.update((state) => ({ ...state, isOpen: false }));
}

export function nextImage() {
	lightboxStore.update((state) => {
		if (state.images.length === 0) return state;
		return {
			...state,
			currentIndex: (state.currentIndex + 1) % state.images.length
		};
	});
}

export function prevImage() {
	lightboxStore.update((state) => {
		if (state.images.length === 0) return state;
		return {
			...state,
			currentIndex: (state.currentIndex - 1 + state.images.length) % state.images.length
		};
	});
}

export function goToImage(index: number) {
	lightboxStore.update((state) => {
		if (index >= 0 && index < state.images.length) {
			return { ...state, currentIndex: index };
		}
		return state;
	});
}

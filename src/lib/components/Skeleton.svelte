<script lang="ts">
	interface Props {
		variant?: 'text' | 'box' | 'badge' | 'circle';
		width?: string;
		height?: string;
	}

	let { variant = 'text', width, height }: Props = $props();

	const defaults = {
		text: { width: '100px', height: '16px', radius: '4px' },
		box: { width: '40px', height: '40px', radius: '8px' },
		badge: { width: '60px', height: '24px', radius: '12px' },
		circle: { width: '40px', height: '40px', radius: '50%' }
	};

	const config = defaults[variant];
</script>

<div
	class="skeleton"
	style="
		width: {width || config.width};
		height: {height || config.height};
		border-radius: {config.radius};
	"
></div>

<style>
	.skeleton {
		background: linear-gradient(
			90deg,
			var(--color-bg-surface-secondary) 0%,
			var(--color-bg-surface-tertiary) 50%,
			var(--color-bg-surface-secondary) 100%
		);
		background-size: 200% 100%;
		animation: shimmer 1.5s var(--ease-in-out) infinite;
		flex-shrink: 0;
	}

	@keyframes shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}
</style>

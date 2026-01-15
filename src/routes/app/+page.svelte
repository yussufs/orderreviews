<script lang="ts">
	import { Page, Card, Button, Banner, Text, Badge, Divider, Checkbox, Icon } from '$lib/components';

	let visible = $state({
		banner: true,
		setupGuide: true,
		calloutCard: true,
		featuredApps: true
	});

	let expanded = $state({
		setupGuide: true,
		step1: false,
		step2: false,
		step3: false
	});

	let progress = $state(0);

	function updateProgress(event: Event) {
		const checkbox = event.currentTarget as HTMLInputElement;
		progress += checkbox.checked ? 1 : -1;
	}
</script>

<svelte:head>
	<title>Home</title>
</svelte:head>

<Page title="Home">
	{#snippet primaryAction()}
		<Button variant="primary">Create puzzle</Button>
	{/snippet}

	{#snippet secondaryActions()}
		<Button>Browse templates</Button>
		<Button>Import image</Button>
	{/snippet}

	<!-- Banner -->
	{#if visible.banner}
		<Banner tone="info" dismissible ondismiss={() => (visible.banner = false)}>
			3 of 5 puzzles created. <a href="#" class="banner-link">Upgrade to Puzzlify Pro</a> to create
			unlimited puzzles.
		</Banner>
	{/if}

	<!-- Setup Guide -->
	{#if visible.setupGuide}
		<Card>
			{#snippet actions()}
				<Button
					variant="tertiary"
					iconOnly
					onclick={() => (visible.setupGuide = false)}
				>
					{#snippet icon()}<Icon name="x" />{/snippet}
				</Button>
				<Button
					variant="tertiary"
					iconOnly
					onclick={() => (expanded.setupGuide = !expanded.setupGuide)}
				>
					{#snippet icon()}
						<Icon name={expanded.setupGuide ? 'chevron-up' : 'chevron-down'} />
					{/snippet}
				</Button>
			{/snippet}
			<div class="setup-header">
				<Text variant="headingMd">Setup Guide</Text>
				<Text as="p" tone="subdued">Use this personalized guide to get your store ready for sales.</Text>
				<Text as="p" variant="bodySm" tone="subdued">{progress} out of 3 steps completed</Text>
			</div>

			{#if expanded.setupGuide}
				<div class="setup-steps">
					<!-- Step 1 -->
					<div class="setup-step">
						<div class="step-header">
							<Checkbox
								label="Upload an image for your puzzle"
								name="step1"
								onchange={updateProgress}
							/>
							<Button
								variant="tertiary"
								iconOnly
								onclick={() => (expanded.step1 = !expanded.step1)}
							>
								{#snippet icon()}
									<Icon name={expanded.step1 ? 'chevron-up' : 'chevron-down'} />
								{/snippet}
							</Button>
						</div>
						{#if expanded.step1}
							<div class="step-content">
								<div class="step-details">
									<Text as="p">
										Start by uploading a high-quality image that will be used to create your
										puzzle. For best results, use images that are at least 1200x1200 pixels.
									</Text>
									<div class="step-actions">
										<Button variant="primary">Upload image</Button>
										<Button variant="plain">Image requirements</Button>
									</div>
								</div>
								<img
									src="https://cdn.shopify.com/s/assets/admin/checkout/settings-customizecart-705f57c725ac05be5a34ec20c05b94298cb8afd10aac7bd9c7ad02030f48cfa0.svg"
									alt="Upload illustration"
									class="step-image"
								/>
							</div>
						{/if}
					</div>

					<Divider spacing="none" />

					<!-- Step 2 -->
					<div class="setup-step">
						<div class="step-header">
							<Checkbox
								label="Choose a puzzle template"
								name="step2"
								onchange={updateProgress}
							/>
							<Button
								variant="tertiary"
								iconOnly
								onclick={() => (expanded.step2 = !expanded.step2)}
							>
								{#snippet icon()}
									<Icon name={expanded.step2 ? 'chevron-up' : 'chevron-down'} />
								{/snippet}
							</Button>
						</div>
						{#if expanded.step2}
							<div class="step-content">
								<div class="step-details">
									<Text as="p">
										Select a template for your puzzle - choose between 9-piece (beginner),
										16-piece (intermediate), or 25-piece (advanced) layouts.
									</Text>
									<div class="step-actions">
										<Button variant="primary">Choose template</Button>
										<Button variant="plain">See all templates</Button>
									</div>
								</div>
								<img
									src="https://cdn.shopify.com/s/assets/admin/checkout/settings-customizecart-705f57c725ac05be5a34ec20c05b94298cb8afd10aac7bd9c7ad02030f48cfa0.svg"
									alt="Template illustration"
									class="step-image"
								/>
							</div>
						{/if}
					</div>

					<Divider spacing="none" />

					<!-- Step 3 -->
					<div class="setup-step">
						<div class="step-header">
							<Checkbox
								label="Customize puzzle piece shapes"
								name="step3"
								onchange={updateProgress}
							/>
							<Button
								variant="tertiary"
								iconOnly
								onclick={() => (expanded.step3 = !expanded.step3)}
							>
								{#snippet icon()}
									<Icon name={expanded.step3 ? 'chevron-up' : 'chevron-down'} />
								{/snippet}
							</Button>
						</div>
						{#if expanded.step3}
							<div class="step-content">
								<div class="step-details">
									<Text as="p">
										Make your puzzle unique by customizing the shapes of individual pieces.
										Choose from classic, curved, or themed piece styles.
									</Text>
									<div class="step-actions">
										<Button variant="primary">Customize pieces</Button>
										<Button variant="plain">Learn about piece styles</Button>
									</div>
								</div>
								<img
									src="https://cdn.shopify.com/s/assets/admin/checkout/settings-customizecart-705f57c725ac05be5a34ec20c05b94298cb8afd10aac7bd9c7ad02030f48cfa0.svg"
									alt="Customize illustration"
									class="step-image"
								/>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</Card>
	{/if}

	<!-- Metrics Cards -->
	<Card padding="tight">
		<div class="metrics-grid">
			<a href="#" class="metric-card">
				<Text variant="headingSm">Total Designs</Text>
				<div class="metric-value">
					<Text variant="headingLg">156</Text>
					<Badge tone="success">
						<Icon name="arrow-up" size="small" /> 12%
					</Badge>
				</div>
			</a>
			<div class="metric-divider"></div>
			<a href="#" class="metric-card">
				<Text variant="headingSm">Units Sold</Text>
				<div class="metric-value">
					<Text variant="headingLg">2,847</Text>
					<Badge tone="warning">0%</Badge>
				</div>
			</a>
			<div class="metric-divider"></div>
			<a href="#" class="metric-card">
				<Text variant="headingSm">Return Rate</Text>
				<div class="metric-value">
					<Text variant="headingLg">3.2%</Text>
					<Badge tone="critical">
						<Icon name="arrow-down" size="small" /> 0.8%
					</Badge>
				</div>
			</a>
		</div>
	</Card>

	<!-- Callout Card -->
	{#if visible.calloutCard}
		<Card>
			{#snippet actions()}
				<Button
					variant="tertiary"
					iconOnly
					onclick={() => (visible.calloutCard = false)}
				>
					{#snippet icon()}<Icon name="x" />{/snippet}
				</Button>
			{/snippet}
			<div class="callout-content">
				<div class="callout-text">
					<Text variant="headingMd">Ready to create your custom puzzle?</Text>
					<Text as="p" tone="subdued">
						Start by uploading an image to your gallery or choose from one of our templates.
					</Text>
					<div class="callout-actions">
						<Button>Upload image</Button>
						<Button variant="plain">Browse templates</Button>
					</div>
				</div>
				<img
					src="https://cdn.shopify.com/static/images/polaris/patterns/callout.png"
					alt="Callout illustration"
					class="callout-image"
				/>
			</div>
		</Card>
	{/if}

	<!-- Puzzle Templates -->
	<Card title="Puzzle Templates">
		<div class="templates-grid">
			<a href="/app/puzzles/4-piece" class="template-card">
				<img
					src="https://cdn.shopify.com/static/images/polaris/patterns/4-pieces.png"
					alt="4-pieces puzzle template"
				/>
				<div class="template-footer">
					<Text variant="headingSm">4-Pieces</Text>
					<Button size="slim">View</Button>
				</div>
			</a>
			<a href="/app/puzzles/9-piece" class="template-card">
				<img
					src="https://cdn.shopify.com/static/images/polaris/patterns/9-pieces.png"
					alt="9-pieces puzzle template"
				/>
				<div class="template-footer">
					<Text variant="headingSm">9-Pieces</Text>
					<Button size="slim">View</Button>
				</div>
			</a>
			<a href="/app/puzzles/16-piece" class="template-card">
				<img
					src="https://cdn.shopify.com/static/images/polaris/patterns/16-pieces.png"
					alt="16-pieces puzzle template"
				/>
				<div class="template-footer">
					<Text variant="headingSm">16-Pieces</Text>
					<Button size="slim">View</Button>
				</div>
			</a>
		</div>
		<div class="see-all">
			<a href="/app/puzzles" class="see-all-link">See all puzzle templates</a>
		</div>
	</Card>

	<!-- News -->
	<Card title="News">
		<div class="news-grid">
			<div class="news-item">
				<Text variant="bodySm" tone="subdued">Jan 21, 2025</Text>
				<a href="/app/news/new-shapes-and-themes" class="news-title">
					<Text variant="headingSm">New puzzle shapes and themes added</Text>
				</a>
				<Text as="p" tone="subdued">
					We've added 5 new puzzle piece shapes and 3 seasonal themes to help you create more
					engaging and unique puzzles for your customers.
				</Text>
			</div>
			<div class="news-item">
				<Text variant="bodySm" tone="subdued">Nov 6, 2024</Text>
				<a href="/app/news/puzzle-difficulty-customization" class="news-title">
					<Text variant="headingSm">Puzzle difficulty customization features</Text>
				</a>
				<Text as="p" tone="subdued">
					Now you can fine-tune the difficulty of your puzzles with new rotation controls, edge
					highlighting options, and piece recognition settings.
				</Text>
			</div>
		</div>
		<div class="see-all">
			<a href="/app/news" class="see-all-link">See all news items</a>
		</div>
	</Card>

	<!-- Featured Apps -->
	{#if visible.featuredApps}
		<Card title="Featured apps">
			{#snippet actions()}
				<Button
					variant="tertiary"
					iconOnly
					onclick={() => (visible.featuredApps = false)}
				>
					{#snippet icon()}<Icon name="x" />{/snippet}
				</Button>
			{/snippet}
			<div class="apps-grid">
				<a href="https://apps.shopify.com/flow" class="app-card" target="_blank" rel="noopener">
					<img
						src="https://cdn.shopify.com/app-store/listing_images/15100ebca4d221b650a7671125cd1444/icon/CO25r7-jh4ADEAE=.png"
						alt="Shopify Flow"
						class="app-icon"
					/>
					<div class="app-info">
						<Text variant="headingSm">Shopify Flow</Text>
						<Text variant="bodySm" tone="subdued">Free</Text>
						<Text variant="bodySm" tone="subdued">Automate everything and get back to business.</Text>
					</div>
					<Button variant="tertiary" iconOnly>
						{#snippet icon()}<Icon name="download" />{/snippet}
					</Button>
				</a>
				<a href="https://apps.shopify.com/planet" class="app-card" target="_blank" rel="noopener">
					<img
						src="https://cdn.shopify.com/app-store/listing_images/87176a11f3714753fdc2e1fc8bbf0415/icon/CIqiqqXsiIADEAE=.png"
						alt="Shopify Planet"
						class="app-icon"
					/>
					<div class="app-info">
						<Text variant="headingSm">Shopify Planet</Text>
						<Text variant="bodySm" tone="subdued">Free</Text>
						<Text variant="bodySm" tone="subdued">
							Offer carbon-neutral shipping and showcase your commitment.
						</Text>
					</div>
					<Button variant="tertiary" iconOnly>
						{#snippet icon()}<Icon name="download" />{/snippet}
					</Button>
				</a>
			</div>
		</Card>
	{/if}
</Page>

<style>
	.banner-link {
		color: inherit;
		font-weight: var(--font-weight-medium);
	}

	.setup-header {
		display: flex;
		flex-direction: column;
		gap: var(--space-100);
		margin-bottom: var(--space-400);
	}

	.setup-steps {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.setup-step {
		padding: var(--space-300);
	}

	.step-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-400);
	}

	.step-content {
		display: flex;
		gap: var(--space-400);
		margin-top: var(--space-300);
		padding: var(--space-400);
		background: var(--color-bg-surface-secondary);
		border-radius: var(--radius-md);
	}

	.step-details {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--space-300);
	}

	.step-actions {
		display: flex;
		gap: var(--space-200);
	}

	.step-image {
		width: 80px;
		height: 80px;
		object-fit: contain;
		flex-shrink: 0;
	}

	.metrics-grid {
		display: grid;
		grid-template-columns: 1fr auto 1fr auto 1fr;
		gap: var(--space-200);
	}

	@media (max-width: 600px) {
		.metrics-grid {
			grid-template-columns: 1fr;
		}

		.metric-divider {
			display: none;
		}
	}

	.metric-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-200);
		padding: var(--space-300);
		border-radius: var(--radius-md);
		text-decoration: none;
		color: inherit;
		transition: background-color var(--duration-fast) var(--ease-default);
	}

	.metric-card:hover {
		background: var(--color-bg-surface-hover);
	}

	.metric-value {
		display: flex;
		align-items: center;
		gap: var(--space-200);
	}

	.metric-divider {
		width: 1px;
		background: var(--color-border);
	}

	.callout-content {
		display: flex;
		gap: var(--space-600);
		align-items: center;
	}

	.callout-text {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--space-200);
	}

	.callout-actions {
		display: flex;
		gap: var(--space-200);
		margin-top: var(--space-200);
	}

	.callout-image {
		width: 200px;
		border-radius: var(--radius-md);
		object-fit: cover;
	}

	@media (max-width: 600px) {
		.callout-content {
			flex-direction: column-reverse;
		}

		.callout-image {
			width: 100%;
			max-width: 200px;
		}
	}

	.templates-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(155px, 1fr));
		gap: var(--space-400);
	}

	.template-card {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		overflow: hidden;
		text-decoration: none;
		color: inherit;
		transition: box-shadow var(--duration-fast) var(--ease-default);
	}

	.template-card:hover {
		box-shadow: var(--shadow-md);
	}

	.template-card img {
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
	}

	.template-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-300);
		background: var(--color-bg-surface);
		border-top: 1px solid var(--color-border);
	}

	.see-all {
		text-align: center;
		margin-top: var(--space-400);
	}

	.see-all-link {
		color: var(--color-text-info);
		text-decoration: none;
		font-weight: var(--font-weight-medium);
	}

	.see-all-link:hover {
		text-decoration: underline;
	}

	.news-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: var(--space-400);
	}

	.news-item {
		display: flex;
		flex-direction: column;
		gap: var(--space-200);
		padding: var(--space-400);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
	}

	.news-title {
		text-decoration: none;
		color: inherit;
	}

	.news-title:hover {
		text-decoration: underline;
	}

	.apps-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--space-400);
	}

	.app-card {
		display: flex;
		gap: var(--space-300);
		padding: var(--space-400);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		text-decoration: none;
		color: inherit;
		transition: background-color var(--duration-fast) var(--ease-default);
	}

	.app-card:hover {
		background: var(--color-bg-surface-hover);
	}

	.app-icon {
		width: 48px;
		height: 48px;
		border-radius: var(--radius-md);
		flex-shrink: 0;
	}

	.app-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--space-050);
	}
</style>

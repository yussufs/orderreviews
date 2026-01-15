<script lang="ts">
	import { Page, Card, Button, TextField, Select, Text, Divider, Icon, Checkbox } from '$lib/components';

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		const form = event.target as HTMLFormElement;
		const formData = new FormData(form);
		const formEntries = Object.fromEntries(formData);
		console.log('Form data', formEntries);
		window.shopify?.toast.show('Settings saved');
	}

	const currencyOptions = [
		{ value: 'usd', label: 'US Dollar ($)' },
		{ value: 'cad', label: 'Canadian Dollar (CAD)' },
		{ value: 'eur', label: 'Euro (\u20AC)' }
	];

	const frequencyOptions = [
		{ value: 'immediately', label: 'Immediately' },
		{ value: 'hourly', label: 'Hourly digest' },
		{ value: 'daily', label: 'Daily digest' }
	];
</script>

<svelte:head>
	<title>Settings</title>
</svelte:head>

<form data-save-bar onsubmit={handleSubmit}>
	<Page title="Settings" narrow>
		<!-- Store Information -->
		<Card title="Store Information">
			<div class="form-stack">
				<TextField
					label="Store name"
					name="store-name"
					value="Puzzlify Store"
					placeholder="Enter store name"
				/>
				<TextField
					label="Business address"
					name="business-address"
					value="123 Main St, Anytown, USA"
					placeholder="Enter business address"
				/>
				<TextField
					label="Store phone"
					name="store-phone"
					value="+1 (555) 123-4567"
					placeholder="Enter phone number"
				/>
				<Select label="Primary currency" name="currency" options={currencyOptions} value="usd" />
			</div>
		</Card>

		<!-- Notifications -->
		<Card title="Notifications">
			<div class="form-stack">
				<Select
					label="Notification frequency"
					name="notification-frequency"
					options={frequencyOptions}
					value="immediately"
				/>
				<div class="checkbox-group">
					<Text variant="headingSm">Notification types</Text>
					<Checkbox
						label="New order notifications"
						name="notifications-new-order"
						value="new-order"
						checked
					/>
					<Checkbox
						label="Low stock alerts"
						name="notifications-low-stock"
						value="low-stock"
					/>
					<Checkbox
						label="Customer review notifications"
						name="notifications-customer-review"
						value="customer-review"
					/>
					<Checkbox
						label="Shipping updates"
						name="notifications-shipping-updates"
						value="shipping-updates"
					/>
				</div>
			</div>
		</Card>

		<!-- Preferences -->
		<Card title="Preferences">
			<div class="nav-list">
				<a href="/app/settings/shipping" class="nav-item">
					<div class="nav-item-content">
						<Text variant="headingSm">Shipping & fulfillment</Text>
						<Text tone="subdued">
							Shipping methods, rates, zones, and fulfillment preferences.
						</Text>
					</div>
					<Icon name="chevron-right" tone="subdued" />
				</a>
				<Divider spacing="none" />
				<a href="/app/settings/products-catalog" class="nav-item">
					<div class="nav-item-content">
						<Text variant="headingSm">Products & catalog</Text>
						<Text tone="subdued">
							Product defaults, customer experience, and catalog display options.
						</Text>
					</div>
					<Icon name="chevron-right" tone="subdued" />
				</a>
				<Divider spacing="none" />
				<a href="/app/settings/customer-support" class="nav-item">
					<div class="nav-item-content">
						<Text variant="headingSm">Customer support</Text>
						<Text tone="subdued">
							Support settings, help resources, and customer service tools.
						</Text>
					</div>
					<Icon name="chevron-right" tone="subdued" />
				</a>
			</div>
		</Card>

		<!-- Tools -->
		<Card title="Tools">
			<div class="tools-list">
				<div class="tool-item">
					<div class="tool-content">
						<Text variant="headingSm">Reset app settings</Text>
						<Text tone="subdued">
							Reset all settings to their default values. This action cannot be undone.
						</Text>
					</div>
					<Button tone="critical">Reset</Button>
				</div>
				<Divider spacing="tight" />
				<div class="tool-item">
					<div class="tool-content">
						<Text variant="headingSm">Export settings</Text>
						<Text tone="subdued">Download a backup of all your current settings.</Text>
					</div>
					<Button>Export</Button>
				</div>
			</div>
		</Card>
	</Page>
</form>

<style>
	.form-stack {
		display: flex;
		flex-direction: column;
		gap: var(--space-400);
	}

	.checkbox-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-300);
	}

	.nav-list {
		margin: calc(-1 * var(--space-400));
	}

	.nav-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-400);
		padding: var(--space-400);
		text-decoration: none;
		color: inherit;
		transition: background-color var(--duration-fast) var(--ease-default);
	}

	.nav-item:hover {
		background: var(--color-bg-surface-hover);
	}

	.nav-item-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-100);
	}

	.tools-list {
		display: flex;
		flex-direction: column;
	}

	.tool-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-400);
		padding: var(--space-200) 0;
	}

	.tool-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-100);
	}
</style>

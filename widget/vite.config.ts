import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';
import fs from 'fs';
import { glob } from 'glob';

function copyWidgetToAssetsPlugin() {
	return {
		name: 'copy-widget-to-assets',
		async closeBundle() {
			const outDir = resolve(__dirname, 'public');

			// Get all JS files from public directory
			const jsFiles = await glob(resolve(outDir, '*.js'));

			if (!jsFiles.length) {
				console.warn('No JS files found in public directory');
				return;
			}

			// Copy to Shopify extension assets folders
			const assetFolders = await glob(resolve(__dirname, '../extensions/**/assets'));

			if (assetFolders.length > 0) {
				// Empty asset folders first
				console.log(`Emptying ${assetFolders.length} asset folder(s)`);
				for (const folder of assetFolders) {
					try {
						const files = await fs.promises.readdir(folder);
						for (const file of files) {
							const filePath = resolve(folder, file);
							const stat = await fs.promises.stat(filePath);
							if (stat.isFile()) {
								await fs.promises.unlink(filePath);
								console.log(`Deleted ${filePath}`);
							}
						}
					} catch (error) {
						console.error(`Error emptying folder ${folder}:`, error);
					}
				}

				console.log(
					`Copying ${jsFiles.length} JS file(s) to ${assetFolders.length} asset folder(s)`
				);

				for (const folder of assetFolders) {
					for (const jsFile of jsFiles) {
						const fileName = jsFile.split('/').pop()!;
						const destFile = resolve(folder, fileName);
						try {
							await fs.promises.copyFile(jsFile, destFile);
							console.log(`Copied ${fileName} to ${destFile}`);
						} catch (error) {
							console.error(`Error copying ${fileName} to ${destFile}:`, error);
						}
					}
				}
			}
		}
	};
}

export default defineConfig({
	plugins: [
		svelte({
			compilerOptions: {
				customElement: false
			},
			emitCss: false
		}),
		copyWidgetToAssetsPlugin()
	],
	build: {
		outDir: 'public',
		emptyOutDir: true,
		lib: {
			entry: resolve(__dirname, 'src/main.ts'),
			name: 'GoogleReviewWidget',
			formats: ['iife'],
			fileName: () => 'widget.js'
		},
		rollupOptions: {
			output: {
				inlineDynamicImports: true
			}
		},
		minify: 'esbuild',
		cssCodeSplit: false
	},
	resolve: {
		alias: {
			'@': resolve(__dirname, 'src')
		}
	}
});

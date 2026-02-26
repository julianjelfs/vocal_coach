import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
	base,
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			strategies: 'generateSW',
			registerType: 'autoUpdate',
			manifest: false,
			workbox: {
				globDirectory: '.svelte-kit/output/client',
				globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
				globIgnores: ['**/sw.js', '**/workbox-*.js'],
				cleanupOutdatedCaches: true,
				clientsClaim: true
			},
			devOptions: {
				enabled: true,
				type: 'module'
			}
		})
	],
	worker: {
		format: 'es'
	}
});

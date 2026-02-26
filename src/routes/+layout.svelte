<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import InstallPrompt from '$lib/components/InstallPrompt.svelte';
	import { initSettings } from '$lib/stores/settingsStore';

	interface Props {
		children: import('svelte').Snippet;
	}
	const { children }: Props = $props();

	onMount(async () => {
		// Restore persisted settings before the first view renders
		await initSettings();

		if ('serviceWorker' in navigator) {
			try {
				const { registerSW } = await import('virtual:pwa-register');
				registerSW({ immediate: true });
			} catch {
				// Dev environment or SW not available
			}
		}
	});
</script>

{@render children()}
<InstallPrompt />

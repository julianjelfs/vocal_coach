<script lang="ts">
	import { onMount } from 'svelte';
	import { canInstallPWA, deferredInstallPrompt } from '$lib/stores/uiStore';

	onMount(() => {
		window.addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault();
			deferredInstallPrompt.set(e as unknown as Parameters<typeof deferredInstallPrompt.set>[0]);
			canInstallPWA.set(true);
		});

		window.addEventListener('appinstalled', () => {
			canInstallPWA.set(false);
			deferredInstallPrompt.set(null);
		});
	});

	async function install() {
		const prompt = $deferredInstallPrompt;
		if (!prompt) return;
		await prompt.prompt();
		const { outcome } = await prompt.userChoice;
		if (outcome === 'accepted') {
			canInstallPWA.set(false);
		}
	}
</script>

{#if $canInstallPWA}
	<button class="install-btn" onclick={install} aria-label="Add app to home screen">
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
			<polyline points="7 10 12 15 17 10"/>
			<line x1="12" y1="15" x2="12" y2="3"/>
		</svg>
		Install
	</button>
{/if}

<style>
	.install-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		flex-shrink: 0;
		margin-left: auto;
	}
</style>

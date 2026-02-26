<script lang="ts">
	import { showCents } from '$lib/stores/uiStore';
</script>

<button
	class="cents-toggle"
	class:active={$showCents}
	on:click={() => showCents.update((v) => !v)}
	title={$showCents ? 'Hide cents' : 'Show cents deviation'}
	aria-pressed={$showCents}
>
	¢
</button>

<style>
	.cents-toggle {
		min-width: 40px;
		font-size: 16px;
		font-weight: 600;
		flex-shrink: 0;
	}

	.cents-toggle.active {
		background: #1a2030;
		border-color: var(--color-accent);
		color: var(--color-accent);
	}
</style>

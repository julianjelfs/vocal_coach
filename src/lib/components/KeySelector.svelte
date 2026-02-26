<script lang="ts">
	import { selectedKey } from '$lib/stores/musicStore';
	import { KEY_NAMES } from '$lib/music/scales';
</script>

<label class="selector-wrap">
	<span class="label">Key</span>
	<select bind:value={$selectedKey} aria-label="Select key">
		{#each KEY_NAMES as key}
			<option value={key}>{key}</option>
		{/each}
	</select>
</label>

<style>
	.selector-wrap {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-shrink: 0;
	}
	.label {
		font-size: 12px;
		color: var(--color-muted);
		white-space: nowrap;
	}
	select {
		min-width: 68px;
	}
</style>

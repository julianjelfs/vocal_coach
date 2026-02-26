<script lang="ts">
	import { selectedScale } from '$lib/stores/musicStore';
	import { SCALES, type ScaleType } from '$lib/music/scales';

	const scaleOptions = Object.entries(SCALES).map(([value, def]) => ({
		value: value as ScaleType,
		label: def.name
	}));
</script>

<label class="selector-wrap">
	<span class="label">Scale</span>
	<select bind:value={$selectedScale} aria-label="Select scale">
		{#each scaleOptions as opt}
			<option value={opt.value}>{opt.label}</option>
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
		min-width: 130px;
	}
</style>

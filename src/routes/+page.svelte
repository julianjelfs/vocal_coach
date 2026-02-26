<script lang="ts">
	import { appPhase } from '$lib/stores/uiStore';
	import IdleView from '$lib/visualiser/IdleView.svelte';
	import CaptureView from '$lib/visualiser/CaptureView.svelte';
	import ReviewView from '$lib/visualiser/ReviewView.svelte';
	import HistoryView from '$lib/visualiser/HistoryView.svelte';
</script>

<svelte:head>
	<title>Vocal Pitch Trainer</title>
	<meta name="description" content="Real-time pitch trainer for singers" />
</svelte:head>

{#if $appPhase === 'idle'}
	<IdleView />
{:else if $appPhase === 'capturing'}
	<CaptureView />
{:else if $appPhase === 'reviewing'}
	<ReviewView />
{:else if $appPhase === 'history'}
	<HistoryView />
{/if}

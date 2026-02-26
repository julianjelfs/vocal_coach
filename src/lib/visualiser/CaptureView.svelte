<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { tracePoints } from '$lib/stores/pitchTraceStore';
	import { sessionMode } from '$lib/stores/uiStore';
	import { audioError } from '$lib/stores/audioStore';
	import { tuningBackground, tuningAccent } from '$lib/visualiser/colours';
	import CaptureControls from '$lib/components/CaptureControls.svelte';

	// Bound to CaptureControls exported props
	let timeLeft = 0;
	let currentTargetMidi: number | null = null;
	let controls: CaptureControls;

	// 3-2-1 pre-session countdown
	let countdown: number | null = 3;
	let countdownInterval: ReturnType<typeof setInterval> | null = null;

	// Reactive values from tracePoints
	let degreeLabel: string | null = null;
	let centsDeviation: number | null = null;
	let absCents: number | null = null;

	const unsubTrace = tracePoints.subscribe((pts) => {
		if (pts.length > 0) {
			const last = pts[pts.length - 1];
			degreeLabel = last.degreeLabel;
			centsDeviation = last.centsDeviation;
			absCents = Math.abs(last.centsDeviation);
		} else {
			degreeLabel = null;
			centsDeviation = null;
			absCents = null;
		}
	});

	onMount(() => {
		// Count down 3-2-1 then start the session
		countdownInterval = setInterval(async () => {
			if (countdown !== null && countdown > 1) {
				countdown--;
			} else {
				clearInterval(countdownInterval!);
				countdownInterval = null;
				countdown = null;
				await controls.start();
			}
		}, 1000);

		return () => {
			unsubTrace();
			if (countdownInterval) clearInterval(countdownInterval);
		};
	});

	function formatCountdown(secs: number): string {
		const m = Math.floor(secs / 60);
		const s = secs % 60;
		return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
	}

	$: bgColour = tuningBackground(absCents);
	$: accentColour = tuningAccent(absCents);
	$: centsSign = centsDeviation !== null ? (centsDeviation >= 0 ? '+' : '') : '';
</script>

<div class="capture-view" style="background-color: {bgColour}">
	<!-- Minimal top bar -->
	<div class="top-bar">
		<button class="stop-btn" on:click={() => controls.stop()} aria-label="Stop session">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
				<rect x="4" y="4" width="16" height="16" rx="2"/>
			</svg>
			Stop
		</button>

		{#if $sessionMode !== 'free'}
			<span class="headphones-notice">🎧 Use headphones</span>
		{/if}

		{#if $sessionMode !== 'free' && timeLeft > 0}
			<span class="countdown" style="color: {accentColour}">{formatCountdown(timeLeft)}</span>
		{/if}
	</div>

	<!-- Main pitch display -->
	<div class="pitch-display">
		{#if degreeLabel !== null && centsDeviation !== null}
			<div class="degree-label" style="color: {accentColour}">{degreeLabel}</div>
			<div class="cents-readout" style="color: {accentColour}">
				{centsSign}{Math.round(centsDeviation)}¢
			</div>
			{#if $sessionMode !== 'free' && currentTargetMidi !== null}
				<div class="target-hint">target note playing</div>
			{/if}
		{:else}
			<div class="silence-hint">Sing into your microphone…</div>
		{/if}
	</div>

	<!-- Error display -->
	{#if $audioError}
		<p class="error-msg" role="alert">{$audioError}</p>
	{/if}

	<!-- Invisible controller -->
	<CaptureControls bind:this={controls} bind:timeLeft bind:currentTargetMidi />

	<!-- 3-2-1 pre-session overlay -->
	{#if countdown !== null}
		<div class="countdown-overlay">
			{#key countdown}
				<span class="countdown-number">{countdown}</span>
			{/key}
		</div>
	{/if}
</div>

<style>
	.capture-view {
		height: 100dvh;
		display: flex;
		flex-direction: column;
		transition: background-color 0.2s ease;
		position: relative;
	}

	.top-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		flex-shrink: 0;
	}

	.stop-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 14px;
		font-weight: 600;
		background: rgba(0, 0, 0, 0.3);
		border-color: rgba(255, 255, 255, 0.15);
		color: rgba(255, 255, 255, 0.8);
		backdrop-filter: blur(4px);
	}

	.headphones-notice {
		font-size: 12px;
		color: rgba(255, 255, 255, 0.45);
	}

	.countdown {
		font-size: 20px;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.5px;
	}

	.pitch-display {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 24px;
	}

	.degree-label {
		font-size: clamp(80px, 25vw, 140px);
		font-weight: 900;
		line-height: 1;
		letter-spacing: -2px;
		transition: color 0.15s;
	}

	.cents-readout {
		font-size: clamp(28px, 8vw, 48px);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		opacity: 0.9;
		transition: color 0.15s;
	}

	.target-hint {
		font-size: 14px;
		color: rgba(255, 255, 255, 0.4);
		margin-top: 8px;
	}

	.silence-hint {
		font-size: 18px;
		color: rgba(255, 255, 255, 0.35);
		text-align: center;
	}

	.countdown-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.55);
		backdrop-filter: blur(2px);
		pointer-events: none;
	}

	.countdown-number {
		font-size: clamp(120px, 40vw, 200px);
		font-weight: 900;
		color: #fff;
		line-height: 1;
		animation: pop-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}

	@keyframes pop-in {
		from { transform: scale(0.5); opacity: 0; }
		to   { transform: scale(1);   opacity: 1; }
	}

	.error-msg {
		position: absolute;
		bottom: 24px;
		left: 50%;
		transform: translateX(-50%);
		background: #2d1b1b;
		border: 1px solid #7f4040;
		color: #fca5a5;
		padding: 10px 16px;
		border-radius: 8px;
		font-size: 13px;
		max-width: min(380px, calc(100vw - 32px));
		text-align: center;
	}
</style>

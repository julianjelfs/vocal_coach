<script lang="ts">
	import { appPhase, sessionMode, runDurationSecs, noiseGateThreshold, tempoBpm, type SessionMode } from '$lib/stores/uiStore';
	import { selectedKey, selectedScale, selectedOctave } from '$lib/stores/musicStore';
	import { KEY_NAMES, SCALES, type ScaleType } from '$lib/music/scales';
	import { DroneEngine } from '$lib/audio/DroneEngine';
	import { musicContext } from '$lib/stores/musicStore';
	import { get } from 'svelte/store';
	import NoiseGateCalibrator from '$lib/components/NoiseGateCalibrator.svelte';

	let showNoiseGate = false;
	let showRegisterInfo = false;

	const drone = new DroneEngine();
	let droneCtx: AudioContext | null = null;

	const scaleOptions = Object.entries(SCALES).map(([value, def]) => ({
		value: value as ScaleType,
		label: def.name
	}));

	const durationOptions = [15, 30, 60, 120];
	const octaveOptions = [2, 3, 4, 5];

	function setMode(m: SessionMode) {
		sessionMode.set(m);
	}

	async function playRootReference() {
		// One-shot root tone to give reference before singing
		const ctx = get(musicContext);
		const octave = get(selectedOctave);
		const rootFreq = ctx.getFrequencyForDegree(0, octave);
		if (!rootFreq) return;

		if (!droneCtx || droneCtx.state === 'closed') {
			droneCtx = new AudioContext({ latencyHint: 'interactive' });
		}
		if (droneCtx.state === 'suspended') await droneCtx.resume();

		drone.play(droneCtx, rootFreq, 0.3);
		setTimeout(() => drone.stop(droneCtx!), 1200);
	}

	function startSession() {
		appPhase.set('capturing');
	}
</script>

<div class="idle-view">
	<div class="card">
		<h1 class="app-title">Vocal Pitch</h1>

		<!-- Mode picker -->
		<section class="section">
			<span class="section-label">Mode</span>
			<div class="mode-group" role="group" aria-label="Session mode">
				{#each ([['free', 'Free'], ['scale', 'Scale'], ['interval', 'Interval']] as const) as [val, label]}
					<button
						class="mode-btn"
						class:active={$sessionMode === val}
						on:click={() => setMode(val)}
						aria-pressed={$sessionMode === val}
					>
						{label}
					</button>
				{/each}
			</div>
			<p class="mode-desc">
				{#if $sessionMode === 'free'}
					Sing freely — see how close you are to the key and scale you choose.
				{:else if $sessionMode === 'scale'}
					Sing ascending and descending through the scale with a guide tone.
				{:else}
					Practice intervals: root → 2nd → root → 3rd → root → … with a guide tone.
				{/if}
			</p>
		</section>

		<!-- Key & Scale -->
		<section class="section row">
			<div class="field">
				<label class="field-label" for="key-select">Key</label>
				<select id="key-select" bind:value={$selectedKey}>
					{#each KEY_NAMES as key}
						<option value={key}>{key}</option>
					{/each}
				</select>
			</div>
			<div class="field">
				<label class="field-label" for="scale-select">Scale</label>
				<select id="scale-select" bind:value={$selectedScale}>
					{#each scaleOptions as opt}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</select>
			</div>
			<div class="field">
				<div class="field-label-row">
					<label class="field-label" for="octave-select">Register</label>
					<button
						class="info-btn"
						aria-label="What is register?"
						on:click|stopPropagation={() => (showRegisterInfo = !showRegisterInfo)}
					>ⓘ</button>
				</div>
				{#if showRegisterInfo}
					<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
					<div class="info-popover" on:click={() => (showRegisterInfo = false)}>
						Sets the octave the guide tone exercise is built around — choose the range that suits your voice.
						Lower numbers (2–3) suit deeper voices; higher numbers (4–5) suit lighter or higher voices.
						Has no effect in Free mode.
					</div>
				{/if}
				<select id="octave-select" bind:value={$selectedOctave}>
					<option value={2}>Low (oct 2)</option>
					<option value={3}>Mid-low (oct 3)</option>
					<option value={4}>Mid (oct 4)</option>
					<option value={5}>High (oct 5)</option>
				</select>
			</div>
		</section>

		<!-- Duration (scale/interval only) -->
		{#if $sessionMode !== 'free'}
			<section class="section">
				<span class="section-label">Duration</span>
				<div class="duration-group" role="group" aria-label="Run duration">
					{#each durationOptions as secs}
						<button
							class="dur-btn"
							class:active={$runDurationSecs === secs}
							on:click={() => runDurationSecs.set(secs)}
							aria-pressed={$runDurationSecs === secs}
						>
							{secs}s
						</button>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Tempo (scale/interval only) -->
		{#if $sessionMode !== 'free'}
			<section class="section">
				<span class="section-label">Tempo</span>
				<div class="tempo-row">
					<input
						id="tempo-slider"
						type="range"
						min="30"
						max="120"
						step="5"
						bind:value={$tempoBpm}
						class="tempo-slider"
						aria-label="Tempo in BPM"
					/>
					<span class="tempo-value">{$tempoBpm} BPM</span>
				</div>
			</section>
		{/if}

		<!-- Noise gate calibration -->
		<button class="noise-gate-btn" on:click={() => (showNoiseGate = true)}>
			<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
				<path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/>
				<path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
			</svg>
			Noise gate
			<span class="gate-value">{($noiseGateThreshold * 1000).toFixed(1)}</span>
		</button>

		<!-- Reference tone -->
		<button class="ref-btn" on:click={playRootReference} title="Play root note for reference">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
				<circle cx="12" cy="12" r="9"/>
				<line x1="12" y1="6" x2="12" y2="8"/>
				<line x1="12" y1="16" x2="12" y2="18"/>
				<path d="M12 8c-1.5 0-3 .8-3 2.5s1.5 2.5 3 2.5 3 .8 3 2.5-1.5 2.5-3 2.5"/>
			</svg>
			Play root note
		</button>

		<!-- Start -->
		<button class="start-btn" on:click={startSession}>
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
				<path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
				<line x1="12" y1="19" x2="12" y2="22"/>
				<line x1="8" y1="22" x2="16" y2="22"/>
			</svg>
			Start Listening
		</button>

		<!-- History link -->
		<button class="history-link" on:click={() => appPhase.set('history')}>
			View history
		</button>
	</div>
</div>

{#if showNoiseGate}
	<NoiseGateCalibrator on:close={() => (showNoiseGate = false)} />
{/if}

<style>
	.idle-view {
		height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
		background: var(--color-bg);
		overflow-y: auto;
	}

	.card {
		width: 100%;
		max-width: 480px;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.app-title {
		font-size: 24px;
		font-weight: 700;
		color: var(--color-text);
		letter-spacing: -0.5px;
		text-align: center;
	}

	.section {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.section.row {
		flex-direction: row;
		gap: 12px;
	}

	.section-label,
	.field-label {
		font-size: 12px;
		color: var(--color-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 4px;
		flex: 1;
		position: relative;
	}

	.field-label-row {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.info-btn {
		min-height: auto;
		min-width: auto;
		width: 16px;
		height: 16px;
		padding: 0;
		font-size: 13px;
		line-height: 1;
		background: transparent;
		border: none;
		color: var(--color-muted);
		cursor: pointer;
		opacity: 0.7;
	}

	.info-btn:hover {
		opacity: 1;
		color: var(--color-accent);
	}

	.info-popover {
		position: absolute;
		z-index: 10;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: 10px 12px;
		font-size: 12px;
		color: var(--color-muted);
		line-height: 1.5;
		max-width: 220px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
		cursor: pointer;
	}

	.mode-group,
	.duration-group {
		display: flex;
		gap: 0;
		border-radius: var(--radius);
		overflow: hidden;
		border: 1px solid var(--color-border);
	}

	.mode-btn,
	.dur-btn {
		flex: 1;
		border: none;
		border-radius: 0;
		font-size: 14px;
	}

	.mode-btn + .mode-btn,
	.dur-btn + .dur-btn {
		border-left: 1px solid var(--color-border);
	}

	.mode-btn.active,
	.dur-btn.active {
		background: #1a2744;
		color: var(--color-accent);
	}

	.mode-desc {
		font-size: 13px;
		color: var(--color-muted);
		line-height: 1.5;
	}

	.tempo-row {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.tempo-slider {
		flex: 1;
		accent-color: var(--color-accent);
		height: 4px;
		cursor: pointer;
	}

	.tempo-value {
		font-size: 13px;
		font-variant-numeric: tabular-nums;
		color: var(--color-muted);
		min-width: 60px;
		text-align: right;
	}

	.noise-gate-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		font-size: 14px;
		background: transparent;
		border-color: var(--color-border);
		color: var(--color-muted);
	}

	.gate-value {
		font-size: 11px;
		font-variant-numeric: tabular-nums;
		background: #0d3b38;
		color: #2dd4bf;
		border-radius: 4px;
		padding: 1px 6px;
		margin-left: 2px;
	}

	.ref-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		font-size: 14px;
		background: transparent;
		border-color: var(--color-border);
		color: var(--color-muted);
	}

	.start-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		min-height: 56px;
		font-size: 16px;
		font-weight: 700;
		background: #1a2744;
		border-color: var(--color-accent);
		color: var(--color-accent);
	}

	.start-btn:hover {
		background: #1e3060;
	}

	.history-link {
		background: transparent;
		border: none;
		color: var(--color-muted);
		font-size: 13px;
		text-decoration: underline;
		min-height: auto;
		padding: 4px;
	}
</style>

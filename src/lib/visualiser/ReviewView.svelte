<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import { completedSession } from '$lib/stores/sessionStore';
	import { appPhase } from '$lib/stores/uiStore';
	import { musicContext } from '$lib/stores/musicStore';
	import { historyStore } from '$lib/stores/historyStore';
	import { DroneEngine } from '$lib/audio/DroneEngine';
	import { renderReviewFrame, getReplayTargetMidi, midiToFreq } from '$lib/visualiser/reviewRenderer';
	import { SCALES } from '$lib/music/scales';

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D;
	let resizeObserver: ResizeObserver;
	let logicalWidth = 0;
	let logicalHeight = 0;

	let playheadFraction = 0;
	let isReplaying = false;
	let pausedAtFraction = 0;
	let replayInterval: ReturnType<typeof setInterval> | null = null;
	let droneCtx: AudioContext | null = null;
	const drone = new DroneEngine();

	// Decoded audio buffer from the session recording (null if not available)
	let audioBuffer: AudioBuffer | null = null;
	let voiceSource: AudioBufferSourceNode | null = null;

	// What audio to play during replay
	type ReplayAudio = 'guide' | 'voice' | 'both';
	let replayAudio: ReplayAudio = 'voice';
	let guideVolume = 0.05; // 0–1

	$effect(() => { drone.setVolume(guideVolume); });

	let saveStatus: 'idle' | 'saving' | 'saved' | 'error' = 'idle';

	let session = $derived($completedSession);
	let scaleTones = $derived(get(musicContext).getScaleTones());

	// Clamp the Y axis to the envelope of the target notes (scale/interval mode)
	// or the actual sung range (free mode), so the canvas isn't cluttered with
	// irrelevant octave range above/below.
	let midiMin = $derived.by(() => {
		if (session?.targetSequence && session.targetSequence.length > 0) {
			return Math.min(...session.targetSequence) - 2;
		}
		const midis = (session?.tracePoints ?? []).map((p) => p.smoothedMidi).sort((a, b) => a - b);
		if (midis.length > 0) {
			return midis[Math.floor(midis.length * 0.05)] - 3;
		}
		return 40;
	});
	let midiMax = $derived.by(() => {
		if (session?.targetSequence && session.targetSequence.length > 0) {
			return Math.max(...session.targetSequence) + 2;
		}
		const midis = (session?.tracePoints ?? []).map((p) => p.smoothedMidi).sort((a, b) => a - b);
		if (midis.length > 0) {
			return midis[Math.floor(midis.length * 0.95)] + 3;
		}
		return 80;
	});

	let sessionStart = $derived(session?.tracePoints[0]?.timestamp ?? 0);
	let sessionDuration = $derived(session?.durationMs ?? 1);

	let scaleLabel = $derived(session
		? `${session.key} ${SCALES[session.scale]?.name ?? session.scale}`
		: '');

	function resize() {
		const dpr = window.devicePixelRatio || 1;
		const rect = canvas.getBoundingClientRect();
		logicalWidth = rect.width;
		logicalHeight = rect.height;
		canvas.width = rect.width * dpr;
		canvas.height = rect.height * dpr;
		ctx = canvas.getContext('2d')!;
		ctx.scale(dpr, dpr);
		draw();
	}

	function draw() {
		if (!ctx || !session) return;
		renderReviewFrame(ctx, logicalWidth, logicalHeight, {
			scaleTones,
			tracePoints: session.tracePoints,
			targetSequence: session.targetSequence,
			tempoBpm: session.tempoBpm,
			sessionStart,
			sessionDuration,
			midiMin,
			midiMax,
			playheadFraction
		});
	}

	// Redraw when playhead moves
	$effect(() => { if (ctx && session) draw(); });

	async function startReplay(fromFraction = 0) {
		if (!session) return;

		// Hard-stop everything and tear down the old AudioContext entirely.
		// This guarantees no previous AudioBufferSourceNode keeps playing.
		if (replayInterval) { clearInterval(replayInterval); replayInterval = null; }
		if (voiceSource) { try { voiceSource.stop(); } catch { /**/ } voiceSource = null; }
		drone.stop(droneCtx ?? undefined);
		if (droneCtx) { droneCtx.close().catch(() => {}); droneCtx = null; }

		isReplaying = true;
		playheadFraction = fromFraction;
		pausedAtFraction = fromFraction;

		droneCtx = new AudioContext({ latencyHint: 'interactive' });
		if (droneCtx.state === 'suspended') await droneCtx.resume();

		const durationMs = session.durationMs;
		const durationSec = durationMs / 1000;
		const offsetSec = fromFraction * durationSec;

		// --- Real voice audio playback ---
		if ((replayAudio === 'voice' || replayAudio === 'both') && audioBuffer && droneCtx) {
			voiceSource = droneCtx.createBufferSource();
			voiceSource.buffer = audioBuffer;
			voiceSource.connect(droneCtx.destination);
			voiceSource.start(0, offsetSec);
			voiceSource.onended = () => { voiceSource = null; };
		}

		// --- Guide tone setup ---
		const targetSeq = session.targetSequence;
		// Fall back to deriving beat duration from session length / sequence length if
		// tempoBpm wasn't recorded (old sessions before the field was added)
		const beatSec = targetSeq && targetSeq.length > 0
			? session.tempoBpm
				? 60 / session.tempoBpm
				: durationSec / targetSeq.length
			: null;
		let lastGuideIndex = -1;

		// Anchor to AudioContext clock so everything stays in sync.
		// Subtract offsetSec so elapsed starts at the seek position.
		const startTime = droneCtx.currentTime - offsetSec;

		replayInterval = setInterval(() => {
			if (!droneCtx) return;
			const elapsed = droneCtx.currentTime - startTime;
			playheadFraction = Math.min(elapsed / durationSec, 1);

			// Guide tone: advance at original beat tempo
			if ((replayAudio === 'guide' || replayAudio === 'both') && targetSeq && beatSec && droneCtx) {
				const guideIndex = Math.floor(elapsed / beatSec);
				if (guideIndex !== lastGuideIndex) {
					lastGuideIndex = guideIndex;
					const midi = targetSeq[guideIndex % targetSeq.length];
					if (drone.isPlaying) drone.setFrequency(midiToFreq(midi));
					else drone.play(droneCtx, midiToFreq(midi), guideVolume);
				}
			}

			// Redraw canvas with updated playhead
			draw();

			if (playheadFraction >= 1) { stopReplay(); pausedAtFraction = 0; }
		}, 50);
	}

	function handleCanvasClick(e: MouseEvent) {
		const rect = canvas.getBoundingClientRect();
		const fraction = (e.clientX - rect.left) / rect.width;
		startReplay(Math.max(0, Math.min(1, fraction)));
	}

	function stopReplay() {
		if (replayInterval) {
			clearInterval(replayInterval);
			replayInterval = null;
		}
		if (voiceSource) {
			try { voiceSource.stop(); } catch { /* already ended */ }
			voiceSource = null;
		}
		drone.stop(droneCtx ?? undefined);
		if (droneCtx) { droneCtx.close().catch(() => {}); droneCtx = null; }
		pausedAtFraction = playheadFraction;
		isReplaying = false;
	}

	async function saveSession() {
		if (!session || saveStatus === 'saving' || saveStatus === 'saved') return;
		saveStatus = 'saving';
		try {
			await historyStore.save(session);
			saveStatus = 'saved';
		} catch {
			saveStatus = 'error';
		}
	}

	function goBack() {
		stopReplay();
		appPhase.set('idle');
	}

	onMount(async () => {
		// Decode voice recording blob into an AudioBuffer for playback
		if (session?.audioBlob) {
			try {
				const tempCtx = new AudioContext();
				const arrayBuffer = await session.audioBlob.arrayBuffer();
				audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
				await tempCtx.close();
			} catch {
				// Non-fatal — voice replay just won't work
				audioBuffer = null;
			}
		}
		ctx = canvas.getContext('2d')!;
		resizeObserver = new ResizeObserver(resize);
		resizeObserver.observe(canvas);
		resize();
	});

	onDestroy(() => {
		stopReplay();
		resizeObserver?.disconnect();
		droneCtx?.close().catch(() => {});
	});
</script>

<div class="review-view">
	<!-- Summary bar -->
	<header class="summary-bar">
		<div class="summary-left">
			<span class="summary-key">{scaleLabel}</span>
			<span class="summary-sep">·</span>
			<span class="summary-mode">{session?.mode ?? ''}</span>
		</div>
		{#if session?.score}
			<div class="grade-badge grade-{session.score.grade.toLowerCase()}">
				{session.score.grade}
			</div>
			<div class="score-detail">
				{Math.round(session.score.percentOnScale)}% on scale
			</div>
		{/if}
	</header>

	<!-- Canvas -->
	<div class="canvas-area">
		<canvas bind:this={canvas} class="review-canvas" aria-label="Session timeline" onclick={handleCanvasClick}></canvas>
	</div>

	<!-- Action bar -->
	<footer class="action-bar">
		<button
			class="replay-btn"
			class:active={isReplaying}
			onclick={isReplaying ? stopReplay : () => startReplay(pausedAtFraction)}
		>
			{#if isReplaying}
				<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
				Pause
			{:else}
				<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
				{pausedAtFraction > 0 ? 'Resume' : 'Replay'}
			{/if}
		</button>

		<!-- Audio mode toggle (only relevant if session has a guide sequence) -->
		{#if session?.targetSequence}
			<div class="audio-toggle" role="group" aria-label="Replay audio">
				{#each ([['voice', '🎤'], ['guide', '🎵'], ['both', '🎤🎵']] as const) as [val, label]}
					<button
						class="audio-btn"
						class:active={replayAudio === val}
						onclick={() => (replayAudio = val)}
						aria-pressed={replayAudio === val}
						title={val === 'voice' ? 'Hear your voice' : val === 'guide' ? 'Hear guide tone' : 'Hear both'}
					>{label}</button>
				{/each}
			</div>
			{#if replayAudio === 'guide' || replayAudio === 'both'}
				<input
					type="range"
					class="guide-vol"
					min="0" max="1" step="0.05"
					bind:value={guideVolume}
					aria-label="Guide tone volume"
					title="Guide tone volume"
				/>
			{/if}
		{/if}

		<button
			class="save-btn"
			onclick={saveSession}
			disabled={saveStatus === 'saving' || saveStatus === 'saved'}
		>
			{#if saveStatus === 'saved'}✓ Saved
			{:else if saveStatus === 'saving'}Saving…
			{:else if saveStatus === 'error'}Retry Save
			{:else}Save{/if}
		</button>

		<button class="back-btn" onclick={goBack}>← New Run</button>
	</footer>
</div>

<style>
	.review-view {
		height: 100dvh;
		display: grid;
		grid-template-rows: auto 1fr auto;
		background: var(--color-bg);
	}

	.summary-bar {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 16px;
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		flex-wrap: wrap;
	}

	.summary-left {
		display: flex;
		align-items: center;
		gap: 8px;
		flex: 1;
	}

	.summary-key {
		font-weight: 600;
		font-size: 14px;
	}

	.summary-sep,
	.summary-mode {
		color: var(--color-muted);
		font-size: 13px;
	}

	.grade-badge {
		font-size: 18px;
		font-weight: 900;
		width: 36px;
		height: 36px;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.grade-s { background: #0d3b38; color: #2dd4bf; }
	.grade-a { background: #1a2744; color: #63b3ed; }
	.grade-b { background: #2a1e0a; color: #fbbf24; }
	.grade-c { background: #1e2030; color: #94a3b8; }
	.grade-d { background: #1e2030; color: #64748b; }

	.score-detail {
		font-size: 13px;
		color: var(--color-muted);
	}

	.canvas-area {
		position: relative;
		overflow: hidden;
	}

	.review-canvas {
		width: 100%;
		height: 100%;
		display: block;
		cursor: pointer;
	}

	.action-bar {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 16px;
		background: var(--color-surface);
		border-top: 1px solid var(--color-border);
	}

	.replay-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		font-weight: 600;
	}

	.replay-btn.active {
		border-color: var(--color-accent);
		color: var(--color-accent);
	}

	.audio-toggle {
		display: flex;
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		overflow: hidden;
	}

	.audio-btn {
		flex: 1;
		border: none;
		border-radius: 0;
		font-size: 14px;
		padding: 0 10px;
	}

	.audio-btn + .audio-btn {
		border-left: 1px solid var(--color-border);
	}

	.audio-btn.active {
		background: #1a2744;
		color: var(--color-accent);
	}

	.guide-vol {
		width: 72px;
		accent-color: var(--color-accent);
		height: 4px;
		cursor: pointer;
	}

	.save-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.back-btn {
		margin-left: auto;
	}
</style>

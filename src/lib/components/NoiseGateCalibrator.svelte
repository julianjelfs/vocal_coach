<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { noiseGateThreshold } from '$lib/stores/uiStore';
	import { get } from 'svelte/store';

	interface Props {
		onclose: () => void;
	}
	const { onclose }: Props = $props();

	let canvas: HTMLCanvasElement;
	let audioCtx: AudioContext | null = null;
	let analyser: AnalyserNode | null = null;
	let stream: MediaStream | null = null;
	let animFrame: number;
	let micError: string | null = $state(null);

	// The draggable threshold in RMS units (0–1 scale, though typically 0–0.1)
	let threshold = $state(get(noiseGateThreshold));

	// Display scale: we show RMS on a 0–MAX_RMS linear scale
	const MAX_RMS = 0.15;

	// Rolling history of RMS samples for the bar graph
	const HISTORY_LEN = 120;
	const rmsHistory: number[] = new Array(HISTORY_LEN).fill(0);

	// Drag state
	let dragging = $state(false);
	let canvasHeight = 0;

	function rmsToY(rms: number, h: number): number {
		return h - (rms / MAX_RMS) * h;
	}

	function yToRms(y: number, h: number): number {
		return Math.max(0, Math.min(MAX_RMS, ((h - y) / h) * MAX_RMS));
	}

	function draw() {
		if (!canvas) return;
		const ctx = canvas.getContext('2d')!;
		const w = canvas.width;
		const h = canvas.height;
		canvasHeight = h;

		ctx.fillStyle = '#0f1117';
		ctx.fillRect(0, 0, w, h);

		// Grid lines at 0.02 RMS intervals
		ctx.strokeStyle = '#1e293b';
		ctx.lineWidth = 1;
		for (let r = 0.02; r < MAX_RMS; r += 0.02) {
			const y = rmsToY(r, h);
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(w, y);
			ctx.stroke();
		}

		// RMS history bars
		const barW = w / HISTORY_LEN;
		for (let i = 0; i < HISTORY_LEN; i++) {
			const rms = rmsHistory[i];
			const barH = (rms / MAX_RMS) * h;
			const x = i * barW;
			// Colour bars relative to threshold: green below, amber near, red above
			const ratio = rms / threshold;
			if (ratio < 0.8) {
				ctx.fillStyle = 'rgba(30, 41, 59, 0.9)'; // quiet — dark slate
			} else if (ratio < 1.0) {
				ctx.fillStyle = 'rgba(251, 191, 36, 0.6)'; // approaching — amber
			} else {
				ctx.fillStyle = 'rgba(248, 113, 113, 0.7)'; // above gate — red
			}
			ctx.fillRect(x, h - barH, barW - 1, barH);
		}

		// Threshold line
		const ty = rmsToY(threshold, h);
		ctx.strokeStyle = '#2dd4bf';
		ctx.lineWidth = 2;
		ctx.setLineDash([6, 3]);
		ctx.beginPath();
		ctx.moveTo(0, ty);
		ctx.lineTo(w, ty);
		ctx.stroke();
		ctx.setLineDash([]);

		// Threshold label
		ctx.fillStyle = '#2dd4bf';
		ctx.font = 'bold 11px system-ui, sans-serif';
		ctx.textAlign = 'right';
		ctx.fillText(`Gate: ${(threshold * 1000).toFixed(1)}`, w - 8, ty - 5);
		ctx.textAlign = 'left';

		// Drag handle — small circle on the right edge of the threshold line
		ctx.fillStyle = '#2dd4bf';
		ctx.beginPath();
		ctx.arc(w - 16, ty, 6, 0, Math.PI * 2);
		ctx.fill();
	}

	function tick() {
		if (!analyser) return;
		const buf = new Float32Array(analyser.fftSize);
		analyser.getFloatTimeDomainData(buf);

		let sumSq = 0;
		for (let i = 0; i < buf.length; i++) sumSq += buf[i] * buf[i];
		const rms = Math.sqrt(sumSq / buf.length);

		rmsHistory.shift();
		rmsHistory.push(rms);

		draw();
		animFrame = requestAnimationFrame(tick);
	}

	async function startMic() {
		try {
			stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					echoCancellation: false,
					noiseSuppression: false,
					autoGainControl: false,
					channelCount: 1
				}
			});
			audioCtx = new AudioContext({ latencyHint: 'interactive' });
			if (audioCtx.state === 'suspended') await audioCtx.resume();

			analyser = audioCtx.createAnalyser();
			analyser.fftSize = 2048;
			analyser.smoothingTimeConstant = 0;

			const source = audioCtx.createMediaStreamSource(stream);
			source.connect(analyser);
			// Not connected to destination — no audio output

			tick();
		} catch (e) {
			micError = 'Microphone access denied. Please allow mic access and try again.';
		}
	}

	function stopMic() {
		cancelAnimationFrame(animFrame);
		stream?.getTracks().forEach((t) => t.stop());
		stream = null;
		analyser = null;
		audioCtx?.close().catch(() => {});
		audioCtx = null;
	}

	function handlePointerDown(e: PointerEvent) {
		const rect = canvas.getBoundingClientRect();
		const y = e.clientY - rect.top;
		const h = rect.height;
		const ty = rmsToY(threshold, h);
		// Only start drag if pointer is within 16px of threshold line
		if (Math.abs(y - ty) <= 16) {
			dragging = true;
			canvas.setPointerCapture(e.pointerId);
		}
	}

	function handlePointerMove(e: PointerEvent) {
		if (!dragging) return;
		const rect = canvas.getBoundingClientRect();
		const y = e.clientY - rect.top;
		threshold = yToRms(y, rect.height);
		draw();
	}

	function handlePointerUp() {
		dragging = false;
	}

	function confirm() {
		noiseGateThreshold.set(threshold);
		onclose();
	}

	function cancel() {
		onclose();
	}

	onMount(() => {
		startMic();
	});

	onDestroy(() => {
		stopMic();
	});
</script>

<div class="overlay" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) cancel(); }}>
	<div class="panel">
		<header class="panel-header">
			<h2 class="panel-title">Noise Gate</h2>
			<button class="close-btn" onclick={cancel} aria-label="Close">✕</button>
		</header>

		<p class="instructions">
			Drag the teal line to just above the noise floor. Sounds below the line will be ignored.
		</p>

		{#if micError}
			<p class="mic-error">{micError}</p>
		{:else}
			<canvas
				bind:this={canvas}
				class="analyser-canvas"
				width="360"
				height="160"
				onpointerdown={handlePointerDown}
				onpointermove={handlePointerMove}
				onpointerup={handlePointerUp}
				onpointercancel={handlePointerUp}
				style="cursor: {dragging ? 'grabbing' : 'ns-resize'}"
				aria-label="Noise level analyser"
			></canvas>
		{/if}

		<footer class="panel-footer">
			<button class="cancel-btn" onclick={cancel}>Cancel</button>
			<button class="confirm-btn" onclick={confirm}>Set Gate</button>
		</footer>
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		padding: 16px;
	}

	.panel {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		width: 100%;
		max-width: 400px;
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 16px;
	}

	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.panel-title {
		font-size: 15px;
		font-weight: 600;
	}

	.close-btn {
		min-height: auto;
		min-width: auto;
		width: 28px;
		height: 28px;
		padding: 0;
		font-size: 12px;
		border-radius: 50%;
		background: transparent;
		border-color: transparent;
		color: var(--color-muted);
	}

	.close-btn:hover {
		background: #2d1b1b;
		color: #fca5a5;
		border-color: #7f4040;
	}

	.instructions {
		font-size: 13px;
		color: var(--color-muted);
		line-height: 1.5;
	}

	.analyser-canvas {
		width: 100%;
		height: 160px;
		border-radius: 6px;
		display: block;
		touch-action: none;
	}

	.mic-error {
		font-size: 13px;
		color: #fca5a5;
		text-align: center;
		padding: 24px 0;
	}

	.panel-footer {
		display: flex;
		gap: 8px;
		justify-content: flex-end;
	}

	.cancel-btn {
		background: transparent;
		border-color: var(--color-border);
		color: var(--color-muted);
		font-size: 14px;
	}

	.confirm-btn {
		background: #0d3b38;
		border-color: #2dd4bf;
		color: #2dd4bf;
		font-size: 14px;
		font-weight: 600;
	}
</style>

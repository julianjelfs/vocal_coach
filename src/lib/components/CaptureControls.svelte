<script lang="ts">
	/**
	 * CaptureControls — invisible session controller, rendered inside CaptureView.
	 * Owns the audio pipeline, timer, guide tones, and the capture→review transition.
	 */
	import { onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import { AudioEngine } from '$lib/audio/AudioEngine';
	import { DroneEngine } from '$lib/audio/DroneEngine';
	import { VibratoSmoother } from '$lib/audio/vibratoSmoother';
	import { isListening, rawPitch, pitchConfidence, smoothedPitch, audioError } from '$lib/stores/audioStore';
	import {
		pushTracePoint,
		clearTrace,
		startAccumulator,
		getAccumulator
	} from '$lib/stores/pitchTraceStore';
	import { musicContext, selectedKey, selectedScale, selectedOctave } from '$lib/stores/musicStore';
	import {
		appPhase,
		sessionMode,
		runDurationSecs,
		noiseGateThreshold,
		tempoBpm
	} from '$lib/stores/uiStore';
	import { completedSession, scoreSession } from '$lib/stores/sessionStore';
	import { historyStore } from '$lib/stores/historyStore';
	import { generateScaleSequence, generateIntervalSequence } from '$lib/music/sequenceGenerator';
	import { midiToFreq } from '$lib/music/noteUtils';

	const engine = new AudioEngine();
	const drone = new DroneEngine();
	const smoother = new VibratoSmoother();

	// Exposed for CaptureView to display
	export let timeLeft: number = 0;

	let lastTimestamp = 0;
	let timerInterval: ReturnType<typeof setInterval> | null = null;
	let metronomeInterval: ReturnType<typeof setInterval> | null = null;

	// Guide tone state (scale/interval modes)
	let targetSequence: number[] = [];
	let currentTargetIndex = 0;

	// Expose current target MIDI for the CaptureView display
	export let currentTargetMidi: number | null = null;

	function buildTargetSequence(): number[] {
		const ctx = get(musicContext);
		const octave = get(selectedOctave);
		const mode = get(sessionMode);
		if (mode === 'scale') return generateScaleSequence(ctx, octave);
		if (mode === 'interval') return generateIntervalSequence(ctx, octave);
		return [];
	}

	function updateGuideTone(): void {
		if (targetSequence.length === 0) {
			currentTargetMidi = null;
			return;
		}
		const midi = targetSequence[currentTargetIndex % targetSequence.length];
		currentTargetMidi = midi;
		const freq = midiToFreq(midi);
		const ctx = engine.audioContext;
		if (ctx) {
			if (drone.isPlaying) drone.setFrequency(freq);
			else drone.play(ctx, freq, 0.05);
		}
	}

	function startGuide(): void {
		targetSequence = buildTargetSequence();
		currentTargetIndex = 0;
		updateGuideTone();

		// Advance the guide tone on a fixed metronome tick, cycling until session ends
		const beatMs = (60 / get(tempoBpm)) * 1000;
		metronomeInterval = setInterval(() => {
			currentTargetIndex++;
			updateGuideTone();
		}, beatMs);
	}

	async function endSession(): Promise<void> {
		// Stop timers
		if (timerInterval) {
			clearInterval(timerInterval);
			timerInterval = null;
		}
		if (metronomeInterval) {
			clearInterval(metronomeInterval);
			metronomeInterval = null;
		}

		// Stop drone
		drone.stop(engine.audioContext ?? undefined);

		// Stop audio engine — returns the recorded blob if available
		const audioBlob = await engine.stop();
		smoother.reset();
		isListening.set(false);
		rawPitch.set(null);
		smoothedPitch.set(null);

		// Snapshot the full run
		const points = getAccumulator();
		const score = scoreSession(points);

		const session = {
			id: crypto.randomUUID(),
			startedAt: Date.now(),
			durationMs: points.length > 0
				? points[points.length - 1].timestamp - points[0].timestamp
				: 0,
			mode: get(sessionMode),
			key: get(selectedKey),
			scale: get(selectedScale),
			tracePoints: points,
			targetSequence: targetSequence.length > 0 ? targetSequence : null,
			tempoBpm: get(sessionMode) !== 'free' ? get(tempoBpm) : null,
			score,
			...(audioBlob ? { audioBlob } : {})
		};

		completedSession.set(session);

		// Auto-save to IndexedDB
		try {
			await historyStore.save(session);
		} catch (e) {
			console.warn('Failed to save session to IndexedDB:', e);
		}

		clearTrace();
		appPhase.set('reviewing');
	}

	export async function start(): Promise<void> {
		audioError.set(null);
		startAccumulator();
		clearTrace();
		lastTimestamp = 0;

		const mode = get(sessionMode);
		const durationSecs = get(runDurationSecs);
		const gateRms = get(noiseGateThreshold);

		try {
			await engine.start((msg) => {
				const now = performance.now();
				const delta = lastTimestamp ? now - lastTimestamp : 16;
				lastTimestamp = now;

				rawPitch.set(msg.frequency);
				pitchConfidence.set(msg.confidence);

				const { raw, center } = smoother.update(msg.frequency, delta);
				smoothedPitch.set(center);

				if (raw !== null && center !== null) {
					const ctx = get(musicContext);
					const analysis = ctx.analyse(raw);
					const centerAnalysis = ctx.analyse(center);

					pushTracePoint({
						timestamp: now,
						rawMidi: analysis.midiValue,
						smoothedMidi: centerAnalysis.midiValue,
						isOnScale: analysis.isOnScale,
						centsDeviation: analysis.centsDeviation,
						degreeLabel: analysis.nearestTone.degreeLabel
					});

					// Guide tone advancement is driven by metronome (startGuide)
				}
			}, gateRms);

			isListening.set(true);

			// Start guide tones for scale/interval
			if (mode !== 'free') {
				startGuide();
			}

			// Start countdown timer for scale/interval
			if (mode !== 'free') {
				timeLeft = durationSecs;
				timerInterval = setInterval(() => {
					timeLeft--;
					if (timeLeft <= 0) {
						endSession();
					}
				}, 1000);
			}
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			audioError.set(
				msg.includes('Permission') || msg.includes('NotAllowed')
					? 'Microphone access denied. Please allow microphone access and try again.'
					: 'Could not start microphone. ' + msg
			);
		}
	}

	export async function stop(): Promise<void> {
		await endSession();
	}

	onDestroy(() => {
		if (timerInterval) clearInterval(timerInterval);
		if (metronomeInterval) clearInterval(metronomeInterval);
		engine.stop().catch(() => {});
		drone.stop();
	});
</script>

<!-- No visible output — CaptureView renders the UI using exported props -->

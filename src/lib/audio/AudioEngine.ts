// @ts-expect-error — Vite ?worker&url import
import pitchProcessorUrl from './pitch-processor.worklet.ts?worker&url';

export interface PitchMessage {
	type: 'pitch';
	frequency: number | null;
	confidence: number;
	timestamp: number;
}

export class AudioEngine {
	private audioCtx: AudioContext | null = null;
	private workletNode: AudioWorkletNode | null = null;
	private sourceNode: MediaStreamAudioSourceNode | null = null;
	private stream: MediaStream | null = null;
	private recorder: MediaRecorder | null = null;
	private recordingChunks: Blob[] = [];

	get audioContext(): AudioContext | null {
		return this.audioCtx;
	}

	async start(onPitch: (msg: PitchMessage) => void, noiseGateRms?: number): Promise<void> {
		// Request microphone — no processing, we want raw signal
		this.stream = await navigator.mediaDevices.getUserMedia({
			audio: {
				echoCancellation: false,
				noiseSuppression: false,
				autoGainControl: false,
				channelCount: 1
			}
		});

		// Create context in response to user gesture (required on iOS Safari)
		this.audioCtx = new AudioContext({ latencyHint: 'interactive' });

		// iOS sometimes starts context in 'suspended' state
		if (this.audioCtx.state === 'suspended') {
			await this.audioCtx.resume();
		}

		await this.audioCtx.audioWorklet.addModule(pitchProcessorUrl);

		this.sourceNode = this.audioCtx.createMediaStreamSource(this.stream);
		this.workletNode = new AudioWorkletNode(this.audioCtx, 'pitch-processor');

		this.workletNode.port.onmessage = (e: MessageEvent<PitchMessage>) => {
			onPitch(e.data);
		};

		// Send noise gate config if provided
		if (noiseGateRms !== undefined) {
			this.workletNode.port.postMessage({ type: 'config', noiseGateRms });
		}

		// Connect source → worklet (NOT to destination — no audio output)
		this.sourceNode.connect(this.workletNode);

		// Record the raw mic stream in parallel so we can play it back in review
		this.recordingChunks = [];
		const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
			? 'audio/webm;codecs=opus'
			: MediaRecorder.isTypeSupported('audio/webm')
			? 'audio/webm'
			: 'audio/ogg';
		try {
			this.recorder = new MediaRecorder(this.stream, { mimeType });
			this.recorder.ondataavailable = (e) => {
				if (e.data.size > 0) this.recordingChunks.push(e.data);
			};
			this.recorder.start(100); // collect chunks every 100ms
		} catch {
			// MediaRecorder not available (e.g. some iOS versions) — non-fatal
			this.recorder = null;
		}
	}

	/** Stop the engine and return the recorded audio blob (null if unavailable). */
	async stop(): Promise<Blob | null> {
		// Stop recorder first and collect final chunk
		const audioBlob = await new Promise<Blob | null>((resolve) => {
			if (!this.recorder || this.recorder.state === 'inactive') {
				resolve(null);
				return;
			}
			this.recorder.onstop = () => {
				const blob = this.recordingChunks.length > 0
					? new Blob(this.recordingChunks, { type: this.recorder!.mimeType })
					: null;
				resolve(blob);
			};
			this.recorder.stop();
		});
		this.recorder = null;
		this.recordingChunks = [];

		this.stream?.getTracks().forEach((t) => t.stop());
		this.stream = null;
		this.workletNode?.port.close();
		this.workletNode?.disconnect();
		this.workletNode = null;
		this.sourceNode?.disconnect();
		this.sourceNode = null;
		if (this.audioCtx) {
			await this.audioCtx.close();
			this.audioCtx = null;
		}

		return audioBlob;
	}
}

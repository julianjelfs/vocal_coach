// AudioWorklet processor — runs in the audio rendering thread, not the main thread.
// No DOM, no module imports, must be self-contained.
// Implements the YIN algorithm for fundamental frequency detection.

interface PitchMessage {
	type: 'pitch';
	frequency: number | null;
	confidence: number;
	timestamp: number;
}

class PitchProcessor extends AudioWorkletProcessor {
	private readonly BUFFER_SIZE = 2048;
	private readonly HOP_SIZE = 512;
	private readonly YIN_THRESHOLD = 0.15;
	private readonly MIN_FREQ = 60; // Hz — low bass
	private readonly MAX_FREQ = 1200; // Hz — high soprano
	private SILENCE_RMS = 0.005; // mutable — configurable via port message

	private inputBuffer: Float32Array;
	private writePos = 0;
	private samplesUntilHop: number;

	constructor() {
		super();
		this.inputBuffer = new Float32Array(this.BUFFER_SIZE);
		this.samplesUntilHop = this.HOP_SIZE;

		// Accept runtime config from the main thread
		this.port.onmessage = (e: MessageEvent) => {
			if (e.data?.type === 'config' && typeof e.data.noiseGateRms === 'number') {
				this.SILENCE_RMS = e.data.noiseGateRms;
			}
		};
	}

	process(inputs: Float32Array[][], _outputs: Float32Array[][], _parameters: Record<string, Float32Array>): boolean {
		const input = inputs[0]?.[0];
		if (!input || input.length === 0) return true;

		// Accumulate samples into ring buffer
		for (let i = 0; i < input.length; i++) {
			this.inputBuffer[this.writePos] = input[i];
			this.writePos = (this.writePos + 1) % this.BUFFER_SIZE;
			this.samplesUntilHop--;

			if (this.samplesUntilHop <= 0) {
				this.samplesUntilHop = this.HOP_SIZE;
				this.processBuffer();
			}
		}

		return true;
	}

	private processBuffer(): void {
		// Build a linear copy starting from oldest sample
		const buf = new Float32Array(this.BUFFER_SIZE);
		for (let i = 0; i < this.BUFFER_SIZE; i++) {
			buf[i] = this.inputBuffer[(this.writePos + i) % this.BUFFER_SIZE];
		}

		// Silence gate — skip expensive YIN if signal is too quiet
		let sumSq = 0;
		for (let i = 0; i < buf.length; i++) sumSq += buf[i] * buf[i];
		const rms = Math.sqrt(sumSq / buf.length);

		if (rms < this.SILENCE_RMS) {
			this.port.postMessage({ type: 'pitch', frequency: null, confidence: 0, timestamp: currentTime } satisfies PitchMessage);
			return;
		}

		const result = this.yin(buf, sampleRate);
		this.port.postMessage({ type: 'pitch', ...result, timestamp: currentTime } satisfies PitchMessage);
	}

	private yin(buf: Float32Array, sr: number): { frequency: number | null; confidence: number } {
		const W = Math.floor(buf.length / 2); // half buffer = analysis window
		const minLag = Math.floor(sr / this.MAX_FREQ);
		const maxLag = Math.min(Math.floor(sr / this.MIN_FREQ), W - 1);

		if (minLag >= maxLag) return { frequency: null, confidence: 0 };

		// Step 1: Difference function
		// d(tau) = sum_{j=0}^{W-1} (x[j] - x[j+tau])^2
		const d = new Float32Array(maxLag + 1);
		for (let tau = 1; tau <= maxLag; tau++) {
			let sum = 0;
			for (let j = 0; j < W; j++) {
				const diff = buf[j] - buf[j + tau];
				sum += diff * diff;
			}
			d[tau] = sum;
		}

		// Step 2: Cumulative Mean Normalised Difference Function (CMNDF)
		const cmndf = new Float32Array(maxLag + 1);
		cmndf[0] = 1;
		let runningSum = 0;
		for (let tau = 1; tau <= maxLag; tau++) {
			runningSum += d[tau];
			cmndf[tau] = runningSum === 0 ? 0 : d[tau] * tau / runningSum;
		}

		// Step 3: Absolute threshold — find first local minimum below threshold
		let bestTau = -1;
		for (let tau = minLag + 1; tau < maxLag; tau++) {
			if (cmndf[tau] < this.YIN_THRESHOLD) {
				// Look for local minimum (dip)
				while (tau + 1 < maxLag && cmndf[tau + 1] < cmndf[tau]) {
					tau++;
				}
				bestTau = tau;
				break;
			}
		}

		// Fallback: if no threshold crossing, take global minimum in valid range
		if (bestTau === -1) {
			let minVal = Infinity;
			for (let tau = minLag; tau <= maxLag; tau++) {
				if (cmndf[tau] < minVal) {
					minVal = cmndf[tau];
					bestTau = tau;
				}
			}
			// Low confidence if we didn't cross threshold
			if (cmndf[bestTau] >= this.YIN_THRESHOLD) {
				return { frequency: null, confidence: 0 };
			}
		}

		// Step 4: Parabolic interpolation to refine tau
		let refinedTau = bestTau;
		if (bestTau > 0 && bestTau < maxLag) {
			const s0 = cmndf[bestTau - 1];
			const s1 = cmndf[bestTau];
			const s2 = cmndf[bestTau + 1];
			const denom = 2 * (2 * s1 - s0 - s2);
			if (denom !== 0) {
				refinedTau = bestTau + (s2 - s0) / denom;
			}
		}

		const frequency = sr / refinedTau;
		const confidence = Math.max(0, 1 - cmndf[bestTau]);

		return { frequency, confidence };
	}
}

registerProcessor('pitch-processor', PitchProcessor);

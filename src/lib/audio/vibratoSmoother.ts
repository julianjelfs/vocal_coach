/**
 * Two-stage EMA smoother for pitch signals.
 *
 * Stage 1 (fast): removes high-frequency noise but preserves vibrato wiggle.
 * Stage 2 (slow): tracks the vibrato centre across oscillation cycles.
 */
export class VibratoSmoother {
	private readonly ALPHA_FAST = 0.4; // ~2 frame time constant at 60Hz
	private readonly ALPHA_SLOW = 0.05; // ~330ms time constant at 60Hz
	private readonly SILENCE_GATE_MS = 100;

	private smoothedRaw: number | null = null;
	private center: number | null = null;
	private silenceMs = 0;

	update(rawHz: number | null, deltaMs: number): { raw: number | null; center: number | null } {
		if (rawHz === null) {
			this.silenceMs += deltaMs;
			if (this.silenceMs > this.SILENCE_GATE_MS) {
				this.smoothedRaw = null;
				this.center = null;
			}
			return { raw: null, center: null };
		}

		this.silenceMs = 0;

		// Initialise on first sample after silence
		if (this.smoothedRaw === null) {
			this.smoothedRaw = rawHz;
			this.center = rawHz;
		}

		this.smoothedRaw = this.ALPHA_FAST * rawHz + (1 - this.ALPHA_FAST) * this.smoothedRaw;
		this.center = this.ALPHA_SLOW * this.smoothedRaw + (1 - this.ALPHA_SLOW) * this.center!;

		return { raw: this.smoothedRaw, center: this.center };
	}

	reset(): void {
		this.smoothedRaw = null;
		this.center = null;
		this.silenceMs = 0;
	}
}

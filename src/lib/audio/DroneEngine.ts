/**
 * Plays a reference guide tone. Uses a sawtooth oscillator through a
 * high-pass filter for a clear, piano-adjacent timbre that's easy to
 * match against. Each note change re-triggers a short attack so the
 * onset is crisp and distinguishable.
 */
export class DroneEngine {
	private osc: OscillatorNode | null = null;
	private gainNode: GainNode | null = null;
	private filter: BiquadFilterNode | null = null;
	private _context: AudioContext | null = null;
	private _volume = 0.25;

	play(context: AudioContext, frequency: number, volume = 0.25): void {
		this.stop(context);
		this._context = context;
		this._volume = volume;

		this.filter = context.createBiquadFilter();
		this.filter.type = 'highpass';
		this.filter.frequency.value = 80; // remove sub-bass muddiness
		this.filter.connect(context.destination);

		this.gainNode = context.createGain();
		this.gainNode.gain.setValueAtTime(0, context.currentTime);
		// Short attack — crisp onset
		this.gainNode.gain.linearRampToValueAtTime(volume, context.currentTime + 0.04);
		this.gainNode.connect(this.filter);

		this.osc = context.createOscillator();
		this.osc.type = 'sawtooth';
		this.osc.frequency.value = frequency;
		this.osc.connect(this.gainNode);
		this.osc.start();
	}

	setFrequency(frequency: number): void {
		if (!this.osc || !this.gainNode || !this._context) return;
		const now = this._context.currentTime;
		// Retrigger envelope so each note change has a clear attack
		this.osc.frequency.setValueAtTime(frequency, now);
		this.gainNode.gain.cancelScheduledValues(now);
		this.gainNode.gain.setValueAtTime(0, now);
		this.gainNode.gain.linearRampToValueAtTime(this._volume, now + 0.04);
	}

	setVolume(volume: number): void {
		this._volume = volume;
		if (!this.gainNode || !this._context) return;
		const now = this._context.currentTime;
		this.gainNode.gain.cancelScheduledValues(now);
		this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
		this.gainNode.gain.linearRampToValueAtTime(volume, now + 0.02);
	}

	stop(context?: AudioContext): void {
		const ctx = context ?? this._context;
		if (this.gainNode && ctx) {
			const now = ctx.currentTime;
			this.gainNode.gain.cancelScheduledValues(now);
			this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
			this.gainNode.gain.linearRampToValueAtTime(0, now + 0.08);
			const osc = this.osc;
			const gn = this.gainNode;
			const filt = this.filter;
			setTimeout(() => {
				try { osc?.stop(); } catch { /* already stopped */ }
				gn?.disconnect();
				filt?.disconnect();
			}, 120);
		} else {
			try { this.osc?.stop(); } catch { /* already stopped */ }
			this.gainNode?.disconnect();
			this.filter?.disconnect();
		}
		this.osc = null;
		this.gainNode = null;
		this.filter = null;
		this._context = null;
	}

	get isPlaying(): boolean {
		return this.osc !== null;
	}
}

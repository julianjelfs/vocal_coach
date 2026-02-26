import { SCALES, KEY_MIDI_OFFSETS, type ScaleType } from './scales';
import { midiToFreq, freqToMidi, centsBetween } from './noteUtils';

export interface ScaleTone {
	midi: number;
	frequency: number;
	degree: number; // 0-indexed into scale intervals array
	degreeLabel: string;
	octave: number;
}

export interface PitchAnalysis {
	rawFrequency: number;
	midiValue: number; // fractional midi for canvas Y
	nearestTone: ScaleTone;
	centsDeviation: number; // -50 to +50
	isOnScale: boolean; // |cents| < 25
}

export class MusicContext {
	private scaleTones: ScaleTone[] = [];

	buildScale(
		keyName: string,
		scaleType: ScaleType,
		octaveMin = 2,
		octaveMax = 6
	): void {
		const rootOffset = KEY_MIDI_OFFSETS[keyName] ?? 0;
		const def = SCALES[scaleType];
		this.scaleTones = [];

		for (let octave = octaveMin; octave <= octaveMax + 1; octave++) {
			// MIDI for C in this octave = 12 * (octave + 1)
			const cMidi = 12 * (octave + 1);
			for (let di = 0; di < def.intervals.length; di++) {
				const midi = cMidi + rootOffset + def.intervals[di];
				if (midi < 36 || midi > 96) continue;
				this.scaleTones.push({
					midi,
					frequency: midiToFreq(midi),
					degree: di,
					degreeLabel: def.degreeLabels[di],
					octave
				});
			}
		}

		// Deduplicate by midi and sort ascending
		const seen = new Set<number>();
		this.scaleTones = this.scaleTones
			.filter((t) => {
				if (seen.has(t.midi)) return false;
				seen.add(t.midi);
				return true;
			})
			.sort((a, b) => a.midi - b.midi);
	}

	analyse(frequency: number): PitchAnalysis {
		const midiValue = freqToMidi(frequency);

		let nearestTone = this.scaleTones[0];
		let minDist = Infinity;
		for (const tone of this.scaleTones) {
			const dist = Math.abs(tone.midi - midiValue);
			if (dist < minDist) {
				minDist = dist;
				nearestTone = tone;
			}
		}

		const centsDeviation = centsBetween(frequency, nearestTone.frequency);

		return {
			rawFrequency: frequency,
			midiValue,
			nearestTone,
			centsDeviation,
			isOnScale: Math.abs(centsDeviation) < 25
		};
	}

	getScaleTones(): ScaleTone[] {
		return this.scaleTones;
	}

	getFrequencyForDegree(degreeIndex: number, preferredOctave = 4): number | null {
		// Find the tone with matching degree closest to preferredOctave
		const candidates = this.scaleTones.filter((t) => t.degree === degreeIndex);
		if (candidates.length === 0) return null;
		candidates.sort((a, b) => Math.abs(a.octave - preferredOctave) - Math.abs(b.octave - preferredOctave));
		return candidates[0].frequency;
	}
}

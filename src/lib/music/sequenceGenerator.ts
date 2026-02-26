import type { MusicContext } from './musicContext';

/**
 * Generates a scale sequence: ascending then descending.
 * Returns MIDI note numbers for each step.
 * e.g. C major octave 4: C4 D4 E4 F4 G4 A4 B4 C5 B4 A4 G4 F4 E4 D4 C4
 */
export function generateScaleSequence(ctx: MusicContext, octave: number): number[] {
	const tones = ctx.getScaleTones();

	// Get tones in the target octave and the one above (for turnaround)
	const ascending = tones.filter(
		(t) => t.octave === octave || (t.octave === octave + 1 && t.degree === 0)
	);

	if (ascending.length === 0) return [];

	// Sort ascending by MIDI
	ascending.sort((a, b) => a.midi - b.midi);

	// Descending: reverse, skip the top note (already included)
	const descending = [...ascending].reverse().slice(1);

	return [...ascending, ...descending].map((t) => t.midi);
}

/**
 * Generates the interval exercise sequence: root, 2nd, root, 3rd, root, 4th...
 * Pattern: 1, 2, 1, 3, 1, 4, 1, 5, 1, 6, 1, 7
 * Returns a single cycle; caller should repeat as needed.
 */
export function generateIntervalSequence(ctx: MusicContext, octave: number): number[] {
	const tones = ctx.getScaleTones();

	// Find the root in the preferred octave
	const root = tones.find((t) => t.degree === 0 && t.octave === octave);
	if (!root) return [];

	// Get the other degrees in the same octave
	const octaveTones = tones.filter((t) => t.octave === octave);
	octaveTones.sort((a, b) => a.degree - b.degree);

	const sequence: number[] = [];
	// Skip degree 0 (root) — we pair it with each other degree
	const intervals = octaveTones.filter((t) => t.degree !== 0);

	for (const interval of intervals) {
		sequence.push(root.midi); // always return to root
		sequence.push(interval.midi); // then the interval
	}

	// Final root
	sequence.push(root.midi);

	return sequence;
}

export const A4_FREQ = 440;
export const A4_MIDI = 69;

/** Convert MIDI note number to frequency in Hz (equal temperament) */
export function midiToFreq(midi: number): number {
	return A4_FREQ * Math.pow(2, (midi - A4_MIDI) / 12);
}

/** Convert frequency to fractional MIDI note number */
export function freqToMidi(freq: number): number {
	return A4_MIDI + 12 * Math.log2(freq / A4_FREQ);
}

/** Cents deviation between two frequencies (positive = sharp) */
export function centsBetween(detected: number, reference: number): number {
	return 1200 * Math.log2(detected / reference);
}

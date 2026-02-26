import { writable, derived } from 'svelte/store';
import { MusicContext } from '$lib/music/musicContext';
import { SCALES, type ScaleType } from '$lib/music/scales';

export const selectedKey = writable<string>('C');
export const selectedScale = writable<ScaleType>('major');
export const octaveMin = writable<number>(3);
export const octaveMax = writable<number>(5);
export const selectedOctave = writable<number>(4); // preferred octave for guide tones

// Derived: rebuilt whenever key, scale, or octave range changes
export const musicContext = derived(
	[selectedKey, selectedScale, octaveMin, octaveMax],
	([$key, $scale, $min, $max]) => {
		const ctx = new MusicContext();
		ctx.buildScale($key, $scale, $min, $max);
		return ctx;
	}
);

// Derived: degree labels for the current scale
export const currentDegreeLabels = derived(selectedScale, ($scale) => {
	return SCALES[$scale].degreeLabels;
});

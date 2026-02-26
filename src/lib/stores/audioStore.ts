import { writable } from 'svelte/store';

export const isListening = writable<boolean>(false);
export const rawPitch = writable<number | null>(null);
export const pitchConfidence = writable<number>(0);
export const smoothedPitch = writable<number | null>(null); // vibrato centre Hz
export const audioError = writable<string | null>(null);

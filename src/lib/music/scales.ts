export type ScaleType =
	| 'major'
	| 'naturalMinor'
	| 'harmonicMinor'
	| 'melodicMinor'
	| 'pentatonicMajor'
	| 'pentatonicMinor'
	| 'chromatic';

export interface ScaleDefinition {
	name: string;
	intervals: number[]; // semitone offsets from root within one octave
	degreeLabels: string[];
}

export const SCALES: Record<ScaleType, ScaleDefinition> = {
	major: {
		name: 'Major',
		intervals: [0, 2, 4, 5, 7, 9, 11],
		degreeLabels: ['1', '2', '3', '4', '5', '6', '7']
	},
	naturalMinor: {
		name: 'Natural Minor',
		intervals: [0, 2, 3, 5, 7, 8, 10],
		degreeLabels: ['1', '2', '♭3', '4', '5', '♭6', '♭7']
	},
	harmonicMinor: {
		name: 'Harmonic Minor',
		intervals: [0, 2, 3, 5, 7, 8, 11],
		degreeLabels: ['1', '2', '♭3', '4', '5', '♭6', '7']
	},
	melodicMinor: {
		name: 'Melodic Minor',
		intervals: [0, 2, 3, 5, 7, 9, 11],
		degreeLabels: ['1', '2', '♭3', '4', '5', '6', '7']
	},
	pentatonicMajor: {
		name: 'Pentatonic Major',
		intervals: [0, 2, 4, 7, 9],
		degreeLabels: ['1', '2', '3', '5', '6']
	},
	pentatonicMinor: {
		name: 'Pentatonic Minor',
		intervals: [0, 3, 5, 7, 10],
		degreeLabels: ['1', '♭3', '4', '5', '♭7']
	},
	chromatic: {
		name: 'Chromatic',
		intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
		degreeLabels: ['1', '♭2', '2', '♭3', '3', '4', '♯4', '5', '♭6', '6', '♭7', '7']
	}
};

export const KEY_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

export const KEY_MIDI_OFFSETS: Record<string, number> = {
	C: 0,
	'C♯': 1,
	D: 2,
	'E♭': 3,
	E: 4,
	F: 5,
	'F♯': 6,
	G: 7,
	'A♭': 8,
	A: 9,
	'B♭': 10,
	B: 11
};

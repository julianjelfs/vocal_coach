// Colour-blind-safe palette. Blue/teal/amber.
export const COLOURS = {
	background: '#0f1117',

	// Gravity bands — scale tones
	bandFill: 'rgba(99, 179, 237, 0.14)',
	bandStroke: 'rgba(99, 179, 237, 0.55)',

	// Target degree band (amber)
	bandTargetFill: 'rgba(251, 191, 36, 0.22)',
	bandTargetStroke: 'rgba(251, 191, 36, 0.85)',

	// Degree labels on bands
	degreeLabel: 'rgba(148, 163, 184, 0.65)',
	degreeLabelTarget: 'rgba(251, 191, 36, 1)',

	// Pitch trace
	traceOnScale: '#63b3ed', // blue-300
	traceOffScale: 'rgba(148, 163, 184, 0.35)', // faded slate
	traceCenter: '#fbbf24', // amber-400 for vibrato centre dot

	// Target ghost line in review
	targetGhost: 'rgba(251, 191, 36, 0.5)',

	// Playhead in review
	playhead: 'rgba(255, 255, 255, 0.6)',

	// Octave grid lines
	gridLine: 'rgba(51, 65, 85, 0.45)',

	// Cents readout overlay
	centsText: '#e2e8f0',
	centsMuted: '#64748b'
} as const;

/**
 * Tuning feedback background colour for CaptureView.
 * The user explicitly requested colour-coded in-tune feedback.
 * Calm palette: teal (in tune) → amber (close) → slate (off pitch).
 * null = silence → dark background.
 */
export function tuningBackground(absCents: number | null): string {
	if (absCents === null) return '#0f1117';
	if (absCents < 15) return '#0d3b38'; // deep teal
	if (absCents < 30) return '#3b2a0a'; // deep amber
	return '#1e293b'; // slate — calm, not alarming
}

/**
 * Foreground/glow colour matching the tuning state, for text accents.
 */
export function tuningAccent(absCents: number | null): string {
	if (absCents === null) return '#475569';
	if (absCents < 15) return '#2dd4bf'; // teal-400
	if (absCents < 30) return '#fbbf24'; // amber-400
	return '#94a3b8'; // slate-400
}

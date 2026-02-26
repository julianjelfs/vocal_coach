import { writable } from 'svelte/store';
import type { ScaleType } from '$lib/music/scales';
import type { SessionMode } from '$lib/stores/uiStore';
import type { TracePoint } from '$lib/stores/pitchTraceStore';

export interface SessionScore {
	percentOnScale: number; // % of TracePoints where |cents| < 25
	avgCentsDeviation: number; // mean absolute cents deviation
	grade: 'S' | 'A' | 'B' | 'C' | 'D';
}

export interface CompletedSession {
	id: string;
	startedAt: number; // Date.now()
	durationMs: number;
	mode: SessionMode;
	key: string;
	scale: ScaleType;
	tracePoints: TracePoint[];
	targetSequence: number[] | null; // MIDI notes; null for free mode
	tempoBpm: number | null; // guide tone BPM; null for free mode
	score: SessionScore;
	/** Raw mic recording — only present on the session just completed, not on history loads */
	audioBlob?: Blob;
}

export const completedSession = writable<CompletedSession | null>(null);

export function scoreSession(points: TracePoint[]): SessionScore {
	if (points.length === 0) {
		return { percentOnScale: 0, avgCentsDeviation: 0, grade: 'D' };
	}

	// Strip inter-note noise spikes (jumps > 3 semitones) before scoring,
	// same threshold used to suppress them in the review graph.
	const stable = points.filter((pt, i) => {
		if (i === 0) return true;
		return Math.abs(pt.rawMidi - points[i - 1].rawMidi) <= 3;
	});
	const scored = stable.length > 0 ? stable : points;

	const onScale = scored.filter((p) => p.isOnScale).length;
	const percentOnScale = (onScale / scored.length) * 100;
	const avgCentsDeviation =
		scored.reduce((sum, p) => sum + Math.abs(p.centsDeviation), 0) / scored.length;

	let grade: SessionScore['grade'];
	if (percentOnScale >= 90) grade = 'S';
	else if (percentOnScale >= 75) grade = 'A';
	else if (percentOnScale >= 60) grade = 'B';
	else if (percentOnScale >= 45) grade = 'C';
	else grade = 'D';

	return { percentOnScale, avgCentsDeviation, grade };
}

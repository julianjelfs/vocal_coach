import { writable } from 'svelte/store';

export interface TracePoint {
	timestamp: number; // performance.now() ms
	rawMidi: number; // fractional MIDI (vibrato-inclusive, noise-filtered)
	smoothedMidi: number; // vibrato centre MIDI
	isOnScale: boolean;
	centsDeviation: number;
	degreeLabel: string;
}

const TRACE_DURATION_MS = 5000;

// Rolling 5-second buffer for the live CaptureView display
export const tracePoints = writable<TracePoint[]>([]);

// Unbounded session accumulator — plain array, no reactivity during capture
let _accumulator: TracePoint[] = [];

export function startAccumulator(): void {
	_accumulator = [];
}

export function getAccumulator(): TracePoint[] {
	return [..._accumulator];
}

export function pushTracePoint(point: TracePoint): void {
	// Append to unbounded accumulator (no trimming)
	_accumulator.push(point);

	// Update rolling display buffer (trimmed to 5s)
	tracePoints.update((pts) => {
		const now = performance.now();
		const trimmed = pts.filter((p) => now - p.timestamp < TRACE_DURATION_MS);
		return [...trimmed, point];
	});
}

export function clearTrace(): void {
	tracePoints.set([]);
}

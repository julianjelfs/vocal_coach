import { COLOURS } from './colours';
import {
	midiToY,
	absoluteTimestampToX,
	drawOctaveLines,
	drawGravityBands,
	drawPitchTrace
} from './canvasRenderer';
import type { ScaleTone } from '$lib/music/musicContext';
import type { TracePoint } from '$lib/stores/pitchTraceStore';
import { midiToFreq } from '$lib/music/noteUtils';

export interface ReviewRenderState {
	scaleTones: ScaleTone[];
	tracePoints: TracePoint[];
	targetSequence: number[] | null; // MIDI notes; null = free mode
	tempoBpm: number | null; // BPM used during capture; null = free mode
	sessionStart: number; // timestamp of first TracePoint
	sessionDuration: number; // total ms
	midiMin: number;
	midiMax: number;
	playheadFraction: number; // 0–1, fraction along time axis
}

/**
 * Draw target overlay:
 * - Scale/Interval: step through targetSequence, draw amber segments for each expected note
 * - Free mode: derive from tracePoints[].degreeLabel (nearest scale tone at each moment)
 */
function drawTargetOverlay(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	state: ReviewRenderState,
	padding: number
): void {
	const { tracePoints, targetSequence, tempoBpm, scaleTones, sessionStart, sessionDuration, midiMin, midiMax } = state;
	if (tracePoints.length < 2) return;

	ctx.strokeStyle = COLOURS.targetGhost;
	ctx.lineWidth = 2;
	ctx.setLineDash([6, 4]);

	if (targetSequence && targetSequence.length > 0) {
		// Each note lasts exactly one beat at the recorded tempo.
		// Fall back to dividing session evenly for old sessions without tempoBpm.
		const beatMs = tempoBpm
			? (60 / tempoBpm) * 1000
			: sessionDuration / targetSequence.length;

		const sessionEnd = sessionStart + sessionDuration;
		for (let i = 0; ; i++) {
			const segStart = sessionStart + i * beatMs;
			if (segStart >= sessionEnd) break;

			const segEnd = Math.min(segStart + beatMs, sessionEnd);
			const midi = targetSequence[i % targetSequence.length];
			const y = midiToY(midi, height, midiMin, midiMax, padding);
			const x1 = absoluteTimestampToX(segStart, width, sessionStart, sessionDuration);
			const x2 = absoluteTimestampToX(segEnd, width, sessionStart, sessionDuration);

			ctx.beginPath();
			ctx.moveTo(x1, y);
			ctx.lineTo(x2, y);
			ctx.stroke();
		}
	} else {
		// Free mode: draw a step line through the nearest scale tone at each point
		// Group consecutive points with the same degreeLabel
		let lastMidi: number | null = null;
		let segStartX = 0;

		for (let i = 0; i < tracePoints.length; i++) {
			const pt = tracePoints[i];
			const x = absoluteTimestampToX(pt.timestamp, width, sessionStart, sessionDuration);

			// Find MIDI for this degree label in scaleTones
			const tone = scaleTones.find((t) => t.degreeLabel === pt.degreeLabel);
			const midi = tone?.midi ?? null;

			if (midi !== lastMidi) {
				if (lastMidi !== null) {
					const y = midiToY(lastMidi, height, midiMin, midiMax, padding);
					ctx.beginPath();
					ctx.moveTo(segStartX, y);
					ctx.lineTo(x, y);
					ctx.stroke();
				}
				lastMidi = midi;
				segStartX = x;
			}
		}

		// Draw final segment
		if (lastMidi !== null) {
			const lastX = absoluteTimestampToX(
				tracePoints[tracePoints.length - 1].timestamp,
				width,
				sessionStart,
				sessionDuration
			);
			const y = midiToY(lastMidi, height, midiMin, midiMax, padding);
			ctx.beginPath();
			ctx.moveTo(segStartX, y);
			ctx.lineTo(lastX, y);
			ctx.stroke();
		}
	}

	ctx.setLineDash([]);
}

function drawPlayhead(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	fraction: number
): void {
	const x = fraction * width;
	ctx.strokeStyle = COLOURS.playhead;
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.moveTo(x, 0);
	ctx.lineTo(x, height);
	ctx.stroke();
}

export function renderReviewFrame(
	ctx: CanvasRenderingContext2D,
	logicalWidth: number,
	logicalHeight: number,
	state: ReviewRenderState
): void {
	const { scaleTones, tracePoints, sessionStart, sessionDuration, midiMin, midiMax, playheadFraction } = state;
	const padding = logicalHeight * 0.05;

	// Only draw bands for scale tones within the visible MIDI range
	const visibleTones = scaleTones.filter((t) => t.midi >= midiMin && t.midi <= midiMax);

	ctx.fillStyle = COLOURS.background;
	ctx.fillRect(0, 0, logicalWidth, logicalHeight);

	drawOctaveLines(ctx, logicalWidth, logicalHeight, midiMin, midiMax, padding);
	drawGravityBands(ctx, logicalWidth, logicalHeight, visibleTones, null, midiMin, midiMax, padding);

	// Target overlay (amber dashed)
	drawTargetOverlay(ctx, logicalWidth, logicalHeight, state, padding);

	// Actual pitch trace (no centre dot in review — it's a full history)
	// In scale/interval mode, split the trace at beat boundaries so points from
	// different notes aren't connected by long diagonal lines across the graph.
	const toX = (ts: number) => absoluteTimestampToX(ts, logicalWidth, sessionStart, sessionDuration);
	if (state.targetSequence && state.targetSequence.length > 0 && tracePoints.length >= 2) {
		const beatMs = state.tempoBpm
			? (60 / state.tempoBpm) * 1000
			: sessionDuration / state.targetSequence.length;
		// Group points by which beat they fall in
		const groups = new Map<number, TracePoint[]>();
		for (const pt of tracePoints) {
			const beatIndex = Math.floor((pt.timestamp - sessionStart) / beatMs);
			if (!groups.has(beatIndex)) groups.set(beatIndex, []);
			groups.get(beatIndex)!.push(pt);
		}
		for (const group of groups.values()) {
			drawPitchTrace(ctx, logicalWidth, logicalHeight, group, toX, midiMin, midiMax, padding, false, 3);
		}
	} else {
		drawPitchTrace(ctx, logicalWidth, logicalHeight, tracePoints, toX, midiMin, midiMax, padding, false);
	}

	// Playhead
	if (playheadFraction > 0) {
		drawPlayhead(ctx, logicalWidth, logicalHeight, playheadFraction);
	}
}

/**
 * Returns the MIDI note that should be playing at a given replay fraction.
 * Used by ReviewView to drive the DroneEngine during replay.
 */
export function getReplayTargetMidi(
	fraction: number,
	targetSequence: number[] | null,
	tracePoints: TracePoint[],
	scaleTones: ScaleTone[]
): number | null {
	if (tracePoints.length === 0) return null;

	if (targetSequence && targetSequence.length > 0) {
		const idx = Math.floor(fraction * targetSequence.length);
		return targetSequence[Math.min(idx, targetSequence.length - 1)];
	}

	// Free mode: find the trace point nearest to this fraction
	const targetIdx = Math.floor(fraction * tracePoints.length);
	const pt = tracePoints[Math.min(targetIdx, tracePoints.length - 1)];
	const tone = scaleTones.find((t) => t.degreeLabel === pt.degreeLabel);
	return tone?.midi ?? null;
}

// Re-export midiToFreq for ReviewView's drone playback
export { midiToFreq };

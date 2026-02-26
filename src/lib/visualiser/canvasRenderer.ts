import { COLOURS } from './colours';
import type { ScaleTone } from '$lib/music/musicContext';
import type { TracePoint } from '$lib/stores/pitchTraceStore';

const TRACE_DURATION_MS = 5000;

export interface RenderState {
	scaleTones: ScaleTone[];
	targetDegree: number | null;
	tracePoints: TracePoint[];
	showCents: boolean;
	midiMin: number;
	midiMax: number;
	latestCents: number | null;
	latestDegreeLabel: string | null;
}

// ─── Coordinate helpers (exported for reuse in reviewRenderer) ──────────────

export function midiToY(
	midi: number,
	height: number,
	midiMin: number,
	midiMax: number,
	padding: number
): number {
	const fraction = (midi - midiMin) / (midiMax - midiMin);
	return height - padding - fraction * (height - 2 * padding);
}

/** Rolling timestamp → X: rightmost pixel = now, scrolls left over TRACE_DURATION_MS */
export function rollingTimestampToX(ts: number, width: number, now: number): number {
	const age = now - ts;
	const fraction = 1 - age / TRACE_DURATION_MS;
	return fraction * width;
}

/** Absolute timestamp → X: maps a point in a session to a pixel position */
export function absoluteTimestampToX(
	ts: number,
	width: number,
	sessionStart: number,
	sessionDuration: number
): number {
	if (sessionDuration === 0) return 0;
	return ((ts - sessionStart) / sessionDuration) * width;
}

// ─── Sub-renderers (exported for reuse in reviewRenderer) ──────────────────

export function drawOctaveLines(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	midiMin: number,
	midiMax: number,
	padding: number
): void {
	ctx.strokeStyle = COLOURS.gridLine;
	ctx.lineWidth = 0.75;
	for (let midi = Math.ceil(midiMin / 12) * 12; midi <= midiMax; midi += 12) {
		const y = midiToY(midi, height, midiMin, midiMax, padding);
		ctx.beginPath();
		ctx.moveTo(0, y);
		ctx.lineTo(width, y);
		ctx.stroke();
	}
}

export function drawGravityBands(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	scaleTones: ScaleTone[],
	targetDegree: number | null,
	midiMin: number,
	midiMax: number,
	padding: number
): void {
	const pixelsPerMidi = (height - 2 * padding) / (midiMax - midiMin);
	const bandHalf = (pixelsPerMidi * 25) / 100;

	for (const tone of scaleTones) {
		const y = midiToY(tone.midi, height, midiMin, midiMax, padding);
		const isTarget = targetDegree !== null && tone.degree === targetDegree;

		const fillBase = isTarget ? COLOURS.bandTargetFill : COLOURS.bandFill;
		const strokeColor = isTarget ? COLOURS.bandTargetStroke : COLOURS.bandStroke;

		const grad = ctx.createLinearGradient(0, y - bandHalf, 0, y + bandHalf);
		const transparent = fillBase.replace(/[\d.]+\)$/, '0)');
		grad.addColorStop(0, transparent);
		grad.addColorStop(0.25, fillBase);
		grad.addColorStop(0.75, fillBase);
		grad.addColorStop(1, transparent);

		ctx.fillStyle = grad;
		ctx.fillRect(0, y - bandHalf, width, bandHalf * 2);

		ctx.strokeStyle = strokeColor;
		ctx.lineWidth = isTarget ? 1.5 : 0.75;
		ctx.beginPath();
		ctx.moveTo(0, y);
		ctx.lineTo(width, y);
		ctx.stroke();

		ctx.fillStyle = isTarget ? COLOURS.degreeLabelTarget : COLOURS.degreeLabel;
		ctx.font = `${isTarget ? 'bold ' : ''}11px system-ui, sans-serif`;
		ctx.fillText(tone.degreeLabel, 6, y - 3);
	}
}

/**
 * Draw a pitch trace using a caller-supplied timestampToX function.
 * This allows both rolling (live) and absolute (review) rendering.
 */
export function drawPitchTrace(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	tracePoints: TracePoint[],
	toX: (ts: number) => number,
	midiMin: number,
	midiMax: number,
	padding: number,
	drawCentreDot = true,
	maxJump: number | null = null
): void {
	if (tracePoints.length < 2) return;

	ctx.lineWidth = 1.5;
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';

	let pathOpen = false;
	let lastOnScale: boolean | null = null;
	let lastRawMidi: number | null = null;

	for (let i = 0; i < tracePoints.length; i++) {
		const pt = tracePoints[i];
		const x = toX(pt.timestamp);
		const y = midiToY(pt.rawMidi, height, midiMin, midiMax, padding);

		// Break the line on large pitch jumps (noise/silence artefacts between notes)
		const bigJump = maxJump !== null && lastRawMidi !== null
			&& Math.abs(pt.rawMidi - lastRawMidi) > maxJump;

		if (i === 0 || bigJump) {
			if (pathOpen) ctx.stroke();
			ctx.strokeStyle = pt.isOnScale ? COLOURS.traceOnScale : COLOURS.traceOffScale;
			ctx.beginPath();
			ctx.moveTo(x, y);
			lastOnScale = pt.isOnScale;
			pathOpen = true;
		} else {
			if (pt.isOnScale !== lastOnScale) {
				if (pathOpen) ctx.stroke();
				ctx.strokeStyle = pt.isOnScale ? COLOURS.traceOnScale : COLOURS.traceOffScale;
				ctx.beginPath();
				ctx.moveTo(x, y);
				lastOnScale = pt.isOnScale;
			} else {
				ctx.lineTo(x, y);
			}
		}
		lastRawMidi = pt.rawMidi;
	}
	if (pathOpen) ctx.stroke();

	if (drawCentreDot) {
		const latest = tracePoints[tracePoints.length - 1];
		if (latest) {
			const cx = toX(latest.timestamp);
			const cy = midiToY(latest.smoothedMidi, height, midiMin, midiMax, padding);
			ctx.fillStyle = COLOURS.traceCenter;
			ctx.beginPath();
			ctx.arc(cx, cy, 5, 0, Math.PI * 2);
			ctx.fill();
		}
	}
}

function drawCentsReadout(
	ctx: CanvasRenderingContext2D,
	width: number,
	_height: number,
	cents: number,
	degreeLabel: string
): void {
	const sign = cents >= 0 ? '+' : '';
	const label = `${degreeLabel}  ${sign}${Math.round(cents)}¢`;
	ctx.font = 'bold 20px system-ui, sans-serif';
	ctx.textAlign = 'right';
	ctx.fillStyle = Math.abs(cents) < 15 ? COLOURS.traceCenter : COLOURS.centsText;
	ctx.fillText(label, width - 12, 32);
	ctx.textAlign = 'left';
}

// ─── Main entry point (live rolling view) ──────────────────────────────────

export function renderFrame(
	ctx: CanvasRenderingContext2D,
	logicalWidth: number,
	logicalHeight: number,
	state: RenderState
): void {
	const { scaleTones, targetDegree, tracePoints, showCents, midiMin, midiMax } = state;
	const padding = logicalHeight * 0.05;
	const now = performance.now();

	ctx.fillStyle = COLOURS.background;
	ctx.fillRect(0, 0, logicalWidth, logicalHeight);

	drawOctaveLines(ctx, logicalWidth, logicalHeight, midiMin, midiMax, padding);
	drawGravityBands(ctx, logicalWidth, logicalHeight, scaleTones, targetDegree, midiMin, midiMax, padding);
	drawPitchTrace(
		ctx, logicalWidth, logicalHeight, tracePoints,
		(ts) => rollingTimestampToX(ts, logicalWidth, now),
		midiMin, midiMax, padding
	);

	if (showCents && state.latestCents !== null && state.latestDegreeLabel !== null) {
		drawCentsReadout(ctx, logicalWidth, logicalHeight, state.latestCents, state.latestDegreeLabel);
	}
}

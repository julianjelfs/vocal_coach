/**
 * Loads persisted settings from IndexedDB on startup and writes back
 * whenever any of the tracked stores change.
 *
 * Call `initSettings()` once, early in the app lifecycle (e.g. +layout.svelte).
 */
import { get } from 'svelte/store';
import { sessionMode, runDurationSecs, noiseGateThreshold, tempoBpm } from './uiStore';
import { selectedKey, selectedScale, selectedOctave } from './musicStore';
import { loadSettings, saveSettings } from '$lib/persistence/idbSettings';

let _initialised = false;

export async function initSettings(): Promise<void> {
	if (_initialised) return;
	_initialised = true;

	// 1. Load persisted values and apply them
	const saved = await loadSettings();
	if (saved) {
		sessionMode.set(saved.mode);
		selectedKey.set(saved.key);
		selectedScale.set(saved.scale);
		selectedOctave.set(saved.octave);
		runDurationSecs.set(saved.durationSecs);
		noiseGateThreshold.set(saved.noiseGate);
		if (saved.tempoBpm) tempoBpm.set(saved.tempoBpm);
	}

	// 2. Subscribe to each store and persist on any change
	function persist() {
		saveSettings({
			id: 'settings',
			mode: get(sessionMode),
			key: get(selectedKey),
			scale: get(selectedScale),
			octave: get(selectedOctave),
			durationSecs: get(runDurationSecs),
			noiseGate: get(noiseGateThreshold),
			tempoBpm: get(tempoBpm)
		}).catch(() => {
			// Non-fatal — best-effort persistence
		});
	}

	sessionMode.subscribe(persist);
	selectedKey.subscribe(persist);
	selectedScale.subscribe(persist);
	selectedOctave.subscribe(persist);
	runDurationSecs.subscribe(persist);
	noiseGateThreshold.subscribe(persist);
	tempoBpm.subscribe(persist);
}

import { writable } from 'svelte/store';

export type AppPhase = 'idle' | 'capturing' | 'reviewing' | 'history';
export type SessionMode = 'free' | 'scale' | 'interval';

export const appPhase = writable<AppPhase>('idle');
export const sessionMode = writable<SessionMode>('free');
export const runDurationSecs = writable<number>(30); // used for scale/interval modes
export const noiseGateThreshold = writable<number>(0.005); // RMS threshold, configurable later
export const tempoBpm = writable<number>(60); // guide tone advance speed for scale/interval

export const showCents = writable<boolean>(false);
export const canInstallPWA = writable<boolean>(false);

// BeforeInstallPromptEvent is not in standard TS lib
export interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const deferredInstallPrompt = writable<BeforeInstallPromptEvent | null>(null);

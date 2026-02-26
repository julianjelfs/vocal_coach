import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { SessionMode } from '$lib/stores/uiStore';
import type { ScaleType } from '$lib/music/scales';
import type { CompletedSession } from '$lib/stores/sessionStore';
import type { HistoryStore } from '$lib/stores/historyStore';

export interface PersistedSettings {
	id: 'settings'; // single-row sentinel
	mode: SessionMode;
	key: string;
	scale: ScaleType;
	octave: number;
	durationSecs: number;
	noiseGate: number;
	tempoBpm: number;
}

interface VocalCoachDB extends DBSchema {
	sessions: {
		key: string;
		value: CompletedSession;
		indexes: { by_startedAt: number };
	};
	settings: {
		key: string;
		value: PersistedSettings;
	};
}

const DB_NAME = 'vocal-coach';
const DB_VERSION = 2;

let _db: IDBPDatabase<VocalCoachDB> | null = null;

async function getDB(): Promise<IDBPDatabase<VocalCoachDB>> {
	if (_db) return _db;
	_db = await openDB<VocalCoachDB>(DB_NAME, DB_VERSION, {
		upgrade(db, oldVersion) {
			if (oldVersion < 1) {
				const store = db.createObjectStore('sessions', { keyPath: 'id' });
				store.createIndex('by_startedAt', 'startedAt');
			}
			if (oldVersion < 2) {
				db.createObjectStore('settings', { keyPath: 'id' });
			}
		}
	});
	return _db;
}

export async function loadSettings(): Promise<PersistedSettings | undefined> {
	const db = await getDB();
	return db.get('settings', 'settings');
}

export async function saveSettings(s: PersistedSettings): Promise<void> {
	const db = await getDB();
	await db.put('settings', s);
}

// Re-export the history store implementation using the shared DB instance
// so both stores share the same connection and version.
export class IdbHistory implements HistoryStore {
	async save(session: CompletedSession): Promise<void> {
		const db = await getDB();
		await db.put('sessions', session);
	}

	async getAll(): Promise<CompletedSession[]> {
		const db = await getDB();
		const all = await db.getAllFromIndex('sessions', 'by_startedAt');
		return all.reverse();
	}

	async delete(id: string): Promise<void> {
		const db = await getDB();
		await db.delete('sessions', id);
	}
}

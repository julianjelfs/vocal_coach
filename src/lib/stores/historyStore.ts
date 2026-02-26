import type { CompletedSession } from './sessionStore';
import { IdbHistory } from '$lib/persistence/idbHistory';

export interface HistoryStore {
	save(session: CompletedSession): Promise<void>;
	getAll(): Promise<CompletedSession[]>;
	delete(id: string): Promise<void>;
}

// Singleton — swap implementation here when moving to a backend
export const historyStore: HistoryStore = new IdbHistory();

/**
 * Worker-side database singleton (framework-agnostic).
 *
 * The standalone worker can't import `$lib/server/db` (it uses `$env`). This
 * builds a single Drizzle instance from `process.env.DATABASE_URL` using the
 * shared, framework-agnostic connection factory. Used by queue handlers.
 */
import { createDatabase, type Database } from '../../shared/db/connection';

let _db: Database | null = null;

export function getWorkerDb(): Database {
	if (!_db) {
		const url = process.env.DATABASE_URL;
		if (!url) throw new Error('DATABASE_URL is required');
		_db = createDatabase(url);
	}
	return _db;
}

import type { SQLiteDatabase } from 'expo-sqlite';

export const SCHEMA_VERSION = 1;

/** Migrations run in order, each inside its own transaction. Add a new entry;
 *  never edit a shipped one. */
const MIGRATIONS: { version: number; sql: string }[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        source_type TEXT NOT NULL,
        original_uri TEXT,
        created_at INTEGER NOT NULL,
        byte_size INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        error_message TEXT,
        text TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS chunks (
        id TEXT PRIMARY KEY NOT NULL,
        note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        ordinal INTEGER NOT NULL,
        text TEXT NOT NULL,
        char_start INTEGER NOT NULL,
        char_end INTEGER NOT NULL,
        token_estimate INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_chunks_note ON chunks(note_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_chunks_note_ordinal ON chunks(note_id, ordinal);

      CREATE TABLE IF NOT EXISTS embeddings (
        chunk_id TEXT PRIMARY KEY NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
        vector BLOB NOT NULL,
        dim INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_embeddings_chunk ON embeddings(chunk_id);

      CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
        text,
        chunk_id UNINDEXED,
        note_id UNINDEXED,
        tokenize = 'porter unicode61'
      );

      CREATE TABLE IF NOT EXISTS threads (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        note_id TEXT REFERENCES notes(id) ON DELETE SET NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY NOT NULL,
        thread_id TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        cited_chunk_ids TEXT NOT NULL DEFAULT '[]',
        intent TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id, created_at);

      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kind TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        day TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_events_kind ON events(kind);

      CREATE TABLE IF NOT EXISTS unlocked_badges (
        badge_id TEXT PRIMARY KEY NOT NULL,
        unlocked_at INTEGER NOT NULL
      );
    `,
  },
];

export async function migrate(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;
    await db.withTransactionAsync(async () => {
      await db.execAsync(migration.sql);
    });
    await db.execAsync(`PRAGMA user_version = ${migration.version}`);
  }
}

import * as SQLite from 'expo-sqlite';
import { migrate } from './schema';
import { seedSampleNote } from './seed';

let handle: SQLite.SQLiteDatabase | null = null;
let opening: Promise<SQLite.SQLiteDatabase> | null = null;

export async function db(): Promise<SQLite.SQLiteDatabase> {
  if (handle) return handle;
  if (opening) return opening;
  opening = (async () => {
    const conn = await SQLite.openDatabaseAsync('soma.db');
    await migrate(conn);
    await seedSampleNote(conn);
    handle = conn;
    return conn;
  })();
  return opening;
}

export function newId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}

export function dayKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

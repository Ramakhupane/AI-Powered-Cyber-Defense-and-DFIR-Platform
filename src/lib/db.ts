import { openDB, type IDBPDatabase } from 'idb';
import type { ScanResult } from './types';

const DB_NAME = 'cyberdefend-db';
const DB_VERSION = 1;
const STORE_NAME = 'scans';
const META_STORE = 'scan-meta';

interface ScanMeta {
  id: string;
  target: string;
  scanType: string;
  timestamp: string;
  severity: string;
  severityScore: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          const metaStore = db.createObjectStore(META_STORE, { keyPath: 'id' });
          metaStore.createIndex('timestamp', 'timestamp');
          metaStore.createIndex('severity', 'severity');
          metaStore.createIndex('target', 'target');
        }
      },
    });
  }
  return dbPromise;
}

// ─── IndexedDB Operations ──────────────────────────────────────────

export async function saveScanToDB(result: ScanResult): Promise<void> {
  try {
    const db = await getDb();

    // Save full scan data
    await db.put(STORE_NAME, result);

    // Save metadata for fast listing
    const meta: ScanMeta = {
      id: result.id,
      target: result.target,
      scanType: result.scanType,
      timestamp: result.timestamp,
      severity: result.severity,
      severityScore: result.severityScore,
    };
    await db.put(META_STORE, meta);
  } catch (err) {
    console.warn('[DB] Failed to save scan:', err);
    throw err;
  }
}

export async function getScanFromDB(id: string): Promise<ScanResult | undefined> {
  try {
    const db = await getDb();
    return await db.get(STORE_NAME, id);
  } catch {
    return undefined;
  }
}

export async function getAllScansFromDB(): Promise<ScanMeta[]> {
  try {
    const db = await getDb();
    const tx = db.transaction(META_STORE, 'readonly');
    const index = tx.store.index('timestamp');
    return await index.getAll(); // sorted by index
  } catch {
    return [];
  }
}

export async function deleteScanFromDB(id: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete(STORE_NAME, id);
    await db.delete(META_STORE, id);
  } catch {}
}

export async function clearAllScansFromDB(): Promise<void> {
  try {
    const db = await getDb();
    await db.clear(STORE_NAME);
    await db.clear(META_STORE);
  } catch {}
}

export async function getScanCount(): Promise<number> {
  try {
    const db = await getDb();
    return await db.count(META_STORE);
  } catch {
    return 0;
  }
}
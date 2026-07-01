import type { ScanResult, ScanHistoryItem } from './types';
import {
  saveScanToDB,
  getScanFromDB,
  getAllScansFromDB,
  deleteScanFromDB,
  clearAllScansFromDB,
} from './db';
import {
  saveScanToSupabase,
  getScanFromSupabase,
  getScanHistoryFromSupabase,
  deleteScanFromSupabase,
} from '../services/supabaseScanService';
import { supabase } from './supabase';

const STORAGE_KEY_SCANS = 'cyber-scans';
const STORAGE_KEY_PREFIX = 'cyber-scan-';

// ─── localStorage helpers (fallback when IndexedDB fails) ─────────

function loadFallbackHistory(): ScanHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SCANS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFallbackHistory(items: ScanHistoryItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_SCANS, JSON.stringify(items));
  } catch {}
}

function loadFallbackScan(id: string): ScanResult | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + id);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveFallbackScan(result: ScanResult): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + result.id, JSON.stringify(result));
  } catch {}
}

function deleteFallbackScan(id: string): void {
  try {
    localStorage.removeItem(STORAGE_KEY_PREFIX + id);
  } catch {}
}

// ─── ScanStore class ──────────────────────────────────────────────

class ScanStore {
  private results = new Map<string, ScanResult>();
  private ready: Promise<void>;
  private userId: string | null = null;

  constructor() {
    this.ready = this.hydrate();
    // Listen for auth changes to update user ID
    supabase.auth.onAuthStateChange((_event, session) => {
      this.userId = session?.user?.id ?? null;
    });
  }

  /** Hydrate in-memory map from IndexedDB (with localStorage fallback). */
  private async hydrate(): Promise<void> {
    try {
      const items = await getAllScansFromDB();
      for (const meta of items) {
        const full = await getScanFromDB(meta.id);
        if (full) {
          this.results.set(full.id, full);
        }
      }
    } catch {
      // IndexedDB failed — try localStorage
      const items = loadFallbackHistory();
      for (const item of items) {
        const full = loadFallbackScan(item.id);
        if (full) {
          this.results.set(full.id, full);
        }
      }
    }
  }

  /** Ensure hydration is complete before reading. */
  private async ensureReady(): Promise<void> {
    await this.ready;
  }

  /** Store a scan result. Persists to Supabase + IndexedDB as backup. */
  async set(result: ScanResult): Promise<void> {
    this.results.set(result.id, result);

    // Try Supabase first (only if authenticated)
    if (this.userId) {
      const saved = await saveScanToSupabase(result, this.userId);
      if (saved) return;
    }

    // Try IndexedDB as fallback
    try {
      await saveScanToDB(result);
    } catch {
      // localStorage fallback
      saveFallbackScan(result);

      const items = loadFallbackHistory();
      const existingIdx = items.findIndex((i) => i.id === result.id);
      const meta: ScanHistoryItem = {
        id: result.id,
        target: result.target,
        scanType: result.scanType,
        timestamp: result.timestamp,
        severity: result.severity,
        severityScore: result.severityScore,
      };
      if (existingIdx >= 0) {
        items[existingIdx] = meta;
      } else {
        items.unshift(meta);
      }
      saveFallbackHistory(items);
    }
  }

  /** Retrieve a scan result by ID. */
  async get(id: string): Promise<ScanResult | undefined> {
    await this.ensureReady();

    // Check in-memory cache first
    if (this.results.has(id)) {
      return this.results.get(id);
    }

    // Try Supabase first
    if (this.userId) {
      const fromSupabase = await getScanFromSupabase(id, this.userId);
      if (fromSupabase) {
        this.results.set(fromSupabase.id, fromSupabase);
        return fromSupabase;
      }
    }

    // Try IndexedDB
    try {
      const full = await getScanFromDB(id);
      if (full) {
        this.results.set(full.id, full);
        return full;
      }
    } catch {}

    // Try localStorage fallback
    const fallback = loadFallbackScan(id);
    if (fallback) {
      this.results.set(fallback.id, fallback);
      return fallback;
    }

    return undefined;
  }

  /** Check if a scan ID exists. */
  async has(id: string): Promise<boolean> {
    await this.ensureReady();
    if (this.results.has(id)) return true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PREFIX + id);
      return raw !== null;
    } catch {
      return false;
    }
  }

  /** Return all scans as an array, newest first. */
  getAll(): ScanResult[] {
    return Array.from(this.results.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  /** Return scan history metadata items (for listing). */
  async getHistoryItems(): Promise<ScanHistoryItem[]> {
    await this.ensureReady();

    // Try Supabase first
    if (this.userId) {
      const fromSupabase = await getScanHistoryFromSupabase(this.userId);
      if (fromSupabase.length > 0) {
        return fromSupabase;
      }
    }

    // Try IndexedDB
    try {
      const items = await getAllScansFromDB();
      if (items.length > 0) return items as ScanHistoryItem[];
    } catch {}

    return loadFallbackHistory();
  }

  /** Remove a scan by ID (Supabase + IndexedDB + localStorage). */
  async delete(id: string): Promise<boolean> {
    await this.ensureReady();
    const existed = this.results.delete(id);

    // Try Supabase first
    if (this.userId) {
      await deleteScanFromSupabase(id, this.userId);
    }

    // Clean up IndexedDB & localStorage
    try {
      await deleteScanFromDB(id);
    } catch {}

    deleteFallbackScan(id);

    const items = loadFallbackHistory().filter((i) => i.id !== id);
    saveFallbackHistory(items);

    return existed;
  }

  /** Clear all scans (memory + IndexedDB + localStorage). */
  async clear(): Promise<void> {
    this.results.clear();

    try {
      await clearAllScansFromDB();
    } catch {}

    const items = loadFallbackHistory();
    for (const item of items) {
      deleteFallbackScan(item.id);
    }
    saveFallbackHistory([]);
  }

  /** Return the most recent scan (or undefined if empty). */
  latest(): ScanResult | undefined {
    const all = this.getAll();
    return all.length > 0 ? all[0] : undefined;
  }
}

/** Singleton store for the current session, backed by Supabase + IndexedDB + localStorage. */
export const scanStore = new ScanStore();
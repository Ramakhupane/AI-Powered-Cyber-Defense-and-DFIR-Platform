import { supabase } from '../lib/supabase';
import type { ScanResult, ScanHistoryItem } from '../lib/types';

/**
 * Supabase-backed scan storage service.
 * All operations require an authenticated user.
 * Falls back gracefully if the user is not authenticated.
 */

export async function saveScanToSupabase(
  scan: ScanResult,
  userId: string
): Promise<boolean> {
  try {
    const { error } = await supabase.from('scans').insert({
      id: scan.id,
      user_id: userId,
      target: scan.target,
      scan_type: scan.scanType,
      timestamp: scan.timestamp,
      severity: scan.severity,
      severity_score: scan.severityScore,
      data: scan as unknown as JSON,
    });

    if (error) {
      console.error('[SupabaseScan] Insert error:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[SupabaseScan] Save error:', err);
    return false;
  }
}

export async function getScanFromSupabase(
  id: string,
  userId: string
): Promise<ScanResult | null> {
  try {
    const { data, error } = await supabase
      .from('scans')
      .select('data')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.data as unknown as ScanResult;
  } catch (err) {
    console.error('[SupabaseScan] Get error:', err);
    return null;
  }
}

export async function getScanHistoryFromSupabase(
  userId: string
): Promise<ScanHistoryItem[]> {
  try {
    const { data, error } = await supabase
      .from('scans')
      .select('id, target, scan_type, timestamp, severity, severity_score')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map((item) => ({
      id: item.id,
      target: item.target,
      scanType: item.scan_type,
      timestamp: item.timestamp,
      severity: item.severity,
      severityScore: item.severity_score,
    }));
  } catch (err) {
    console.error('[SupabaseScan] History error:', err);
    return [];
  }
}

export async function deleteScanFromSupabase(
  id: string,
  userId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('scans')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('[SupabaseScan] Delete error:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[SupabaseScan] Delete error:', err);
    return false;
  }
}
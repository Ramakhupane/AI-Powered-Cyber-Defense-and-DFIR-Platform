import type { ScanResult, ScanType } from '../lib/types';
import { runRealScan } from './realApiService';
import { runMockScan } from '../lib/mockScanEngine';
import { getAvailableApis } from '../config/api';

export interface ScanProgress {
  step: number;
  totalSteps: number;
  label: string;
}

export type ScanStatusCallback = (progress: ScanProgress) => void;

/**
 * Run a scan using real APIs when available, falling back to mock engine.
 * Reports progress via the callback for UI animation.
 */
export async function runScan(
  target: string,
  scanType: ScanType,
  onProgress?: ScanStatusCallback,
): Promise<ScanResult> {
  const cleanedTarget = target.trim().toLowerCase();
  const availableApis = getAvailableApis();

  const updateProgress = (step: number, label: string) => {
    onProgress?.({ step, totalSteps: 5, label });
  };

  updateProgress(1, 'Initializing threat scan...');

  // Small delay for UX
  await new Promise((r) => setTimeout(r, 400));

  updateProgress(2, availableApis.length > 0
    ? `Querying ${availableApis.join(', ')}...`
    : 'Running AI threat analysis...');

  // Try real API first (parallel with delay for animation)
  const apiPromise = runRealScan(cleanedTarget, scanType);
  const delayPromise = new Promise((r) => setTimeout(r, 1200));

  const [apiResult] = await Promise.all([apiPromise, delayPromise]);

  updateProgress(3, 'Analyzing threat indicators...');
  await new Promise((r) => setTimeout(r, 500));

  if (apiResult) {
    // Real data succeeded — use mock engine for attack path, timeline, AI
    // but overlay the real severity and threatIntel
    const mockResult = runMockScan(cleanedTarget, scanType, true);
    updateProgress(4, 'Mapping attack paths...');
    await new Promise((r) => setTimeout(r, 500));

    updateProgress(5, 'Generating incident report...');
    await new Promise((r) => setTimeout(r, 400));

    const severity = computeSeverity(apiResult.severityScore);

    return {
      ...mockResult,
      id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      target: cleanedTarget,
      scanType,
      timestamp: new Date().toISOString(),
      severity,
      severityScore: apiResult.severityScore,
      threatIntel: apiResult.threatIntel,
    };
  }

  // Fall back to smart mock engine
  updateProgress(3, 'Running AI threat analysis...');
  await new Promise((r) => setTimeout(r, 600));

  updateProgress(4, 'Mapping attack paths...');
  await new Promise((r) => setTimeout(r, 500));

  updateProgress(5, 'Generating incident report...');
  await new Promise((r) => setTimeout(r, 400));

  return runMockScan(cleanedTarget, scanType);
}

function computeSeverity(score: number): 'critical' | 'high' | 'medium' | 'low' | 'safe' {
  if (score >= 85) return 'critical';
  if (score >= 65) return 'high';
  if (score >= 40) return 'medium';
  if (score >= 10) return 'low';
  return 'safe';
}
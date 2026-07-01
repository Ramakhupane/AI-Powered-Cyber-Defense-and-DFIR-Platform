import { API_KEYS } from '../config/api';
import type { ThreatIntel, ScanType, SeverityLevel } from '../lib/types';

// ─── Types ─────────────────────────────────────────────────────────

interface ApiResult {
  threatIntel: ThreatIntel;
  severityScore: number;
}

// ─── VirusTotal API ────────────────────────────────────────────────

async function queryVirusTotal(target: string): Promise<{ malicious: number; suspicious: number; undetected: number } | null> {
  const key = API_KEYS.virustotal;
  if (!key) return null;

  try {
    // First: get analysis ID by URL/IP
    const url = /^(\d{1,3}\.){3}\d{1,3}$/.test(target)
      ? `https://www.virustotal.com/api/v3/ip_addresses/${target}`
      : `https://www.virustotal.com/api/v3/domains/${target}`;

    const res = await fetch(url, {
      headers: { 'x-apikey': key },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn(`[VT] API returned ${res.status}`);
      return null;
    }

    const data = await res.json();
    const stats = data?.data?.attributes?.last_analysis_stats;
    if (!stats) return null;

    return {
      malicious: stats.malicious ?? 0,
      suspicious: stats.suspicious ?? 0,
      undetected: stats.undetected ?? 0,
    };
  } catch (err) {
    console.warn('[VT] API call failed:', err);
    return null;
  }
}

// ─── AbuseIPDB API ─────────────────────────────────────────────────

async function queryAbuseIPDB(ip: string): Promise<{ abuseConfidenceScore: number; totalReports: number; lastReported: string } | null> {
  const key = API_KEYS.abuseipdb;
  if (!key) return null;

  // Only IPs are supported by AbuseIPDB
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) return null;

  try {
    const res = await fetch(`https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}&maxAgeInDays=90`, {
      headers: {
        Key: key,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn(`[AbuseIPDB] API returned ${res.status}`);
      return null;
    }

    const data = await res.json();
    const d = data?.data;
    if (!d) return null;

    return {
      abuseConfidenceScore: d.abuseConfidenceScore ?? 0,
      totalReports: d.totalReports ?? 0,
      lastReported: d.lastReportedAt
        ? new Date(d.lastReportedAt).toISOString()
        : new Date(0).toISOString(),
    };
  } catch (err) {
    console.warn('[AbuseIPDB] API call failed:', err);
    return null;
  }
}

// ─── Shodan API ────────────────────────────────────────────────────

async function queryShodan(target: string): Promise<{ openPorts: string[]; services: string[]; vulns: string[] } | null> {
  const key = API_KEYS.shodan;
  if (!key) return null;

  try {
    // Shodan host API works with IPs
    const queryTarget = /^(\d{1,3}\.){3}\d{1,3}$/.test(target) ? target : '';
    if (!queryTarget) return null;

    const res = await fetch(`https://api.shodan.io/shodan/host/${queryTarget}?key=${key}`, {
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn(`[Shodan] API returned ${res.status}`);
      return null;
    }

    const data = await res.json();
    const ports = data?.ports ?? [];
    const vulns = data?.vulns ?? [];

    // Map ports to service names (basic mapping)
    const portServiceMap: Record<number, string> = {
      22: 'SSH', 80: 'HTTP', 443: 'HTTPS', 3306: 'MySQL',
      3389: 'RDP', 8080: 'HTTP-Proxy', 8443: 'HTTPS-Alt',
      53: 'DNS', 21: 'FTP', 25: 'SMTP', 6379: 'Redis',
      27017: 'MongoDB', 9200: 'Elasticsearch', 1433: 'MSSQL',
      5900: 'VNC',
    };

    const openPorts = ports.map((p: number) => String(p));
    const services = ports.map((p: number) => portServiceMap[p] || `Port-${p}`);

    return { openPorts, services, vulns: vulns || [] };
  } catch (err) {
    console.warn('[Shodan] API call failed:', err);
    return null;
  }
}

// ─── Orchestrator ──────────────────────────────────────────────────

function computeSeverity(score: number): SeverityLevel {
  if (score >= 85) return 'critical';
  if (score >= 65) return 'high';
  if (score >= 40) return 'medium';
  if (score >= 10) return 'low';
  return 'safe';
}

/**
 * Run real API queries against all configured threat intel feeds.
 * Returns null if ALL APIs fail — caller should fall back to mock engine.
 */
export async function runRealScan(target: string, scanType: ScanType): Promise<ApiResult | null> {
  const cleaned = target.trim().toLowerCase();

  // Fire all API calls in parallel
  const [vtResult, abuseResult, shodanResult] = await Promise.all([
    queryVirusTotal(cleaned),
    queryAbuseIPDB(cleaned),
    queryShodan(cleaned),
  ]);

  // If all three failed, return null to trigger mock fallback
  if (!vtResult && !abuseResult && !shodanResult) return null;

  // Build ThreatIntel from whatever we got
  const threatIntel: ThreatIntel = {
    virustotal: {
      malicious: vtResult?.malicious ?? 0,
      suspicious: vtResult?.suspicious ?? 0,
      undetected: vtResult?.undetected ?? 0,
      link: `https://www.virustotal.com/gui/search/${cleaned}`,
    },
    abuseipdb: {
      abuseConfidenceScore: abuseResult?.abuseConfidenceScore ?? 0,
      totalReports: abuseResult?.totalReports ?? 0,
      lastReported: abuseResult?.lastReported ?? new Date(0).toISOString(),
    },
    shodan: {
      openPorts: shodanResult?.openPorts ?? [],
      services: shodanResult?.services ?? [],
      vulns: shodanResult?.vulns ?? [],
    },
  };

  // Compute severity score from real data
  const vtScore = threatIntel.virustotal.malicious * 2.5;
  const abuseScore = threatIntel.abuseipdb.abuseConfidenceScore * 0.8;
  const shodanScore = threatIntel.shodan.vulns.length * 5 + threatIntel.shodan.openPorts.length * 3;
  const rawScore = Math.min(100, Math.round(vtScore + abuseScore + shodanScore));

  return { threatIntel, severityScore: rawScore };
}
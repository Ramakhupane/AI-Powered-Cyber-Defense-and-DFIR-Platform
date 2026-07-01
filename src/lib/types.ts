export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'safe';
export type ScanType = 'domain' | 'ip';

export interface ThreatIntel {
  virustotal: {
    malicious: number;
    suspicious: number;
    undetected: number;
    link: string;
  };
  abuseipdb: {
    abuseConfidenceScore: number;
    totalReports: number;
    lastReported: string;
  };
  shodan: {
    openPorts: string[];
    services: string[];
    vulns: string[];
  };
}

export interface AttackPathNode {
  id: string;
  label: string;
  type: 'internal' | 'malicious' | 'suspicious';
  severity?: SeverityLevel;
}

export interface AttackPathEdge {
  source: string;
  target: string;
  label: string;
  color?: string;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: 'info' | 'warning' | 'critical' | 'success';
  title: string;
  description: string;
  source: string;
}

export interface AttackPath {
  nodes: AttackPathNode[];
  edges: AttackPathEdge[];
}

export interface ScanResult {
  id: string;
  target: string;
  scanType: ScanType;
  timestamp: string;
  severity: SeverityLevel;
  severityScore: number;
  threatIntel: ThreatIntel;
  attackPath: AttackPath;
  timeline: TimelineEvent[];
  aiAnalysis: {
    summary: string;
    report: string;
    remediationSteps: string[];
  };
}

export interface ScanHistoryItem {
  id: string;
  target: string;
  scanType: ScanType;
  timestamp: string;
  severity: SeverityLevel;
  severityScore: number;
}

/** API configuration status */
export type ApiStatus = 'configured' | 'missing' | 'error';

/** Scan progress event for real-time UI updates */
export interface ScanProgressEvent {
  step: number;
  totalSteps: number;
  label: string;
  timestamp: number;
}

/** Dashboard summary statistics */
export interface DashboardStats {
  totalScans: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  safeCount: number;
  averageSeverityScore: number;
  latestScanTimestamp: string | null;
}

// ─── Network Device Discovery Types ──────────────────────────────

export type DeviceStatus = 'online' | 'offline' | 'idle' | 'error';

export type DeviceType =
  | 'workstation'
  | 'server'
  | 'laptop'
  | 'mobile'
  | 'tablet'
  | 'router'
  | 'printer'
  | 'switch'
  | 'iot'
  | 'storage'
  | 'unknown';

export interface NetworkDevice {
  id: string;
  hostname: string;
  ip: string;
  mac: string;
  type: DeviceType;
  status: DeviceStatus;
  os: string;
  manufacturer: string;
  openPorts: number;
  services: string[];
  vulnerabilities: string[];
  riskLevel: SeverityLevel;
  subnet: string;
  location: string;
  firstSeen: string;
  lastSeen: string;
  uptime: string;
  description: string;
}

export interface NetworkSubnet {
  cidr: string;
  label: string;
  deviceCount: number;
}

export interface NetworkStats {
  totalDevices: number;
  onlineCount: number;
  offlineCount: number;
  idleCount: number;
  errorCount: number;
  atRiskCount: number;
  subnets: NetworkSubnet[];
}

// ─── Activity / Event Feed Types ──────────────────────────────

export type ActivityEventType = 'device_online' | 'device_offline' | 'device_added' | 'device_removed' | 'vulnerability_found' | 'port_scan' | 'service_detected' | 'status_change' | 'scan_complete' | 'threat_detected';

export type ActivitySeverity = 'info' | 'warning' | 'critical' | 'success';

export interface ActivityEvent {
  id: string;
  timestamp: string;
  type: ActivityEventType;
  severity: ActivitySeverity;
  title: string;
  description: string;
  deviceId: string;
  deviceHostname: string;
  deviceIp: string;
  deviceType: DeviceType;
  subnet: string;
}

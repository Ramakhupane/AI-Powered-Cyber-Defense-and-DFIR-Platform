import type {
  ScanResult,
  ScanType,
  SeverityLevel,
  ThreatIntel,
  AttackPath,
  AttackPathNode,
  AttackPathEdge,
  TimelineEvent,
} from './types';

// ─── Known targets for deterministic demo results ────────────────

const KNOWN_MALICIOUS: string[] = [
  'examplemalware.com',
  'phishing.test',
  'evil.example',
  'badactor.org',
  'malicious.tld',
  'ransomware.c2',
  'databreacher.com',
  'darknet.shop',
  'c2-server.io',
  'bankingphish.net',
];

const KNOWN_SAFE: string[] = [
  'google.com',
  'example.com',
  'example.org',
  'wikipedia.org',
  'github.com',
  'cloudflare.com',
  'microsoft.com',
];

// ─── Port / service data (Shodan-like) ───────────────────────────

const PORTS_SERVICES: Array<{ port: string; service: string; vulns: string[] }> = [
  { port: '22', service: 'SSH', vulns: ['CVE-2024-6387', 'Weak credentials'] },
  { port: '80', service: 'HTTP', vulns: ['CVE-2024-1939', 'Missing security headers'] },
  { port: '443', service: 'HTTPS', vulns: ['CVE-2023-44487', 'Outdated TLS'] },
  { port: '3306', service: 'MySQL', vulns: ['CVE-2023-21971', 'Exposed to WAN'] },
  { port: '3389', service: 'RDP', vulns: ['CVE-2024-38077', 'BlueKeep vulnerable'] },
  { port: '8080', service: 'HTTP-Proxy', vulns: ['CVE-2023-40477', 'Open proxy'] },
  { port: '8443', service: 'HTTPS-Alt', vulns: ['Weak cipher suites'] },
  { port: '53', service: 'DNS', vulns: ['DNS amplification risk'] },
  { port: '21', service: 'FTP', vulns: ['CVE-2023-39664', 'Cleartext auth'] },
  { port: '25', service: 'SMTP', vulns: ['Open relay', 'SPF missing'] },
  { port: '6379', service: 'Redis', vulns: ['CVE-2023-41013', 'No auth set'] },
  { port: '27017', service: 'MongoDB', vulns: ['CVE-2024-23672', 'Exposed DB'] },
  { port: '9200', service: 'Elasticsearch', vulns: ['CVE-2023-46680', 'Unauthenticated access'] },
  { port: '1433', service: 'MSSQL', vulns: ['CVE-2024-35268', 'Weak SA password'] },
  { port: '5900', service: 'VNC', vulns: ['CVE-2023-42662', 'No encryption'] },
];

// ─── Helpers ──────────────────────────────────────────────────────

function pickSeverity(score: number): SeverityLevel {
  if (score >= 85) return 'critical';
  if (score >= 65) return 'high';
  if (score >= 40) return 'medium';
  if (score >= 10) return 'low';
  return 'safe';
}

function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h = (h ^ (h >>> 16)) * 0x45d9f3b;
    h = (h ^ (h >>> 16)) * 0x45d9f3b;
    h = h ^ (h >>> 16);
    return (h >>> 0) / 0xffffffff;
  };
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

function pickN<T>(arr: T[], count: number, rand: () => number): T[] {
  const shuffled = [...arr].sort(() => rand() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

function randomIP(rand: () => number): string {
  return `${rand() * 256 | 0}.${rand() * 256 | 0}.${rand() * 256 | 0}.${rand() * 256 | 0}`;
}

function generateID(): string {
  return `scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Attack path helpers ──────────────────────────────────────────

function buildAttackPath(target: string, severity: SeverityLevel, rand: () => number): AttackPath {
  const safeTarget = target.replace(/[^a-zA-Z0-9.-]/g, '');
  const nodeCount = severity === 'critical' ? 8 : severity === 'high' ? 6 : severity === 'medium' ? 4 : 3;

  const nodeTypes: Array<AttackPathNode['type']> = severity === 'safe' || severity === 'low'
    ? ['internal']
    : ['internal', 'internal', 'suspicious', 'malicious', 'malicious', 'internal', 'suspicious', 'malicious'];

  const nodes: AttackPathNode[] = [];
  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      id: `node-${i}`,
      label: i === 0 ? safeTarget : i === nodeCount - 1 ? `attacker-${i}` : `host-${String.fromCharCode(65 + i)}`,
      type: nodeTypes[i % nodeTypes.length],
      severity: i === 0 ? severity : pick(['low', 'medium', 'high'] as SeverityLevel[], rand),
    });
  }

  const vectors = ['Phishing', 'Port Scan', 'DNS Exfiltration', 'SQL Injection', 'XSS', 'Credential Theft', 'RCE', 'MITM'];
  const edges: AttackPathEdge[] = [];

  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({
      source: nodes[i].id,
      target: nodes[i + 1].id,
      label: pick(vectors, rand),
    });
  }
  if (nodes.length > 2 && rand() > 0.5) {
    edges.push({
      source: nodes[0].id,
      target: nodes[nodes.length - 1].id,
      label: pick(vectors, rand),
    });
  }

  return { nodes, edges };
}

// ─── Threat Intel generator ───────────────────────────────────────

function buildThreatIntel(severity: SeverityLevel, rand: () => number): ThreatIntel {
  const base = severity === 'critical' ? 40 : severity === 'high' ? 20 : severity === 'medium' ? 8 : 2;

  return {
    virustotal: {
      malicious: Math.round(base * (0.6 + rand() * 0.8)),
      suspicious: Math.round(base * 0.4 * (0.5 + rand())),
      undetected: Math.round(90 - base * 0.3 + rand() * 10),
      link: `https://www.virustotal.com/gui/search/${randomIP(rand)}`,
    },
    abuseipdb: {
      abuseConfidenceScore: Math.min(100, Math.round(base * 2.5 + rand() * 15)),
      totalReports: Math.round(base * 0.8 + rand() * 5),
      lastReported: new Date(Date.now() - rand() * 7 * 86400000).toISOString(),
    },
    shodan: (() => {
      const count = severity === 'critical' ? 6 : severity === 'high' ? 4 : severity === 'medium' ? 3 : 1;
      const selected = pickN(PORTS_SERVICES, count, rand);
      return {
        openPorts: selected.map((p) => p.port),
        services: selected.map((p) => p.service),
        vulns: selected.flatMap((p) => p.vulns),
      };
    })(),
  };
}

// ─── Timeline generator ───────────────────────────────────────────

function buildTimeline(target: string, severity: SeverityLevel, threatIntel: ThreatIntel, rand: () => number): TimelineEvent[] {
  const now = Date.now();
  const events: TimelineEvent[] = [];

  events.push({
    id: 'evt-init',
    timestamp: new Date(now - 5000).toISOString(),
    type: 'info',
    title: 'Scan initiated',
    description: `Threat scan started for ${target}`,
    source: 'System',
  });

  events.push({
    id: 'evt-vt',
    timestamp: new Date(now - 4000).toISOString(),
    type: threatIntel.virustotal.malicious > 5 ? 'critical' : 'info',
    title: 'VirusTotal analysis complete',
    description: `${threatIntel.virustotal.malicious} malicious, ${threatIntel.virustotal.suspicious} suspicious out of ${threatIntel.virustotal.malicious + threatIntel.virustotal.suspicious + threatIntel.virustotal.undetected} engines`,
    source: 'VirusTotal',
  });

  events.push({
    id: 'evt-abuse',
    timestamp: new Date(now - 3000).toISOString(),
    type: threatIntel.abuseipdb.abuseConfidenceScore > 50 ? 'warning' : 'info',
    title: 'AbuseIPDB report check',
    description: `Abuse confidence score: ${threatIntel.abuseipdb.abuseConfidenceScore}% (${threatIntel.abuseipdb.totalReports} reports)`,
    source: 'AbuseIPDB',
  });

  events.push({
    id: 'evt-shodan',
    timestamp: new Date(now - 2000).toISOString(),
    type: threatIntel.shodan.vulns.length > 3 ? 'warning' : 'info',
    title: 'Shodan surface scan',
    description: `${threatIntel.shodan.openPorts.length} open ports, ${threatIntel.shodan.services.length} services, ${threatIntel.shodan.vulns.length} vulnerabilities identified`,
    source: 'Shodan',
  });

  if (severity === 'critical' || severity === 'high') {
    events.push({
      id: 'evt-alert',
      timestamp: new Date(now - 1000).toISOString(),
      type: 'critical',
      title: 'Critical threat detected',
      description: `Immediate response required — ${severity.toUpperCase()} severity level triggered`,
      source: 'AI Engine',
    });
  }

  events.push({
    id: 'evt-ai',
    timestamp: new Date(now - 500).toISOString(),
    type: severity === 'safe' ? 'success' : severity === 'low' ? 'success' : 'warning',
    title: 'AI analysis complete',
    description: `Risk assessment generated with ${Math.round(70 + rand() * 25)}% confidence`,
    source: 'AI Engine',
  });

  return events;
}

// ─── AI analysis generator ────────────────────────────────────────

function buildAIAnalysis(target: string, severity: SeverityLevel, threatIntel: ThreatIntel) {
  const hasMalware = threatIntel.virustotal.malicious > 5;
  const hasOpenPorts = threatIntel.shodan.openPorts.length > 0;
  const hasAbuse = threatIntel.abuseipdb.abuseConfidenceScore > 30;

  const summary = (() => {
    switch (severity) {
      case 'critical':
        return `${target} exhibits **critical threat indicators**. High-confidence malware detections (${threatIntel.virustotal.malicious} engines), active abuse reports (${threatIntel.abuseipdb.totalReports} reports), and multiple exposed services (${threatIntel.shodan.services.join(', ')}) suggest active compromise or imminent breach risk. Immediate remediation required.`;
      case 'high':
        return `${target} shows **high-risk exposure**. ${threatIntel.virustotal.malicious} security vendors flag malicious activity. ${threatIntel.shodan.openPorts.length} open ports detected with known vulnerabilities. Abuse confidence score of ${threatIntel.abuseipdb.abuseConfidenceScore}% indicates ongoing malicious use.`;
      case 'medium':
        return `${target} has **moderate threat indicators**. ${hasMalware ? `${threatIntel.virustotal.malicious} engines detect suspicious content.` : 'Minimal malware detections.'} ${hasOpenPorts ? `${threatIntel.shodan.openPorts.length} services exposed.` : ''} ${hasAbuse ? `Reported for abuse (${threatIntel.abuseipdb.totalReports} times).` : ''}`;
      case 'low':
        return `${target} shows **low-risk posture**. Minor exposures detected. No significant threat activity observed, though ${threatIntel.shodan.openPorts.length} services remain publicly accessible.`;
      case 'safe':
        return `${target} appears **safe**. No malicious detections across threat intelligence feeds. Standard security posture with minimal exposed surface.`;
    }
  })();

  const report = (() => {
    const vulnList = threatIntel.shodan.vulns.length > 0
      ? threatIntel.shodan.vulns.map((v) => `- **${v}**`).join('\n')
      : '- No critical vulnerabilities identified';

    const openPortSection = threatIntel.shodan.openPorts.length > 0
      ? threatIntel.shodan.openPorts.map((port, i) => `- Port ${port}: ${threatIntel.shodan.services[i] || 'Unknown service'}`).join('\n')
      : '- No exposed ports detected';

    return `## Executive Summary\n\n${summary}\n\n## Technical Assessment\n\n### Threat Intelligence (VirusTotal)\n- Malicious detections: ${threatIntel.virustotal.malicious}\n- Suspicious detections: ${threatIntel.virustotal.suspicious}\n- Undetected: ${threatIntel.virustotal.undetected}\n\n### Abuse Profile (AbuseIPDB)\n- Abuse confidence score: ${threatIntel.abuseipdb.abuseConfidenceScore}%\n- Total reports: ${threatIntel.abuseipdb.totalReports}\n- Last reported: ${new Date(threatIntel.abuseipdb.lastReported).toLocaleDateString()}\n\n### Surface Analysis (Shodan)\n**Open Ports & Services:**\n${openPortSection}\n\n**Vulnerabilities:**\n${vulnList}\n\n## Risk Assessment\nBased on a comprehensive analysis of ${threatIntel.shodan.services.length} exposed services and ${threatIntel.virustotal.malicious + threatIntel.virustotal.suspicious} threat intelligence flags, ${target} is rated as **${severity.toUpperCase()}** severity with a score of ${severity === 'critical' ? '85-100' : severity === 'high' ? '65-84' : severity === 'medium' ? '40-64' : severity === 'low' ? '10-39' : '0-9'}/100.`;
  })();

  const remediationSteps = (() => {
    const steps: string[] = [];
    if (severity === 'critical' || severity === 'high') {
      steps.push('Immediately isolate affected systems from the network.');
      steps.push('Rotate all credentials and API keys associated with this target.');
    }
    if (threatIntel.shodan.openPorts.includes('22')) {
      steps.push('Restrict SSH access to trusted IPs only; disable password-based authentication.');
    }
    if (threatIntel.shodan.openPorts.includes('3389')) {
      steps.push('Disable RDP or place behind VPN with MFA enforcement.');
    }
    if (threatIntel.shodan.openPorts.includes('3306') || threatIntel.shodan.openPorts.includes('27017') || threatIntel.shodan.openPorts.includes('9200')) {
      steps.push('Move databases to private subnet; disable public-facing database ports.');
    }
    if (threatIntel.shodan.openPorts.includes('21')) {
      steps.push('Replace FTP with SFTP or SCP; disable cleartext file transfer.');
    }
    if (threatIntel.shodan.openPorts.includes('80')) {
      steps.push('Enforce HTTPS-only with HSTS headers; redirect all HTTP traffic.');
    }
    if (threatIntel.shodan.openPorts.includes('443')) {
      steps.push('Update TLS configuration to TLS 1.3; disable weak cipher suites.');
    }
    if (threatIntel.shodan.vulns.length > 0) {
      steps.push('Apply security patches for all identified CVEs within 48 hours.');
    }
    if (threatIntel.abuseipdb.abuseConfidenceScore > 50) {
      steps.push('Report the IP address to upstream providers and block at firewall level.');
    }
    if (threatIntel.virustotal.malicious > 10) {
      steps.push('Run full endpoint detection scan on all systems that interacted with this target.');
    }
    if (severity === 'medium') {
      steps.push('Schedule a security review of exposed services within the next 7 days.');
    }
    if (severity === 'low') {
      steps.push('Review and harden exposed ports as part of routine maintenance.');
    }
  steps.push('Enable comprehensive logging and monitoring for early threat detection.');
  return steps;
  })();

  return { summary, report, remediationSteps };
}

// ─── Quick-start suggestion cards ────────────────────────────────

type ExampleSuggestion = {
  label: string;
  target: string;
  description: string;
  severity: string;
};
export const exampleSuggestions: ExampleSuggestion[] = [
  { label: 'Known malicious', target: 'examplemalware.com', description: 'High-severity demo', severity: 'high' },
  { label: 'Major website', target: 'google.com', description: 'Low-risk demo', severity: 'safe' },
  { label: 'Open infrastructure', target: '192.168.1.1', description: 'Medium-severity demo', severity: 'medium' },
  { label: 'Compromised host', target: 'ransomware.c2', description: 'Critical-severity demo', severity: 'critical' },
  { label: 'Phishing target', target: 'bankingphish.net', description: 'High-severity demo', severity: 'high' },
  { label: 'CDN edge', target: 'cloudflare.com', description: 'Safe demo', severity: 'safe' },
];

// ─── Main scan function ───────────────────────────────────────────

export function runMockScan(target: string, scanType: ScanType, _isApiSupplement: boolean = false): ScanResult {
  const cleanedTarget = target.trim().toLowerCase();
  const rand = seededRandom(cleanedTarget + Date.now().toString());

  let severity: SeverityLevel;
  let severityScore: number;

  if (KNOWN_MALICIOUS.includes(cleanedTarget)) {
    severityScore = 75 + Math.floor(rand() * 25);
  } else if (KNOWN_SAFE.includes(cleanedTarget)) {
    severityScore = Math.floor(rand() * 10);
  } else {
    const roll = rand();
    if (roll < 0.15) severityScore = Math.floor(rand() * 10);
    else if (roll < 0.35) severityScore = 10 + Math.floor(rand() * 30);
    else if (roll < 0.65) severityScore = 40 + Math.floor(rand() * 25);
    else if (roll < 0.85) severityScore = 65 + Math.floor(rand() * 20);
    else severityScore = 85 + Math.floor(rand() * 15);
  }

  severity = pickSeverity(severityScore);

  const threatIntel = buildThreatIntel(severity, rand);
  const attackPath = buildAttackPath(cleanedTarget, severity, rand);
  const timeline = buildTimeline(cleanedTarget, severity, threatIntel, rand);
  const aiAnalysis = buildAIAnalysis(cleanedTarget, severity, threatIntel);

  return {
    id: generateID(),
    target: cleanedTarget,
    scanType,
    timestamp: new Date().toISOString(),
    severity,
    severityScore: Math.round(severityScore),
    threatIntel,
    attackPath,
    timeline,
    aiAnalysis,
  };
}
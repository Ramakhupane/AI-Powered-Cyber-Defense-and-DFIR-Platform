import type { ActivityEvent, ActivityEventType, ActivitySeverity, NetworkDevice } from './types';

// ─── Event type metadata ─────────────────────────────────────

const eventMeta: Record<ActivityEventType, { severity: ActivitySeverity; icon: string }> = {
  device_online: { severity: 'success', icon: 'Wifi' },
  device_offline: { severity: 'warning', icon: 'WifiOff' },
  device_added: { severity: 'info', icon: 'Plus' },
  device_removed: { severity: 'warning', icon: 'X' },
  vulnerability_found: { severity: 'critical', icon: 'AlertTriangle' },
  port_scan: { severity: 'info', icon: 'ScanLine' },
  service_detected: { severity: 'info', icon: 'Puzzle' },
  status_change: { severity: 'warning', icon: 'Activity' },
  scan_complete: { severity: 'success', icon: 'CheckCircle' },
  threat_detected: { severity: 'critical', icon: 'ShieldAlert' },
};

// ─── Deterministic hash ──────────────────────────────────────

function hashId(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h) + seed.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function pick<T>(arr: T[], seed: string): T {
  return arr[hashId(seed) % arr.length];
}

// ─── Event title/description templates ───────────────────────

const eventTemplates: Record<ActivityEventType, { title: (h: string) => string; description: (h: string) => string }[]> = {
  device_online: [
    { title: (h) => `${h} came online`, description: (h) => `Device ${h} is now reachable and responding to probes.` },
    { title: (h) => `${h} heartbeat restored`, description: (h) => `Connectivity to ${h} has been re-established after ${pick(['2m', '5m', '12m', '34m'], h)} of downtime.` },
  ],
  device_offline: [
    { title: (h) => `${h} went offline`, description: (h) => `Device ${h} stopped responding to ICMP and SNMP queries.` },
    { title: (h) => `${h} unreachable`, description: (h) => `Last known connection to ${h} was lost. Possible network partition or shutdown.` },
  ],
  device_added: [
    { title: (h) => `New device discovered: ${h}`, description: (h) => `${h} was detected on the network during a routine sweep.` },
    { title: (h) => `Unknown device joined: ${h}`, description: (h) => `A new endpoint with hostname ${h} has been added to the asset inventory.` },
  ],
  device_removed: [
    { title: (h) => `${h} removed from inventory`, description: (h) => `Device ${h} has been decommissioned or removed from the network.` },
    { title: (h) => `${h} no longer detected`, description: (h) => `After ${pick(['3', '5', '7'], h)} consecutive failed checks, ${h} was removed from active inventory.` },
  ],
  vulnerability_found: [
    { title: (h) => `Vulnerability detected on ${h}`, description: (h) => `A new CVE was identified on ${h} — see report for remediation steps.` },
    { title: (h) => `${h} has open vulnerabilities`, description: (h) => `Security scan found ${pick(['2', '3', '5', '7'], h)} known vulnerabilities on ${h}.` },
  ],
  port_scan: [
    { title: (h) => `Port scan completed on ${h}`, description: (h) => `Scanned ${pick(['65535', '1024', '1000'], h)} ports on ${h}. ${pick(['12', '7', '23', '5'], h)} ports are open.` },
    { title: (h) => `New open port on ${h}`, description: (h) => `Port ${pick(['8443', '8080', '2222', '9090'], h)}/${pick(['tcp', 'udp'], h)} was detected open on ${h}.` },
  ],
  service_detected: [
    { title: (h) => `Service fingerprint: ${h}`, description: (h) => `Identified ${pick(['Apache 2.4', 'nginx 1.24', 'OpenSSH 9.3', 'Samba 4.18', 'IIS 10'], h)} running on ${h}.` },
    { title: (h) => `${h} service change`, description: (h) => `A new service (${pick(['MySQL', 'Redis', 'Docker', 'Kubernetes API', 'PostgreSQL'], h)}) was detected on ${h}.` },
  ],
  status_change: [
    { title: (h) => `${h} status: ${pick(['idle', 'busy', 'error'], h)}`, description: (h) => `Device ${h} changed status to ${pick(['idle', 'busy', 'error'], h)}.` },
    { title: (h) => `${h} performance degraded`, description: (h) => `CPU/memory utilization on ${h} exceeded ${pick(['80%', '90%', '95%'], h)} threshold.` },
  ],
  scan_complete: [
    { title: (h) => `Scan complete for subnet`, description: (h) => `Full network sweep finished. ${pick(['1 new device', '3 offline devices', '2 vulnerable hosts', 'no changes'], h)} found.` },
    { title: (h) => `Scheduled scan finished`, description: (h) => `Automated scan of ${h} completed in ${pick(['12s', '45s', '2m', '5m'], h)}.` },
  ],
  threat_detected: [
    { title: (h) => `⚠ Threat detected on ${h}`, description: (h) => `Suspicious outbound traffic pattern detected from ${h} to ${pick(['45.33.32.156', '185.220.101.42', '23.129.64.201'], h)}.` },
    { title: (h) => `${h} — possible C2 beacon`, description: (h) => `Regular beaconing activity observed from ${h} at ${pick(['60s', '120s', '300s'], h)} intervals.` },
  ],
};

// ─── Generate activity feed ──────────────────────────────────

export function generateActivityFeed(
  devices: NetworkDevice[],
  count: number = 50,
  seed?: number,
): ActivityEvent[] {
  const s = seed ?? Date.now();
  const now = new Date();
  const eventTypes = Object.keys(eventTemplates) as ActivityEventType[];
  const events: ActivityEvent[] = [];

  for (let i = 0; i < count; i++) {
    const device = devices[hashId(`device-${i}-${s}`) % devices.length];
    const eventType = eventTypes[hashId(`type-${i}-${s}`) % eventTypes.length];
    const templates = eventTemplates[eventType];
    const template = templates[hashId(`tmpl-${i}-${s}`) % templates.length];
    const severity = eventMeta[eventType].severity;

    // Spread events over the last 24h
    const minutesAgo = hashId(`time-${i}-${s}`) % (24 * 60);
    const eventTime = new Date(now.getTime() - minutesAgo * 60 * 1000);

    events.push({
      id: `evt-${i}-${s}`,
      timestamp: eventTime.toISOString(),
      type: eventType,
      severity,
      title: template.title(device.hostname),
      description: template.description(device.hostname),
      deviceId: device.id,
      deviceHostname: device.hostname,
      deviceIp: device.ip,
      deviceType: device.type,
      subnet: device.subnet,
    });
  }

  // Sort newest first
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return events;
}

// ─── Simulate new real-time event ────────────────────────────

export function simulateNewEvent(devices: NetworkDevice[]): ActivityEvent {
  const device = devices[Math.floor(Math.random() * devices.length)];
  const types = Object.keys(eventTemplates) as ActivityEventType[];
  const eventType = types[Math.floor(Math.random() * types.length)];
  const templates = eventTemplates[eventType];
  const template = templates[Math.floor(Math.random() * templates.length)];
  const severity = eventMeta[eventType].severity;

  return {
    id: `evt-realtime-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    type: eventType,
    severity,
    title: template.title(device.hostname),
    description: template.description(device.hostname),
    deviceId: device.id,
    deviceHostname: device.hostname,
    deviceIp: device.ip,
    deviceType: device.type,
    subnet: device.subnet,
  };
}

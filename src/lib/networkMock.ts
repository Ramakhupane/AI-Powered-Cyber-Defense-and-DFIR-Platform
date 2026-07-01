import type { NetworkDevice, NetworkSubnet, NetworkStats, DeviceStatus } from './types';

// ─── Deterministic hash for consistent data ──────────────────────

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

function randRange(seed: string, min: number, max: number): number {
  return min + (hashId(seed) % (max - min + 1));
}

// ─── Data pools ──────────────────────────────────────────────────

const workstationHostnames = [
  'DESKTOP-A7F3K2', 'DESKTOP-B8G4H1', 'DESKTOP-C9J5L3', 'DESKTOP-D2M6N4',
  'WS-IT-001', 'WS-IT-002', 'WS-ENG-001', 'WS-ENG-002', 'WS-FIN-001', 'WS-HR-001',
];

const serverHostnames = [
  'SRV-DC-01', 'SRV-DC-02', 'SRV-FS-01', 'SRV-DB-01', 'SRV-DB-02',
  'SRV-APP-01', 'SRV-APP-02', 'SRV-MAIL-01', 'SRV-WEB-01', 'SRV-DNS-01',
  'SRV-DHCP-01', 'SRV-BACKUP-01', 'SRV-MON-01', 'SRV-LOG-01',
];

const laptopHostnames = [
  'LAPTOP-X1C6', 'LAPTOP-T14S', 'LAPTOP-Z16', 'LAPTOP-MBP-01',
  'LAPTOP-MBA-02', 'LAPTOP-L13', 'LAPTOP-E14', 'LAPTOP-P15',
  'MOBILE-ELITE-01', 'MOBILE-ELITE-02',
];

const mobileHostnames = [
  'IPHONE-JD-01', 'IPHONE-SL-02', 'IPHONE-MK-03', 'ANDROID-S23-01',
  'ANDROID-P7-02', 'ANDROID-P8-03', 'IPHONE-TG-04', 'ANDROID-FOLD-01',
];

const tabletHostnames = [
  'IPAD-PRO-01', 'IPAD-AIR-02', 'IPAD-MINI-01', 'TAB-S9-01',
  'TAB-S9FE-02', 'IPAD-PRO-03', 'SURFACE-PRO-01',
];

const routerHostnames = [
  'CORE-RTR-01', 'CORE-RTR-02', 'EDGE-RTR-01', 'EDGE-RTR-02',
  'FW-PALO-01', 'FW-PALO-02', 'ROUTER-ISP-01', 'ROUTER-BR-01',
];

const printerHostnames = [
  'PRINT-HP-401', 'PRINT-HP-MFP', 'PRINT-BROTHER', 'PRINT-EPSON',
  'PRINT-CANON', 'PRINT-LABEL-01', 'PRINT-XEROX',
];

const manufacturerMap: Record<string, string[]> = {
  workstation: ['Dell', 'HP', 'Lenovo', 'Custom'],
  server: ['Dell', 'HP', 'Supermicro', 'Cisco UCS'],
  laptop: ['Lenovo', 'Dell', 'HP', 'Apple', 'Microsoft'],
  mobile: ['Apple', 'Samsung', 'Google', 'OnePlus'],
  tablet: ['Apple', 'Samsung', 'Microsoft'],
  router: ['Cisco', 'Palo Alto', 'Fortinet', 'Juniper', 'MikroTik'],
  printer: ['HP', 'Brother', 'Epson', 'Canon', 'Xerox'],
  switch: ['Cisco', 'Aruba', 'Netgear', 'Ubiquiti'],
  iot: ['Raspberry Pi', 'ESP32', 'Arduino', 'Siemens'],
  storage: ['Synology', 'QNAP', 'Dell', 'NetApp'],
  unknown: ['Generic'],
};

const osMap: Record<string, string[]> = {
  workstation: ['Windows 11 Pro', 'Windows 11 Enterprise', 'Windows 10 Pro', 'Linux Mint'],
  server: ['Windows Server 2022', 'Windows Server 2019', 'Ubuntu Server 22.04', 'RHEL 9', 'Debian 12'],
  laptop: ['Windows 11 Pro', 'Windows 11 Enterprise', 'macOS Sonoma', 'macOS Ventura', 'Ubuntu 22.04'],
  mobile: ['iOS 17', 'iOS 16', 'Android 14', 'Android 13'],
  tablet: ['iPadOS 17', 'iPadOS 16', 'Android 14', 'Windows 11'],
  router: ['Cisco IOS 15', 'Cisco IOS-XE 17', 'PAN-OS 11', 'FortiOS 7', 'JUNOS 22'],
  printer: ['HP Firmware', 'Brother Firmware', 'Epson Firmware', 'Canon Firmware'],
  switch: ['Cisco IOS 15', 'Aruba AOS 10', 'Netgear Firmware', 'UniFi 7'],
  iot: ['Raspberry Pi OS', 'MicroPython', 'Linux 5.15', 'Firmware 2.x'],
  storage: ['DSM 7', 'QTS 5', 'FreeNAS 13', 'PowerVault'],
  unknown: ['Unknown OS'],
};

const workstationUsers = [
  'james.anderson', 'sarah.chen', 'mike.rodriguez', 'emma.thompson',
  'alex.kumar', 'lisa.park', 'david.martinez', 'rachel.wong',
  'kevin.obrien', 'amanda.smith',
];

const servicesByType: Record<string, string[]> = {
  workstation: ['SMB', 'RDP', 'LLMNR', 'WinRM'],
  server: ['SMB', 'RDP', 'LDAP', 'DNS', 'DHCP', 'HTTP', 'HTTPS', 'MSSQL', 'MySQL', 'SSH'],
  laptop: ['SMB', 'SSH', 'Bonjour', 'RDP'],
  mobile: ['AirDrop', 'iTunes', 'MDM'],
  tablet: ['AirDrop', 'MDM', 'Bonjour'],
  router: ['SSH', 'SNMP', 'NTP', 'BGP', 'OSPF', 'DHCP', 'DNS', 'HTTP'],
  printer: ['IPP', 'LPD', 'SNMP', 'FTP', 'SMB'],
  switch: ['SSH', 'SNMP', 'LLDP', 'CDP', 'STP', 'HTTP'],
  iot: ['MQTT', 'HTTP', 'CoAP', 'DNS'],
  storage: ['SMB', 'NFS', 'AFP', 'iSCSI', 'SFTP', 'HTTP'],
  unknown: ['Unknown'],
};

const subnetConfigs: { cidr: string; label: string; ips: string[] }[] = [
  {
    cidr: '10.0.0.0/24',
    label: 'Server Infrastructure',
    ips: ['10.0.0.10', '10.0.0.11', '10.0.0.12', '10.0.0.20', '10.0.0.21', '10.0.0.22', '10.0.0.25', '10.0.0.30', '10.0.0.31', '10.0.0.35', '10.0.0.40', '10.0.0.41', '10.0.0.50', '10.0.0.51'],
  },
  {
    cidr: '192.168.1.0/24',
    label: 'Corporate LAN',
    ips: ['192.168.1.10', '192.168.1.11', '192.168.1.12', '192.168.1.13', '192.168.1.14', '192.168.1.15', '192.168.1.16', '192.168.1.17', '192.168.1.18', '192.168.1.19', '192.168.1.20'],
  },
  {
    cidr: '192.168.2.0/24',
    label: 'Guest & WiFi',
    ips: ['192.168.2.10', '192.168.2.11', '192.168.2.12', '192.168.2.13', '192.168.2.14', '192.168.2.15', '192.168.2.16', '192.168.2.17', '192.168.2.18'],
  },
  {
    cidr: '172.16.0.0/24',
    label: 'DevOps & Test',
    ips: ['172.16.0.10', '172.16.0.11', '172.16.0.12', '172.16.0.13', '172.16.0.14', '172.16.0.15', '172.16.0.16'],
  },
  {
    cidr: '10.10.0.0/24',
    label: 'IoT & OT',
    ips: ['10.10.0.10', '10.10.0.11', '10.10.0.12', '10.10.0.13', '10.10.0.14'],
  },
];

function generateMac(index: number): string {
  const parts: string[] = [];
  const base = 0x00155D000000 + index;
  for (let i = 0; i < 6; i++) {
    parts.push(((base >> (40 - i * 8)) & 0xFF).toString(16).padStart(2, '0'));
  }
  return parts.join(':').toUpperCase();
}

const locationMap: Record<string, string[]> = {
  '10.0.0.0/24': ['Data Center A', 'Data Center B'],
  '192.168.1.0/24': ['HQ - Floor 2', 'HQ - Floor 3', 'HQ - Floor 1'],
  '192.168.2.0/24': ['HQ - Lobby', 'HQ - Conference', 'HQ - Break Room'],
  '172.16.0.0/24': ['Dev Lab', 'Test Lab', 'Staging'],
  '10.10.0.0/24': ['Server Room - IoT', 'Warehouse', 'Production Floor'],
};

// ─── Device catalog (deterministic) ──────────────────────────────

interface DeviceTemplate {
  id: string;
  hostname: string;
  type: NetworkDevice['type'];
  subnetCidr: string;
  ip: string;
  status: DeviceStatus;
  vulnerabilities: string[];
}

function buildDeviceCatalog(): DeviceTemplate[] {
  const templates: DeviceTemplate[] = [];

  // Workstations
  workstationHostnames.forEach((h, i) => {
    templates.push({
      id: `dev-ws-${String(i + 1).padStart(3, '0')}`,
      hostname: h,
      type: 'workstation',
      subnetCidr: '192.168.1.0/24',
      ip: subnetConfigs[1].ips[i % subnetConfigs[1].ips.length],
      status: i < 8 ? 'online' : 'offline',
      vulnerabilities: i % 3 === 0 ? ['CVE-2023-23397', 'CVE-2024-21413'] : [],
    });
  });

  // Servers
  serverHostnames.forEach((h, i) => {
    templates.push({
      id: `dev-srv-${String(i + 1).padStart(3, '0')}`,
      hostname: h,
      type: 'server',
      subnetCidr: '10.0.0.0/24',
      ip: subnetConfigs[0].ips[i % subnetConfigs[0].ips.length],
      status: i < 10 ? 'online' : i === 12 ? 'error' : 'online',
      vulnerabilities: i % 4 === 0 ? ['CVE-2024-3094', 'CVE-2023-44487'] : i % 4 === 1 ? ['CVE-2023-46604'] : [],
    });
  });

  // Laptops
  laptopHostnames.forEach((h, i) => {
    templates.push({
      id: `dev-lap-${String(i + 1).padStart(3, '0')}`,
      hostname: h,
      type: 'laptop',
      subnetCidr: i < 5 ? '192.168.1.0/24' : '172.16.0.0/24',
      ip: i < 5
        ? subnetConfigs[1].ips[(5 + i) % subnetConfigs[1].ips.length]
        : subnetConfigs[3].ips[i % subnetConfigs[3].ips.length],
      status: i < 7 ? 'online' : 'offline',
      vulnerabilities: i === 2 ? ['CVE-2024-1709'] : i === 7 ? ['CVE-2023-28252'] : [],
    });
  });

  // Mobile devices
  mobileHostnames.forEach((h, i) => {
    templates.push({
      id: `dev-mob-${String(i + 1).padStart(3, '0')}`,
      hostname: h,
      type: 'mobile',
      subnetCidr: '192.168.2.0/24',
      ip: subnetConfigs[2].ips[i % subnetConfigs[2].ips.length],
      status: i < 6 ? 'online' : 'offline',
      vulnerabilities: i === 3 ? ['CVE-2024-27905'] : [],
    });
  });

  // Tablets
  tabletHostnames.forEach((h, i) => {
    templates.push({
      id: `dev-tab-${String(i + 1).padStart(3, '0')}`,
      hostname: h,
      type: 'tablet',
      subnetCidr: '192.168.2.0/24',
      ip: subnetConfigs[2].ips[(4 + i) % subnetConfigs[2].ips.length],
      status: i < 5 ? 'online' : 'idle',
      vulnerabilities: [],
    });
  });

  // Routers / Firewalls
  routerHostnames.forEach((h, i) => {
    templates.push({
      id: `dev-rtr-${String(i + 1).padStart(3, '0')}`,
      hostname: h,
      type: i >= 4 ? 'router' : 'router',
      subnetCidr: i < 4 ? '10.0.0.0/24' : '192.168.1.0/24',
      ip: i < 4
        ? subnetConfigs[0].ips[(10 + i) % subnetConfigs[0].ips.length]
        : subnetConfigs[1].ips[(8 + i - 4) % subnetConfigs[1].ips.length],
      status: 'online',
      vulnerabilities: i === 0 ? ['CVE-2023-20198'] : i === 4 ? ['CVE-2024-21762'] : [],
    });
  });

  // Printers
  printerHostnames.forEach((h, i) => {
    templates.push({
      id: `dev-prn-${String(i + 1).padStart(3, '0')}`,
      hostname: h,
      type: 'printer',
      subnetCidr: '192.168.1.0/24',
      ip: subnetConfigs[1].ips[(10 + i) % subnetConfigs[1].ips.length],
      status: i < 5 ? 'online' : 'offline',
      vulnerabilities: i % 2 === 0 ? ['CVE-2023-38146'] : [],
    });
  });

  return templates;
}

// ─── Build full devices from templates ───────────────────────────

function buildDevices(templates: DeviceTemplate[], refreshSeed?: number): NetworkDevice[] {
  const now = new Date();
  const seed = refreshSeed ?? 0;

  return templates.map((t, idx) => {
    const typeKey = t.type;
    const hashSeed = `${t.id}-${seed}`;
    const manufacturers = manufacturerMap[typeKey] ?? ['Generic'];
    const oses = osMap[typeKey] ?? ['Unknown OS'];
    const services = servicesByType[typeKey] ?? ['Unknown'];
    const locations = locationMap[t.subnetCidr] ?? ['Unknown'];

    // Resolve status with some randomness on refresh
    let status = t.status;
    if (refreshSeed && refreshSeed > 0) {
      const statusRoll = hashId(`${t.id}-status-${seed}`) % 20;
      if (statusRoll === 0 && t.status === 'online') status = 'offline';
      else if (statusRoll === 1 && t.status === 'offline') status = 'online';
      else if (statusRoll === 2 && t.status === 'online') status = 'idle';
    }

    const openPorts = pick([...services], hashSeed).length + randRange(`${t.id}-ports-${seed}`, 1, 5);
    const riskLevel = t.vulnerabilities.length > 1 ? 'high'
      : t.vulnerabilities.length === 1 ? 'medium'
      : openPorts > 8 ? 'medium'
      : openPorts > 4 ? 'low'
      : 'safe';

    const lastSeen = new Date(now.getTime() - randRange(`${t.id}-lastseen-${seed}`, 0, 600000));
    const firstSeen = new Date(now.getTime() - randRange(`${t.id}-firstseen-${seed}`, 86400000, 365 * 86400000));
    const uptimeMinutes = status === 'online'
      ? randRange(`${t.id}-uptime-${seed}`, 60, 43200)
      : status === 'offline' ? 0 : randRange(`${t.id}-uptime-${seed}`, 1, 1440);

    const description = typeKey === 'workstation' ? `Employee workstation — ${pick(workstationUsers, `${t.id}-user-${seed}`)}`
      : typeKey === 'server' ? `Infrastructure server — ${t.hostname.includes('DC') ? 'Domain Controller' : t.hostname.includes('DB') ? 'Database' : t.hostname.includes('APP') ? 'Application' : t.hostname.includes('FS') ? 'File Share' : t.hostname.includes('WEB') ? 'Web Server' : t.hostname.includes('MAIL') ? 'Mail Server' : t.hostname.includes('DNS') ? 'DNS Server' : t.hostname.includes('DHCP') ? 'DHCP Server' : t.hostname.includes('BACKUP') ? 'Backup Server' : 'Infrastructure'} server`
      : typeKey === 'laptop' ? `Mobile workstation — ${pick(workstationUsers, `${t.id}-user-${seed}`)}`
      : typeKey === 'mobile' ? `Employee mobile device`
      : typeKey === 'tablet' ? 'Shared tablet device'
      : typeKey === 'router' ? t.hostname.includes('FW') ? 'Next-Gen Firewall' : t.hostname.includes('CORE') ? 'Core router' : t.hostname.includes('EDGE') ? 'Edge router' : 'Network router'
      : typeKey === 'printer' ? 'Network printer / MFP'
      : typeKey === 'switch' ? 'Network switch'
      : typeKey === 'storage' ? 'Network attached storage'
      : 'Network device';

    return {
      id: t.id,
      hostname: t.hostname,
      ip: t.ip,
      mac: generateMac(idx + 1),
      type: t.type,
      status,
      os: pick(oses, `${t.id}-os-${seed}`),
      manufacturer: pick(manufacturers, `${t.id}-mfr-${seed}`),
      openPorts,
      services: services.slice(0, Math.min(services.length, Math.max(1, openPorts))),
      vulnerabilities: t.vulnerabilities,
      riskLevel: riskLevel as NetworkDevice['riskLevel'],
      subnet: t.subnetCidr,
      location: pick(locations, `${t.id}-loc-${seed}`),
      firstSeen: firstSeen.toISOString(),
      lastSeen: lastSeen.toISOString(),
      uptime: status === 'offline' ? 'N/A'
        : `${Math.floor(uptimeMinutes / 1440)}d ${Math.floor((uptimeMinutes % 1440) / 60)}h ${uptimeMinutes % 60}m`,
      description,
    };
  });
}

// ─── Public API ───────────────────────────────────────────────────

const catalog = buildDeviceCatalog();

export function getNetworkDevices(refreshSeed?: number): NetworkDevice[] {
  return buildDevices(catalog, refreshSeed);
}

export function getNetworkStats(devices: NetworkDevice[]): NetworkStats {
  const subnetMap = new Map<string, number>();
  devices.forEach((d) => {
    subnetMap.set(d.subnet, (subnetMap.get(d.subnet) ?? 0) + 1);
  });

  return {
    totalDevices: devices.length,
    onlineCount: devices.filter((d) => d.status === 'online').length,
    offlineCount: devices.filter((d) => d.status === 'offline').length,
    idleCount: devices.filter((d) => d.status === 'idle').length,
    errorCount: devices.filter((d) => d.status === 'error').length,
    atRiskCount: devices.filter((d) => d.riskLevel === 'critical' || d.riskLevel === 'high').length,
    subnets: Array.from(subnetMap.entries()).map(([cidr, count]) => {
      const cfg = subnetConfigs.find((s) => s.cidr === cidr);
      return { cidr, label: cfg?.label ?? cidr, deviceCount: count };
    }),
  };
}

export function getDeviceById(id: string, refreshSeed?: number): NetworkDevice | undefined {
  return getNetworkDevices(refreshSeed).find((d) => d.id === id);
}

/** Simulate a network scan refresh (re-shuffles some statuses) */
export function simulateNetworkRefresh(): number {
  return Date.now();
}
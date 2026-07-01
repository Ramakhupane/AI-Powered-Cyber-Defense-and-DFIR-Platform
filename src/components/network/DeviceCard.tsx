import {
  Monitor, Server, Laptop, Smartphone, Tablet, Router, Printer,
  Wifi, HardDrive, Cpu, AlertTriangle, ChevronRight, Activity,
} from 'lucide-react';
import type { NetworkDevice, DeviceType, SeverityLevel } from '../../lib/types';

// ─── Icon map ────────────────────────────────────────────────────

const deviceIconMap: Record<DeviceType, typeof Monitor> = {
  workstation: Monitor,
  server: Server,
  laptop: Laptop,
  mobile: Smartphone,
  tablet: Tablet,
  router: Router,
  printer: Printer,
  switch: Router,
  iot: Cpu,
  storage: HardDrive,
  unknown: Wifi,
};

const deviceLabelMap: Record<DeviceType, string> = {
  workstation: 'Workstation',
  server: 'Server',
  laptop: 'Laptop',
  mobile: 'Mobile',
  tablet: 'Tablet',
  router: 'Router',
  printer: 'Printer',
  switch: 'Switch',
  iot: 'IoT Device',
  storage: 'Storage',
  unknown: 'Unknown',
};

const severityColorMap: Record<SeverityLevel, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
  safe: '#06b6d4',
};

const severityBgMap: Record<SeverityLevel, string> = {
  critical: 'bg-red-500/10 border-red-500/30',
  high: 'bg-orange-500/10 border-orange-500/30',
  medium: 'bg-yellow-500/10 border-yellow-500/30',
  low: 'bg-green-500/10 border-green-500/30',
  safe: 'bg-cyan-500/10 border-cyan-500/30',
};

const statusConfig: Record<string, { dot: string; label: string }> = {
  online: { dot: 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]', label: 'Online' },
  offline: { dot: 'bg-red-500/60', label: 'Offline' },
  idle: { dot: 'bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.4)]', label: 'Idle' },
  error: { dot: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]', label: 'Error' },
};

// ─── Props ───────────────────────────────────────────────────────

interface DeviceCardProps {
  device: NetworkDevice;
  onClick?: (device: NetworkDevice) => void;
}

// ─── Component ───────────────────────────────────────────────────

export default function DeviceCard({ device, onClick }: DeviceCardProps) {
  const Icon = deviceIconMap[device.type] ?? Wifi;
  const typeLabel = deviceLabelMap[device.type] ?? 'Device';
  const status = statusConfig[device.status] ?? statusConfig.offline;
  const sevColor = severityColorMap[device.riskLevel] ?? '#6b7280';

  return (
    <div
      onClick={() => onClick?.(device)}
      className="group relative p-4 rounded-xl bg-muted border border-border hover:border-primary/30 hover:bg-muted/80 transition-all duration-200 cursor-pointer animate-fade-in"
    >
      {/* Top row: icon + status + risk chip */}
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-all duration-200 ${
          device.riskLevel === 'critical' || device.riskLevel === 'high'
            ? 'bg-destructive/10 border-destructive/20 text-destructive'
            : 'bg-primary/10 border-primary/20 text-primary'
        }`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${severityBgMap[device.riskLevel]}`}
            style={{ color: sevColor }}
          >
            {device.riskLevel}
          </span>
        </div>
      </div>

      {/* Hostname + Type */}
      <h3 className="text-sm font-semibold text-foreground font-heading truncate">{device.hostname}</h3>
      <p className="text-[11px] text-muted-foreground/60 font-mono mt-0.5">{typeLabel}</p>

      {/* IP + MAC */}
      <div className="mt-3 space-y-1">
        <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
          <span className="text-primary/60">IP</span>
          <span>{device.ip}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
          <span className="text-primary/60">MAC</span>
          <span className="text-[10px]">{device.mac}</span>
        </div>
      </div>

      {/* Bottom: status + services */}
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${status.dot} transition-all duration-300`} />
          <span className="text-[10px] font-medium text-muted-foreground">{status.label}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
          <Activity className="w-3 h-3" />
          <span>{device.openPorts} ports</span>
        </div>
      </div>

      {/* Click indicator */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight className="w-4 h-4 text-primary/50" />
      </div>

      {/* Vulnerabilities badge */}
      {device.vulnerabilities.length > 0 && (
        <div className="absolute top-3 left-12">
          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-destructive/20 text-destructive text-[9px] font-semibold font-mono">
            <AlertTriangle className="w-2.5 h-2.5" />
            {device.vulnerabilities.length}
          </span>
        </div>
      )}
    </div>
  );
}
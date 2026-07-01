import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Monitor, Search, RefreshCw, Filter, X, ChevronRight, Activity,
  Clock, Wifi, WifiOff, HardDrive, Globe, Shield,
  AlertTriangle, ExternalLink, ArrowUpDown, LayoutGrid, GitBranch, Radio,
} from 'lucide-react';
import { getNetworkDevices, getNetworkStats, simulateNetworkRefresh } from '../lib/networkMock';
import DeviceCard from '../components/network/DeviceCard';
import NetworkStats from '../components/network/NetworkStats';
import NetworkTopology from '../components/network/NetworkTopology';
import ActivityFeed from '../components/network/ActivityFeed';
import type { NetworkDevice, DeviceStatus, DeviceType, SeverityLevel } from '../lib/types';

// ─── Filter helpers ──────────────────────────────────────────────

type SortField = 'hostname' | 'ip' | 'status' | 'riskLevel' | 'type';
type SortDir = 'asc' | 'desc';

interface FilterState {
  search: string;
  typeFilter: DeviceType | 'all';
  statusFilter: DeviceStatus | 'all';
  subnetFilter: string | 'all';
  sortField: SortField;
  sortDir: SortDir;
}

// ─── Device Detail Modal ─────────────────────────────────────────

function DeviceDetailModal({
  device,
  onClose,
}: {
  device: NetworkDevice;
  onClose: () => void;
}) {
  const statusDot: Record<string, string> = {
    online: 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]',
    offline: 'bg-red-500/60',
    idle: 'bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.4)]',
    error: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]',
  };

  const severityColor: Record<SeverityLevel, string> = {
    critical: '#ef4444', high: '#f97316', medium: '#eab308',
    low: '#22c55e', safe: '#06b6d4',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-muted border border-border overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Monitor className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground font-heading">{device.hostname}</h2>
              <p className="text-[11px] text-muted-foreground font-mono">{device.type}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted-light/50 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Status bar */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-background/40 border border-border/50">
            <span className={`w-2.5 h-2.5 rounded-full ${statusDot[device.status]} transition-all duration-300`} />
            <span className="text-sm font-medium text-foreground capitalize">{device.status}</span>
            <span className="text-[11px] text-muted-foreground/60 ml-auto font-mono">Last seen: {new Date(device.lastSeen).toLocaleString()}</span>
          </div>

          {/* Detail grid */}
          <div className="grid grid-cols-2 gap-3">
            <DetailField label="IP Address" value={device.ip} />
            <DetailField label="MAC Address" value={device.mac} />
            <DetailField label="Manufacturer" value={device.manufacturer} />
            <DetailField label="Operating System" value={device.os} />
            <DetailField label="Uptime" value={device.uptime} />
            <DetailField label="Open Ports" value={String(device.openPorts)} />
          </div>

          {/* Risk level */}
          <div className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: `${severityColor[device.riskLevel]}30`, backgroundColor: `${severityColor[device.riskLevel]}08` }}>
            <span className="text-sm text-muted-foreground">Risk Level</span>
            <span className="text-sm font-bold font-heading" style={{ color: severityColor[device.riskLevel] }}>
              {device.riskLevel.toUpperCase()}
            </span>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Services</h4>
            <div className="flex flex-wrap gap-1.5">
              {device.services.map((svc) => (
                <span key={svc} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-mono border border-primary/20">
                  {svc}
                </span>
              ))}
            </div>
          </div>

          {/* Vulnerabilities */}
          {device.vulnerabilities.length > 0 && (
            <div>
              <h4 className="text-[11px] font-semibold text-destructive uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" />
                Vulnerabilities ({device.vulnerabilities.length})
              </h4>
              <ul className="space-y-1">
                {device.vulnerabilities.map((vuln) => (
                  <li key={vuln} className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                    <span className="w-1 h-1 rounded-full bg-destructive" />
                    {vuln}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Description */}
          <div className="text-xs text-muted-foreground/70 leading-relaxed border-t border-border pt-3">
            {device.description}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2.5 rounded-lg bg-background/30 border border-border/30">
      <p className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider">{label}</p>
      <p className="text-sm text-foreground font-mono mt-0.5 truncate">{value}</p>
    </div>
  );
}

// ─── Active Filters Bar ──────────────────────────────────────────

function ActiveFilters({
  filters,
  onClear,
}: {
  filters: FilterState;
  onClear: (key: keyof FilterState) => void;
}) {
  const chips: { label: string; key: keyof FilterState }[] = [];

  if (filters.typeFilter !== 'all') chips.push({ label: `Type: ${filters.typeFilter}`, key: 'typeFilter' });
  if (filters.statusFilter !== 'all') chips.push({ label: `Status: ${filters.statusFilter}`, key: 'statusFilter' });
  if (filters.subnetFilter !== 'all') chips.push({ label: `Subnet: ${filters.subnetFilter.split('/')[0]}`, key: 'subnetFilter' });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[11px] text-primary font-mono"
        >
          {chip.label}
          <button onClick={() => onClear(chip.key)} className="hover:text-foreground transition-colors cursor-pointer">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────

type ViewMode = 'grid' | 'topology' | 'activity';

export default function NetworkPage() {
  // ── View tabs ────────────────────────────────────────
  const [view, setView] = useState<ViewMode>('grid');

  const views: { mode: ViewMode; label: string; icon: typeof LayoutGrid }[] = [
    { mode: 'grid', label: 'Device Grid', icon: LayoutGrid },
    { mode: 'topology', label: 'Topology Map', icon: GitBranch },
    { mode: 'activity', label: 'Activity Feed', icon: Radio },
  ];

  const [allDevices, setAllDevices] = useState<NetworkDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [selectedDevice, setSelectedDevice] = useState<NetworkDevice | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    typeFilter: 'all',
    statusFilter: 'all',
    subnetFilter: 'all',
    sortField: 'hostname',
    sortDir: 'asc',
  });

  // Initial load
  useEffect(() => {
    const data = getNetworkDevices(0);
    setAllDevices(data);
    setLoading(false);
  }, []);

  // Apply filters & sorting
  const filteredDevices = useMemo(() => {
    let list = [...allDevices];

    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (d) =>
          d.hostname.toLowerCase().includes(q) ||
          d.ip.toLowerCase().includes(q) ||
          d.mac.toLowerCase().includes(q) ||
          d.manufacturer.toLowerCase().includes(q),
      );
    }

    if (filters.typeFilter !== 'all') {
      list = list.filter((d) => d.type === filters.typeFilter);
    }

    if (filters.statusFilter !== 'all') {
      list = list.filter((d) => d.status === filters.statusFilter);
    }

    if (filters.subnetFilter !== 'all') {
      list = list.filter((d) => d.subnet === filters.subnetFilter);
    }

    const dir = filters.sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      const aVal = String(a[filters.sortField] ?? '');
      const bVal = String(b[filters.sortField] ?? '');
      return aVal.localeCompare(bVal) * dir;
    });

    return list;
  }, [allDevices, filters]);

  const stats = useMemo(() => getNetworkStats(allDevices), [allDevices]);

  const subnets = useMemo(() => {
    const set = new Set(allDevices.map((d) => d.subnet));
    return Array.from(set).sort();
  }, [allDevices]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 1200));
    const newSeed = simulateNetworkRefresh();
    setRefreshSeed(newSeed);
    const data = getNetworkDevices(newSeed);
    setAllDevices(data);
    setRefreshing(false);
  }, []);

  const handleClearFilter = (key: keyof FilterState) => {
    setFilters((prev) => ({ ...prev, [key]: key === 'search' ? '' : 'all' }));
  };

  const toggleSort = (field: SortField) => {
    setFilters((prev) => ({
      ...prev,
      sortField: field,
      sortDir: prev.sortField === field && prev.sortDir === 'asc' ? 'desc' : 'asc',
    }));
  };

  // ─── Skeleton ────────────────────────────────────────
  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-12 bg-muted rounded-xl w-3/4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-20 bg-muted rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <div key={i} className="h-44 bg-muted rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-5">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Activity className="w-4 h-4 text-primary" />
            <span>Network Discovery</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold text-foreground font-heading">Live Network Map</h1>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            {allDevices.length} devices discovered across {stats.subnets.length} subnets
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Sort controls */}
          <div className="hidden sm:flex items-center gap-1">
            {(['hostname', 'type', 'status', 'riskLevel'] as SortField[]).map((field) => (
              <button
                key={field}
                onClick={() => toggleSort(field)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono border transition-all duration-200 cursor-pointer ${
                  filters.sortField === field
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-transparent border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                {field.charAt(0).toUpperCase() + field.slice(1)}
                {filters.sortField === field && (
                  <ArrowUpDown className={`w-3 h-3 inline ml-1 ${filters.sortDir === 'desc' ? 'rotate-180' : ''}`} />
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all duration-200 cursor-pointer ${
              showFilters || filters.typeFilter !== 'all' || filters.statusFilter !== 'all'
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-transparent border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-sm font-medium hover:bg-primary/20 transition-all duration-200 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Scanning...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── View Tabs ──────────────────────────────────── */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-muted border border-border w-fit">
        {views.map((v) => {
          const Icon = v.icon;
          return (
            <button
              key={v.mode}
              onClick={() => setView(v.mode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono font-medium transition-all duration-200 cursor-pointer ${
                view === v.mode
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {v.label}
            </button>
          );
        })}
      </div>

      {/* ── Stats ───────────────────────────────────────── */}
      <NetworkStats stats={stats} />

      {/* ── Filters Panel ───────────────────────────────── */}
      {showFilters && (
        <div className="p-4 rounded-xl bg-muted border border-border animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  placeholder="Hostname, IP, MAC..."
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground/40 font-mono focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Device Type</label>
              <select
                value={filters.typeFilter}
                onChange={(e) => setFilters((f) => ({ ...f, typeFilter: e.target.value as DeviceType | 'all' }))}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground font-mono focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="workstation">Workstations</option>
                <option value="server">Servers</option>
                <option value="laptop">Laptops</option>
                <option value="mobile">Mobile</option>
                <option value="tablet">Tablets</option>
                <option value="router">Routers</option>
                <option value="printer">Printers</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Status</label>
              <select
                value={filters.statusFilter}
                onChange={(e) => setFilters((f) => ({ ...f, statusFilter: e.target.value as DeviceStatus | 'all' }))}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground font-mono focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="idle">Idle</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Subnet</label>
              <select
                value={filters.subnetFilter}
                onChange={(e) => setFilters((f) => ({ ...f, subnetFilter: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground font-mono focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
              >
                <option value="all">All Subnets</option>
                {subnets.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ── Active filter chips ─────────────────────────── */}
      <ActiveFilters filters={filters} onClear={handleClearFilter} />

      {/* ── View Content ──────────────────────────────────── */}
      {view === 'grid' && (
        <>
          {filteredDevices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-1 font-heading">No Devices Found</h2>
              <p className="text-sm text-muted-foreground max-w-md">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-mono">
                  Showing {filteredDevices.length} of {allDevices.length} devices
                </p>
                {refreshing && (
                  <div className="flex items-center gap-2 text-xs text-primary font-mono">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Rescanning network...
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredDevices.map((device) => (
                  <DeviceCard
                    key={`${device.id}-${refreshSeed}`}
                    device={device}
                    onClick={setSelectedDevice}
                  />
                ))}
              </div>
            </>
          )}

          {/* ── Legend ──────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-4 p-3 rounded-lg bg-muted/50 border border-border/50 text-[11px] text-muted-foreground font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" /> Online
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.4)]" /> Idle
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500/60" /> Offline
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]" /> Error
            </span>
            <span className="text-muted-foreground/40 mx-2">|</span>
            <AlertTriangle className="w-3 h-3 text-destructive" /> Known vulnerabilities
          </div>
        </>
      )}

      {view === 'topology' && (
        <NetworkTopology
          devices={filteredDevices}
          subnets={stats.subnets}
          onDeviceClick={setSelectedDevice}
          selectedDeviceId={selectedDevice?.id ?? null}
        />
      )}

      {view === 'activity' && (
        <ActivityFeed devices={allDevices} />
      )}

      {/* ── Device Detail Modal (shared across views) ───── */}
      {selectedDevice && (
        <DeviceDetailModal device={selectedDevice} onClose={() => setSelectedDevice(null)} />
      )}
    </div>
  );
}
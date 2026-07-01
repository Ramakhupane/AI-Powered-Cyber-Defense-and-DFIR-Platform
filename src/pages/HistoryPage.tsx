import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Search, Trash2, ChevronRight, Shield, ArrowRight, X, Scan, Loader2 } from 'lucide-react';
import { scanStore } from '../lib/scanStore';
import type { ScanHistoryItem, SeverityLevel } from '../lib/types';

const severityConfig: Record<SeverityLevel, { label: string; color: string; bg: string; dot: string }> = {
  critical: { label: 'CRITICAL', color: '#ef4444', bg: 'bg-red-500/10', dot: 'bg-red-500' },
  high: { label: 'HIGH', color: '#f97316', bg: 'bg-orange-500/10', dot: 'bg-orange-500' },
  medium: { label: 'MEDIUM', color: '#eab308', bg: 'bg-yellow-500/10', dot: 'bg-yellow-500' },
  low: { label: 'LOW', color: '#22c55e', bg: 'bg-green-500/10', dot: 'bg-green-500' },
  safe: { label: 'SAFE', color: '#06b6d4', bg: 'bg-cyan-500/10', dot: 'bg-cyan-500' },
};

function HistorySkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-16 bg-muted rounded-xl" />
      ))}
    </div>
  );
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ScanHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<SeverityLevel | 'all'>('all');

  useEffect(() => {
    async function load() {
      try {
        const data = await scanStore.getHistoryItems();
        setItems(data);
      } catch (err) {
        console.error('[History] Load error:', err);
      }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!item.target.toLowerCase().includes(q)) return false;
      }
      if (severityFilter !== 'all' && item.severity !== severityFilter) return false;
      return true;
    });
  }, [items, search, severityFilter]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await scanStore.delete(id);
    const updated = await scanStore.getHistoryItems();
    setItems(updated);
  };

  const severityOptions: Array<{ value: SeverityLevel | 'all'; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
    { value: 'safe', label: 'Safe' },
  ];

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center">
              <History className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-foreground font-heading">Scan History</h1>
            </div>
          </div>
        </div>
        <HistorySkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* ── Header ─────────────────────────────────────────────*/}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center">
            <History className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-foreground font-heading">Scan History</h1>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              {items.length} scan{items.length !== 1 ? 's' : ''} saved
            </p>
          </div>
        </div>
      </div>

      {/* ── Search & Filter bar ─────────────────────────────────*/}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by domain or IP..."
            className="w-full px-4 py-2.5 pl-10 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all duration-200 font-mono"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-1 flex-wrap">
          {severityOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSeverityFilter(opt.value)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                severityFilter === opt.value
                  ? 'bg-primary text-on-primary'
                  : 'bg-muted text-muted-foreground hover:text-foreground border border-border'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Empty state ─────────────────────────────────────────*/}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center pt-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center mb-4">
            <Scan className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2 font-heading">No Scans Yet</h2>
          <p className="text-muted-foreground max-w-md mb-6">
            Your scan history will appear here. Scans are automatically saved locally for review.
          </p>
          <button
            onClick={() => navigate('/scan')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-on-primary text-sm font-medium hover:opacity-90 transition-all duration-200 cursor-pointer"
          >
            <Shield className="w-4 h-4" />
            Start Your First Scan
          </button>
        </div>
      )}

      {/* ── Empty search results ───────────────────────────────*/}
      {items.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center pt-12 text-center">
          <Search className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <h3 className="text-sm font-medium text-foreground mb-1">No matching scans</h3>
          <p className="text-xs text-muted-foreground">Try a different search term or filter.</p>
        </div>
      )}

      {/* ── Scan list ──────────────────────────────────────────*/}
      {filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((item) => {
            const cfg = severityConfig[item.severity];
            return (
              <div
                key={item.id}
                onClick={() => navigate(`/dashboard?scan=${item.id}`)}
                className="flex items-center gap-4 p-4 rounded-xl bg-muted border border-border hover:border-primary/30 hover:bg-muted/80 transition-all duration-200 cursor-pointer group"
              >
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${cfg.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground font-mono truncate">{item.target}</span>
                    <span className="text-[10px] uppercase text-muted-foreground/60 px-1.5 py-0.5 rounded border border-border">{item.scanType}</span>
                  </div>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">{new Date(item.timestamp).toLocaleString()}</p>
                </div>
                <div className={`px-3 py-1 rounded-lg text-xs font-semibold ${cfg.bg}`}>
                  <span style={{ color: cfg.color }}>{item.severityScore} {cfg.label}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/report/${item.id}`); }}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border transition-all duration-200 cursor-pointer"
                    title="View report"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(item.id, e)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-200 cursor-pointer"
                    title="Delete scan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 sm:hidden" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
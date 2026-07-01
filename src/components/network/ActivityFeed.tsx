import { useState, useEffect, useRef } from 'react';
import {
  Activity,
  CheckCircle, ShieldAlert, Info, ChevronDown, Filter,
} from 'lucide-react';
import {
  generateActivityFeed,
  simulateNewEvent,
} from '../../lib/mockActivityFeed';
import type { ActivityEvent, ActivitySeverity, NetworkDevice } from '../../lib/types';

// ─── Severity config ──────────────────────────────────────────
const severityConfig: Record<ActivitySeverity, { icon: typeof Info; color: string; bg: string; border: string }> = {
  info: { icon: Info, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  warning: { icon: Activity, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  critical: { icon: ShieldAlert, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  success: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' },
};

// ─── Relative time helper ─────────────────────────────────────

function relativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Props ────────────────────────────────────────────────────

interface ActivityFeedProps {
  devices: NetworkDevice[];
}

// ─── Component ────────────────────────────────────────────────

export default function ActivityFeed({ devices }: ActivityFeedProps) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [filter, setFilter] = useState<ActivitySeverity | 'all'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [showFilter, setShowFilter] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval>>();

  // ── Load initial events ────────────────────────────────
  useEffect(() => {
    if (devices.length === 0) return;
    setEvents(generateActivityFeed(devices, 40));
  }, [devices]);

  // ── Simulate real-time events ──────────────────────────
  useEffect(() => {
    if (devices.length === 0) return;

    pollingRef.current = setInterval(() => {
      const newEvent = simulateNewEvent(devices);
      setEvents((prev) => [newEvent, ...prev.slice(0, 99)]);
    }, 5000 + Math.random() * 5000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [devices]);

  // ── Auto-scroll to top on new events ───────────────────
  useEffect(() => {
    if (autoScroll && listRef.current && events.length > 0) {
      listRef.current.scrollTop = 0;
    }
  }, [events.length, autoScroll]);

  // ── Filter events ─────────────────────────────────────
  const filteredEvents = events.filter(
    (e) => filter === 'all' || e.severity === filter,
  );

  const severityOptions: { label: string; value: ActivitySeverity | 'all'; color: string }[] = [
    { label: 'All', value: 'all', color: 'text-foreground' },
    { label: 'Critical', value: 'critical', color: 'text-red-500' },
    { label: 'Warning', value: 'warning', color: 'text-yellow-500' },
    { label: 'Info', value: 'info', color: 'text-cyan-400' },
    { label: 'Success', value: 'success', color: 'text-green-500' },
  ];

  if (devices.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 rounded-xl bg-muted/30 border border-border">
        <p className="text-sm text-muted-foreground font-mono">No devices discovered yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-muted/30 border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
          <h3 className="text-sm font-bold text-foreground font-heading">Live Activity</h3>
          <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
            {filteredEvents.length} events
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Auto-scroll toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`text-[10px] px-2 py-1 rounded font-mono border transition-all duration-200 cursor-pointer ${
              autoScroll
                ? 'bg-primary/10 border-primary/20 text-primary'
                : 'bg-transparent border-border/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            {autoScroll ? 'Live' : 'Paused'}
          </button>
          {/* Filter toggle */}
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`p-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
              filter !== 'all'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Severity filter bar */}
      {showFilter && (
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border/50 bg-muted/40 animate-fade-in">
          {severityOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-2.5 py-1 rounded text-[10px] font-mono border transition-all duration-200 cursor-pointer ${
                filter === opt.value
                  ? 'bg-primary/10 border-primary/20 text-primary'
                  : 'bg-transparent border-border/30 text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Events list */}
      <div
        ref={listRef}
        className="overflow-y-auto max-h-[520px]"
        style={{ scrollBehavior: 'smooth' }}
      >
        {filteredEvents.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground font-mono">No events match the selected filter</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {filteredEvents.map((event) => {
              const cfg = severityConfig[event.severity];
              const Icon = cfg.icon;
              return (
                <div
                  key={event.id}
                  className="group px-4 py-2.5 hover:bg-muted/60 transition-all duration-150 animate-fade-in"
                >
                  <div className="flex items-start gap-3">
                    {/* Severity icon */}
                    <div className={`mt-0.5 w-6 h-6 rounded-lg ${cfg.bg} border ${cfg.border} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-3 h-3 ${cfg.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-foreground font-heading truncate">
                          {event.title}
                        </p>
                        <span className="text-[9px] text-muted-foreground/50 font-mono flex-shrink-0 whitespace-nowrap">
                          {relativeTime(event.timestamp)}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground/70 mt-0.5 leading-relaxed line-clamp-2">
                        {event.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-mono text-muted-foreground/50 bg-muted/50 px-1.5 py-0.5 rounded">
                          {event.deviceHostname}
                        </span>
                        <span className="text-[9px] font-mono text-muted-foreground/40">
                          {event.deviceIp}
                        </span>
                        <span className={`text-[9px] font-mono px-1 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                          {event.severity}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Scroll to bottom indicator */}
        {!autoScroll && (
          <button
            onClick={() => {
              setAutoScroll(true);
              if (listRef.current) listRef.current.scrollTop = 0;
            }}
            className="sticky bottom-0 left-0 right-0 w-full py-2 bg-muted/90 backdrop-blur-sm border-t border-border text-[10px] text-primary font-mono flex items-center justify-center gap-1 hover:bg-muted transition-all duration-200 cursor-pointer"
          >
            <ChevronDown className="w-3 h-3" />
            Resume live feed
          </button>
        )}
      </div>
    </div>
  );
}

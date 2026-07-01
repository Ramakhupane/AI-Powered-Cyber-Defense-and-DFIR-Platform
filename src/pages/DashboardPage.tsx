import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Gauge, AlertTriangle, ArrowRight, Loader2, FileText, History,
  ChevronRight, Shield, Scan, Activity, ExternalLink, WifiOff,
} from 'lucide-react';
import { scanStore } from '../lib/scanStore';
import AttackPathGraph from '../components/graph/AttackPathGraph';
import type { ScanResult, TimelineEvent, SeverityLevel } from '../lib/types';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

// ─── Severity display helpers ───────────────────────────────────

const severityConfig: Record<SeverityLevel, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: 'CRITICAL', color: '#ef4444', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  high: { label: 'HIGH', color: '#f97316', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  medium: { label: 'MEDIUM', color: '#eab308', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  low: { label: 'LOW', color: '#22c55e', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  safe: { label: 'SAFE', color: '#06b6d4', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
};

// ─── Loading Skeleton ────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-12 bg-muted rounded-xl w-3/4" />
      <div className="h-32 bg-muted rounded-2xl" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 bg-muted rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ─── Animated score ring ────────────────────────────────────────

function AnimatedScore({ score, severity }: { score: number; severity: SeverityLevel }) {
  const [displayedScore, setDisplayedScore] = useState(0);
  const cfg = severityConfig[severity];

  useEffect(() => {
    if (displayedScore < score) {
      const timer = setTimeout(() => {
        setDisplayedScore((prev) => Math.min(prev + 1, score));
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [displayedScore, score]);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayedScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
          <circle
            cx="60" cy="60" r={radius} fill="none" stroke={cfg.color} strokeWidth="6"
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
            className="transition-all duration-100 ease-out"
            style={{ filter: `drop-shadow(0 0 6px ${cfg.color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tabular-nums" style={{ color: cfg.color }}>{displayedScore}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: cfg.color }}>{cfg.label}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Timeline component ─────────────────────────────────────────

function Timeline({ events }: { events: TimelineEvent[] }) {
  const borderMap: Record<string, string> = {
    critical: 'border-l-red-500', warning: 'border-l-yellow-500',
    success: 'border-l-green-500', info: 'border-l-primary',
  };
  const colorMap: Record<string, string> = {
    critical: '#ef4444', warning: '#eab308', success: '#22c55e', info: '#06b6d4',
  };
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2 font-heading">
        <Activity className="w-4 h-4 text-primary" />
        Incident Timeline
      </h3>
      <div className="relative">
        {events.map((event, idx) => (
          <div key={event.id} className={`relative pl-6 pb-5 border-l-2 ${borderMap[event.type] || 'border-l-primary'}`}>
            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-muted border-2" style={{ borderColor: colorMap[event.type] || '#06b6d4' }} />
            <div className="-mt-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground">{event.title}</span>
                <span className="text-[10px] text-muted-foreground/60">{new Date(event.timestamp).toLocaleTimeString()}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
              <span className="text-[10px] text-muted-foreground/40">{event.source}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── AI Summary panel ───────────────────────────────────────────

function AISummary({ scan }: { scan: ScanResult }) {
  const navigate = useNavigate();
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2 font-heading">
        <FileText className="w-4 h-4 text-primary" />
        AI Analysis Summary
      </h3>
      <div className="p-4 rounded-xl bg-muted border border-border space-y-4">
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-line font-mono text-[13px]">
          {scan.aiAnalysis.summary.replace(/\*\*/g, '')}
        </p>
        <div className="pt-2 border-t border-border">
          <h4 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wider font-heading">Top Remediation Steps</h4>
          <ol className="space-y-2">
            {scan.aiAnalysis.remediationSteps.slice(0, 4).map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="w-4 h-4 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
        <button
          onClick={() => navigate(`/report/${scan.id}`)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-sm font-medium hover:bg-primary/20 transition-all duration-200 cursor-pointer"
        >
          <FileText className="w-4 h-4" />
          View Full Report
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Threat Intel Cards ─────────────────────────────────────────

function ThreatIntelCards({ scan }: { scan: ScanResult }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <a
        href={scan.threatIntel.virustotal.link}
        target="_blank" rel="noopener noreferrer"
        className="p-3 rounded-lg bg-muted border border-border hover:border-primary/30 transition-all duration-200 group cursor-pointer"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">VirusTotal</span>
          <ExternalLink className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary transition-colors" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-destructive text-sm font-bold">{scan.threatIntel.virustotal.malicious}</span>
          <span className="text-yellow-500 text-sm font-bold">{scan.threatIntel.virustotal.suspicious}</span>
          <span className="text-muted-foreground text-sm">{scan.threatIntel.virustotal.undetected}</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60 mt-1">
          <span className="text-destructive/60">malicious</span>
          <span className="text-yellow-500/60">suspicious</span>
          <span>undetected</span>
        </div>
      </a>
      <div className="p-3 rounded-lg bg-muted border border-border">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">AbuseIPDB</span>
        <div className="mt-2">
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold" style={{ color: scan.threatIntel.abuseipdb.abuseConfidenceScore > 50 ? '#ef4444' : '#22c55e' }}>
              {scan.threatIntel.abuseipdb.abuseConfidenceScore}%
            </span>
            <span className="text-[10px] text-muted-foreground">confidence</span>
          </div>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">{scan.threatIntel.abuseipdb.totalReports} reports</p>
        </div>
      </div>
      <div className="p-3 rounded-lg bg-muted border border-border">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Shodan</span>
        <div className="mt-2 space-y-0.5">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-foreground font-medium">{scan.threatIntel.shodan.openPorts.length}</span>
            <span className="text-muted-foreground/60">open ports</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-foreground font-medium">{scan.threatIntel.shodan.vulns.length}</span>
            <span className="text-muted-foreground/60">vulnerabilities</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────

export default function DashboardPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const scanId = searchParams.get('scan');
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    async function loadScan() {
      if (!scanId) { setLoading(false); return; }
      try {
        const exists = await scanStore.has(scanId);
        if (exists) {
          const data = await scanStore.get(scanId);
          if (data) {
            await new Promise((r) => setTimeout(r, 300));
            setScan(data);
          } else {
            setError('Scan data could not be loaded.');
          }
        } else {
          setError(`Scan not found. It may have been deleted.`);
        }
      } catch (err) {
        console.error('[Dashboard] Load error:', err);
        setError('Failed to load scan data.');
      }
      setLoading(false);
    }
    loadScan();
  }, [scanId]);

  if (!loading && !scan && !error) {
    return (
      <div className="flex flex-col items-center justify-center pt-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center mb-4">
          <Gauge className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2 font-heading">No Scan Data</h2>
        <p className="text-muted-foreground mb-6 max-w-md">Run a threat scan first to see the dashboard.</p>
        <button
          onClick={() => navigate('/scan')}
          className="px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-medium hover:opacity-90 transition-all duration-200 cursor-pointer"
        >
          Start a Scan
        </button>
      </div>
    );
  }

  if (loading) return <div className="pt-4"><DashboardSkeleton /></div>;

  if (error || !scan) {
    return (
      <div className="flex flex-col items-center justify-center pt-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2 font-heading">Scan Not Found</h2>
        <p className="text-muted-foreground mb-6 max-w-md">{error || 'Could not load scan data.'}</p>
        <button
          onClick={() => navigate('/history')}
          className="px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-medium hover:opacity-90 transition-all duration-200 cursor-pointer"
        >
          View Scan History
        </button>
      </div>
    );
  }

  const cfg = severityConfig[scan.severity];

  return (
    <div className="animate-fade-in">
      {!isOnline && (
        <div className="flex items-center gap-2 mb-4 px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs font-mono">
          <WifiOff className="w-3 h-3" />
          Offline — showing cached data
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <span>Dashboard</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-primary font-mono">{scan.target}</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold text-foreground font-heading">Threat Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            Scanned {new Date(scan.timestamp).toLocaleString()} &middot; {scan.scanType.toUpperCase()}
          </p>
        </div>
        <button
          onClick={() => navigate(`/report/${scan.id}`)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-sm font-medium hover:bg-primary/20 transition-all duration-200 cursor-pointer"
        >
          <FileText className="w-4 h-4" />
          Full Report
        </button>
      </div>

      <div className={`p-6 rounded-2xl ${cfg.bg} border ${cfg.border} mb-6 flex flex-col sm:flex-row items-center gap-6`}>
        <AnimatedScore score={scan.severityScore} severity={scan.severity} />
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-lg font-bold text-foreground mb-1 font-heading">Threat Severity Assessment</h2>
          <p className="text-sm text-muted-foreground leading-relaxed font-mono text-[13px]">
            {scan.aiAnalysis.summary.replace(/\*\*/g, '').split('.')[0]}.
          </p>
        </div>
      </div>

      <div className="mb-6"><ThreatIntelCards scan={scan} /></div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="p-4 rounded-xl bg-muted border border-border h-full flex flex-col">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2 font-heading">
              <Shield className="w-4 h-4 text-primary" />
              Attack Path Graph
            </h3>
            <div className="flex-1 flex items-center justify-center">
              <AttackPathGraph data={scan.attackPath} />
            </div>
          </div>
        </div>
        <div className="lg:col-span-1">
          <div className="p-4 rounded-xl bg-muted border border-border h-full">
            <Timeline events={scan.timeline} />
          </div>
        </div>
        <div className="lg:col-span-1">
          <div className="h-full"><AISummary scan={scan} /></div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={() => navigate('/history')}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer"
        >
          <History className="w-4 h-4" />
          View Scan History
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
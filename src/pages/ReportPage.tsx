import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText, ArrowLeft, Printer, Shield, AlertTriangle, Server,
  CheckCircle, ChevronRight, Bug, Scan, Loader2,
} from 'lucide-react';
import { scanStore } from '../lib/scanStore';
import type { ScanResult, SeverityLevel } from '../lib/types';

const severityConfig: Record<SeverityLevel, { label: string; color: string; bg: string }> = {
  critical: { label: 'CRITICAL', color: '#ef4444', bg: 'bg-red-500/10' },
  high: { label: 'HIGH', color: '#f97316', bg: 'bg-orange-500/10' },
  medium: { label: 'MEDIUM', color: '#eab308', bg: 'bg-yellow-500/10' },
  low: { label: 'LOW', color: '#22c55e', bg: 'bg-green-500/10' },
  safe: { label: 'SAFE', color: '#06b6d4', bg: 'bg-cyan-500/10' },
};

function ReportSkeleton() {
  return (
    <div className="max-w-4xl mx-auto animate-pulse space-y-6">
      <div className="h-10 bg-muted rounded-xl w-1/3" />
      <div className="h-40 bg-muted rounded-2xl" />
      <div className="h-32 bg-muted rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-muted rounded-xl" />)}
      </div>
      <div className="h-48 bg-muted rounded-xl" />
    </div>
  );
}

export default function ReportPage() {
  const { scanId } = useParams<{ scanId: string }>();
  const navigate = useNavigate();
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadScan() {
      if (!scanId) { setLoading(false); return; }
      try {
        const exists = await scanStore.has(scanId);
        if (exists) {
          const data = await scanStore.get(scanId);
          if (data) setScan(data);
        }
      } catch (err) {
        console.error('[Report] Load error:', err);
      }
      setLoading(false);
    }
    loadScan();
  }, [scanId]);

  const handlePrint = () => window.print();

  if (loading) {
    return <div className="max-w-4xl mx-auto pt-8"><ReportSkeleton /></div>;
  }

  if (!scan) {
    return (
      <div className="max-w-4xl mx-auto pt-8">
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>
        <div className="flex flex-col items-center justify-center pt-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2 font-heading">Report Not Found</h2>
          <p className="text-muted-foreground max-w-md">This scan report could not be found.</p>
          <button onClick={() => navigate('/history')} className="mt-6 px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-medium hover:opacity-90 transition-all duration-200 cursor-pointer">
            View Scan History
          </button>
        </div>
      </div>
    );
  }

  const cfg = severityConfig[scan.severity];

  return (
    <div className="max-w-4xl mx-auto print:max-w-full">
      {/* ── Top navigation bar ───────────────────────────────────*/}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-border print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/dashboard?scan=${scan.id}`)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </button>
          <ChevronRight className="w-3 h-3 text-muted-foreground/40" />
          <span className="text-sm text-foreground font-medium">Incident Report</span>
        </div>
        <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-medium hover:opacity-90 transition-all duration-200 cursor-pointer">
          <Printer className="w-4 h-4" /> Export PDF
        </button>
      </div>

      {/* ── Report header ────────────────────────────────────────*/}
      <div className={`p-6 rounded-2xl ${cfg.bg} border border-border mb-8`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
              <Scan className="w-3.5 h-3.5" />
              <span>Security Incident Report</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2 font-heading">
              Threat Analysis: <span className="font-mono">{scan.target}</span>
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground font-mono">
              <span>Generated: {new Date(scan.timestamp).toLocaleString()}</span>
              <span className="text-muted-foreground/30">|</span>
              <span>Type: {scan.scanType.toUpperCase()}</span>
              <span className="text-muted-foreground/30">|</span>
              <span className="font-semibold" style={{ color: cfg.color }}>Severity: {cfg.label} ({scan.severityScore}/100)</span>
            </div>
          </div>
          <div className="hidden sm:flex w-16 h-16 rounded-xl bg-muted/50 border border-border items-center justify-center">
            <Shield className="w-8 h-8" style={{ color: cfg.color }} />
          </div>
        </div>
      </div>

      {/* ── 1. Executive Summary ───────────────────────────────*/}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2 font-heading">
          <FileText className="w-5 h-5 text-primary" /> Executive Summary
        </h2>
        <div className="p-5 rounded-xl bg-muted border border-border">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-line font-mono text-[13px]">
            {scan.aiAnalysis.summary.replace(/\*\*/g, '')}
          </p>
        </div>
      </section>

      {/* ── 2. Threat Assessment ───────────────────────────────*/}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2 font-heading">
          <AlertTriangle className="w-5 h-5 text-primary" /> Threat Assessment
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="p-4 rounded-xl bg-muted border border-border">
            <div className="flex items-center gap-2 mb-3">
              <Bug className="w-4 h-4 text-destructive" />
              <span className="text-xs font-semibold text-foreground">VirusTotal</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-lg font-bold text-destructive">{scan.threatIntel.virustotal.malicious}</p>
                <p className="text-[10px] text-muted-foreground">malicious</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-yellow-500">{scan.threatIntel.virustotal.suspicious}</p>
                <p className="text-[10px] text-muted-foreground">suspicious</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-muted-foreground">{scan.threatIntel.virustotal.undetected}</p>
                <p className="text-[10px] text-muted-foreground">undetected</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-muted border border-border">
            <span className="text-xs font-semibold text-foreground">AbuseIPDB</span>
            <p className="text-lg font-bold mt-2" style={{ color: scan.threatIntel.abuseipdb.abuseConfidenceScore > 50 ? '#ef4444' : '#22c55e' }}>
              {scan.threatIntel.abuseipdb.abuseConfidenceScore}%
            </p>
            <p className="text-xs text-muted-foreground">abuse confidence ({scan.threatIntel.abuseipdb.totalReports} reports)</p>
          </div>
          <div className="p-4 rounded-xl bg-muted border border-border">
            <span className="text-xs font-semibold text-foreground">Shodan Surface</span>
            <p className="text-lg font-bold text-foreground mt-2">{scan.threatIntel.shodan.openPorts.length}</p>
            <p className="text-xs text-muted-foreground">open ports exposed</p>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-muted border border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3">Identified Vulnerabilities</h3>
          {scan.threatIntel.shodan.vulns.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {scan.threatIntel.shodan.vulns.map((v) => (
                <span key={v} className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                  v.startsWith('CVE') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                }`}>{v}</span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No critical vulnerabilities identified.</p>
          )}
        </div>
      </section>

      {/* ── 3. Incident Timeline ────────────────────────────────*/}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2 font-heading">
          <Server className="w-5 h-5 text-primary" /> Incident Timeline
        </h2>
        <div className="p-5 rounded-xl bg-muted border border-border">
          <div className="space-y-0">
            {scan.timeline.map((event, idx) => (
              <div key={event.id} className="flex gap-4 pb-4 last:pb-0">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full border-2 ${
                    event.type === 'critical' ? 'bg-red-500 border-red-500' :
                    event.type === 'warning' ? 'bg-yellow-500 border-yellow-500' :
                    event.type === 'success' ? 'bg-green-500 border-green-500' : 'bg-primary border-primary'
                  }`} />
                  {idx < scan.timeline.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                </div>
                <div className="flex-1 -mt-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{event.title}</span>
                    <span className="text-[11px] text-muted-foreground/60">{new Date(event.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{event.description}</p>
                  <span className="text-[11px] text-muted-foreground/40">Source: {event.source}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Compromised Assets ──────────────────────────────*/}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2 font-heading">
          <Server className="w-5 h-5 text-primary" /> Compromised Assets & Exposed Surface
        </h2>
        <div className="p-5 rounded-xl bg-muted border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Asset</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="text-left py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {scan.attackPath.nodes.map((node) => (
                  <tr key={node.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 pr-4 font-mono text-sm text-foreground">{node.label}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        node.type === 'malicious' ? 'bg-red-500/10 text-red-400' :
                        node.type === 'suspicious' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-cyan-500/10 text-cyan-400'
                      }`}>{node.type}</span>
                    </td>
                    <td className="py-2.5">
                      {node.severity ? (
                        <span className="font-medium text-xs" style={{ color: severityConfig[node.severity].color }}>{severityConfig[node.severity].label}</span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── 5. Remediation Steps ──────────────────────────────*/}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2 font-heading">
          <CheckCircle className="w-5 h-5 text-success" /> Remediation Steps
        </h2>
        <div className="p-5 rounded-xl bg-muted border border-border">
          <ol className="space-y-3">
            {scan.aiAnalysis.remediationSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                <span className="text-sm text-foreground leading-relaxed pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────*/}
      <div className="py-6 border-t border-border text-center print:mt-8">
        <p className="text-xs text-muted-foreground/60 font-mono">
          AI-Powered Cyber Defense &amp; DFIR Platform &middot; Report generated on {new Date(scan.timestamp).toLocaleDateString()}
        </p>
        <p className="text-xs text-muted-foreground/40 mt-1">
          This report is AI-generated and should be reviewed by a security professional before action.
        </p>
      </div>
    </div>
  );
}
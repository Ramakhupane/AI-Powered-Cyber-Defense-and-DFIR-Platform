import { useState } from 'react';
import { ScanSearch, Globe, Monitor, Loader2, AlertTriangle, Bug, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { runScan } from '../services/scanService';
import { runMockScan, exampleSuggestions } from '../lib/mockScanEngine';
import { scanStore } from '../lib/scanStore';
import { getAvailableApis, hasAnyApiKey } from '../config/api';

export default function ScanPage() {
  const [target, setTarget] = useState('');
  const [scanType, setScanType] = useState<'domain' | 'ip'>('domain');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [progressStep, setProgressStep] = useState(0);
  const navigate = useNavigate();

  const availableApis = getAvailableApis();
  const hasApis = hasAnyApiKey();

  const validateTarget = (value: string) => {
    if (scanType === 'domain') {
      return /^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);
    }
    return /^(\d{1,3}\.){3}\d{1,3}$/.test(value);
  };

  const handleScan = async () => {
    const trimmed = target.trim();
    if (!trimmed) {
      setError('Please enter a target domain or IP address');
      return;
    }
    if (!validateTarget(trimmed)) {
      setError(scanType === 'domain' ? 'Invalid domain format (e.g. example.com)' : 'Invalid IP address format (e.g. 8.8.8.8)');
      return;
    }

    setError('');
    setScanning(true);
    setProgressStep(0);

    try {
      const result = await runScan(trimmed, scanType, (progress) => {
        setProgressStep(progress.step);
      });

      await scanStore.set(result);
      toast.success(`Scan complete — ${result.severity.toUpperCase()} severity`, {
        icon: result.severity === 'critical' || result.severity === 'high' ? '🚨' : '✅',
        duration: 4000,
      });

      navigate(`/dashboard?scan=${result.id}`);
    } catch (err) {
      console.error('[Scan] Error:', err);
      toast.error('Scan failed. Using simulated analysis as fallback.', { icon: '🔬' });
      const fallback = runMockScan(trimmed, scanType);
      await scanStore.set(fallback);
      navigate(`/dashboard?scan=${fallback.id}`);
    } finally {
      setScanning(false);
    }
  };

  const progressSteps = [
    'Initializing threat scan...',
    hasApis ? `Querying ${availableApis.join(', ')}...` : 'Running AI threat analysis...',
    'Analyzing threat indicators...',
    'Mapping attack paths...',
    'Generating incident report...',
  ];

  return (
    <div className="max-w-2xl mx-auto pt-8 lg:pt-16">
      <div className="text-center mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2 font-heading">
          Threat Scan
        </h1>
        <p className="text-muted-foreground">
          Enter a domain or IP address to begin AI-powered threat analysis.
        </p>
        {!hasApis && (
          <div className="flex items-center justify-center gap-2 mt-3 text-xs text-primary/70 font-mono">
            <Bug className="w-3 h-3" />
            <span>Simulation mode — add API keys for live threat data</span>
          </div>
        )}
        {typeof navigator !== 'undefined' && !navigator.onLine && (
          <div className="flex items-center justify-center gap-2 mt-3 text-xs text-yellow-500 font-mono">
            <WifiOff className="w-3 h-3" />
            <span>Offline — results will be simulated</span>
          </div>
        )}
      </div>

      {/* Scan type toggle */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <button
          onClick={() => { setScanType('domain'); setError(''); }}
          disabled={scanning}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
            scanType === 'domain'
              ? 'bg-primary text-on-primary shadow-[0_0_10px_rgba(0,255,65,0.3)]'
              : 'bg-muted text-muted-foreground hover:text-foreground border border-border'
          }`}
        >
          <Globe className="w-4 h-4" />
          Domain
        </button>
        <button
          onClick={() => { setScanType('ip'); setError(''); }}
          disabled={scanning}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
            scanType === 'ip'
              ? 'bg-primary text-on-primary shadow-[0_0_10px_rgba(0,255,65,0.3)]'
              : 'bg-muted text-muted-foreground hover:text-foreground border border-border'
          }`}
        >
          <Monitor className="w-4 h-4" />
          IP Address
        </button>
      </div>

      {/* Input area */}
      <div className="relative">
        <input
          type="text"
          value={target}
          onChange={(e) => { setTarget(e.target.value); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && !scanning && handleScan()}
          placeholder={scanType === 'domain' ? 'example.com' : '8.8.8.8'}
          disabled={scanning}
          className="w-full px-4 py-3.5 pl-12 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all duration-200 disabled:opacity-50 font-mono"
        />
        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
      </div>

      {error && (
        <div className="flex items-center gap-2 mt-3 text-sm text-destructive">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Scan button */}
      <button
        onClick={handleScan}
        disabled={scanning}
        className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-on-primary font-semibold hover:opacity-90 transition-all duration-200 disabled:opacity-50 cursor-pointer shadow-[0_0_15px_rgba(0,255,65,0.3)]"
      >
        {scanning ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Scanning...
          </>
        ) : (
          <>
            <ScanSearch className="w-5 h-5" />
            Run Threat Scan
          </>
        )}
      </button>

      {/* Progress indicator */}
      {scanning && (
        <div className="mt-8 p-4 rounded-lg bg-muted border border-border">
          <div className="space-y-3">
            {progressSteps.map((label, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-3 transition-all duration-300 ${
                  progressStep >= idx ? 'opacity-100' : 'opacity-30'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    progressStep > idx
                      ? 'bg-success'
                      : progressStep === idx
                        ? 'bg-primary animate-pulse-glow'
                        : 'bg-muted-foreground/30'
                  }`}
                />
                <span
                  className={`text-sm font-mono transition-all duration-300 ${
                    progressStep >= idx ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Example suggestions */}
      {!scanning && (
        <div className="mt-6">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 font-heading">
            Try an example
          </p>
          <div className="flex flex-wrap gap-2">
            {exampleSuggestions.map((suggestion) => (
              <button
                key={suggestion.target}
                onClick={() => {
                  setTarget(suggestion.target);
                  setScanType(/^\d/.test(suggestion.target) ? 'ip' : 'domain');
                  setError('');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-muted/50 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all duration-200 cursor-pointer"
              >
                <Bug className="w-3 h-3" />
                <span>{suggestion.label}</span>
                <span className="text-[10px] opacity-60">({suggestion.target})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* API Status */}
      {!scanning && (
        <div className="mt-8 p-4 rounded-lg bg-muted/50 border border-border/50">
          <p className="text-xs text-muted-foreground font-mono mb-2">
            <span className="text-primary">&gt;</span> Threat intelligence feeds
          </p>
          <div className="flex flex-wrap gap-2">
            {['VirusTotal', 'AbuseIPDB', 'Shodan'].map((api) => {
              const available = availableApis.includes(api);
              return (
                <span
                  key={api}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                    available
                      ? 'border-success/30 text-success bg-success/5'
                      : 'border-border text-muted-foreground/50 bg-muted'
                  }`}
                >
                  {available ? '●' : '○'} {api}
                </span>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground/40 mt-2">
            {hasApis
              ? 'Live queries active — data from real threat intelligence feeds'
              : 'No API keys configured — using smart simulation. Set keys in .env or src/config/api.ts'}
          </p>
        </div>
      )}
    </div>
  );
}
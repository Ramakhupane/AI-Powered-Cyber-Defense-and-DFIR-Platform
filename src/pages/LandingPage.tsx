import { Shield, ArrowRight, ScanSearch, FileText, History, Bug, ExternalLink, LogIn } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleCtaClick = () => {
    if (user) {
      navigate('/scan');
    } else {
      navigate('/auth/signin');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="border-b border-border bg-muted/50 backdrop-blur-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 lg:px-6 h-14">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-bold text-foreground font-heading">CyberDefend</span>
          </div>
          {user ? (
            <Link
              to="/scan"
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-primary text-on-primary text-sm font-medium hover:opacity-90 transition-all duration-200 cursor-pointer"
            >
              <ScanSearch className="w-4 h-4" />
              Launch Scan
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/auth/signin"
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-sm font-medium transition-all duration-200 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </Link>
              <Link
                to="/auth/signup"
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-primary text-on-primary text-sm font-medium hover:opacity-90 transition-all duration-200 cursor-pointer shadow-[0_0_10px_rgba(0,255,65,0.2)]"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 lg:px-6">
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center py-16 lg:py-24">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(0,255,65,0.15)]">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl lg:text-5xl font-bold text-foreground mb-4 font-heading">
            AI-Powered{' '}
            <span className="text-primary">Cyber Defense</span>
          </h1>
          <p className="text-base lg:text-lg text-muted-foreground max-w-2xl mb-8 font-mono">
            Next-generation threat detection and incident response platform.
            Analyze domains and IPs with AI-driven intelligence, visualize attack
            paths, and generate comprehensive DFIR reports.
          </p>
          <button
            onClick={handleCtaClick}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-on-primary font-semibold hover:opacity-90 transition-all duration-200 cursor-pointer shadow-[0_0_15px_rgba(0,255,65,0.3)]"
          >
            <ScanSearch className="w-5 h-5" />
            {user ? 'Start New Scan' : 'Get Started'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-16">
          <div className="p-6 rounded-xl bg-muted border border-border hover:border-primary/30 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:shadow-[0_0_15px_rgba(0,255,65,0.15)] transition-all duration-300">
              <Bug className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2 font-heading">Threat Intelligence</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Real-time queries against VirusTotal, AbuseIPDB, and Shodan to
              surface known malicious indicators.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-muted border border-border hover:border-primary/30 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center mb-4 group-hover:shadow-[0_0_15px_rgba(239,68,68,0.15)] transition-all duration-300">
              <FileText className="w-5 h-5 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2 font-heading">AI Analysis</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              AI-powered incident summarization, threat scoring, and actionable
              remediation steps tailored to your threat profile.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-muted border border-border hover:border-primary/30 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center mb-4 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] transition-all duration-300">
              <History className="w-5 h-5 text-success" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2 font-heading">Attack Paths</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Visualize how threats propagate through your infrastructure with
              interactive D3.js attack path graphs.
            </p>
          </div>
        </div>

        {/* API Status */}
        <div className="mb-16 p-4 rounded-lg bg-muted/50 border border-border/50">
          <p className="text-xs text-muted-foreground font-mono mb-2">
            <span className="text-primary">&gt;</span> Threat intelligence feeds status
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { name: 'VirusTotal', icon: Bug, desc: 'Malware detection & file reputation' },
              { name: 'AbuseIPDB', icon: Shield, desc: 'IP abuse reporting database' },
              { name: 'Shodan', icon: ExternalLink, desc: 'Internet device & port scanning' },
            ].map((api) => (
              <div key={api.name} className="flex items-start gap-3 p-2">
                <api.icon className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">{api.name}</p>
                  <p className="text-xs text-muted-foreground/60">{api.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="py-8 border-t border-border text-center">
          <p className="text-xs text-muted-foreground/60 font-mono">
            AI-Powered Cyber Defense &amp; DFIR Platform &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
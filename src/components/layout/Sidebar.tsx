import { NavLink } from 'react-router-dom';
import { Shield, Gauge, History, FileText, ScanSearch, Monitor, X, LogOut } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useAuth } from '../../hooks/useAuth';

const navItems = [
  { to: '/', icon: Shield, label: 'Home', exact: true },
  { to: '/scan', icon: ScanSearch, label: 'New Scan', exact: true },
  { to: '/dashboard', icon: Gauge, label: 'Dashboard', exact: false },
  { to: '/network', icon: Monitor, label: 'Network', exact: false },
  { to: '/history', icon: History, label: 'History', exact: false },
  { to: '/report/latest', icon: FileText, label: 'Latest Report', exact: false },
];

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const isOnline = useOnlineStatus();
  const { user, signOut } = useAuth();

  return (
    <aside className="fixed left-0 top-0 z-50 h-full w-64 border-r border-border bg-muted flex flex-col">
      {/* Logo area */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground leading-tight font-heading">CyberDefend</h1>
            <p className="text-[10px] text-primary font-medium font-mono">DFIR Platform</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent'
              }`
            }
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="px-3 py-3 border-t border-border space-y-1">
        <div className="px-3 py-2 flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-primary">
              {user?.email ? user.email.slice(0, 2).toUpperCase() : 'CD'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">
              {user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-[10px] text-muted-foreground/60 font-mono truncate">
              {user?.email || 'Not signed in'}
            </p>
          </div>
        </div>

        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>

        <div className="flex items-center gap-2 px-3 py-2">
          <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-success animate-pulse-glow' : 'bg-yellow-500'}`} />
          <span className="text-xs text-muted-foreground font-mono">
            {isOnline ? 'System Online' : 'Offline Mode'}
          </span>
        </div>
      </div>
    </aside>
  );
}
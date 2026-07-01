import { useState, useRef, useEffect } from 'react';
import { Bell, Menu, WifiOff, LogOut, User } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useAuth } from '../../hooks/useAuth';

interface HeaderProps {
  onMenuToggle: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const isOnline = useOnlineStatus();
  const { user, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userInitials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'CD';

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-6">
      {/* Left: mobile menu toggle + breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-200 cursor-pointer"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground font-mono">CyberDefend</span>
          <span className="text-muted-foreground/40">/</span>
          <span className="text-sm font-medium text-foreground font-mono">Dashboard</span>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {/* Online status */}
        {!isOnline && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-yellow-500/10 border border-yellow-500/20">
            <WifiOff className="w-3 h-3 text-yellow-500" />
            <span className="text-[10px] text-yellow-500 font-mono hidden sm:inline">Offline</span>
          </div>
        )}

        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-200 cursor-pointer" aria-label="Notifications">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive" />
        </button>

        {/* User avatar with dropdown */}
        <div className="relative ml-2" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 border border-primary/30 hover:bg-primary/30 transition-colors duration-200 cursor-pointer"
            aria-label="User menu"
          >
            <span className="text-xs font-bold text-primary">{userInitials}</span>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-10 w-56 rounded-xl bg-muted border border-border shadow-xl shadow-black/30 overflow-hidden z-50 animate-fade-in">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-xs font-medium text-foreground truncate">{user?.email || 'User'}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5 font-mono">Signed in</p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => setDropdownOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors duration-200 cursor-pointer"
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    signOut();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors duration-200 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
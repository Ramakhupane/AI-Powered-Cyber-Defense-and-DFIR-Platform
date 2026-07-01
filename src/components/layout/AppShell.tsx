import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="relative w-64 h-full" onClick={(e) => e.stopPropagation()}>
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="lg:pl-64">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        <main className="min-h-[calc(100vh-3.5rem)] p-4 lg:p-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-border px-6 py-3">
          <p className="text-xs text-muted-foreground text-center font-mono">
            CyberDefend DFIR Platform &copy; {new Date().getFullYear()} &mdash; AI-Powered Cyber Defense
          </p>
        </footer>
      </div>
    </div>
  );
}
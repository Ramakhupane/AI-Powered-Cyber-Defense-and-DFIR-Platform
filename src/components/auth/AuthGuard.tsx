import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <span className="text-sm text-muted-foreground font-mono">Authenticating...</span>
        </div>
      </div>
    );
  }

  // Redirect to sign in if not authenticated
  if (!user) {
    return <Navigate to="/auth/signin" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
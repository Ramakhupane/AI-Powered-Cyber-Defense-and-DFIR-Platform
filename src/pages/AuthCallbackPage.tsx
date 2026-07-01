import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, Shield } from 'lucide-react';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase automatically handles the OAuth callback via detectSessionInUrl
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          navigate('/scan', { replace: true });
        } else {
          // If no session, the hash might contain the tokens — let Supabase handle it
          const {
            data: { session: newSession },
          } = await supabase.auth.getSession();

          if (newSession) {
            navigate('/scan', { replace: true });
          } else {
            setError('Authentication failed. Please try signing in again.');
          }
        }
      } catch (err) {
        console.error('[AuthCallback] Error:', err);
        setError('An error occurred during authentication.');
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2 font-heading">
            Authentication Error
          </h2>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <button
            onClick={() => navigate('/auth/signin')}
            className="px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-medium hover:opacity-90 transition-all duration-200 cursor-pointer"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground font-mono">
          Completing authentication...
        </p>
      </div>
    </div>
  );
}
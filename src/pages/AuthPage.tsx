import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Shield, Mail, Lock, Loader2 } from 'lucide-react';
import { SiGithub, SiGoogle } from 'react-icons/si';
import toast from 'react-hot-toast';

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isSignUp = location.pathname === '/auth/signup';

  const { signIn, signUp, signInWithGoogle, signInWithGithub } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) {
          toast.error(error);
          return;
        }
        toast.success(
          'Account created! Check your email for a confirmation link.',
          { duration: 5000 }
        );
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error);
          return;
        }
        toast.success('Welcome back!');
        navigate('/scan');
      }
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch {
      toast.error('Failed to start Google sign in.');
    }
  };

  const handleGithubSignIn = async () => {
    try {
      await signInWithGithub();
    } catch {
      toast.error('Failed to start GitHub sign in.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(0,255,65,0.1)]">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground font-heading">
            {isSignUp ? 'Create Account' : 'Sign In'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">
            {isSignUp
              ? 'Join the CyberDefend platform'
              : 'Access your DFIR dashboard'}
          </p>
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-3 mb-6">
          <button
            onClick={handleGoogleSignIn}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-border bg-muted text-foreground hover:bg-muted/80 transition-all duration-200 cursor-pointer disabled:opacity-50 text-sm font-medium"
          >
            <SiGoogle className="w-4 h-4" />
            Continue with Google
          </button>
          <button
            onClick={handleGithubSignIn}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-border bg-muted text-foreground hover:bg-muted/80 transition-all duration-200 cursor-pointer disabled:opacity-50 text-sm font-medium"
          >
            <SiGithub className="w-4 h-4" />
            Continue with GitHub
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-mono">or continue with email</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-muted-foreground mb-1.5 font-mono">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={submitting}
                className="w-full px-4 py-2.5 pl-10 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all duration-200 disabled:opacity-50 font-mono text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium text-muted-foreground mb-1.5 font-mono">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                disabled={submitting}
                className="w-full px-4 py-2.5 pl-10 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all duration-200 disabled:opacity-50 font-mono text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-on-primary font-semibold hover:opacity-90 transition-all duration-200 disabled:opacity-50 cursor-pointer shadow-[0_0_10px_rgba(0,255,65,0.2)]"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isSignUp ? 'Creating account...' : 'Signing in...'}
              </>
            ) : (
              <>{isSignUp ? 'Create Account' : 'Sign In'}</>
            )}
          </button>
        </form>

        {/* Toggle sign in / sign up */}
        <p className="mt-6 text-center text-sm text-muted-foreground font-mono">
          {isSignUp ? (
            <>
              Already have an account?{' '}
              <Link
                to="/auth/signin"
                className="text-primary hover:text-primary/80 transition-colors font-medium"
              >
                Sign In
              </Link>
            </>
          ) : (
            <>
              Don't have an account?{' '}
              <Link
                to="/auth/signup"
                className="text-primary hover:text-primary/80 transition-colors font-medium"
              >
                Create one
              </Link>
            </>
          )}
        </p>

        {/* Back to home */}
        <div className="mt-4 text-center">
          <Link
            to="/"
            className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors font-mono"
          >
            &larr; Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
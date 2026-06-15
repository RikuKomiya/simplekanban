import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { signIn } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { useAuthMethods } from '@/hooks/useAuthMethods';

export function LoginPage() {
  const navigate = useNavigate();
  const { data: authMethods } = useAuthMethods();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const emailPasswordEnabled = authMethods?.emailPassword ?? true;
  const googleEnabled = authMethods?.google ?? false;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signIn.email({ email, password });
      if (res.error) {
        toast.error(res.error.message ?? 'Sign in failed');
        return;
      }
      navigate({ to: '/onboarding', replace: true });
    } catch {
      toast.error('Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Sign in to SimpleKanban" subtitle="Welcome back.">
      <div className="flex flex-col gap-3">
        {googleEnabled ? <GoogleSignInButton /> : null}
        {googleEnabled && emailPasswordEnabled ? (
          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-[var(--border)]" />
            <span className="text-xs text-[var(--text-muted)]">or</span>
            <div className="h-px flex-1 bg-[var(--border)]" />
          </div>
        ) : null}
        {emailPasswordEnabled ? (
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-[var(--text-secondary)]">Email</span>
              <Input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-[var(--text-secondary)]">
                Password
              </span>
              <Input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </label>
            <Button
              type="submit"
              variant="primary"
              className="mt-1 w-full"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        ) : null}
      </div>
      {emailPasswordEnabled ? (
        <p className="mt-5 text-center text-xs text-[var(--text-secondary)]">
          Don't have an account?{' '}
          <Link to="/signup" className="text-[var(--accent)] hover:underline">
            Sign up
          </Link>
        </p>
      ) : null}
    </AuthLayout>
  );
}

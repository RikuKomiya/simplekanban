import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { signUp } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { useAuthMethods } from '@/hooks/useAuthMethods';

export function SignupPage() {
  const navigate = useNavigate();
  const { data: authMethods } = useAuthMethods();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const emailPasswordEnabled = authMethods?.emailPassword ?? true;
  const googleEnabled = authMethods?.google ?? false;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signUp.email({ name, email, password });
      if (res.error) {
        toast.error(res.error.message ?? 'Sign up failed');
        return;
      }
      navigate({ to: '/onboarding', replace: true });
    } catch {
      toast.error('Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start tracking work in seconds."
    >
      <div className="flex flex-col gap-3">
        {googleEnabled ? <GoogleSignInButton errorPath="/signup" /> : null}
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
              <span className="text-xs text-[var(--text-secondary)]">Name</span>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ada Lovelace"
                autoComplete="name"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-[var(--text-secondary)]">Email</span>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-[var(--text-secondary)]">
                Password
              </span>
              <Input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
            </label>
            <Button
              type="submit"
              variant="primary"
              className="mt-1 w-full"
              disabled={loading}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
        ) : null}
      </div>
      <p className="mt-5 text-center text-xs text-[var(--text-secondary)]">
        Already have an account?{' '}
        <Link to="/login" className="text-[var(--accent)] hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

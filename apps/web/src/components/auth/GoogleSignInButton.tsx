import { useState } from 'react';
import { toast } from 'sonner';
import { signIn } from '@/lib/auth';
import { Button } from '@/components/ui/Button';

interface GoogleSignInButtonProps {
  disabled?: boolean;
  errorPath?: '/login' | '/signup';
}

export function GoogleSignInButton({
  disabled,
  errorPath = '/login',
}: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    setLoading(true);
    try {
      const res = await signIn.social({
        provider: 'google',
        callbackURL: `${window.location.origin}/onboarding`,
        errorCallbackURL: `${window.location.origin}${errorPath}`,
      });
      if (res.error) {
        toast.error(res.error.message ?? 'Google sign in failed');
        setLoading(false);
      }
    } catch {
      toast.error('Google sign in failed');
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="secondary"
      className="w-full"
      onClick={onClick}
      disabled={disabled || loading}
    >
      <span className="grid h-4 w-4 place-items-center rounded-sm bg-white text-[11px] font-semibold text-[#4285f4]">
        G
      </span>
      {loading ? 'Redirecting...' : 'Continue with Google'}
    </Button>
  );
}

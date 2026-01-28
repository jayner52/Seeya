'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@/components/ui';
import { acceptInvite } from '@/lib/api/invites';
import { useAuthStore } from '@/stores/authStore';
import { Check, Loader2, AlertCircle } from 'lucide-react';

interface AcceptInviteFormProps {
  code: string;
  tripId: string;
  tripName: string;
}

export function AcceptInviteForm({
  code,
  tripId,
  tripName,
}: AcceptInviteFormProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    if (!user) {
      router.push(`/login?invite=${code}`);
      return;
    }

    setStatus('loading');
    setError(null);

    const result = await acceptInvite(code, user.id);

    if (result.error) {
      setStatus('error');
      setError(result.error);
      return;
    }

    setStatus('success');

    // Redirect to trip after a brief delay
    setTimeout(() => {
      router.push(`/trips/${tripId}`);
    }, 1500);
  };

  if (status === 'success') {
    return (
      <Card variant="elevated" padding="lg" className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="text-green-600" size={32} />
        </div>
        <h2 className="text-xl font-semibold text-seeya-text mb-2">
          You&apos;re in!
        </h2>
        <p className="text-seeya-text-secondary mb-4">
          You&apos;ve successfully joined &ldquo;{tripName}&rdquo;
        </p>
        <p className="text-sm text-seeya-text-secondary">
          Redirecting to your trip...
        </p>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="lg" className="text-center">
      <h2 className="text-xl font-semibold text-seeya-text mb-2">
        Ready to join?
      </h2>
      <p className="text-seeya-text-secondary mb-6">
        Accept this invitation to become a traveler on this trip
      </p>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-100 flex items-center gap-3 text-left">
          <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <Button
        variant="purple"
        size="lg"
        className="w-full"
        onClick={handleAccept}
        disabled={status === 'loading'}
      >
        {status === 'loading' ? (
          <>
            <Loader2 className="animate-spin mr-2" size={20} />
            Joining trip...
          </>
        ) : (
          'Accept Invitation'
        )}
      </Button>

      {!user && (
        <p className="mt-4 text-sm text-seeya-text-secondary">
          You&apos;ll need to sign in or create an account first
        </p>
      )}
    </Card>
  );
}

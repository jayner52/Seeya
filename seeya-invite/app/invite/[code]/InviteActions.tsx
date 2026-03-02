'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { respondToInvite } from '@/lib/api/invites';
import {
  Smartphone,
  Globe,
  Check,
  Loader2,
  Copy,
  CheckCircle,
  HelpCircle,
  X,
} from 'lucide-react';

interface InviteActionsProps {
  code: string;
  tripId: string;
  tripName: string;
  appStoreUrl: string;
}

export function InviteActions({
  code,
  tripId,
  tripName,
  appStoreUrl,
}: InviteActionsProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [actionLoading, setActionLoading] = useState<'accept' | 'maybe' | 'decline' | null>(null);
  const [acceptStatus, setAcceptStatus] = useState<'idle' | 'success' | 'declined' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [attemptedDeepLink, setAttemptedDeepLink] = useState(false);

  const deepLinkUrl = `seeya://invite/${code}`;

  // Try to open app on mount
  useEffect(() => {
    const attemptAppOpen = () => {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = deepLinkUrl;
      document.body.appendChild(iframe);

      setTimeout(() => {
        window.location.href = deepLinkUrl;
      }, 100);

      setTimeout(() => {
        setAttemptedDeepLink(true);
        document.body.removeChild(iframe);
      }, 2000);
    };

    attemptAppOpen();
  }, [deepLinkUrl]);

  const handleRespond = async (response: 'accept' | 'maybe' | 'decline') => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push(`/login?invite=${code}`);
      return;
    }

    setActionLoading(response);
    setError(null);

    const result = await respondToInvite(code, response);

    setActionLoading(null);

    if (!result.success) {
      setError(result.error ?? 'Something went wrong. Please try again.');
      return;
    }

    if (response === 'decline') {
      setAcceptStatus('declined');
      return;
    }

    // accept or maybe — new users go through onboarding first
    if (result.isNewUser && result.tripId) {
      router.push(`/onboarding/welcome?next=${encodeURIComponent(`/trips/${result.tripId}`)}`);
      return;
    }

    setAcceptStatus('success');
    setTimeout(() => {
      router.push(`/trips/${result.tripId ?? tripId}`);
    }, 1500);
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTryAppAgain = () => {
    window.location.href = deepLinkUrl;
  };

  if (acceptStatus === 'success') {
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

  if (acceptStatus === 'declined') {
    return (
      <Card variant="elevated" padding="lg" className="text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <X className="text-gray-500" size={32} />
        </div>
        <h2 className="text-xl font-semibold text-seeya-text mb-2">
          Invitation Declined
        </h2>
        <p className="text-seeya-text-secondary mb-6">
          You&apos;ve declined the invitation to &ldquo;{tripName}&rdquo;. You can always ask your friend to send a new invite.
        </p>
        <Button
          variant="outline"
          size="md"
          onClick={() => {
            setAcceptStatus('idle');
            setError(null);
          }}
        >
          Changed your mind?
        </Button>
      </Card>
    );
  }

  if (!attemptedDeepLink) {
    return (
      <Card variant="elevated" padding="lg" className="text-center">
        <Loader2
          className="animate-spin text-seeya-purple mx-auto mb-4"
          size={32}
        />
        <p className="text-seeya-text font-medium">Opening Seeya app...</p>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="lg">
      <div className="space-y-4">
        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Response buttons */}
        <div className="space-y-3">
          {/* Accept */}
          <Button
            variant="purple"
            size="lg"
            className="w-full"
            onClick={() => handleRespond('accept')}
            disabled={actionLoading !== null || authLoading}
            leftIcon={
              actionLoading === 'accept' ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Globe size={20} />
              )
            }
          >
            {actionLoading === 'accept'
              ? 'Joining...'
              : isAuthenticated
                ? 'Accept'
                : 'Sign in to Accept'}
          </Button>

          {/* Maybe */}
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => handleRespond('maybe')}
            disabled={actionLoading !== null || authLoading}
            leftIcon={
              actionLoading === 'maybe' ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <HelpCircle size={20} />
              )
            }
          >
            {actionLoading === 'maybe' ? 'Saving...' : 'Maybe'}
          </Button>

          {/* Decline */}
          <Button
            variant="ghost"
            size="md"
            className="w-full text-seeya-text-secondary hover:text-red-500"
            onClick={() => handleRespond('decline')}
            disabled={actionLoading !== null || authLoading}
            leftIcon={
              actionLoading === 'decline' ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <X size={16} />
              )
            }
          >
            {actionLoading === 'decline' ? 'Declining...' : 'Decline'}
          </Button>
        </div>

        {/* Download App */}
        <div className="pt-4 border-t border-gray-100">
          <a href={appStoreUrl} className="block mb-3">
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              leftIcon={<Smartphone size={20} />}
            >
              Download the App
            </Button>
          </a>

          <Button
            variant="ghost"
            size="md"
            className="w-full"
            onClick={handleTryAppAgain}
          >
            Try Opening App Again
          </Button>
        </div>

        {/* Manual code entry */}
        <div className="pt-4 border-t border-gray-100">
          <p className="text-sm text-seeya-text-secondary text-center mb-3">
            Or enter this code manually in the app:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-center text-xl font-mono font-bold tracking-widest text-seeya-purple bg-seeya-purple/5 py-3 px-4 rounded-lg">
              {code}
            </code>
            <Button
              variant="outline"
              size="md"
              onClick={handleCopyCode}
              className="px-3"
            >
              {copied ? (
                <CheckCircle size={20} className="text-green-600" />
              ) : (
                <Copy size={20} />
              )}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

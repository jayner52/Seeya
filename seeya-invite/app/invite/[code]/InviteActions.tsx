'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { acceptInvite } from '@/lib/api/invites';
import {
  Smartphone,
  Globe,
  Check,
  Loader2,
  Copy,
  CheckCircle,
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
  const [acceptStatus, setAcceptStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [attemptedDeepLink, setAttemptedDeepLink] = useState(false);

  const deepLinkUrl = `seeya://invite/${code}`;

  // Try to open app on mount
  useEffect(() => {
    const attemptAppOpen = () => {
      // Create a hidden iframe to attempt deep link
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = deepLinkUrl;
      document.body.appendChild(iframe);

      // Also try window.location as fallback
      setTimeout(() => {
        window.location.href = deepLinkUrl;
      }, 100);

      // Mark that we attempted the deep link
      setTimeout(() => {
        setAttemptedDeepLink(true);
        document.body.removeChild(iframe);
      }, 2000);
    };

    attemptAppOpen();
  }, [deepLinkUrl]);

  const handleAcceptOnWeb = async () => {
    if (!isAuthenticated) {
      router.push(`/login?invite=${code}`);
      return;
    }

    if (!user) return;

    setAcceptStatus('loading');
    setError(null);

    const result = await acceptInvite(code, user.id);

    if (result.error) {
      setAcceptStatus('error');
      setError(result.error);
      return;
    }

    setAcceptStatus('success');

    // Redirect to trip after a brief delay
    setTimeout(() => {
      router.push(`/trips/${tripId}`);
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

        {/* Accept on Web */}
        <Button
          variant="purple"
          size="lg"
          className="w-full"
          onClick={handleAcceptOnWeb}
          disabled={acceptStatus === 'loading' || authLoading}
          leftIcon={
            acceptStatus === 'loading' ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Globe size={20} />
            )
          }
        >
          {acceptStatus === 'loading'
            ? 'Joining...'
            : isAuthenticated
              ? 'Accept & View on Web'
              : 'Sign in to Accept'}
        </Button>

        {/* Download App */}
        <a href={appStoreUrl} className="block">
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            leftIcon={<Smartphone size={20} />}
          >
            Download the App
          </Button>
        </a>

        {/* Try app again */}
        <Button
          variant="ghost"
          size="md"
          className="w-full"
          onClick={handleTryAppAgain}
        >
          Try Opening App Again
        </Button>

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

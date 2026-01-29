'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Card, Button } from '@/components/ui';
import { Link2, Copy, Check, RefreshCw, Share2 } from 'lucide-react';

interface InviteSectionProps {
  tripId: string;
  existingCode?: string | null;
  className?: string;
}

export function InviteSection({ tripId, existingCode, className }: InviteSectionProps) {
  const { user } = useAuthStore();
  const [inviteCode, setInviteCode] = useState(existingCode || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const inviteUrl = inviteCode
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${inviteCode}`
    : null;

  const generateInviteLink = async () => {
    if (!user) return;

    setIsGenerating(true);

    try {
      const supabase = createClient();

      // Generate a random code
      const code = generateCode();

      // Create invite link in database
      const { data, error } = await supabase
        .from('trip_invite_links')
        .insert({
          trip_id: tripId,
          created_by: user.id,
          code,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        })
        .select()
        .single();

      if (error) throw error;

      setInviteCode(data.code);
    } catch (err) {
      console.error('Error generating invite link:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!inviteUrl) return;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareLink = async () => {
    if (!inviteUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my trip on Seeya',
          text: 'I\'d like to invite you to join my trip!',
          url: inviteUrl,
        });
      } catch (err) {
        // User cancelled or error
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-seeya-text">Invite Link</h3>
          <p className="text-sm text-seeya-text-secondary">
            Share with friends to invite them
          </p>
        </div>
      </div>

      <Card variant="outline" padding="md">
        {inviteCode ? (
          <div className="space-y-4">
            {/* Invite URL display */}
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <Link2 size={18} className="text-seeya-text-secondary flex-shrink-0" />
              <span className="flex-1 text-sm text-seeya-text truncate font-mono">
                {inviteUrl}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={copied ? <Check size={16} /> : <Copy size={16} />}
                onClick={copyToClipboard}
                className="flex-1"
              >
                {copied ? 'Copied!' : 'Copy'}
              </Button>
              <Button
                variant="purple"
                size="sm"
                leftIcon={<Share2 size={16} />}
                onClick={shareLink}
                className="flex-1"
              >
                Share
              </Button>
            </div>

            {/* Generate new link */}
            <button
              onClick={generateInviteLink}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-seeya-text-secondary hover:text-seeya-text transition-colors"
            >
              <RefreshCw size={14} className={isGenerating ? 'animate-spin' : ''} />
              <span>Generate new link</span>
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-seeya-text-secondary mb-4">
              Create a shareable link to invite friends
            </p>
            <Button
              variant="purple"
              leftIcon={<Link2 size={16} />}
              onClick={generateInviteLink}
              isLoading={isGenerating}
            >
              Generate Invite Link
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

// Helper to generate random invite code
function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Spinner } from '@/components/ui';
import { ConversationList, ChatPanel } from '@/components/chat';
import { cn } from '@/lib/utils/cn';
import { MessageSquare } from 'lucide-react';

export default function MessagesPage() {
  const { user } = useAuthStore();
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedTripName, setSelectedTripName] = useState<string>('');
  const [tripNameCache, setTripNameCache] = useState<Map<string, string>>(
    new Map()
  );

  // Fetch trip name when selecting a conversation
  const selectConversation = useCallback(
    async (tripId: string) => {
      setSelectedTripId(tripId);

      // Check cache first
      const cached = tripNameCache.get(tripId);
      if (cached) {
        setSelectedTripName(cached);
        return;
      }

      const supabase = createClient();
      const { data } = await supabase
        .from('trips')
        .select('name')
        .eq('id', tripId)
        .single();

      const name = data?.name || 'Trip';
      setSelectedTripName(name);
      setTripNameCache((prev) => new Map(prev).set(tripId, name));
    },
    [tripNameCache]
  );

  const handleBack = useCallback(() => {
    setSelectedTripId(null);
  }, []);

  if (!user) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] md:h-screen flex flex-col">
      {/* Page header */}
      <div className="px-6 py-4 border-b border-seeya-border bg-white flex-shrink-0">
        <h1 className="text-2xl font-display font-semibold text-seeya-text">
          Messages
        </h1>
      </div>

      {/* Content: split layout on desktop, stacked on mobile */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversation list panel */}
        <div
          className={cn(
            'border-r border-seeya-border bg-white overflow-y-auto',
            // On mobile: full width when no conversation selected, hidden when viewing chat
            selectedTripId ? 'hidden md:block' : 'w-full',
            // On desktop: fixed sidebar width
            'md:w-80 lg:w-96 md:flex-shrink-0'
          )}
        >
          <ConversationList
            selectedTripId={selectedTripId}
            onSelectConversation={selectConversation}
          />
        </div>

        {/* Chat panel */}
        <div
          className={cn(
            'flex-1 bg-white',
            // On mobile: full width when conversation selected, hidden otherwise
            selectedTripId ? 'block' : 'hidden md:flex'
          )}
        >
          {selectedTripId ? (
            <ChatPanel
              key={selectedTripId}
              tripId={selectedTripId}
              tripName={selectedTripName}
              onBack={handleBack}
              className="h-full"
            />
          ) : (
            <div className="hidden md:flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-20 h-20 rounded-full bg-seeya-card flex items-center justify-center mb-4">
                <MessageSquare
                  size={36}
                  className="text-seeya-text-secondary"
                />
              </div>
              <h2 className="text-lg font-semibold text-seeya-text mb-1">
                Select a conversation
              </h2>
              <p className="text-sm text-seeya-text-secondary max-w-xs">
                Choose a trip from the sidebar to start chatting with your travel
                companions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

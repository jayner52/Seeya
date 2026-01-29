'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';
import { createClient } from '@/lib/supabase/client';
import { Avatar, Button } from '@/components/ui';
import { Search, X, UserPlus, Loader2 } from 'lucide-react';
import type { Profile } from '@/types/database';

interface UserSearchInputProps {
  currentUserId: string;
  existingFriendIds: string[];
  onSendRequest: (userId: string) => Promise<void>;
  className?: string;
}

export function UserSearchInput({
  currentUserId,
  existingFriendIds,
  onSendRequest,
  className,
}: UserSearchInputProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`full_name.ilike.%${query}%,bio.ilike.%${query}%`)
        .neq('id', currentUserId)
        .limit(10);

      if (!error && data) {
        // Filter out existing friends
        const filtered = data.filter(
          (profile) => !existingFriendIds.includes(profile.id)
        );
        setResults(filtered);
      }
      setIsSearching(false);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, currentUserId, existingFriendIds]);

  const handleSendRequest = async (userId: string) => {
    setSendingTo(userId);
    try {
      await onSendRequest(userId);
      // Remove from results after sending
      setResults((prev) => prev.filter((p) => p.id !== userId));
    } finally {
      setSendingTo(null);
    }
  };

  return (
    <div className={className}>
      {/* Search input */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name..."
          className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none transition-all"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
          >
            <X size={16} className="text-gray-400" />
          </button>
        )}
      </div>

      {/* Search results */}
      {(results.length > 0 || isSearching) && (
        <div className="mt-3 space-y-2">
          {isSearching ? (
            <div className="flex items-center justify-center py-4 text-seeya-text-secondary">
              <Loader2 size={20} className="animate-spin mr-2" />
              <span>Searching...</span>
            </div>
          ) : (
            results.map((profile) => (
              <div
                key={profile.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white"
              >
                <Avatar
                  name={profile.full_name}
                  avatarUrl={profile.avatar_url}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-seeya-text truncate">
                    {profile.full_name}
                  </p>
                  {profile.bio && (
                    <p className="text-sm text-seeya-text-secondary truncate">
                      {profile.bio}
                    </p>
                  )}
                </div>
                <Button
                  variant="purple"
                  size="sm"
                  onClick={() => handleSendRequest(profile.id)}
                  isLoading={sendingTo === profile.id}
                  leftIcon={<UserPlus size={16} />}
                >
                  Add
                </Button>
              </div>
            ))
          )}
        </div>
      )}

      {query && !isSearching && results.length === 0 && (
        <p className="mt-3 text-center text-seeya-text-secondary py-4">
          No users found matching &quot;{query}&quot;
        </p>
      )}
    </div>
  );
}

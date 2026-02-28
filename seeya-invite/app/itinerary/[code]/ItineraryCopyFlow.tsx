'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { createClient } from '@/lib/supabase/client';
import { Spinner } from '@/components/ui';
import { Copy, Plus, ArrowRight, Check } from 'lucide-react';

interface Trip {
  id: string;
  name: string;
}

interface ItineraryCopyFlowProps {
  shareCode: string;
  itineraryTitle: string;
  variant?: 'default' | 'compact';
}

export function ItineraryCopyFlow({
  shareCode,
  itineraryTitle,
  variant = 'default',
}: ItineraryCopyFlowProps) {
  const { user } = useAuthStore();
  const router = useRouter();
  const [mode, setMode] = useState<null | 'new' | 'existing'>(null);
  const [newTripName, setNewTripName] = useState(itineraryTitle);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (mode === 'existing' && user) {
      const supabase = createClient();
      supabase
        .from('trips')
        .select('id, name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
        .then(({ data }) => {
          setTrips(data || []);
          if (data && data.length > 0) setSelectedTripId(data[0].id);
        });
    }
  }, [mode, user]);

  const handleCopy = async () => {
    if (!user) {
      router.push(`/login?redirect=/itinerary/${shareCode}`);
      return;
    }

    setIsLoading(true);
    try {
      const body =
        mode === 'new'
          ? { mode: 'new_trip', new_trip_name: newTripName }
          : { mode: 'existing_trip', trip_id: selectedTripId };

      const res = await fetch(`/api/itineraries/${shareCode}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Copy failed');

      router.push(`/trips/${data.trip_id}`);
    } catch (err) {
      console.error('Copy error:', err);
      setIsLoading(false);
    }
  };

  const handleShareCopy = async () => {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (variant === 'compact') {
    return (
      <div className="text-center py-4">
        <button
          onClick={handleShareCopy}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm text-seeya-text-secondary hover:text-seeya-text transition-colors"
        >
          {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
          {copied ? 'Link copied!' : 'Copy share link'}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-seeya-text">Add this itinerary to Seeya</h2>
        <button
          onClick={handleShareCopy}
          className="flex items-center gap-1.5 text-sm text-seeya-text-secondary hover:text-seeya-text transition-colors"
        >
          {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Share'}
        </button>
      </div>

      {!mode ? (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setMode('new')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-seeya-purple text-white rounded-xl font-medium hover:bg-purple-700 transition-colors"
          >
            <Plus size={18} />
            Copy to New Trip
          </button>
          <button
            onClick={() => {
              if (!user) {
                router.push(`/login?redirect=/itinerary/${shareCode}`);
                return;
              }
              setMode('existing');
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-seeya-purple text-seeya-purple rounded-xl font-medium hover:bg-seeya-purple/5 transition-colors"
          >
            <ArrowRight size={18} />
            Add to Existing Trip
          </button>
        </div>
      ) : mode === 'new' ? (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-seeya-text">Trip name</label>
          <input
            type="text"
            value={newTripName}
            onChange={(e) => setNewTripName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-seeya-purple focus:border-transparent"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setMode(null)}
              className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCopy}
              disabled={isLoading || !newTripName.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-seeya-purple text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-60 transition-colors"
            >
              {isLoading ? <Spinner size="sm" /> : 'Create Trip'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-seeya-text">Choose a trip</label>
          {trips.length === 0 ? (
            <p className="text-sm text-seeya-text-secondary">Loading trips...</p>
          ) : (
            <select
              value={selectedTripId}
              onChange={(e) => setSelectedTripId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-seeya-purple focus:border-transparent"
            >
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setMode(null)}
              className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCopy}
              disabled={isLoading || !selectedTripId}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-seeya-purple text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-60 transition-colors"
            >
              {isLoading ? <Spinner size="sm" /> : 'Add to Trip'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

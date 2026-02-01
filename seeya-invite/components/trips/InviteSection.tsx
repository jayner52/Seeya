'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Card, Button } from '@/components/ui';
import { Link2, Copy, Check, RefreshCw, Share2, MapPin, ChevronDown, ChevronRight, Plane, Home, Car, Activity, Utensils, FileText } from 'lucide-react';
import type { TripLocation, TripBit, TripBitCategory } from '@/types/database';

interface InviteSectionProps {
  tripId: string;
  existingCode?: string | null;
  className?: string;
}

// Category icon mapping
const CATEGORY_ICONS: Record<TripBitCategory, React.ReactNode> = {
  flight: <Plane size={14} />,
  stay: <Home size={14} />,
  hotel: <Home size={14} />,
  car: <Car size={14} />,
  activity: <Activity size={14} />,
  restaurant: <Utensils size={14} />,
  reservation: <Utensils size={14} />,
  transport: <Car size={14} />,
  money: <FileText size={14} />,
  document: <FileText size={14} />,
  photos: <FileText size={14} />,
  note: <FileText size={14} />,
  other: <FileText size={14} />,
};

export function InviteSection({ tripId, existingCode, className }: InviteSectionProps) {
  const { user } = useAuthStore();
  const [inviteCode, setInviteCode] = useState(existingCode || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Location and tripbit selection state
  const [locations, setLocations] = useState<TripLocation[]>([]);
  const [tripbits, setTripbits] = useState<TripBit[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<Set<string>>(new Set());
  const [selectedTripbitIds, setSelectedTripbitIds] = useState<Set<string>>(new Set());
  const [expandedLocationIds, setExpandedLocationIds] = useState<Set<string>>(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);

  const inviteUrl = inviteCode
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${inviteCode}`
    : null;

  // Fetch locations and tripbits
  useEffect(() => {
    async function fetchTripData() {
      const supabase = createClient();

      // Fetch locations
      const { data: locationData } = await supabase
        .from('trip_locations')
        .select('*, city:cities(*)')
        .eq('trip_id', tripId)
        .order('order_index');

      if (locationData) {
        setLocations(locationData);
        // Select all locations by default
        setSelectedLocationIds(new Set(locationData.map(l => l.id)));
      }

      // Fetch tripbits
      const { data: tripbitData } = await supabase
        .from('trip_bits')
        .select('*')
        .eq('trip_id', tripId)
        .order('start_datetime');

      if (tripbitData) {
        setTripbits(tripbitData);
        // Select all tripbits by default
        setSelectedTripbitIds(new Set(tripbitData.map(t => t.id)));
      }
    }

    fetchTripData();
  }, [tripId]);

  const generateInviteLink = async () => {
    if (!user) return;

    setIsGenerating(true);

    try {
      const supabase = createClient();
      const code = generateCode();

      // Only include location_ids if not all locations are selected
      const locationIds = selectedLocationIds.size === locations.length
        ? null
        : Array.from(selectedLocationIds);

      const { data, error } = await supabase
        .from('trip_invite_links')
        .insert({
          trip_id: tripId,
          created_by: user.id,
          code,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          location_ids: locationIds,
        })
        .select()
        .single();

      if (error) throw error;

      setInviteCode(data.code);
      setShowCreateForm(false);
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
      } catch {
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const toggleLocation = (locationId: string) => {
    const newSelected = new Set(selectedLocationIds);
    if (newSelected.has(locationId)) {
      newSelected.delete(locationId);
      // Also deselect tripbits for this location
      const locationTripbits = tripbits.filter(t => t.location_id === locationId);
      const newTripbitIds = new Set(selectedTripbitIds);
      locationTripbits.forEach(t => newTripbitIds.delete(t.id));
      setSelectedTripbitIds(newTripbitIds);
    } else {
      newSelected.add(locationId);
      // Also select all tripbits for this location
      const locationTripbits = tripbits.filter(t => t.location_id === locationId);
      const newTripbitIds = new Set(selectedTripbitIds);
      locationTripbits.forEach(t => newTripbitIds.add(t.id));
      setSelectedTripbitIds(newTripbitIds);
    }
    setSelectedLocationIds(newSelected);
  };

  const toggleTripbit = (tripbitId: string) => {
    const newSelected = new Set(selectedTripbitIds);
    if (newSelected.has(tripbitId)) {
      newSelected.delete(tripbitId);
    } else {
      newSelected.add(tripbitId);
    }
    setSelectedTripbitIds(newSelected);
  };

  const toggleLocationExpanded = (locationId: string) => {
    const newExpanded = new Set(expandedLocationIds);
    if (newExpanded.has(locationId)) {
      newExpanded.delete(locationId);
    } else {
      newExpanded.add(locationId);
    }
    setExpandedLocationIds(newExpanded);
  };

  const selectAll = () => {
    setSelectedLocationIds(new Set(locations.map(l => l.id)));
    setSelectedTripbitIds(new Set(tripbits.map(t => t.id)));
  };

  const deselectAll = () => {
    setSelectedLocationIds(new Set());
    setSelectedTripbitIds(new Set());
  };

  const getTripbitsForLocation = (locationId: string) =>
    tripbits.filter(t => t.location_id === locationId);

  const getSelectedTripbitCount = (locationId: string) =>
    getTripbitsForLocation(locationId).filter(t => selectedTripbitIds.has(t.id)).length;

  const getLocationDisplayName = (location: TripLocation) =>
    location.name || location.city?.name || 'Unknown location';

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
        {inviteCode && !showCreateForm ? (
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
              onClick={() => setShowCreateForm(true)}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-seeya-text-secondary hover:text-seeya-text transition-colors"
            >
              <RefreshCw size={14} />
              <span>Create new link</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-seeya-text-secondary">
              Select which locations and items to include in the invite
            </p>

            {/* Location selection */}
            {locations.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-seeya-text">Include Locations</span>
                  <button
                    onClick={selectedLocationIds.size === locations.length ? deselectAll : selectAll}
                    className="text-xs text-seeya-primary hover:underline"
                  >
                    {selectedLocationIds.size === locations.length ? 'Deselect all' : 'Select all'}
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {locations.map((location, index) => {
                    const locationTripbits = getTripbitsForLocation(location.id);
                    const selectedCount = getSelectedTripbitCount(location.id);
                    const isExpanded = expandedLocationIds.has(location.id);
                    const isSelected = selectedLocationIds.has(location.id);

                    return (
                      <div key={location.id}>
                        <div
                          className={`flex items-center gap-3 p-3 ${index > 0 ? 'border-t border-gray-100' : ''}`}
                        >
                          {/* Expand button */}
                          {locationTripbits.length > 0 ? (
                            <button
                              onClick={() => toggleLocationExpanded(location.id)}
                              className="text-seeya-text-secondary hover:text-seeya-text"
                            >
                              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                          ) : (
                            <div className="w-4" />
                          )}

                          <MapPin size={16} className="text-seeya-primary" />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {location.city?.country_code && (
                                <span>{getFlagEmoji(location.city.country_code)}</span>
                              )}
                              <span className="text-sm font-medium text-seeya-text truncate">
                                {getLocationDisplayName(location)}
                              </span>
                            </div>
                            {locationTripbits.length > 0 && (
                              <span className="text-xs text-seeya-text-secondary">
                                {selectedCount}/{locationTripbits.length} items
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => toggleLocation(location.id)}
                            className="flex-shrink-0"
                          >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              isSelected
                                ? 'bg-seeya-primary border-seeya-primary'
                                : 'border-gray-300'
                            }`}>
                              {isSelected && <Check size={12} className="text-seeya-text" />}
                            </div>
                          </button>
                        </div>

                        {/* Tripbits for this location */}
                        {isExpanded && locationTripbits.length > 0 && (
                          <div className="bg-gray-50">
                            {locationTripbits.map((tripbit, tripbitIndex) => (
                              <div
                                key={tripbit.id}
                                className={`flex items-center gap-3 px-3 py-2 pl-12 ${
                                  tripbitIndex > 0 ? 'border-t border-gray-100' : ''
                                }`}
                              >
                                <span className="text-seeya-primary">
                                  {CATEGORY_ICONS[tripbit.category] || <FileText size={14} />}
                                </span>

                                <div className="flex-1 min-w-0">
                                  <span className="text-sm text-seeya-text truncate block">
                                    {tripbit.title}
                                  </span>
                                </div>

                                <button
                                  onClick={() => toggleTripbit(tripbit.id)}
                                  className="flex-shrink-0"
                                >
                                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                    selectedTripbitIds.has(tripbit.id)
                                      ? 'bg-seeya-primary border-seeya-primary'
                                      : 'border-gray-300'
                                  }`}>
                                    {selectedTripbitIds.has(tripbit.id) && (
                                      <Check size={10} className="text-seeya-text" />
                                    )}
                                  </div>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Button
              variant="purple"
              leftIcon={<Link2 size={16} />}
              onClick={generateInviteLink}
              isLoading={isGenerating}
              disabled={selectedLocationIds.size === 0}
              className="w-full"
            >
              Generate Invite Link
            </Button>

            {inviteCode && (
              <button
                onClick={() => setShowCreateForm(false)}
                className="w-full text-center text-sm text-seeya-text-secondary hover:text-seeya-text"
              >
                Cancel
              </button>
            )}
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

// Helper to get flag emoji from country code
function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

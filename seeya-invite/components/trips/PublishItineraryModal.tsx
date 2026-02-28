'use client';

import { useState } from 'react';
import { X, Check, Globe, Copy, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button, Spinner } from '@/components/ui';
import { cn } from '@/lib/utils/cn';
import type { TripBit } from '@/types';

interface PublishItineraryModalProps {
  tripId: string;
  tripBits: TripBit[];
  tripDestination?: string;
  onClose: () => void;
}

type Step = 'select' | 'details' | 'success';

const CATEGORY_ICONS: Record<string, string> = {
  flight: '✈️',
  stay: '🏨',
  car: '🚗',
  activity: '🎯',
  dining: '🍽️',
  transport: '🚌',
  money: '💳',
  reservation: '📅',
  document: '📄',
  photos: '📸',
  other: '📌',
};

export function PublishItineraryModal({
  tripId,
  tripBits,
  tripDestination = '',
  onClose,
}: PublishItineraryModalProps) {
  const [step, setStep] = useState<Step>('select');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [destination, setDestination] = useState(tripDestination);
  const [durationDays, setDurationDays] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [shareCode, setShareCode] = useState('');
  const [copied, setCopied] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(tripBits.map((b) => b.id)));
  const clearAll = () => setSelectedIds(new Set());

  const selectedBits = tripBits.filter((b) => selectedIds.has(b.id));

  const handlePublish = async () => {
    if (!title.trim() || !destination.trim() || selectedBits.length === 0) return;

    setIsPublishing(true);
    try {
      const items = selectedBits.map((bit, index) => ({
        day_number: null,
        order_index: index,
        category: bit.category,
        title: bit.title,
        notes: bit.notes ?? null,
        start_time: null,
        location_name: null,
      }));

      const res = await fetch('/api/itineraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip_id: tripId,
          title: title.trim(),
          description: description.trim() || null,
          destination: destination.trim(),
          duration_days: durationDays ? parseInt(durationDays) : null,
          items,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Publish failed');

      setShareCode(data.share_code);
      setStep('success');
    } catch (err) {
      console.error('Publish error:', err);
    } finally {
      setIsPublishing(false);
    }
  };

  const shareUrl = shareCode
    ? `${window.location.origin}/itinerary/${shareCode}`
    : '';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {step !== 'select' && step !== 'success' && (
              <button
                onClick={() => setStep('select')}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <h2 className="font-semibold text-seeya-text">
              {step === 'select' && 'Select Items to Publish'}
              {step === 'details' && 'Itinerary Details'}
              {step === 'success' && 'Published!'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Step indicators */}
        {step !== 'success' && (
          <div className="flex gap-1 px-4 pt-3">
            {(['select', 'details'] as const).map((s, i) => (
              <div
                key={s}
                className={cn(
                  'h-1.5 flex-1 rounded-full',
                  step === s || (step === 'details' && i === 0)
                    ? 'bg-seeya-purple'
                    : 'bg-gray-200'
                )}
              />
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {step === 'select' && (
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-seeya-text-secondary">
                  {selectedIds.size} of {tripBits.length} selected
                </span>
                <div className="flex gap-3">
                  <button onClick={selectAll} className="text-seeya-purple hover:underline">
                    Select all
                  </button>
                  <button onClick={clearAll} className="text-seeya-text-secondary hover:underline">
                    Clear
                  </button>
                </div>
              </div>

              {tripBits.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-seeya-text-secondary">No trip items to publish yet.</p>
                  <p className="text-sm text-seeya-text-secondary mt-1">
                    Add some trip bits first, then come back to publish.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tripBits.map((bit) => {
                    const isSelected = selectedIds.has(bit.id);
                    return (
                      <button
                        key={bit.id}
                        onClick={() => toggleSelect(bit.id)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-colors',
                          isSelected
                            ? 'border-seeya-purple bg-seeya-purple/5'
                            : 'border-gray-100 hover:border-gray-200'
                        )}
                      >
                        <span className="text-xl">
                          {CATEGORY_ICONS[bit.category] || '📌'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-seeya-text text-sm">{bit.title}</p>
                          <p className="text-xs text-seeya-text-secondary capitalize">
                            {bit.category}
                          </p>
                        </div>
                        <div
                          className={cn(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                            isSelected
                              ? 'border-seeya-purple bg-seeya-purple'
                              : 'border-gray-300'
                          )}
                        >
                          {isSelected && <Check size={12} className="text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === 'details' && (
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-seeya-text mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Perfect Tokyo Week"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-seeya-purple"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-seeya-text mb-1">
                  Destination <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Tokyo, Japan"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-seeya-purple"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-seeya-text mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Share what makes this itinerary special..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-seeya-purple resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-seeya-text mb-1">
                  Duration (days)
                </label>
                <input
                  type="number"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  placeholder="e.g. 7"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-seeya-purple"
                />
              </div>

              <div className="bg-gray-50 rounded-xl p-3 text-sm text-seeya-text-secondary">
                Publishing {selectedBits.length} item{selectedBits.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="p-6 space-y-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Globe className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-seeya-text mb-2">
                  Your itinerary is live!
                </h3>
                <p className="text-seeya-text-secondary text-sm">
                  Share this link with anyone — no account required to view.
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
                <p className="flex-1 text-sm text-seeya-text truncate">{shareUrl}</p>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-3 py-1.5 bg-seeya-purple text-white rounded-lg text-sm font-medium hover:bg-purple-700 shrink-0"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-gray-100">
          {step === 'select' && (
            <Button
              variant="purple"
              className="w-full"
              disabled={selectedIds.size === 0}
              onClick={() => setStep('details')}
            >
              Continue
              <ChevronRight size={18} />
            </Button>
          )}
          {step === 'details' && (
            <Button
              variant="purple"
              className="w-full"
              disabled={isPublishing || !title.trim() || !destination.trim()}
              onClick={handlePublish}
            >
              {isPublishing ? (
                <>
                  <Spinner size="sm" />
                  Publishing...
                </>
              ) : (
                <>
                  <Globe size={18} />
                  Publish Itinerary
                </>
              )}
            </Button>
          )}
          {step === 'success' && (
            <Button variant="outline" className="w-full" onClick={onClose}>
              Done
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

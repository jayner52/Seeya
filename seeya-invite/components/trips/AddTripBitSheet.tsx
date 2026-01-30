'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Input, Button } from '@/components/ui';
import { X, Plane, Hotel, Utensils, Ticket, Car, FileText, MoreHorizontal } from 'lucide-react';
import type { TripBitCategory } from '@/types/database';

interface AddTripBitSheetProps {
  tripId: string;
  initialCategory?: TripBitCategory;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const categories: { id: TripBitCategory; label: string; icon: typeof Plane }[] = [
  { id: 'flight', label: 'Flight', icon: Plane },
  { id: 'hotel', label: 'Stay', icon: Hotel },
  { id: 'transport', label: 'Transport', icon: Car },
  { id: 'activity', label: 'Activity', icon: Ticket },
  { id: 'restaurant', label: 'Restaurant', icon: Utensils },
  { id: 'note', label: 'Note', icon: FileText },
  { id: 'other', label: 'Other', icon: MoreHorizontal },
];

export function AddTripBitSheet({
  tripId,
  initialCategory,
  isOpen,
  onClose,
  onSuccess,
}: AddTripBitSheetProps) {
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [category, setCategory] = useState<TripBitCategory>(initialCategory || 'activity');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [address, setAddress] = useState('');
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [isBooked, setIsBooked] = useState(false);

  const resetForm = () => {
    setCategory(initialCategory || 'activity');
    setTitle('');
    setNotes('');
    setDate('');
    setTime('');
    setAddress('');
    setConfirmationNumber('');
    setIsBooked(false);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !title.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();

      const { error: insertError } = await supabase.from('trip_bits').insert({
        trip_id: tripId,
        created_by: user.id,
        category,
        title: title.trim(),
        notes: notes.trim() || null,
        date: date || null,
        time: time || null,
        address: address.trim() || null,
        confirmation_number: confirmationNumber.trim() || null,
        is_booked: isBooked,
      });

      if (insertError) throw insertError;

      resetForm();
      onSuccess();
    } catch (err) {
      console.error('Error creating trip bit:', err);
      setError('Failed to add item. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-auto animate-slideUp">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-seeya-text">Add to Trip Pack</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-seeya-text-secondary" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-seeya-error text-sm">
              {error}
            </div>
          )}

          {/* Category selector */}
          <div>
            <label className="block text-sm font-medium text-seeya-text mb-2">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isSelected
                        ? 'bg-seeya-purple text-white'
                        : 'bg-gray-100 text-seeya-text-secondary hover:bg-gray-200'
                    )}
                  >
                    <Icon size={16} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <Input
            label="Title"
            placeholder="What is this for?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-seeya-text mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-seeya-text mb-1.5">
                Time
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none transition-all"
              />
            </div>
          </div>

          {/* Address */}
          <Input
            label="Address (optional)"
            placeholder="Location or address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          {/* Confirmation Number */}
          <Input
            label="Confirmation # (optional)"
            placeholder="Booking confirmation number"
            value={confirmationNumber}
            onChange={(e) => setConfirmationNumber(e.target.value)}
          />

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-seeya-text mb-1.5">
              Notes (optional)
            </label>
            <textarea
              placeholder="Any additional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none transition-all resize-none placeholder:text-gray-400"
            />
          </div>

          {/* Booked toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isBooked}
              onChange={(e) => setIsBooked(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-seeya-purple focus:ring-seeya-purple"
            />
            <span className="text-sm text-seeya-text">
              This is confirmed/booked
            </span>
          </label>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="purple"
              disabled={!title.trim()}
              isLoading={isSubmitting}
              className="flex-1"
            >
              Add
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

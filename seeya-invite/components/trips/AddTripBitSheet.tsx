'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Input, Button } from '@/components/ui';
import {
  X,
  Plane,
  Hotel,
  Car,
  Ticket,
  Bus,
  DollarSign,
  CalendarCheck,
  FileText,
  Image,
  MoreHorizontal,
  Link2,
  Calendar,
  Users,
  Check,
} from 'lucide-react';
import type { TripBitCategory, TripParticipant } from '@/types/database';
import {
  FlightFields,
  StayFields,
  CarFields,
  ActivityFields,
  TransportFields,
  MoneyFields,
  ReservationFields,
  DocumentFields,
  PhotosFields,
  OtherFields,
} from './tripbit-forms';

interface AddTripBitSheetProps {
  tripId: string;
  participants: TripParticipant[];
  initialCategory?: TripBitCategory;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const categories: { id: TripBitCategory; label: string; icon: typeof Plane; color: string }[] = [
  { id: 'flight', label: 'Flight', icon: Plane, color: 'bg-blue-100 text-blue-600' },
  { id: 'stay', label: 'Stay', icon: Hotel, color: 'bg-purple-100 text-purple-600' },
  { id: 'car', label: 'Car', icon: Car, color: 'bg-pink-100 text-pink-600' },
  { id: 'activity', label: 'Activity', icon: Ticket, color: 'bg-green-100 text-green-600' },
  { id: 'transport', label: 'Transit', icon: Bus, color: 'bg-yellow-100 text-yellow-700' },
  { id: 'money', label: 'Money', icon: DollarSign, color: 'bg-emerald-100 text-emerald-600' },
  { id: 'reservation', label: 'Reserv.', icon: CalendarCheck, color: 'bg-red-100 text-red-600' },
  { id: 'document', label: 'Doc', icon: FileText, color: 'bg-orange-100 text-orange-600' },
  { id: 'photos', label: 'Photos', icon: Image, color: 'bg-indigo-100 text-indigo-600' },
  { id: 'other', label: 'Other', icon: MoreHorizontal, color: 'bg-gray-100 text-gray-600' },
];

export function AddTripBitSheet({
  tripId,
  participants,
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
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'confirmed' | 'pending' | 'cancelled'>('pending');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const [details, setDetails] = useState<Record<string, string | number>>({});
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [everyoneSelected, setEveryoneSelected] = useState(true);

  // Reset category when initialCategory changes
  useEffect(() => {
    if (initialCategory) {
      setCategory(initialCategory);
    }
  }, [initialCategory]);

  const resetForm = () => {
    setCategory(initialCategory || 'activity');
    setTitle('');
    setUrl('');
    setStatus('pending');
    setStartDate('');
    setStartTime('');
    setEndDate('');
    setEndTime('');
    setNotes('');
    setDetails({});
    setSelectedParticipants([]);
    setEveryoneSelected(true);
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

      // Combine date and time into ISO datetime
      const startDatetime = startDate && startTime
        ? new Date(`${startDate}T${startTime}`).toISOString()
        : startDate
        ? new Date(`${startDate}T00:00:00`).toISOString()
        : null;

      const endDatetime = endDate && endTime
        ? new Date(`${endDate}T${endTime}`).toISOString()
        : endDate
        ? new Date(`${endDate}T23:59:59`).toISOString()
        : null;

      // Map status to TripBitStatus
      const tripBitStatus = status === 'confirmed' ? 'booked'
        : status === 'pending' ? 'planned'
        : 'cancelled';

      // 1. Insert main trip_bit record
      const { data: tripBit, error: insertError } = await supabase
        .from('trip_bits')
        .insert({
          trip_id: tripId,
          created_by: user.id,
          category,
          title: title.trim(),
          status: tripBitStatus,
          start_datetime: startDatetime,
          end_datetime: endDatetime,
          url: url.trim() || null,
          notes: notes.trim() || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Insert category-specific details if any
      if (Object.keys(details).length > 0) {
        const { error: detailsError } = await supabase
          .from('trip_bit_details')
          .insert({
            trip_bit_id: tripBit.id,
            details: details,
          });

        if (detailsError) {
          console.error('Error saving details:', detailsError);
          // Don't throw - trip bit was created successfully
        }
      }

      // 3. TODO Phase 2: Insert trip_bit_travelers for participant assignment

      resetForm();
      onSuccess();
    } catch (err) {
      console.error('Error creating trip bit:', err);
      setError('Failed to add item. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render category-specific fields
  const renderCategoryFields = () => {
    switch (category) {
      case 'flight':
        return <FlightFields details={details} setDetails={setDetails} />;
      case 'stay':
      case 'hotel':
        return <StayFields details={details} setDetails={setDetails} />;
      case 'car':
        return <CarFields details={details} setDetails={setDetails} />;
      case 'activity':
        return <ActivityFields details={details} setDetails={setDetails} />;
      case 'transport':
        return <TransportFields details={details} setDetails={setDetails} />;
      case 'money':
        return <MoneyFields details={details} setDetails={setDetails} />;
      case 'reservation':
      case 'restaurant':
        return <ReservationFields details={details} setDetails={setDetails} />;
      case 'document':
        return <DocumentFields details={details} setDetails={setDetails} />;
      case 'photos':
        return <PhotosFields details={details} setDetails={setDetails} />;
      case 'other':
      case 'note':
      default:
        return <OtherFields details={details} setDetails={setDetails} />;
    }
  };

  // Clear details when category changes
  useEffect(() => {
    setDetails({});
  }, [category]);

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
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
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

          {/* 1. Category Grid */}
          <div>
            <label className="block text-sm font-medium text-seeya-text mb-3">
              Category
            </label>
            <div className="grid grid-cols-4 gap-3">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-xl transition-all',
                      isSelected
                        ? 'bg-purple-100 ring-2 ring-seeya-purple'
                        : 'bg-gray-50 hover:bg-gray-100'
                    )}
                  >
                    <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', cat.color)}>
                      <Icon size={20} />
                    </div>
                    <span className="text-xs font-medium text-seeya-text">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Link Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-seeya-text">Link (optional)</label>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 focus-within:border-seeya-purple focus-within:ring-2 focus-within:ring-seeya-purple/20">
              <Link2 size={16} className="text-seeya-text-secondary flex-shrink-0" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 bg-transparent text-sm outline-none"
              />
            </div>
            <p className="text-xs text-seeya-text-secondary">
              Paste a link and we&apos;ll auto-detect the category
            </p>
          </div>

          {/* 3. Title */}
          <Input
            label="Title"
            placeholder="What is this for?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          {/* 4. Category-specific fields */}
          <div className="border-t border-gray-100 pt-4">
            <label className="block text-sm font-medium text-seeya-text mb-3">
              {categories.find(c => c.id === category)?.label || 'Details'} Details (optional)
            </label>
            {renderCategoryFields()}
          </div>

          {/* 5. Status Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-seeya-text">Status</label>
            <div className="flex rounded-lg bg-gray-100 p-1">
              {(['confirmed', 'pending', 'cancelled'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all',
                    status === s
                      ? 'bg-white shadow text-seeya-purple'
                      : 'text-seeya-text-secondary hover:text-seeya-text'
                  )}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* 6. Dates (Start/End with Time) */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-seeya-text flex items-center gap-2">
              <Calendar size={16} />
              Dates (optional)
            </label>

            {/* Start */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-seeya-text-secondary w-12">Start</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none transition-all text-sm"
              />
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-28 px-3 py-2 rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none transition-all text-sm"
              />
            </div>

            {/* End */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-seeya-text-secondary w-12">End</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none transition-all text-sm"
              />
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-28 px-3 py-2 rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none transition-all text-sm"
              />
            </div>
          </div>

          {/* 7. Who's Involved */}
          {participants.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-seeya-text flex items-center gap-2">
                <Users size={16} />
                Who&apos;s involved? (optional)
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEveryoneSelected(true);
                    setSelectedParticipants([]);
                  }}
                  className={cn(
                    'flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-all',
                    everyoneSelected
                      ? 'bg-seeya-purple text-white'
                      : 'bg-gray-100 text-seeya-text-secondary hover:bg-gray-200'
                  )}
                >
                  Everyone
                  {everyoneSelected && <Check size={14} />}
                </button>
                {participants.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setEveryoneSelected(false);
                      setSelectedParticipants(prev =>
                        prev.includes(p.user_id)
                          ? prev.filter(id => id !== p.user_id)
                          : [...prev, p.user_id]
                      );
                    }}
                    className={cn(
                      'flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-all',
                      !everyoneSelected && selectedParticipants.includes(p.user_id)
                        ? 'bg-seeya-purple text-white'
                        : 'bg-gray-100 text-seeya-text-secondary hover:bg-gray-200'
                    )}
                  >
                    {p.user?.full_name?.split(' ')[0] || 'User'}
                    {!everyoneSelected && selectedParticipants.includes(p.user_id) && <Check size={14} />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 8. Attachments Placeholder (Phase 2) */}
          <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center text-seeya-text-secondary text-sm">
            <p>Attachments coming soon</p>
          </div>

          {/* 9. Notes */}
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

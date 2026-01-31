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
  Paperclip,
  Upload,
  Trash2,
} from 'lucide-react';
import type { TripBit, TripBitCategory, TripParticipant, TripBitAttachment } from '@/types/database';
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
  tripBit?: TripBit | null; // For edit mode
  existingAttachments?: TripBitAttachment[]; // Existing attachments when editing
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onDelete?: () => void; // Called after successful deletion
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
  tripBit,
  existingAttachments = [],
  isOpen,
  onClose,
  onSuccess,
  onDelete,
}: AddTripBitSheetProps) {
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine if we're in edit mode
  const isEditMode = !!tripBit;

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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<string[]>([]);

  // Helper to convert status from DB to form
  const getFormStatus = (dbStatus?: string | null): 'confirmed' | 'pending' | 'cancelled' => {
    if (dbStatus === 'booked' || dbStatus === 'confirmed') return 'confirmed';
    if (dbStatus === 'cancelled') return 'cancelled';
    return 'pending';
  };

  // Populate form when tripBit changes (edit mode)
  useEffect(() => {
    if (tripBit && isOpen) {
      setCategory(tripBit.category as TripBitCategory || 'activity');
      setTitle(tripBit.title || '');
      setUrl(tripBit.url || '');
      setStatus(getFormStatus(tripBit.status));
      setNotes(tripBit.notes || '');

      // Parse start datetime
      if (tripBit.start_datetime) {
        const start = new Date(tripBit.start_datetime);
        setStartDate(start.toISOString().split('T')[0]);
        setStartTime(start.toTimeString().slice(0, 5));
      } else {
        setStartDate('');
        setStartTime('');
      }

      // Parse end datetime
      if (tripBit.end_datetime) {
        const end = new Date(tripBit.end_datetime);
        setEndDate(end.toISOString().split('T')[0]);
        setEndTime(end.toTimeString().slice(0, 5));
      } else {
        setEndDate('');
        setEndTime('');
      }

      // Load details from metadata or separate fetch
      if (tripBit.metadata && typeof tripBit.metadata === 'object') {
        setDetails(tripBit.metadata as Record<string, string | number>);
      }

      setAttachmentsToDelete([]);
    }
  }, [tripBit, isOpen]);

  // Reset category when initialCategory changes (only in add mode)
  useEffect(() => {
    if (initialCategory && !tripBit) {
      setCategory(initialCategory);
    }
  }, [initialCategory, tripBit]);

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
    setSelectedFiles([]);
    setAttachmentsToDelete([]);
    setShowDeleteConfirm(false);
    setError(null);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!tripBit) return;

    setIsDeleting(true);
    setError(null);

    try {
      const supabase = createClient();

      // Delete attachments from storage first
      if (existingAttachments.length > 0) {
        const filePaths = existingAttachments
          .map(a => {
            // Extract path from URL
            const url = new URL(a.file_url);
            const pathMatch = url.pathname.match(/\/trip-documents\/(.+)/);
            return pathMatch ? pathMatch[1] : null;
          })
          .filter(Boolean) as string[];

        if (filePaths.length > 0) {
          await supabase.storage.from('trip-documents').remove(filePaths);
        }
      }

      // Delete the trip bit (cascade should handle details and attachments records)
      const { error: deleteError } = await supabase
        .from('trip_bits')
        .delete()
        .eq('id', tripBit.id);

      if (deleteError) throw deleteError;

      resetForm();
      onDelete?.();
    } catch (err) {
      console.error('Error deleting trip bit:', err);
      setError('Failed to delete. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Handle removing existing attachment
  const handleRemoveExistingAttachment = (attachmentId: string) => {
    setAttachmentsToDelete(prev => [...prev, attachmentId]);
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  // Remove a selected file
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Upload files to Supabase Storage
  const uploadFiles = async (tripBitId: string): Promise<void> => {
    if (selectedFiles.length === 0) return;

    const supabase = createClient();

    for (const file of selectedFiles) {
      // Create unique file path: trip_id/tripbit_id/timestamp_filename
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${tripId}/${tripBitId}/${timestamp}_${sanitizedName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('trip-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('trip-documents')
        .getPublicUrl(filePath);

      // Insert attachment record
      const { error: attachmentError } = await supabase
        .from('trip_bit_attachments')
        .insert({
          trip_bit_id: tripBitId,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_type: file.type,
        });

      if (attachmentError) {
        console.error('Error saving attachment record:', attachmentError);
      }
    }
  };

  // Get file preview icon/thumbnail
  const getFilePreview = (file: File) => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return null;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

      let tripBitId: string;

      if (isEditMode && tripBit) {
        // UPDATE existing trip bit
        const { error: updateError } = await supabase
          .from('trip_bits')
          .update({
            category,
            title: title.trim(),
            status: tripBitStatus,
            start_datetime: startDatetime,
            end_datetime: endDatetime,
            url: url.trim() || null,
            notes: notes.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', tripBit.id);

        if (updateError) throw updateError;
        tripBitId = tripBit.id;

        // Delete removed attachments
        if (attachmentsToDelete.length > 0) {
          // Get file paths to delete from storage
          const attachmentsToRemove = existingAttachments.filter(a =>
            attachmentsToDelete.includes(a.id)
          );

          const filePaths = attachmentsToRemove
            .map(a => {
              const url = new URL(a.file_url);
              const pathMatch = url.pathname.match(/\/trip-documents\/(.+)/);
              return pathMatch ? pathMatch[1] : null;
            })
            .filter(Boolean) as string[];

          if (filePaths.length > 0) {
            await supabase.storage.from('trip-documents').remove(filePaths);
          }

          // Delete attachment records
          await supabase
            .from('trip_bit_attachments')
            .delete()
            .in('id', attachmentsToDelete);
        }

        // Update or insert details
        if (Object.keys(details).length > 0) {
          // Try to update existing, if not exists insert
          const { data: existingDetails } = await supabase
            .from('trip_bit_details')
            .select('id')
            .eq('trip_bit_id', tripBit.id)
            .single();

          if (existingDetails) {
            await supabase
              .from('trip_bit_details')
              .update({ details })
              .eq('trip_bit_id', tripBit.id);
          } else {
            await supabase
              .from('trip_bit_details')
              .insert({ trip_bit_id: tripBit.id, details });
          }
        }
      } else {
        // INSERT new trip bit
        const { data: newTripBit, error: insertError } = await supabase
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
        tripBitId = newTripBit.id;

        // Insert category-specific details if any
        if (Object.keys(details).length > 0) {
          const { error: detailsError } = await supabase
            .from('trip_bit_details')
            .insert({
              trip_bit_id: tripBitId,
              details: details,
            });

          if (detailsError) {
            console.error('Error saving details:', detailsError);
          }
        }
      }

      // Upload new attachments if any
      if (selectedFiles.length > 0) {
        setIsUploading(true);
        await uploadFiles(tripBitId);
        setIsUploading(false);
      }

      resetForm();
      onSuccess();
    } catch (err) {
      console.error('Error saving trip bit:', err);
      setError(isEditMode ? 'Failed to update item. Please try again.' : 'Failed to add item. Please try again.');
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
          <h2 className="text-lg font-semibold text-seeya-text">
            {isEditMode ? 'Edit Trip Bit' : 'Add to Trip Pack'}
          </h2>
          <div className="flex items-center gap-2">
            {isEditMode && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-500"
                title="Delete"
              >
                <Trash2 size={20} />
              </button>
            )}
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-seeya-text-secondary" />
            </button>
          </div>
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

          {/* 8. Attachments */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-seeya-text flex items-center gap-2">
              <Paperclip size={16} />
              Attachments (optional)
            </label>

            {/* Existing attachments (edit mode) */}
            {isEditMode && existingAttachments.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-seeya-text-secondary">Current attachments:</p>
                {existingAttachments
                  .filter(a => !attachmentsToDelete.includes(a.id))
                  .map((attachment) => {
                    const isImage = attachment.file_type?.startsWith('image/');
                    return (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg"
                      >
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {isImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={attachment.file_url}
                              alt={attachment.file_name || 'Attachment'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FileText size={20} className="text-blue-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-seeya-text truncate">
                            {attachment.file_name || 'Attachment'}
                          </p>
                          <p className="text-xs text-seeya-text-secondary">Saved</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveExistingAttachment(attachment.id)}
                          className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} className="text-red-500" />
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* File upload area */}
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-seeya-purple hover:bg-purple-50/30 transition-colors">
              <Upload size={24} className="text-seeya-text-secondary mb-2" />
              <span className="text-sm text-seeya-text-secondary">Click to upload files</span>
              <span className="text-xs text-gray-400 mt-1">PDFs, images, documents</span>
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt"
              />
            </label>

            {/* New files to upload */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-seeya-text-secondary">New files to upload:</p>
                {selectedFiles.map((file, index) => {
                  const imagePreview = getFilePreview(file);
                  return (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {imagePreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imagePreview}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FileText size={20} className="text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-seeya-text truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-seeya-text-secondary">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} className="text-seeya-text-secondary" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
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
              disabled={isSubmitting || isDeleting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="purple"
              disabled={!title.trim()}
              isLoading={isSubmitting || isUploading}
              className="flex-1"
            >
              {isUploading ? 'Uploading...' : isEditMode ? 'Save Changes' : 'Add'}
            </Button>
          </div>
        </form>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-6 z-20">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
              <h3 className="text-lg font-semibold text-seeya-text mb-2">
                Delete this item?
              </h3>
              <p className="text-seeya-text-secondary text-sm mb-6">
                This will permanently delete &ldquo;{tripBit?.title}&rdquo; and all its attachments. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleDelete}
                  isLoading={isDeleting}
                  className="flex-1 !bg-red-500 hover:!bg-red-600"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

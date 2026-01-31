'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils/cn';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Input, Button } from '@/components/ui';
import {
  X,
  Sparkles,
  Upload,
  FileText,
  Image as ImageIcon,
  Plane,
  Hotel,
  Car,
  Ticket,
  Bus,
  DollarSign,
  CalendarCheck,
  MoreHorizontal,
  Check,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Calendar,
} from 'lucide-react';
import type { TripBitCategory, TripParticipant } from '@/types/database';

interface AIQuickAddSheetProps {
  tripId: string;
  participants: TripParticipant[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type InputMode = 'upload' | 'text';

interface ParsedResult {
  category: string;
  title: string;
  startDatetime: string | null;
  endDatetime: string | null;
  confidence: number;
  details: Record<string, string | number | boolean>;
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
  { id: 'photos', label: 'Photos', icon: ImageIcon, color: 'bg-indigo-100 text-indigo-600' },
  { id: 'other', label: 'Other', icon: MoreHorizontal, color: 'bg-gray-100 text-gray-600' },
];

export function AIQuickAddSheet({
  tripId,
  participants,
  isOpen,
  onClose,
  onSuccess,
}: AIQuickAddSheetProps) {
  const { user } = useAuthStore();

  // Input state
  const [inputMode, setInputMode] = useState<InputMode>('upload');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState('');

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<ParsedResult | null>(null);

  // Editable fields (after parsing)
  const [editedCategory, setEditedCategory] = useState<TripBitCategory>('other');
  const [editedTitle, setEditedTitle] = useState('');
  const [editedStartDate, setEditedStartDate] = useState('');
  const [editedStartTime, setEditedStartTime] = useState('');
  const [editedEndDate, setEditedEndDate] = useState('');
  const [editedEndTime, setEditedEndTime] = useState('');
  const [editedDetails, setEditedDetails] = useState<Record<string, string | number | boolean>>({});

  // Save state
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setInputMode('upload');
    setSelectedImage(null);
    setImagePreview(null);
    setPastedText('');
    setIsProcessing(false);
    setError(null);
    setParsedResult(null);
    setEditedCategory('other');
    setEditedTitle('');
    setEditedStartDate('');
    setEditedStartTime('');
    setEditedEndDate('');
    setEditedEndTime('');
    setEditedDetails({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Process input with AI
  const processInput = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      let requestBody: { type: string; content?: string; imageBase64?: string };

      if (inputMode === 'upload' && selectedImage) {
        // Convert image to base64
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(selectedImage);
        });

        requestBody = { type: 'image', imageBase64: base64 };
      } else if (inputMode === 'text' && pastedText.trim()) {
        requestBody = { type: 'text', content: pastedText };
      } else {
        throw new Error('Please provide an image or text to analyze');
      }

      const response = await fetch('/api/ai/parse-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze content');
      }

      const result: ParsedResult = await response.json();
      setParsedResult(result);

      // Populate editable fields
      setEditedCategory(result.category as TripBitCategory || 'other');
      setEditedTitle(result.title || '');

      // Parse dates
      if (result.startDatetime) {
        const start = new Date(result.startDatetime);
        setEditedStartDate(start.toISOString().split('T')[0]);
        setEditedStartTime(start.toTimeString().slice(0, 5));
      }
      if (result.endDatetime) {
        const end = new Date(result.endDatetime);
        setEditedEndDate(end.toISOString().split('T')[0]);
        setEditedEndTime(end.toTimeString().slice(0, 5));
      }

      setEditedDetails(result.details || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze content');
    } finally {
      setIsProcessing(false);
    }
  };

  // Save the trip bit
  const handleSave = async () => {
    if (!user || !editedTitle.trim()) return;

    setIsSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      // Combine date and time
      const startDatetime = editedStartDate && editedStartTime
        ? new Date(`${editedStartDate}T${editedStartTime}`).toISOString()
        : editedStartDate
        ? new Date(`${editedStartDate}T00:00:00`).toISOString()
        : null;

      const endDatetime = editedEndDate && editedEndTime
        ? new Date(`${editedEndDate}T${editedEndTime}`).toISOString()
        : editedEndDate
        ? new Date(`${editedEndDate}T23:59:59`).toISOString()
        : null;

      // Insert trip_bit
      const { data: tripBit, error: insertError } = await supabase
        .from('trip_bits')
        .insert({
          trip_id: tripId,
          created_by: user.id,
          category: editedCategory,
          title: editedTitle.trim(),
          status: 'planned',
          start_datetime: startDatetime,
          end_datetime: endDatetime,
          notes: null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Insert details if any
      if (Object.keys(editedDetails).length > 0) {
        await supabase.from('trip_bit_details').insert({
          trip_bit_id: tripBit.id,
          details: editedDetails,
        });
      }

      // Upload the source image as attachment if we have one
      if (selectedImage && imagePreview) {
        const timestamp = Date.now();
        const sanitizedName = selectedImage.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${tripId}/${tripBit.id}/${timestamp}_${sanitizedName}`;

        // Convert base64 to blob
        const response = await fetch(imagePreview);
        const blob = await response.blob();

        const { error: uploadError } = await supabase.storage
          .from('trip-documents')
          .upload(filePath, blob, {
            cacheControl: '3600',
            upsert: false,
          });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('trip-documents')
            .getPublicUrl(filePath);

          await supabase.from('trip_bit_attachments').insert({
            trip_bit_id: tripBit.id,
            file_url: urlData.publicUrl,
            file_name: selectedImage.name,
            file_type: selectedImage.type,
          });
        }
      }

      resetForm();
      onSuccess();
    } catch (err) {
      console.error('Error saving trip bit:', err);
      setError('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const canProcess = inputMode === 'upload' ? !!selectedImage : !!pastedText.trim();

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50';
    if (confidence >= 0.5) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return CheckCircle2;
    if (confidence >= 0.5) return AlertCircle;
    return HelpCircle;
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High Confidence';
    if (confidence >= 0.5) return 'Medium Confidence';
    return 'Low Confidence - Please Review';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Sheet */}
      <div className="relative w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-auto animate-slideUp">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-seeya-purple" />
            <h2 className="text-lg font-semibold text-seeya-text">AI Quick Add</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-seeya-text-secondary" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-seeya-error text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {!parsedResult ? (
            // Input View
            <div className="space-y-6">
              {/* Mode Selector */}
              <div className="flex rounded-lg bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => setInputMode('upload')}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2',
                    inputMode === 'upload'
                      ? 'bg-white shadow text-seeya-purple'
                      : 'text-seeya-text-secondary hover:text-seeya-text'
                  )}
                >
                  <Upload size={16} />
                  Upload
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('text')}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2',
                    inputMode === 'text'
                      ? 'bg-white shadow text-seeya-purple'
                      : 'text-seeya-text-secondary hover:text-seeya-text'
                  )}
                >
                  <FileText size={16} />
                  Paste Text
                </button>
              </div>

              {inputMode === 'upload' ? (
                // Upload Input
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-3">
                      <ImageIcon size={28} className="text-seeya-purple" />
                    </div>
                    <h3 className="font-medium text-seeya-text">Upload Confirmation</h3>
                    <p className="text-sm text-seeya-text-secondary mt-1">
                      Upload a screenshot of your booking confirmation
                    </p>
                  </div>

                  {imagePreview ? (
                    <div className="space-y-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagePreview}
                        alt="Selected"
                        className="w-full max-h-64 object-contain rounded-lg border-2 border-seeya-purple"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedImage(null);
                          setImagePreview(null);
                        }}
                        className="text-sm text-seeya-purple hover:underline"
                      >
                        Choose Different File
                      </button>
                    </div>
                  ) : (
                    <label
                      className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-seeya-purple hover:bg-purple-50/30 transition-colors"
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                    >
                      <Upload size={32} className="text-seeya-text-secondary mb-2" />
                      <span className="text-sm font-medium text-seeya-text">
                        Click or drag to upload
                      </span>
                      <span className="text-xs text-seeya-text-secondary mt-1">
                        PNG, JPG, or PDF
                      </span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              ) : (
                // Text Input
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-3">
                      <FileText size={28} className="text-seeya-purple" />
                    </div>
                    <h3 className="font-medium text-seeya-text">Paste Confirmation Text</h3>
                    <p className="text-sm text-seeya-text-secondary mt-1">
                      Copy and paste text from your booking email
                    </p>
                  </div>

                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Paste your booking confirmation text here..."
                    rows={8}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none transition-all resize-none placeholder:text-gray-400"
                  />

                  {!pastedText && (
                    <p className="text-xs text-seeya-text-secondary text-center">
                      Tip: Select all text in your confirmation email and paste here
                    </p>
                  )}
                </div>
              )}

              {/* Process Button */}
              {canProcess && (
                <Button
                  type="button"
                  variant="purple"
                  onClick={processInput}
                  isLoading={isProcessing}
                  className="w-full"
                >
                  <Sparkles size={18} className="mr-2" />
                  {isProcessing ? 'Analyzing...' : 'Extract Information'}
                </Button>
              )}
            </div>
          ) : (
            // Review View
            <div className="space-y-6">
              {/* Confidence Indicator */}
              {(() => {
                const ConfidenceIcon = getConfidenceIcon(parsedResult.confidence);
                return (
                  <div className={cn('p-4 rounded-lg flex items-start gap-3', getConfidenceColor(parsedResult.confidence))}>
                    <ConfidenceIcon size={20} className="mt-0.5" />
                    <div>
                      <p className="font-medium">{getConfidenceLabel(parsedResult.confidence)}</p>
                      <p className="text-sm opacity-80 mt-0.5">
                        Review the extracted information and make any needed changes
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium text-seeya-text mb-3">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.slice(0, 8).map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = editedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setEditedCategory(cat.id)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all',
                          isSelected
                            ? 'bg-seeya-purple text-white'
                            : 'bg-gray-100 text-seeya-text-secondary hover:bg-gray-200'
                        )}
                      >
                        <Icon size={14} />
                        {cat.label}
                        {isSelected && <Check size={14} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <Input
                label="Title"
                placeholder="Enter title"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                required
              />

              {/* Dates */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-seeya-text flex items-center gap-2">
                  <Calendar size={16} />
                  Dates
                </label>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-seeya-text-secondary w-12">Start</span>
                  <input
                    type="date"
                    value={editedStartDate}
                    onChange={(e) => setEditedStartDate(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none transition-all text-sm"
                  />
                  <input
                    type="time"
                    value={editedStartTime}
                    onChange={(e) => setEditedStartTime(e.target.value)}
                    className="w-28 px-3 py-2 rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none transition-all text-sm"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-seeya-text-secondary w-12">End</span>
                  <input
                    type="date"
                    value={editedEndDate}
                    onChange={(e) => setEditedEndDate(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none transition-all text-sm"
                  />
                  <input
                    type="time"
                    value={editedEndTime}
                    onChange={(e) => setEditedEndTime(e.target.value)}
                    className="w-28 px-3 py-2 rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              {/* Extracted Details (read-only display) */}
              {Object.keys(editedDetails).length > 0 && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-seeya-text">
                    Extracted Details
                  </label>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                    {Object.entries(editedDetails).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-seeya-text-secondary capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <span className="text-seeya-text font-medium">
                          {String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setParsedResult(null);
                    setSelectedImage(null);
                    setImagePreview(null);
                    setPastedText('');
                  }}
                  className="flex-1"
                >
                  Try Again
                </Button>
                <Button
                  type="button"
                  variant="purple"
                  onClick={handleSave}
                  disabled={!editedTitle.trim()}
                  isLoading={isSaving}
                  className="flex-1"
                >
                  Save
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

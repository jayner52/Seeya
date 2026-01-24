import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link as LinkIcon, MapPin, CalendarDays, Users, Clock, Upload, Sparkles, X, Image as ImageIcon, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TripbitCategory, CreateTripbitData, detectCategoryFromUrl, FlightMetadata, AccommodationMetadata, RentalCarMetadata, ReservationMetadata, ActivityMetadata, PhotosMetadata, TripbitAttachment, TransportationMetadata, DocumentMetadata } from '@/hooks/useTripbits';
import { TripLocation } from '@/hooks/useTripLocations';
import { cn, findMatchingLocations, LocationWithDates } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { LocationDisambiguationDialog } from './LocationDisambiguationDialog';
import { categoryConfig, TripbitCategoryType } from '@/lib/tripbitCategoryConfig';
import { PlacesAutocomplete } from './PlacesAutocomplete';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TripbitFileUpload, TripbitAttachment as FileAttachment } from './TripbitFileUpload';

interface TravelerOption {
  id: string;
  user_id: string;
  profile: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface TripbitPrefill {
  category?: TripbitCategory;
  title?: string;
  locationId?: string;
}

interface AddTripbitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: CreateTripbitData) => Promise<boolean>;
  locations?: TripLocation[];
  travelers?: TravelerOption[];
  prefill?: TripbitPrefill;
  tripStartDate?: string | null;
  tripEndDate?: string | null;
  tripId?: string;
  locationParticipants?: Map<string, string[]>;
}

// Build categories from centralized config
const categories = (Object.keys(categoryConfig) as TripbitCategoryType[]).map(key => ({
  value: key as TripbitCategory,
  icon: categoryConfig[key].icon,
  label: categoryConfig[key].label,
  color: categoryConfig[key].colorClass,
}));

// Dynamic title placeholders based on category
const titlePlaceholders: Record<TripbitCategory, string> = {
  flight: "e.g., SFO → NRT Flight",
  accommodation: "e.g., Marriott Tokyo",
  rental_car: "e.g., Hertz Sedan - LAX",
  activity: "e.g., Tokyo Tower Tour",
  transportation: "e.g., Train to Kyoto",
  money: "e.g., Trip Expense Group",
  reservation: "e.g., Dinner at Sukiyabashi Jiro",
  document: "e.g., Travel Insurance PDF",
  photos: "e.g., Trip Photo Album",
  other: "Enter a title",
};

export function AddTripbitDialog({ open, onOpenChange, onAdd, locations = [], travelers = [], prefill, tripStartDate, tripEndDate, tripId, locationParticipants }: AddTripbitDialogProps) {
  const [category, setCategory] = useState<TripbitCategory>('other');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Disambiguation dialog state
  const [showDisambiguation, setShowDisambiguation] = useState(false);
  const [matchingLocations, setMatchingLocations] = useState<LocationWithDates[]>([]);
  const [pendingSubmitData, setPendingSubmitData] = useState<CreateTripbitData | null>(null);

  // Category-specific fields
  const [flightData, setFlightData] = useState<FlightMetadata>({});
  const [accommodationData, setAccommodationData] = useState<AccommodationMetadata>({});
  const [rentalCarData, setRentalCarData] = useState<RentalCarMetadata>({});
  const [reservationData, setReservationData] = useState<ReservationMetadata>({});
  const [activityData, setActivityData] = useState<ActivityMetadata>({});
  const [photosData, setPhotosData] = useState<PhotosMetadata>({});
  const [transportationData, setTransportationData] = useState<TransportationMetadata>({});
  const [documentData, setDocumentData] = useState<DocumentMetadata>({});

  // AI extraction state
  const [uploadedImage, setUploadedImage] = useState<{ file: File; preview: string } | null>(null);
  const [extracting, setExtracting] = useState(false);
  
  // File attachments state
  const [pendingAttachments, setPendingAttachments] = useState<{ file: File; preview?: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Apply prefill and default participants when dialog opens
  useEffect(() => {
    if (open) {
      if (prefill?.category) setCategory(prefill.category);
      if (prefill?.title) setTitle(prefill.title);
      
      // Default participants to everyone on the prefilled location, or all travelers if no location
      if (prefill?.locationId && locationParticipants) {
        const participantIds = locationParticipants.get(prefill.locationId);
        if (participantIds && participantIds.length > 0) {
          setSelectedParticipants(participantIds);
        } else {
          // Fallback to all travelers
          setSelectedParticipants(travelers.map(t => t.user_id));
        }
      } else {
        // Default to all travelers if no specific location
        setSelectedParticipants(travelers.map(t => t.user_id));
      }
    }
  }, [open, prefill, locationParticipants, travelers]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setCategory('other');
      setTitle('');
      setUrl('');
      setDescription('');
      setStartDate(undefined);
      setEndDate(undefined);
      setSelectedParticipants([]);
      setFlightData({});
      setAccommodationData({});
      setRentalCarData({});
      setReservationData({});
      setActivityData({});
      setPhotosData({});
      setTransportationData({});
      setDocumentData({});
      setShowDisambiguation(false);
      setMatchingLocations([]);
      setPendingSubmitData(null);
      setUploadedImage(null);
      setExtracting(false);
      setIsDragging(false);
      // Clean up pending attachments
      pendingAttachments.forEach(p => {
        if (p.preview) URL.revokeObjectURL(p.preview);
      });
      setPendingAttachments([]);
    }
  }, [open]);

  // Auto-detect category when URL changes
  useEffect(() => {
    if (url) {
      try {
        const detected = detectCategoryFromUrl(url);
        if (detected) {
          setCategory(detected);
        }
      } catch {
        // Invalid URL, ignore
      }
    }
  }, [url]);

  // File handling for AI extraction
  const handleFileSelect = useCallback((file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
    if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.heic')) {
      toast.error('Please upload an image (JPEG, PNG, WebP, HEIC) or PDF');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10MB');
      return;
    }
    const preview = URL.createObjectURL(file);
    setUploadedImage({ file, preview });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const extractWithAI = async () => {
    if (!uploadedImage) return;
    
    setExtracting(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix to get just the base64
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(uploadedImage.file);
      const imageBase64 = await base64Promise;

      const { data, error } = await supabase.functions.invoke('extract-tripbit-details', {
        body: { 
          imageBase64,
          mimeType: uploadedImage.file.type || 'image/jpeg'
        }
      });

      if (error) throw error;
      
      const extracted = data?.extracted;
      if (!extracted) {
        toast.error('Could not extract details from image');
        return;
      }

      // Apply extracted data to form
      if (extracted.category) setCategory(extracted.category);
      if (extracted.title) setTitle(extracted.title);
      if (extracted.description) setDescription(extracted.description);
      if (extracted.startDate) {
        try { setStartDate(parseISO(extracted.startDate)); } catch {}
      }
      if (extracted.endDate) {
        try { setEndDate(parseISO(extracted.endDate)); } catch {}
      }

      // Apply category-specific metadata
      const meta = extracted.metadata || {};
      switch (extracted.category) {
        case 'flight':
          setFlightData({
            airline: meta.airline,
            flightNumber: meta.flightNumber,
            departureAirport: meta.departureAirport,
            arrivalAirport: meta.arrivalAirport,
            departureTime: meta.departureTime,
            arrivalTime: meta.arrivalTime,
            confirmationNumber: meta.confirmationNumber,
          });
          break;
        case 'accommodation':
          setAccommodationData({
            checkInTime: meta.checkInTime,
            checkOutTime: meta.checkOutTime,
            confirmationNumber: meta.confirmationNumber,
            address: meta.address,
          });
          break;
        case 'rental_car':
          setRentalCarData({
            company: meta.company,
            pickupLocation: meta.pickupLocation,
            dropoffLocation: meta.dropoffLocation,
            pickupTime: meta.pickupTime,
            dropoffTime: meta.dropoffTime,
            confirmationNumber: meta.confirmationNumber,
          });
          break;
        case 'reservation':
          setReservationData({
            venue: meta.venue,
            time: meta.time,
            partySize: meta.partySize,
            confirmationNumber: meta.confirmationNumber,
            address: meta.address,
          });
          break;
        case 'activity':
          setActivityData({
            time: meta.startTime || meta.time,
            duration: meta.duration,
            confirmationNumber: meta.confirmationNumber,
            address: meta.address,
            meetingPoint: meta.meetingPoint,
          });
          break;
      }

      toast.success('Details extracted successfully!');
    } catch (err) {
      console.error('AI extraction error:', err);
      toast.error('Failed to extract details. Please try again or fill in manually.');
    } finally {
      setExtracting(false);
    }
  };

  const clearUploadedImage = () => {
    if (uploadedImage?.preview) {
      URL.revokeObjectURL(uploadedImage.preview);
    }
    setUploadedImage(null);
  };

  const tripCalendar = useMemo(() => {
    const parseDate = (d: string | null | undefined) => {
      if (!d) return undefined;
      try {
        return parseISO(d);
      } catch {
        return undefined;
      }
    };

    const fromPropsStart = parseDate(tripStartDate);
    const fromPropsEnd = parseDate(tripEndDate);

    const datedLocations = locations
      .filter(l => !!l.start_date && !!l.end_date)
      .map(l => ({
        id: l.id,
        order: (l as any).order_index ?? 0,
        start: parseISO(l.start_date as string),
        end: parseISO(l.end_date as string),
      }))
      .sort((a, b) => a.order - b.order || a.start.getTime() - b.start.getTime());

    const inferredStart = fromPropsStart || datedLocations[0]?.start;
    const inferredEnd = fromPropsEnd || datedLocations[datedLocations.length - 1]?.end;

    const legStarts = datedLocations.map(l => l.start);
    const legEnds = datedLocations.map(l => l.end);

    const modifiers: Record<string, any> = {};
    const modifiersClassNames: Record<string, string> = {};

    if (inferredStart && inferredEnd) {
      modifiers.trip = { from: inferredStart, to: inferredEnd };
      modifiersClassNames.trip = "bg-primary/10 text-foreground";
    }

    // Leg boundaries (visual breaks)
    if (legStarts.length > 0) {
      modifiers.legStart = legStarts;
      modifiersClassNames.legStart = "ring-2 ring-primary/30";
    }
    if (legEnds.length > 0) {
      modifiers.legEnd = legEnds;
      modifiersClassNames.legEnd = "ring-2 ring-primary/30";
    }

    return {
      defaultMonth: inferredStart,
      modifiers,
      modifiersClassNames,
    };
  }, [locations, tripStartDate, tripEndDate]);

  const getMetadata = () => {
    switch (category) {
      case 'flight':
        return Object.keys(flightData).length > 0 ? flightData : undefined;
      case 'accommodation':
        return Object.keys(accommodationData).length > 0 ? accommodationData : undefined;
      case 'rental_car':
        return Object.keys(rentalCarData).length > 0 ? rentalCarData : undefined;
      case 'reservation':
        return Object.keys(reservationData).length > 0 ? reservationData : undefined;
      case 'activity':
        return Object.keys(activityData).length > 0 ? activityData : undefined;
      case 'photos':
        return Object.keys(photosData).length > 0 ? photosData : undefined;
      case 'transportation':
        return Object.keys(transportationData).length > 0 ? transportationData : undefined;
      case 'document':
        return Object.keys(documentData).length > 0 ? documentData : undefined;
      default:
        return undefined;
    }
  };

  const submitTripbit = async (data: CreateTripbitData) => {
    setLoading(true);
    const success = await onAdd(data);
    setLoading(false);
    if (success) {
      onOpenChange(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const baseData: CreateTripbitData = {
      category,
      title: title.trim(),
      description: description.trim() || undefined,
      url: url.trim() || undefined,
      startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
      endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
      participantIds: selectedParticipants.length > 0 ? selectedParticipants : undefined,
      metadata: getMetadata(),
    };

    // Auto-link based on dates
    const matches = findMatchingLocations(startDate, endDate, locations);
    
    if (matches.length === 0) {
      // No date or no matching locations - entire trip
      await submitTripbit({ ...baseData, locationId: undefined });
    } else if (matches.length === 1) {
      // Exactly one match - auto-assign
      await submitTripbit({ ...baseData, locationId: matches[0].id });
    } else {
      // Multiple matches - ask user
      setMatchingLocations(matches);
      setPendingSubmitData(baseData);
      setShowDisambiguation(true);
    }
  };

  const handleDisambiguationSelect = async (locationId: string | null) => {
    if (pendingSubmitData) {
      await submitTripbit({ ...pendingSubmitData, locationId: locationId || undefined });
    }
  };

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getInitials = (name: string | null | undefined, username: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return username.slice(0, 2).toUpperCase();
  };

  const renderCategoryFields = () => {
    switch (category) {
      case 'flight':
        return (
          <div className="space-y-3 p-3 rounded-lg bg-muted/50">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Flight Details</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="airline" className="text-xs">Airline</Label>
                <Input
                  id="airline"
                  placeholder="e.g., United"
                  value={flightData.airline || ''}
                  onChange={(e) => setFlightData(prev => ({ ...prev, airline: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="flightNumber" className="text-xs">Flight #</Label>
                <Input
                  id="flightNumber"
                  placeholder="e.g., UA 123"
                  value={flightData.flightNumber || ''}
                  onChange={(e) => setFlightData(prev => ({ ...prev, flightNumber: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="departureAirport" className="text-xs">From</Label>
                <Input
                  id="departureAirport"
                  placeholder="e.g., SFO"
                  value={flightData.departureAirport || ''}
                  onChange={(e) => setFlightData(prev => ({ ...prev, departureAirport: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="arrivalAirport" className="text-xs">To</Label>
                <Input
                  id="arrivalAirport"
                  placeholder="e.g., NRT"
                  value={flightData.arrivalAirport || ''}
                  onChange={(e) => setFlightData(prev => ({ ...prev, arrivalAirport: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="departureTime" className="text-xs">Departure Time</Label>
                <Input
                  id="departureTime"
                  type="time"
                  value={flightData.departureTime || ''}
                  onChange={(e) => setFlightData(prev => ({ ...prev, departureTime: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="arrivalTime" className="text-xs">Arrival Time</Label>
                <Input
                  id="arrivalTime"
                  type="time"
                  value={flightData.arrivalTime || ''}
                  onChange={(e) => setFlightData(prev => ({ ...prev, arrivalTime: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="flightConfirmation" className="text-xs">Confirmation #</Label>
              <Input
                id="flightConfirmation"
                placeholder="e.g., ABC123"
                value={flightData.confirmationNumber || ''}
                onChange={(e) => setFlightData(prev => ({ ...prev, confirmationNumber: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
          </div>
        );

      case 'accommodation':
        return (
          <div className="space-y-3 p-3 rounded-lg bg-muted/50">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Stay Details</div>
            <div className="space-y-1">
              <Label htmlFor="searchStay" className="text-xs">Search Hotel/Stay</Label>
              <PlacesAutocomplete
                id="searchStay"
                value={title}
                onChange={setTitle}
                onPlaceSelect={(place) => {
                  setTitle(place.name);
                  setAccommodationData(prev => ({ 
                    ...prev, 
                    address: place.formatted_address 
                  }));
                }}
                placeholder="Search for hotel, Airbnb, etc."
                className="h-8 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="checkInTime" className="text-xs">Check-in Time</Label>
                <Input
                  id="checkInTime"
                  type="time"
                  value={accommodationData.checkInTime || ''}
                  onChange={(e) => setAccommodationData(prev => ({ ...prev, checkInTime: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="checkOutTime" className="text-xs">Check-out Time</Label>
                <Input
                  id="checkOutTime"
                  type="time"
                  value={accommodationData.checkOutTime || ''}
                  onChange={(e) => setAccommodationData(prev => ({ ...prev, checkOutTime: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="accommodationConfirmation" className="text-xs">Confirmation #</Label>
              <Input
                id="accommodationConfirmation"
                placeholder="e.g., ABC123"
                value={accommodationData.confirmationNumber || ''}
                onChange={(e) => setAccommodationData(prev => ({ ...prev, confirmationNumber: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="address" className="text-xs">Address</Label>
              <Input
                id="address"
                placeholder="Full address"
                value={accommodationData.address || ''}
                onChange={(e) => setAccommodationData(prev => ({ ...prev, address: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
          </div>
        );

      case 'rental_car':
        return (
          <div className="space-y-3 p-3 rounded-lg bg-muted/50">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Car Rental Details</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="company" className="text-xs">Company</Label>
                <Input
                  id="company"
                  placeholder="e.g., Hertz"
                  value={rentalCarData.company || ''}
                  onChange={(e) => setRentalCarData(prev => ({ ...prev, company: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="carConfirmation" className="text-xs">Confirmation #</Label>
                <Input
                  id="carConfirmation"
                  placeholder="e.g., ABC123"
                  value={rentalCarData.confirmationNumber || ''}
                  onChange={(e) => setRentalCarData(prev => ({ ...prev, confirmationNumber: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="pickupLocation" className="text-xs">Pick-up Location</Label>
                <Input
                  id="pickupLocation"
                  placeholder="e.g., SFO Airport"
                  value={rentalCarData.pickupLocation || ''}
                  onChange={(e) => setRentalCarData(prev => ({ ...prev, pickupLocation: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dropoffLocation" className="text-xs">Drop-off Location</Label>
                <Input
                  id="dropoffLocation"
                  placeholder="e.g., LAX Airport"
                  value={rentalCarData.dropoffLocation || ''}
                  onChange={(e) => setRentalCarData(prev => ({ ...prev, dropoffLocation: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="pickupTime" className="text-xs">Pick-up Time</Label>
                <Input
                  id="pickupTime"
                  type="time"
                  value={rentalCarData.pickupTime || ''}
                  onChange={(e) => setRentalCarData(prev => ({ ...prev, pickupTime: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dropoffTime" className="text-xs">Drop-off Time</Label>
                <Input
                  id="dropoffTime"
                  type="time"
                  value={rentalCarData.dropoffTime || ''}
                  onChange={(e) => setRentalCarData(prev => ({ ...prev, dropoffTime: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>
        );

      case 'reservation':
        return (
          <div className="space-y-3 p-3 rounded-lg bg-muted/50">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reservation Details</div>
            <div className="space-y-1">
              <Label htmlFor="venue" className="text-xs">Venue</Label>
              <PlacesAutocomplete
                id="venue"
                value={reservationData.venue || ''}
                onChange={(value) => setReservationData(prev => ({ ...prev, venue: value }))}
                onPlaceSelect={(place) => {
                  setReservationData(prev => ({ 
                    ...prev, 
                    venue: place.name,
                    address: place.formatted_address 
                  }));
                  if (!title.trim()) {
                    setTitle(place.name);
                  }
                }}
                placeholder="Search for a restaurant, bar, etc."
                className="h-8 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="reservationConfirmation" className="text-xs">Confirmation #</Label>
                <Input
                  id="reservationConfirmation"
                  placeholder="e.g., ABC123"
                  value={reservationData.confirmationNumber || ''}
                  onChange={(e) => setReservationData(prev => ({ ...prev, confirmationNumber: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="reservationTime" className="text-xs">Time</Label>
                <Input
                  id="reservationTime"
                  type="time"
                  value={reservationData.time || ''}
                  onChange={(e) => setReservationData(prev => ({ ...prev, time: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="partySize" className="text-xs">Party Size</Label>
                <Input
                  id="partySize"
                  type="number"
                  min={1}
                  placeholder="e.g., 4"
                  value={reservationData.partySize || ''}
                  onChange={(e) => setReservationData(prev => ({ ...prev, partySize: parseInt(e.target.value) || undefined }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="reservationAddress" className="text-xs">Address</Label>
                <Input
                  id="reservationAddress"
                  placeholder="Full address"
                  value={reservationData.address || ''}
                  onChange={(e) => setReservationData(prev => ({ ...prev, address: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>
        );

      case 'activity':
        return (
          <div className="space-y-3 p-3 rounded-lg bg-muted/50">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Activity Details</div>
            <div className="space-y-1">
              <Label htmlFor="searchActivity" className="text-xs">Search Venue/Location</Label>
              <PlacesAutocomplete
                id="searchActivity"
                value={title}
                onChange={setTitle}
                onPlaceSelect={(place) => {
                  setTitle(place.name);
                  setActivityData(prev => ({ 
                    ...prev, 
                    address: place.formatted_address 
                  }));
                }}
                placeholder="Search for museum, tour, attraction, etc."
                className="h-8 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="activityTime" className="text-xs">Time</Label>
                <Input
                  id="activityTime"
                  type="time"
                  value={activityData.time || ''}
                  onChange={(e) => setActivityData(prev => ({ ...prev, time: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="duration" className="text-xs">Duration</Label>
                <Input
                  id="duration"
                  placeholder="e.g., 2 hours"
                  value={activityData.duration || ''}
                  onChange={(e) => setActivityData(prev => ({ ...prev, duration: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="activityConfirmation" className="text-xs">Confirmation #</Label>
              <Input
                id="activityConfirmation"
                placeholder="e.g., ABC123"
                value={activityData.confirmationNumber || ''}
                onChange={(e) => setActivityData(prev => ({ ...prev, confirmationNumber: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="meetingPoint" className="text-xs">Meeting Point (optional)</Label>
              <Input
                id="meetingPoint"
                placeholder="Specific meeting instructions"
                value={activityData.meetingPoint || ''}
                onChange={(e) => setActivityData(prev => ({ ...prev, meetingPoint: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="activityAddress" className="text-xs">Address</Label>
              <Input
                id="activityAddress"
                placeholder="Full address"
                value={activityData.address || ''}
                onChange={(e) => setActivityData(prev => ({ ...prev, address: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
          </div>
        );

      case 'photos':
        return (
          <div className="space-y-3 p-3 rounded-lg bg-muted/50">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Photo Sharing Details</div>
            <div className="space-y-1">
              <Label htmlFor="photoService" className="text-xs">Service</Label>
              <select
                id="photoService"
                value={photosData.service || ''}
                onChange={(e) => setPhotosData(prev => ({ ...prev, service: e.target.value }))}
                className="w-full h-8 text-sm rounded-md border border-input bg-background px-3 py-1 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select a service...</option>
                <option value="Google Photos">Google Photos</option>
                <option value="Apple Photos">Apple Photos / iCloud</option>
                <option value="Dropbox">Dropbox</option>
                <option value="Amazon Photos">Amazon Photos</option>
                <option value="Flickr">Flickr</option>
                <option value="OneDrive">OneDrive</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="albumName" className="text-xs">Album Name (optional)</Label>
              <Input
                id="albumName"
                placeholder="e.g., Paris Trip 2024"
                value={photosData.albumName || ''}
                onChange={(e) => setPhotosData(prev => ({ ...prev, albumName: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="accessInfo" className="text-xs">Access Notes (optional)</Label>
              <Textarea
                id="accessInfo"
                placeholder="e.g., Added everyone as collaborators, check your email for the invite"
                value={photosData.accessInfo || ''}
                onChange={(e) => setPhotosData(prev => ({ ...prev, accessInfo: e.target.value }))}
                className="text-sm min-h-[60px]"
              />
            </div>
          </div>
        );

      case 'transportation':
        return (
          <div className="space-y-3 p-3 rounded-lg bg-muted/50">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Transport Details</div>
            <div className="space-y-1">
              <Label htmlFor="transportType" className="text-xs">Type</Label>
              <select
                id="transportType"
                value={transportationData.transportType || ''}
                onChange={(e) => setTransportationData(prev => ({ ...prev, transportType: e.target.value as TransportationMetadata['transportType'] }))}
                className="w-full h-8 text-sm rounded-md border border-input bg-background px-3 py-1 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select type...</option>
                <option value="train">🚆 Train</option>
                <option value="bus">🚌 Bus</option>
                <option value="ferry">⛴️ Ferry</option>
                <option value="shuttle">🚐 Shuttle</option>
                <option value="metro">🚇 Metro / Subway</option>
                <option value="taxi">🚕 Taxi</option>
                <option value="rideshare">🚗 Uber / Lyft</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="transportFrom" className="text-xs">From</Label>
                <Input
                  id="transportFrom"
                  placeholder="e.g., Tokyo Station"
                  value={transportationData.departureLocation || ''}
                  onChange={(e) => setTransportationData(prev => ({ ...prev, departureLocation: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="transportTo" className="text-xs">To</Label>
                <Input
                  id="transportTo"
                  placeholder="e.g., Kyoto Station"
                  value={transportationData.arrivalLocation || ''}
                  onChange={(e) => setTransportationData(prev => ({ ...prev, arrivalLocation: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="transportDepartureTime" className="text-xs">Departure Time</Label>
                <Input
                  id="transportDepartureTime"
                  type="time"
                  value={transportationData.departureTime || ''}
                  onChange={(e) => setTransportationData(prev => ({ ...prev, departureTime: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="transportArrivalTime" className="text-xs">Arrival Time</Label>
                <Input
                  id="transportArrivalTime"
                  type="time"
                  value={transportationData.arrivalTime || ''}
                  onChange={(e) => setTransportationData(prev => ({ ...prev, arrivalTime: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="transportCompany" className="text-xs">Company (optional)</Label>
                <Input
                  id="transportCompany"
                  placeholder="e.g., Amtrak, JR Pass"
                  value={transportationData.company || ''}
                  onChange={(e) => setTransportationData(prev => ({ ...prev, company: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="transportConfirmation" className="text-xs">Confirmation #</Label>
                <Input
                  id="transportConfirmation"
                  placeholder="e.g., ABC123"
                  value={transportationData.confirmationNumber || ''}
                  onChange={(e) => setTransportationData(prev => ({ ...prev, confirmationNumber: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>
        );

      case 'document':
        return (
          <div className="space-y-3 p-3 rounded-lg bg-muted/50">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Document Details</div>
            <div className="space-y-1">
              <Label htmlFor="documentType" className="text-xs">Document Type</Label>
              <select
                id="documentType"
                value={documentData.documentType || ''}
                onChange={(e) => setDocumentData(prev => ({ ...prev, documentType: e.target.value as DocumentMetadata['documentType'] }))}
                className="w-full h-8 text-sm rounded-md border border-input bg-background px-3 py-1 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select type...</option>
                <option value="passport">🛂 Passport</option>
                <option value="visa">📋 Visa</option>
                <option value="insurance">🏥 Travel Insurance</option>
                <option value="itinerary">📅 Itinerary</option>
                <option value="tickets">🎫 Tickets</option>
                <option value="id">🪪 ID / License</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="documentNumber" className="text-xs">Document # (optional)</Label>
                <Input
                  id="documentNumber"
                  placeholder="e.g., Policy number"
                  value={documentData.documentNumber || ''}
                  onChange={(e) => setDocumentData(prev => ({ ...prev, documentNumber: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="expirationDate" className="text-xs">Expiration (optional)</Label>
                <Input
                  id="expirationDate"
                  type="date"
                  value={documentData.expirationDate || ''}
                  onChange={(e) => setDocumentData(prev => ({ ...prev, expirationDate: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Tripbit</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* AI Image Upload Zone */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Quick Add with AI
            </Label>
            
            {!uploadedImage ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={cn(
                  "relative border-2 border-dashed rounded-lg p-4 transition-all cursor-pointer",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
                )}
              >
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,.heic,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="p-2 rounded-full bg-muted">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Drop a booking screenshot</p>
                    <p className="text-xs text-muted-foreground">
                      or click to upload • AI will extract the details
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
                <div className="relative h-16 w-16 flex-shrink-0 rounded-md overflow-hidden bg-muted">
                  {uploadedImage.file.type.startsWith('image/') ? (
                    <img 
                      src={uploadedImage.preview} 
                      alt="Upload preview" 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{uploadedImage.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(uploadedImage.file.size / 1024).toFixed(0)} KB
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={extractWithAI}
                      disabled={extracting}
                      className="h-7 text-xs"
                    >
                      {extracting ? (
                        <>
                          <span className="animate-spin mr-1">⟳</span>
                          Extracting...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3 mr-1" />
                          Extract with AI
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={clearUploadedImage}
                      className="h-7 text-xs"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or fill manually</span>
            </div>
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <Label>Category</Label>
            <div className="grid grid-cols-5 gap-2">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all",
                      category === cat.value
                        ? "border-foreground bg-muted"
                        : "border-transparent bg-muted/50 hover:bg-muted"
                    )}
                  >
                    <div className={cn("p-1.5 rounded-md", cat.color)}>
                      <Icon className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="text-[10px] font-medium">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Money category hint */}
          {category === 'money' && (
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-1">
                💰 Track shared expenses
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-500">
                Link your Venmo or Splitwise group so everyone can add their expenses there. This keeps all trip costs organized in one place!
              </p>
            </div>
          )}

          {/* URL Input */}
          <div className="space-y-2">
            <Label htmlFor="url">
              {category === 'money' ? 'Venmo/Splitwise Link' : 'Link (optional)'}
            </Label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="url"
                type="url"
                placeholder={category === 'money' ? 'https://venmo.com/... or https://splitwise.com/...' : 'https://...'}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {category === 'money' 
                ? 'Everyone can click this to add their expenses'
                : 'Paste a link and we\'ll auto-detect the category'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder={titlePlaceholders[category]}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Category-specific fields */}
          {renderCategoryFields()}

          {/* Date Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Dates (optional)
            </Label>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    {startDate ? format(startDate, 'MMM d, yyyy') : 'Start date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover border border-border shadow-md z-50" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    defaultMonth={tripCalendar.defaultMonth}
                    modifiers={tripCalendar.modifiers}
                    modifiersClassNames={tripCalendar.modifiersClassNames}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">→</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    {endDate ? format(endDate, 'MMM d, yyyy') : 'End date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover border border-border shadow-md z-50" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    defaultMonth={tripCalendar.defaultMonth}
                    modifiers={tripCalendar.modifiers}
                    modifiersClassNames={tripCalendar.modifiersClassNames}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Participant Selection */}
          {travelers.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Who's involved? (optional)
              </Label>
              <div className="flex flex-wrap gap-2">
                {travelers.map((traveler) => {
                  if (!traveler.profile) return null;
                  const isSelected = selectedParticipants.includes(traveler.user_id);
                  return (
                    <button
                      key={traveler.user_id}
                      type="button"
                      onClick={() => toggleParticipant(traveler.user_id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all",
                        isSelected
                          ? "border-foreground bg-muted"
                          : "border-border hover:border-foreground/50"
                      )}
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={traveler.profile.avatar_url || undefined} />
                        <AvatarFallback className="text-[8px]">
                          {getInitials(traveler.profile.full_name, traveler.profile.username)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">
                        {traveler.profile.full_name?.split(' ')[0] || traveler.profile.username}
                      </span>
                      {isSelected && (
                        <span className="text-xs">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* File Attachments */}
          {tripId && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Attachments (optional)
              </Label>
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer",
                  "border-border hover:border-primary/50"
                )}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.multiple = true;
                  input.accept = 'image/*,.pdf,.doc,.docx';
                  input.onchange = (e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if (files) {
                      const newFiles = Array.from(files).map(file => ({
                        file,
                        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
                      }));
                      setPendingAttachments(prev => [...prev, ...newFiles].slice(0, 10));
                    }
                  };
                  input.click();
                }}
              >
                <div className="flex flex-col items-center gap-2 py-1">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    Click to attach files (images, PDFs, documents)
                  </p>
                </div>
              </div>
              {pendingAttachments.length > 0 && (
                <div className="space-y-1.5">
                  {pendingAttachments.map((pa, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-sm">
                      {pa.preview ? (
                        <img src={pa.preview} alt="" className="h-8 w-8 rounded object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <span className="flex-1 truncate">{pa.file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (pa.preview) URL.revokeObjectURL(pa.preview);
                          setPendingAttachments(prev => prev.filter((_, i) => i !== idx));
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Description Input */}
          <div className="space-y-2">
            <Label htmlFor="description">Notes (optional)</Label>
            <Textarea
              id="description"
              placeholder="Add any additional details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || loading}>
              {loading ? 'Adding...' : 'Add Tripbit'}
            </Button>
          </div>
        </form>
      </DialogContent>

      <LocationDisambiguationDialog
        open={showDisambiguation}
        onOpenChange={setShowDisambiguation}
        locations={matchingLocations}
        onSelect={handleDisambiguationSelect}
        resourceTitle={title}
      />
    </Dialog>
  );
}

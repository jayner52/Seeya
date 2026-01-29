import { useState, useEffect } from 'react';
import { Link as LinkIcon, MapPin, CalendarDays, Users, Paperclip, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tripbit, TripbitCategory, CreateTripbitData, FlightMetadata, AccommodationMetadata, RentalCarMetadata, ReservationMetadata, ActivityMetadata, PhotosMetadata, TripbitAttachment, TransportationMetadata, DocumentMetadata } from '@/hooks/useTripbits';
import { TripLocation } from '@/hooks/useTripLocations';
import { cn, findMatchingLocations, LocationWithDates } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { LocationDisambiguationDialog } from './LocationDisambiguationDialog';
import { categoryConfig, TripbitCategoryType } from '@/lib/tripbitCategoryConfig';
import { PlacesAutocomplete } from './PlacesAutocomplete';
import { TripbitFileUpload } from './TripbitFileUpload';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

interface EditTripbitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripbit: Tripbit | null;
  onUpdate: (tripbitId: string, data: Partial<CreateTripbitData>) => Promise<boolean>;
  locations?: TripLocation[];
  travelers?: TravelerOption[];
  tripId?: string;
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

export function EditTripbitDialog({ open, onOpenChange, tripbit, onUpdate, locations = [], travelers = [], tripId }: EditTripbitDialogProps) {
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
  const [pendingSubmitData, setPendingSubmitData] = useState<Partial<CreateTripbitData> | null>(null);

  // Category-specific fields
  const [flightData, setFlightData] = useState<FlightMetadata>({});
  const [accommodationData, setAccommodationData] = useState<AccommodationMetadata>({});
  const [rentalCarData, setRentalCarData] = useState<RentalCarMetadata>({});
  const [reservationData, setReservationData] = useState<ReservationMetadata>({});
  const [activityData, setActivityData] = useState<ActivityMetadata>({});
  const [photosData, setPhotosData] = useState<PhotosMetadata>({});
  const [transportationData, setTransportationData] = useState<TransportationMetadata>({});
  const [documentData, setDocumentData] = useState<DocumentMetadata>({});
  const [attachments, setAttachments] = useState<TripbitAttachment[]>([]);

  // Populate form when tripbit changes
  useEffect(() => {
    if (tripbit && open) {
      setCategory(tripbit.category);
      setTitle(tripbit.title);
      setUrl(tripbit.url || '');
      setDescription(tripbit.description || '');
      setStartDate(tripbit.start_date ? parseISO(tripbit.start_date) : undefined);
      setEndDate(tripbit.end_date ? parseISO(tripbit.end_date) : undefined);
      setSelectedParticipants(tripbit.participants?.map(p => p.user_id) || []);
      
      // Load existing attachments
      const metadata = tripbit.metadata as Record<string, unknown> || {};
      setAttachments((metadata.attachments as TripbitAttachment[]) || []);
      switch (tripbit.category) {
        case 'flight':
          setFlightData(metadata as FlightMetadata);
          break;
        case 'accommodation':
          setAccommodationData(metadata as AccommodationMetadata);
          break;
        case 'rental_car':
          setRentalCarData(metadata as RentalCarMetadata);
          break;
        case 'reservation':
          setReservationData(metadata as ReservationMetadata);
          break;
        case 'activity':
          setActivityData(metadata as ActivityMetadata);
          break;
        case 'photos':
          setPhotosData(metadata as PhotosMetadata);
          break;
        case 'transportation':
          setTransportationData(metadata as TransportationMetadata);
          break;
        case 'document':
          setDocumentData(metadata as DocumentMetadata);
          break;
      }
    }
  }, [tripbit, open]);

  const getMetadata = () => {
    let baseMetadata: Record<string, unknown> = {};
    
    switch (category) {
      case 'flight':
        baseMetadata = Object.keys(flightData).length > 0 ? { ...flightData } : {};
        break;
      case 'accommodation':
        baseMetadata = Object.keys(accommodationData).length > 0 ? { ...accommodationData } : {};
        break;
      case 'rental_car':
        baseMetadata = Object.keys(rentalCarData).length > 0 ? { ...rentalCarData } : {};
        break;
      case 'reservation':
        baseMetadata = Object.keys(reservationData).length > 0 ? { ...reservationData } : {};
        break;
      case 'activity':
        baseMetadata = Object.keys(activityData).length > 0 ? { ...activityData } : {};
        break;
      case 'photos':
        baseMetadata = Object.keys(photosData).length > 0 ? { ...photosData } : {};
        break;
      case 'transportation':
        baseMetadata = Object.keys(transportationData).length > 0 ? { ...transportationData } : {};
        break;
      case 'document':
        baseMetadata = Object.keys(documentData).length > 0 ? { ...documentData } : {};
        break;
    }
    
    // Always include attachments in metadata
    if (attachments.length > 0) {
      baseMetadata.attachments = attachments;
    }
    
    return Object.keys(baseMetadata).length > 0 ? baseMetadata : undefined;
  };

  const submitUpdate = async (data: Partial<CreateTripbitData>) => {
    if (!tripbit) return;
    setLoading(true);
    const success = await onUpdate(tripbit.id, data);
    setLoading(false);
    if (success) {
      onOpenChange(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !tripbit) return;

    const baseData: Partial<CreateTripbitData> = {
      category,
      title: title.trim(),
      description: description.trim() || undefined,
      url: url.trim() || undefined,
      startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
      endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
      participantIds: selectedParticipants,
      metadata: getMetadata(),
    };

    // Auto-link based on dates
    const matches = findMatchingLocations(startDate, endDate, locations);
    
    if (matches.length === 0) {
      await submitUpdate({ ...baseData, locationId: undefined });
    } else if (matches.length === 1) {
      await submitUpdate({ ...baseData, locationId: matches[0].id });
    } else {
      setMatchingLocations(matches);
      setPendingSubmitData(baseData);
      setShowDisambiguation(true);
    }
  };

  const handleDisambiguationSelect = async (locationId: string | null) => {
    if (pendingSubmitData) {
      await submitUpdate({ ...pendingSubmitData, locationId: locationId || undefined });
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
                <Label htmlFor="edit-airline" className="text-xs">Airline</Label>
                <Input
                  id="edit-airline"
                  placeholder="e.g., United"
                  value={flightData.airline || ''}
                  onChange={(e) => setFlightData(prev => ({ ...prev, airline: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-flightNumber" className="text-xs">Flight #</Label>
                <Input
                  id="edit-flightNumber"
                  placeholder="e.g., UA 123"
                  value={flightData.flightNumber || ''}
                  onChange={(e) => setFlightData(prev => ({ ...prev, flightNumber: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit-departureAirport" className="text-xs">From</Label>
                <Input
                  id="edit-departureAirport"
                  placeholder="e.g., SFO"
                  value={flightData.departureAirport || ''}
                  onChange={(e) => setFlightData(prev => ({ ...prev, departureAirport: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-arrivalAirport" className="text-xs">To</Label>
                <Input
                  id="edit-arrivalAirport"
                  placeholder="e.g., NRT"
                  value={flightData.arrivalAirport || ''}
                  onChange={(e) => setFlightData(prev => ({ ...prev, arrivalAirport: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit-departureTime" className="text-xs">Departure Time</Label>
                <Input
                  id="edit-departureTime"
                  type="time"
                  value={flightData.departureTime || ''}
                  onChange={(e) => setFlightData(prev => ({ ...prev, departureTime: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-arrivalTime" className="text-xs">Arrival Time</Label>
                <Input
                  id="edit-arrivalTime"
                  type="time"
                  value={flightData.arrivalTime || ''}
                  onChange={(e) => setFlightData(prev => ({ ...prev, arrivalTime: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-flightConfirmation" className="text-xs">Confirmation #</Label>
              <Input
                id="edit-flightConfirmation"
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
              <Label htmlFor="edit-searchStay" className="text-xs">Search Hotel/Stay</Label>
              <PlacesAutocomplete
                id="edit-searchStay"
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
                <Label htmlFor="edit-checkInTime" className="text-xs">Check-in Time</Label>
                <Input
                  id="edit-checkInTime"
                  type="time"
                  value={accommodationData.checkInTime || ''}
                  onChange={(e) => setAccommodationData(prev => ({ ...prev, checkInTime: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-checkOutTime" className="text-xs">Check-out Time</Label>
                <Input
                  id="edit-checkOutTime"
                  type="time"
                  value={accommodationData.checkOutTime || ''}
                  onChange={(e) => setAccommodationData(prev => ({ ...prev, checkOutTime: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-accommodationConfirmation" className="text-xs">Confirmation #</Label>
              <Input
                id="edit-accommodationConfirmation"
                placeholder="e.g., ABC123"
                value={accommodationData.confirmationNumber || ''}
                onChange={(e) => setAccommodationData(prev => ({ ...prev, confirmationNumber: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-address" className="text-xs">Address</Label>
              <Input
                id="edit-address"
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
                <Label htmlFor="edit-company" className="text-xs">Company</Label>
                <Input
                  id="edit-company"
                  placeholder="e.g., Hertz"
                  value={rentalCarData.company || ''}
                  onChange={(e) => setRentalCarData(prev => ({ ...prev, company: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-carConfirmation" className="text-xs">Confirmation #</Label>
                <Input
                  id="edit-carConfirmation"
                  placeholder="e.g., ABC123"
                  value={rentalCarData.confirmationNumber || ''}
                  onChange={(e) => setRentalCarData(prev => ({ ...prev, confirmationNumber: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit-pickupLocation" className="text-xs">Pick-up Location</Label>
                <Input
                  id="edit-pickupLocation"
                  placeholder="e.g., SFO Airport"
                  value={rentalCarData.pickupLocation || ''}
                  onChange={(e) => setRentalCarData(prev => ({ ...prev, pickupLocation: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-dropoffLocation" className="text-xs">Drop-off Location</Label>
                <Input
                  id="edit-dropoffLocation"
                  placeholder="e.g., LAX Airport"
                  value={rentalCarData.dropoffLocation || ''}
                  onChange={(e) => setRentalCarData(prev => ({ ...prev, dropoffLocation: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit-pickupTime" className="text-xs">Pick-up Time</Label>
                <Input
                  id="edit-pickupTime"
                  type="time"
                  value={rentalCarData.pickupTime || ''}
                  onChange={(e) => setRentalCarData(prev => ({ ...prev, pickupTime: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-dropoffTime" className="text-xs">Drop-off Time</Label>
                <Input
                  id="edit-dropoffTime"
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
              <Label htmlFor="edit-venue" className="text-xs">Venue</Label>
              <PlacesAutocomplete
                id="edit-venue"
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
                <Label htmlFor="edit-reservationConfirmation" className="text-xs">Confirmation #</Label>
                <Input
                  id="edit-reservationConfirmation"
                  placeholder="e.g., ABC123"
                  value={reservationData.confirmationNumber || ''}
                  onChange={(e) => setReservationData(prev => ({ ...prev, confirmationNumber: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-reservationTime" className="text-xs">Time</Label>
                <Input
                  id="edit-reservationTime"
                  type="time"
                  value={reservationData.time || ''}
                  onChange={(e) => setReservationData(prev => ({ ...prev, time: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit-partySize" className="text-xs">Party Size</Label>
                <Input
                  id="edit-partySize"
                  type="number"
                  min={1}
                  placeholder="e.g., 4"
                  value={reservationData.partySize || ''}
                  onChange={(e) => setReservationData(prev => ({ ...prev, partySize: parseInt(e.target.value) || undefined }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-reservationAddress" className="text-xs">Address</Label>
                <Input
                  id="edit-reservationAddress"
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
              <Label htmlFor="edit-searchActivity" className="text-xs">Search Venue/Location</Label>
              <PlacesAutocomplete
                id="edit-searchActivity"
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
                <Label htmlFor="edit-activityTime" className="text-xs">Time</Label>
                <Input
                  id="edit-activityTime"
                  type="time"
                  value={activityData.time || ''}
                  onChange={(e) => setActivityData(prev => ({ ...prev, time: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-duration" className="text-xs">Duration</Label>
                <Input
                  id="edit-duration"
                  placeholder="e.g., 2 hours"
                  value={activityData.duration || ''}
                  onChange={(e) => setActivityData(prev => ({ ...prev, duration: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-activityConfirmation" className="text-xs">Confirmation #</Label>
              <Input
                id="edit-activityConfirmation"
                placeholder="e.g., ABC123"
                value={activityData.confirmationNumber || ''}
                onChange={(e) => setActivityData(prev => ({ ...prev, confirmationNumber: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-meetingPoint" className="text-xs">Meeting Point (optional)</Label>
              <Input
                id="edit-meetingPoint"
                placeholder="Specific meeting instructions"
                value={activityData.meetingPoint || ''}
                onChange={(e) => setActivityData(prev => ({ ...prev, meetingPoint: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-activityAddress" className="text-xs">Address</Label>
              <Input
                id="edit-activityAddress"
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
              <Label htmlFor="edit-photoService" className="text-xs">Service</Label>
              <select
                id="edit-photoService"
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
              <Label htmlFor="edit-albumName" className="text-xs">Album Name (optional)</Label>
              <Input
                id="edit-albumName"
                placeholder="e.g., Paris Trip 2024"
                value={photosData.albumName || ''}
                onChange={(e) => setPhotosData(prev => ({ ...prev, albumName: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-accessInfo" className="text-xs">Access Notes (optional)</Label>
              <Textarea
                id="edit-accessInfo"
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
              <Label htmlFor="edit-transportType" className="text-xs">Type</Label>
              <select
                id="edit-transportType"
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
                <Label htmlFor="edit-transportFrom" className="text-xs">From</Label>
                <Input
                  id="edit-transportFrom"
                  placeholder="e.g., Tokyo Station"
                  value={transportationData.departureLocation || ''}
                  onChange={(e) => setTransportationData(prev => ({ ...prev, departureLocation: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-transportTo" className="text-xs">To</Label>
                <Input
                  id="edit-transportTo"
                  placeholder="e.g., Kyoto Station"
                  value={transportationData.arrivalLocation || ''}
                  onChange={(e) => setTransportationData(prev => ({ ...prev, arrivalLocation: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit-transportDepartureTime" className="text-xs">Departure Time</Label>
                <Input
                  id="edit-transportDepartureTime"
                  type="time"
                  value={transportationData.departureTime || ''}
                  onChange={(e) => setTransportationData(prev => ({ ...prev, departureTime: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-transportArrivalTime" className="text-xs">Arrival Time</Label>
                <Input
                  id="edit-transportArrivalTime"
                  type="time"
                  value={transportationData.arrivalTime || ''}
                  onChange={(e) => setTransportationData(prev => ({ ...prev, arrivalTime: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit-transportCompany" className="text-xs">Company (optional)</Label>
                <Input
                  id="edit-transportCompany"
                  placeholder="e.g., Amtrak, JR Pass"
                  value={transportationData.company || ''}
                  onChange={(e) => setTransportationData(prev => ({ ...prev, company: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-transportConfirmation" className="text-xs">Confirmation #</Label>
                <Input
                  id="edit-transportConfirmation"
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
              <Label htmlFor="edit-documentType" className="text-xs">Document Type</Label>
              <select
                id="edit-documentType"
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
                <Label htmlFor="edit-documentNumber" className="text-xs">Document # (optional)</Label>
                <Input
                  id="edit-documentNumber"
                  placeholder="e.g., Policy number"
                  value={documentData.documentNumber || ''}
                  onChange={(e) => setDocumentData(prev => ({ ...prev, documentNumber: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-expirationDate" className="text-xs">Expiration (optional)</Label>
                <Input
                  id="edit-expirationDate"
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
          <DialogTitle>Edit Tripbit</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          {/* URL Input */}
          <div className="space-y-2">
            <Label htmlFor="edit-url">Link (optional)</Label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="edit-url"
                type="url"
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Title Input */}
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title *</Label>
            <Input
              id="edit-title"
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
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
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
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
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

          {/* Description Input */}
          <div className="space-y-2">
            <Label htmlFor="edit-description">Notes (optional)</Label>
            <Textarea
              id="edit-description"
              placeholder="Add any additional details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* File Attachments */}
          {tripId && tripbit && (
            <TripbitFileUpload
              tripId={tripId}
              tripbitId={tripbit.id}
              attachments={attachments}
              onAttachmentsChange={setAttachments}
            />
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || loading}>
              {loading ? 'Saving...' : 'Save Changes'}
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

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TripProgress } from './TripProgress';
import { MultiLocationStep, WizardLocation, DateMode } from './steps/MultiLocationStep';
import { TripTypeStep } from './steps/TripTypeStep';
import { TripNameStep } from './steps/TripNameStep';
import { InviteStep } from './steps/InviteStep';
import { VisibilityStep } from './steps/VisibilityStep';
import { VisibilityLevel } from '@/lib/types';
import { useTrips, CreateTripData } from '@/hooks/useTrips';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { TripType } from '@/hooks/useTripTypes';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface NewTripWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEPS = ['Where & When', 'Vibe', 'Name', 'Who', 'Privacy'];

export function NewTripWizard({ open, onOpenChange }: NewTripWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { createTrip } = useTrips();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Form state - now supports multiple trip types
  const [locations, setLocations] = useState<WizardLocation[]>([]);
  const [dateMode, setDateMode] = useState<DateMode>('exact');
  const [flexibleMonth, setFlexibleMonth] = useState('');
  const [tripTypeIds, setTripTypeIds] = useState<string[]>([]);
  const [selectedTripTypes, setSelectedTripTypes] = useState<TripType[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<VisibilityLevel>('full_details');
  const [invitees, setInvitees] = useState<string[]>([]);

  const resetForm = () => {
    setCurrentStep(0);
    setLocations([]);
    setDateMode('exact');
    setFlexibleMonth('');
    setTripTypeIds([]);
    setSelectedTripTypes([]);
    setName('');
    setDescription('');
    setVisibility('full_details');
    setInvitees([]);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(resetForm, 300);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Locations with dates
        if (locations.length === 0 || !locations.every(l => l.destination)) return false;
        if (dateMode === 'exact') {
          return locations.every(l => l.startDate && l.endDate);
        }
        if (dateMode === 'flexible') {
          return !!flexibleMonth;
        }
        // TBD mode - just need destinations
        return true;
      case 1: // Trip type - now requires at least one
        return tripTypeIds.length > 0;
      case 2: // Name
        return name.trim().length > 0;
      case 3: // Invite
        return true;
      case 4: // Privacy
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleTripTypeChange = (ids: string[], tripTypes: TripType[]) => {
    setTripTypeIds(ids);
    setSelectedTripTypes(tripTypes);
  };

  const toggleInvitee = (userId: string) => {
    setInvitees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async () => {
    if (locations.length === 0) return;

    setIsSubmitting(true);

    // Primary destination is the first location
    const primaryLocation = locations[0];
    const lastLocation = locations[locations.length - 1];

    // Use the first trip type as the primary (for DB storage)
    const primaryTripTypeId = tripTypeIds[0] || undefined;

    const tripData: CreateTripData = {
      name: name.trim(),
      destination: primaryLocation.destination,
      description: description.trim() || undefined,
      start_date: dateMode !== 'tbd' ? primaryLocation.startDate : undefined,
      end_date: dateMode !== 'tbd' ? lastLocation.endDate : undefined,
      visibility,
      invitees: invitees.length > 0 ? invitees : undefined,
      city_id: primaryLocation.cityId || undefined,
      trip_type_id: primaryTripTypeId,
      is_flexible_dates: dateMode !== 'exact',
      flexible_month: dateMode === 'flexible' ? flexibleMonth : undefined,
    };

    const { data, error } = await createTrip(tripData);

    if (error) {
      setIsSubmitting(false);
      toast({
        title: 'Error',
        description: 'Failed to create trip. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    // Add ALL locations to trip_locations (including the first one)
    if (data && locations.length > 0) {
      const allLocations = locations.map((loc, index) => ({
        trip_id: data.id,
        destination: loc.destination,
        city_id: loc.cityId || null,
        start_date: loc.startDate || null,
        end_date: loc.endDate || null,
        order_index: index,
      }));

      const { data: insertedLocations } = await supabase
        .from('trip_locations')
        .insert(allLocations)
        .select('id');

      // Auto-assign owner and all invitees to all locations
      if (insertedLocations && insertedLocations.length > 0) {
        const locationParticipants: { location_id: string; user_id: string }[] = [];
        
        // Add owner to all locations
        insertedLocations.forEach(loc => {
          locationParticipants.push({
            location_id: loc.id,
            user_id: user!.id,
          });
        });

        // Add all invitees to all locations
        if (invitees.length > 0) {
          invitees.forEach(inviteeId => {
            insertedLocations.forEach(loc => {
              locationParticipants.push({
                location_id: loc.id,
                user_id: inviteeId,
              });
            });
          });
        }

        await supabase.from('location_participants').insert(locationParticipants);
      }
    }

    setIsSubmitting(false);

    toast({
      title: 'Trip created!',
      description: `${name} has been added to your trips.`,
    });

    handleClose();
    
    if (data) {
      navigate(`/trips/${data.id}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-center">
            Plan a New Trip
          </DialogTitle>
        </DialogHeader>

        <TripProgress currentStep={currentStep} totalSteps={STEPS.length} steps={STEPS} />

        <div className="min-h-[350px]">
          {currentStep === 0 && (
            <MultiLocationStep
              locations={locations}
              onLocationsChange={setLocations}
              dateMode={dateMode}
              onDateModeChange={setDateMode}
              flexibleMonth={flexibleMonth}
              onFlexibleMonthChange={setFlexibleMonth}
            />
          )}
          {currentStep === 1 && (
            <TripTypeStep
              tripTypeIds={tripTypeIds}
              onTripTypeChange={handleTripTypeChange}
            />
          )}
          {currentStep === 2 && (
            <TripNameStep
              name={name}
              description={description}
              onNameChange={setName}
              onDescriptionChange={setDescription}
              locations={locations}
              selectedTripTypes={selectedTripTypes}
            />
          )}
          {currentStep === 3 && (
            <InviteStep selectedIds={invitees} onToggle={toggleInvitee} />
          )}
          {currentStep === 4 && (
            <VisibilityStep visibility={visibility} onVisibilityChange={setVisibility} />
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button onClick={handleNext} disabled={!canProceed()} className="gap-2">
              Next
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting || !canProceed()} className="gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Trip'
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

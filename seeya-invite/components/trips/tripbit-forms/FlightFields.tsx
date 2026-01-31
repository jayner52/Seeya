'use client';

import { Input } from '@/components/ui';

interface FlightFieldsProps {
  details: Record<string, string | number>;
  setDetails: (details: Record<string, string | number>) => void;
}

export function FlightFields({ details, setDetails }: FlightFieldsProps) {
  const updateField = (field: string, value: string) => {
    setDetails({ ...details, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Airline"
          placeholder="e.g., United Airlines"
          value={(details.airline as string) || ''}
          onChange={(e) => updateField('airline', e.target.value)}
        />
        <Input
          label="Flight Number"
          placeholder="e.g., UA 123"
          value={(details.flightNumber as string) || ''}
          onChange={(e) => updateField('flightNumber', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Departure Airport"
          placeholder="e.g., LAX"
          value={(details.departureAirport as string) || ''}
          onChange={(e) => updateField('departureAirport', e.target.value)}
        />
        <Input
          label="Arrival Airport"
          placeholder="e.g., JFK"
          value={(details.arrivalAirport as string) || ''}
          onChange={(e) => updateField('arrivalAirport', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Terminal"
          placeholder="e.g., Terminal 4"
          value={(details.terminal as string) || ''}
          onChange={(e) => updateField('terminal', e.target.value)}
        />
        <Input
          label="Gate"
          placeholder="e.g., B22"
          value={(details.gate as string) || ''}
          onChange={(e) => updateField('gate', e.target.value)}
        />
      </div>

      <Input
        label="Confirmation Number"
        placeholder="Booking confirmation"
        value={(details.confirmationNumber as string) || ''}
        onChange={(e) => updateField('confirmationNumber', e.target.value)}
      />

      <Input
        label="Seat Assignments"
        placeholder="e.g., 12A, 12B"
        value={(details.seatAssignments as string) || ''}
        onChange={(e) => updateField('seatAssignments', e.target.value)}
      />
    </div>
  );
}

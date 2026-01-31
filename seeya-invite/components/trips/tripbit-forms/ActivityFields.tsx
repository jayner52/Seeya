'use client';

import { Input } from '@/components/ui';

interface ActivityFieldsProps {
  details: Record<string, string | number>;
  setDetails: (details: Record<string, string | number>) => void;
}

export function ActivityFields({ details, setDetails }: ActivityFieldsProps) {
  const updateField = (field: string, value: string) => {
    setDetails({ ...details, [field]: value });
  };

  return (
    <div className="space-y-4">
      <Input
        label="Venue Name"
        placeholder="e.g., Louvre Museum"
        value={(details.venueName as string) || ''}
        onChange={(e) => updateField('venueName', e.target.value)}
      />

      <Input
        label="Address"
        placeholder="Full address"
        value={(details.address as string) || ''}
        onChange={(e) => updateField('address', e.target.value)}
      />

      <Input
        label="Duration"
        placeholder="e.g., 2 hours"
        value={(details.duration as string) || ''}
        onChange={(e) => updateField('duration', e.target.value)}
      />

      <Input
        label="Meeting Point"
        placeholder="Where to meet"
        value={(details.meetingPoint as string) || ''}
        onChange={(e) => updateField('meetingPoint', e.target.value)}
      />

      <Input
        label="Ticket Type"
        placeholder="e.g., Skip-the-line"
        value={(details.ticketType as string) || ''}
        onChange={(e) => updateField('ticketType', e.target.value)}
      />

      <Input
        label="Confirmation Number"
        placeholder="Booking confirmation"
        value={(details.confirmationNumber as string) || ''}
        onChange={(e) => updateField('confirmationNumber', e.target.value)}
      />
    </div>
  );
}

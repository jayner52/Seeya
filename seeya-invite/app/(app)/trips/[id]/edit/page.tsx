'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui';
import { EditTripForm } from '@/components/trips/EditTripForm';
import { ArrowLeft } from 'lucide-react';

export default function EditTripPage() {
  const params = useParams();
  const tripId = params?.id as string;

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/trips/${tripId}`}
          className="inline-flex items-center gap-2 text-seeya-text-secondary hover:text-seeya-text mb-4 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to Trip</span>
        </Link>
        <h1 className="text-2xl font-display font-semibold text-seeya-text">
          Edit Trip
        </h1>
        <p className="text-seeya-text-secondary mt-1">
          Update your trip details
        </p>
      </div>

      {/* Form Card */}
      <Card variant="elevated" padding="lg" className="max-w-2xl">
        <EditTripForm tripId={tripId} />
      </Card>
    </div>
  );
}

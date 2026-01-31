'use client';

import { useRouter } from 'next/navigation';
import { CreateTripWizard } from '@/components/trips';

export default function NewTripPage() {
  const router = useRouter();

  return (
    <CreateTripWizard
      onClose={() => router.push('/trips')}
      onSuccess={(tripId) => router.push(`/trips/${tripId}`)}
    />
  );
}

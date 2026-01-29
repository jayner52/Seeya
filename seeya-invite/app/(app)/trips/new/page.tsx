'use client';

import Link from 'next/link';
import { Card } from '@/components/ui';
import { CreateTripForm } from '@/components/trips/CreateTripForm';
import { ArrowLeft } from 'lucide-react';

export default function NewTripPage() {
  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/trips"
          className="inline-flex items-center gap-2 text-seeya-text-secondary hover:text-seeya-text mb-4 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to Trips</span>
        </Link>
        <h1 className="text-2xl font-display font-semibold text-seeya-text">
          Create a Trip
        </h1>
        <p className="text-seeya-text-secondary mt-1">
          Plan your next adventure
        </p>
      </div>

      {/* Form Card */}
      <Card variant="elevated" padding="lg" className="max-w-2xl">
        <CreateTripForm />
      </Card>
    </div>
  );
}

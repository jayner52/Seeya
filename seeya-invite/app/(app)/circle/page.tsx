'use client';

import { Card, Button, Avatar } from '@/components/ui';
import { UserPlus, Search, Users } from 'lucide-react';

export default function CirclePage() {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-semibold text-seeya-text">
            Travel Circle
          </h1>
          <p className="text-seeya-text-secondary mt-1">
            Your travel companions
          </p>
        </div>
        <Button variant="purple" leftIcon={<UserPlus size={20} />}>
          Add Friend
        </Button>
      </div>

      {/* Empty State */}
      <Card variant="elevated" padding="lg" className="text-center py-16">
        <div className="w-20 h-20 rounded-full bg-seeya-purple/10 flex items-center justify-center mx-auto mb-4">
          <Users className="text-seeya-purple" size={40} />
        </div>
        <h2 className="text-xl font-semibold text-seeya-text mb-2">
          Build your travel circle
        </h2>
        <p className="text-seeya-text-secondary mb-6 max-w-md mx-auto">
          Add friends to your travel circle to easily invite them to trips and
          see their upcoming adventures.
        </p>
        <Button variant="purple" leftIcon={<UserPlus size={20} />}>
          Find Friends
        </Button>
      </Card>
    </div>
  );
}

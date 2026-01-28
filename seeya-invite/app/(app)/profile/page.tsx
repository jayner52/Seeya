'use client';

import { useAuthStore } from '@/stores/authStore';
import { Card, Button, Avatar, Badge } from '@/components/ui';
import { Edit2, MapPin, Calendar, Globe } from 'lucide-react';

export default function ProfilePage() {
  const { user, profile } = useAuthStore();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Profile Header */}
      <Card variant="elevated" padding="lg" className="mb-6">
        <div className="flex items-start gap-6">
          <Avatar
            name={profile?.full_name || user?.email || 'User'}
            avatarUrl={profile?.avatar_url}
            size="xl"
          />
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-display font-semibold text-seeya-text">
                  {profile?.full_name || 'Traveler'}
                </h1>
                <p className="text-seeya-text-secondary">{user?.email}</p>
              </div>
              <Button variant="outline" size="sm" leftIcon={<Edit2 size={16} />}>
                Edit
              </Button>
            </div>
            {profile?.bio && (
              <p className="mt-4 text-seeya-text">{profile.bio}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card variant="outline" padding="md" className="text-center">
          <p className="text-3xl font-bold text-seeya-purple">0</p>
          <p className="text-sm text-seeya-text-secondary">Trips</p>
        </Card>
        <Card variant="outline" padding="md" className="text-center">
          <p className="text-3xl font-bold text-seeya-purple">0</p>
          <p className="text-sm text-seeya-text-secondary">Countries</p>
        </Card>
        <Card variant="outline" padding="md" className="text-center">
          <p className="text-3xl font-bold text-seeya-purple">0</p>
          <p className="text-sm text-seeya-text-secondary">Friends</p>
        </Card>
      </div>

      {/* Wanderlist */}
      <Card variant="elevated" padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-seeya-text flex items-center gap-2">
            <Globe className="text-seeya-purple" size={20} />
            Wanderlist
          </h2>
          <Button variant="ghost" size="sm">
            View All
          </Button>
        </div>
        <p className="text-seeya-text-secondary text-center py-8">
          Add places you want to visit to your wanderlist
        </p>
      </Card>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Card, Button, Spinner } from '@/components/ui';
import {
  ArrowLeft,
  Shield,
  Bell,
  HelpCircle,
  LogOut,
  Lock,
  EyeOff,
  Calendar,
  MapPin,
  Globe,
  ChevronDown,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { UserSettings, VisibilityLevel } from '@/types/database';
import { VISIBILITY_OPTIONS, DEFAULT_USER_SETTINGS } from '@/types/database';

export default function SettingsPage() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<Partial<UserSettings>>(DEFAULT_USER_SETTINGS);
  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!user) return;

    const supabase = createClient();
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching settings:', error);
    }

    if (data) {
      setSettings(data);
    } else {
      // Create default settings if none exist
      const { data: newSettings, error: insertError } = await supabase
        .from('user_settings')
        .insert({
          user_id: user.id,
          ...DEFAULT_USER_SETTINGS,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating settings:', insertError);
      } else if (newSettings) {
        setSettings(newSettings);
      }
    }

    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSetting = async (key: keyof UserSettings, value: unknown) => {
    if (!user) return;

    setSettings((prev) => ({ ...prev, [key]: value }));
    setIsSaving(true);

    const supabase = createClient();
    const { error } = await supabase
      .from('user_settings')
      .update({ [key]: value, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating setting:', error);
      // Revert on error
      fetchSettings();
    }

    setIsSaving(false);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const getVisibilityIcon = (level: VisibilityLevel) => {
    switch (level) {
      case 'only_me':
        return Lock;
      case 'busy_only':
        return EyeOff;
      case 'dates_only':
        return Calendar;
      case 'location_only':
        return MapPin;
      case 'full_details':
        return Globe;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-seeya-text-secondary hover:text-seeya-text"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </Link>
          <h1 className="text-lg font-semibold text-seeya-text">Settings</h1>
          <div className="w-16" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Privacy & Safety Section */}
        <Card variant="elevated" padding="none" className="overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Shield size={20} className="text-amber-600" />
              </div>
              <div>
                <h2 className="font-semibold text-seeya-text">Privacy & Safety</h2>
                <p className="text-sm text-seeya-text-secondary">
                  Control how your travel information is shared
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {/* Default Trip Visibility */}
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-seeya-text">Default Trip Visibility</p>
                  <p className="text-sm text-seeya-text-secondary">
                    Applied to all new trips you create
                  </p>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setShowVisibilityMenu(!showVisibilityMenu)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    {(() => {
                      const Icon = getVisibilityIcon(
                        settings.default_trip_visibility || 'busy_only'
                      );
                      return <Icon size={16} className="text-seeya-text-secondary" />;
                    })()}
                    <span className="text-sm text-seeya-text">
                      {VISIBILITY_OPTIONS.find(
                        (v) => v.value === settings.default_trip_visibility
                      )?.label || 'Show I\'m busy'}
                    </span>
                    <ChevronDown size={16} className="text-seeya-text-secondary" />
                  </button>

                  {showVisibilityMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowVisibilityMenu(false)}
                      />
                      <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20">
                        {VISIBILITY_OPTIONS.map((option) => {
                          const Icon = getVisibilityIcon(option.value);
                          const isSelected =
                            settings.default_trip_visibility === option.value;
                          return (
                            <button
                              key={option.value}
                              onClick={() => {
                                updateSetting('default_trip_visibility', option.value);
                                setShowVisibilityMenu(false);
                              }}
                              className={cn(
                                'w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors',
                                isSelected && 'bg-purple-50'
                              )}
                            >
                              <Icon
                                size={18}
                                className={cn(
                                  'text-seeya-text-secondary',
                                  isSelected && 'text-seeya-purple'
                                )}
                              />
                              <div className="flex-1 text-left">
                                <p
                                  className={cn(
                                    'text-sm font-medium text-seeya-text',
                                    isSelected && 'text-seeya-purple'
                                  )}
                                >
                                  {option.label}
                                </p>
                                <p className="text-xs text-seeya-text-secondary">
                                  {option.description}
                                </p>
                              </div>
                              {isSelected && (
                                <Check size={18} className="text-seeya-purple" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Delayed Trip Visibility */}
            <SettingsToggle
              title="Delayed Trip Visibility"
              subtitle="Trips only appear to friends after they start"
              checked={settings.delayed_trip_visibility || false}
              onChange={(checked) => updateSetting('delayed_trip_visibility', checked)}
            />

            {/* Calendar Sharing */}
            <SettingsToggle
              title="Calendar Sharing"
              subtitle="Allow friends to see your availability"
              checked={settings.calendar_sharing ?? true}
              onChange={(checked) => updateSetting('calendar_sharing', checked)}
            />
          </div>
        </Card>

        {/* Notifications Section */}
        <Card variant="elevated" padding="none" className="overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Bell size={20} className="text-amber-600" />
              </div>
              <div>
                <h2 className="font-semibold text-seeya-text">Notifications</h2>
                <p className="text-sm text-seeya-text-secondary">
                  Manage how you receive updates
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            <SettingsToggle
              title="Travel Pal Requests"
              subtitle="When someone sends you a travel pal request"
              checked={settings.notify_travel_pal_requests ?? true}
              onChange={(checked) => updateSetting('notify_travel_pal_requests', checked)}
            />

            <SettingsToggle
              title="Trip Invitations"
              subtitle="When you're invited to a trip"
              checked={settings.notify_trip_invitations ?? true}
              onChange={(checked) => updateSetting('notify_trip_invitations', checked)}
            />

            <SettingsToggle
              title="Trip Messages"
              subtitle="When someone sends a message in your trips"
              checked={settings.notify_trip_messages ?? true}
              onChange={(checked) => updateSetting('notify_trip_messages', checked)}
            />

            <SettingsToggle
              title="Added to Trip Item"
              subtitle="When someone adds you to a trip item"
              checked={settings.notify_added_to_tripbit ?? true}
              onChange={(checked) => updateSetting('notify_added_to_tripbit', checked)}
            />
          </div>
        </Card>

        {/* Help & Support Section */}
        <Card variant="elevated" padding="none" className="overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <HelpCircle size={20} className="text-amber-600" />
              </div>
              <div>
                <h2 className="font-semibold text-seeya-text">Help & Support</h2>
                <p className="text-sm text-seeya-text-secondary">
                  Learn how to get the most out of Seeya
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-2">
            <Link
              href="/onboarding/welcome"
              className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="text-seeya-text-secondary">Redo Initial Setup</span>
            </Link>
          </div>
        </Card>

        {/* Sign Out */}
        <Button
          variant="outline"
          onClick={handleSignOut}
          className="w-full border-red-200 text-red-600 hover:bg-red-50"
        >
          <LogOut size={18} className="mr-2" />
          Sign Out
        </Button>

        {/* Saving indicator */}
        {isSaving && (
          <div className="fixed bottom-6 right-6 bg-seeya-purple text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <Spinner size="sm" className="text-white" />
            <span className="text-sm">Saving...</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Toggle component
function SettingsToggle({
  title,
  subtitle,
  checked,
  onChange,
}: {
  title: string;
  subtitle: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="p-4 flex items-center justify-between">
      <div className="flex-1">
        <p className="font-medium text-seeya-text">{title}</p>
        <p className="text-sm text-seeya-text-secondary">{subtitle}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors',
          checked ? 'bg-amber-400' : 'bg-gray-300'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
            checked && 'translate-x-5'
          )}
        />
      </button>
    </div>
  );
}

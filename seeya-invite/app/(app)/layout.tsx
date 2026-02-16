'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { Logo, Avatar, Spinner } from '@/components/ui';
import {
  Plane,
  Users,
  User,
  LogOut,
  Menu,
  X,
  Calendar,
  Sparkles,
  MessageSquare,
  Bell,
} from 'lucide-react';
import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AppTour } from '@/components/tour';

const navItems = [
  { label: 'Trips', href: '/trips', icon: Plane },
  { label: 'Explore', href: '/explore', icon: Sparkles },
  { label: 'Messages', href: '/messages', icon: MessageSquare },
  { label: 'Calendar', href: '/calendar', icon: Calendar },
  { label: 'Circle', href: '/circle', icon: Users },
  { label: 'Profile', href: '/profile', icon: User },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, isAuthenticated, isLoading, signOut } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showTour, setShowTour] = useState(false);

  // Fetch unread notification count
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    setUnreadNotifications(count || 0);
  }, [user]);

  useEffect(() => {
    fetchUnreadCount();
    // Subscribe to new notifications
    if (!user) return;
    const supabase = createClient();
    const channel = supabase
      .channel('nav-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchUnreadCount();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchUnreadCount]);

  // Show app tour for first-time users
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const hasSeenTour = localStorage.getItem('hasSeenTour');
      if (!hasSeenTour) {
        const timer = setTimeout(() => setShowTour(true), 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [isLoading, isAuthenticated]);

  const handleTourComplete = useCallback(() => {
    localStorage.setItem('hasSeenTour', 'true');
    setShowTour(false);
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/login?redirect=${pathname}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-seeya-bg">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-seeya-bg">
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2">
            <Menu size={24} />
          </button>
          <Logo size="sm" />
          <div className="w-10" /> {/* Spacer */}
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-100 z-50
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-4 flex items-center justify-between border-b border-gray-100">
            <Logo size="md" />
            <div className="flex items-center gap-1">
              <Link
                href="/notifications"
                onClick={() => setSidebarOpen(false)}
                className="relative p-2 text-seeya-text-secondary hover:text-seeya-purple transition-colors rounded-lg hover:bg-gray-100"
              >
                <Bell size={20} />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </span>
                )}
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="md:hidden p-2"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {navItems.map((item) => {
                const isActive = pathname?.startsWith(item.href) ?? false;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-xl transition-colors
                        ${
                          isActive
                            ? 'bg-seeya-primary/20 text-seeya-text font-semibold'
                            : 'text-seeya-text-secondary hover:bg-gray-100'
                        }
                      `}
                    >
                      <item.icon size={20} />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <Avatar
                name={profile?.full_name || user?.email || 'User'}
                avatarUrl={profile?.avatar_url}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-seeya-text truncate">
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-sm text-seeya-text-secondary truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 w-full px-4 py-2 text-seeya-text-secondary hover:text-seeya-error hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64 pt-16 md:pt-0 min-h-screen">
        {children}
      </main>

      {/* App Tour */}
      <AppTour isOpen={showTour} onComplete={handleTourComplete} />
    </div>
  );
}

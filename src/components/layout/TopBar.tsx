import { NavLink } from '@/components/NavLink';
import { LogIn, LogOut, Settings, ChevronDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NotificationBell } from '@/components/layout/NotificationBell';
import roamwythLogo from '@/assets/roamwyth-logo.png';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function TopBar() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (profile?.username) {
      return profile.username.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const getDisplayName = () => {
    if (profile?.full_name) {
      return profile.full_name;
    }
    if (profile?.username) {
      return profile.username;
    }
    return 'Account';
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border shadow-sm">
      <div className="container mx-auto px-4 md:px-8 h-14 md:h-16 flex items-center justify-between">
        {/* Logo - always visible */}
        <NavLink to="/" className="flex items-center">
          <div className="h-16 sm:h-20 md:h-[100px] overflow-hidden">
            <img 
              src={roamwythLogo} 
              alt="roamwyth logo" 
              className="h-24 sm:h-[120px] md:h-[150px] w-auto object-cover -mt-3 sm:-mt-4 md:-mt-5"
            />
          </div>
        </NavLink>

        {/* Right side: Alerts + Profile */}
        <div className="flex items-center gap-1 md:gap-2">
          {user && <NotificationBell />}
          {user ? (
            <div className="flex items-center">
              {/* Clickable profile link */}
              <button
                data-tour="profile"
                onClick={() => navigate(`/user/${user.id}`)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-muted/50"
              >
                <Avatar className="w-6 h-6 md:w-7 md:h-7">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">{getInitials()}</AvatarFallback>
                </Avatar>
                <span className="hidden md:inline text-sm font-medium">{getDisplayName()}</span>
              </button>
              
              {/* Dropdown trigger (chevron) */}
              <DropdownMenu>
                <DropdownMenuTrigger className="p-2 rounded-lg transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-muted/50 outline-none">
                  <ChevronDown className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <NavLink
              to="/auth"
              className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-muted/50"
              activeClassName="text-foreground bg-muted font-semibold"
            >
              <LogIn className="w-5 h-5" />
              <span className="text-sm font-medium">Sign In</span>
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
}

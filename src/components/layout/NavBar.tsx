import { NavLink } from '@/components/NavLink';
import { Users, Calendar, Map, Compass, MessageCircle } from 'lucide-react';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';

const navItems = [
  { to: '/friends', label: 'Circle', icon: Users },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/messages', label: 'Messages', icon: MessageCircle },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/trips', label: 'Trips', icon: Map },
];

export function NavBar() {
  const { unreadCount } = useUnreadMessages();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border md:fixed md:top-16 md:bottom-auto md:border-t-0 md:border-b">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex items-stretch justify-around h-16 md:h-12 md:justify-start md:gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-tour={`nav-${item.label.toLowerCase()}`}
              className="relative flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 px-3 md:px-4 h-full transition-all duration-200 text-muted-foreground hover:text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-transparent after:transition-colors"
              activeClassName="text-foreground font-semibold after:bg-foreground"
            >
              <div className="relative">
                <item.icon className="w-5 h-5" />
                {item.to === '/messages' && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-primary-foreground bg-primary rounded-full px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-xs md:text-sm font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}

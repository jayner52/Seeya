export * from './database';
export * from './calendar';

// Auth types
export interface AuthUser {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
  };
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Form types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface SignupFormData {
  email: string;
  password: string;
  fullName: string;
}

// Navigation types
export interface NavItem {
  label: string;
  href: string;
  icon?: string;
}

// Component props
export interface BaseProps {
  className?: string;
  children?: React.ReactNode;
}

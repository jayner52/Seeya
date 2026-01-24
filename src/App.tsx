import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MessageNotificationProvider } from "@/components/providers/MessageNotificationProvider";
import { AppTourProvider } from "@/components/providers/AppTourProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Trips from "./pages/Trips";
import TripDetail from "./pages/TripDetail";
import AcceptInvite from "./pages/AcceptInvite";
import Friends from "./pages/Friends";
import Explore from "./pages/Explore";
import Calendar from "./pages/Calendar";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import UserProfile from "./pages/UserProfile";
import Notifications from "./pages/Notifications";
import Messages from "./pages/Messages";
import AuthCallback from "./pages/AuthCallback";
import Pricing from "./pages/Pricing";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => {

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <MessageNotificationProvider>
            <AppTourProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/trips" element={
                  <ProtectedRoute>
                    <Trips />
                  </ProtectedRoute>
                } />
                <Route path="/trips/:id" element={
                  <ProtectedRoute>
                    <TripDetail />
                  </ProtectedRoute>
                } />
                <Route path="/invite/:token" element={<AcceptInvite />} />
                <Route path="/friends" element={
                  <ProtectedRoute>
                    <Friends />
                  </ProtectedRoute>
                } />
                <Route path="/explore" element={
                  <ProtectedRoute>
                    <Explore />
                  </ProtectedRoute>
                } />
                <Route path="/calendar" element={
                  <ProtectedRoute>
                    <Calendar />
                  </ProtectedRoute>
                } />
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } />
                <Route path="/notifications" element={
                  <ProtectedRoute>
                    <Notifications />
                  </ProtectedRoute>
                } />
                <Route path="/messages" element={
                  <ProtectedRoute>
                    <Messages />
                  </ProtectedRoute>
                } />
                <Route path="/user/:userId" element={
                  <ProtectedRoute>
                    <UserProfile />
                  </ProtectedRoute>
                } />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppTourProvider>
          </MessageNotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;

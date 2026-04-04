import { useEffect, useState } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { Toaster } from "./components/ui/sonner";
import { ThemeProvider } from "./contexts/ThemeContext";
import { initializeCloudStorage, setCloudAuth } from "./lib/storage";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { QuoteLocaleProvider } from "./contexts/QuoteLocaleContext";
import { AuthScreen } from "./components/AuthScreen";
import { LoadingQuoteScreen } from "./components/LoadingQuoteScreen";

function AppInner() {
  const { user, session, loading, isSessionExpired, signOut } = useAuth();
  const [ready, setReady] = useState(false);
  const [gateDone, setGateDone] = useState(false);

  useEffect(() => {
    // Quote gate should show on every refresh/load.
    setGateDone(false);
  }, []);

  useEffect(() => {
    if (loading) return;

    if (isSessionExpired && user) {
      setCloudAuth(null, null);
      setReady(false);
      void signOut();
      return;
    }

    if (!user || !session?.access_token) {
      setCloudAuth(null, null);
      setReady(false);
      return;
    }

    setCloudAuth(user.id, session.access_token);
    void initializeCloudStorage().finally(() => setReady(true));
  }, [loading, user, session, isSessionExpired, signOut]);

  if (!gateDone) {
    return <LoadingQuoteScreen onComplete={() => setGateDone(true)} />;
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-600">Loading auth...</div>;
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center text-gray-600">Syncing your cloud data...</div>;
  }

  return (
    <ThemeProvider>
      <RouterProvider router={router} />
      <Toaster />
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <QuoteLocaleProvider>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </QuoteLocaleProvider>
  );
}
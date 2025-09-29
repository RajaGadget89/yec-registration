"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import {
  MobileSession,
  getMobileSession,
  clearMobileSession,
  refreshMobileSession,
  startConnectionMonitoring,
} from "../../lib/checkin/mobileSession";

interface MobileSessionContextType {
  session: MobileSession | null;
  loading: boolean;
  connectionStatus: {
    internet: boolean;
    database: boolean;
    timestamp: string;
  };
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
}

const MobileSessionContext = createContext<MobileSessionContextType | null>(
  null,
);

interface MobileSessionProviderProps {
  children: ReactNode;
}

export function MobileSessionProvider({
  children,
}: MobileSessionProviderProps) {
  const [session, setSession] = useState<MobileSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState({
    internet: true,
    database: true,
    timestamp: new Date().toISOString(),
  });

  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    initializeSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Only start connection monitoring if user is authenticated
    if (session) {
      const cleanup = startConnectionMonitoring((status) => {
        setConnectionStatus(status);
      });

      return cleanup;
    }
  }, [session]);

  const initializeSession = async () => {
    try {
      setLoading(true);

      // Check for existing session
      const existingSession = getMobileSession();
      if (existingSession) {
        setSession(existingSession);
        setLoading(false);
        return;
      }

      // Check Supabase session
      const {
        data: { session: supabaseSession },
      } = await supabase.auth.getSession();
      if (!supabaseSession) {
        router.push("/checker/login");
        return;
      }

      // Refresh session from server
      const refreshedSession = await refreshMobileSession();
      if (refreshedSession) {
        setSession(refreshedSession);
      } else {
        router.push("/checker/login");
      }
    } catch (error) {
      console.error("Error initializing session:", error);
      router.push("/checker/login");
    } finally {
      setLoading(false);
    }
  };

  const refreshSession = async () => {
    try {
      const refreshedSession = await refreshMobileSession();
      if (refreshedSession) {
        setSession(refreshedSession);
      } else {
        setSession(null);
        router.push("/checker/login");
      }
    } catch (error) {
      console.error("Error refreshing session:", error);
      setSession(null);
      router.push("/checker/login");
    }
  };

  const logout = async () => {
    try {
      // Clear Supabase session
      await supabase.auth.signOut();

      // Clear mobile session
      clearMobileSession();
      setSession(null);

      // Redirect to login
      router.push("/checker/login");
    } catch (error) {
      console.error("Error during logout:", error);
      // Force redirect even if logout fails
      router.push("/checker/login");
    }
  };

  const value: MobileSessionContextType = {
    session,
    loading,
    connectionStatus,
    refreshSession,
    logout,
  };

  return (
    <MobileSessionContext.Provider value={value}>
      {children}
    </MobileSessionContext.Provider>
  );
}

export function useMobileSession(): MobileSessionContextType {
  const context = useContext(MobileSessionContext);
  if (!context) {
    throw new Error(
      "useMobileSession must be used within a MobileSessionProvider",
    );
  }
  return context;
}

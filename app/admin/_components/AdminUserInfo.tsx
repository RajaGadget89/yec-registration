'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, User, Shield, Crown } from 'lucide-react';
import { getSupabaseAuth } from '../../lib/auth-client';
import type { AuthenticatedUser } from '../../lib/auth-client';

export default function AdminUserInfo() {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = getSupabaseAuth();
        
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Get user from admin_users table
          const { data: adminUser, error } = await supabase
            .from('admin_users')
            .select('*')
            .eq('id', session.user.id)
            .eq('is_active', true)
            .single();

          if (!error && adminUser) {
            setUser({
              id: adminUser.id,
              email: adminUser.email,
              role: adminUser.role,
              created_at: adminUser.created_at,
              last_login_at: adminUser.last_login_at,
              is_active: adminUser.is_active
            });
          }
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const supabase = getSupabaseAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null);
          router.push('/admin/login');
        } else if (session?.user) {
          // Re-check user data
          const { data: adminUser, error } = await supabase
            .from('admin_users')
            .select('*')
            .eq('id', session.user.id)
            .eq('is_active', true)
            .single();

          if (!error && adminUser) {
            setUser({
              id: adminUser.id,
              email: adminUser.email,
              role: adminUser.role,
              created_at: adminUser.created_at,
              last_login_at: adminUser.last_login_at,
              is_active: adminUser.is_active
            });
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const supabase = getSupabaseAuth();
      await supabase.auth.signOut();
      
      // Also call logout API to clear cookies
      await fetch('/api/auth/logout', { method: 'POST' });
      
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 backdrop-blur-sm">
        <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"></div>
        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 backdrop-blur-sm">
        <div className="w-2 h-2 rounded-full bg-red-500"></div>
        <span className="text-sm font-medium text-red-700 dark:text-red-300">Not Authenticated</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      {/* User Info */}
      <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-yec-primary/10 to-yec-accent/10 border border-yec-primary/20 backdrop-blur-sm">
        <div className="w-2 h-2 rounded-full bg-yec-accent animate-pulse"></div>
        <div className="flex items-center space-x-1">
          {user.role === 'super_admin' ? (
            <Crown className="h-3 w-3 text-yellow-600" />
          ) : (
            <Shield className="h-3 w-3 text-yec-primary" />
          )}
          <span className="text-sm font-medium text-yec-primary">
            {user.role === 'super_admin' ? 'Super Admin' : 'Admin'}
          </span>
        </div>
      </div>

      {/* User Email */}
      <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50">
        <User className="h-3 w-3 text-gray-500" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-32">
          {user.email}
        </span>
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Sign out"
      >
        <LogOut className="h-3 w-3 text-red-600" />
        <span className="text-sm font-medium text-red-700 dark:text-red-300 hidden sm:inline">
          {isLoggingOut ? 'Signing out...' : 'Sign out'}
        </span>
      </button>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { isCheckinSystemEnabled } from '../../lib/features';

interface ActiveEvent {
  id: string;
  name: string;
  description: string;
  location: string;
  event_types: {
    name: string;
    description: string;
  };
}

export default function CheckerDashboard() {
  const [user, setUser] = useState<any>(null);
  const [events, setEvents] = useState<ActiveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/checker/login');
          return;
        }

        // Get user info from server
        const response = await fetch('/api/checker/me');
        if (!response.ok) {
          router.push('/checker/login');
          return;
        }

        const userData = await response.json();
        setUser(userData.user);

        // Load active events
        await loadActiveEvents();
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/checker/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router, supabase.auth]);

  const loadActiveEvents = async () => {
    try {
      const response = await fetch('/api/checkin/events/active');
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error loading events:', error);
      setError('Failed to load events');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/checker/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yec-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isCheckinSystemEnabled()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg font-semibold">Feature Not Available</div>
          <p className="mt-2 text-gray-600">The check-in system is not enabled.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Checker Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome, {user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Scan</h3>
            <p className="text-sm text-gray-600 mb-4">
              Start scanning QR codes immediately
            </p>
            <button
              onClick={() => router.push('/checker/scan')}
              className="w-full bg-yec-primary text-white py-2 px-4 rounded-md hover:bg-yec-accent focus:outline-none focus:ring-2 focus:ring-yec-primary"
            >
              Start Scanning
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Active Events</h3>
            <p className="text-sm text-gray-600 mb-4">
              {events.length} event{events.length !== 1 ? 's' : ''} available
            </p>
            <button
              onClick={() => router.push('/checker/events')}
              className="w-full bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              View Events
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-600">
              Your recent check-in activities will appear here.
            </p>
          </div>
        </div>

        {/* Connection Status */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Connection Status</h3>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Connected</p>
              <p className="text-sm text-gray-600">Internet and database connection active</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



'use client';

import { useState, useEffect } from 'react';

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

interface EventSelectorProps {
  onEventSelect: (eventId: string) => void;
  selectedEvent: string | null;
}

export default function EventSelector({ onEventSelect, selectedEvent }: EventSelectorProps) {
  const [events, setEvents] = useState<ActiveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadActiveEvents();
  }, []);

  const loadActiveEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/checkin/events/active');
      
      if (!response.ok) {
        throw new Error('Failed to load events');
      }

      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Error loading events:', error);
      setError('Failed to load events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEventChange = (eventId: string) => {
    onEventSelect(eventId);
  };

  if (loading) {
    return (
      <div className="mb-6">
        <label className="block text-sm font-medium text-[#213555] mb-3 flex items-center">
          <svg className="w-4 h-4 mr-2 text-[#6688EE]" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
          Select Event
        </label>
        <div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50">
          <div className="animate-pulse text-gray-500 flex items-center">
            <div className="w-4 h-4 bg-gray-300 rounded mr-2"></div>
            Loading events...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6">
        <label className="block text-sm font-medium text-[#213555] mb-3 flex items-center">
          <svg className="w-4 h-4 mr-2 text-[#6688EE]" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
          Select Event
        </label>
        <div className="w-full px-4 py-3 border border-red-200 rounded-lg bg-red-50">
          <div className="text-red-600 text-sm flex items-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
          <button
            onClick={loadActiveEvents}
            className="mt-3 text-sm text-red-600 hover:text-red-800 underline flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="mb-6">
        <label className="block text-sm font-medium text-[#213555] mb-3 flex items-center">
          <svg className="w-4 h-4 mr-2 text-[#6688EE]" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
          Select Event
        </label>
        <div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50">
          <div className="text-gray-500 text-sm flex items-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            No active events available
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-[#213555] mb-3 flex items-center">
        <svg className="w-4 h-4 mr-2 text-[#6688EE]" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
        </svg>
        Select Event
      </label>
      <select
        value={selectedEvent || ''}
        onChange={(e) => handleEventChange(e.target.value)}
        className="w-full px-4 py-3 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#6688EE] focus:border-[#6688EE] bg-white text-[#213555]"
      >
        <option value="">Choose an event...</option>
        {events.map((event) => (
          <option key={event.id} value={event.id}>
            {event.name} - {event.location}
          </option>
        ))}
      </select>
      
      {selectedEvent && (
        <div className="mt-4 p-4 bg-[#6688EE]/10 border border-[#6688EE]/20 rounded-lg">
          <div className="text-sm text-[#213555]">
            {(() => {
              const event = events.find(e => e.id === selectedEvent);
              return event ? (
                <div className="space-y-2">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-[#6688EE]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Event:</span> {event.name}
                  </div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-[#6688EE]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Location:</span> {event.location}
                  </div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-[#6688EE]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Type:</span> {event.event_types.description}
                  </div>
                </div>
              ) : null;
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

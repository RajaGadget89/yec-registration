'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '../../lib/auth-utils.server';
import { isCheckinSystemEnabled } from '../../lib/features';

interface Event {
  id: string;
  name: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  event_types: {
    name: string;
    description: string;
    business_rule_category: string;
  };
  created_by_user: {
    email: string;
  };
}

interface EventType {
  id: string;
  name: string;
  description: string;
  business_rule_category: string;
}

export default function CheckinEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadEvents();
    loadEventTypes();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/checkin/events');
      
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

  const loadEventTypes = async () => {
    try {
      const response = await fetch('/api/admin/checkin/event-types');
      if (response.ok) {
        const data = await response.json();
        setEventTypes(data.event_types || []);
      }
    } catch (error) {
      console.error('Error loading event types:', error);
    }
  };

  const handleCreateEvent = async (eventData: any) => {
    try {
      const response = await fetch('/api/admin/checkin/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create event');
      }

      await loadEvents();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating event:', error);
      setError(error instanceof Error ? error.message : 'Failed to create event');
    }
  };

  const handleUpdateEvent = async (eventId: string, eventData: any) => {
    try {
      const response = await fetch(`/api/admin/checkin/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update event');
      }

      await loadEvents();
      setEditingEvent(null);
    } catch (error) {
      console.error('Error updating event:', error);
      setError(error instanceof Error ? error.message : 'Failed to update event');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/checkin/events/${eventId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete event');
      }

      await loadEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete event');
    }
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getBusinessRuleBadge = (category: string) => {
    const badges = {
      'ONE_TIME_ONLY': { color: 'bg-red-100 text-red-800', text: 'One-Time Only' },
      'MULTIPLE_ALLOWED': { color: 'bg-green-100 text-green-800', text: 'Multiple Allowed' },
      'LOCATION_SPECIFIC': { color: 'bg-blue-100 text-blue-800', text: 'Location Specific' }
    };
    
    const badge = badges[category as keyof typeof badges] || { color: 'bg-gray-100 text-gray-800', text: 'Unknown' };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yec-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading events...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Check-in Events</h1>
              <p className="text-sm text-gray-600">Manage check-in events for the seminar</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/admin/checkin/dashboard')}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
              >
                Dashboard
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-yec-primary text-white px-4 py-2 rounded-md hover:bg-yec-accent"
              >
                Create Event
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
            <button
              onClick={() => setError('')}
              className="ml-4 text-sm underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {events.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📅</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Events</h3>
            <p className="text-gray-600 mb-4">
              Create your first check-in event to get started.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-yec-primary text-white px-4 py-2 rounded-md hover:bg-yec-accent"
            >
              Create First Event
            </button>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {events.map((event) => (
                <li key={event.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h3 className="text-lg font-medium text-gray-900">
                          {event.name}
                        </h3>
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          event.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {event.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {event.description}
                      </p>
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-500">
                        <div>
                          <span className="font-medium">Location:</span> {event.location}
                        </div>
                        <div>
                          <span className="font-medium">Type:</span> {event.event_types.description}
                        </div>
                        <div>
                          <span className="font-medium">Business Rule:</span> {getBusinessRuleBadge(event.event_types.business_rule_category)}
                        </div>
                        <div>
                          <span className="font-medium">Created:</span> {formatDateTime(event.created_at)}
                        </div>
                      </div>
                      {event.start_time && (
                        <div className="mt-2 text-sm text-gray-500">
                          <span className="font-medium">Start:</span> {formatDateTime(event.start_time)}
                        </div>
                      )}
                      {event.end_time && (
                        <div className="mt-1 text-sm text-gray-500">
                          <span className="font-medium">End:</span> {formatDateTime(event.end_time)}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setEditingEvent(event)}
                        className="text-yec-primary hover:text-yec-accent text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      {showCreateModal && (
        <EventFormModal
          eventTypes={eventTypes}
          onSubmit={handleCreateEvent}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Edit Event Modal */}
      {editingEvent && (
        <EventFormModal
          eventTypes={eventTypes}
          event={editingEvent}
          onSubmit={(data) => handleUpdateEvent(editingEvent.id, data)}
          onClose={() => setEditingEvent(null)}
        />
      )}
    </div>
  );
}

// Event Form Modal Component
function EventFormModal({ 
  eventTypes, 
  event, 
  onSubmit, 
  onClose 
}: { 
  eventTypes: EventType[];
  event?: Event;
  onSubmit: (data: any) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: event?.name || '',
    description: event?.description || '',
    location: event?.location || '',
    start_time: event?.start_time ? event.start_time.split('T')[0] + 'T' + event.start_time.split('T')[1].substring(0, 5) : '',
    end_time: event?.end_time ? event.end_time.split('T')[0] + 'T' + event.end_time.split('T')[1].substring(0, 5) : '',
    event_type_id: event?.event_types?.id || '',
    is_active: event?.is_active ?? true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {event ? 'Edit Event' : 'Create Event'}
          </h3>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yec-primary focus:border-yec-primary"
              placeholder="Enter event name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yec-primary focus:border-yec-primary"
              placeholder="Enter event description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yec-primary focus:border-yec-primary"
              placeholder="Enter event location"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Type *
            </label>
            <select
              required
              value={formData.event_type_id}
              onChange={(e) => setFormData({ ...formData, event_type_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yec-primary focus:border-yec-primary"
            >
              <option value="">Select event type</option>
              {eventTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.description} ({type.business_rule_category === 'ONE_TIME_ONLY' ? 'One-Time Only' : type.business_rule_category === 'MULTIPLE_ALLOWED' ? 'Multiple Allowed' : 'Location Specific'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Time
              </label>
              <input
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yec-primary focus:border-yec-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Time
              </label>
              <input
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yec-primary focus:border-yec-primary"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 text-yec-primary focus:ring-yec-primary border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
              Active
            </label>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-gray-200 flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 bg-yec-primary text-white py-2 px-4 rounded-md hover:bg-yec-accent"
          >
            {event ? 'Update Event' : 'Create Event'}
          </button>
        </div>
      </div>
    </div>
  );
}



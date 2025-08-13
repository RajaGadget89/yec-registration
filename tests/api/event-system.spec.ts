import { describe, it, expect } from 'vitest';
import { EventService } from '../../app/lib/events/eventService';
import { EventFactory } from '../../app/lib/events/eventFactory';
import { eventBus } from '../../app/lib/events/eventBus';

describe('Event System', () => {
  it('should have proper event bus configuration', () => {
    const stats = eventBus.getStats();
    
    expect(stats.registeredHandlers).toBeGreaterThan(0);
    expect(stats.eventTypes).toContain('registration.submitted');
    expect(stats.eventTypes).toContain('admin.approved');
    expect(stats.eventTypes).toContain('admin.rejected');
    expect(stats.eventTypes).toContain('admin.request_update');
    expect(stats.eventTypes).toContain('registration.batch_upserted');
  });

  it('should create valid events with EventFactory', () => {
    const mockRegistration = {
      id: 1,
      registration_id: 'TEST-123',
      title: 'Mr.',
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      status: 'pending'
    };

    const event = EventFactory.createRegistrationSubmitted(mockRegistration);
    
    expect(EventFactory.validateEvent(event)).toBe(true);
    expect(event.type).toBe('registration.submitted');
    expect(event.payload.registration).toEqual(mockRegistration);
    expect(event.id).toMatch(/^evt_\d+_[a-z0-9]+$/);
    expect(event.timestamp).toBeDefined();
  });

  it('should validate event structure correctly', () => {
    const invalidEvent = {
      id: 'test',
      type: 'registration.submitted',
      // Missing payload
      timestamp: new Date().toISOString()
    };

    expect(EventFactory.validateEvent(invalidEvent as any)).toBe(false);
  });

  it('should have proper status transitions defined', () => {
    const { STATUS_TRANSITIONS } = require('../../app/lib/events/types');
    
    expect(STATUS_TRANSITIONS['registration.submitted']).toBe('waiting_for_review');
    expect(STATUS_TRANSITIONS['admin.approved']).toBe('approved');
    expect(STATUS_TRANSITIONS['admin.rejected']).toBe('rejected');
    expect(STATUS_TRANSITIONS['admin.request_update']).toBe('pending');
    expect(STATUS_TRANSITIONS['registration.batch_upserted']).toBe('waiting_for_review');
  });

  it('should have proper email templates defined', () => {
    const { EMAIL_TEMPLATES } = require('../../app/lib/events/types');
    
    expect(EMAIL_TEMPLATES['registration.submitted']).toBe('received');
    expect(EMAIL_TEMPLATES['admin.approved']).toBe('approved');
    expect(EMAIL_TEMPLATES['admin.rejected']).toBe('rejected');
    expect(EMAIL_TEMPLATES['admin.request_update']).toBe('request_update');
    expect(EMAIL_TEMPLATES['registration.batch_upserted']).toBe('received');
  });
});

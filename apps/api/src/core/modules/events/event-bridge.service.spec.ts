import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBridgeService } from './event-bridge.service';
import { z } from 'zod';

describe('EventBridgeService', () => {
  let service: EventBridgeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventBridgeService],
    }).compile();

    service = module.get<EventBridgeService>(EventBridgeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createEventFactory', () => {
    it('should create a type-safe event factory', () => {
      const factory = service.createEventFactory('test', (id: string) => ({
        eventName: id,
        schema: z.object({ message: z.string() }),
      }));

      const event = factory('test-123');
      expect(event.eventName).toBe('test:test-123');
      expect(event.schema).toBeDefined();
    });
  });

  describe('emit and subscribe', () => {
    it('should emit events to subscribers', async () => {
      const factory = service.createEventFactory('test', (id: string) => ({
        eventName: id,
        schema: z.object({ value: z.number() }),
      }));

      const event = factory('event-1');
      const received: number[] = [];

      // Start subscription in background
      const subscriptionPromise = (async () => {
        for await (const data of service.subscribe(event)) {
          received.push(data.value);
          if (data.value === 3) break;
        }
      })();

      // Give subscriber time to initialize
      await new Promise(resolve => setTimeout(resolve, 10));

      // Emit events
      service.emit(event, { value: 1 });
      service.emit(event, { value: 2 });
      service.emit(event, { value: 3 });

      await subscriptionPromise;

      expect(received).toEqual([1, 2, 3]);
    });

    it('should validate payload against schema', () => {
      const factory = service.createEventFactory('test', (id: string) => ({
        eventName: id,
        schema: z.object({ count: z.number() }),
      }));

      const event = factory('event-1');

      expect(() => {
        service.emit(event, { count: 'invalid' } as any);
      }).toThrow();
    });
  });

  describe('hasActiveSubscribers', () => {
    it('should return false for events with no subscribers', () => {
      const factory = service.createEventFactory('test', (id: string) => ({
        eventName: id,
        schema: z.object({ data: z.string() }),
      }));

      const event = factory('event-1');
      expect(service.hasActiveSubscribers(event)).toBe(false);
    });

    it('should return true for events with active subscribers', async () => {
      const factory = service.createEventFactory('test', (id: string) => ({
        eventName: id,
        schema: z.object({ data: z.string() }),
      }));

      const event = factory('event-1');

      // Start subscription (but don't await)
      const iterator = service.subscribe(event)[Symbol.asyncIterator]();
      
      // Give it time to register
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(service.hasActiveSubscribers(event)).toBe(true);
    });
  });

  describe('getSubscriberCount', () => {
    it('should return 0 for events with no subscribers', () => {
      const factory = service.createEventFactory('test', (id: string) => ({
        eventName: id,
        schema: z.object({ data: z.string() }),
      }));

      const event = factory('event-1');
      expect(service.getSubscriberCount(event)).toBe(0);
    });
  });

  describe('on', () => {
    it('should call listener when event is emitted', () => {
      const factory = service.createEventFactory('test', (id: string) => ({
        eventName: id,
        schema: z.object({ message: z.string() }),
      }));

      const event = factory('event-1');
      const listener = vi.fn();

      service.on(event, listener);
      service.emit(event, { message: 'Hello' });

      expect(listener).toHaveBeenCalledWith({ message: 'Hello' });
    });

    it('should return unsubscribe function', () => {
      const factory = service.createEventFactory('test', (id: string) => ({
        eventName: id,
        schema: z.object({ message: z.string() }),
      }));

      const event = factory('event-1');
      const listener = vi.fn();

      const unsubscribe = service.on(event, listener);
      unsubscribe();

      service.emit(event, { message: 'Hello' });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('getActiveEvents', () => {
    it('should return empty array when no active events', () => {
      expect(service.getActiveEvents()).toEqual([]);
    });

    it('should return list of active event names', async () => {
      const factory = service.createEventFactory('test', (id: string) => ({
        eventName: id,
        schema: z.object({ data: z.string() }),
      }));

      const event1 = factory('event-1');
      const event2 = factory('event-2');

      service.on(event1, () => {});
      service.on(event2, () => {});

      const activeEvents = service.getActiveEvents();
      expect(activeEvents).toContain('test:event-1');
      expect(activeEvents).toContain('test:event-2');
    });
  });

  describe('clearAll', () => {
    it('should clear all events and subscriptions', () => {
      const factory = service.createEventFactory('test', (id: string) => ({
        eventName: id,
        schema: z.object({ data: z.string() }),
      }));

      const event = factory('event-1');
      service.on(event, () => {});

      expect(service.getActiveEventCount()).toBeGreaterThan(0);

      service.clearAll();

      expect(service.getActiveEventCount()).toBe(0);
    });
  });
});

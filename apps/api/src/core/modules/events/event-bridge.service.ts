import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';

/**
 * Event factory creator type
 * Returns an object with eventName and schema for type safety
 */
export interface EventFactory<TPayload = any> {
  (...args: any[]): {
    eventName: string;
    schema: z.ZodType<TPayload>;
  };
}

/**
 * Event listener type
 */
type EventListener<TPayload> = (payload: TPayload) => void;

/**
 * Event subscription tracking
 */
interface EventSubscription {
  eventName: string;
  listeners: Set<EventListener<any>>;
  asyncIterators: Set<AsyncIteratorController<any>>;
}

/**
 * Async iterator controller for managing event streams
 */
class AsyncIteratorController<TPayload> {
  private queue: TPayload[] = [];
  private resolvers: Array<(value: IteratorResult<TPayload>) => void> = [];
  private ended = false;

  push(value: TPayload) {
    if (this.ended) return;

    if (this.resolvers.length > 0) {
      const resolve = this.resolvers.shift()!;
      resolve({ value, done: false });
    } else {
      this.queue.push(value);
    }
  }

  end() {
    this.ended = true;
    while (this.resolvers.length > 0) {
      const resolve = this.resolvers.shift()!;
      resolve({ value: undefined, done: true });
    }
  }

  async next(): Promise<IteratorResult<TPayload>> {
    if (this.queue.length > 0) {
      return { value: this.queue.shift()!, done: false };
    }

    if (this.ended) {
      return { value: undefined, done: true };
    }

    return new Promise((resolve) => {
      this.resolvers.push(resolve);
    });
  }

  [Symbol.asyncIterator](): AsyncIterator<TPayload> {
    return this;
  }
}

/**
 * Event Bridge Service
 * 
 * Manages application-wide events with type safety.
 * Supports both callback-based listeners and async iterator subscriptions.
 */
@Injectable()
export class EventBridgeService {
  private readonly logger = new Logger(EventBridgeService.name);
  private readonly events = new Map<string, EventSubscription>();

  /**
   * Create a type-safe event factory
   */
  createEventFactory<TArgs extends any[], TPayload>(
    baseEventName: string,
    factory: (...args: TArgs) => {
      eventName: string;
      schema: z.ZodType<TPayload>;
    }
  ): EventFactory<TPayload> {
    return (...args: TArgs) => {
      const result = factory(...args);
      return {
        eventName: `${baseEventName}:${result.eventName}`,
        schema: result.schema,
      };
    };
  }

  /**
   * Subscribe to an event with async iterator
   */
  subscribe<TPayload>(event: ReturnType<EventFactory<TPayload>>): AsyncIterable<TPayload> {
    const { eventName } = event;
    
    this.logger.debug(`New async subscription to event: ${eventName}`);

    let subscription = this.events.get(eventName);
    if (!subscription) {
      subscription = {
        eventName,
        listeners: new Set(),
        asyncIterators: new Set(),
      };
      this.events.set(eventName, subscription);
    }

    const controller = new AsyncIteratorController<TPayload>();
    subscription.asyncIterators.add(controller);

    const self = this;
    return {
      async *[Symbol.asyncIterator]() {
        try {
          for await (const value of controller) {
            yield value;
          }
        } finally {
          const sub = self.events.get(eventName);
          if (sub) {
            sub.asyncIterators.delete(controller);
            if (sub.asyncIterators.size === 0 && sub.listeners.size === 0) {
              self.events.delete(eventName);
              self.logger.debug(`Event subscription cleaned up: ${eventName}`);
            }
          }
        }
      }
    };
  }

  /**
   * Emit an event to all subscribers
   */
  emit<TPayload>(
    event: ReturnType<EventFactory<TPayload>>,
    payload: TPayload
  ): void {
    const { eventName, schema } = event;

    try {
      schema.parse(payload);
    } catch (error) {
      this.logger.error(`Invalid payload for event ${eventName}:`, error);
      throw new Error(`Invalid payload for event ${eventName}`);
    }

    const subscription = this.events.get(eventName);
    if (!subscription) {
      this.logger.debug(`No subscribers for event: ${eventName}`);
      return;
    }

    this.logger.debug(`Emitting event: ${eventName} to ${subscription.asyncIterators.size + subscription.listeners.size} subscribers`);

    for (const iterator of subscription.asyncIterators) {
      iterator.push(payload);
    }

    for (const listener of subscription.listeners) {
      try {
        listener(payload);
      } catch (error) {
        this.logger.error(`Error in event listener for ${eventName}:`, error);
      }
    }
  }

  /**
   * Check if an event has active subscriptions
   */
  hasActiveSubscribers<TPayload>(
    event: ReturnType<EventFactory<TPayload>>
  ): boolean {
    const { eventName } = event;
    const subscription = this.events.get(eventName);
    
    if (!subscription) {
      return false;
    }

    return subscription.asyncIterators.size > 0 || subscription.listeners.size > 0;
  }

  /**
   * Get count of active subscribers for an event
   */
  getSubscriberCount<TPayload>(
    event: ReturnType<EventFactory<TPayload>>
  ): number {
    const { eventName } = event;
    const subscription = this.events.get(eventName);
    
    if (!subscription) {
      return 0;
    }

    return subscription.asyncIterators.size + subscription.listeners.size;
  }

  /**
   * Add a callback-based listener
   */
  on<TPayload>(
    event: ReturnType<EventFactory<TPayload>>,
    listener: EventListener<TPayload>
  ): () => void {
    const { eventName } = event;

    this.logger.debug(`New listener for event: ${eventName}`);

    let subscription = this.events.get(eventName);
    if (!subscription) {
      subscription = {
        eventName,
        listeners: new Set(),
        asyncIterators: new Set(),
      };
      this.events.set(eventName, subscription);
    }

    subscription.listeners.add(listener);

    return () => {
      const sub = this.events.get(eventName);
      if (sub) {
        sub.listeners.delete(listener);
        if (sub.asyncIterators.size === 0 && sub.listeners.size === 0) {
          this.events.delete(eventName);
          this.logger.debug(`Event subscription cleaned up: ${eventName}`);
        }
      }
    };
  }

  /**
   * Remove all subscribers for an event
   */
  removeAllSubscribers<TPayload>(
    event: ReturnType<EventFactory<TPayload>>
  ): void {
    const { eventName } = event;
    const subscription = this.events.get(eventName);

    if (subscription) {
      for (const iterator of subscription.asyncIterators) {
        iterator.end();
      }
      
      this.events.delete(eventName);
      this.logger.debug(`All subscribers removed for event: ${eventName}`);
    }
  }

  /**
   * Get all active event names
   */
  getActiveEvents(): string[] {
    return Array.from(this.events.keys());
  }

  /**
   * Get total number of active events
   */
  getActiveEventCount(): number {
    return this.events.size;
  }

  /**
   * Clear all events and subscriptions
   */
  clearAll(): void {
    for (const subscription of this.events.values()) {
      for (const iterator of subscription.asyncIterators) {
        iterator.end();
      }
    }
    this.events.clear();
    this.logger.log('All events cleared');
  }
}

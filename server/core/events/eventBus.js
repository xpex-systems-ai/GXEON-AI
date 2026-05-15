import { EventEmitter } from 'events';
import telemetry from '../observability/runtimeTelemetry.js';

export const EVENT_TYPES = Object.freeze({
  TASK_CREATED: 'TASK_CREATED',
  TASK_EXECUTED: 'TASK_EXECUTED',
  PROVIDER_FAILED: 'PROVIDER_FAILED',
  WATCHDOG_ALERT: 'WATCHDOG_ALERT',
  MONETIZATION_EVENT: 'MONETIZATION_EVENT',
  AGENT_ONLINE: 'AGENT_ONLINE',
  AGENT_OFFLINE: 'AGENT_OFFLINE'
});

class RuntimeEventBus extends EventEmitter {
  constructor() {
    super();
    this.history = [];
    this.maxHistory = 1000;
  }

  publish(type, payload = {}) {
    const event = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      type,
      payload,
      ts: new Date().toISOString()
    };
    this.history.push(event);
    if (this.history.length > this.maxHistory) this.history.shift();
    telemetry.log('info', `Event published: ${type}`, { event_id: event.id });
    this.emit(type, event);
    this.emit('*', event);
    return event;
  }

  getEvents({ type = null, limit = 100 } = {}) {
    const events = type ? this.history.filter((event) => event.type === type) : this.history;
    return events.slice(-limit);
  }

  getStatus() {
    return {
      event_count: this.history.length,
      subscribers: this.eventNames().map((name) => ({ event: String(name), listeners: this.listenerCount(name) })),
      recent: this.getEvents({ limit: 25 })
    };
  }
}

export const eventBus = new RuntimeEventBus();
export default eventBus;

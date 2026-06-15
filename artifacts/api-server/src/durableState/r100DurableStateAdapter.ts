import { r100CollectionNames, r100DurableSafety, type R100DurableAuditEvent, type R100DurableCollectionName, type R100DurableStateStatus, type R100PersistenceMode } from "./r100DurableStateTypes";

export interface R100DurableStateAdapter {
  loadCollection<T>(collection: R100DurableCollectionName): T[];
  saveCollection<T>(collection: R100DurableCollectionName, records: T[]): void;
  appendEvent(event: Omit<R100DurableAuditEvent, "id" | "at">): void;
  getStatus(): R100DurableStateStatus;
}

export class R100MemoryDurableStateAdapter implements R100DurableStateAdapter {
  protected memory = new Map<R100DurableCollectionName, unknown[]>();
  protected restored = new Set<R100DurableCollectionName>();
  protected events: R100DurableAuditEvent[] = [];
  protected lastLoadedAt: string | null = null;
  protected lastSavedAt: string | null = null;
  constructor(protected persistenceMode: R100PersistenceMode = "SAFE_MEMORY_FALLBACK", protected fallbackUsed = false, protected healthy = true) {}
  loadCollection<T>(collection: R100DurableCollectionName): T[] { try { this.lastLoadedAt = new Date().toISOString(); const values = (this.memory.get(collection) ?? []) as T[]; if (values.length) this.restored.add(collection); return JSON.parse(JSON.stringify(values)); } catch { return []; } }
  saveCollection<T>(collection: R100DurableCollectionName, records: T[]): void { try { this.memory.set(collection, JSON.parse(JSON.stringify(records ?? []))); this.lastSavedAt = new Date().toISOString(); } catch { this.fallbackUsed = true; this.healthy = false; } }
  appendEvent(event: Omit<R100DurableAuditEvent, "id" | "at">): void { try { this.events.push({ ...event, id: `r100_event_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`, at: new Date().toISOString() }); if (this.events.length > 500) this.events.shift(); } catch { this.fallbackUsed = true; } }
  getStatus(): R100DurableStateStatus { return { status:"R100_DURABLE_STATE_ADAPTER_P1_READY", mode:"MANUAL_FIRST", persistenceMode:this.persistenceMode, healthy:this.healthy, fallbackUsed:this.fallbackUsed, collections:[...r100CollectionNames], restoredCollections:[...this.restored], lastLoadedAt:this.lastLoadedAt, lastSavedAt:this.lastSavedAt, safety:r100DurableSafety }; }
}

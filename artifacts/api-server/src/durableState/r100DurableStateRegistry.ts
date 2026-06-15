import { R100MemoryDurableStateAdapter, type R100DurableStateAdapter } from "./r100DurableStateAdapter";
import { R100FileStateAdapter } from "./r100FileStateAdapter";
import type { R100DurableCollectionName } from "./r100DurableStateTypes";

const createAdapter = (): R100DurableStateAdapter => process.env.GXEON_R100_STATE_MODE === "file" ? new R100FileStateAdapter() : new R100MemoryDurableStateAdapter();
const adapter = createAdapter();
export const r100DurableStateRegistry = {
  loadCollection: <T>(collection: R100DurableCollectionName): T[] => adapter.loadCollection<T>(collection),
  saveCollection: <T>(collection: R100DurableCollectionName, records: T[]): void => adapter.saveCollection(collection, records),
  appendEvent: adapter.appendEvent.bind(adapter),
  getStatus: adapter.getStatus.bind(adapter),
};

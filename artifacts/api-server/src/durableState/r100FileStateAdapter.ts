import fs from "node:fs";
import path from "node:path";
import { R100MemoryDurableStateAdapter } from "./r100DurableStateAdapter";
import type { R100DurableCollectionName } from "./r100DurableStateTypes";

const defaultDir = path.resolve(process.cwd(), ".gxeon-r100-state");

export class R100FileStateAdapter extends R100MemoryDurableStateAdapter {
  private dir: string;
  constructor(dir = process.env.GXEON_R100_STATE_DIR || defaultDir) { super("SERVER_LOCAL_JSON", false, true); this.dir = dir; this.ensureDir(); }
  private ensureDir(): boolean { try { fs.mkdirSync(this.dir, { recursive: true }); return true; } catch { (this as any).fallbackUsed = true; (this as any).healthy = false; return false; } }
  private file(collection: R100DurableCollectionName) { return path.join(this.dir, `${collection}.json`); }
  override loadCollection<T>(collection: R100DurableCollectionName): T[] { try { this.ensureDir(); const target = this.file(collection); if (!fs.existsSync(target)) return super.loadCollection<T>(collection); const parsed = JSON.parse(fs.readFileSync(target, "utf8")); const records = Array.isArray(parsed) ? parsed : []; super.saveCollection(collection, records); return super.loadCollection<T>(collection); } catch { (this as any).fallbackUsed = true; (this as any).healthy = false; return super.loadCollection<T>(collection); } }
  override saveCollection<T>(collection: R100DurableCollectionName, records: T[]): void { super.saveCollection(collection, records); try { if (!this.ensureDir()) return; fs.writeFileSync(this.file(collection), JSON.stringify(records ?? [], null, 2)); (this as any).healthy = true; } catch { (this as any).fallbackUsed = true; (this as any).healthy = false; } }
}

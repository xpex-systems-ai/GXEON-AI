import { connectorRegistry, getConnectorRegistryItem } from "./connectorRegistry";
import { buildStatusRecord } from "./connectorStatusEngine";
import type { ConnectorStatus, ConnectorStatusRecord } from "./connectorTypes";
const overrides=new Map<string,{status?:ConnectorStatus; manualNote?:string}>();
export const listConnectorStatuses=():ConnectorStatusRecord[]=>connectorRegistry.map((c)=>buildStatusRecord(c,overrides.get(c.id)));
export const getConnectorStatusById=(id:string)=>{const c=getConnectorRegistryItem(id); return c?buildStatusRecord(c,overrides.get(id)):null;};
export function updateManualConnectorStatus(id:string,input:{status?:ConnectorStatus; manualNote?:string}){ if(!getConnectorRegistryItem(id)) return null; const status=input.status ?? "CONNECTED_MANUAL"; overrides.set(id,{status,manualNote:input.manualNote?.slice(0,500)}); return getConnectorStatusById(id); }
export const resetConnectorStatusesForTests=()=>overrides.clear();

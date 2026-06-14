import type { GitHubDemandExecutionPack } from "../radar/githubDemandExecutionTypes";
import { buildOperatorDeliveryWorkspace } from "./operatorDeliveryWorkspaceBuilder";
import type { DeliveryWorkspaceActionRecord, OperatorDeliveryWorkspace, OperatorDeliveryWorkspaceStatus } from "./operatorDeliveryWorkspaceTypes";
const workspaces = new Map<string, OperatorDeliveryWorkspace>(); const byExecutionPack = new Map<string, string>();
export function createOperatorDeliveryWorkspace(pack: GitHubDemandExecutionPack){ const existing=byExecutionPack.get(pack.id); if(existing) return workspaces.get(existing)!; const ws=buildOperatorDeliveryWorkspace(pack); workspaces.set(ws.id,ws); byExecutionPack.set(pack.id,ws.id); return ws; }
export const listOperatorDeliveryWorkspaces=()=>[...workspaces.values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
export const getOperatorDeliveryWorkspaceById=(id:string)=>workspaces.get(id);
export function updateOperatorDeliveryWorkspaceStatus(id:string,status:OperatorDeliveryWorkspaceStatus){ const ws=workspaces.get(id); if(!ws) return undefined; const updated={...ws,status,updatedAt:new Date().toISOString()}; workspaces.set(id,updated); return updated; }
export function recordOperatorDeliveryWorkspaceAction(id:string, action:Omit<DeliveryWorkspaceActionRecord,"timestamp">){ const ws=workspaces.get(id); if(!ws) return undefined; const updated={...ws, actionHistory:[...ws.actionHistory,{...action,timestamp:new Date().toISOString()}], updatedAt:new Date().toISOString()}; workspaces.set(id,updated); return updated; }

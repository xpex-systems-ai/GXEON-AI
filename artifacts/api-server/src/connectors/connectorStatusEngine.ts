import { connectorRegistry } from "./connectorRegistry";
import type { ConnectorRegistryItem, ConnectorStatus, ConnectorStatusRecord } from "./connectorTypes";

const envName=(n:string)=>n.replace(/_OPTIONAL|_FUTURE_OPTIONAL|_FORBIDDEN_IN_FRONTEND/g,"");
const operatorManualMarker: Record<string,string> = {
 github: "GXEON_GITHUB_OPERATOR_MANUAL_CONNECTED",
 mercado_pago: "GXEON_MERCADO_PAGO_OPERATOR_MANUAL_READY",
};
const operatorManualConnected=(c:ConnectorRegistryItem)=>{
 const marker=operatorManualMarker[c.id];
 return Boolean(marker && process.env[marker]?.trim().toLowerCase()==="true");
};

export const configuredEnvVars=(c:ConnectorRegistryItem)=>c.requiredEnv.map(envName).filter((n)=>Boolean(process.env[n]?.trim()));
export const missingEnvVars=(c:ConnectorRegistryItem)=>c.requiredEnv.filter((n)=>!n.includes("FORBIDDEN")&&!process.env[envName(n)]?.trim());

export function computeConnectorStatus(c:ConnectorRegistryItem): ConnectorStatus {
 if(c.id==="walletconnect") return "PLANNED";
 if(operatorManualConnected(c)) return "CONNECTED_MANUAL";
 if(c.requiredEnv.length===0 || c.connectionModes.some((m)=>m.includes("MANUAL_BROWSER")||m.includes("MANUAL_WALLET"))) return "CONNECTED_MANUAL";
 const missing=missingEnvVars(c); if(missing.length) return c.id==="huggingface"?"CONNECTED_MANUAL":"SETUP_REQUIRED";
 if(c.connectionModes.some((m)=>m.includes("OAUTH"))) return "READY_TO_CONNECT";
 return "CONNECTED_READ_ONLY";
}

export function buildStatusRecord(c:ConnectorRegistryItem, manual?: {status?: ConnectorStatus; manualNote?: string}): ConnectorStatusRecord {
 const status=manual?.status ?? computeConnectorStatus(c);
 const manualMarkerActive=operatorManualConnected(c);
 const walletSafetyChecklist=c.category==="WEB3_WALLET"?["Use a dedicated low-risk wallet for experiments.","Never enter recovery words or private keys into GXEON.","P0 never signs messages, sends transactions, or claims rewards."]:undefined;
 return {...c,status,missingEnvVars:missingEnvVars(c),configuredEnvVars:configuredEnvVars(c),safeSetupInstructions:["Configure secrets only in the server/runtime environment.","Use provider consoles or official CLI manually outside the browser.","CONNECTED_MANUAL confirms an operator-managed path only; it does not grant runtime write/payment credentials.","Return here and refresh status; GXEON stores no frontend secrets."],nextManualAction: status==="SETUP_REQUIRED"?`Configure server env for ${c.label} or use the provider manually.`:status==="READY_TO_CONNECT"?`Launch ${c.label} OAuth manually and approve only read/setup scopes.`:status==="PLANNED"?`${c.label} is planned for P1; keep P0 manual-only.`:`Use ${c.label} manually; no destructive automation is enabled.`,manualNote:manual?.manualNote ?? (manualMarkerActive?"Operator-managed connector path confirmed by backend environment marker; runtime mutations remain disabled.":undefined),updatedAt:new Date().toISOString(),walletSafetyChecklist};
}

export const listComputedConnectorStatuses=()=>connectorRegistry.map((c)=>buildStatusRecord(c));

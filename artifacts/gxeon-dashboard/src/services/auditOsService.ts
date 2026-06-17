import { apiUrl } from "./apiBase";
async function request(path:string, init?:RequestInit){const res=await fetch(apiUrl(`/api/audit-os${path}`),{headers:{"Content-Type":"application/json",...(init?.headers??{})},...init}); if(!res.ok) throw new Error(await res.text()); return res.json();}
export const auditOsService={status:()=>request('/status'),catalog:()=>request('/catalog'),monetizationLadder:()=>request('/monetization-ladder'),preview:(body:any)=>request('/preview',{method:'POST',body:JSON.stringify(body)})};

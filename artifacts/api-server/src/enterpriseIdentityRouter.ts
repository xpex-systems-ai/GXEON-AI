import { Router, json, type ErrorRequestHandler } from "express";
import type { AuditWorkflowService } from "./services/auditWorkflowService";
import { AuditWorkflowError } from "./services/auditWorkflowChecks";
import { EnterpriseIdentityError, type EnterpriseScope, type VerifiedEnterpriseIdentity } from "./enterpriseIdentity";
import type { EnterpriseIdentityStore, EnterprisePrincipal } from "./enterpriseIdentityStore";

type Dependencies = {
  verify: (token: string) => Promise<VerifiedEnterpriseIdentity>;
  store: EnterpriseIdentityStore;
  workflow: AuditWorkflowService;
};
const reject = (status: number, code: string): never => { throw new EnterpriseIdentityError(status, code); };
function tokenFromHeader(header: string | undefined) {
  if (!header || header.length > 12007 || !/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(header)) return reject(401,"ENTERPRISE_TOKEN_REQUIRED");
  return header.slice(7);
}
export function requireEnterpriseScopes(principal: EnterprisePrincipal, ...scopes: EnterpriseScope[]) {
  if (scopes.some(scope => !principal.scopes.includes(scope))) reject(403,"ENTERPRISE_SCOPE_DENIED");
}
// Construct this resolver from the current HTTP headers, never prompt/tool JSON.
// Re-invocation verifies the token and SQL membership; no principal is cached globally.
export async function resolveEnterpriseRequest(authorization: string | undefined, organizationId: string | undefined, options: Dependencies) {
  const identity = await options.verify(tokenFromHeader(authorization));
  if (!organizationId) return reject(400,"ENTERPRISE_ORGANIZATION_REQUIRED");
  const principal = await options.store.authorize(identity, organizationId);
  const scoped = options.workflow.forActor(principal.workflowActor);
  // This export is a read projection for distribution adapters. In particular,
  // admin/reader's org-wide read projection must never escape as a review method.
  const service = { list: () => scoped.list(), detail: (id: string) => scoped.detail(id), exportReport: (id: string) => scoped.exportReport(id) };
  return { identity, principal, service };
}

export function createEnterpriseIdentityRouter(options: Dependencies & {
  origins: readonly string[];
  now?: () => number;
  log?: (record: { event: "enterprise_auth_verified" | "enterprise_auth_denied"; status: number }) => void;
}) {
  if (!options.origins.length || options.origins.includes("*")) throw new Error("ENTERPRISE_EXACT_ORIGIN_REQUIRED");
  const router = Router(), now = options.now ?? Date.now;
  let windowAt = now(), count = 0, active = 0;
  router.use((req,res,next) => {
    res.setHeader("Cache-Control","no-store"); res.setHeader("X-Content-Type-Options","nosniff");
    if (!['GET','POST'].includes(req.method)) { res.setHeader("Allow","GET, POST"); res.status(405).json({ok:false,code:"ENTERPRISE_METHOD_DENIED"}); return; }
    if (now()-windowAt >= 60000) { windowAt=now(); count=0; }
    if (++count > 60) { res.setHeader("Retry-After","60"); res.status(429).json({ok:false,code:"ENTERPRISE_RATE_LIMIT"}); return; }
    if (active >= 4) { res.setHeader("Retry-After","1"); res.status(503).json({ok:false,code:"ENTERPRISE_BUSY"}); return; }
    const origin=req.get("origin");
    if (origin && !options.origins.includes(origin)) { res.status(403).json({ok:false,code:"ENTERPRISE_ORIGIN_DENIED"}); return; }
    if (req.method==='POST' && (!req.is('application/json') || (req.get('content-encoding') && req.get('content-encoding')!=='identity'))) {
      res.status(415).json({ok:false,code:"ENTERPRISE_JSON_REQUIRED"}); return;
    }
    active++; let released=false; const release=()=>{if(!released){released=true;active--;}};
    res.once('finish',release);res.once('close',release);next();
  });
  router.use(async (req,res,next) => {
    try { res.locals.enterpriseIdentity=await options.verify(tokenFromHeader(req.get('authorization'))); options.log?.({event:'enterprise_auth_verified',status:200}); next(); }
    catch (error) { options.log?.({event:'enterprise_auth_denied',status:401}); next(error); }
  });
  router.use(json({limit:'16kb',strict:true,inflate:false}));
  router.get('/organizations',async (_req,res)=>res.json(await options.store.organizations(res.locals.enterpriseIdentity)));
  router.post('/invitations/accept',async (req,res)=>{
    if (!req.body || Object.keys(req.body).some(k=>k!=='token')) return reject(400,'ENTERPRISE_INVITATION_INVALID');
    res.json(await options.store.acceptInvitation(res.locals.enterpriseIdentity,req.body.token));
  });
  router.post('/session/revoke',async (req,res)=>{
    if(!req.body||Object.keys(req.body).some(k=>k!=='all')|| (req.body.all!==undefined&&typeof req.body.all!=='boolean'))return reject(400,'ENTERPRISE_SESSION_REQUEST_INVALID');
    res.json(await options.store.revokeSession(res.locals.enterpriseIdentity,req.body.all===true));
  });
  router.use(async (req,res,next)=>{
    try { const identity=res.locals.enterpriseIdentity as VerifiedEnterpriseIdentity;
      const principal=await options.store.authorize(identity,req.get('x-omnix-organization-id')??'');
      res.locals.enterprisePrincipal=principal;res.locals.enterpriseWorkflow=options.workflow.forActor(principal.workflowActor);next();
    }catch(error){next(error);}
  });
  const principal=(res:{locals:Record<string,unknown>})=>res.locals.enterprisePrincipal as EnterprisePrincipal;
  const workflow=(res:{locals:Record<string,unknown>})=>res.locals.enterpriseWorkflow as AuditWorkflowService;
  router.get('/session',(_req,res)=>res.json({ok:true,customerDataAllowed:false,principal:principal(res),identityMode:'oidc_bearer'}));
  router.post('/invitations',async(req,res)=>{
    if(!req.body||Object.keys(req.body).some(k=>!['email','role'].includes(k)))return reject(400,'ENTERPRISE_INVITATION_INVALID');
    res.status(201).json(await options.store.createInvitation(res.locals.enterpriseIdentity,principal(res).organizationId,req.body.email,req.body.role));
  });
  router.post('/invitations/:id/revoke',async(req,res)=>res.json(await options.store.revokeInvitation(res.locals.enterpriseIdentity,principal(res).organizationId,String(req.params.id))));
  router.post('/memberships/:userId/revoke',async(req,res)=>res.json(await options.store.revokeMembership(res.locals.enterpriseIdentity,principal(res).organizationId,String(req.params.userId))));
  router.post('/delegations',async(req,res)=>{
    if(!req.body||Object.keys(req.body).some(k=>!['agencyOrganizationId','scopes'].includes(k)))return reject(400,'ENTERPRISE_DELEGATION_INVALID');
    res.status(201).json(await options.store.createDelegation(res.locals.enterpriseIdentity,principal(res).organizationId,req.body.agencyOrganizationId,req.body.scopes));
  });
  router.post('/delegations/:id/revoke',async(req,res)=>res.json(await options.store.revokeDelegation(res.locals.enterpriseIdentity,principal(res).organizationId,String(req.params.id))));
  router.get('/audits',async(_req,res)=>{requireEnterpriseScopes(principal(res),'omnix:audits:read');res.json(await workflow(res).list());});
  router.post('/audits',async(req,res)=>{
    const p=principal(res);requireEnterpriseScopes(p,'omnix:audits:write');
    if(p.role!=='operator'||p.delegated)return reject(403,'ENTERPRISE_ROLE_DENIED');
    if(req.body?.testData!==true)return reject(400,'ENTERPRISE_REQUIRES_TEST_DATA');
    res.status(201).json(await workflow(res).create(req.body));
  });
  router.param('caseId',(_req,_res,next,id:string)=>{if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id))return next(new EnterpriseIdentityError(400,'ENTERPRISE_RESOURCE_INVALID'));next();});
  router.get('/audits/:caseId',async(req,res)=>{
    requireEnterpriseScopes(principal(res),'omnix:audits:read','omnix:evidence:read','omnix:reports:read');
    res.json(await workflow(res).detail(String(req.params.caseId)));
  });
  for(const action of ['run','review','finalize'] as const)router.post('/audits/:caseId/'+action,async(req,res)=>{
    const p=principal(res),review=action==='review';requireEnterpriseScopes(p,review?'omnix:approvals:write':'omnix:audits:write');
    if(p.delegated||p.role!==(review?'reviewer':'operator'))return reject(403,'ENTERPRISE_ROLE_DENIED');
    res.json(await workflow(res)[action](String(req.params.caseId),req.body));
  });
  router.get('/audits/:caseId/report',async(req,res)=>{
    requireEnterpriseScopes(principal(res),'omnix:audits:read','omnix:evidence:read','omnix:reports:read');
    const report=await workflow(res).exportReport(String(req.params.caseId));
    res.setHeader('Content-Disposition',`attachment; filename="audit-${report.caseId}.json"`);res.json(report);
  });
  router.use((_req,res)=>res.status(404).json({ok:false,code:'ENTERPRISE_ROUTE_NOT_FOUND'}));
  const errors:ErrorRequestHandler=(error:unknown,_req,res,_next)=>{
    const known=error instanceof EnterpriseIdentityError||error instanceof AuditWorkflowError;
    const bodyStatus=(error as {status?:number})?.status;
    res.status(known?error.status:bodyStatus===400||bodyStatus===413?bodyStatus:503).json({ok:false,
      code:known?error.code:bodyStatus===400||bodyStatus===413?'ENTERPRISE_INVALID_BODY':'ENTERPRISE_UNAVAILABLE'});
  };router.use(errors);return router;
}

import assert from "node:assert/strict";
import test from "node:test";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import express from "express";
import { PGlite } from "@electric-sql/pglite";
import { Pool, type PoolClient } from "@workspace/db/pool";
import { SignJWT, generateKeyPair, exportJWK, createLocalJWKSet } from "jose";
import { createEnterpriseTokenVerifier, enterpriseScopes, enterpriseReadScopes, loadEnterpriseIdentityConfig, type VerifiedEnterpriseIdentity } from "../enterpriseIdentity";
import { createEnterpriseIdentityStore } from "../enterpriseIdentityStore";
import { createEnterpriseIdentityRouter } from "../enterpriseIdentityRouter";
import { createAuditWorkflowService } from "../services/auditWorkflowService";

const issuer="https://identity.example.invalid/realm",audience="https://omnix.example.invalid/api",origin="https://omnix.example.invalid";
async function database() {
  const target=process.env.TEST_AUDIT_DATABASE_URL;
  if(!target) {
    const pglite=await PGlite.create();
    return {exec:(sql:string)=>pglite.exec(sql),query:async(sql:string,params?:unknown[])=>{
      const r=await pglite.query(sql,params);return {rows:r.rows as Record<string,unknown>[],affectedRows:r.affectedRows};},close:()=>pglite.close()};
  }
  // CI fixture only. Create a new database; never migrate or drop the shared
  // test DB, and never use this helper against a remote/provider hostname.
  const url=new URL(target);
  assert.ok(['localhost','127.0.0.1'].includes(url.hostname)&&url.pathname==='/gx01_test'&&url.username==='gx01_test'&&!url.search,'Isolated loopback CI database required');
  const admin=new Pool({connectionString:target,max:1});
  const name='gx040_identity_'+randomUUID().replaceAll('-','');assert.match(name,/^gx040_identity_[a-f0-9]{32}$/);
  try{await admin.query('CREATE DATABASE "'+name+'"');}finally{await admin.end();}
  url.pathname='/'+name;const pool=new Pool({connectionString:url.href,max:1});
  return {exec:(sql:string)=>pool.query(sql),query:async(sql:string,params?:unknown[])=>{
    const r=await pool.query(sql,params);return {rows:r.rows as Record<string,unknown>[],affectedRows:r.rowCount??undefined};},close:()=>pool.end()};
}
async function fixture() {
  let clock=Date.now();const key=await generateKeyPair('RS256',{modulusLength:2048}),jwk=await exportJWK(key.publicKey);jwk.kid='GX040_TEST_DATA';
  const config={issuer,audience,jwksUri:issuer+'/jwks',requireMfa:true};
  const verify=createEnterpriseTokenVerifier(config,{keyResolver:createLocalJWKSet({keys:[jwk]}),now:()=>clock});
  const token=(subject:string,patch:Record<string,unknown>={},header:Record<string,unknown>={})=>new SignJWT({iss:issuer,aud:audience,sub:subject,jti:randomUUID(),
    iat:Math.floor(clock/1000)-10,exp:Math.floor(clock/1000)+600,scope:['omnix:access',...enterpriseScopes].join(' '),amr:['mfa'],...patch})
    .setProtectedHeader({alg:'RS256',typ:'at+jwt',kid:jwk.kid,...header}).sign(key.privateKey);
  return {verify,token,config,now:()=>clock,advance:(ms:number)=>{clock+=ms;}};
}
test('GX040 enterprise identity is explicit and pins HTTPS issuer/JWKS instead of using token-controlled addresses',()=>{
  assert.equal(loadEnterpriseIdentityConfig({}),undefined);
  const env={GXEON_OMNIX_ENTERPRISE_ENABLED:'true',GXEON_OMNIX_OIDC_ISSUER:issuer,GXEON_OMNIX_OIDC_JWKS_URI:issuer+'/jwks',GXEON_OMNIX_OIDC_AUDIENCE:audience};
  assert.equal(loadEnterpriseIdentityConfig(env)?.requireMfa,true);
  for(const patch of [{GXEON_OMNIX_ENTERPRISE_ENABLED:'yes'},{GXEON_OMNIX_OIDC_ISSUER:'http://identity.example.invalid'},
    {GXEON_OMNIX_OIDC_JWKS_URI:'https://unapproved.example.invalid/jwks'},{GXEON_OMNIX_OIDC_JWKS_URI:issuer+'/jwks?key=PRIVATE'},
    {GXEON_OMNIX_OIDC_ISSUER:'https://127.0.0.1'},{GXEON_OMNIX_OIDC_AUDIENCE:''},{NODE_TLS_REJECT_UNAUTHORIZED:'0'}])
    assert.throws(()=>loadEnterpriseIdentityConfig({...env,...patch}),/ENTERPRISE_IDENTITY_CONFIGURATION_REQUIRED/);
});
test('GX040 JOSE access JWT verification rejects expiry, audience/issuer confusion, missing MFA and unapproved scopes',async()=>{
  const f=await fixture(),valid=await f.verify(await f.token('GX040 TEST SUBJECT'));
  assert.equal(valid.subject,'GX040 TEST SUBJECT');assert.equal(valid.mfa,true);
  for(const patch of [{aud:'wrong'},{aud:[audience,'other']},{iss:'https://unapproved.example.invalid'},
    {exp:Math.floor(f.now()/1000)-1},{iat:Math.floor(f.now()/1000)-901},{jti:undefined},{sub:undefined},
    {amr:['pwd']},{scope:'openid profile'},{sub:'GX040\u0000invalid'},{exp:Math.floor(f.now()/1000)+10000}])
    await assert.rejects(f.verify(await f.token('GX040 TEST SUBJECT',patch)),/ENTERPRISE_TOKEN_INVALID/);
  await assert.rejects(f.verify(await f.token('GX040 TEST SUBJECT',{}, {jku:'https://untrusted.example.invalid/keys'})),/ENTERPRISE_TOKEN_INVALID/);
  const bad=(await f.token('GX040 TEST SUBJECT')).split('.');bad[1]=Buffer.from(JSON.stringify({iss:issuer,aud:audience,sub:'EVIL'})).toString('base64url');
  await assert.rejects(f.verify(bad.join('.')),/ENTERPRISE_TOKEN_INVALID/);
  await assert.rejects(f.verify('not-a-jwt'),/ENTERPRISE_TOKEN_INVALID/);
  assert.equal((await f.verify(await f.token('GX040 TEST SUBJECT',{email:'test@example.invalid',email_verified:false}))).emailSha256,undefined);
});

test('GX040 SQL identity, one-time invites, live memberships/delegations and canonical HTTP flow fail closed across organizations',async()=>{
  const f=await fixture(),engine=await database();
  await engine.exec(await readFile(new URL('../../../../lib/db/drizzle/0002_audit_os_schema.sql',import.meta.url),'utf8'));
  await engine.exec(await readFile(new URL('../../../../lib/db/drizzle/0003_omnix_enterprise_identity.sql',import.meta.url),'utf8'));
  // PGlite is one connection; serialize transactions like a one-client pool.
  let pending=Promise.resolve();
  const connect=async()=>{let release!:()=>void;const previous=pending;pending=new Promise<void>(resolve=>{release=resolve;});await previous;
    return {query:async(sql:string,params?:unknown[])=>{const r=await engine.query(sql,params);return {rows:r.rows,rowCount:r.affectedRows};},release} as unknown as Pick<PoolClient,'query'|'release'>;};
  const store=createEnterpriseIdentityStore(connect,{now:f.now}),workflow=createAuditWorkflowService(connect);
  const ids={org:randomUUID(),other:randomUUID(),agency:randomUUID(),admin:randomUUID(),operator:randomUUID(),reviewer:randomUUID(),otherUser:randomUUID(),agencyUser:randomUUID(),agencyOwner:randomUUID()};
  for(const [id,name,kind]of [[ids.org,'GX040 TEST CLIENT','client'],[ids.other,'GX040 TEST OTHER','client'],[ids.agency,'GX040 TEST AGENCY','agency']])
    await engine.query('INSERT INTO omnix_organizations(id,name,kind) VALUES($1,$2,$3)',[id,name,kind]);
  for(const name of ['admin','operator','reviewer','otherUser','agencyUser','agencyOwner'] as const)
    await engine.query('INSERT INTO omnix_users(id,issuer,subject) VALUES($1,$2,$3)',[ids[name],issuer,'GX040-'+name]);
  for(const [organization,user,role]of [[ids.org,ids.admin,'owner'],[ids.org,ids.operator,'operator'],[ids.org,ids.reviewer,'reviewer'],[ids.other,ids.otherUser,'operator'],[ids.agency,ids.agencyUser,'operator'],[ids.agency,ids.agencyOwner,'owner']])
    await engine.query('INSERT INTO omnix_memberships(organization_id,user_id,role) VALUES($1,$2,$3)',[organization,user,role]);
  const tokens:Record<string,string>={},identities:Record<string,VerifiedEnterpriseIdentity>={};
  for(const name of ['admin','operator','reviewer','otherUser','agencyUser','agencyOwner']){tokens[name]=await f.token('GX040-'+name,{role:'owner',organizationId:ids.other});identities[name]=await f.verify(tokens[name]!);}
  const previous={...process.env};Object.assign(process.env,{GXEON_AUDIT_WRITE_MODE:'enabled',GXEON_AUDIT_ALLOW_DB_WRITES:'true',GXEON_AUDIT_DB_PROVIDER:'postgres'});
  const app=express();app.use('/enterprise',createEnterpriseIdentityRouter({verify:f.verify,store,workflow,origins:[origin],now:f.now}));
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();assert.ok(address&&typeof address!=='string');
  const request=async(route:string,name='operator',body?:unknown,organization=ids.org,token=tokens[name])=>{
    const r=await fetch(`http://127.0.0.1:${address.port}/enterprise`+route,{method:body===undefined?'GET':'POST',signal:AbortSignal.timeout(10000),
      headers:{...(token?{Authorization:'Bearer '+token}:{}),'X-Omnix-Organization-Id':organization,'Content-Type':'application/json',Origin:origin},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,headers:r.headers,data:await r.json()};};
  try{
    assert.equal((await request('/session','operator',undefined,ids.org,'')).status,401);
    assert.equal((await request('/session','operator')).data.principal.role,'operator','Token role/organization claims are not authority');
    assert.equal((await store.authorize(identities.operator!,ids.org)).scopes.includes('omnix:commercial:read'),false);
    assert.equal((await store.authorize(identities.admin!,ids.org)).scopes.includes('omnix:commercial:ack'),true);
    assert.equal((await request('/session','operator',undefined,ids.other)).status,403);
    assert.equal((await request('/organizations','operator',undefined,ids.other)).data.items.length,1,'Organization directory uses server memberships, not selected header');
    assert.equal((await request('/session','operator',undefined,ids.org,await f.token('GX040-operator',{aud:'wrong'}))).status,401);
    assert.equal((await request('/invitations','operator',{email:'invitee@example.invalid',role:'operator'})).status,403);
    assert.equal((await request('/invitations','admin',{email:'invitee@example.invalid',role:'owner'})).status,400);
    assert.equal((await request('/invitations','admin',{email:'invitee@example.invalid',role:{toString:'untrusted'}})).status,400);
    const invite=await request('/invitations','admin',{email:'invitee@example.invalid',role:'operator'});assert.equal(invite.status,201);
    const wrongEmail=await f.verify(await f.token('GX040-invitee',{email:'other@example.invalid',email_verified:true}));
    await assert.rejects(store.acceptInvitation(wrongEmail,invite.data.token),/ENTERPRISE_INVITATION_DENIED/);
    const recipient=await f.verify(await f.token('GX040-invitee',{email:'invitee@example.invalid',email_verified:true}));
    assert.equal((await store.acceptInvitation(recipient,invite.data.token)).role,'operator');
    await assert.rejects(store.acceptInvitation(recipient,invite.data.token),/ENTERPRISE_INVITATION_DENIED/);
    const revoked=await store.createInvitation(identities.admin!,ids.org,'not-sent@example.invalid','reader');
    await store.revokeInvitation(identities.admin!,ids.org,revoked.invitationId);
    await assert.rejects(store.acceptInvitation(await f.verify(await f.token('GX040-new',{email:'not-sent@example.invalid',email_verified:true})),revoked.token),/ENTERPRISE_INVITATION_DENIED/);
    const intake={requestId:randomUUID(),assetName:'GX040 TEST DATA',assetReference:'test-fixture/vercel.json',authorizationReference:'test-fixture/authorized',authorized:true,testData:true,
      checks:['vercel_api_routing','vercel_security_headers'],artifact:{name:'vercel.json',content:'{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}'}};
    assert.equal((await request('/audits','admin',intake)).status,403,'Owner is not an operator or reviewer by implication');
    assert.equal((await request('/audits','operator',{...intake,testData:false})).status,400);
    const created=await request('/audits','operator',intake);assert.equal(created.status,201);const id=created.data.caseId;
    assert.equal((await request('/audits/'+id,'otherUser',undefined,ids.other)).status,404);
    assert.equal((await request('/audits/'+id+'/run','operator',{})).status,200);
    await engine.query("UPDATE omnix_memberships SET role='reviewer' WHERE organization_id=$1 AND user_id=$2",[ids.org,ids.operator]);
    const selfReview=await request('/audits/'+id+'/review','operator',{decision:'approve',humanReviewed:true,reviewReference:'GX040 role-change SELF REVIEW must be denied'});
    assert.equal(selfReview.status,403);assert.equal(selfReview.data.code,'SELF_REVIEW_DENIED');
    await engine.query("UPDATE omnix_memberships SET role='operator' WHERE organization_id=$1 AND user_id=$2",[ids.org,ids.operator]);
    assert.equal((await request('/audits/'+id+'/review','operator',{decision:'approve',humanReviewed:true,reviewReference:'GX040 automated identity fixture; human release review remains pending'})).status,403);
    assert.equal((await request('/audits/'+id+'/review','admin',{})).status,403);
    assert.equal((await request('/audits/'+id+'/review','reviewer',{decision:'approve',humanReviewed:true,reviewReference:'GX040 automated identity fixture; not independent release approval'})).status,200);
    assert.equal((await request('/audits/'+id+'/finalize','operator',{})).data.status,'CLOSED');
    assert.equal((await request('/audits/'+id+'/report','operator')).data.report.testData,true);
    // Enterprise HTTP detail must also refuse altered storage; the private MCP
    // gateway must not be the only place where evidence hashes are checked.
    await engine.query('UPDATE audit_evidences SET redacted_text=$1 WHERE case_id=$2',['GX040 TEST DATA altered evidence',id]);
    const tamperedDetail=await request('/audits/'+id,'reviewer');
    assert.equal(tamperedDetail.status,409);
    assert.equal(tamperedDetail.data.code,'EVIDENCE_INTEGRITY_FAILED');
    await engine.query('UPDATE audit_evidences SET redacted_text=$1 WHERE case_id=$2',[intake.artifact.content,id]);
    assert.equal((await request('/audits/'+id,'reviewer')).status,200);
    const restricted=await f.token('GX040-operator',{scope:'omnix:access omnix:audits:read omnix:reports:read'});
    assert.equal((await request('/audits/'+id+'/report','operator',undefined,ids.org,restricted)).status,403,'Report embeds evidence and requires evidence scope');
    const delegated=await store.createDelegation(identities.admin!,ids.org,ids.agency,[...enterpriseReadScopes]);
    await assert.rejects(store.createDelegation(identities.admin!,ids.org,ids.agency,['omnix:commercial:read']),/ENTERPRISE_DELEGATION_INVALID/);
    assert.equal((await store.authorize(identities.agencyUser!,ids.org)).delegated,true);
    assert.equal((await store.authorize(identities.agencyUser!,ids.org)).scopes.includes('omnix:commercial:read'),false);
    assert.equal((await request('/audits/'+id+'/report','agencyUser')).status,200);
    assert.equal((await request('/audits/'+id+'/run','agencyUser',{})).status,403);
    await store.revokeDelegation(identities.admin!,ids.org,delegated.delegationId);
    assert.equal((await request('/audits/'+id+'/report','agencyUser')).status,403);
    await store.createDelegation(identities.admin!,ids.org,ids.agency,[...enterpriseReadScopes]);
    await store.revokeMembership(identities.agencyOwner!,ids.agency,ids.agencyUser);
    assert.equal((await request('/audits/'+id+'/report','agencyUser')).status,403,'Revoked agency membership invalidates all its delegated access');
    await store.revokeMembership(identities.admin!,ids.org,ids.operator);
    assert.equal((await request('/audits/'+id+'/report','operator')).status,403);
    await store.revokeSession(identities.reviewer!);
    assert.equal((await request('/session','reviewer')).status,401);
    const freshReviewer=await f.verify(await f.token('GX040-reviewer'));
    assert.equal((await store.authorize(freshReviewer,ids.org)).role,'reviewer');
    await store.revokeSession(freshReviewer,true);
    await assert.rejects(store.authorize(freshReviewer,ids.org),/ENTERPRISE_SESSION_REVOKED/);
    const audit=JSON.stringify((await engine.query('SELECT * FROM omnix_identity_events')).rows);
    for(const secret of [invite.data.token,revoked.token,tokens.admin,'invitee@example.invalid'])assert.ok(!audit.includes(secret));
    assert.ok(audit.includes('DELEGATION_REVOKED'));assert.ok(audit.includes('SESSION_REVOKED'));
    const expiredInvite=await store.createInvitation(identities.admin!,ids.org,'late@example.invalid','reader');f.advance(86400001);
    const late=await f.verify(await f.token('GX040-late',{email:'late@example.invalid',email_verified:true}));
    await assert.rejects(store.acceptInvitation(late,expiredInvite.token),/ENTERPRISE_INVITATION_DENIED/);
  }finally{
    server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await engine.close();
    for(const key of Object.keys(process.env))if(!(key in previous))delete process.env[key];Object.assign(process.env,previous);
  }
});

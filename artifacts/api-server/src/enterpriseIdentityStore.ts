import { randomBytes } from "node:crypto";
import type { PoolClient } from "@workspace/db/pool";
import type { AuditWorkflowActor } from "./services/auditWorkflowService";
import { EnterpriseIdentityError, enterpriseEmailHash, enterpriseReadScopes, identityHash, type EnterpriseRole, type EnterpriseScope, type VerifiedEnterpriseIdentity } from "./enterpriseIdentity";

type Client = Pick<PoolClient, "query" | "release">;
type User = { id: string; revoked_before: number | string; status: string };
export type EnterprisePrincipal = { userId: string; organizationId: string; role: EnterpriseRole; scopes: readonly EnterpriseScope[]; delegated: boolean; workflowActor: AuditWorkflowActor };
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const deny = (status: number, code: string): never => { throw new EnterpriseIdentityError(status, code); };
const roleScopes = (role: EnterpriseRole): readonly EnterpriseScope[] => role === "owner" || role === "admin" ? [...enterpriseReadScopes, "omnix:memberships:write", "omnix:delegations:write", "omnix:commercial:read", "omnix:commercial:ack"] :
  role === "operator" ? [...enterpriseReadScopes, "omnix:audits:write"] : role === "reviewer" ? [...enterpriseReadScopes, "omnix:approvals:write"] : enterpriseReadScopes;

// No implicit pool or new audit engine. Every operation uses a fresh SQL authorization
// check; membership/delegation/session revocation applies to subsequent requests.
export function createEnterpriseIdentityStore(connect: () => Promise<Client>, options: { now?: () => number } = {}) {
  const now = options.now ?? Date.now;
  async function tx<T>(run: (client: Client) => Promise<T>) {
    const client = await connect();
    try { await client.query("BEGIN"); await client.query("SET LOCAL statement_timeout='5s'"); await client.query("SET LOCAL lock_timeout='3s'");
      const result = await run(client); await client.query("COMMIT"); return result;
    } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; } finally { client.release(); }
  }
  async function event(c: Client, user: string, organization: string | null, name: string, target?: string) {
    await c.query("INSERT INTO omnix_identity_events(user_id,organization_id,event,target_id) VALUES($1,$2,$3,$4)", [user, organization, name, target ?? null]);
  }
  async function authenticate(c: Client, identity: VerifiedEnterpriseIdentity): Promise<User> {
    const user = (await c.query<User>("SELECT id,status,revoked_before FROM omnix_users WHERE issuer=$1 AND subject=$2 FOR SHARE", [identity.issuer, identity.subject])).rows[0];
    if (!user || user.status !== "active" || identity.issuedAt <= Number(user.revoked_before) || identity.expiresAt * 1000 <= now()) return deny(401, "ENTERPRISE_SESSION_REVOKED");
    const hash = identityHash(identity.jti);
    const inserted = await c.query<{ id: string }>("INSERT INTO omnix_identity_sessions(issuer,jti_sha256,user_id,issued_at,expires_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT(issuer,jti_sha256) DO NOTHING RETURNING id", [identity.issuer, hash, user.id, identity.issuedAt, new Date(identity.expiresAt * 1000)]);
    const session = (await c.query<{ id: string; user_id: string; issued_at: number | string; expires_at: Date | string; revoked_at: Date | string | null }>("SELECT id,user_id,issued_at,expires_at,revoked_at FROM omnix_identity_sessions WHERE issuer=$1 AND jti_sha256=$2 FOR SHARE", [identity.issuer, hash])).rows[0];
    if (!session || session.revoked_at || session.user_id !== user.id || Number(session.issued_at) !== identity.issuedAt || new Date(session.expires_at).getTime() !== identity.expiresAt * 1000) return deny(401, "ENTERPRISE_SESSION_REVOKED");
    if (inserted.rows.length) await event(c, user.id, null, "SESSION_SEEN", session.id);
    return user;
  }
  async function authorize(c: Client, identity: VerifiedEnterpriseIdentity, organizationId: string): Promise<EnterprisePrincipal> {
    if (!uuid.test(organizationId)) return deny(400, "ENTERPRISE_ORGANIZATION_REQUIRED");
    const user = await authenticate(c, identity);
    const member = (await c.query<{ role: EnterpriseRole }>("SELECT m.role FROM omnix_memberships m JOIN omnix_organizations o ON o.id=m.organization_id WHERE m.user_id=$1 AND m.organization_id=$2 AND m.revoked_at IS NULL AND o.status='active' AND o.test_data=true", [user.id, organizationId])).rows[0];
    let role: EnterpriseRole, delegated = false, permissions: readonly EnterpriseScope[];
    if (member) { role = member.role; permissions = roleScopes(role); }
    else {
      const delegations = (await c.query<{ scopes: EnterpriseScope[] }>("SELECT d.scopes FROM omnix_delegations d JOIN omnix_memberships m ON m.organization_id=d.agency_organization_id JOIN omnix_organizations a ON a.id=d.agency_organization_id JOIN omnix_organizations o ON o.id=d.client_organization_id WHERE m.user_id=$1 AND d.client_organization_id=$2 AND m.revoked_at IS NULL AND d.revoked_at IS NULL AND d.expires_at>$3 AND a.status='active' AND a.kind='agency' AND a.test_data=true AND o.status='active' AND o.test_data=true", [user.id, organizationId, new Date(now())])).rows;
      if (!delegations.length) return deny(403, "ENTERPRISE_ORGANIZATION_DENIED");
      delegated = true; role = "reader"; permissions = enterpriseReadScopes.filter(scope => delegations.some(d => Array.isArray(d.scopes) && d.scopes.includes(scope)));
    }
    // Organization selection only narrows server-side authority. Token org/role claims
    // and prompt/tool argument identifiers are never consulted for permissions.
    return { userId: user.id, organizationId, role, delegated, scopes: permissions.filter(s => identity.scopes.includes(s)),
      workflowActor: { userId: user.id, organizationId, role: role === "operator" && !delegated ? "operator" : "reviewer" } };
  }
  async function admin(c: Client, identity: VerifiedEnterpriseIdentity, organizationId: string, scope: EnterpriseScope) {
    const principal = await authorize(c, identity, organizationId);
    if (principal.delegated || !["owner", "admin"].includes(principal.role) || !principal.scopes.includes(scope)) return deny(403, "ENTERPRISE_ADMIN_REQUIRED");
    return principal;
  }
  return {
    authorize: (identity: VerifiedEnterpriseIdentity, organizationId: string) => tx(c => authorize(c, identity, organizationId)),
    organizations: (identity: VerifiedEnterpriseIdentity) => tx(async c => {
      const user = await authenticate(c, identity);
      const rows = (await c.query<{ id: string; name: string; role: EnterpriseRole; delegated: boolean }>("SELECT o.id,o.name,m.role,false AS delegated FROM omnix_organizations o JOIN omnix_memberships m ON m.organization_id=o.id WHERE m.user_id=$1 AND m.revoked_at IS NULL AND o.status='active' AND o.test_data=true UNION SELECT o.id,o.name,'reader' AS role,true AS delegated FROM omnix_organizations o JOIN omnix_delegations d ON d.client_organization_id=o.id JOIN omnix_memberships m ON m.organization_id=d.agency_organization_id JOIN omnix_organizations a ON a.id=d.agency_organization_id WHERE m.user_id=$1 AND m.revoked_at IS NULL AND d.revoked_at IS NULL AND d.expires_at>$2 AND a.status='active' AND a.kind='agency' AND a.test_data=true AND o.status='active' AND o.test_data=true ORDER BY name,id LIMIT 101", [user.id, new Date(now())])).rows;
      return { ok: true as const, items: rows.slice(0,100), hasMore: rows.length > 100, customerDataAllowed: false as const };
    }),
    createInvitation: (identity: VerifiedEnterpriseIdentity, organizationId: string, email: unknown, role: unknown) => tx(async c => {
      const actor = await admin(c, identity, organizationId, "omnix:memberships:write");
      const emailHash = enterpriseEmailHash(email);
      if (!emailHash || typeof role !== "string" || !["operator", "reviewer", "reader"].includes(role)) return deny(400, "ENTERPRISE_INVITATION_INVALID");
      const token = randomBytes(32).toString("base64url"), expiresAt = new Date(now()+86400000);
      const row = (await c.query<{ id: string }>("INSERT INTO omnix_invitations(organization_id,created_by,email_sha256,token_sha256,role,expires_at) VALUES($1,$2,$3,$4,$5,$6) RETURNING id", [organizationId,actor.userId,emailHash,identityHash(token),role,expiresAt])).rows[0]!;
      await event(c,actor.userId,organizationId,"MEMBER_INVITED",row.id);
      return { ok: true as const, invitationId: row.id, token, expiresAt: expiresAt.toISOString(), delivery: "MANUAL_AUTHORIZED_CHANNEL_REQUIRED" as const };
    }),
    acceptInvitation: (identity: VerifiedEnterpriseIdentity, token: unknown) => tx(async c => {
      if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token) || !identity.emailSha256) return deny(403, "ENTERPRISE_INVITATION_DENIED");
      const invite = (await c.query<{ id: string; organization_id: string; role: EnterpriseRole; email_sha256: string }>("SELECT i.id,i.organization_id,i.role,i.email_sha256 FROM omnix_invitations i JOIN omnix_organizations o ON o.id=i.organization_id JOIN omnix_memberships grantor ON grantor.organization_id=i.organization_id AND grantor.user_id=i.created_by JOIN omnix_users u ON u.id=i.created_by WHERE i.token_sha256=$1 AND i.expires_at>$2 AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND o.status='active' AND o.test_data=true AND grantor.revoked_at IS NULL AND grantor.role IN ('owner','admin') AND u.status='active' FOR UPDATE OF i", [identityHash(token),new Date(now())])).rows[0];
      if (!invite || invite.email_sha256 !== identity.emailSha256) return deny(403, "ENTERPRISE_INVITATION_DENIED");
      await c.query("INSERT INTO omnix_users(issuer,subject) VALUES($1,$2) ON CONFLICT(issuer,subject) DO NOTHING", [identity.issuer,identity.subject]);
      const user = await authenticate(c, identity);
      const previous = (await c.query<{ role: EnterpriseRole; revoked_at: Date | null }>("SELECT role,revoked_at FROM omnix_memberships WHERE organization_id=$1 AND user_id=$2 FOR UPDATE", [invite.organization_id,user.id])).rows[0];
      if (previous) return deny(409, "ENTERPRISE_MEMBERSHIP_EXISTS");
      await c.query("INSERT INTO omnix_memberships(organization_id,user_id,role) VALUES($1,$2,$3)", [invite.organization_id,user.id,invite.role]);
      await c.query("UPDATE omnix_invitations SET accepted_at=$2 WHERE id=$1", [invite.id,new Date(now())]);
      await event(c,user.id,invite.organization_id,"INVITE_ACCEPTED",invite.id);
      return { ok: true as const, organizationId: invite.organization_id, role: invite.role, customerDataAllowed: false as const };
    }),
    revokeInvitation: (identity: VerifiedEnterpriseIdentity, organizationId: string, invitationId: string) => tx(async c => {
      const actor = await admin(c,identity,organizationId,"omnix:memberships:write");
      if (!uuid.test(invitationId)) return deny(400,"ENTERPRISE_RESOURCE_INVALID");
      const row = await c.query("UPDATE omnix_invitations SET revoked_at=$3 WHERE organization_id=$1 AND id=$2 AND accepted_at IS NULL RETURNING id", [organizationId,invitationId,new Date(now())]);
      if (!row.rows.length) return deny(404,"ENTERPRISE_RESOURCE_NOT_FOUND"); await event(c,actor.userId,organizationId,"INVITE_REVOKED",invitationId); return { ok: true as const };
    }),
    revokeMembership: (identity: VerifiedEnterpriseIdentity, organizationId: string, userId: string) => tx(async c => {
      const actor = await admin(c,identity,organizationId,"omnix:memberships:write");
      if (!uuid.test(userId)) return deny(400,"ENTERPRISE_RESOURCE_INVALID");
      const row = await c.query("UPDATE omnix_memberships SET revoked_at=$3 WHERE organization_id=$1 AND user_id=$2 AND role IN ('operator','reviewer','reader') RETURNING id", [organizationId,userId,new Date(now())]);
      if (!row.rows.length) return deny(404,"ENTERPRISE_RESOURCE_NOT_FOUND"); await event(c,actor.userId,organizationId,"MEMBERSHIP_REVOKED",userId); return { ok: true as const };
    }),
    createDelegation: (identity: VerifiedEnterpriseIdentity, organizationId: string, agencyOrganizationId: unknown, scopes: unknown) => tx(async c => {
      const actor = await admin(c,identity,organizationId,"omnix:delegations:write");
      if (typeof agencyOrganizationId !== "string" || !uuid.test(agencyOrganizationId) || agencyOrganizationId===organizationId || !Array.isArray(scopes) || !scopes.length || scopes.length>enterpriseReadScopes.length || scopes.some(s=>!(enterpriseReadScopes as readonly unknown[]).includes(s)) || new Set(scopes).size!==scopes.length) return deny(400,"ENTERPRISE_DELEGATION_INVALID");
      const agency = await c.query("SELECT id FROM omnix_organizations WHERE id=$1 AND kind='agency' AND status='active' AND test_data=true",[agencyOrganizationId]);
      if (!agency.rows.length) return deny(404,"ENTERPRISE_RESOURCE_NOT_FOUND");
      const expiresAt = new Date(now()+7*86400000);
      const row = (await c.query<{id:string}>("INSERT INTO omnix_delegations(client_organization_id,agency_organization_id,created_by,scopes,expires_at) VALUES($1,$2,$3,$4::jsonb,$5) RETURNING id",[organizationId,agencyOrganizationId,actor.userId,JSON.stringify(scopes),expiresAt])).rows[0]!;
      await event(c,actor.userId,organizationId,"DELEGATION_GRANTED",row.id);return {ok:true as const,delegationId:row.id,expiresAt:expiresAt.toISOString()};
    }),
    revokeDelegation: (identity: VerifiedEnterpriseIdentity, organizationId: string, delegationId: string) => tx(async c => {
      const actor = await admin(c,identity,organizationId,"omnix:delegations:write");
      if(!uuid.test(delegationId))return deny(400,"ENTERPRISE_RESOURCE_INVALID");
      const row = await c.query("UPDATE omnix_delegations SET revoked_at=$3 WHERE client_organization_id=$1 AND id=$2 RETURNING id",[organizationId,delegationId,new Date(now())]);
      if(!row.rows.length)return deny(404,"ENTERPRISE_RESOURCE_NOT_FOUND");await event(c,actor.userId,organizationId,"DELEGATION_REVOKED",delegationId);return {ok:true as const};
    }),
    revokeSession: (identity: VerifiedEnterpriseIdentity, all = false) => tx(async c => {
      const user = await authenticate(c,identity);
      if(all)await c.query("UPDATE omnix_users SET revoked_before=$2 WHERE id=$1",[user.id,Math.floor(now()/1000)]);
      else await c.query("UPDATE omnix_identity_sessions SET revoked_at=$3 WHERE issuer=$1 AND jti_sha256=$2",[identity.issuer,identityHash(identity.jti),new Date(now())]);
      await event(c,user.id,null,all?"ALL_SESSIONS_REVOKED":"SESSION_REVOKED");return {ok:true as const};
    }),
  };
}
export type EnterpriseIdentityStore = ReturnType<typeof createEnterpriseIdentityStore>;

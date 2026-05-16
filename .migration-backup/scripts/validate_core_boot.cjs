'use strict';

const assert = require('assert/strict');
const {
  getCoreBootProfile,
  getPublicCoreBootStatus,
  summarizeCoreBoot
} = require('../server/config/coreBoot.cjs');

const profile = getCoreBootProfile();
const publicStatus = getPublicCoreBootStatus();
const summary = summarizeCoreBoot();

assert.equal(profile.GXEON_CORE_BOOT.version, 'v1.0.0');
assert.equal(profile.GXEON_CORE_BOOT.mode, 'AUTONOMOUS_PRODUCTION');
assert.equal(profile.GXEON_CORE_BOOT.priority, 'MAXIMUM_STABILITY');
assert.equal(profile.INTEGRATIONS.github.enabled, true);
assert.ok(profile.INTEGRATIONS.github.actions.includes('pull_request'));
assert.ok(profile.INTEGRATIONS.slack.channels.includes('#gx-heartbeat'));
assert.equal(profile.INTEGRATIONS.linear.priorities.P0, 'critical');
assert.ok(profile.INTEGRATIONS.supabase.tables.includes('system_events'));
assert.equal(profile.OPERATIONS.safety.circuit_breaker_enabled, true);
assert.equal(profile.RUNTIME_FLAGS.degraded_mode_allowed, true);
assert.ok(publicStatus.generated_at);
assert.ok(summary.integrations_enabled.includes('supabase'));

console.log('GXEON core boot profile validated');
